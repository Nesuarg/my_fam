// Self-contained Netlify Function — no cross-tree imports.
// Edit logic is duplicated from src/lib/family-edits.ts to avoid bundling issues.

interface SimplePerson {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  age: number;
  gender: "male" | "female" | "other";
  dob: string;
  notes?: string;
}

interface SimpleChild {
  personId: string;
  birthOrder: number;
  ownFamilyId?: string;
}

interface SimpleCouple {
  id: string;
  person1Id: string;
  person2Id: string | null;
  relationshipType: "married" | "partnership" | "common-law" | "single";
  children?: SimpleChild[];
}

interface FamilyData {
  people: SimplePerson[];
  couples: SimpleCouple[];
}

// --- Edit logic (mirrored from src/lib/family-edits.ts) ---

function generatePersonId(firstName: string, data: FamilyData): string {
  if (!firstName.trim()) throw new Error("First name is required");
  const base = firstName.trim().toLowerCase().replace(/\s+/g, "-");
  const existingIds = new Set(data.people.map((p) => p.id));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function parseDob(dob: string): number {
  const match = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new Error(`Invalid date format "${dob}" — expected M/D/YYYY`);
  const year = parseInt(match[3], 10);
  if (year < 1800 || year > new Date().getFullYear() + 1) {
    throw new Error(`Birth year ${year} is out of range`);
  }
  return year;
}

function computeAge(dob: string): number {
  return new Date().getFullYear() - parseDob(dob);
}

interface NewPersonInput {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dob: string;
}

function validateNewPerson(input: NewPersonInput): void {
  if (!input.firstName.trim()) throw new Error("First name is required");
  if (!input.lastName.trim()) throw new Error("Last name is required");
  parseDob(input.dob);
}

function applyAddChild(data: FamilyData, coupleId: string, child: NewPersonInput): FamilyData {
  validateNewPerson(child);
  const result: FamilyData = JSON.parse(JSON.stringify(data));
  const couple = result.couples.find((c) => c.id === coupleId);
  if (!couple) throw new Error(`Couple ${coupleId} not found`);

  const personId = generatePersonId(child.firstName, result);
  result.people.push({
    id: personId,
    firstName: child.firstName,
    lastName: child.lastName,
    age: computeAge(child.dob),
    gender: child.gender,
    dob: child.dob,
  });

  if (!couple.children) couple.children = [];
  const maxOrder = couple.children.reduce((max, ch) => Math.max(max, ch.birthOrder), 0);
  couple.children.push({ personId, birthOrder: maxOrder + 1 });

  return result;
}

function applyAddCouple(
  data: FamilyData,
  personId: string,
  partner: NewPersonInput,
  relationshipType: "married" | "partnership" | "common-law",
): FamilyData {
  validateNewPerson(partner);
  const result: FamilyData = JSON.parse(JSON.stringify(data));
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  const existingCouple = result.couples.find(
    (c) => c.person1Id === personId || c.person2Id === personId,
  );
  if (existingCouple) throw new Error(`Person ${personId} already has a partner`);

  const partnerId = generatePersonId(partner.firstName, result);
  result.people.push({
    id: partnerId,
    firstName: partner.firstName,
    lastName: partner.lastName,
    age: computeAge(partner.dob),
    gender: partner.gender,
    dob: partner.dob,
  });

  const coupleId = `${personId}-${partnerId}`;
  result.couples.push({
    id: coupleId,
    person1Id: personId,
    person2Id: partnerId,
    relationshipType,
  });

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

function applyEditPerson(
  data: FamilyData,
  personId: string,
  fields: Partial<Pick<SimplePerson, "firstName" | "lastName" | "dob" | "gender">>,
): FamilyData {
  const result: FamilyData = JSON.parse(JSON.stringify(data));
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  if (fields.firstName !== undefined) {
    if (!fields.firstName.trim()) throw new Error("First name cannot be empty");
    person.firstName = fields.firstName;
  }
  if (fields.lastName !== undefined) {
    if (!fields.lastName.trim()) throw new Error("Last name cannot be empty");
    person.lastName = fields.lastName;
  }
  if (fields.dob !== undefined) {
    parseDob(fields.dob);
    person.dob = fields.dob;
    person.age = computeAge(fields.dob);
  }
  if (fields.gender !== undefined) person.gender = fields.gender;

  return result;
}

/** Suffix wheel-graph gives a child who has no couple of their own. */
const UNCOUPLED_SUFFIX = "-uncoupled";

/** Drops the child entry for a person from whichever couple lists them. */
function detachChild(data: FamilyData, personId: string): void {
  for (const couple of data.couples) {
    if (!couple.children) continue;
    const index = couple.children.findIndex((child) => child.personId === personId);
    if (index !== -1) {
      couple.children.splice(index, 1);
      return;
    }
  }
}

function applyDeleteNode(data: FamilyData, nodeId: string): FamilyData {
  const result: FamilyData = JSON.parse(JSON.stringify(data));

  if (nodeId.endsWith(UNCOUPLED_SUFFIX)) {
    const personId = nodeId.slice(0, -UNCOUPLED_SUFFIX.length);
    if (!result.people.some((p) => p.id === personId)) {
      throw new Error(`Person ${personId} not found`);
    }
    detachChild(result, personId);
    result.people = result.people.filter((p) => p.id !== personId);
    return result;
  }

  const target = result.couples.find((c) => c.id === nodeId);
  if (!target) throw new Error(`Couple ${nodeId} not found`);

  const isReferencedAsChild = result.couples.some((c) =>
    (c.children ?? []).some((child) => child.ownFamilyId === nodeId),
  );
  if (!isReferencedAsChild) throw new Error("Stamparret kan ikke slettes");

  const doomedCouples = new Set<string>();
  const doomedPeople = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (doomedCouples.has(currentId)) continue;
    doomedCouples.add(currentId);

    const couple = result.couples.find((c) => c.id === currentId);
    if (!couple) continue;

    doomedPeople.add(couple.person1Id);
    if (couple.person2Id) doomedPeople.add(couple.person2Id);

    for (const child of couple.children ?? []) {
      doomedPeople.add(child.personId);
      if (child.ownFamilyId) queue.push(child.ownFamilyId);
    }
  }

  detachChild(result, target.person1Id);
  result.couples = result.couples.filter((c) => !doomedCouples.has(c.id));
  result.people = result.people.filter((p) => !doomedPeople.has(p.id));

  return result;
}

// --- Local backend (netlify dev) ---
//
// Under `netlify dev` there is no reason to touch the real repository: edits
// land in the working copy and become a local commit, which the family can
// review and push when they are happy. This also means local editing needs no
// GitHub token, so a mistake cannot reach production.

const LOCAL_FILE = "content/couples.json";

function isLocal(): boolean {
  return process.env.NETLIFY_DEV === "true" || process.env.FAMILY_EDIT_LOCAL === "1";
}

function projectRoot(): string {
  return process.env.FAMILY_EDIT_ROOT ?? process.cwd();
}

async function readLocalFile(): Promise<FamilyData> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return JSON.parse(await readFile(join(projectRoot(), LOCAL_FILE), "utf-8"));
}

async function commitLocalFile(data: FamilyData, message: string): Promise<string> {
  const { writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);

  const root = projectRoot();
  await writeFile(join(root, LOCAL_FILE), JSON.stringify(data, null, "\t") + "\n", "utf-8");

  // execFile with an argument array — never a shell — because the message
  // carries names typed by whoever is at the keyboard.
  await run("git", ["add", "--", LOCAL_FILE], { cwd: root });

  // Saving a field without changing it is not an error, it is just a no-op.
  const staged = await run("git", ["diff", "--cached", "--name-only", "--", LOCAL_FILE], { cwd: root });
  if (staged.stdout.trim() !== "") {
    await run("git", ["commit", "-m", message, "--", LOCAL_FILE], { cwd: root });
  }

  const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: root });
  return stdout.trim();
}

// --- GitHub API ---

const REPO = "Nesuarg/my_fam";
const FILE_PATH = "content/couples.json";
const BRANCH = "master";

async function fetchFileFromGitHub(token: string): Promise<{ data: FamilyData; sha: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status} ${await res.text()}`);

  const file = await res.json();
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
    body: JSON.stringify({ message, content, sha, branch: BRANCH }),
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

// --- Request handler ---

function applyEdit(data: FamilyData, body: Record<string, unknown>): { data: FamilyData; message: string } {
  const action = body.action as string;

  switch (action) {
    case "addChild": {
      const coupleId = body.coupleId as string;
      const child = body.child as NewPersonInput;
      return {
        data: applyAddChild(data, coupleId, child),
        message: `Add child ${child.firstName} ${child.lastName} to ${coupleId}`,
      };
    }
    case "addCouple": {
      const personId = body.personId as string;
      const partner = body.partner as NewPersonInput;
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
    case "deleteNode": {
      const nodeId = body.nodeId as string;
      const updated = applyDeleteNode(data, nodeId);
      const removed = data.people.length - updated.people.length;
      return {
        data: updated,
        message: `Delete ${nodeId} and ${removed} ${removed === 1 ? "person" : "people"}`,
      };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Family-Password" },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const password = req.headers.get("X-Family-Password");
  const expectedPassword = process.env.FAMILY_EDIT_PASSWORD;
  if (!expectedPassword || password !== expectedPassword) {
    return Response.json({ ok: false, error: "unauthorized", message: "Invalid password" }, { status: 401 });
  }

  const body = await req.json();

  if (isLocal()) {
    try {
      const currentData = await readLocalFile();
      const { data: updatedData, message } = applyEdit(currentData, body);
      const commitSha = await commitLocalFile(updatedData, message);
      return Response.json({ ok: true, data: updatedData, commitSha, local: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return Response.json({ ok: false, error: "error", message }, { status: 400 });
    }
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return Response.json({ ok: false, error: "config", message: "GitHub token not configured" }, { status: 500 });
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: currentData, sha } = await fetchFileFromGitHub(githubToken);
      const { data: updatedData, message } = applyEdit(currentData, body);
      const commitSha = await commitFileToGitHub(githubToken, updatedData, sha, message);
      return Response.json({ ok: true, data: updatedData, commitSha });
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT" && attempt === 0) {
        continue;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      const status = message === "CONFLICT" ? 409 : 400;
      return Response.json({ ok: false, error: message === "CONFLICT" ? "conflict" : "error", message }, { status });
    }
  }

  return Response.json({ ok: false, error: "conflict", message: "Conflict after retry. Please refresh and try again." }, { status: 409 });
}

export const config = {
  path: "/.netlify/functions/edit-family",
};
