import { useEffect, useRef, useState, useCallback } from "react";
import type { ViewState, ViewStateConfig } from "./types";
import { computeDiffs } from "./diff";
import { compress } from "./codec";
import { readStateFromURL, writeStateToURL, toCompact } from "./url-sync";

export function useShareableView<S extends Record<string, string | number | boolean>>(
  config: ViewStateConfig<S>,
): {
  copyShareLink: () => Promise<void>;
  restoredState: ViewState | null;
  updateURL: () => void;
} {
  const [restoredState, setRestoredState] = useState<ViewState | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // On mount: decode URL state and store it — consumers apply it when ready
  useEffect(() => {
    let cancelled = false;
    readStateFromURL().then((state) => {
      if (cancelled || !state) return;
      setRestoredState(state);
    });
    return () => { cancelled = true; };
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeStateToURL(buildState());
    }, 500);
  }, [buildState]);

  const copyShareLink = useCallback(async () => {
    const state = buildState();
    const encoded = await compress(toCompact(state));
    const url = new URL(window.location.href);
    url.searchParams.set("v", encoded);
    await navigator.clipboard.writeText(url.toString());
  }, [buildState]);

  return { copyShareLink, restoredState, updateURL };
}
