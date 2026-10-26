# Benchmark harness

See [BENCHMARKS.md](../BENCHMARKS.md) for methodology, limitations, and the
rules for publishing numbers.

```sh
bun run bench
```

Current code:

- `http/run.ts` — starts a native `Bun.serve()` instance on an ephemeral port,
  drives load with Bun's `fetch` client, and prints a Markdown table.
- `http/stats.ts` — nearest-rank latency summary, unit-tested in
  `tests/unit/benchmark-stats.test.ts`.

The harness measures the **native Bun baseline only**. No Qutivex route exists
yet, so there is nothing framework-specific to compare. Phase 2 adds the first
Qutivex scenario after the minimal HTTP core lands.
