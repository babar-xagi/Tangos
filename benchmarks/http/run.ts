import { cpus } from "node:os";
import { App } from "qutivex";
import { type LatencySummary, summarize } from "./stats";

/**
 * Phase 2 benchmark harness.
 *
 * It measures a native Bun baseline and the same JSON response through a
 * Qutivex route. It exists to make overhead visible and repeatable. Do not
 * publish its output as a performance claim without the methodology in
 * BENCHMARKS.md.
 */

interface BenchServer {
  stop: () => Promise<void>;
  url: URL;
}

interface Scenario {
  name: string;
  start: () => BenchServer | Promise<BenchServer>;
}

interface RunResult {
  rps: number;
  summary: LatencySummary;
}

interface ScenarioResult {
  name: string;
  runs: RunResult[];
}

function nativeServer(handler: () => Response): BenchServer {
  const server = Bun.serve({
    fetch: handler,
    hostname: "127.0.0.1",
    port: 0,
    reusePort: false,
  });

  return {
    stop: async () => {
      await server.stop(true);
    },
    url: server.url,
  };
}

const scenarios: readonly Scenario[] = [
  {
    name: "bun-plaintext",
    start: () => nativeServer(() => new Response("Hello, World!")),
  },
  {
    name: "bun-json",
    start: () => nativeServer(() => Response.json({ message: "Hello, World!" })),
  },
  {
    name: "qutivex-json",
    start: async () => {
      const app = new App({ banner: false, development: false });
      app.get("/", () => ({ message: "Hello, World!" }));
      const info = await app.listen({ port: 0 });

      return {
        stop: () => app.stop(true),
        url: info.url,
      };
    },
  },
];

function readPositiveInteger(name: string, fallback: number): number {
  const raw = Bun.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer, received "${raw}".`);
  }

  return value;
}

async function driveLoad(url: URL, requests: number, concurrency: number): Promise<number[]> {
  const latencies: number[] = new Array(requests);
  let nextRequest = 0;

  async function worker(): Promise<void> {
    while (nextRequest < requests) {
      const requestIndex = nextRequest;
      nextRequest += 1;

      const startedAt = performance.now();
      const response = await fetch(url);
      await response.arrayBuffer();
      const elapsed = performance.now() - startedAt;

      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status} during benchmark.`);
      }

      latencies[requestIndex] = elapsed;
    }
  }

  const workerCount = Math.min(concurrency, requests);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return latencies;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
  }

  return sorted[middle] as number;
}

function formatRow(result: RunResult, index: number): string {
  const { summary } = result;
  return [
    `| ${index + 1}`,
    summary.count.toString(),
    result.rps.toFixed(0),
    summary.mean.toFixed(3),
    summary.p50.toFixed(3),
    summary.p95.toFixed(3),
    summary.p99.toFixed(3),
  ].join(" | ");
}

/** Runs every scenario and prints a Markdown report. */
export async function runBenchmark(): Promise<void> {
  const requests = readPositiveInteger("BENCH_REQUESTS", 2000);
  const concurrency = readPositiveInteger("BENCH_CONCURRENCY", 50);
  const warmup = readPositiveInteger("BENCH_WARMUP", 500);
  const runs = readPositiveInteger("BENCH_RUNS", 3);

  console.log("Qutivex Phase 2 benchmark harness — Bun baseline vs Qutivex route");
  console.log("No performance claims are made from this output.\n");
  console.log(
    `Bun ${Bun.version} | ${process.platform}/${process.arch} | ${cpus().length} logical CPUs`,
  );
  console.log(`requests=${requests} concurrency=${concurrency} warmup=${warmup} runs=${runs}\n`);

  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const server = await scenario.start();

    try {
      await driveLoad(server.url, warmup, concurrency);

      const scenarioRuns: RunResult[] = [];
      for (let run = 0; run < runs; run += 1) {
        const startedAt = performance.now();
        const latencies = await driveLoad(server.url, requests, concurrency);
        const elapsedSeconds = (performance.now() - startedAt) / 1000;
        const summary = summarize(latencies);

        scenarioRuns.push({
          rps: requests / elapsedSeconds,
          summary,
        });
      }

      results.push({ name: scenario.name, runs: scenarioRuns });
    } finally {
      await server.stop();
    }
  }

  for (const result of results) {
    console.log(`\n### ${result.name}\n`);
    console.log("| Run | Requests | RPS | Mean ms | p50 ms | p95 ms | p99 ms |");
    console.log("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
    result.runs.forEach((run, index) => {
      console.log(formatRow(run, index));
    });

    const medianRps = median(result.runs.map((run) => run.rps));
    const medianP95 = median(result.runs.map((run) => run.summary.p95));
    console.log(`\nMedian RPS: ${medianRps.toFixed(0)}; median p95: ${medianP95.toFixed(3)} ms`);
  }

  console.log(
    "\nReminder: harness validation only. See BENCHMARKS.md before publishing any number.",
  );
}

if (import.meta.main) {
  await runBenchmark();
}
