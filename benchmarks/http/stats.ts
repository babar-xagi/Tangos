/** Latency summary in milliseconds. */
export interface LatencySummary {
  count: number;
  max: number;
  mean: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Nearest-rank percentile over an already sorted sample.
 *
 * @param sorted ascending latency samples in milliseconds
 * @param p rank between 0 and 1 inclusive
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    throw new RangeError("Cannot compute a percentile of an empty sample.");
  }
  if (p < 0 || p > 1 || Number.isNaN(p)) {
    throw new RangeError(`Percentile must be between 0 and 1, received ${p}.`);
  }

  const rank = Math.ceil(p * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index] as number;
}

/**
 * Summarizes latency samples. This is intentionally allocation-free beyond the
 * sorted copy so it cannot meaningfully affect a benchmark loop.
 *
 * @throws RangeError when the sample is empty
 */
export function summarize(samples: readonly number[]): LatencySummary {
  if (samples.length === 0) {
    throw new RangeError("Cannot summarize an empty sample.");
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    count: sorted.length,
    max: sorted[sorted.length - 1] as number,
    mean: total / sorted.length,
    min: sorted[0] as number,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}
