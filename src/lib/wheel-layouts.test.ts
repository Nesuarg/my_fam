import { describe, it, expect } from "vitest";
import { computeWheelLayout, computeBirthOrderLayout, computeBranchSizeLayout } from "./wheel-layouts";
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

describe("computeBirthOrderLayout", () => {
  it("re-sorts angular positions by birth order", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const c1 = makeNode({ coupleId: "c1", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root" });
    const c2 = makeNode({ coupleId: "c2", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root" });
    const positions = computeBirthOrderLayout([root, c1, c2], 1919, 800, 800);

    const angle1 = Math.atan2(positions.get("c1")!.y, positions.get("c1")!.x);
    const angle2 = Math.atan2(positions.get("c2")!.y, positions.get("c2")!.x);
    expect(angle2).toBeLessThan(angle1);
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
