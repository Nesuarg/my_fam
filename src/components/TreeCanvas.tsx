import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomTransform, ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import { FamilyDocument } from '../types/family';
import { computeLayout } from '../layout/computeLayout';
import TreeNodes from './TreeNodes';
import TreeLinks from './TreeLinks';

interface TreeCanvasProps {
  familyData: FamilyDocument;
  searchTerm: string;
  orientation: 'vertical' | 'horizontal';
  nodeSize: 'small' | 'medium' | 'large';
}

export interface TreeCanvasRef {
  getSVGElement: () => SVGSVGElement | null;
}

const TreeCanvas = forwardRef<TreeCanvasRef, TreeCanvasProps>(({
  familyData,
  searchTerm,
  orientation,
  nodeSize,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Expose SVG element via ref
  useImperativeHandle(ref, () => ({
    getSVGElement: () => svgRef.current,
  }));

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        const container = svg.select('.tree-container');
        container.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Compute tree layout
  const treeData = computeLayout(familyData.roots, {
    orientation,
    nodeSize: nodeSize,
    expandedNodes,
  });

  // Handle node expansion toggle
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Handle search - center on matching node
  useEffect(() => {
    if (!searchTerm.trim() || !svgRef.current || !zoomBehaviorRef.current) return;

    const matchingNode = treeData.nodes.find(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matchingNode) {
      const svg = select(svgRef.current);
      const { width, height } = dimensions;
      
      // Calculate center position for the matched node
      const scale = 1.5;
      const x = width / 2 - matchingNode.x * scale;
      const y = height / 2 - matchingNode.y * scale;

      // Animate to the matching node
      svg.transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, 
          zoomTransform(svg.node()!)
            .translate(x, y)
            .scale(scale)
        );
    }
  }, [searchTerm, treeData.nodes, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full cursor-move"
      >
        <defs>
          {/* Gradient for links */}
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        <g className="tree-container">
          {/* Render tree links first (so they appear behind nodes) */}
          <TreeLinks 
            links={treeData.links} 
            orientation={orientation} 
          />
          
          {/* Render tree nodes */}
          <TreeNodes
            nodes={treeData.nodes}
            nodeSize={nodeSize}
            expandedNodes={expandedNodes}
            onToggleExpansion={toggleNodeExpansion}
            searchTerm={searchTerm}
          />
        </g>
      </svg>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
        <div className="font-medium mb-1">Navigation:</div>
        <div className="text-xs space-y-1">
          <div>• Scroll to zoom in/out</div>
          <div>• Drag to pan around</div>
          <div>• Click nodes to expand/collapse</div>
          <div>• Use search to find family members</div>
        </div>
      </div>
    </div>
  );
});

TreeCanvas.displayName = 'TreeCanvas';

export default TreeCanvas;