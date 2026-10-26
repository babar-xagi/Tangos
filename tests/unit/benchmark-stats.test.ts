import { describe, expect, test } from "bun:test";
import { percentile, summarize } from "../../benchmarks/http/stats";

describe("percentile", () => {
  test("uses nearest-rank values", () => {
    const sorted = [1, 2, 3, 4];

    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 0.5)).toBe(2);
    expect(percentile(sorted, 0.95)).toBe(4);
    expect(percentile(sorted, 1)).toBe(4);
    expect(percentile([1, 2, 3, 4, 5], 0.6)).toBe(3);
  });

  test("rejects empty samples and invalid ranks", () => {
    expect(() => percentile([], 0.5)).toThrow(RangeError);
    expect(() => percentile([1], -0.1)).toThrow(RangeError);
    expect(() => percentile([1], 1.1)).toThrow(RangeError);
    expect(() => percentile([1], Number.NaN)).toThrow(RangeError);
  });
});

describe("summarize", () => {
  test("reports count, range, mean, and percentiles", () => {
    const summary = summarize([4, 1, 3, 2]);

    expect(summary).toEqual({
      count: 4,
      max: 4,
      mean: 2.5,
      min: 1,
      p50: 2,
      p95: 4,
      p99: 4,
    });
  });

  test("does not mutate the input", () => {
    const samples = [3, 1, 2];
    summarize(samples);

    expect(samples).toEqual([3, 1, 2]);
  });

  test("rejects an empty sample", () => {
    expect(() => summarize([])).toThrow(RangeError);
  });
});
