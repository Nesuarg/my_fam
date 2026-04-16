# Shareable View State

## Problem

Users want to share a specific arrangement of the family wheel (or future visualizations) with others. The recipient should see the exact same view — same node positions, zoom, pan, and settings — as the sharer.

## Solution

A generic `view-state` library that encodes the diff between a deterministic baseline layout and the current view state into a compressed URL parameter. Any visualization can register with this system.

## State Model

```typescript
interface ViewState {
  settings: Record<string, string | number | boolean>;
  camera: { k: number; x: number; y: number };
  diffs: Record<string, [number, number]>;
}
```

- **settings**: visualization-specific toggles (layout mode, labels, rings, etc.)
- **camera**: D3 zoom transform (scale, pan x, pan y)
- **diffs**: node position deltas from the deterministic baseline, keyed by node ID as `[dx, dy]` integer pairs. Only nodes whose displacement exceeds a 1px threshold are included.

## Baseline & Diff Strategy

Each visualization defines a deterministic baseline function — for the wheel, that's the existing `computeWheelLayout` / `computeBranchSizeLayout` etc. These are pure functions: same input, same output.

The D3 force simulation introduces non-determinism (collision avoidance), and user dragging moves nodes further. The diff captures the displacement from baseline for every node that moved more than 1px.

On restore, the simulation is effectively frozen: all nodes get `fx`/`fy` set to `baseline + diff`, and the simulation runs at `alpha(0)` purely for rendering.

## Viewport Normalization

Baseline positions are viewport-dependent (via `computeScaleFactor`). To make links portable across screen sizes:

- Before computing diffs, normalize all positions to a reference viewport of 1024x768 (center at 512, 384). Normalization means: compute the baseline at reference size, compute node positions relative to center, then diff.
- On restore, compute the baseline at the recipient's actual viewport size, then apply the diffs (which are in reference-viewport units, scaled proportionally by `actualSize / referenceSize`)

This means a link shared from desktop renders proportionally correct on mobile.

## Encoding Pipeline

```
ViewState → compact JSON → gzip → base64url → URL param `v`
```

**Compact JSON** uses short keys to minimize pre-compression size:

```json
{"s":{"l":"wheel","b":true,"r":true},"c":[1.2,300,-50],"d":{"mads-mette":[3,-7],"niels-peter-dorthea":[-12,4]}}
```

- `s` = settings, `c` = camera (as tuple), `d` = diffs (as `[dx, dy]` tuples)
- Positions rounded to integers (sub-pixel precision is unnecessary)

**Compression** uses browser-native `CompressionStream` / `DecompressionStream` (gzip). No external library needed.

**URL format:**

```
/explore?v=eJyLVk7OT0lV0lEqS8wp...
```

Single param `v`, base64url-encoded (URL-safe alphabet, no escaping needed).

**Estimated URL length** with ~20 diffs (typical): ~310 chars total.

## File Structure

```
src/lib/view-state/
  types.ts              — ViewState, ViewStateConfig interfaces
  codec.ts              — compress/decompress (gzip + base64url)
  url-sync.ts           — read state from URL on load, debounced replaceState writes
  use-shareable-view.ts — React hook tying it all together
```

## ViewStateConfig Interface

Each visualization registers via a config object:

```typescript
interface ViewStateConfig<S> {
  baseline: () => Map<string, { x: number; y: number }>;
  positions: () => Map<string, { x: number; y: number }>;
  getSettings: () => S;
  applySettings: (s: S) => void;
  applyPositions: (positions: Map<string, { x: number; y: number }>) => void;
  getCamera: () => { k: number; x: number; y: number };
  applyCamera: (cam: { k: number; x: number; y: number }) => void;
  threshold?: number; // diff threshold in pixels, default 1
}
```

## React Hook

`useShareableView(config)` returns:

```typescript
{
  copyShareLink: () => Promise<void>;
  isRestored: boolean;
}
```

- On mount: if `?v=` param exists, decodes and calls `applySettings`, `applyPositions`, `applyCamera`
- On state changes: debounced `history.replaceState` (500ms) keeps the URL bar current
- `copyShareLink`: compresses current state, writes full URL to clipboard

## FamilyWheel Integration

1. **Config wiring**: `baseline` calls the existing layout functions with reference viewport. `positions` reads D3 node `x`/`y`. Camera reads the D3 zoom transform.
2. **Restore mode**: When `isRestored` is true, skip the force simulation settling — set `fx`/`fy` on all nodes to restored positions, run simulation at `alpha(0)`.
3. **URL update triggers**: drag end, zoom end, layout mode change, label toggle, ring toggle. All flow through the hook's debounced `replaceState`.
4. **Share button**: Added to the top-right button bar, same styling as existing buttons. Calls `copyShareLink()`, shows "Copied!" text for 2 seconds.

## UX

- URL bar updates live as you interact (like Google Maps)
- Share button in top-right copies the current URL to clipboard with a brief "Copied!" confirmation
- No modal, no QR code, no popover

## Out of Scope

- Short URLs / server-side state storage
- OG preview images
- Share-to-social integrations
- State format versioning (handle if/when schema changes)
- Visualizations other than the wheel (architecture supports them, but only wheel is wired up now)
