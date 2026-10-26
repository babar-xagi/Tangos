import { cpus } from "node:os";
import { summarize, type LatencySummary } from "./stats";

/**
 * Phase 1 benchmark harness.
 *
 * This measures the native Bun baseline only. It exists so the repository has
 * a repeatable harness *before* any performance claim is made, as required by
 * ROADMAP.md §8 and Phase 1. Do not publish its output as a Qutivex benchmark.
 *
 * A Qutivex route scenario is added once the minimal HTTP core exists in
 * Phase 2; until then the harness has nothing framework-specific to measure.
 */

interface Scenario {
  handler: () => Response;
  name: string;
}

interface RunResult {
  rps: number;
  summary: LatencySummary;
}

interface ScenarioResult {
  name: string;
  runs: RunResult[];
}

const scenarios: readonly Scenario[] = [
  {
    handler: () => new Response("Hello, World!"),
    name: "plaintext",
  },
  {
    handler: () => Response.json({ message: "Hello, World!" }),
    name: "json",
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

async function driveLoad(
  baseUrl: string,
  requests: number,
  concurrency: number,
): Promise<number[]> {
  const latencies: number[] = new Array(requests);
  let nextRequest = 0;

  async function worker(): Promise<void> {
    while (nextRequest < requests) {
      const requestIndex = nextRequest;
      nextRequest += 1;

      const startedAt = performance.now();
      const response = await fetch(`${baseUrl}/`);
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

  console.log("Qutivex Phase 1 benchmark harness — native Bun baseline only");
  console.log("No performance claims are made from this output.\n");
  console.log(
    `Bun ${Bun.version} | ${process.platform}/${process.arch} | ${cpus().length} logical CPUs`,
  );
  console.log(`requests=${requests} concurrency=${concurrency} warmup=${warmup} runs=${runs}\n`);

  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const server = Bun.serve({
      fetch: scenario.handler,
      hostname: "127.0.0.1",
      port: 0,
    });
    const baseUrl = `http://127.0.0.1:${server.port}`;

    try {
      await driveLoad(baseUrl, warmup, concurrency);

      const scenarioRuns: RunResult[] = [];
      for (let run = 0; run < runs; run += 1) {
        const startedAt = performance.now();
        const latencies = await driveLoad(baseUrl, requests, concurrency);
        const elapsedSeconds = (performance.now() - startedAt) / 1000;
        const summary = summarize(latencies);

        scenarioRuns.push({
          rps: requests / elapsedSeconds,
          summary,
        });
      }

      results.push({ name: scenario.name, runs: scenarioRuns });
    } finally {
      await server.stop(true);
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
