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
