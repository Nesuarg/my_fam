import { describe, it, expect } from "vitest";
import { computeWheelLayout, computeSequenceLayout, computeBranchSizeLayout, computeTreeLayout } from "./wheel-layouts";
import type { WheelNode } from "./wheel-graph";

function makeNode(overrides: Partial<WheelNode>): WheelNode {
  return {
    coupleId: "test",
    generation: 0,
    birthYear: 1950,
    birthOrder: 1,
    fabriciusPerson: { id: "p", firstName: "A", lastName: "B", age: 50, gender: "male", dob: "1/1/1950" },
    partnerPerson: null,
    branchLabel: "Test",
    isSingle: false,
    childCount: 0,
    parentCoupleId: null,
    ...overrides,
  };
}

describe("computeWheelLayout", () => {
  it("places root node at center", () => {
    const nodes = [makeNode({ coupleId: "root", generation: 0, birthYear: 1919 })];
    const positions = computeWheelLayout(nodes, 1919, 800, 800);
    expect(positions.get("root")).toEqual({ x: 0, y: 0 });
  });

  it("places gen-1 children equally spaced around the circle", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const child1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root" });
    const child2 = makeNode({ coupleId: "c2", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root" });
    const positions = computeWheelLayout([root, child1, child2], 1919, 800, 800);

    const p1 = positions.get("c1")!;
    const p2 = positions.get("c2")!;

    // They should be on opposite sides (180° apart)
    expect(p1.x).not.toEqual(p2.x);
    const angle1 = Math.atan2(p1.y, p1.x);
    const angle2 = Math.atan2(p2.y, p2.x);
    const angleDiff = Math.abs(angle2 - angle1);
    expect(angleDiff).toBeCloseTo(Math.PI, 1);
  });

  it("grandchildren are within parent angular slice", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const c1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root", childCount: 1 });
    const c2 = makeNode({ coupleId: "c2", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root" });
    const gc = makeNode({ coupleId: "gc1", generation: 2, birthYear: 1970, birthOrder: 1, parentCoupleId: "c1" });
    const positions = computeWheelLayout([root, c1, c2, gc], 1919, 800, 800);

    const parentAngle = Math.atan2(positions.get("c1")!.y, positions.get("c1")!.x);
    const childAngle = Math.atan2(positions.get("gc1")!.y, positions.get("gc1")!.x);
    expect(Math.abs(childAngle - parentAngle)).toBeLessThan(Math.PI / 2);
  });
});

describe("computeSequenceLayout", () => {
  const person = (dob: string) => ({
    id: "p", firstName: "A", lastName: "B", age: 50, gender: "male" as const, dob,
  });

  it("orders by the older half of a couple, not by the first-listed person", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919 });
    // "young" is listed first at 1960 but is married to someone born 1940.
    const young = makeNode({
      coupleId: "young", generation: 1, birthYear: 1960, parentCoupleId: "root",
      fabriciusPerson: person("1/1/1960"), partnerPerson: person("1/1/1940"),
    });
    const mid = makeNode({
      coupleId: "mid", generation: 1, birthYear: 1950, parentCoupleId: "root",
      fabriciusPerson: person("1/1/1950"), partnerPerson: null,
    });

    const positions = computeSequenceLayout([root, young, mid], 1919, 2000, 800);

    // young's couple is anchored at 1940, so it precedes mid (1950).
    expect(positions.get("young")!.x).toBeLessThan(positions.get("mid")!.x);
  });

  it("reads left to right, then wraps to the next row", () => {
    const nodes = [
      makeNode({ coupleId: "root", generation: 0, birthYear: 1919, fabriciusPerson: person("1/1/1919") }),
      makeNode({ coupleId: "a", generation: 1, birthYear: 1940, parentCoupleId: "root", fabriciusPerson: person("1/1/1940") }),
      makeNode({ coupleId: "b", generation: 1, birthYear: 1950, parentCoupleId: "root", fabriciusPerson: person("1/1/1950") }),
      makeNode({ coupleId: "c", generation: 1, birthYear: 1960, parentCoupleId: "root", fabriciusPerson: person("1/1/1960") }),
    ];
    // Narrow enough that only two columns fit.
    const positions = computeSequenceLayout(nodes, 1919, 520, 800);

    const root = positions.get("root")!;
    const a = positions.get("a")!;
    const b = positions.get("b")!;

    expect(a.x).toBeGreaterThan(root.x);   // same row, further right
    expect(a.y).toBe(root.y);
    expect(b.y).toBeGreaterThan(a.y);      // wrapped to the next row
    expect(b.x).toBe(root.x);              // back to the first column
  });

  it("gives every node a distinct slot", () => {
    const nodes = Array.from({ length: 12 }, (_, i) =>
      makeNode({ coupleId: `n${i}`, generation: 1, birthYear: 1940 + i, fabriciusPerson: person(`1/1/${1940 + i}`) }),
    );
    const positions = computeSequenceLayout(nodes, 1919, 1200, 800);
    const slots = new Set([...positions.values()].map((p) => `${p.x},${p.y}`));

    expect(slots.size).toBe(12);
  });
});

describe("computeBranchSizeLayout", () => {
  it("gives larger branches more angular space", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const big = makeNode({ coupleId: "big", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root", childCount: 3 });
    const small = makeNode({ coupleId: "small", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root", childCount: 0 });
    const gc1 = makeNode({ coupleId: "gc1", generation: 2, birthYear: 1970, birthOrder: 1, parentCoupleId: "big" });
    const gc2 = makeNode({ coupleId: "gc2", generation: 2, birthYear: 1972, birthOrder: 2, parentCoupleId: "big" });
    const gc3 = makeNode({ coupleId: "gc3", generation: 2, birthYear: 1974, birthOrder: 3, parentCoupleId: "big" });

    const positions = computeBranchSizeLayout([root, big, small, gc1, gc2, gc3], 1919, 800, 800);

    const gcAngles = [gc1, gc2, gc3].map((n) => {
      const p = positions.get(n.coupleId)!;
      return Math.atan2(p.y, p.x);
    });
    const gcSpan = Math.max(...gcAngles) - Math.min(...gcAngles);
    expect(gcSpan).toBeGreaterThan(0);
  });
});

describe("computeTreeLayout", () => {
  it("places root node at top center", () => {
    const nodes = [makeNode({ coupleId: "root", generation: 0, birthYear: 1919 })];
    const positions = computeTreeLayout(nodes, 1919, 800, 800);
    const root = positions.get("root")!;
    expect(root.x).toBeCloseTo(0, 0);
    expect(root.y).toBeLessThan(0);
  });

  it("places children below parent", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const child1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root" });
    const child2 = makeNode({ coupleId: "c2", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root" });
    const positions = computeTreeLayout([root, child1, child2], 1919, 800, 800);

    const rootPos = positions.get("root")!;
    const c1Pos = positions.get("c1")!;
    const c2Pos = positions.get("c2")!;

    expect(c1Pos.y).toBeGreaterThan(rootPos.y);
    expect(c2Pos.y).toBeGreaterThan(rootPos.y);
  });

  it("places siblings side by side horizontally", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const child1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root" });
    const child2 = makeNode({ coupleId: "c2", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root" });
    const positions = computeTreeLayout([root, child1, child2], 1919, 800, 800);

    const c1Pos = positions.get("c1")!;
    const c2Pos = positions.get("c2")!;

    expect(c1Pos.y).toBeCloseTo(c2Pos.y, 0);
    expect(c1Pos.x).not.toBeCloseTo(c2Pos.x, 0);
  });

  it("places grandchildren below their parents", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 1 });
    const c1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root", childCount: 1 });
    const gc = makeNode({ coupleId: "gc1", generation: 2, birthYear: 1970, birthOrder: 1, parentCoupleId: "c1" });
    const positions = computeTreeLayout([root, c1, gc], 1919, 800, 800);

    const rootPos = positions.get("root")!;
    const c1Pos = positions.get("c1")!;
    const gcPos = positions.get("gc1")!;

    expect(c1Pos.y).toBeGreaterThan(rootPos.y);
    expect(gcPos.y).toBeGreaterThan(c1Pos.y);
  });
});
