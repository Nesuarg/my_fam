# Tree Layout Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tree" layout mode to `/explore` that arranges family nodes in a classic top-down hierarchy using D3's tree algorithm.

**Architecture:** A new `computeTreeLayout` function converts the flat `WheelNode[]` into a `d3.hierarchy`, runs `d3.tree()` for positioning, and returns a `Map<string, Position>` matching the existing layout interface. The FamilyWheel component gets a fourth layout button.

**Tech Stack:** D3 (`d3.hierarchy`, `d3.tree`), TypeScript, Vitest, React

**Spec:** `docs/superpowers/specs/2026-03-31-tree-layout-design.md`

---

## File Structure

```
src/lib/wheel-layouts.ts        — add computeTreeLayout, update computeBaselinePositions
src/lib/wheel-layouts.test.ts   — add tree layout tests
src/components/FamilyWheel.tsx   — add "tree" to LayoutMode, add button, wire layout
```

---

### Task 1: Tree layout function with tests

**Files:**
- Modify: `src/lib/wheel-layouts.ts`
- Modify: `src/lib/wheel-layouts.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to `src/lib/wheel-layouts.test.ts`:

```typescript
import { computeTreeLayout } from "./wheel-layouts";

// (at the bottom of the file, after existing describe blocks)

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

    // Children should be below root (higher y in center-origin = below)
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

    // Siblings should be at the same y level
    expect(c1Pos.y).toBeCloseTo(c2Pos.y, 0);
    // And different x positions
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/wheel-layouts.test.ts`
Expected: FAIL — `computeTreeLayout` is not exported

- [ ] **Step 3: Implement computeTreeLayout**

Add this import at the top of `src/lib/wheel-layouts.ts`:

```typescript
import * as d3 from "d3";
```

Add this function before `computeBaselinePositions` in `src/lib/wheel-layouts.ts`:

```typescript
interface HierarchyDatum {
  coupleId: string;
  children: HierarchyDatum[];
}

function buildHierarchy(nodes: WheelNode[]): HierarchyDatum | null {
  const root = nodes.find((n) => n.generation === 0);
  if (!root) return null;

  const childrenMap = new Map<string, WheelNode[]>();
  for (const node of nodes) {
    if (node.parentCoupleId) {
      const siblings = childrenMap.get(node.parentCoupleId) ?? [];
      siblings.push(node);
      childrenMap.set(node.parentCoupleId, siblings);
    }
  }

  function toDatum(node: WheelNode): HierarchyDatum {
    const children = (childrenMap.get(node.coupleId) ?? [])
      .sort((a, b) => a.birthOrder - b.birthOrder)
      .map(toDatum);
    return { coupleId: node.coupleId, children };
  }

  return toDatum(root);
}

export function computeTreeLayout(
  nodes: WheelNode[],
  _rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const datum = buildHierarchy(nodes);
  if (!datum) return positions;

  const padding = 40;
  const root = d3.hierarchy(datum);
  const treeLayout = d3.tree<HierarchyDatum>().size([
    width - padding * 2,
    height - padding * 2,
  ]);
  treeLayout(root);

  // d3.tree sets x = horizontal spread, y = depth
  // Convert to center-origin: subtract center offsets
  const cx = width / 2;
  const cy = height / 2;

  for (const descendant of root.descendants()) {
    positions.set(descendant.data.coupleId, {
      x: (descendant.x ?? 0) + padding - cx,
      y: (descendant.y ?? 0) + padding - cy,
    });
  }

  return positions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/wheel-layouts.test.ts`
Expected: All tests PASS (existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/wheel-layouts.ts src/lib/wheel-layouts.test.ts
git commit -m "feat: add computeTreeLayout using d3.tree()"
```

---

### Task 2: Update computeBaselinePositions and LayoutMode

**Files:**
- Modify: `src/lib/wheel-layouts.ts`
- Modify: `src/components/FamilyWheel.tsx`

- [ ] **Step 1: Add "tree" case to computeBaselinePositions**

In `src/lib/wheel-layouts.ts`, change the `computeBaselinePositions` function signature and body:

Change the `layoutMode` parameter type from:
```typescript
  layoutMode: "wheel" | "birthOrder" | "branchSize",
```
To:
```typescript
  layoutMode: "wheel" | "birthOrder" | "branchSize" | "tree",
```

Add a new case before the `default` in the switch:
```typescript
    case "tree":
      positions = computeTreeLayout(nodes, rootBirthYear, width, height);
      break;
```

- [ ] **Step 2: Update LayoutMode type in FamilyWheel.tsx**

In `src/components/FamilyWheel.tsx`, change:
```typescript
type LayoutMode = "wheel" | "birthOrder" | "branchSize";
```
To:
```typescript
type LayoutMode = "wheel" | "birthOrder" | "branchSize" | "tree";
```

- [ ] **Step 3: Add tree to getLayout callback**

In `src/components/FamilyWheel.tsx`, add the import for `computeTreeLayout`:

Change the import from `@/lib/wheel-layouts` to include `computeTreeLayout`:
```typescript
import {
  computeWheelLayout,
  computeBirthOrderLayout,
  computeBranchSizeLayout,
  computeTreeLayout,
  computeBaselinePositions,
} from "@/lib/wheel-layouts";
```

In the `getLayout` callback, add a case for `"tree"` before the `default`:
```typescript
  const getLayout = useCallback(
    (nodes: WheelNode[], width: number, height: number) => {
      const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
      switch (layoutMode) {
        case "birthOrder":
          return computeBirthOrderLayout(nodes, rootBirthYear, width, height);
        case "branchSize":
          return computeBranchSizeLayout(nodes, rootBirthYear, width, height);
        case "tree":
          return computeTreeLayout(nodes, rootBirthYear, width, height);
        default:
          return computeWheelLayout(nodes, rootBirthYear, width, height);
      }
    },
    [layoutMode],
  );
```

- [ ] **Step 4: Add the Tree button to the layout mode button bar**

In `src/components/FamilyWheel.tsx`, find the array of layout buttons:
```typescript
        {(["wheel", "birthOrder", "branchSize"] as const).map((mode) => (
```
Change to:
```typescript
        {(["wheel", "birthOrder", "branchSize", "tree"] as const).map((mode) => (
```

And update the label mapping inside the button text. Find:
```typescript
            {mode === "wheel" ? "Wheel" : mode === "birthOrder" ? "Birth Order" : "Branch Size"}
```
Change to:
```typescript
            {mode === "wheel" ? "Wheel" : mode === "birthOrder" ? "Birth Order" : mode === "branchSize" ? "Branch Size" : "Tree"}
```

- [ ] **Step 5: Run the full test suite**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 6: Run the build**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/wheel-layouts.ts src/components/FamilyWheel.tsx
git commit -m "feat: add Tree layout mode to /explore"
```
