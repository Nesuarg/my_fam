import { describe, it, expect } from "vitest";
import { buildRoster, buildPrompt, parseAssistantReply, validateProposal } from "./family-assistant";

const data = {
  people: [
    { id: "mads", firstName: "Mads", lastName: "Schmidt", age: 40, gender: "male" as const, dob: "1/1/1985" },
    { id: "mette", firstName: "Mette", lastName: "Bjerre", age: 40, gender: "female" as const, dob: "1/1/1985" },
    { id: "iben", firstName: "Iben", lastName: "Bjerre", age: 12, gender: "female" as const, dob: "8/11/2013" },
    { id: "asta", firstName: "Asta", lastName: "Hansen", age: 31, gender: "female" as const, dob: "1/1/1994" },
  ],
  couples: [
    {
      id: "mads-mette",
      person1Id: "mads",
      person2Id: "mette",
      relationshipType: "married",
      children: [{ personId: "iben", birthOrder: 1 }],
    },
    {
      id: "solo",
      person1Id: "asta",
      person2Id: null,
      relationshipType: "single",
      children: [],
    },
  ],
};

describe("buildRoster", () => {
  it("lists each couple by id with both names and years", () => {
    expect(buildRoster(data)).toContain("mads-mette: Mads Schmidt (1985) & Mette Bjerre (1985)");
  });

  it("lists childless children under their -uncoupled id", () => {
    expect(buildRoster(data)).toContain("iben-uncoupled: Iben Bjerre (2013)");
  });

  it("shows a single parent without an ampersand", () => {
    expect(buildRoster(data)).toContain("solo: Asta Hansen (1994)");
    expect(buildRoster(data)).not.toContain("Asta Hansen (1994) &");
  });
});

describe("buildPrompt", () => {
  it("labels who said what", () => {
    const prompt = buildPrompt("ROSTER", [
      { role: "user", content: "tilføj barn" },
      { role: "assistant", content: "Hvilket køn?" },
      { role: "user", content: "pige" },
    ]);
    expect(prompt).toContain("Bruger: tilføj barn");
    expect(prompt).toContain("Assistent: Hvilket køn?");
  });
});

describe("parseAssistantReply", () => {
  it("reads a question", () => {
    const reply = parseAssistantReply('{"type":"question","question":"Hvilket køn har Iben?"}');
    expect(reply).toEqual({ type: "question", question: "Hvilket køn har Iben?" });
  });

  it("reads a proposal", () => {
    const reply = parseAssistantReply(
      '{"type":"proposal","coupleId":"mads-mette","child":{"firstName":"Iben","lastName":"Bjerre","gender":"female","dob":"8/11/2013"},"summary":"Iben som barn af Mads og Mette"}',
    );
    expect(reply).toMatchObject({ type: "proposal", coupleId: "mads-mette" });
  });

  it("tolerates prose around the JSON", () => {
    const reply = parseAssistantReply('Her er svaret:\n\n{"type":"question","question":"Hvornår?"}\n');
    expect(reply.type).toBe("question");
  });

  it("rejects a birth date that is not M/D/YYYY", () => {
    expect(() =>
      parseAssistantReply(
        '{"type":"proposal","coupleId":"mads-mette","child":{"firstName":"Iben","lastName":"Bjerre","gender":"female","dob":"11 august 2013"},"summary":"x"}',
      ),
    ).toThrow(/fødselsdato/i);
  });

  it("rejects a proposal with no gender, rather than guessing one", () => {
    expect(() =>
      parseAssistantReply(
        '{"type":"proposal","coupleId":"mads-mette","child":{"firstName":"Iben","lastName":"Bjerre","dob":"8/11/2013"},"summary":"x"}',
      ),
    ).toThrow(/køn/i);
  });

  it("rejects an empty question", () => {
    expect(() => parseAssistantReply('{"type":"question","question":"  "}')).toThrow();
  });

  it("rejects a reply that is not JSON at all", () => {
    expect(() => parseAssistantReply("Jeg kan desværre ikke hjælpe")).toThrow(/JSON/);
  });
});

describe("validateProposal", () => {
  const proposal = {
    type: "proposal" as const,
    coupleId: "mads-mette",
    child: { firstName: "Iben", lastName: "Bjerre", gender: "female" as const, dob: "8/11/2013" },
    summary: "",
  };

  it("accepts an id that exists", () => {
    expect(() => validateProposal(proposal, data)).not.toThrow();
  });

  it("rejects an invented id", () => {
    expect(() => validateProposal({ ...proposal, coupleId: "opfundet-par" }, data)).toThrow(
      /findes/i,
    );
  });

  // A name in the tree is user input, so it can carry text aimed at the model.
  // Structural validation is what stops that from reaching the edit endpoint.
  it("rejects an -uncoupled id, which is a person and not a couple", () => {
    expect(() => validateProposal({ ...proposal, coupleId: "iben-uncoupled" }, data)).toThrow();
  });
});
