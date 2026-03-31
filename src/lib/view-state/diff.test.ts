import { describe, it, expect } from "vitest";
import { computeDiffs, applyDiffs, REF_WIDTH, REF_HEIGHT } from "./diff";

describe("computeDiffs", () => {
  it("returns empty diffs when positions match baseline", () => {
    const baseline = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 300, y: 400 }],
    ]);
    const current = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 300, y: 400 }],
    ]);
    const diffs = computeDiffs(baseline, current, REF_WIDTH, REF_HEIGHT, 1);
    expect(Object.keys(diffs)).toHaveLength(0);
  });

  it("captures diffs above threshold", () => {
    const baseline = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 300, y: 400 }],
    ]);
    const current = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 320, y: 410 }],
    ]);
    const diffs = computeDiffs(baseline, current, REF_WIDTH, REF_HEIGHT, 1);
    expect(diffs["b"]).toEqual([20, 10]);
    expect(diffs["a"]).toBeUndefined();
  });

  it("normalizes diffs to reference viewport", () => {
    const baseline = new Map([["a", { x: 200, y: 300 }]]);
    // Actual viewport is 2048x1536 (2x reference)
    const current = new Map([["a", { x: 240, y: 340 }]]);
    const diffs = computeDiffs(baseline, current, 2048, 1536, 1);
    // dx=40 in 2048 viewport → 20 in reference (1024)
    // dy=40 in 1536 viewport → 20 in reference (768)
    expect(diffs["a"]).toEqual([20, 20]);
  });

  it("ignores diffs below threshold", () => {
    const baseline = new Map([["a", { x: 100, y: 200 }]]);
    const current = new Map([["a", { x: 100.3, y: 200.4 }]]);
    const diffs = computeDiffs(baseline, current, REF_WIDTH, REF_HEIGHT, 1);
    expect(Object.keys(diffs)).toHaveLength(0);
  });
});

describe("applyDiffs", () => {
  it("applies diffs to baseline positions", () => {
    const baseline = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 300, y: 400 }],
    ]);
    const diffs = { b: [20, 10] as [number, number] };
    const result = applyDiffs(baseline, diffs, REF_WIDTH, REF_HEIGHT);
    expect(result.get("a")).toEqual({ x: 100, y: 200 });
    expect(result.get("b")).toEqual({ x: 320, y: 410 });
  });

  it("scales diffs from reference to actual viewport", () => {
    const baseline = new Map([["a", { x: 200, y: 300 }]]);
    const diffs = { a: [20, 20] as [number, number] };
    // Actual viewport is 2048x1536 (2x reference)
    const result = applyDiffs(baseline, diffs, 2048, 1536);
    // dx=20 in reference → 40 in 2048 viewport
    // dy=20 in reference → 40 in 1536 viewport
    expect(result.get("a")).toEqual({ x: 240, y: 340 });
  });

  it("roundtrips: computeDiffs → applyDiffs restores positions", () => {
    const baseline = new Map([
      ["a", { x: 100, y: 200 }],
      ["b", { x: 300, y: 400 }],
      ["c", { x: 50, y: 80 }],
    ]);
    const current = new Map([
      ["a", { x: 115, y: 220 }],
      ["b", { x: 300, y: 400 }],
      ["c", { x: 70, y: 60 }],
    ]);
    const diffs = computeDiffs(baseline, current, REF_WIDTH, REF_HEIGHT, 1);
    const restored = applyDiffs(baseline, diffs, REF_WIDTH, REF_HEIGHT);
    for (const [id, pos] of current) {
      const r = restored.get(id)!;
      expect(r.x).toBeCloseTo(pos.x, 0);
      expect(r.y).toBeCloseTo(pos.y, 0);
    }
  });
});
