import React from 'react';
import { TreeNodeDatum } from '../types/family';
import { getNodeDimensions } from '../layout/computeLayout';

interface TreeNodesProps {
  nodes: TreeNodeDatum[];
  nodeSize: 'small' | 'medium' | 'large';
  expandedNodes: Set<string>;
  onToggleExpansion: (nodeId: string) => void;
  searchTerm: string;
}

const TreeNodes: React.FC<TreeNodesProps> = ({
  nodes,
  nodeSize,
  expandedNodes,
  onToggleExpansion,
  searchTerm,
}) => {
  const dimensions = getNodeDimensions(nodeSize);
  const isSearching = searchTerm.trim().length > 0;

  const formatLifespan = (birthDate?: string, deathDate?: string) => {
    if (!birthDate && !deathDate) return '';
    const birth = birthDate ? birthDate.substring(0, 4) : '?';
    const death = deathDate ? deathDate.substring(0, 4) : 'present';
    return `${birth} - ${death}`;
  };

  const isMatchingSearch = (node: TreeNodeDatum) => {
    if (!isSearching) return false;
    return node.name.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <g className="tree-nodes">
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isSearchMatch = isMatchingSearch(node);
        const lifespan = formatLifespan(node.birthDate, node.deathDate);

        return (
          <g
            key={node.id}
            transform={`translate(${node.x - dimensions.width / 2}, ${node.y - dimensions.height / 2})`}
            className="node-group"
          >
            {/* Node background */}
            <rect
              width={dimensions.width}
              height={dimensions.height}
              rx={8}
              className={`
                stroke-2 cursor-pointer transition-all duration-200
                ${isSearchMatch 
                  ? 'fill-yellow-100 dark:fill-yellow-900 stroke-yellow-400 dark:stroke-yellow-300' 
                  : 'fill-white dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600 hover:fill-blue-50 dark:hover:fill-blue-900 hover:stroke-blue-400'
                }
              `}
              onClick={() => hasChildren && onToggleExpansion(node.id)}
              aria-label={`${node.name}${hasChildren ? '. Click to expand/collapse' : ''}`}
            />

            {/* Avatar placeholder */}
            <circle
              cx={20}
              cy={20}
              r={12}
              className="fill-gray-300 dark:fill-gray-600"
            />
            {node.photoUrl ? (
              <image
                x={8}
                y={8}
                width={24}
                height={24}
                xlinkHref={node.photoUrl}
                clipPath="circle(12px at 12px 12px)"
              />
            ) : (
              <text
                x={20}
                y={25}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400 text-xs font-medium"
              >
                {node.name.charAt(0)}
              </text>
            )}

            {/* Name */}
            <text
              x={40}
              y={18}
              className="fill-gray-900 dark:fill-white text-sm font-semibold"
              style={{ fontSize: `${nodeSize === 'small' ? '12' : nodeSize === 'medium' ? '14' : '16'}px` }}
            >
              {node.name}
            </text>

            {/* Lifespan */}
            {lifespan && (
              <text
                x={40}
                y={32}
                className="fill-gray-600 dark:fill-gray-400 text-xs"
                style={{ fontSize: `${nodeSize === 'small' ? '10' : nodeSize === 'medium' ? '11' : '12'}px` }}
              >
                {lifespan}
              </text>
            )}

            {/* Partners */}
            {node.partners && node.partners.length > 0 && (
              <text
                x={40}
                y={46}
                className="fill-gray-500 dark:fill-gray-500 text-xs italic"
                style={{ fontSize: `${nodeSize === 'small' ? '9' : nodeSize === 'medium' ? '10' : '11'}px` }}
              >
                ♥ {node.partners.map(p => p.name || `Person ${p.id}`).join(', ')}
              </text>
            )}

            {/* Tags/Notes */}
            {node.tags && node.tags.length > 0 && (
              <text
                x={8}
                y={dimensions.height - 8}
                className="fill-blue-600 dark:fill-blue-400 text-xs"
                style={{ fontSize: `${nodeSize === 'small' ? '8' : nodeSize === 'medium' ? '9' : '10'}px` }}
              >
                {node.tags[0]} {node.tags.length > 1 && `+${node.tags.length - 1}`}
              </text>
            )}

            {/* Expansion indicator */}
            {hasChildren && (
              <g
                transform={`translate(${dimensions.width - 20}, ${dimensions.height - 20})`}
                className="cursor-pointer"
                onClick={() => onToggleExpansion(node.id)}
              >
                <circle
                  r={8}
                  className="fill-blue-600 hover:fill-blue-700 transition-colors"
                />
                <text
                  textAnchor="middle"
                  dy={3}
                  className="fill-white text-xs font-bold pointer-events-none"
                >
                  {isExpanded ? '−' : '+'}
                </text>
              </g>
            )}

            {/* Focus ring for search matches */}
            {isSearchMatch && (
              <rect
                width={dimensions.width}
                height={dimensions.height}
                rx={8}
                className="fill-none stroke-yellow-400 dark:stroke-yellow-300 stroke-2 animate-pulse pointer-events-none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

export default TreeNodes;