import { hierarchy, tree, HierarchyNode, HierarchyLink } from 'd3-hierarchy';
import { PersonNode, TreeNodeDatum } from '../types/family';

interface LayoutOptions {
  orientation: 'vertical' | 'horizontal';
  nodeSize: 'small' | 'medium' | 'large';
  expandedNodes: Set<string>;
}

interface TreeLayout {
  nodes: TreeNodeDatum[];
  links: HierarchyLink<PersonNode>[];
}

const NODE_SIZES = {
  small: { width: 120, height: 80 },
  medium: { width: 160, height: 100 },
  large: { width: 200, height: 120 },
};

const SPACING = {
  small: { x: 200, y: 150 },
  medium: { x: 250, y: 180 },
  large: { x: 300, y: 200 },
};

export function computeLayout(
  roots: PersonNode[],
  options: LayoutOptions
): TreeLayout {
  const { orientation, nodeSize, expandedNodes } = options;
  const spacing = SPACING[nodeSize];

  // For now, handle single root. TODO: Support multiple roots
  const rootPerson = roots[0];
  if (!rootPerson) {
    return { nodes: [], links: [] };
  }

  // Create hierarchy with filtering for collapsed nodes
  const root = hierarchy(rootPerson, (d: PersonNode) => {
    // Only return children if this node is expanded (or if it's the root)
    if (d.id === rootPerson.id || expandedNodes.has(d.id)) {
      return d.children || [];
    }
    return [];
  });

  // Create tree layout
  const treeLayout = tree<PersonNode>()
    .nodeSize(orientation === 'vertical' ? [spacing.x, spacing.y] : [spacing.y, spacing.x]);

  // Apply layout
  treeLayout(root);

  // Transform nodes and add layout information
  const nodes: TreeNodeDatum[] = [];
  const links = root.links();

  root.each((node: HierarchyNode<PersonNode>) => {
    const nodeData: TreeNodeDatum = {
      ...node.data,
      x: orientation === 'vertical' ? node.x! : node.y!,
      y: orientation === 'vertical' ? node.y! : node.x!,
      isExpanded: expandedNodes.has(node.data.id),
    };
    nodes.push(nodeData);
  });

  return { nodes, links };
}

export function getNodeDimensions(nodeSize: 'small' | 'medium' | 'large') {
  return NODE_SIZES[nodeSize];
}