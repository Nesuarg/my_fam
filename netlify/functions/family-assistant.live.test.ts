import { describe, it, expect } from "vitest";
import handler from "./family-assistant";

// These call the real API, so they cost money and need ANTHROPIC_API_KEY.
// Off by default:
//   FAMILY_ASSISTANT_LIVE=1 pnpm vitest run netlify/functions/family-assistant.live.test.ts
const live = process.env.FAMILY_ASSISTANT_LIVE === "1" && !!process.env.ANTHROPIC_API_KEY;

process.env.FAMILY_EDIT_LOCAL = "1";
process.env.FAMILY_EDIT_PASSWORD = "fabricius";
process.env.FAMILY_EDIT_ROOT = process.cwd();

const post = (turns: unknown) =>
  handler(new Request("http://x/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Family-Password": "fabricius" },
    body: JSON.stringify({ turns }),
  }));

describe.skipIf(!live)("family-assistant against the real API", () => {
  it("asks for the gender rather than guessing it from the name", async () => {
    const res = await post([{ role: "user", content: "tilføj barn til Mette og Mads, Iben der er født 11 august 2013" }]);
    const body = await res.json();
    console.log("TUR 1 >>", JSON.stringify(body));
    expect(body.ok).toBe(true);
  }, 120000);

  it("proposes once the gender is given", async () => {
    const res = await post([
      { role: "user", content: "tilføj barn til Mette og Mads, Iben der er født 11 august 2013" },
      { role: "assistant", content: "Hvilket køn har Iben?" },
      { role: "user", content: "pige" },
    ]);
    const body = await res.json();
    console.log("TUR 2 >>", JSON.stringify(body));
    expect(body.ok).toBe(true);
    expect(body.reply.type).toBe("proposal");
  }, 120000);

  it("asks which family when the parents are ambiguous", async () => {
    const res = await post([{ role: "user", content: "tilføj et barn til Hansen" }]);
    const body = await res.json();
    console.log("TUR 3 >>", JSON.stringify(body));
    expect(body.reply.type).toBe("question");
  }, 120000);
});
