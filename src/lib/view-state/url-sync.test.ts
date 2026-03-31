import { describe, it, expect } from "vitest";
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
