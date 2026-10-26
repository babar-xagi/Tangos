# Benchmarks

**Status: harness only. No Qutivex performance claims have been made.**

Phase 1 adds a repeatable harness before there is a framework hot path to
measure, as required by [ROADMAP.md](ROADMAP.md) §8. The current harness
measures the **native Bun baseline only**. It does not compare Qutivex to Bun,
Elysia, Hono, or Fastify, because a Qutivex route does not exist yet.

## Running the harness

```sh
bun run bench
```

Optional environment variables:

| Variable           | Default | Meaning                          |
| ------------------ | ------: | -------------------------------- |
| `BENCH_REQUESTS`   |   `2000` | Requests per timed run           |
| `BENCH_CONCURRENCY`|     `50` | Concurrent in-flight requests    |
| `BENCH_WARMUP`     |    `500` | Untimed requests before each run |
| `BENCH_RUNS`       |      `3` | Timed runs per scenario          |

The harness prints the runtime/OS/CPU and a Markdown table of requests/second,
mean latency, p50, p95, and p99. Results are printed to the terminal only and
are not committed; treat them as a local smoke check.

## Current scenarios

1. `plaintext` — `new Response("Hello, World!")`.
2. `json` — `Response.json({ message: "Hello, World!" })`.

Both run against a `Bun.serve()` instance bound to `127.0.0.1` on an ephemeral
port, driven by Bun's `fetch` client from the same process.

## Deliberate limitations

- The client and server share one process and one CPU budget, so throughput
  understates what separate processes would show.
- No CPU pinning, power-profile control, or idle-machine isolation.
- No HTTP keep-alive tuning; defaults are used.
- Results are therefore useful for regression direction, **not** for marketing
  or cross-framework comparison.
- The latency summary uses nearest-rank percentiles
  (`benchmarks/http/stats.ts`), and reported RPS is requests divided by
  wall-clock time for the timed loop.

## Rules for publishing numbers

Before any number is published, Phase 15 requires:

- A written methodology published first.
- Pinned Bun, OS, hardware, framework versions, commits, and payloads.
- Warm-up, multiple runs, median and variance.
- Baseline (`Bun.serve`), minimal Qutivex route, Qutivex with middleware, and
  relevant alternative frameworks under equivalent conditions.
- Separate routing-only results from database- or AI-backed ones.
- Reproduction commands and source code.

Until then, the only acceptable statement is: **a baseline harness exists; no
comparable performance claims have been verified.**
