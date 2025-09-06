import { describe, it, expect } from 'vitest';
import { PersonNode } from '../types/family';
import { computeLayout } from '../layout/computeLayout';

describe('computeLayout', () => {
  const samplePersonNode: PersonNode = {
    id: 'p1',
    name: 'John Doe',
    birthDate: '1950',
    children: [
      {
        id: 'p2',
        name: 'Jane Doe',
        birthDate: '1980',
        children: [
          {
            id: 'p3',
            name: 'Baby Doe',
            birthDate: '2010'
          }
        ]
      }
    ]
  };

  it('should compute layout for vertical orientation', () => {
    const result = computeLayout([samplePersonNode], {
      orientation: 'vertical',
      nodeSize: 'medium',
      expandedNodes: new Set(['p1', 'p2'])
    });

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].name).toBe('John Doe');
    expect(result.nodes[1].name).toBe('Jane Doe');
    expect(result.nodes[2].name).toBe('Baby Doe');
    
    // Check that nodes have position data
    expect(typeof result.nodes[0].x).toBe('number');
    expect(typeof result.nodes[0].y).toBe('number');
  });

  it('should compute layout for horizontal orientation', () => {
    const result = computeLayout([samplePersonNode], {
      orientation: 'horizontal',
      nodeSize: 'medium',
      expandedNodes: new Set(['p1', 'p2'])
    });

    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(2);
  });

  it('should respect collapsed nodes', () => {
    const result = computeLayout([samplePersonNode], {
      orientation: 'vertical',
      nodeSize: 'medium',
      expandedNodes: new Set(['p1']) // Only expand root, not p2
    });

    // Should only show root and first child, not grandchild
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map(n => n.name)).toEqual(['John Doe', 'Jane Doe']);
  });

  it('should handle empty roots', () => {
    const result = computeLayout([], {
      orientation: 'vertical',
      nodeSize: 'medium',
      expandedNodes: new Set()
    });

    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it('should handle different node sizes', () => {
    const resultSmall = computeLayout([samplePersonNode], {
      orientation: 'vertical',
      nodeSize: 'small',
      expandedNodes: new Set(['p1'])
    });

    const resultLarge = computeLayout([samplePersonNode], {
      orientation: 'vertical',
      nodeSize: 'large',
      expandedNodes: new Set(['p1'])
    });

    expect(resultSmall.nodes).toHaveLength(2);
    expect(resultLarge.nodes).toHaveLength(2);
  });
});