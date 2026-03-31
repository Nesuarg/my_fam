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
