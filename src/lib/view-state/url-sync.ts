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
