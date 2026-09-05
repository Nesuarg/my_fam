import type { FamilyData } from "@/types/simple-family";

const STORAGE_KEY = "family-edit-password";

export function getStoredPassword(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function storePassword(password: string): void {
  sessionStorage.setItem(STORAGE_KEY, password);
}

export function clearPassword(): void {
  sessionStorage.removeItem(STORAGE_KEY);
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
  const res = await fetch("/.netlify/functions/edit-family", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Family-Password": password,
    },
    body: JSON.stringify({ action: "editPerson", personId: "__ping__", fields: {} }),
  });
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

export async function deleteNode(password: string, nodeId: string): Promise<ApiResponse> {
  return callApi(password, { action: "deleteNode", nodeId });
}

export interface AssistantProposal {
  type: "proposal";
  coupleId: string;
  child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string };
  summary: string;
}

export type AssistantReply = { type: "question"; question: string } | AssistantProposal;

export async function askAssistant(
  password: string,
  turns: { role: "user" | "assistant"; content: string }[],
): Promise<{ ok: true; reply: AssistantReply } | { ok: false; message: string }> {
  const res = await fetch("/.netlify/functions/family-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Family-Password": password },
    body: JSON.stringify({ turns }),
  });
  if (!res.ok && res.status !== 400 && res.status !== 501) {
    return { ok: false, message: `Assistenten svarede ${res.status}` };
  }
  const body = await res.json();
  return body.ok ? { ok: true, reply: body.reply } : { ok: false, message: body.message ?? "Ukendt fejl" };
}
