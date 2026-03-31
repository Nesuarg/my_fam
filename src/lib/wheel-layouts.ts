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

export function computeBirthOrderLayout(
  nodes: WheelNode[],
  rootBirthYear: number,
  width: number,
  height: number,
): Map<string, Position> {
  return computeWheelLayout(nodes, rootBirthYear, width, height);
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
