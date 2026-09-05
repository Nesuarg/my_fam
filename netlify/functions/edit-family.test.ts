import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import handler from "./edit-family";

/**
 * The local backend writes to the working copy and commits, so it needs a real
 * git repo to act on. Each test gets a throwaway one.
 */
let repo: string;

const seed = {
  people: [
    { id: "alice", firstName: "Alice", lastName: "Smith", age: 80, gender: "female", dob: "1/1/1945" },
    { id: "bob", firstName: "Bob", lastName: "Smith", age: 80, gender: "male", dob: "1/1/1945" },
    { id: "charlie", firstName: "Charlie", lastName: "Smith", age: 50, gender: "male", dob: "1/1/1975" },
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

const git = (args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf-8" });

function post(body: unknown, password = "test-pw") {
  return handler(
    new Request("http://localhost/.netlify/functions/edit-family", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Family-Password": password },
      body: JSON.stringify(body),
    }),
  );
}

const readData = () => JSON.parse(readFileSync(join(repo, "content/couples.json"), "utf-8"));

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "fam-"));
  mkdirSync(join(repo, "content"));
  writeFileSync(join(repo, "content/couples.json"), JSON.stringify(seed, null, "\t") + "\n");
  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  git(["add", "-A"]);
  git(["commit", "-qm", "seed"]);

  process.env.FAMILY_EDIT_LOCAL = "1";
  process.env.FAMILY_EDIT_ROOT = repo;
  process.env.FAMILY_EDIT_PASSWORD = "test-pw";
  delete process.env.GITHUB_TOKEN;
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  delete process.env.FAMILY_EDIT_LOCAL;
  delete process.env.FAMILY_EDIT_ROOT;
  delete process.env.FAMILY_EDIT_PASSWORD;
});

describe("edit-family local backend", () => {
  it("still rejects a wrong password", async () => {
    const res = await post({ action: "editPerson", personId: "alice", fields: {} }, "nope");
    expect(res.status).toBe(401);
  });

  it("writes the edit to the working copy", async () => {
    const res = await post({ action: "addChild", coupleId: "alice-bob", child: { firstName: "Dana", lastName: "Smith", gender: "female", dob: "3/4/1980" } });

    expect(res.status).toBe(200);
    expect(readData().people.map((p: { id: string }) => p.id)).toContain("dana");
  });

  it("makes one commit per edit, naming what changed", async () => {
    const before = git(["rev-list", "--count", "HEAD"]).trim();
    await post({ action: "addChild", coupleId: "alice-bob", child: { firstName: "Dana", lastName: "Smith", gender: "female", dob: "3/4/1980" } });

    expect(git(["rev-list", "--count", "HEAD"]).trim()).toBe(String(Number(before) + 1));
    expect(git(["log", "-1", "--format=%s"])).toContain("Dana Smith");
  });

  it("leaves the working tree clean", async () => {
    await post({ action: "addChild", coupleId: "alice-bob", child: { firstName: "Dana", lastName: "Smith", gender: "female", dob: "3/4/1980" } });
    expect(git(["status", "--porcelain"]).trim()).toBe("");
  });

  it("deletes a node and commits that too", async () => {
    const res = await post({ action: "deleteNode", nodeId: "charlie-uncoupled" });

    expect(res.status).toBe(200);
    expect(readData().people.map((p: { id: string }) => p.id)).toEqual(["alice", "bob"]);
    expect(git(["log", "-1", "--format=%s"])).toContain("Delete");
  });

  it("does not commit when the edit is rejected", async () => {
    const before = git(["rev-list", "--count", "HEAD"]).trim();
    const res = await post({ action: "deleteNode", nodeId: "alice-bob" });

    expect(res.status).toBe(400);
    expect(git(["rev-list", "--count", "HEAD"]).trim()).toBe(before);
    expect(git(["status", "--porcelain"]).trim()).toBe("");
  });

  it("treats an unchanged save as a no-op, not a failure", async () => {
    const before = git(["rev-list", "--count", "HEAD"]).trim();
    const res = await post({ action: "editPerson", personId: "alice", fields: { firstName: "Alice" } });

    expect(res.status).toBe(200);
    expect(git(["rev-list", "--count", "HEAD"]).trim()).toBe(before);
    expect(git(["status", "--porcelain"]).trim()).toBe("");
  });

  it("needs no GitHub token", async () => {
    expect(process.env.GITHUB_TOKEN).toBeUndefined();
    const res = await post({ action: "editPerson", personId: "alice", fields: { firstName: "Alicia" } });
    expect(res.status).toBe(200);
  });
});
