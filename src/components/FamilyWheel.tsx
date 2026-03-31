import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { FamilyData } from "@/types/simple-family";
import { buildWheelGraph, type WheelNode, type WheelLink } from "@/lib/wheel-graph";
import {
  computeWheelLayout,
  computeBirthOrderLayout,
  computeBranchSizeLayout,
} from "@/lib/wheel-layouts";
import { applyAddChild, applyAddCouple, applyEditPerson } from "@/lib/family-edits";
import { getStoredPassword, storePassword, addChild as apiAddChild, addCouple as apiAddCouple, editPerson as apiEditPerson, validatePassword } from "@/lib/family-api";
import PasswordModal from "./PasswordModal";
import EditPanel from "./EditPanel";
import SyncBadge from "./SyncBadge";

const GEN_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];
const GEN_RADII = [22, 15, 12, 10];

type LayoutMode = "wheel" | "birthOrder" | "branchSize";

interface Props {
  familyData: FamilyData;
  rootCoupleId: string;
}

export default function FamilyWheel({ familyData, rootCoupleId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("wheel");
  const [showLabels, setShowLabels] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<{
    node: WheelNode;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const graphRef = useRef<{ nodes: WheelNode[]; links: WheelLink[] } | null>(null);
  const simulationRef = useRef<d3.Simulation<WheelNode, WheelLink> | null>(null);
  const zoomScaleRef = useRef(1);
  const labelSelRef = useRef<d3.Selection<SVGTextElement, WheelNode, SVGGElement, unknown> | null>(null);
  const sublabelSelRef = useRef<d3.Selection<SVGTextElement, WheelNode, SVGGElement, unknown> | null>(null);
  const ringsGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(getStoredPassword);
  const [localData, setLocalData] = useState<FamilyData>(familyData);
  const [editNode, setEditNode] = useState<{ node: WheelNode; x: number; y: number } | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<number | null>(null);

  const getLayout = useCallback(
    (nodes: WheelNode[], width: number, height: number) => {
      const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
      switch (layoutMode) {
        case "birthOrder":
          return computeBirthOrderLayout(nodes, rootBirthYear, width, height);
        case "branchSize":
          return computeBranchSizeLayout(nodes, rootBirthYear, width, height);
        default:
          return computeWheelLayout(nodes, rootBirthYear, width, height);
      }
    },
    [layoutMode],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    // Build graph only once
    if (!graphRef.current) {
      graphRef.current = buildWheelGraph(localData, rootCoupleId);
    }
    const { nodes, links } = graphRef.current;

    // Compute target positions
    const positions = getLayout(nodes, width, height);

    // Set initial positions if not yet set
    for (const node of nodes) {
      const pos = positions.get(node.coupleId);
      if (pos && node.x === undefined) {
        node.x = pos.x + cx;
        node.y = pos.y + cy;
      }
    }

    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    const g = sel.append("g");

    // Zoom — counter-scale node labels to keep constant screen size
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        const k = event.transform.k;
        zoomScaleRef.current = k;
        // Only counter-scale node labels, not ring labels
        g.selectAll<SVGTextElement, unknown>(".node-label, .node-sublabel")
          .attr("transform", `scale(${1 / k})`);
      });
    sel.call(zoom);

    // Decade guide rings
    const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
    const maxYear = Math.max(...nodes.map((n) => n.birthYear));
    const yearSpan = maxYear - rootBirthYear;
    const maxRadius = Math.min(width, height) / 2 - 40;
    const scale = yearSpan > 0 ? maxRadius / yearSpan : 1;

    const decades = [];
    const startDecade = Math.ceil(rootBirthYear / 10) * 10;
    for (let d = startDecade; d <= maxYear + 10; d += 10) {
      decades.push(d);
    }

    const ringsGroup = g.append("g").attr("class", "rings").attr("display", showRings ? null : "none");
    ringsGroupRef.current = ringsGroup;
    for (const decade of decades) {
      const r = (decade - rootBirthYear) * scale;
      ringsGroup
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#1a1d2e")
        .attr("stroke-width", 0.5);
      ringsGroup
        .append("text")
        .attr("x", cx + r * Math.sin(Math.PI / 4))
        .attr("y", cy - r * Math.cos(Math.PI / 4))
        .attr("fill", "#2a2d3e")
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        .text(String(decade));
    }

    // Links
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        const sourceNode = nodes.find((n) => n.coupleId === d.source);
        return GEN_COLORS[Math.min(sourceNode?.generation ?? 0, GEN_COLORS.length - 1)];
      })
      .attr("stroke-width", 1.2)
      .attr("opacity", 0.25);

    // Node groups
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, WheelNode>("g")
      .data(nodes, (d) => d.coupleId)
      .join("g")
      .attr("cursor", "grab")
      .on("mouseenter", (_event, d) => {
        // Highlight connections
        nodeSel.attr("opacity", (n) => {
          if (n.coupleId === d.coupleId) return 1;
          if (n.parentCoupleId === d.coupleId) return 1;
          if (d.parentCoupleId === n.coupleId) return 1;
          return 0.2;
        });
        linkSel.attr("opacity", (l) => {
          if (l.source === d.coupleId || l.target === d.coupleId) return 0.6;
          return 0.05;
        });
      })
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, svg);
        setHoveredNode({ node: d, mouseX: mx, mouseY: my });
      })
      .on("mouseleave", () => {
        nodeSel.attr("opacity", 1);
        linkSel.attr("opacity", 0.25);
        setHoveredNode(null);
      })
      .on("click", (event, d) => {
        if (editMode) {
          event.stopPropagation();
          const [mx, my] = d3.pointer(event, svg);
          setEditNode({ node: d, x: mx, y: my });
        }
      });

    // Circle for each node
    nodeSel
      .append("circle")
      .attr("r", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)])
      .attr("fill", (d) => {
        const color = GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)];
        return d.isSingle ? color + "33" : color;
      })
      .attr("stroke", (d) => GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)])
      .attr("stroke-width", (d) => (d.isSingle ? 1.5 : 0));

    // Full name above
    const labelsSel = nodeSel
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 4))
      .attr("fill", "#e0e0e0")
      .attr("font-size", 10)
      .attr("display", showLabels ? null : "none")
      .text((d) => {
        const fp = d.fabriciusPerson;
        const pp = d.partnerPerson;
        if (!pp) return `${fp.firstName} ${fp.lastName}`;
        return `${fp.firstName} ${fp.lastName} & ${pp.firstName} ${pp.lastName}`;
      });

    // Birth year below
    const sublabelsSel = nodeSel
      .append("text")
      .attr("class", "node-sublabel")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 13)
      .attr("fill", "#777")
      .attr("font-size", 8)
      .attr("display", showLabels ? null : "none")
      .text((d) => `'${String(d.birthYear).slice(2)}`);

    labelSelRef.current = labelsSel;
    sublabelSelRef.current = sublabelsSel;

    // Force simulation
    const simulation = d3
      .forceSimulation<WheelNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<WheelNode, WheelLink>(links)
          .id((d) => d.coupleId)
          .strength(0.1),
      )
      .force("collision", d3.forceCollide<WheelNode>((d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 8))
      .force(
        "x",
        d3.forceX<WheelNode>((d) => (positions.get(d.coupleId)?.x ?? 0) + cx).strength(0.3),
      )
      .force(
        "y",
        d3.forceY<WheelNode>((d) => (positions.get(d.coupleId)?.y ?? 0) + cy).strength(0.3),
      )
      .alphaDecay(0.02)
      .on("tick", () => {
        linkSel
          .attr("x1", (d) => {
            const src = nodes.find((n) => n.coupleId === (typeof d.source === "string" ? d.source : (d.source as WheelNode).coupleId));
            return src?.x ?? 0;
          })
          .attr("y1", (d) => {
            const src = nodes.find((n) => n.coupleId === (typeof d.source === "string" ? d.source : (d.source as WheelNode).coupleId));
            return src?.y ?? 0;
          })
          .attr("x2", (d) => {
            const tgt = nodes.find((n) => n.coupleId === (typeof d.target === "string" ? d.target : (d.target as WheelNode).coupleId));
            return tgt?.x ?? 0;
          })
          .attr("y2", (d) => {
            const tgt = nodes.find((n) => n.coupleId === (typeof d.target === "string" ? d.target : (d.target as WheelNode).coupleId));
            return tgt?.y ?? 0;
          });
        nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, WheelNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
      });

    nodeSel.call(drag);

    sel.on("click", () => setEditNode(null));

    return () => {
      simulation.stop();
    };
  }, [localData, rootCoupleId, getLayout, editMode]);

  // Toggle label visibility without rebuilding
  useEffect(() => {
    const display = showLabels ? null : "none";
    labelSelRef.current?.attr("display", display);
    sublabelSelRef.current?.attr("display", display);
  }, [showLabels]);

  useEffect(() => {
    ringsGroupRef.current?.attr("display", showRings ? null : "none");
  }, [showRings]);

  // Re-target forces when layout mode changes (without rebuilding)
  useEffect(() => {
    const sim = simulationRef.current;
    const graph = graphRef.current;
    const svg = svgRef.current;
    if (!sim || !graph || !svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const cx = width / 2;
    const cy = height / 2;
    const positions = getLayout(graph.nodes, width, height);

    // Unpin all nodes so they animate to new layout positions
    for (const node of graph.nodes) {
      node.fx = null;
      node.fy = null;
    }

    sim
      .force(
        "x",
        d3.forceX<WheelNode>((d) => (positions.get(d.coupleId)?.x ?? 0) + cx).strength(0.3),
      )
      .force(
        "y",
        d3.forceY<WheelNode>((d) => (positions.get(d.coupleId)?.y ?? 0) + cy).strength(0.3),
      );
    sim.alpha(0.8).restart();
  }, [layoutMode, getLayout]);

  useEffect(() => {
    graphRef.current = null;
  }, [localData]);

  const handleEditToggle = async () => {
    if (editMode) {
      setEditMode(false);
      setEditNode(null);
      return;
    }
    const stored = getStoredPassword();
    if (stored) {
      setPassword(stored);
      setEditMode(true);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async (pw: string) => {
    const valid = await validatePassword(pw);
    if (valid) {
      storePassword(pw);
      setPassword(pw);
      setEditMode(true);
      setShowPasswordModal(false);
      setPasswordError(null);
    } else {
      setPasswordError("Wrong password");
    }
  };

  const handleEditPerson = async (personId: string, fields: Record<string, string>) => {
    if (!password) return;
    const updated = applyEditPerson(localData, personId, fields);
    setLocalData(updated);
    setEditNode(null);
    const res = await apiEditPerson(password, personId, fields);
    if (res.ok) setSyncTimestamp(Date.now());
  };

  const handleAddChild = async (coupleId: string, child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }) => {
    if (!password) return;
    const updated = applyAddChild(localData, coupleId, child);
    setLocalData(updated);
    const res = await apiAddChild(password, coupleId, child);
    if (res.ok) setSyncTimestamp(Date.now());
  };

  const handleAddCouple = async (personId: string, partner: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relType: string) => {
    if (!password) return;
    const updated = applyAddCouple(localData, personId, partner, relType as "married" | "partnership" | "common-law");
    setLocalData(updated);
    const res = await apiAddCouple(password, personId, partner, relType);
    if (res.ok) setSyncTimestamp(Date.now());
  };

  return (
    <div className="relative w-full h-screen" style={{ background: "#0f1117" }}>
      {/* Title */}
      <div className="absolute top-5 left-5 z-10">
        <h1 className="text-lg font-semibold text-white">Fabricius Familiehjul</h1>
        <p className="text-sm text-gray-500">Drag nodes freely — use buttons to re-sort</p>
        <button
          onClick={handleEditToggle}
          className={`mt-2 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            editMode
              ? "bg-green-600 border-green-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          {editMode ? "Exit Edit Mode" : "Edit"}
        </button>
        <SyncBadge editTimestamp={syncTimestamp} siteId={import.meta.env.PUBLIC_NETLIFY_SITE_ID ?? ""} />
      </div>

      {/* Layout mode buttons + label toggle */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
        {(["wheel", "birthOrder", "branchSize"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setLayoutMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
              layoutMode === mode
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
            }`}
          >
            {mode === "wheel" ? "Wheel" : mode === "birthOrder" ? "Birth Order" : "Branch Size"}
          </button>
        ))}
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
            showLabels
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          Labels
        </button>
        <button
          onClick={() => setShowRings((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
            showRings
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          Rings
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-10 flex gap-4 text-sm">
        {["Gen 0 (root)", "Gen 1", "Gen 2", "Gen 3+"].map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: GEN_COLORS[i] }}
            />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      />

      {/* Hover tooltip at mouse */}
      {hoveredNode && (
        <div
          className="absolute z-20 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 text-sm shadow-lg pointer-events-none"
          style={{ left: hoveredNode.mouseX + 16, top: hoveredNode.mouseY - 10, minWidth: 200 }}
        >
          <div className="text-white font-medium">
            {hoveredNode.node.fabriciusPerson.firstName} {hoveredNode.node.fabriciusPerson.lastName}
            {hoveredNode.node.partnerPerson
              ? ` & ${hoveredNode.node.partnerPerson.firstName} ${hoveredNode.node.partnerPerson.lastName}`
              : ""}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            Born {hoveredNode.node.birthYear}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Generation {hoveredNode.node.generation}
            {hoveredNode.node.childCount > 0
              ? ` · ${hoveredNode.node.childCount} ${hoveredNode.node.childCount === 1 ? "child" : "children"}`
              : ""}
          </div>
          {hoveredNode.node.isSingle && (
            <div className="text-gray-500 text-xs mt-1">Single</div>
          )}
        </div>
      )}
      {editMode && editNode && (
        <EditPanel
          node={editNode.node}
          x={editNode.x}
          y={editNode.y}
          onEditPerson={handleEditPerson}
          onAddChild={handleAddChild}
          onAddCouple={handleAddCouple}
          onClose={() => setEditNode(null)}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          onSuccess={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
          error={passwordError}
        />
      )}
    </div>
  );
}
