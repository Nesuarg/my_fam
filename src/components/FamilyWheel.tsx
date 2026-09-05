import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { FamilyData } from "@/types/simple-family";
import { buildWheelGraph, collectLineage, type WheelNode, type WheelLink } from "@/lib/wheel-graph";
import {
  computeWheelLayout,
  computeSequenceLayout,
  computeSequenceDecades,
  computeBranchSizeLayout,
  computeTreeLayout,
  computeBaselinePositions,
} from "@/lib/wheel-layouts";
import { useShareableView } from "@/lib/view-state";
import type { ViewStateConfig } from "@/lib/view-state";
import { applyDiffs } from "@/lib/view-state/diff";
import { applyAddChild, applyAddCouple, applyDeleteNode, applyEditPerson, countDeletion } from "@/lib/family-edits";
import { getStoredPassword, storePassword, addChild as apiAddChild, addCouple as apiAddCouple, editPerson as apiEditPerson, deleteNode as apiDeleteNode, validatePassword } from "@/lib/family-api";
import PasswordModal from "./PasswordModal";
import AssistantPanel from "./AssistantPanel";
import EditPanel from "./EditPanel";
import SyncBadge from "./SyncBadge";

// d3.forceLink().id() rewrites link.source/target from ids into node objects,
// so anything reading them after the simulation starts must accept both.
const endpointId = (end: string | WheelNode): string =>
  typeof end === "string" ? end : end.coupleId;

const SEQ_COL_WIDTH = 210;

const GEN_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];
const GEN_RADII = [22, 15, 12, 10, 9];

type LayoutMode = "wheel" | "birthOrder" | "branchSize" | "tree";

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
  const graphDataRef = useRef<FamilyData | null>(null);
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
  const [showAssistant, setShowAssistant] = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState<number | null>(null);

  const [projector, setProjector] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("projektor"),
  );
  const projectorRef = useRef(projector);
  projectorRef.current = projector;
  const spacingScale = projector ? 1.4 : 1;
  const getLayout = useCallback(
    (nodes: WheelNode[], width: number, height: number) => {
      const rootBirthYear = nodes.find((n) => n.generation === 0)?.birthYear ?? 1919;
      switch (layoutMode) {
        case "birthOrder":
          return computeSequenceLayout(nodes, rootBirthYear, width, height, spacingScale);
        case "branchSize":
          return computeBranchSizeLayout(nodes, rootBirthYear, width, height);
        case "tree":
          return computeTreeLayout(nodes, rootBirthYear, width, height);
        default:
          return computeWheelLayout(nodes, rootBirthYear, width, height);
      }
    },
    [layoutMode, spacingScale],
  );

  const zoomTransformRef = useRef<{ k: number; x: number; y: number }>({ k: 1, x: 0, y: 0 });
  // restoredState stays set for the component's life, but a shared view is only
  // restored once — after that the layout buttons own the layout.
  const hasRestoredRef = useRef(false);
  // Clicking a node pins the relatives highlight; hovering previews it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const highlightRef = useRef<((focusId: string | null) => void) | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fitRef = useRef<(() => void) | null>(null);

  const viewStateConfig: ViewStateConfig<{ layout: string; labels: boolean; rings: boolean }> = {
    baseline: () => {
      const graph = graphRef.current;
      if (!graph) return new Map();
      const svg = svgRef.current;
      const w = svg?.clientWidth ?? window.innerWidth;
      const h = svg?.clientHeight ?? window.innerHeight;
      return computeBaselinePositions(graph.nodes, layoutMode, w, h);
    },
    positions: () => {
      const graph = graphRef.current;
      if (!graph) return new Map();
      const positions = new Map<string, { x: number; y: number }>();
      for (const node of graph.nodes) {
        if (node.x !== undefined && node.y !== undefined) {
          positions.set(node.coupleId, { x: node.x, y: node.y });
        }
      }
      return positions;
    },
    getSettings: () => ({ layout: layoutMode, labels: showLabels, rings: showRings }),
    applySettings: (s) => {
      setLayoutMode(s.layout as LayoutMode);
      setShowLabels(s.labels);
      setShowRings(s.rings);
    },
    applyPositions: (positions) => {
      const graph = graphRef.current;
      if (!graph) return;
      for (const node of graph.nodes) {
        const pos = positions.get(node.coupleId);
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.fx = pos.x;
          node.fy = pos.y;
        }
      }
    },
    getCamera: () => zoomTransformRef.current,
    applyCamera: (cam) => {
      zoomTransformRef.current = cam;
    },
  };

  const { copyShareLink, restoredState, updateURL } = useShareableView(viewStateConfig);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    // Rebuild only when the data behind it actually changed. Keying off the
    // data itself avoids depending on effect declaration order.
    if (!graphRef.current || graphDataRef.current !== localData) {
      graphRef.current = buildWheelGraph(localData, rootCoupleId);
      graphDataRef.current = localData;
    }
    const { nodes, links } = graphRef.current;

    // Compute target positions
    const positions = getLayout(nodes, width, height);

    // A projector is read from across a room: bigger type, fatter dots, and
    // first names only so a two-name label still fits its column.
    const textScale = projector ? 1.9 : 1;
    const nodeScale = projector ? 1.4 : 1;
    const radiusOf = (d: WheelNode) =>
      GEN_RADII[Math.min(d.generation, GEN_RADII.length - 1)] * nodeScale;

    const isRestoring = restoredState !== null && !hasRestoredRef.current;

    // If restoring from URL, apply settings and pin nodes to restored positions
    if (isRestoring) {
      hasRestoredRef.current = true;
      viewStateConfig.applySettings(restoredState.settings as { layout: string; labels: boolean; rings: boolean });
      zoomTransformRef.current = restoredState.camera;

      const restoredLayout = (restoredState.settings.layout as LayoutMode) ?? layoutMode;
      const baseline = computeBaselinePositions(nodes, restoredLayout, width, height);
      const restored = applyDiffs(baseline, restoredState.diffs, width, height);
      for (const node of nodes) {
        const pos = restored.get(node.coupleId);
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.fx = pos.x;
          node.fy = pos.y;
        }
      }
    } else {
      // Set initial positions if not yet set
      for (const node of nodes) {
        const pos = positions.get(node.coupleId);
        if (pos && node.x === undefined) {
          node.x = pos.x + cx;
          node.y = pos.y + cy;
        }
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
        zoomTransformRef.current = { k: event.transform.k, x: event.transform.x, y: event.transform.y };
        // Only counter-scale node labels, not ring labels
        g.selectAll<SVGTextElement, unknown>(".node-label, .node-sublabel")
          .attr("transform", projectorRef.current ? null : `scale(${1 / k})`);
        updateURL();
      });
    sel.call(zoom);
    zoomRef.current = zoom;

    // Scale the drawing so all of it fills the screen — the point of a projector.
    fitRef.current = () => {
      const bounds = g.node()?.getBBox();
      if (!bounds || bounds.width === 0 || bounds.height === 0) return;
      const margin = 32;
      const fitted = Math.min(
        (width - margin * 2) / bounds.width,
        (height - margin * 2) / bounds.height,
      );
      // A projector must never shrink the drawing below its natural size —
      // a tall layout is scrolled, not squinted at.
      const k = Math.min(Math.max(fitted, projectorRef.current ? 1 : 0.3), 4);
      const tx = width / 2 - k * (bounds.x + bounds.width / 2);
      const ty = height / 2 - k * (bounds.y + bounds.height / 2);
      sel
        .transition()
        .duration(400)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    };

    // If restoring from shared URL, apply the saved camera transform
    if (isRestoring) {
      const cam = zoomTransformRef.current;
      const initialTransform = d3.zoomIdentity.translate(cam.x, cam.y).scale(cam.k);
      sel.call(zoom.transform, initialTransform);
    }

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

    const ringsInThisLayout = showRings && layoutMode !== "birthOrder";
    const ringsGroup = g.append("g").attr("class", "rings").attr("display", ringsInThisLayout ? null : "none");
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

    // Decade headings — the sequence layout's stand-in for the decade rings.
    if (layoutMode === "birthOrder") {
      const headings = g.append("g").attr("class", "decade-headings");
      const bands = computeSequenceDecades(nodes, width, height, textScale);
      const bandRight = Math.max(...nodes.map((n) => n.x ?? 0), cx);
      for (const band of bands) {
        const left = band.x + cx - SEQ_COL_WIDTH / 2;
        const top = band.y + cy;
        headings
          .append("text")
          .attr("x", left)
          .attr("y", top + 20 * textScale)
          .attr("fill", "#8b93a7")
          .attr("font-size", 17 * textScale)
          .attr("font-weight", 600)
          .text(`${band.decade}'erne`);
        headings
          .append("text")
          .attr("x", left + 96 * textScale)
          .attr("y", top + 20 * textScale)
          .attr("fill", "#4a4f63")
          .attr("font-size", 11 * textScale)
          .text(band.count === 1 ? "1 familie" : `${band.count} familier`);
        headings
          .append("line")
          .attr("x1", left)
          .attr("x2", Math.max(bandRight, left + SEQ_COL_WIDTH))
          .attr("y1", top + 32 * textScale)
          .attr("y2", top + 32 * textScale)
          .attr("stroke", "#23263a")
          .attr("stroke-width", 1);
      }
    }

    // Links
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        const sourceNode = nodes.find((n) => n.coupleId === endpointId(d.source));
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
        highlightRef.current?.(d.coupleId);
      })
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, svg);
        setHoveredNode({ node: d, mouseX: mx, mouseY: my });
      })
      .on("mouseleave", () => {
        highlightRef.current?.(selectedIdRef.current);
        setHoveredNode(null);
      })
      .on("click", (event, d) => {
        if (!editMode) {
          event.stopPropagation();
          setSelectedId((prev) => (prev === d.coupleId ? null : d.coupleId));
          return;
        }
        if (editMode) {
          event.stopPropagation();
          const [mx, my] = d3.pointer(event, svg);
          setEditNode({ node: d, x: mx, y: my });
        }
      });

    // Circle for each node
    nodeSel
      .append("circle")
      .attr("r", radiusOf)
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
      .attr("dy", (d) => -(radiusOf(d) + 4 * textScale))
      .attr("fill", "#e0e0e0")
      .attr("font-size", 10 * textScale)
      .attr("display", showLabels ? null : "none")
      .text((d) => {
        const fp = d.fabriciusPerson;
        const pp = d.partnerPerson;
        if (projector) return pp ? `${fp.firstName} & ${pp.firstName}` : fp.firstName;
        if (!pp) return `${fp.firstName} ${fp.lastName}`;
        return `${fp.firstName} ${fp.lastName} & ${pp.firstName} ${pp.lastName}`;
      });

    // Birth year below
    const sublabelsSel = nodeSel
      .append("text")
      .attr("class", "node-sublabel")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => radiusOf(d) + 13 * textScale)
      .attr("fill", "#777")
      .attr("font-size", 8 * textScale)
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
      .force("collision", d3.forceCollide<WheelNode>((d) => radiusOf(d) + 8 * nodeScale))
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

    // If restoring from shared URL, freeze the simulation — nodes are already pinned
    if (isRestoring) {
      simulation.alpha(0);
    }

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
        updateURL();
      });

    // Single source of truth for dimming, shared by hover and click.
    // In sequence mode the branch lines are noise, so they only appear for a focused node.
    const linksAlwaysVisible = layoutMode !== "birthOrder";
    const applyHighlight = (focusId: string | null) => {
      if (focusId === null) {
        nodeSel.attr("opacity", 1);
        linkSel.attr("opacity", linksAlwaysVisible ? 0.25 : 0);
        return;
      }
      const lineage = collectLineage(nodes, focusId);
      nodeSel.attr("opacity", (n) => (lineage.has(n.coupleId) ? 1 : 0.15));
      linkSel.attr("opacity", (l) =>
        lineage.has(endpointId(l.source)) && lineage.has(endpointId(l.target))
          ? 0.8
          : linksAlwaysVisible
            ? 0.05
            : 0,
      );
    };
    highlightRef.current = applyHighlight;
    applyHighlight(selectedIdRef.current);

    nodeSel.call(drag);

    sel.on("click", () => {
      setEditNode(null);
      setSelectedId(null);
    });

    return () => {
      simulation.stop();
    };
  }, [localData, rootCoupleId, getLayout, editMode, restoredState, projector]);

  // Toggle label visibility without rebuilding
  useEffect(() => {
    const display = showLabels ? null : "none";
    labelSelRef.current?.attr("display", display);
    sublabelSelRef.current?.attr("display", display);
  }, [showLabels]);

  useEffect(() => {
    ringsGroupRef.current?.attr("display", showRings && layoutMode !== "birthOrder" ? null : "none");
  }, [showRings, layoutMode]);

  useEffect(() => {
    updateURL();
  }, [layoutMode, showLabels, showRings, updateURL]);

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

    // The sequence is a grid, so nodes hold their slots exactly; the other
    // layouts let the simulation settle them.
    const pinToGrid = layoutMode === "birthOrder";
    for (const node of graph.nodes) {
      const pos = positions.get(node.coupleId);
      if (pinToGrid && pos) {
        node.fx = pos.x + cx;
        node.fy = pos.y + cy;
      } else {
        node.fx = null;
        node.fy = null;
      }
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
    highlightRef.current?.(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const k = zoomScaleRef.current;
    labelSelRef.current?.attr("transform", projector ? null : `scale(${1 / k})`);
    sublabelSelRef.current?.attr("transform", projector ? null : `scale(${1 / k})`);

    const url = new URL(window.location.href);
    if (projector) url.searchParams.set("projektor", "1");
    else url.searchParams.delete("projektor");
    window.history.replaceState(null, "", url);

    if (projector) fitRef.current?.();
  }, [projector]);

  // Refit whenever the drawing changes shape underneath a projector.
  useEffect(() => {
    if (!projector) return;
    const id = setTimeout(() => fitRef.current?.(), 450);
    return () => clearTimeout(id);
  }, [projector, layoutMode, showLabels, localData]);

  const handleEditToggle = async () => {
    if (editMode) {
      setEditMode(false);
      setEditNode(null);
      setShowAssistant(false);
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

  const handleDeleteNode = async (nodeId: string) => {
    if (!password) return;
    const updated = applyDeleteNode(localData, nodeId);
    setLocalData(updated);
    setEditNode(null);
    setSelectedId(null);
    const res = await apiDeleteNode(password, nodeId);
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
        {!projector && (
          <p className="text-sm text-gray-500">Tryk og flyt frit — brug knapperne til at sortere</p>
        )}
        <button
          onClick={handleEditToggle}
          className={`mt-2 rounded-md border transition-colors ${projector ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-xs"} ${
            editMode
              ? "bg-green-600 border-green-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          {editMode ? "Afslut redigering" : "Rediger"}
        </button>
        <SyncBadge editTimestamp={syncTimestamp} siteId={import.meta.env.PUBLIC_NETLIFY_SITE_ID ?? ""} />
        {editMode && (
          <button
            onClick={() => setShowAssistant((v) => !v)}
            className={`mt-2 ml-2 rounded-md border transition-colors ${projector ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-xs"} ${
              showAssistant
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
            }`}
          >
            Tilføj med ord
          </button>
        )}
        {editMode && showAssistant && password && (
          <AssistantPanel
            password={password}
            large={projector}
            onApply={handleAddChild}
            onClose={() => setShowAssistant(false)}
          />
        )}
      </div>

      {/* Layout mode buttons + label toggle */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
        {(["wheel", "birthOrder", "branchSize", "tree"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setLayoutMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
              layoutMode === mode
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
            }`}
          >
            {mode === "wheel" ? "Hjul" : mode === "birthOrder" ? "Rækkefølge" : mode === "branchSize" ? "Grenstørrelse" : "Træ"}
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
          Navne
        </button>
        <button
          onClick={() => setShowRings((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
            showRings
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          Ringe
        </button>
        <button
          onClick={() => setProjector((v) => !v)}
          title="Fylder skærmen og forstørrer teksten"
          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
            projector
              ? "bg-amber-500 border-amber-500 text-black font-medium"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          Projektor
        </button>
        <button
          onClick={async () => {
            await copyShareLink();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="px-3 py-1.5 rounded-md text-xs border transition-colors bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-10 flex gap-4 text-sm">
        {["Stampar", "Børn", "Børnebørn", "Oldebørn", "Tipoldebørn+"].map((label, i) => (
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
            Fodt {hoveredNode.node.birthYear}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Generation {hoveredNode.node.generation}
            {hoveredNode.node.childCount > 0
              ? ` · ${hoveredNode.node.childCount} ${hoveredNode.node.childCount === 1 ? "barn" : "børn"}`
              : ""}
          </div>
          {hoveredNode.node.isSingle && (
            <div className="text-gray-500 text-xs mt-1">Enlig</div>
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
          onDelete={handleDeleteNode}
          deleteCount={countDeletion(localData, editNode.node.coupleId)}
          onClose={() => setEditNode(null)}
          large={projector}
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
