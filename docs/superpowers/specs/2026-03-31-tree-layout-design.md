# Tree Layout Mode

## Problem

The `/explore` page has three radial layout modes (wheel, birth order, branch size) but no classic top-down family tree view. Users expect to be able to see their family as a traditional hierarchy.

## Solution

Add a fourth layout mode, "Tree," to the existing layout switcher on `/explore`. Uses D3's `d3.tree()` algorithm to compute top-down hierarchical positions. Nodes animate from their current positions into the tree arrangement via the existing D3 force simulation.

## Layout Algorithm

1. Convert the flat `WheelNode[]` array into a `d3.hierarchy` tree by walking `parentCoupleId` relationships from the root node (generation 0)
2. Run `d3.tree().size([width - padding, height - padding])` to compute positions. D3's tree layout assigns `x` as horizontal spread within siblings and `y` as depth (generation level), which maps directly to the top-down orientation.
3. Convert the D3 hierarchy positions back to `Map<string, Position>` in center-origin coordinates, matching the interface of the existing layout functions (`computeWheelLayout` etc.)

The root couple appears at the top center. Each generation occupies a horizontal row below. Siblings are spaced evenly within their parent's subtree width. D3's tree algorithm handles subtree separation to avoid overlap.

## Integration

### LayoutMode type

Expand from `"wheel" | "birthOrder" | "branchSize"` to include `"tree"`.

### wheel-layouts.ts

Add `computeTreeLayout(nodes, rootBirthYear, width, height)` returning `Map<string, Position>`. Same signature as the existing layout functions.

Update `computeBaselinePositions` with a `"tree"` case.

### FamilyWheel.tsx

- Add `"tree"` case to `getLayout` callback
- Add a "Tree" button to the layout mode button bar
- No other changes — the layout switch effect already handles unpinning nodes, retargeting forces, and restarting the simulation

### Shareable view state

No changes needed. The view-state lib already encodes `settings.layout` in the URL. A shared link with `layout: "tree"` restores directly into tree view. `computeBaselinePositions` provides the deterministic baseline via the new `"tree"` case.

## What stays the same

- Same node representation (single circle per couple)
- Same straight lines between nodes
- Same zoom, drag, labels, decade rings, hover tooltips, edit mode, share button
- Same D3 force simulation for animation
- Same page (`/explore`), same component (`FamilyWheel`)

## Out of scope

- Collapsible subtrees
- Different node shapes or sizes for tree mode
- Org-chart style connectors (horizontal bars + vertical drops)
- Separate tree-specific rendering path
- New page or route
