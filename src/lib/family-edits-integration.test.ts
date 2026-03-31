import { describe, it, expect } from "vitest";
import { applyAddChild, applyAddCouple, applyEditPerson } from "./family-edits";
import type { FamilyData } from "@/types/simple-family";
import couplesJson from "../../content/couples.json";

const data = couplesJson as FamilyData;

describe("edits against real couples.json", () => {
  it("can add a child to bodil-carl", () => {
    const result = applyAddChild(data, "bodil-carl", {
      firstName: "Nanna",
      lastName: "Fabricius Schmidt",
      gender: "female",
      dob: "5/15/2000",
    });
    const couple = result.couples.find((c) => c.id === "bodil-carl");
    expect(couple?.children?.length).toBe((data.couples.find((c) => c.id === "bodil-carl")?.children?.length ?? 0) + 1);
    const nanna = result.people.find((p) => p.id === "nanna");
    expect(nanna?.firstName).toBe("Nanna");
  });

  it("can add a partner to ejgil (uncoupled)", () => {
    // ejgil is a child of ruth-jesper without ownFamilyId
    const result = applyAddCouple(data, "ejgil", {
      firstName: "Line",
      lastName: "Jensen",
      gender: "female",
      dob: "3/12/1990",
    }, "married");

    const couple = result.couples.find((c) => c.person1Id === "ejgil");
    expect(couple).toBeDefined();
    expect(couple?.person2Id).toBe("line");
    expect(couple?.relationshipType).toBe("married");
  });

  it("can edit mads' name", () => {
    const result = applyEditPerson(data, "mads", { firstName: "Mads Christian" });
    const mads = result.people.find((p) => p.id === "mads");
    expect(mads?.firstName).toBe("Mads Christian");
    expect(mads?.lastName).toBe("Fabricius Schmidt"); // unchanged
  });

  it("does not mutate the original data", () => {
    const originalCount = data.people.length;
    applyAddChild(data, "bodil-carl", {
      firstName: "Test",
      lastName: "Test",
      gender: "male",
      dob: "1/1/2000",
    });
    expect(data.people.length).toBe(originalCount);
  });
});
