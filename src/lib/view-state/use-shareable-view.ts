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
