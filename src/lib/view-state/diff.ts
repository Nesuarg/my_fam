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
