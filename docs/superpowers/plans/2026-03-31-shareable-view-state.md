# Shareable View State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to share a URL that reproduces the exact arrangement of the family wheel (or any future visualization).

**Architecture:** A generic `view-state` library in `src/lib/view-state/` handles diff computation from deterministic baselines, gzip+base64url encoding, URL read/write, and a React hook. The wheel is the first consumer.

**Tech Stack:** TypeScript, Vitest, React hooks, browser-native CompressionStream/DecompressionStream, History API

**Spec:** `docs/superpowers/specs/2026-03-31-shareable-view-state-design.md`

---

## File Structure

```
src/lib/view-state/
  types.ts              — ViewState, ViewStateConfig, CompactState interfaces
  codec.ts              — gzip compress/decompress + base64url encode/decode
  diff.ts               — computeDiffs / applyDiffs with viewport normalization
  url-sync.ts           — readStateFromURL / writeStateToURL (debounced replaceState)
  use-shareable-view.ts — React hook combining codec, diff, url-sync

src/lib/view-state/codec.test.ts
src/lib/view-state/diff.test.ts
src/lib/view-state/url-sync.test.ts

src/components/FamilyWheel.tsx  — modified to use the hook + share button
```

---

### Task 1: Types

**Files:**
- Create: `src/lib/view-state/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/view-state/types.ts

export interface ViewState {
  settings: Record<string, string | number | boolean>;
  camera: { k: number; x: number; y: number };
  diffs: Record<string, [number, number]>;
}

/** Compact wire format — short keys to minimize pre-compression size */
export interface CompactState {
  s: Record<string, string | number | boolean>;
  c: [number, number, number];
  d: Record<string, [number, number]>;
}

export interface ViewStateConfig<S extends Record<string, string | number | boolean>> {
  /** Compute deterministic baseline positions at reference viewport (1024x768) */
  baseline: () => Map<string, { x: number; y: number }>;
  /** Current node positions from the live visualization */
  positions: () => Map<string, { x: number; y: number }>;
  /** Current visualization settings */
  getSettings: () => S;
  /** Apply restored settings */
  applySettings: (s: S) => void;
  /** Apply restored absolute positions (set fx/fy to pin nodes) */
  applyPositions: (positions: Map<string, { x: number; y: number }>) => void;
  /** Current camera transform */
  getCamera: () => { k: number; x: number; y: number };
  /** Apply restored camera transform */
  applyCamera: (cam: { k: number; x: number; y: number }) => void;
  /** Diff threshold in pixels (default 1) */
  threshold?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/view-state/types.ts
git commit -m "feat(view-state): add type definitions"
```

---

### Task 2: Codec (gzip + base64url)

**Files:**
- Create: `src/lib/view-state/codec.ts`
- Create: `src/lib/view-state/codec.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/view-state/codec.test.ts
import { describe, it, expect } from "vitest";
import { compress, decompress } from "./codec";
import type { CompactState } from "./types";

describe("codec", () => {
  it("roundtrips a compact state through compress/decompress", async () => {
    const input: CompactState = {
      s: { l: "wheel", b: true, r: true },
      c: [1.2, 300, -50],
      d: { "mads-mette": [3, -7], "niels-peter-dorthea": [-12, 4] },
    };
    const encoded = await compress(input);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");

    const decoded = await decompress(encoded);
    expect(decoded).toEqual(input);
  });

  it("produces a shorter string than raw JSON", async () => {
    const input: CompactState = {
      s: { l: "wheel", b: true, r: true },
      c: [1, 0, 0],
      d: Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`node-${i}`, [i * 2, i * -3]]),
      ),
    };
    const encoded = await compress(input);
    const rawJson = JSON.stringify(input);
    expect(encoded.length).toBeLessThan(rawJson.length);
  });

  it("returns null for invalid base64url input", async () => {
    const result = await decompress("not-valid-gzip-data!!!");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/codec.test.ts`
Expected: FAIL — cannot find module `./codec`

- [ ] **Step 3: Implement codec**

```typescript
// src/lib/view-state/codec.ts
import type { CompactState } from "./types";

function toBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function compress(state: CompactState): Promise<string> {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  const compressed = await gzip(bytes);
  return toBase64Url(compressed);
}

export async function decompress(encoded: string): Promise<CompactState | null> {
  try {
    const compressed = fromBase64Url(encoded);
    const bytes = await gunzip(compressed);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as CompactState;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/codec.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/view-state/codec.ts src/lib/view-state/codec.test.ts
git commit -m "feat(view-state): add gzip + base64url codec"
```

---

### Task 3: Diff computation with viewport normalization

**Files:**
- Create: `src/lib/view-state/diff.ts`
- Create: `src/lib/view-state/diff.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/view-state/diff.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/diff.test.ts`
Expected: FAIL — cannot find module `./diff`

- [ ] **Step 3: Implement diff module**

```typescript
// src/lib/view-state/diff.ts

export const REF_WIDTH = 1024;
export const REF_HEIGHT = 768;

/**
 * Compute position diffs between baseline and current, normalized to reference viewport.
 * Only includes nodes displaced more than `threshold` pixels (in reference units).
 */
export function computeDiffs(
  baseline: Map<string, { x: number; y: number }>,
  current: Map<string, { x: number; y: number }>,
  actualWidth: number,
  actualHeight: number,
  threshold: number,
): Record<string, [number, number]> {
  const scaleX = REF_WIDTH / actualWidth;
  const scaleY = REF_HEIGHT / actualHeight;
  const diffs: Record<string, [number, number]> = {};

  for (const [id, basePos] of baseline) {
    const curPos = current.get(id);
    if (!curPos) continue;

    const dx = Math.round((curPos.x - basePos.x) * scaleX);
    const dy = Math.round((curPos.y - basePos.y) * scaleY);

    if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
      diffs[id] = [dx, dy];
    }
  }

  return diffs;
}

/**
 * Apply diffs (in reference viewport units) to baseline positions,
 * scaling to actual viewport size.
 */
export function applyDiffs(
  baseline: Map<string, { x: number; y: number }>,
  diffs: Record<string, [number, number]>,
  actualWidth: number,
  actualHeight: number,
): Map<string, { x: number; y: number }> {
  const scaleX = actualWidth / REF_WIDTH;
  const scaleY = actualHeight / REF_HEIGHT;
  const result = new Map<string, { x: number; y: number }>();

  for (const [id, basePos] of baseline) {
    const diff = diffs[id];
    if (diff) {
      result.set(id, {
        x: basePos.x + diff[0] * scaleX,
        y: basePos.y + diff[1] * scaleY,
      });
    } else {
      result.set(id, { x: basePos.x, y: basePos.y });
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/diff.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/view-state/diff.ts src/lib/view-state/diff.test.ts
git commit -m "feat(view-state): add diff computation with viewport normalization"
```

---

### Task 4: URL sync (read/write URL params)

**Files:**
- Create: `src/lib/view-state/url-sync.ts`
- Create: `src/lib/view-state/url-sync.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/view-state/url-sync.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toCompact, fromCompact } from "./url-sync";
import type { ViewState } from "./types";

describe("toCompact / fromCompact", () => {
  it("roundtrips a ViewState through compact format", () => {
    const state: ViewState = {
      settings: { layout: "wheel", labels: true, rings: false },
      camera: { k: 1.5, x: 200, y: -100 },
      diffs: { "mads-mette": [10, -5], "root": [0, 3] },
    };
    const compact = toCompact(state);
    expect(compact.s).toEqual(state.settings);
    expect(compact.c).toEqual([1.5, 200, -100]);
    expect(compact.d).toEqual(state.diffs);

    const restored = fromCompact(compact);
    expect(restored).toEqual(state);
  });

  it("handles empty diffs", () => {
    const state: ViewState = {
      settings: { layout: "wheel" },
      camera: { k: 1, x: 0, y: 0 },
      diffs: {},
    };
    const compact = toCompact(state);
    const restored = fromCompact(compact);
    expect(restored).toEqual(state);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/url-sync.test.ts`
Expected: FAIL — cannot find module `./url-sync`

- [ ] **Step 3: Implement url-sync**

```typescript
// src/lib/view-state/url-sync.ts
import type { ViewState, CompactState } from "./types";
import { compress, decompress } from "./codec";

const URL_PARAM = "v";

export function toCompact(state: ViewState): CompactState {
  return {
    s: state.settings,
    c: [state.camera.k, state.camera.x, state.camera.y],
    d: state.diffs,
  };
}

export function fromCompact(compact: CompactState): ViewState {
  return {
    settings: compact.s,
    camera: { k: compact.c[0], x: compact.c[1], y: compact.c[2] },
    diffs: compact.d,
  };
}

/** Read and decode view state from the current URL's `?v=` param. Returns null if absent or invalid. */
export async function readStateFromURL(): Promise<ViewState | null> {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(URL_PARAM);
  if (!encoded) return null;

  const compact = await decompress(encoded);
  if (!compact) return null;

  return fromCompact(compact);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Encode view state and write it to the URL bar via replaceState. Debounced at 500ms. */
export function writeStateToURL(state: ViewState): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const encoded = await compress(toCompact(state));
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, encoded);
    window.history.replaceState(null, "", url.toString());
  }, 500);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run src/lib/view-state/url-sync.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/view-state/url-sync.ts src/lib/view-state/url-sync.test.ts
git commit -m "feat(view-state): add URL read/write with compact format"
```

---

### Task 5: React hook — useShareableView

**Files:**
- Create: `src/lib/view-state/use-shareable-view.ts`

This hook is tightly coupled to browser APIs (clipboard, URL, React lifecycle) and will be tested via the FamilyWheel integration rather than in isolation.

- [ ] **Step 1: Implement the hook**

```typescript
// src/lib/view-state/use-shareable-view.ts
import { useEffect, useRef, useState, useCallback } from "react";
import type { ViewState, ViewStateConfig } from "./types";
import { computeDiffs, applyDiffs } from "./diff";
import { compress } from "./codec";
import { readStateFromURL, writeStateToURL, toCompact } from "./url-sync";

export function useShareableView<S extends Record<string, string | number | boolean>>(
  config: ViewStateConfig<S>,
): {
  copyShareLink: () => Promise<void>;
  isRestored: boolean;
  updateURL: () => void;
} {
  const [isRestored, setIsRestored] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  // On mount: check for ?v= param and restore
  useEffect(() => {
    let cancelled = false;
    readStateFromURL().then((state) => {
      if (cancelled || !state) return;
      const cfg = configRef.current;
      cfg.applySettings(state.settings as S);
      cfg.applyCamera(state.camera);

      const baseline = cfg.baseline();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const positions = applyDiffs(baseline, state.diffs, width, height);
      cfg.applyPositions(positions);

      setIsRestored(true);
    });
    return () => { cancelled = true; };
  }, []);

  const buildState = useCallback((): ViewState => {
    const cfg = configRef.current;
    const threshold = cfg.threshold ?? 1;
    const baseline = cfg.baseline();
    const current = cfg.positions();
    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      settings: cfg.getSettings(),
      camera: cfg.getCamera(),
      diffs: computeDiffs(baseline, current, width, height, threshold),
    };
  }, []);

  const updateURL = useCallback(() => {
    writeStateToURL(buildState());
  }, [buildState]);

  const copyShareLink = useCallback(async () => {
    const state = buildState();
    const encoded = await compress(toCompact(state));
    const url = new URL(window.location.href);
    url.searchParams.set("v", encoded);
    await navigator.clipboard.writeText(url.toString());
  }, [buildState]);

  return { copyShareLink, isRestored, updateURL };
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/lib/view-state/index.ts
export { useShareableView } from "./use-shareable-view";
export type { ViewState, ViewStateConfig, CompactState } from "./types";
export { computeDiffs, applyDiffs, REF_WIDTH, REF_HEIGHT } from "./diff";
export { compress, decompress } from "./codec";
export { readStateFromURL, writeStateToURL, toCompact, fromCompact } from "./url-sync";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/view-state/use-shareable-view.ts src/lib/view-state/index.ts
git commit -m "feat(view-state): add useShareableView React hook"
```

---

### Task 6: Integrate with FamilyWheel

**Files:**
- Modify: `src/components/FamilyWheel.tsx`
- Modify: `src/lib/wheel-layouts.ts` (add reference-viewport baseline helper)

This task modifies the existing FamilyWheel component to wire in the shareable view system and add a share button.

- [ ] **Step 1: Add a reference-viewport baseline helper to wheel-layouts.ts**

Add this function at the end of `src/lib/wheel-layouts.ts`:

```typescript
import { REF_WIDTH, REF_HEIGHT } from "./view-state/diff";

/**
 * Compute layout positions at the reference viewport (1024x768),
 * centered at (REF_WIDTH/2, REF_HEIGHT/2).
 */
export function computeBaselinePositions(
  nodes: WheelNode[],
  layoutMode: "wheel" | "birthOrder" | "branchSize",
): Map<string, { x: number; y: number }> {
  const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
  let positions: Map<string, { x: number; y: number }>;
  switch (layoutMode) {
    case "birthOrder":
      positions = computeBirthOrderLayout(nodes, rootBirthYear, REF_WIDTH, REF_HEIGHT);
      break;
    case "branchSize":
      positions = computeBranchSizeLayout(nodes, rootBirthYear, REF_WIDTH, REF_HEIGHT);
      break;
    default:
      positions = computeWheelLayout(nodes, rootBirthYear, REF_WIDTH, REF_HEIGHT);
  }
  // Shift from center-origin to absolute viewport coords
  const cx = REF_WIDTH / 2;
  const cy = REF_HEIGHT / 2;
  const result = new Map<string, { x: number; y: number }>();
  for (const [id, pos] of positions) {
    result.set(id, { x: pos.x + cx, y: pos.y + cy });
  }
  return result;
}
```

- [ ] **Step 2: Wire the hook into FamilyWheel.tsx**

Add these imports at the top of `src/components/FamilyWheel.tsx`:

```typescript
import { useShareableView } from "@/lib/view-state";
import type { ViewStateConfig } from "@/lib/view-state";
import { computeBaselinePositions } from "@/lib/wheel-layouts";
```

After the existing `useCallback` for `getLayout` (~line 63), add the shareable view hook wiring. Insert this block before the main `useEffect`:

```typescript
  const zoomTransformRef = useRef<{ k: number; x: number; y: number }>({ k: 1, x: 0, y: 0 });

  const viewStateConfig: ViewStateConfig<{ layout: string; labels: boolean; rings: boolean }> = {
    baseline: () => {
      const graph = graphRef.current;
      if (!graph) return new Map();
      return computeBaselinePositions(graph.nodes, layoutMode);
    },
    positions: () => {
      const graph = graphRef.current;
      if (!graph) return new Map();
      const positions = new Map<string, { x: number; y: number }>();
      for (const node of graph.nodes) {
        if (node.x !== undefined && node.y !== undefined) {
          positions.set(node.coupleId, { x: node.x, y: node.y });
        }
      }
      return positions;
    },
    getSettings: () => ({ layout: layoutMode, labels: showLabels, rings: showRings }),
    applySettings: (s) => {
      setLayoutMode(s.layout as LayoutMode);
      setShowLabels(s.labels);
      setShowRings(s.rings);
    },
    applyPositions: (positions) => {
      const graph = graphRef.current;
      if (!graph) return;
      for (const node of graph.nodes) {
        const pos = positions.get(node.coupleId);
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.fx = pos.x;
          node.fy = pos.y;
        }
      }
    },
    getCamera: () => zoomTransformRef.current,
    applyCamera: (cam) => {
      zoomTransformRef.current = cam;
    },
  };

  const { copyShareLink, isRestored, updateURL } = useShareableView(viewStateConfig);
  const [copied, setCopied] = useState(false);
```

- [ ] **Step 3: Update the zoom handler to track transform and trigger URL updates**

In the main `useEffect`, find the zoom handler (~line 100):

```typescript
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        const k = event.transform.k;
        zoomScaleRef.current = k;
        g.selectAll<SVGTextElement, unknown>(".node-label, .node-sublabel")
          .attr("transform", `scale(${1 / k})`);
      });
```

Replace with:

```typescript
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        const k = event.transform.k;
        zoomScaleRef.current = k;
        zoomTransformRef.current = { k: event.transform.k, x: event.transform.x, y: event.transform.y };
        g.selectAll<SVGTextElement, unknown>(".node-label, .node-sublabel")
          .attr("transform", `scale(${1 / k})`);
        updateURL();
      });
```

- [ ] **Step 4: Apply restored camera transform after zoom setup**

Right after `sel.call(zoom);` (~line 108), add:

```typescript
    // If restoring from shared URL, apply the saved camera transform
    if (isRestored) {
      const cam = zoomTransformRef.current;
      const initialTransform = d3.zoomIdentity.translate(cam.x, cam.y).scale(cam.k);
      sel.call(zoom.transform, initialTransform);
    }
```

- [ ] **Step 5: Pin all nodes when restoring (skip simulation settling)**

In the force simulation setup (~line 237), after creating the simulation but before `simulationRef.current = simulation;`, add:

```typescript
    // If restoring from shared URL, freeze the simulation — nodes are already pinned via applyPositions
    if (isRestored) {
      simulation.alpha(0);
    }
```

- [ ] **Step 6: Trigger URL update on drag end**

In the drag behavior `.on("end")` handler (~line 291), add `updateURL()`:

```typescript
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        updateURL();
      });
```

- [ ] **Step 7: Add the Share button to the UI**

In the top-right button bar (after the Rings button, ~line 456), add:

```typescript
        <button
          onClick={async () => {
            await copyShareLink();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="px-3 py-1.5 rounded-md text-xs border transition-colors bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
        >
          {copied ? "Copied!" : "Share"}
        </button>
```

- [ ] **Step 8: Trigger URL update when toggles change**

Add a `useEffect` that calls `updateURL` when settings change (after the existing toggle effects):

```typescript
  useEffect(() => {
    updateURL();
  }, [layoutMode, showLabels, showRings, updateURL]);
```

- [ ] **Step 9: Run the full test suite**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run`
Expected: All existing tests pass, plus the new codec and diff tests

- [ ] **Step 10: Manual smoke test**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm dev`

1. Open `/explore` in the browser
2. Drag a few nodes, zoom in, toggle labels off
3. Check the URL bar updates with a `?v=` param
4. Copy the URL, open in a new tab — verify the view matches
5. Click the Share button — verify "Copied!" appears and clipboard has the URL

- [ ] **Step 11: Commit**

```bash
git add src/components/FamilyWheel.tsx src/lib/wheel-layouts.ts
git commit -m "feat: integrate shareable view state into FamilyWheel"
```

---

### Task 7: Final cleanup and all-tests pass

**Files:**
- All view-state files

- [ ] **Step 1: Run the full test suite one final time**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 2: Run the build**

Run: `cd /Users/madsschmidt/Documents/fam/my_fam && pnpm build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Commit any remaining changes**

Only if there are fixes from step 1-2. Otherwise skip.
