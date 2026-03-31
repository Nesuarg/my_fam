import { describe, it, expect } from "vitest";
import { compress, decompress } from "./codec";
import type { CompactState } from "./types";

describe("codec", () => {
  it("roundtrips a compact state through compress/decompress", async () => {
    const input: CompactState = {
      s: { l: "wheel", b: true, r: true },
      c: [1.2, 300, -50],
      d: { "mads-mette": [3, -7], "niels-peter-dorthea": [-12, 4] },
    };
    const encoded = await compress(input);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");

    const decoded = await decompress(encoded);
    expect(decoded).toEqual(input);
  });

  it("produces a shorter string than raw JSON", async () => {
    const input: CompactState = {
      s: { l: "wheel", b: true, r: true },
      c: [1, 0, 0],
      d: Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`node-${i}`, [i * 2, i * -3]]),
      ),
    };
    const encoded = await compress(input);
    const rawJson = JSON.stringify(input);
    expect(encoded.length).toBeLessThan(rawJson.length);
  });

  it("returns null for invalid base64url input", async () => {
    const result = await decompress("not-valid-gzip-data!!!");
    expect(result).toBeNull();
  });
});
