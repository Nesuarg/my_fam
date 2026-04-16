import { describe, it, expect } from "vitest";
import { buildWheelGraph, type WheelNode, type WheelLink } from "./wheel-graph";
import type { FamilyData } from "@/types/simple-family";

const minimalFamily: FamilyData = {
  people: [
    { id: "a", firstName: "Niels", lastName: "Hansen", age: 105, gender: "male", dob: "8/24/1919" },
    { id: "b", firstName: "Dorthea", lastName: "Hansen", age: 105, gender: "female", dob: "8/24/1919" },
    { id: "c", firstName: "Grete", lastName: "Paulsen", age: 81, gender: "female", dob: "4/4/1943" },
    { id: "d", firstName: "Paul", lastName: "Paulsen", age: 81, gender: "male", dob: "4/4/1943" },
    { id: "e", firstName: "Bo", lastName: "Paulsen", age: 58, gender: "male", dob: "4/2/1966" },
    { id: "f", firstName: "Aka", lastName: "Paulsen", age: 58, gender: "female", dob: "4/2/1966" },
  ],
  couples: [
    {
      id: "root",
      person1Id: "a",
      person2Id: "b",
      relationshipType: "married",
      children: [{ personId: "c", birthOrder: 1, ownFamilyId: "grete-paul" }],
    },
    {
      id: "grete-paul",
      person1Id: "c",
      person2Id: "d",
      relationshipType: "married",
      children: [{ personId: "e", birthOrder: 1, ownFamilyId: "bo-aka" }],
    },
    {
      id: "bo-aka",
      person1Id: "e",
      person2Id: "f",
      relationshipType: "married",
    },
  ],
};

describe("buildWheelGraph", () => {
  it("produces one node per couple", () => {
    const { nodes, links } = buildWheelGraph(minimalFamily, "root");
    expect(nodes).toHaveLength(3);
  });

  it("root node is generation 0", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    expect(root?.generation).toBe(0);
  });

  it("assigns generation depth correctly", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    const gen2 = nodes.find((n) => n.coupleId === "bo-aka");
    expect(gen1?.generation).toBe(1);
    expect(gen2?.generation).toBe(2);
  });

  it("uses Fabricius-side birth year for radius", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(root?.birthYear).toBe(1919);
    expect(gen1?.birthYear).toBe(1943); // Grete is the Fabricius-side person
  });

  it("creates parent→child links", () => {
    const { links } = buildWheelGraph(minimalFamily, "root");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ source: "root", target: "grete-paul" });
    expect(links[1]).toEqual({ source: "grete-paul", target: "bo-aka" });
  });

  it("computes branch label from couple surname", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(gen1?.branchLabel).toBe("Paulsen");
  });

  it("marks single people as isSingle", () => {
    const withSingle: FamilyData = {
      people: [
        ...minimalFamily.people,
        { id: "solo", firstName: "Thomas", lastName: "Hansen", age: 76, gender: "male", dob: "7/13/1948" },
      ],
      couples: [
        {
          id: "root",
          person1Id: "a",
          person2Id: "b",
          relationshipType: "married",
          children: [
            { personId: "c", birthOrder: 1, ownFamilyId: "grete-paul" },
            { personId: "solo", birthOrder: 2, ownFamilyId: "solo-single" },
          ],
        },
        minimalFamily.couples[1],
        minimalFamily.couples[2],
        { id: "solo-single", person1Id: "solo", person2Id: null, relationshipType: "single" },
      ],
    };
    const { nodes } = buildWheelGraph(withSingle, "root");
    const single = nodes.find((n) => n.coupleId === "solo-single");
    expect(single?.isSingle).toBe(true);
    expect(single?.birthYear).toBe(1948);
  });

  it("tracks childCount for each node", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const root = nodes.find((n) => n.coupleId === "root");
    const leaf = nodes.find((n) => n.coupleId === "bo-aka");
    expect(root?.childCount).toBe(1);
    expect(leaf?.childCount).toBe(0);
  });

  it("tracks birthOrder from parent", () => {
    const { nodes } = buildWheelGraph(minimalFamily, "root");
    const gen1 = nodes.find((n) => n.coupleId === "grete-paul");
    expect(gen1?.birthOrder).toBe(1);
  });

  it("identifies Fabricius person when listed as person2Id", () => {
    // Grete (Fabricius child "c") is listed as person2Id in this couple
    const swapped: FamilyData = {
      people: minimalFamily.people,
      couples: [
        {
          id: "root",
          person1Id: "a",
          person2Id: "b",
          relationshipType: "married",
          children: [{ personId: "c", birthOrder: 1, ownFamilyId: "paul-grete" }],
        },
        {
          id: "paul-grete",
          person1Id: "d", // Paul is person1
          person2Id: "c", // Grete (Fabricius) is person2
          relationshipType: "married",
        },
      ],
    };
    const { nodes } = buildWheelGraph(swapped, "root");
    const couple = nodes.find((n) => n.coupleId === "paul-grete");
    expect(couple?.fabriciusPerson.id).toBe("c"); // Grete
    expect(couple?.partnerPerson?.id).toBe("d"); // Paul
    expect(couple?.birthYear).toBe(1943); // Grete's birth year
  });
});
