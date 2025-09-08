import React, { useMemo, useState } from "react";
import type { Person, FamilyTree, Marriage } from "@/types/family";
import { getGenerationLevel, getChildren, getParents } from "@/types/family-utils";
import PersonCard from "./PersonCard";
import { cn } from "@/lib/utils";

interface FamilyTreeViewProps {
  familyTree: FamilyTree;
  className?: string;
}

interface TreeNode {
  id: string;
  person: Person;
  generation: number;
  x: number;
  y: number;
  spouse?: Person;
  marriageId?: string;
  children: string[];
}

interface UnionNode {
  id: string;
  spouse1: Person;
  spouse2: Person;
  marriage: Marriage;
  generation: number;
  x: number;
  y: number;
  children: string[];
}

export function FamilyTreeView({ familyTree, className = "" }: FamilyTreeViewProps) {
  const [collapsedUnions, setCollapsedUnions] = useState<Set<string>>(new Set());
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{ person: Person; x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Calculate tree layout
  const { treeNodes, unionNodes, connections } = useMemo(() => {
    if (!familyTree.rootPersonId) return { treeNodes: [], unionNodes: [], connections: [] };

    const rootId = familyTree.rootPersonId;
    const nodes: TreeNode[] = [];
    const unions: UnionNode[] = [];
    const connections: Array<{ from: string; to: string; type: 'parent-child' | 'spouse' }> = [];

    // Group people by generation
    const generationMap = new Map<number, Person[]>();
    Object.values(familyTree.people).forEach(person => {
      const generation = getGenerationLevel(person.id, rootId, familyTree);
      if (!generationMap.has(generation)) {
        generationMap.set(generation, []);
      }
      generationMap.get(generation)!.push(person);
    });

    // Create union nodes for married couples
    const processedMarriages = new Set<string>();
    Object.values(familyTree.marriages).forEach(marriage => {
      if (processedMarriages.has(marriage.id)) return;
      
      const spouse1 = familyTree.people[marriage.spouseIds[0]];
      const spouse2 = familyTree.people[marriage.spouseIds[1]];
      
      if (spouse1 && spouse2) {
        const generation = getGenerationLevel(spouse1.id, rootId, familyTree);
        
        unions.push({
          id: marriage.id,
          spouse1,
          spouse2,
          marriage,
          generation,
          x: 0, // Will be calculated in layout
          y: 0,
          children: marriage.childrenIds || []
        });
        
        processedMarriages.add(marriage.id);
      }
    });

    // Layout calculation - position nodes
    const generationHeight = 200;
    const nodeWidth = 250;
    const nodeSpacing = 50;

    // Sort generations and position nodes
    const sortedGenerations = Array.from(generationMap.keys()).sort();
    
    sortedGenerations.forEach((generation, genIndex) => {
      const people = generationMap.get(generation)!;
      const generationUnions = unions.filter(u => u.generation === generation);
      
      // Calculate positions
      let totalWidth = 0;
      const items: Array<{ type: 'person' | 'union'; item: Person | UnionNode }> = [];
      
      // Add unions first
      generationUnions.forEach(union => {
        items.push({ type: 'union', item: union });
        totalWidth += nodeWidth + nodeSpacing;
      });
      
      // Add single people (those not in unions)
      people.forEach(person => {
        const isInUnion = unions.some(u => 
          u.spouse1.id === person.id || u.spouse2.id === person.id
        );
        if (!isInUnion) {
          items.push({ type: 'person', item: person });
          totalWidth += nodeWidth + nodeSpacing;
        }
      });
      
      // Center the generation
      const startX = (1200 - totalWidth) / 2;
      let currentX = startX;
      
      items.forEach(({ type, item }) => {
        const y = genIndex * generationHeight + 50;
        
        if (type === 'union') {
          const union = item as UnionNode;
          union.x = currentX + nodeWidth / 2;
          union.y = y;
        } else {
          const person = item as Person;
          nodes.push({
            id: person.id,
            person,
            generation,
            x: currentX + nodeWidth / 2,
            y,
            children: person.childrenIds || [],
            spouse: undefined
          });
        }
        
        currentX += nodeWidth + nodeSpacing;
      });
    });

    // Generate connections
    unions.forEach(union => {
      // Connect union to children
      union.children.forEach(childId => {
        connections.push({
          from: union.id,
          to: childId,
          type: 'parent-child'
        });
      });
    });

    return { treeNodes: nodes, unionNodes: unions, connections };
  }, [familyTree, collapsedUnions]);

  const toggleUnion = (unionId: string) => {
    const newCollapsed = new Set(collapsedUnions);
    if (newCollapsed.has(unionId)) {
      newCollapsed.delete(unionId);
    } else {
      newCollapsed.add(unionId);
    }
    setCollapsedUnions(newCollapsed);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? zoom * 1.2 : zoom / 1.2;
    setZoom(Math.max(0.1, Math.min(3, newZoom)));
  };

  const handleMouseEnter = (person: Person, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      person,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className={cn("family-tree-container relative bg-white rounded-lg shadow-lg", className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => handleZoom('in')}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Zoom In
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Zoom Out
        </button>
      </div>

      {/* SVG Tree */}
      <div 
        className="overflow-hidden w-full h-[600px] border rounded cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${viewBox.x - pan.x} ${viewBox.y - pan.y} ${viewBox.width} ${viewBox.height}`}
          className="family-tree-svg"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Connection lines */}
          <g className="connections">
            {connections.map((conn, index) => {
              const fromUnion = unionNodes.find(u => u.id === conn.from);
              const fromNode = treeNodes.find(n => n.id === conn.from);
              const toNode = treeNodes.find(n => n.id === conn.to);
              
              if (!toNode) return null;
              
              let fromX, fromY;
              if (fromUnion) {
                fromX = fromUnion.x;
                fromY = fromUnion.y + 40; // Below the union capsule
              } else if (fromNode) {
                fromX = fromNode.x;
                fromY = fromNode.y + 80; // Below the person card
              } else {
                return null;
              }
              
              const toX = toNode.x;
              const toY = toNode.y - 10; // Above the person card
              
              return (
                <g key={`conn-${index}`}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={fromX}
                    y2={fromY + 30}
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                  <line
                    x1={fromX}
                    y1={fromY + 30}
                    x2={toX}
                    y2={fromY + 30}
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                  <line
                    x1={toX}
                    y1={fromY + 30}
                    x2={toX}
                    y2={toY}
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </g>

          {/* Union nodes */}
          <g className="unions">
            {unionNodes.map((union) => (
              <g key={union.id} className="union-node">
                {/* Union capsule - clickable area */}
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleUnion(union.id)}
                >
                  <rect
                    x={union.x - 60}
                    y={union.y - 20}
                    width="120"
                    height="40"
                    rx="20"
                    fill="#FEF3C7"
                    stroke="#D97706"
                    strokeWidth="2"
                    className="hover:fill-yellow-200"
                  />
                  <text
                    x={union.x}
                    y={union.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="12"
                    fill="#92400E"
                    className="font-medium"
                    style={{ pointerEvents: 'none' }}
                  >
                    {collapsedUnions.has(union.id) ? "+" : "❤️"}
                  </text>
                </g>
                
                {/* Spouse cards when expanded */}
                {!collapsedUnions.has(union.id) && (
                  <g>
                    <foreignObject
                      x={union.x - 200}
                      y={union.y + 50}
                      width="180"
                      height="120"
                    >
                      <div className="scale-75 transform-origin-top-left">
                        <PersonCard person={union.spouse1} />
                      </div>
                    </foreignObject>
                    <foreignObject
                      x={union.x + 20}
                      y={union.y + 50}
                      width="180"
                      height="120"
                    >
                      <div className="scale-75 transform-origin-top-left">
                        <PersonCard person={union.spouse2} />
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            ))}
          </g>

          {/* Individual person nodes */}
          <g className="person-nodes">
            {treeNodes.map((node) => (
              <g
                key={node.id}
                onMouseEnter={(e) => handleMouseEnter(node.person, e)}
                onMouseLeave={handleMouseLeave}
              >
                <foreignObject
                  x={node.x - 90}
                  y={node.y}
                  width="180"
                  height="120"
                >
                  <div className="scale-75 transform-origin-top-left">
                    <PersonCard person={node.person} />
                  </div>
                </foreignObject>
              </g>
            ))}
          </g>
        </svg>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-800 text-white text-xs rounded py-1 px-2 z-20 pointer-events-none"
          style={{
            left: tooltip.x - 50,
            top: tooltip.y - 30,
            transform: 'translateX(-50%)'
          }}
        >
          <div>{tooltip.person.firstName} {tooltip.person.lastName}</div>
          {tooltip.person.birthDate && (
            <div>Born: {tooltip.person.birthDate.year}</div>
          )}
          {tooltip.person.occupation && tooltip.person.occupation.length > 0 && (
            <div>Occupation: {tooltip.person.occupation[0]}</div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-600 rounded-full"></div>
          <span>Union (click to expand/collapse)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-gray-500"></div>
          <span>Family connection</span>
        </div>
      </div>
    </div>
  );
}

export default FamilyTreeView;