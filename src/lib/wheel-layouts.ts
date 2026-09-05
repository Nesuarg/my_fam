import * as d3 from "d3";
import type { WheelNode } from "./wheel-graph";

export interface Position {
  x: number;
  y: number;
}

function polarToCartesian(angle: number, radius: number): Position {
  return {
    x: radius * Math.sin(angle),
    y: -radius * Math.cos(angle),
  };
}

function computeScaleFactor(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): number {
  const maxYear = Math.max(...nodes.map((n) => n.birthYear));
  const yearSpan = maxYear - rootBirthYear;
  if (yearSpan === 0) return 1;
  const maxRadius = Math.min(width, height) / 2 - 40; // padding
  return maxRadius / yearSpan;
}

function birthYearToRadius(
  birthYear: number,
  rootBirthYear: number,
  scale: number,
): number {
  return (birthYear - rootBirthYear) * scale;
}

function assignAngles(
  nodes: WheelNode[],
  parentCoupleId: string | null,
  startAngle: number,
  endAngle: number,
  angles: Map<string, number>,
  weightFn?: (node: WheelNode, allNodes: WheelNode[]) => number,
) {
  const children = nodes
    .filter((n) => n.parentCoupleId === parentCoupleId)
    .sort((a, b) => a.birthOrder - b.birthOrder);

  if (children.length === 0) return;

  if (weightFn) {
    const weights = children.map((c) => weightFn(c, nodes));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let currentAngle = startAngle;
    for (let i = 0; i < children.length; i++) {
      const sliceSize = ((endAngle - startAngle) * weights[i]) / totalWeight;
      const midAngle = currentAngle + sliceSize / 2;
      angles.set(children[i].coupleId, midAngle);
      assignAngles(nodes, children[i].coupleId, currentAngle, currentAngle + sliceSize, angles, weightFn);
      currentAngle += sliceSize;
    }
  } else {
    const sliceSize = (endAngle - startAngle) / children.length;
    for (let i = 0; i < children.length; i++) {
      const midAngle = startAngle + sliceSize * i + sliceSize / 2;
      angles.set(children[i].coupleId, midAngle);
      assignAngles(nodes, children[i].coupleId, startAngle + sliceSize * i, startAngle + sliceSize * (i + 1), angles);
    }
  }
}

function countDescendants(node: WheelNode, allNodes: WheelNode[]): number {
  const children = allNodes.filter((n) => n.parentCoupleId === node.coupleId);
  let count = children.length;
  for (const child of children) {
    count += countDescendants(child, allNodes);
  }
  return count;
}

export function computeWheelLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const scale = computeScaleFactor(nodes, rootBirthYear, width, height);
  const root = nodes.find((n) => n.generation === 0);
  if (!root) return positions;

  positions.set(root.coupleId, { x: 0, y: 0 });

  const angles = new Map<string, number>();
  assignAngles(nodes, root.coupleId, 0, Math.PI * 2, angles);

  for (const node of nodes) {
    if (node.generation === 0) continue;
    const angle = angles.get(node.coupleId) ?? 0;
    const radius = birthYearToRadius(node.birthYear, rootBirthYear, scale);
    positions.set(node.coupleId, polarToCartesian(angle, radius));
  }

  return positions;
}

/** Birth year of the older half of a couple — the anchor a couple sorts by. */
function coupleBirthYear(node: WheelNode): number {
  const years = [node.fabriciusPerson, node.partnerPerson]
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => {
      const match = p.dob.match(/(\d{4})$/);
      return match ? Number(match[1]) : null;
    })
    .filter((y): y is number => y !== null);

  return years.length > 0 ? Math.min(...years) : node.birthYear;
}

/** Slot geometry for the sequence layout. Wide enough for a two-name label. */
const SEQ_COL_WIDTH = 210;
const SEQ_ROW_HEIGHT = 84;
const SEQ_HEADING_HEIGHT = 60;
const SEQ_PADDING = 48;

export interface SequenceDecade {
  decade: number;
  y: number;
  /** Left edge of the block, so a heading can sit flush with the first column. */
  x: number;
  count: number;
}

interface SequenceLayout {
  positions: Map<string, Position>;
  decades: SequenceDecade[];
}

/**
 * Lays everyone out as a reading sequence — oldest first, left to right,
 * wrapping into rows, with each decade starting its own block under a heading.
 * Couples stay on one slot, anchored to the older partner. Branch links are
 * meaningless here; the UI reveals relatives on click instead.
 */
function layoutSequence(nodes: WheelNode[], width: number, height: number): SequenceLayout {
  const positions = new Map<string, Position>();
  const decades: SequenceDecade[] = [];
  if (nodes.length === 0) return { positions, decades };

  const ordered = [...nodes].sort(
    (a, b) => coupleBirthYear(a) - coupleBirthYear(b) || a.coupleId.localeCompare(b.coupleId),
  );

  const usable = Math.max(width - SEQ_PADDING * 2, SEQ_COL_WIDTH);
  const columns = Math.max(1, Math.floor(usable / SEQ_COL_WIDTH));

  const groups = new Map<number, WheelNode[]>();
  for (const node of ordered) {
    const decade = Math.floor(coupleBirthYear(node) / 10) * 10;
    const members = groups.get(decade) ?? [];
    members.push(node);
    groups.set(decade, members);
  }

  // Measure first so the whole block can be centred vertically.
  const orderedDecades = [...groups.keys()].sort((a, b) => a - b);
  const rowsPerDecade = orderedDecades.map((d) => Math.ceil(groups.get(d)!.length / columns));
  const blockHeight = rowsPerDecade.reduce(
    (total, rows) => total + SEQ_HEADING_HEIGHT + rows * SEQ_ROW_HEIGHT,
    0,
  );

  const widestBlock = Math.min(ordered.length, columns) * SEQ_COL_WIDTH;
  const originX = -widestBlock / 2 + SEQ_COL_WIDTH / 2;
  let cursorY = -blockHeight / 2;

  for (let i = 0; i < orderedDecades.length; i++) {
    const decade = orderedDecades[i];
    const members = groups.get(decade)!;

    decades.push({ decade, y: cursorY, x: originX, count: members.length });
    cursorY += SEQ_HEADING_HEIGHT;

    for (let j = 0; j < members.length; j++) {
      positions.set(members[j].coupleId, {
        x: originX + (j % columns) * SEQ_COL_WIDTH,
        y: cursorY + Math.floor(j / columns) * SEQ_ROW_HEIGHT,
      });
    }
    cursorY += rowsPerDecade[i] * SEQ_ROW_HEIGHT;
  }

  return { positions, decades };
}

export function computeSequenceLayout(
  nodes: WheelNode[],
  _rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  return layoutSequence(nodes, width, height).positions;
}

/** Decade headings for the sequence layout, in center-origin coordinates. */
export function computeSequenceDecades(
  nodes: WheelNode[],
  width: number,
  height: number,
): SequenceDecade[] {
  return layoutSequence(nodes, width, height).decades;
}

export function computeBranchSizeLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const scale = computeScaleFactor(nodes, rootBirthYear, width, height);
  const root = nodes.find((n) => n.generation === 0);
  if (!root) return positions;

  positions.set(root.coupleId, { x: 0, y: 0 });

  const angles = new Map<string, number>();
  const weightFn = (node: WheelNode, allNodes: WheelNode[]) => {
    return 1 + countDescendants(node, allNodes);
  };
  assignAngles(nodes, root.coupleId, 0, Math.PI * 2, angles, weightFn);

  for (const node of nodes) {
    if (node.generation === 0) continue;
    const angle = angles.get(node.coupleId) ?? 0;
    const radius = birthYearToRadius(node.birthYear, rootBirthYear, scale);
    positions.set(node.coupleId, polarToCartesian(angle, radius));
  }

  return positions;
}

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

/**
 * Compute layout positions at the given viewport size, centered at (width/2, height/2).
 */
export function computeBaselinePositions(
  nodes: WheelNode[],
  layoutMode: "wheel" | "birthOrder" | "branchSize" | "tree",
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
  let positions: Map<string, { x: number; y: number }>;
  switch (layoutMode) {
    case "birthOrder":
      positions = computeSequenceLayout(nodes, rootBirthYear, width, height);
      break;
    case "branchSize":
      positions = computeBranchSizeLayout(nodes, rootBirthYear, width, height);
      break;
    case "tree":
      positions = computeTreeLayout(nodes, rootBirthYear, width, height);
      break;
    default:
      positions = computeWheelLayout(nodes, rootBirthYear, width, height);
  }
  // Shift from center-origin to absolute viewport coords
  const cx = width / 2;
  const cy = height / 2;
  const result = new Map<string, { x: number; y: number }>();
  for (const [id, pos] of positions) {
    result.set(id, { x: pos.x + cx, y: pos.y + cy });
  }
  return result;
}
