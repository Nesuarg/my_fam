import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { FamilyData } from "@/types/simple-family";
import { buildWheelGraph, type WheelNode, type WheelLink } from "@/lib/wheel-graph";
import {
  computeWheelLayout,
  computeBirthOrderLayout,
  computeBranchSizeLayout,
} from "@/lib/wheel-layouts";

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
  const [tooltip, setTooltip] = useState<{
    node: WheelNode;
    x: number;
    y: number;
  } | null>(null);
  const graphRef = useRef<{ nodes: WheelNode[]; links: WheelLink[] } | null>(null);
  const simulationRef = useRef<d3.Simulation<WheelNode, WheelLink> | null>(null);

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
      graphRef.current = buildWheelGraph(familyData, rootCoupleId);
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

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
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

    const ringsGroup = g.append("g").attr("class", "rings");
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
      .on("mouseleave", () => {
        nodeSel.attr("opacity", 1);
        linkSel.attr("opacity", 0.25);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        setTooltip({ node: d, x: d.x ?? 0, y: d.y ?? 0 });
      });

    // Circle for each node
    nodeSel
      .append("circle")
      .attr("r", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)])
      .attr("fill", (d) =>
        d.isSingle ? "none" : GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)],
      )
      .attr("stroke", (d) => GEN_COLORS[Math.min(d.generation, GEN_COLORS.length - 1)])
      .attr("stroke-width", (d) => (d.isSingle ? 1.5 : 0));

    // Branch label above
    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 4))
      .attr("fill", "#e0e0e0")
      .attr("font-size", 10)
      .text((d) => d.branchLabel);

    // Names + year below
    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] + 13)
      .attr("fill", "#777")
      .attr("font-size", 8)
      .text((d) => {
        const name1 = d.fabriciusPerson.firstName;
        const name2 = d.partnerPerson?.firstName;
        const year = String(d.birthYear).slice(2);
        return name2 ? `${name1} & ${name2} '${year}` : `${name1} '${year}`;
      });

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
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);

    // Click on background to dismiss tooltip
    sel.on("click", () => setTooltip(null));

    return () => {
      simulation.stop();
    };
  }, [familyData, rootCoupleId, getLayout]);

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

  return (
    <div className="relative w-full h-screen" style={{ background: "#0f1117" }}>
      {/* Title */}
      <div className="absolute top-5 left-5 z-10">
        <h1 className="text-lg font-semibold text-white">Fabricius Familiehjul</h1>
        <p className="text-sm text-gray-500">Drag nodes freely — use buttons to re-sort</p>
      </div>

      {/* Layout mode buttons */}
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

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 text-sm shadow-lg"
          style={{ left: tooltip.x + 20, top: tooltip.y - 20, minWidth: 180 }}
        >
          <div className="text-white font-medium">
            {tooltip.node.fabriciusPerson.firstName}
            {tooltip.node.partnerPerson ? ` & ${tooltip.node.partnerPerson.firstName}` : ""}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {tooltip.node.branchLabel} · Born {tooltip.node.birthYear}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Generation {tooltip.node.generation}
            {tooltip.node.childCount > 0
              ? ` · ${tooltip.node.childCount} ${tooltip.node.childCount === 1 ? "child" : "children"}`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}
