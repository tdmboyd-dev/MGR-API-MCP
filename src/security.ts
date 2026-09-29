import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
  return `{${entries.join(",")}}`;
}

export function actionDigest(action: unknown): string {
  return createHash("sha256").update(canonicalJson(action)).digest("hex");
}

export function approvalMatches(action: unknown, approvedDigest: string): boolean {
  return actionDigest(action) === approvedDigest;
}
