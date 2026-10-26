# 📊 Benchmarks

**Status: harness only. No Qutivex performance claims have been made.**

Phase 2 adds a Qutivex route to the harness, but numbers are not published,
cherry-picked, or compared to other frameworks. The purpose is to make overhead
visible and reproducible before optimization.

Methodology follows [ROADMAP.md](ROADMAP.md) §8.

---

## ▶️ Running the harness

```sh
bun run bench
```

Optional environment variables:

| Variable | Default | Meaning |
| --- | ---: | --- |
| `BENCH_REQUESTS` | `2000` | Requests per timed run |
| `BENCH_CONCURRENCY` | `50` | Concurrent in-flight requests |
| `BENCH_WARMUP` | `500` | Untimed requests before each run |
| `BENCH_RUNS` | `3` | Timed runs per scenario |

The harness prints runtime/OS/CPU, all scenario runs, median RPS, and median p95.
Results are terminal-only and not committed.

---

## 🖥️ Reference machine (scaffolding host)

Recorded for reproducibility. This is **not** the official CI performance
machine and not a claim.

| Fact | Value |
| --- | --- |
| OS | Windows 11, NT 10.0.26300.0, x64 |
| CPU | Intel64 Family 6 Model 142 Stepping 12, GenuineIntel |
| Logical CPUs | 8 |
| Memory available | 33,974,370,304 bytes (~31.6 GiB) |
| Runtime | Bun 1.4.4 (`1.4.4+38afee6c8`) |
| Measured | 2026-10-26 |

Every future published result must record its own exact CPU model, RAM, OS,
power profile, Bun version, Qutivex commit, and dependency versions. A missing
field invalidates the result.

---

## 🎯 Current scenarios

| Scenario | Server | Response |
| --- | --- | --- |
| `bun-plaintext` | Native `Bun.serve()` | `"Hello, World!"` |
| `bun-json` | Native `Bun.serve()` | `{ "message": "Hello, World!" }` |
| `qutivex-json` | `new App()` + minimal route | `{ "message": "Hello, World!" }` |

All bind `127.0.0.1` on an ephemeral port with `reusePort: false`, and are
driven by Bun's `fetch` client from the same process.

The Qutivex scenario uses the public package, `App`, route table, response
normalization, and error handling—not a synthetic wrapper.

---

## 📋 Planned workloads

| # | Workload | Earliest phase |
| ---: | --- | --- |
| 1 | Plain text response | ✅ Phase 2 |
| 2 | Small JSON response | ✅ Phase 2 |
| 3 | Static route | Phase 3 |
| 4 | Parameterized route | Phase 3 |
| 5 | Query-string parsing | Phase 3 |
| 6 | JSON body parsing | Phase 4 |
| 7 | Schema validation | Phase 4 |
| 8 | Middleware chain | Phase 3 |
| 9 | Authenticated endpoint | Phase 8 |
| 10 | Database-backed endpoint | Phase 7 |
| 11 | Streaming/SSE endpoint | Phase 3 |
| 12 | WebSocket echo/broadcast | Phase 3 |
| 13 | Sustained concurrency soak | Phase 15 |

---

## ⚠️ Deliberate limitations

- Client and server share one process and one CPU budget; throughput understates
  a separate-process load generator.
- No CPU pinning, power-profile control, or idle-machine isolation.
- No HTTP keep-alive tuning; defaults are used.
- The Windows host is a development machine, not a benchmark rig.
- Latency uses nearest-rank percentiles (`benchmarks/http/stats.ts`).
- RPS is request count divided by wall-clock time for the timed loop.
- Results are useful for regression direction, **not** marketing or
  cross-framework comparison.

---

## 📏 Rules for publishing numbers

Before any number is published, Phase 15 requires:

- [ ] Methodology published before results.
- [ ] Pinned Bun, OS, hardware, framework versions, commits, and payloads.
- [ ] Warm-up, multiple runs, median, and variance.
- [ ] Baseline (`Bun.serve`), minimal Qutivex route, Qutivex + middleware, and
      relevant alternatives under equivalent conditions.
- [ ] Separate routing-only results from database/AI-backed results.
- [ ] Reproduction commands and source.
- [ ] No cherry-picking the fastest run.
- [ ] Clear labeling of cross-runtime comparisons.

Until then, the only acceptable statement is:

> **A harness exists and runs. No comparable performance claims have been
> verified or published.**
