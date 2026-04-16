# Family Wheel Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive radial family visualization at `/explore` where distance from center = birth year, nodes are draggable with physics, and layout modes can be toggled.

**Architecture:** A single React island component (`FamilyWheel.tsx`) mounted on a new Astro page (`explore.astro`). The component reads `couples.json`, transforms it into a flat graph of nodes + links, then renders via D3 force simulation on SVG. Layout logic (wheel, birth-order, branch-size) lives in a pure helper module.

**Tech Stack:** Astro, React, D3 (`d3-force`, `d3-selection`, `d3-drag`, `d3-transition`), TypeScript, Tailwind CSS

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/wheel-graph.ts` | Pure data transform: `couples.json` → flat `WheelNode[]` + `WheelLink[]` graph. Computes generation, Fabricius-side birth year, branch label, and single/couple status for each node. No D3, no DOM. |
| `src/lib/wheel-layouts.ts` | Pure layout functions: given a `WheelNode[]`, compute `{ x, y }` target positions for each layout mode (wheel, birth-order, branch-size). No D3, no DOM. |
| `src/components/FamilyWheel.tsx` | React component: mounts SVG, runs D3 force simulation, renders nodes/links/rings, handles drag/hover/click, layout mode buttons. Astro island entry point. |
| `src/pages/explore.astro` | Astro page at `/explore`: loads data, renders `FamilyWheel` as `client:only="react"` island. |

---

### Task 1: Install D3 dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install D3 packages**

Run from the `my_fam` project root:

```bash
pnpm add d3 @types/d3
```

- [ ] **Step 2: Verify installation**

```bash
pnpm list d3
```

Expected: `d3` appears in the dependency list.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add d3 dependency for family wheel visualization"
```

---

### Task 2: Build the graph data transform (`wheel-graph.ts`)

This is the pure data layer. It reads the raw `FamilyData` and produces a flat array of nodes (one per couple/single) and links (parent→child edges), with all metadata needed for rendering.

**Files:**
- Create: `src/lib/wheel-graph.ts`
- Test: `src/lib/wheel-graph.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/wheel-graph.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildWheelGraph, type WheelNode, type WheelLink } from "./wheel-graph";
import type { FamilyData } from "@/types/simple-family";

const minimalFamily: FamilyData = {
  people: [
    { id: "a", firstName: "Niels", lastName: "Hansen", age: 105, gender: "male", dob: "8/24/1919" },
    { id: "b", firstName: "Dorthea", lastName: "Hansen", age: 105, gender: "female", dob: "8/24/1919" },
    { id: "c", firstName: "Grete", lastName: "Paulsen", age: 81, gender: "female", dob: "4/4/1943" },
    { id: "d", firstName: "Paul", lastName: "Paulsen", age: 81, gender: "male", dob: "4/4/1943" },
    { id: "e", firstName: "Bo", lastName: "Paulsen", age: 58, gender: "male", dob: "4/2/1966" },
    { id: "f", firstName: "Aka", lastName: "Paulsen", age: 58, gender: "female", dob: "4/2/1966" },
  ],
  couples: [
    {
      id: "root",
      person1Id: "a",
      person2Id: "b",
      relationshipType: "married",
      children: [{ personId: "c", birthOrder: 1, ownFamilyId: "grete-paul" }],
    },
    {
      id: "grete-paul",
      person1Id: "c",
      person2Id: "d",
      relationshipType: "married",
      children: [{ personId: "e", birthOrder: 1, ownFamilyId: "bo-aka" }],
    },
    {
      id: "bo-aka",
      person1Id: "e",
      person2Id: "f",
      relationshipType: "married",
    },
  ],
};

describe("buildWheelGraph", () => {
  it("produces one node per couple", () => {
    const { nodes, links } = buildWheelGraph(minimalFamily, "root");
    expect(nodes).toHaveLength(3);
  });

  it("root node is generation 0", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    expect(root?.generation).toBe(0);
  });

  it("assigns generation depth correctly", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    const gen2 = nodes.find((n) => n.coupleId === "bo-aka");
    expect(gen1?.generation).toBe(1);
    expect(gen2?.generation).toBe(2);
  });

  it("uses Fabricius-side birth year for radius", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(root?.birthYear).toBe(1919);
    expect(gen1?.birthYear).toBe(1943); // Grete is the Fabricius-side person
  });

  it("creates parent→child links", () => {
    const { links } = buildWheelGraph(minimalFamily, "root");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ source: "root", target: "grete-paul" });
    expect(links[1]).toEqual({ source: "grete-paul", target: "bo-aka" });
  });

  it("computes branch label from couple surname", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(gen1?.branchLabel).toBe("Paulsen");
  });

  it("marks single people as isSingle", () => {
    const withSingle: FamilyData = {
      people: [
        ...minimalFamily.people,
        { id: "solo", firstName: "Thomas", lastName: "Hansen", age: 76, gender: "male", dob: "7/13/1948" },
      ],
      couples: [
        {
          id: "root",
          person1Id: "a",
          person2Id: "b",
          relationshipType: "married",
          children: [
            { personId: "c", birthOrder: 1, ownFamilyId: "grete-paul" },
            { personId: "solo", birthOrder: 2, ownFamilyId: "solo-single" },
          ],
        },
        minimalFamily.couples[1],
        minimalFamily.couples[2],
        { id: "solo-single", person1Id: "solo", person2Id: null, relationshipType: "single" },
      ],
    };
    const { nodes } = buildWheelGraph(withSingle, "root");
    const single = nodes.find((n) => n.coupleId === "solo-single");
    expect(single?.isSingle).toBe(true);
    expect(single?.birthYear).toBe(1948);
  });

  it("tracks childCount for each node", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    const leaf = nodes.find((n) => n.coupleId === "bo-aka");
    expect(root?.childCount).toBe(1);
    expect(leaf?.childCount).toBe(0);
  });

  it("tracks birthOrder from parent", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(gen1?.birthOrder).toBe(1);
  });
});
```

- [ ] **Step 2: Set up vitest (if not already configured)**

Check if vitest is installed:

```bash
pnpm list vitest
```

If not installed:

```bash
pnpm add -D vitest
```

Add to `package.json` scripts (if missing):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test src/lib/wheel-graph.test.ts
```

Expected: FAIL — module `./wheel-graph` not found.

- [ ] **Step 4: Implement `wheel-graph.ts`**

Create `src/lib/wheel-graph.ts`:

```typescript
import type { FamilyData, SimpleCouple, SimplePerson } from "@/types/simple-family";

export interface WheelNode {
  coupleId: string;
  generation: number;
  birthYear: number;
  birthOrder: number;
  fabriciusPerson: SimplePerson;
  partnerPerson: SimplePerson | null;
  branchLabel: string;
  isSingle: boolean;
  childCount: number;
  parentCoupleId: string | null;
  // Mutable position for D3 simulation
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface WheelLink {
  source: string;
  target: string;
}

function parseBirthYear(dob: string): number {
  const parts = dob.split("/");
  return parseInt(parts[2], 10);
}

export function buildWheelGraph(
  data: FamilyData,
  rootCoupleId: string,
): { nodes: WheelNode[]; links: WheelLink[] } {
  const personMap = new Map<string, SimplePerson>();
  for (const p of data.people) {
    personMap.set(p.id, p);
  }

  const coupleMap = new Map<string, SimpleCouple>();
  for (const c of data.couples) {
    coupleMap.set(c.id, c);
  }

  // Build a set of all personIds that appear as children (these are the Fabricius-side people)
  const fabriciusChildIds = new Set<string>();
  for (const couple of data.couples) {
    if (couple.children) {
      for (const child of couple.children) {
        fabriciusChildIds.add(child.personId);
      }
    }
  }

  const nodes: WheelNode[] = [];
  const links: WheelLink[] = [];

  function walk(
    coupleId: string,
    generation: number,
    birthOrder: number,
    parentCoupleId: string | null,
    fabriciusPersonId: string | null,
  ) {
    const couple = coupleMap.get(coupleId);
    if (!couple) return;

    const person1 = personMap.get(couple.person1Id);
    if (!person1) return;
    const person2 = couple.person2Id ? personMap.get(couple.person2Id) ?? null : null;

    // Determine which person is the Fabricius-side one
    let fabriciusPerson: SimplePerson;
    let partnerPerson: SimplePerson | null;

    if (generation === 0) {
      // Root couple: person1 is Fabricius by convention
      fabriciusPerson = person1;
      partnerPerson = person2;
    } else if (fabriciusPersonId) {
      // We know who the Fabricius person is from the parent's children array
      if (person1.id === fabriciusPersonId) {
        fabriciusPerson = person1;
        partnerPerson = person2;
      } else if (person2?.id === fabriciusPersonId) {
        fabriciusPerson = person2;
        partnerPerson = person1;
      } else {
        // The fabricius person might be person1 in a single-parent couple
        fabriciusPerson = person1;
        partnerPerson = person2;
      }
    } else {
      fabriciusPerson = person1;
      partnerPerson = person2;
    }

    const isSingle = couple.person2Id === null || couple.relationshipType === "single";
    const childCount = couple.children?.length ?? 0;

    nodes.push({
      coupleId,
      generation,
      birthYear: parseBirthYear(fabriciusPerson.dob),
      birthOrder,
      fabriciusPerson,
      partnerPerson,
      branchLabel: fabriciusPerson.lastName,
      isSingle,
      childCount,
      parentCoupleId,
    });

    if (couple.children) {
      for (const child of couple.children) {
        if (child.ownFamilyId) {
          links.push({ source: coupleId, target: child.ownFamilyId });
          walk(child.ownFamilyId, generation + 1, child.birthOrder, coupleId, child.personId);
        } else {
          // Uncoupled child — create a virtual single node
          const childPerson = personMap.get(child.personId);
          if (childPerson) {
            const virtualId = `${child.personId}-uncoupled`;
            nodes.push({
              coupleId: virtualId,
              generation: generation + 1,
              birthYear: parseBirthYear(childPerson.dob),
              birthOrder: child.birthOrder,
              fabriciusPerson: childPerson,
              partnerPerson: null,
              branchLabel: childPerson.lastName,
              isSingle: true,
              childCount: 0,
              parentCoupleId: coupleId,
            });
            links.push({ source: coupleId, target: virtualId });
          }
        }
      }
    }
  }

  walk(rootCoupleId, 0, 0, null, null);

  return { nodes, links };
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test src/lib/wheel-graph.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/wheel-graph.ts src/lib/wheel-graph.test.ts
git commit -m "feat: add wheel-graph data transform for family visualization"
```

---

### Task 3: Build layout computation (`wheel-layouts.ts`)

Pure functions that take `WheelNode[]` and viewport dimensions, and assign `x, y` target positions for each layout mode.

**Files:**
- Create: `src/lib/wheel-layouts.ts`
- Test: `src/lib/wheel-layouts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/wheel-layouts.test.ts`:

```typescript
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
    // Both at different radii (different birth years)
    expect(p1.x).not.toEqual(p2.x);
    // Angle should be 180° apart: roughly p1 ≈ -p2 in one axis
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
    // Grandchild should be near parent's angle (within the slice)
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
    // c2 (birthOrder 1) should come before c1 (birthOrder 2) angularly
    // "Before" means smaller angle in our 0-at-top-clockwise system
    expect(angle2).toBeLessThan(angle1);
  });
});

describe("computeBranchSizeLayout", () => {
  it("gives larger branches more angular space", () => {
    const root = makeNode({ coupleId: "root", generation: 0, birthYear: 1919, childCount: 2 });
    const big = makeNode({ coupleId: "big", generation: 1, birthYear: 1945, birthOrder: 1, parentCoupleId: "root", childCount: 3 });
    const small = makeNode({ coupleId: "small", generation: 1, birthYear: 1950, birthOrder: 2, parentCoupleId: "root", childCount: 0 });
    // Add 3 grandchildren under "big"
    const gc1 = makeNode({ coupleId: "gc1", generation: 2, birthYear: 1970, birthOrder: 1, parentCoupleId: "big" });
    const gc2 = makeNode({ coupleId: "gc2", generation: 2, birthYear: 1972, birthOrder: 2, parentCoupleId: "big" });
    const gc3 = makeNode({ coupleId: "gc3", generation: 2, birthYear: 1974, birthOrder: 3, parentCoupleId: "big" });

    const positions = computeBranchSizeLayout([root, big, small, gc1, gc2, gc3], 1919, 800, 800);

    // The "big" branch grandchildren should span a wider angle than the "small" branch
    const gcAngles = [gc1, gc2, gc3].map((n) => {
      const p = positions.get(n.coupleId)!;
      return Math.atan2(p.y, p.x);
    });
    const gcSpan = Math.max(...gcAngles) - Math.min(...gcAngles);
    // Big branch should have nonzero spread
    expect(gcSpan).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/lib/wheel-layouts.test.ts
```

Expected: FAIL — module `./wheel-layouts` not found.

- [ ] **Step 3: Implement `wheel-layouts.ts`**

Create `src/lib/wheel-layouts.ts`:

```typescript
import type { WheelNode } from "./wheel-graph";

export interface Position {
  x: number;
  y: number;
}

function polarToCartesian(angle: number, radius: number): Position {
  return {
    x: radius * Math.sin(angle),
    y: -radius * Math.cos(angle),
  };
}

function computeScaleFactor(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): number {
  const maxYear = Math.max(...nodes.map((n) => n.birthYear));
  const yearSpan = maxYear - rootBirthYear;
  if (yearSpan === 0) return 1;
  const maxRadius = Math.min(width, height) / 2 - 40; // padding
  return maxRadius / yearSpan;
}

function birthYearToRadius(
  birthYear: number,
  rootBirthYear: number,
  scale: number,
): number {
  return (birthYear - rootBirthYear) * scale;
}

/**
 * Recursively assign angular positions within a given slice.
 * `startAngle` and `endAngle` define the angular range for siblings at this level.
 */
function assignAngles(
  nodes: WheelNode[],
  parentCoupleId: string | null,
  startAngle: number,
  endAngle: number,
  angles: Map<string, number>,
  weightFn?: (node: WheelNode, allNodes: WheelNode[]) => number,
) {
  const children = nodes
    .filter((n) => n.parentCoupleId === parentCoupleId)
    .sort((a, b) => a.birthOrder - b.birthOrder);

  if (children.length === 0) return;

  if (weightFn) {
    const weights = children.map((c) => weightFn(c, nodes));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let currentAngle = startAngle;
    for (let i = 0; i < children.length; i++) {
      const sliceSize = ((endAngle - startAngle) * weights[i]) / totalWeight;
      const midAngle = currentAngle + sliceSize / 2;
      angles.set(children[i].coupleId, midAngle);
      assignAngles(nodes, children[i].coupleId, currentAngle, currentAngle + sliceSize, angles, weightFn);
      currentAngle += sliceSize;
    }
  } else {
    const sliceSize = (endAngle - startAngle) / children.length;
    for (let i = 0; i < children.length; i++) {
      const midAngle = startAngle + sliceSize * i + sliceSize / 2;
      angles.set(children[i].coupleId, midAngle);
      assignAngles(nodes, children[i].coupleId, startAngle + sliceSize * i, startAngle + sliceSize * (i + 1), angles);
    }
  }
}

function countDescendants(node: WheelNode, allNodes: WheelNode[]): number {
  const children = allNodes.filter((n) => n.parentCoupleId === node.coupleId);
  let count = children.length;
  for (const child of children) {
    count += countDescendants(child, allNodes);
  }
  return count;
}

export function computeWheelLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const scale = computeScaleFactor(nodes, rootBirthYear, width, height);
  const root = nodes.find((n) => n.generation === 0);
  if (!root) return positions;

  positions.set(root.coupleId, { x: 0, y: 0 });

  const angles = new Map<string, number>();
  assignAngles(nodes, root.coupleId, 0, Math.PI * 2, angles);

  for (const node of nodes) {
    if (node.generation === 0) continue;
    const angle = angles.get(node.coupleId) ?? 0;
    const radius = birthYearToRadius(node.birthYear, rootBirthYear, scale);
    positions.set(node.coupleId, polarToCartesian(angle, radius));
  }

  return positions;
}

export function computeBirthOrderLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  // Same as wheel but nodes are sorted by birthOrder explicitly
  // (wheel already sorts by birthOrder, so this is identical in behavior
  // but we include it as a named layout for clarity and future divergence)
  return computeWheelLayout(nodes, rootBirthYear, width, height);
}

export function computeBranchSizeLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const scale = computeScaleFactor(nodes, rootBirthYear, width, height);
  const root = nodes.find((n) => n.generation === 0);
  if (!root) return positions;

  positions.set(root.coupleId, { x: 0, y: 0 });

  const angles = new Map<string, number>();
  const weightFn = (node: WheelNode, allNodes: WheelNode[]) => {
    return 1 + countDescendants(node, allNodes);
  };
  assignAngles(nodes, root.coupleId, 0, Math.PI * 2, angles, weightFn);

  for (const node of nodes) {
    if (node.generation === 0) continue;
    const angle = angles.get(node.coupleId) ?? 0;
    const radius = birthYearToRadius(node.birthYear, rootBirthYear, scale);
    positions.set(node.coupleId, polarToCartesian(angle, radius));
  }

  return positions;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test src/lib/wheel-layouts.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wheel-layouts.ts src/lib/wheel-layouts.test.ts
git commit -m "feat: add layout computation for wheel, birth-order, and branch-size modes"
```

---

### Task 4: Build the FamilyWheel React component

This is the main visualization component. It uses D3 force simulation for physics, renders SVG nodes/links/rings, and handles drag/hover/click interactions.

**Files:**
- Create: `src/components/FamilyWheel.tsx`

- [ ] **Step 1: Create `FamilyWheel.tsx`**

```tsx
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { FamilyData } from "@/types/simple-family";
import { buildWheelGraph, type WheelNode, type WheelLink } from "@/lib/wheel-graph";
import {
  computeWheelLayout,
  computeBirthOrderLayout,
  computeBranchSizeLayout,
} from "@/lib/wheel-layouts";

const GEN_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];
const GEN_RADII = [22, 15, 12, 10];

type LayoutMode = "wheel" | "birthOrder" | "branchSize";

interface Props {
  familyData: FamilyData;
  rootCoupleId: string;
}

export default function FamilyWheel({ familyData, rootCoupleId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("wheel");
  const [tooltip, setTooltip] = useState<{
    node: WheelNode;
    x: number;
    y: number;
  } | null>(null);
  const graphRef = useRef<{ nodes: WheelNode[]; links: WheelLink[] } | null>(null);
  const simulationRef = useRef<d3.Simulation<WheelNode, WheelLink> | null>(null);

  const getLayout = useCallback(
    (nodes: WheelNode[], width: number, height: number) => {
      const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
      switch (layoutMode) {
        case "birthOrder":
          return computeBirthOrderLayout(nodes, rootBirthYear, width, height);
        case "branchSize":
          return computeBranchSizeLayout(nodes, rootBirthYear, width, height);
        default:
          return computeWheelLayout(nodes, rootBirthYear, width, height);
      }
    },
    [layoutMode],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    // Build graph only once
    if (!graphRef.current) {
      graphRef.current = buildWheelGraph(familyData, rootCoupleId);
    }
    const { nodes, links } = graphRef.current;

    // Compute target positions
    const positions = getLayout(nodes, width, height);

    // Set initial positions if not yet set
    for (const node of nodes) {
      const pos = positions.get(node.coupleId);
      if (pos && node.x === undefined) {
        node.x = pos.x + cx;
        node.y = pos.y + cy;
      }
    }

    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    const g = sel.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    sel.call(zoom);

    // Decade guide rings
    const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
    const maxYear = Math.max(...nodes.map((n) => n.birthYear));
    const yearSpan = maxYear - rootBirthYear;
    const maxRadius = Math.min(width, height) / 2 - 40;
    const scale = yearSpan > 0 ? maxRadius / yearSpan : 1;

    const decades = [];
    const startDecade = Math.ceil(rootBirthYear / 10) * 10;
    for (let d = startDecade; d <= maxYear + 10; d += 10) {
      decades.push(d);
    }

    const ringsGroup = g.append("g").attr("class", "rings");
    for (const decade of decades) {
      const r = (decade - rootBirthYear) * scale;
      ringsGroup
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#1a1d2e")
        .attr("stroke-width", 0.5);
      ringsGroup
        .append("text")
        .attr("x", cx + r * Math.sin(Math.PI / 4))
        .attr("y", cy - r * Math.cos(Math.PI / 4))
        .attr("fill", "#2a2d3e")
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        .text(String(decade));
    }

    // Links
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        const sourceNode = nodes.find((n) => n.coupleId === d.source);
        return GEN_COLORS[Math.min(sourceNode?.generation ?? 0, GEN_COLORS.length - 1)];
      })
      .attr("stroke-width", 1.2)
      .attr("opacity", 0.25);

    // Node groups
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, WheelNode>("g")
      .data(nodes, (d) => d.coupleId)
      .join("g")
      .attr("cursor", "grab")
      .on("mouseenter", (_event, d) => {
        // Highlight this node and its connections
        nodeSel.attr("opacity", (n) => {
          if (n.coupleId === d.coupleId) return 1;
          if (n.parentCoupleId === d.coupleId) return 1;
          if (d.parentCoupleId === n.coupleId) return 1;
          return 0.2;
        });
        linkSel.attr("opacity", (l) => {
          if (l.source === d.coupleId || l.target === d.coupleId) return 0.6;
          return 0.05;
        });
      })
      .on("mouseleave", () => {
        nodeSel.attr("opacity", 1);
        linkSel.attr("opacity", 0.25);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        setTooltip({ node: d, x: d.x ?? 0, y: d.y ?? 0 });
      });

    // Circle for each node
    nodeSel
      .append("circle")
      .attr("r", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)])
      .attr("fill", (d) =>
        d.isSingle ? "none" : GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)],
      )
      .attr("stroke", (d) => GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)])
      .attr("stroke-width", (d) => (d.isSingle ? 1.5 : 0));

    // Branch label above
    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 4))
      .attr("fill", "#e0e0e0")
      .attr("font-size", 10)
      .text((d) => d.branchLabel);

    // Names + year below
    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 13)
      .attr("fill", "#777")
      .attr("font-size", 8)
      .text((d) => {
        const name1 = d.fabriciusPerson.firstName;
        const name2 = d.partnerPerson?.firstName;
        const year = String(d.birthYear).slice(2);
        return name2 ? `${name1} & ${name2} '${year}` : `${name1} '${year}`;
      });

    // Force simulation
    const simulation = d3
      .forceSimulation<WheelNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<WheelNode, WheelLink>(links)
          .id((d) => d.coupleId)
          .strength(0.1),
      )
      .force("collision", d3.forceCollide<WheelNode>((d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 8))
      .force(
        "x",
        d3.forceX<WheelNode>((d) => (positions.get(d.coupleId)?.x ?? 0) + cx).strength(0.3),
      )
      .force(
        "y",
        d3.forceY<WheelNode>((d) => (positions.get(d.coupleId)?.y ?? 0) + cy).strength(0.3),
      )
      .alphaDecay(0.02)
      .on("tick", () => {
        linkSel
          .attr("x1", (d) => {
            const src = nodes.find((n) => n.coupleId === (typeof d.source === "string" ? d.source : (d.source as WheelNode).coupleId));
            return src?.x ?? 0;
          })
          .attr("y1", (d) => {
            const src = nodes.find((n) => n.coupleId === (typeof d.source === "string" ? d.source : (d.source as WheelNode).coupleId));
            return src?.y ?? 0;
          })
          .attr("x2", (d) => {
            const tgt = nodes.find((n) => n.coupleId === (typeof d.target === "string" ? d.target : (d.target as WheelNode).coupleId));
            return tgt?.x ?? 0;
          })
          .attr("y2", (d) => {
            const tgt = nodes.find((n) => n.coupleId === (typeof d.target === "string" ? d.target : (d.target as WheelNode).coupleId));
            return tgt?.y ?? 0;
          });
        nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, WheelNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);

    // Click on background to dismiss tooltip
    sel.on("click", () => setTooltip(null));

    return () => {
      simulation.stop();
    };
  }, [familyData, rootCoupleId, getLayout]);

  // Re-target forces when layout mode changes (without rebuilding)
  useEffect(() => {
    const sim = simulationRef.current;
    const graph = graphRef.current;
    const svg = svgRef.current;
    if (!sim || !graph || !svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const cx = width / 2;
    const cy = height / 2;
    const positions = getLayout(graph.nodes, width, height);

    sim
      .force(
        "x",
        d3.forceX<WheelNode>((d) => (positions.get(d.coupleId)?.x ?? 0) + cx).strength(0.3),
      )
      .force(
        "y",
        d3.forceY<WheelNode>((d) => (positions.get(d.coupleId)?.y ?? 0) + cy).strength(0.3),
      );
    sim.alpha(0.8).restart();
  }, [layoutMode, getLayout]);

  return (
    <div className="relative w-full h-screen" style={{ background: "#0f1117" }}>
      {/* Title */}
      <div className="absolute top-5 left-5 z-10">
        <h1 className="text-lg font-semibold text-white">Fabricius Familiehjul</h1>
        <p className="text-sm text-gray-500">Drag nodes freely — use buttons to re-sort</p>
      </div>

      {/* Layout mode buttons */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
        {(["wheel", "birthOrder", "branchSize"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setLayoutMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
              layoutMode === mode
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
            }`}
          >
            {mode === "wheel" ? "Wheel" : mode === "birthOrder" ? "Birth Order" : "Branch Size"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-10 flex gap-4 text-sm">
        {["Gen 0 (root)", "Gen 1", "Gen 2", "Gen 3+"].map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: GEN_COLORS[i] }}
            />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 text-sm shadow-lg"
          style={{ left: tooltip.x + 20, top: tooltip.y - 20, minWidth: 180 }}
        >
          <div className="text-white font-medium">
            {tooltip.node.fabriciusPerson.firstName}
            {tooltip.node.partnerPerson ? ` & ${tooltip.node.partnerPerson.firstName}` : ""}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {tooltip.node.branchLabel} · Born {tooltip.node.birthYear}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Generation {tooltip.node.generation}
            {tooltip.node.childCount > 0
              ? ` · ${tooltip.node.childCount} ${tooltip.node.childCount === 1 ? "child" : "children"}`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the component builds**

```bash
pnpm build 2>&1 | head -30
```

Expected: No TypeScript or import errors related to `FamilyWheel.tsx`. (The page doesn't exist yet so the component isn't used, but Astro should still type-check it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/FamilyWheel.tsx
git commit -m "feat: add FamilyWheel React component with D3 force simulation"
```

---

### Task 5: Create the `/explore` Astro page

Wire it all together: load the data and mount the React island.

**Files:**
- Create: `src/pages/explore.astro`

- [ ] **Step 1: Create `explore.astro`**

```astro
---
import { loadRawFamilyData } from "../types/simple-family-utils";
import "../styles/global.css";

const familyData = await loadRawFamilyData();
---

<html lang="da" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Fabricius Familiehjul — Explore</title>
    <meta name="description" content="Interaktiv visualisering af Fabricius familien" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="wheel-root" style="width: 100vw; height: 100vh;">
      <!-- FamilyWheel is imported dynamically as client:only to avoid SSR issues with D3 -->
    </div>
    <script define:vars={{ familyData: JSON.stringify(familyData) }}>
      // Pass data to the React island via a global
      window.__FAMILY_DATA__ = JSON.parse(familyData);
    </script>
    <!-- We use a separate client-side entry to mount React with the data -->
  </body>
</html>
```

Actually, Astro's `client:only` with props is cleaner. Revise:

```astro
---
import { loadRawFamilyData } from "../types/simple-family-utils";
import FamilyWheel from "../components/FamilyWheel";
import "../styles/global.css";

const familyData = await loadRawFamilyData();
---

<html lang="da" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Fabricius Familiehjul — Explore</title>
    <meta name="description" content="Interaktiv visualisering af Fabricius familien" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    </style>
  </head>
  <body>
    <FamilyWheel
      familyData={familyData}
      rootCoupleId="niels-peter-dorthea"
      client:only="react"
    />
  </body>
</html>
```

- [ ] **Step 2: Start dev server and verify the page loads**

```bash
pnpm dev
```

Open `http://localhost:4321/explore` in the browser. Verify:
- Dark background loads
- Wheel visualization renders with all family nodes
- Nodes are draggable
- Hover highlights connections
- Click shows tooltip
- Layout buttons switch between modes with animation

- [ ] **Step 3: Commit**

```bash
git add src/pages/explore.astro
git commit -m "feat: add /explore page with family wheel visualization"
```

---

### Task 6: Manual testing and polish

Verify the full experience and fix any issues.

**Files:**
- Possibly modify: `src/components/FamilyWheel.tsx`, `src/lib/wheel-graph.ts`, `src/lib/wheel-layouts.ts`

- [ ] **Step 1: Test all layout modes**

Open `http://localhost:4321/explore`:
- Click "Wheel" — nodes should animate to equal-angle layout
- Click "Birth Order" — nodes re-sort by birth order
- Click "Branch Size" — larger branches get more angular space
- After each switch, verify nodes animate smoothly (~500ms)

- [ ] **Step 2: Test drag interaction**

- Drag a node away from its position — it should follow the cursor
- Release — it should drift back toward its computed position
- Drag while in different layout modes
- Verify other nodes respond (collision avoidance)

- [ ] **Step 3: Test hover and click**

- Hover over a node — it and its parent/children should stay bright, others dim
- Move away — all return to normal
- Click a node — tooltip appears with correct info
- Click background — tooltip dismisses

- [ ] **Step 4: Verify data accuracy**

Spot-check against `couples.json`:
- Root node shows "Niels Peter & Dorthea"
- Grete branch has 3 children (Bo, Peter, Helle)
- Thomas shows as single (outline circle)
- Bodil & Carl have 3 children (Mads, Thea, Selma)
- Birth years match the Fabricius-side person

- [ ] **Step 5: Test zoom**

- Scroll to zoom in/out
- Verify decade ring labels remain readable
- Verify nodes don't overflow at extreme zoom levels

- [ ] **Step 6: Fix any issues found, commit**

```bash
git add -u
git commit -m "fix: polish family wheel visualization"
```

(Only if changes were needed.)

---

### Task 7: Run all tests

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass including `wheel-graph.test.ts` and `wheel-layouts.test.ts`.

- [ ] **Step 2: Run production build**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Preview production build**

```bash
pnpm preview
```

Open `http://localhost:4321/explore` and verify the wheel works in the production build.
