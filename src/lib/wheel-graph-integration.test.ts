import { describe, it, expect } from "vitest";
import { buildWheelGraph } from "./wheel-graph";
import type { FamilyData } from "@/types/simple-family";
import couplesJson from "../../content/couples.json";

const data = couplesJson as FamilyData;

describe("buildWheelGraph with real couples.json", () => {
  const { nodes, links } = buildWheelGraph(data, "niels-peter-dorthea");

  it("produces nodes for all couples and uncoupled children", () => {
    expect(nodes.length).toBeGreaterThan(30);
  });

  it("root node is niels-peter-dorthea at generation 0", () => {
    const root = nodes.find((n) => n.coupleId === "niels-peter-dorthea");
    expect(root).toBeDefined();
    expect(root?.generation).toBe(0);
    expect(root?.birthYear).toBe(1919);
  });

  it("all 10 gen-1 children are present", () => {
    const gen1 = nodes.filter((n) => n.generation === 1);
    expect(gen1.length).toBe(10);
  });

  it("every node has a valid birth year", () => {
    for (const node of nodes) {
      expect(node.birthYear).toBeGreaterThan(1900);
      expect(node.birthYear).toBeLessThan(2030);
    }
  });

  it("every link references existing nodes", () => {
    const nodeIds = new Set(nodes.map((n) => n.coupleId));
    for (const link of links) {
      expect(nodeIds.has(link.source)).toBe(true);
      expect(nodeIds.has(link.target)).toBe(true);
    }
  });

  it("no duplicate node IDs", () => {
    const ids = nodes.map((n) => n.coupleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Mads Fabricius Schmidt is correctly identified", () => {
    const madsCouple = nodes.find((n) => n.fabriciusPerson.id === "mads");
    expect(madsCouple).toBeDefined();
    expect(madsCouple?.fabriciusPerson.lastName).toBe("Fabricius Schmidt");
    expect(madsCouple?.partnerPerson?.firstName).toBe("Mette");
    expect(madsCouple?.generation).toBe(2);
  });

  it("Thomas is single with one child Sophus", () => {
    const thomas = nodes.find((n) => n.coupleId === "thomas-single");
    expect(thomas).toBeDefined();
    expect(thomas?.isSingle).toBe(true);
    expect(thomas?.childCount).toBe(1);
  });
});
