import { describe, it, expect } from "vitest";
import { applyAddChild, applyAddCouple, applyEditPerson, generatePersonId } from "./family-edits";
import type { FamilyData } from "@/types/simple-family";

function makeData(): FamilyData {
  return {
    people: [
      { id: "alice", firstName: "Alice", lastName: "Smith", age: 40, gender: "female", dob: "1/1/1985" },
      { id: "bob", firstName: "Bob", lastName: "Smith", age: 40, gender: "male", dob: "1/1/1985" },
      { id: "charlie", firstName: "Charlie", lastName: "Smith", age: 20, gender: "male", dob: "6/15/2005" },
    ],
    couples: [
      {
        id: "alice-bob",
        person1Id: "alice",
        person2Id: "bob",
        relationshipType: "married",
        children: [{ personId: "charlie", birthOrder: 1 }],
      },
    ],
  };
}

describe("generatePersonId", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    const data = makeData();
    expect(generatePersonId("Nanna Marie", data)).toBe("nanna-marie");
  });

  it("appends suffix on collision", () => {
    const data = makeData();
    expect(generatePersonId("Alice", data)).toBe("alice-2");
  });

  it("increments suffix until unique", () => {
    const data = makeData();
    data.people.push({ id: "alice-2", firstName: "Alice", lastName: "X", age: 1, gender: "female", dob: "1/1/2020" });
    expect(generatePersonId("Alice", data)).toBe("alice-3");
  });

  it("throws on empty name", () => {
    const data = makeData();
    expect(() => generatePersonId("", data)).toThrow("First name is required");
    expect(() => generatePersonId("   ", data)).toThrow("First name is required");
  });

  it("trims whitespace", () => {
    const data = makeData();
    expect(generatePersonId("  Nanna  ", data)).toBe("nanna");
  });
});

describe("applyAddChild", () => {
  it("adds a person and child reference to the couple", () => {
    const data = makeData();
    const result = applyAddChild(data, "alice-bob", {
      firstName: "Daisy",
      lastName: "Smith",
      gender: "female",
      dob: "3/10/2010",
    });

    const person = result.people.find((p) => p.id === "daisy");
    expect(person).toBeDefined();
    expect(person?.firstName).toBe("Daisy");
    expect(person?.lastName).toBe("Smith");
    expect(person?.gender).toBe("female");
    expect(person?.dob).toBe("3/10/2010");

    const couple = result.couples.find((c) => c.id === "alice-bob");
    expect(couple?.children).toHaveLength(2);
    expect(couple?.children?.[1].personId).toBe("daisy");
    expect(couple?.children?.[1].birthOrder).toBe(2);
  });

  it("throws if couple not found", () => {
    const data = makeData();
    expect(() =>
      applyAddChild(data, "nonexistent", { firstName: "X", lastName: "Y", gender: "male", dob: "1/1/2000" }),
    ).toThrow("Couple nonexistent not found");
  });

  it("throws on empty first name", () => {
    const data = makeData();
    expect(() =>
      applyAddChild(data, "alice-bob", { firstName: "", lastName: "Smith", gender: "male", dob: "1/1/2000" }),
    ).toThrow("First name is required");
  });

  it("throws on empty last name", () => {
    const data = makeData();
    expect(() =>
      applyAddChild(data, "alice-bob", { firstName: "X", lastName: "  ", gender: "male", dob: "1/1/2000" }),
    ).toThrow("Last name is required");
  });

  it("throws on invalid date format", () => {
    const data = makeData();
    expect(() =>
      applyAddChild(data, "alice-bob", { firstName: "X", lastName: "Y", gender: "male", dob: "2000-01-15" }),
    ).toThrow("Invalid date format");
  });

  it("throws on out-of-range birth year", () => {
    const data = makeData();
    expect(() =>
      applyAddChild(data, "alice-bob", { firstName: "X", lastName: "Y", gender: "male", dob: "1/1/1700" }),
    ).toThrow("out of range");
  });
});

describe("applyAddCouple", () => {
  it("creates partner, couple entry, and sets ownFamilyId on parent child", () => {
    const data = makeData();
    const result = applyAddCouple(data, "charlie", {
      firstName: "Diana",
      lastName: "Jones",
      gender: "female",
      dob: "7/20/2005",
    }, "married");

    const partner = result.people.find((p) => p.id === "diana");
    expect(partner).toBeDefined();
    expect(partner?.firstName).toBe("Diana");

    const couple = result.couples.find((c) => c.person1Id === "charlie" && c.person2Id === "diana");
    expect(couple).toBeDefined();
    expect(couple?.relationshipType).toBe("married");

    const parentCouple = result.couples.find((c) => c.id === "alice-bob");
    const childRef = parentCouple?.children?.find((ch) => ch.personId === "charlie");
    expect(childRef?.ownFamilyId).toBe(couple?.id);
  });

  it("throws if person not found", () => {
    const data = makeData();
    expect(() =>
      applyAddCouple(data, "nobody", { firstName: "X", lastName: "Y", gender: "female", dob: "1/1/2000" }, "married"),
    ).toThrow("Person nobody not found");
  });

  it("throws if person already has a partner", () => {
    const data = makeData();
    // alice is already in couple alice-bob
    expect(() =>
      applyAddCouple(data, "alice", { firstName: "X", lastName: "Y", gender: "male", dob: "1/1/2000" }, "married"),
    ).toThrow("already has a partner");
  });
});

describe("applyEditPerson", () => {
  it("updates only provided fields", () => {
    const data = makeData();
    const result = applyEditPerson(data, "alice", { firstName: "Alicia" });

    const person = result.people.find((p) => p.id === "alice");
    expect(person?.firstName).toBe("Alicia");
    expect(person?.lastName).toBe("Smith");
  });

  it("updates dob and recalculates age", () => {
    const data = makeData();
    const result = applyEditPerson(data, "alice", { dob: "1/1/1990" });
    const person = result.people.find((p) => p.id === "alice");
    expect(person?.dob).toBe("1/1/1990");
    expect(person?.age).toBe(new Date().getFullYear() - 1990);
  });

  it("updates gender", () => {
    const data = makeData();
    const result = applyEditPerson(data, "alice", { gender: "other" });
    const person = result.people.find((p) => p.id === "alice");
    expect(person?.gender).toBe("other");
  });

  it("throws if person not found", () => {
    const data = makeData();
    expect(() => applyEditPerson(data, "nobody", { firstName: "X" })).toThrow("Person nobody not found");
  });

  it("throws on empty first name", () => {
    const data = makeData();
    expect(() => applyEditPerson(data, "alice", { firstName: "" })).toThrow("First name cannot be empty");
  });

  it("throws on empty last name", () => {
    const data = makeData();
    expect(() => applyEditPerson(data, "alice", { lastName: "  " })).toThrow("Last name cannot be empty");
  });

  it("throws on invalid dob format", () => {
    const data = makeData();
    expect(() => applyEditPerson(data, "alice", { dob: "not-a-date" })).toThrow("Invalid date format");
  });
});
