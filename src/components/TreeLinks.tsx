import React from 'react';
import { HierarchyLink } from 'd3-hierarchy';
import { PersonNode } from '../types/family';

interface TreeLinksProps {
  links: HierarchyLink<PersonNode>[];
  orientation: 'vertical' | 'horizontal';
}

const TreeLinks: React.FC<TreeLinksProps> = ({ links, orientation }) => {
  const createLinkPath = (link: HierarchyLink<PersonNode>) => {
    const source = {
      x: orientation === 'vertical' ? link.source.x! : link.source.y!,
      y: orientation === 'vertical' ? link.source.y! : link.source.x!,
    };
    const target = {
      x: orientation === 'vertical' ? link.target.x! : link.target.y!,
      y: orientation === 'vertical' ? link.target.y! : link.target.x!,
    };

    if (orientation === 'vertical') {
      // Vertical layout: parent above, child below
      const midY = (source.y + target.y) / 2;
      return `
        M ${source.x} ${source.y}
        L ${source.x} ${midY}
        L ${target.x} ${midY}
        L ${target.x} ${target.y}
      `;
    } else {
      // Horizontal layout: parent left, child right
      const midX = (source.x + target.x) / 2;
      return `
        M ${source.x} ${source.y}
        L ${midX} ${source.y}
        L ${midX} ${target.y}
        L ${target.x} ${target.y}
      `;
    }
  };

  return (
    <g className="tree-links">
      {links.map((link, index) => (
        <path
          key={`${link.source.data.id}-${link.target.data.id}-${index}`}
          d={createLinkPath(link)}
          className="fill-none stroke-gray-400 dark:stroke-gray-600 stroke-2 transition-colors duration-200"
          strokeDasharray="none"
        />
      ))}
    </g>
  );
};

export default TreeLinks;