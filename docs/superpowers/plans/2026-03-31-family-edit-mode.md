# Family Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let family members add children, register couples, and edit person details from the wheel visualization, with edits committing to `couples.json` via the GitHub API.

**Architecture:** A Netlify Function handles all writes — validates a shared password, applies edits to `couples.json` in memory, and commits via GitHub API. The frontend adds an edit mode toggle to the existing wheel component, with inline forms for editing and adding data. Optimistic local state updates give instant feedback while the rebuild happens in the background.

**Tech Stack:** Netlify Functions, GitHub REST API, React (existing Astro island), TypeScript

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/family-api.ts` | Client-side API helper: sends edit requests to the Netlify Function, handles auth header, returns typed responses. |
| `src/lib/family-edits.ts` | Pure functions that apply edits (addChild, addCouple, editPerson) to a `FamilyData` object in memory. Used by both the Netlify Function (server-side) and the frontend (optimistic updates). |
| `netlify/functions/edit-family.ts` | Serverless function: validate password, fetch `couples.json` from GitHub, apply edit via `family-edits.ts`, commit back via GitHub API. |
| `src/components/PasswordModal.tsx` | Modal for entering the family password. |
| `src/components/EditPanel.tsx` | Edit/add form panel: edit person fields, add child form, add partner form. |
| `src/components/SyncBadge.tsx` | "Syncing..." / "Updated!" indicator that polls Netlify deploy status. |
| `src/components/FamilyWheel.tsx` | Modified: add edit mode state, edit button, wire up EditPanel + PasswordModal + SyncBadge, optimistic updates. |

---

### Task 1: Pure edit functions (`family-edits.ts`)

Shared logic for applying edits to `FamilyData` in memory. Used by both server and client.

**Files:**
- Create: `src/lib/family-edits.ts`
- Test: `src/lib/family-edits.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/family-edits.test.ts`:

```typescript
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

    // Partner person created
    const partner = result.people.find((p) => p.id === "diana");
    expect(partner).toBeDefined();
    expect(partner?.firstName).toBe("Diana");

    // Couple entry created
    const couple = result.couples.find((c) => c.person1Id === "charlie" && c.person2Id === "diana");
    expect(couple).toBeDefined();
    expect(couple?.relationshipType).toBe("married");

    // Parent couple's child reference updated
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
});

describe("applyEditPerson", () => {
  it("updates only provided fields", () => {
    const data = makeData();
    const result = applyEditPerson(data, "alice", { firstName: "Alicia" });

    const person = result.people.find((p) => p.id === "alice");
    expect(person?.firstName).toBe("Alicia");
    expect(person?.lastName).toBe("Smith"); // unchanged
  });

  it("throws if person not found", () => {
    const data = makeData();
    expect(() => applyEditPerson(data, "nobody", { firstName: "X" })).toThrow("Person nobody not found");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm test src/lib/family-edits.test.ts
```

Expected: FAIL — module `./family-edits` not found.

- [ ] **Step 3: Implement `family-edits.ts`**

Create `src/lib/family-edits.ts`:

```typescript
import type { FamilyData, SimplePerson } from "@/types/simple-family";

interface NewPersonInput {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dob: string;
}

export function generatePersonId(firstName: string, data: FamilyData): string {
  const base = firstName.toLowerCase().replace(/\s+/g, "-");
  const existingIds = new Set(data.people.map((p) => p.id));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function cloneData(data: FamilyData): FamilyData {
  return JSON.parse(JSON.stringify(data));
}

function computeAge(dob: string): number {
  const parts = dob.split("/");
  const birthYear = parseInt(parts[2], 10);
  return new Date().getFullYear() - birthYear;
}

export function applyAddChild(
  data: FamilyData,
  coupleId: string,
  child: NewPersonInput,
): FamilyData {
  const result = cloneData(data);
  const couple = result.couples.find((c) => c.id === coupleId);
  if (!couple) throw new Error(`Couple ${coupleId} not found`);

  const personId = generatePersonId(child.firstName, result);
  const newPerson: SimplePerson = {
    id: personId,
    firstName: child.firstName,
    lastName: child.lastName,
    age: computeAge(child.dob),
    gender: child.gender,
    dob: child.dob,
  };
  result.people.push(newPerson);

  if (!couple.children) couple.children = [];
  const maxOrder = couple.children.reduce((max, ch) => Math.max(max, ch.birthOrder), 0);
  couple.children.push({ personId, birthOrder: maxOrder + 1 });

  return result;
}

export function applyAddCouple(
  data: FamilyData,
  personId: string,
  partner: NewPersonInput,
  relationshipType: "married" | "partnership" | "common-law",
): FamilyData {
  const result = cloneData(data);
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  const partnerId = generatePersonId(partner.firstName, result);
  const newPartner: SimplePerson = {
    id: partnerId,
    firstName: partner.firstName,
    lastName: partner.lastName,
    age: computeAge(partner.dob),
    gender: partner.gender,
    dob: partner.dob,
  };
  result.people.push(newPartner);

  const coupleId = `${personId}-${partnerId}`;
  result.couples.push({
    id: coupleId,
    person1Id: personId,
    person2Id: partnerId,
    relationshipType,
  });

  // Update parent couple's child ref to set ownFamilyId
  for (const couple of result.couples) {
    if (couple.children) {
      const childRef = couple.children.find((ch) => ch.personId === personId);
      if (childRef && !childRef.ownFamilyId) {
        childRef.ownFamilyId = coupleId;
        break;
      }
    }
  }

  return result;
}

export function applyEditPerson(
  data: FamilyData,
  personId: string,
  fields: Partial<Pick<SimplePerson, "firstName" | "lastName" | "dob" | "gender">>,
): FamilyData {
  const result = cloneData(data);
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  if (fields.firstName !== undefined) person.firstName = fields.firstName;
  if (fields.lastName !== undefined) person.lastName = fields.lastName;
  if (fields.dob !== undefined) {
    person.dob = fields.dob;
    person.age = computeAge(fields.dob);
  }
  if (fields.gender !== undefined) person.gender = fields.gender;

  return result;
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm test src/lib/family-edits.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/family-edits.ts src/lib/family-edits.test.ts
git commit -m "feat: add pure edit functions for family data (addChild, addCouple, editPerson)"
```

---

### Task 2: Netlify Function (`edit-family.ts`)

Serverless function that validates the password, fetches `couples.json` from GitHub, applies the edit, and commits back.

**Files:**
- Create: `netlify/functions/edit-family.ts`

- [ ] **Step 1: Create the Netlify functions directory**

```bash
mkdir -p /Users/madsschmidt/Documents/fam/my_fam/netlify/functions
```

- [ ] **Step 2: Create `edit-family.ts`**

Create `netlify/functions/edit-family.ts`:

```typescript
import type { Context } from "@netlify/functions";
import type { FamilyData } from "../../src/types/simple-family";
import { applyAddChild, applyAddCouple, applyEditPerson } from "../../src/lib/family-edits";

const REPO = "Nesuarg/my_fam";
const FILE_PATH = "content/couples.json";
const BRANCH = "master";

interface GitHubFileResponse {
  content: string;
  sha: string;
  encoding: string;
}

async function fetchFileFromGitHub(token: string): Promise<{ data: FamilyData; sha: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status} ${await res.text()}`);

  const file: GitHubFileResponse = await res.json();
  const decoded = Buffer.from(file.content, "base64").toString("utf-8");
  return { data: JSON.parse(decoded), sha: file.sha };
}

async function commitFileToGitHub(
  token: string,
  data: FamilyData,
  sha: string,
  message: string,
): Promise<string> {
  const content = Buffer.from(JSON.stringify(data, null, "\t") + "\n").toString("base64");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content,
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const body = await res.text();
    if (status === 409) throw new Error("CONFLICT");
    throw new Error(`GitHub commit failed: ${status} ${body}`);
  }
  const result = await res.json();
  return result.commit.sha;
}

function applyEdit(data: FamilyData, body: Record<string, unknown>): { data: FamilyData; message: string } {
  const action = body.action as string;

  switch (action) {
    case "addChild": {
      const coupleId = body.coupleId as string;
      const child = body.child as { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string };
      return {
        data: applyAddChild(data, coupleId, child),
        message: `Add child ${child.firstName} ${child.lastName} to ${coupleId}`,
      };
    }
    case "addCouple": {
      const personId = body.personId as string;
      const partner = body.partner as { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string };
      const relationshipType = (body.relationshipType as "married" | "partnership" | "common-law") ?? "married";
      return {
        data: applyAddCouple(data, personId, partner, relationshipType),
        message: `Add partner ${partner.firstName} ${partner.lastName} for ${personId}`,
      };
    }
    case "editPerson": {
      const personId = body.personId as string;
      const fields = body.fields as Record<string, string>;
      return {
        data: applyEditPerson(data, personId, fields),
        message: `Edit ${personId}`,
      };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Family-Password" },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  // Validate password
  const password = req.headers.get("X-Family-Password");
  const expectedPassword = process.env.FAMILY_EDIT_PASSWORD;
  if (!expectedPassword || password !== expectedPassword) {
    return Response.json({ ok: false, error: "unauthorized", message: "Invalid password" }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return Response.json({ ok: false, error: "config", message: "GitHub token not configured" }, { status: 500 });
  }

  const body = await req.json();

  // Try up to 2 times (initial + 1 retry on conflict)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: currentData, sha } = await fetchFileFromGitHub(githubToken);
      const { data: updatedData, message } = applyEdit(currentData, body);
      const commitSha = await commitFileToGitHub(githubToken, updatedData, sha, message);
      return Response.json({ ok: true, data: updatedData, commitSha });
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT" && attempt === 0) {
        continue; // retry
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      const status = message === "CONFLICT" ? 409 : 400;
      return Response.json({ ok: false, error: message === "CONFLICT" ? "conflict" : "error", message }, { status });
    }
  }

  return Response.json({ ok: false, error: "conflict", message: "Conflict after retry. Please refresh and try again." }, { status: 409 });
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm build 2>&1 | tail -10
```

Expected: Build succeeds. Netlify adapter should pick up the function.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/edit-family.ts
git commit -m "feat: add Netlify Function for family data edits via GitHub API"
```

---

### Task 3: Client-side API helper (`family-api.ts`)

Thin client that sends edit requests and handles the password header.

**Files:**
- Create: `src/lib/family-api.ts`

- [ ] **Step 1: Create `family-api.ts`**

```typescript
import type { FamilyData } from "@/types/simple-family";

const STORAGE_KEY = "family-edit-password";

export function getStoredPassword(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storePassword(password: string): void {
  localStorage.setItem(STORAGE_KEY, password);
}

export function clearPassword(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface ApiSuccess {
  ok: true;
  data: FamilyData;
  commitSha: string;
}

interface ApiError {
  ok: false;
  error: string;
  message: string;
}

type ApiResponse = ApiSuccess | ApiError;

async function callApi(password: string, body: Record<string, unknown>): Promise<ApiResponse> {
  const res = await fetch("/.netlify/functions/edit-family", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Family-Password": password,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function validatePassword(password: string): Promise<boolean> {
  // Send a no-op to check if the password is valid
  // We use editPerson with no changes — it will fail with "Person not found" but NOT 401
  const res = await fetch("/.netlify/functions/edit-family", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Family-Password": password,
    },
    body: JSON.stringify({ action: "editPerson", personId: "__ping__", fields: {} }),
  });
  // 401 = wrong password, anything else = password was accepted
  return res.status !== 401;
}

export async function addChild(
  password: string,
  coupleId: string,
  child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string },
): Promise<ApiResponse> {
  return callApi(password, { action: "addChild", coupleId, child });
}

export async function addCouple(
  password: string,
  personId: string,
  partner: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string },
  relationshipType: string,
): Promise<ApiResponse> {
  return callApi(password, { action: "addCouple", personId, partner, relationshipType });
}

export async function editPerson(
  password: string,
  personId: string,
  fields: Record<string, string>,
): Promise<ApiResponse> {
  return callApi(password, { action: "editPerson", personId, fields });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/family-api.ts
git commit -m "feat: add client-side API helper for family edits"
```

---

### Task 4: PasswordModal component

Simple modal for entering the family password.

**Files:**
- Create: `src/components/PasswordModal.tsx`

- [ ] **Step 1: Create `PasswordModal.tsx`**

```tsx
import { useState } from "react";

interface Props {
  onSuccess: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export default function PasswordModal({ onSuccess, onCancel, error }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    onSuccess(password.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-6 w-80 shadow-xl"
      >
        <h3 className="text-white font-medium mb-3">Enter Family Password</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="flex-1 px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs bg-[#2a2d3e] text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PasswordModal.tsx
git commit -m "feat: add PasswordModal component for edit mode authentication"
```

---

### Task 5: SyncBadge component

Shows "Syncing..." after an edit, polls Netlify deploy status, shows "Updated!" when done.

**Files:**
- Create: `src/components/SyncBadge.tsx`

- [ ] **Step 1: Create `SyncBadge.tsx`**

```tsx
import { useEffect, useState, useRef } from "react";

interface Props {
  editTimestamp: number | null; // ms since epoch when the last edit was committed
  siteId: string;
}

type SyncState = "idle" | "syncing" | "done";

export default function SyncBadge({ editTimestamp, siteId }: Props) {
  const [state, setState] = useState<SyncState>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!editTimestamp || !siteId) {
      setState("idle");
      return;
    }

    setState("syncing");

    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000; // 5 minutes

    const poll = async () => {
      if (Date.now() - startTime > maxDuration) {
        setState("idle");
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      try {
        const res = await fetch(
          `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
        );
        if (!res.ok) return;
        const deploys = await res.json();
        if (deploys.length > 0) {
          const latest = deploys[0];
          const deployTime = new Date(latest.created_at).getTime();
          if (deployTime > editTimestamp && latest.state === "ready") {
            setState("done");
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimeout(() => setState("idle"), 3000);
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    intervalRef.current = setInterval(poll, 10000);
    poll(); // initial check

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [editTimestamp, siteId]);

  if (state === "idle") return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {state === "syncing" && (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400">Syncing...</span>
        </>
      )}
      {state === "done" && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-green-400">Updated!</span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SyncBadge.tsx
git commit -m "feat: add SyncBadge component for rebuild status polling"
```

---

### Task 6: EditPanel component

The inline edit/add form that appears when clicking a node in edit mode.

**Files:**
- Create: `src/components/EditPanel.tsx`

- [ ] **Step 1: Create `EditPanel.tsx`**

```tsx
import { useState } from "react";
import type { WheelNode } from "@/lib/wheel-graph";

type EditView = "details" | "addChild" | "addPartner";

interface Props {
  node: WheelNode;
  x: number;
  y: number;
  onEditPerson: (personId: string, fields: Record<string, string>) => void;
  onAddChild: (coupleId: string, child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }) => void;
  onAddCouple: (personId: string, partner: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relationshipType: string) => void;
  onClose: () => void;
}

function PersonFields({
  label,
  firstName,
  lastName,
  dob,
  onSave,
}: {
  label: string;
  firstName: string;
  lastName: string;
  dob: string;
  onSave: (fields: { firstName: string; lastName: string; dob: string }) => void;
}) {
  const [fn, setFn] = useState(firstName);
  const [ln, setLn] = useState(lastName);
  const [d, setD] = useState(dob);
  const changed = fn !== firstName || ln !== lastName || d !== dob;

  return (
    <div className="mb-3">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="First name" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={ln} onChange={(e) => setLn(e.target.value)} placeholder="Last name" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={d} onChange={(e) => setD(e.target.value)} placeholder="Birth date (M/D/YYYY)" className="w-full px-2 py-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      {changed && (
        <button onClick={() => onSave({ firstName: fn, lastName: ln, dob: d })} className="mt-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
          Save
        </button>
      )}
    </div>
  );
}

function NewPersonForm({
  onSave,
  onCancel,
  showRelType,
}: {
  onSave: (person: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relType?: string) => void;
  onCancel: () => void;
  showRelType?: boolean;
}) {
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [dob, setDob] = useState("");
  const [relType, setRelType] = useState("married");

  return (
    <div className="mt-2 border-t border-[#2a2d3e] pt-2">
      <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="First name" autoFocus className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={ln} onChange={(e) => setLn(e.target.value)} placeholder="Last name" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="Birth date (M/D/YYYY)" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <div className="flex gap-2 mb-1">
        <button onClick={() => setGender("male")} className={`px-2 py-1 text-xs rounded ${gender === "male" ? "bg-blue-600 text-white" : "bg-[#2a2d3e] text-gray-400"}`}>M</button>
        <button onClick={() => setGender("female")} className={`px-2 py-1 text-xs rounded ${gender === "female" ? "bg-pink-600 text-white" : "bg-[#2a2d3e] text-gray-400"}`}>F</button>
      </div>
      {showRelType && (
        <select value={relType} onChange={(e) => setRelType(e.target.value)} className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs">
          <option value="married">Married</option>
          <option value="partnership">Partnership</option>
          <option value="common-law">Common-law</option>
        </select>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => { if (fn && ln && dob) onSave({ firstName: fn, lastName: ln, gender, dob }, relType); }}
          disabled={!fn || !ln || !dob}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
        <button onClick={onCancel} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-400 rounded hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

export default function EditPanel({ node, x, y, onEditPerson, onAddChild, onAddCouple, onClose }: Props) {
  const [view, setView] = useState<EditView>("details");

  return (
    <div
      className="absolute z-30 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 shadow-xl"
      style={{ left: x + 20, top: y - 20, width: 260 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-white text-sm font-medium">Edit</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">X</button>
      </div>

      {view === "details" && (
        <>
          <PersonFields
            label="Fabricius"
            firstName={node.fabriciusPerson.firstName}
            lastName={node.fabriciusPerson.lastName}
            dob={node.fabriciusPerson.dob}
            onSave={(fields) => onEditPerson(node.fabriciusPerson.id, fields)}
          />
          {node.partnerPerson && (
            <PersonFields
              label="Partner"
              firstName={node.partnerPerson.firstName}
              lastName={node.partnerPerson.lastName}
              dob={node.partnerPerson.dob}
              onSave={(fields) => onEditPerson(node.partnerPerson!.id, fields)}
            />
          )}
          <div className="flex gap-2 mt-2 border-t border-[#2a2d3e] pt-2">
            {!node.isSingle && (
              <button onClick={() => setView("addChild")} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-300 rounded hover:text-white">+ Child</button>
            )}
            {node.isSingle && !node.partnerPerson && (
              <button onClick={() => setView("addPartner")} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-300 rounded hover:text-white">+ Partner</button>
            )}
          </div>
        </>
      )}

      {view === "addChild" && (
        <>
          <div className="text-gray-400 text-xs mb-1">Add child</div>
          <NewPersonForm
            onSave={(child) => { onAddChild(node.coupleId, child); onClose(); }}
            onCancel={() => setView("details")}
          />
        </>
      )}

      {view === "addPartner" && (
        <>
          <div className="text-gray-400 text-xs mb-1">Add partner for {node.fabriciusPerson.firstName}</div>
          <NewPersonForm
            showRelType
            onSave={(partner, relType) => { onAddCouple(node.fabriciusPerson.id, partner, relType ?? "married"); onClose(); }}
            onCancel={() => setView("details")}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EditPanel.tsx
git commit -m "feat: add EditPanel component for inline family data editing"
```

---

### Task 7: Wire edit mode into FamilyWheel

Integrate all the new components into the existing wheel visualization.

**Files:**
- Modify: `src/components/FamilyWheel.tsx`

- [ ] **Step 1: Add imports and edit mode state**

Add these imports at the top of `FamilyWheel.tsx` (after existing imports):

```typescript
import { applyAddChild, applyAddCouple, applyEditPerson } from "@/lib/family-edits";
import { getStoredPassword, storePassword, clearPassword, addChild as apiAddChild, addCouple as apiAddCouple, editPerson as apiEditPerson, validatePassword } from "@/lib/family-api";
import PasswordModal from "./PasswordModal";
import EditPanel from "./EditPanel";
import SyncBadge from "./SyncBadge";
```

Add new state variables inside the component (after the existing `useState` declarations):

```typescript
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(getStoredPassword);
  const [localData, setLocalData] = useState<FamilyData>(familyData);
  const [editNode, setEditNode] = useState<{ node: WheelNode; x: number; y: number } | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<number | null>(null);
```

Also change the `graphRef` initialization and the main `useEffect` to use `localData` instead of `familyData`:
- Replace all references to `familyData` in the `useEffect` dependency array with `localData`
- Replace `buildWheelGraph(familyData, rootCoupleId)` with `buildWheelGraph(localData, rootCoupleId)`
- When `localData` changes, reset `graphRef.current = null` so the graph rebuilds

Add this effect to reset the graph when data changes:

```typescript
  useEffect(() => {
    graphRef.current = null;
  }, [localData]);
```

- [ ] **Step 2: Add edit mode handlers**

Add these handlers after the state declarations:

```typescript
  const handleEditToggle = async () => {
    if (editMode) {
      setEditMode(false);
      setEditNode(null);
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
    if (res.ok) {
      setSyncTimestamp(Date.now());
    }
  };

  const handleAddChild = async (coupleId: string, child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }) => {
    if (!password) return;
    const updated = applyAddChild(localData, coupleId, child);
    setLocalData(updated);
    const res = await apiAddChild(password, coupleId, child);
    if (res.ok) {
      setSyncTimestamp(Date.now());
    }
  };

  const handleAddCouple = async (personId: string, partner: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relType: string) => {
    if (!password) return;
    const updated = applyAddCouple(localData, personId, partner, relType as "married" | "partnership" | "common-law");
    setLocalData(updated);
    const res = await apiAddCouple(password, personId, partner, relType);
    if (res.ok) {
      setSyncTimestamp(Date.now());
    }
  };
```

- [ ] **Step 3: Update node click handler for edit mode**

In the D3 setup `useEffect`, update the click handler on nodeSel. Find the existing click handler and replace it:

```typescript
      .on("click", (event, d) => {
        event.stopPropagation();
        if (editMode) {
          const [mx, my] = d3.pointer(event, svg);
          setEditNode({ node: d, x: mx, y: my });
        }
      });
```

Add `editMode` to the `useEffect` dependency array (alongside `localData`, `rootCoupleId`, `getLayout`).

Also add click-on-background to dismiss edit panel:

```typescript
    sel.on("click", () => setEditNode(null));
```

- [ ] **Step 4: Add edit UI elements to the JSX return**

In the JSX, add the edit button after the subtitle paragraph in the top-left section:

```tsx
        {/* Edit mode toggle */}
        <button
          onClick={handleEditToggle}
          className={`mt-2 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            editMode
              ? "bg-green-600 border-green-600 text-white"
              : "bg-[#1e2030] border-[#2a2d3e] text-gray-400 hover:bg-[#2a2d3e] hover:text-white"
          }`}
        >
          {editMode ? "Exit Edit Mode" : "Edit"}
        </button>
        <SyncBadge editTimestamp={syncTimestamp} siteId={import.meta.env.PUBLIC_NETLIFY_SITE_ID ?? ""} />
```

Add the EditPanel and PasswordModal before the closing `</div>`:

```tsx
      {/* Edit panel */}
      {editMode && editNode && (
        <EditPanel
          node={editNode.node}
          x={editNode.x}
          y={editNode.y}
          onEditPerson={handleEditPerson}
          onAddChild={handleAddChild}
          onAddCouple={handleAddCouple}
          onClose={() => setEditNode(null)}
        />
      )}

      {/* Password modal */}
      {showPasswordModal && (
        <PasswordModal
          onSuccess={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
          error={passwordError}
        />
      )}
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 6: Run all tests**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm test
```

Expected: All tests pass (existing wheel-graph + wheel-layouts + new family-edits tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/FamilyWheel.tsx
git commit -m "feat: wire edit mode into FamilyWheel with optimistic updates and sync badge"
```

---

### Task 8: Add environment variable for Netlify site ID

The SyncBadge needs `PUBLIC_NETLIFY_SITE_ID` exposed to the client.

**Files:**
- Modify: `.env.example` (or create if it doesn't exist)

- [ ] **Step 1: Add env var documentation**

Create or update `.env.example`:

```bash
# Family edit mode
FAMILY_EDIT_PASSWORD=your-family-password-here
GITHUB_TOKEN=ghp_your-fine-grained-pat-here
PUBLIC_NETLIFY_SITE_ID=your-netlify-site-id-here
```

Note: Astro exposes env vars prefixed with `PUBLIC_` to the client. The `FAMILY_EDIT_PASSWORD` and `GITHUB_TOKEN` are server-only (used by the Netlify Function via `process.env`).

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add env var example for family edit mode"
```

---

### Task 9: Manual testing

Verify the complete flow works end-to-end.

**Files:** None (verification only)

- [ ] **Step 1: Set up env vars locally**

Create `.env` (if not present) with actual values for local testing:
- `FAMILY_EDIT_PASSWORD` — pick any password
- `GITHUB_TOKEN` — a GitHub PAT with Contents write on `Nesuarg/my_fam`
- `PUBLIC_NETLIFY_SITE_ID` — the Netlify site ID (find via `netlify sites:list` or the Netlify dashboard)

- [ ] **Step 2: Start dev server**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && netlify dev
```

Note: Use `netlify dev` instead of `pnpm dev` so Netlify Functions are available locally.

- [ ] **Step 3: Test password flow**

Open `http://localhost:8888/explore`:
- Click "Edit" button
- Enter wrong password → should show "Wrong password"
- Enter correct password → edit mode activates, button turns green
- Refresh page → edit mode should persist (password in localStorage)

- [ ] **Step 4: Test edit person**

In edit mode:
- Click a node → EditPanel appears
- Change a first name → click Save
- Node label should update immediately (optimistic)
- Check GitHub repo — a new commit should appear in `couples.json`

- [ ] **Step 5: Test add child**

In edit mode:
- Click a couple node → EditPanel → "+ Child"
- Fill in name, gender, birth date → Save
- New node should appear on the wheel immediately
- Check GitHub repo — commit with new person and child reference

- [ ] **Step 6: Test add partner**

In edit mode:
- Click an uncoupled/single node → EditPanel → "+ Partner"
- Fill in partner details → Save
- Node should change from outlined to filled (no longer single)
- Check GitHub repo — commit with new partner and couple entry

- [ ] **Step 7: Test sync badge**

After any edit:
- "Syncing..." badge should appear
- After Netlify rebuild completes (~30-60s), badge should show "Updated!" then disappear

- [ ] **Step 8: Test production build**

```bash
cd /Users/madsschmidt/Documents/fam/my_fam && pnpm build
```

Expected: Build succeeds.
