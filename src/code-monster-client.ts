/**
 * The single MGR API/MCP -> Code Monster service-to-service connection.
 * OAuth remains at MGR API. Only this edge may sign the short-lived internal
 * message; the model, MCP caller and tool parameters never receive the key.
 * Contract: MGR-CODE-MONSTER/src/rare-bridge.mjs (mgr-code-monster-v1).
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { AuthContext } from "./authz.js";

export type CodeMonsterMethod =
  | "capabilities" | "portfolio.plan" | "code.graph.search" | "repair.stage";
export type CodeMonsterApproval = {
  state: "approved";
  actionDigest: string;
  expiresAt: number;
};

export interface CodeMonsterClientOptions {
  baseUrl: string;
  secret: Buffer;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => number;
}

const MAX_BODY = 65_536;
const MAX_RESPONSE = 131_072;
const AUDIENCE = "mgr-code-monster";
const METHOD_SCOPES: Record<CodeMonsterMethod, "tools:read" | "tools:execute"> = {
  capabilities: "tools:read",
  "portfolio.plan": "tools:read",
  "code.graph.search": "tools:read",
  "repair.stage": "tools:execute",
};

/** Same strict sorted-key JSON algorithm as Code Monster durable-ledger.canonicalV1. */
export function codeMonsterCanonicalV1(value: unknown): string {
  const path = new Set<object>();
  const validUnicode = (s: string) =>
    !/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(s);
  const encode = (v: unknown, depth = 0): string => {
    if (depth > 64) throw new RangeError("canonical JSON depth limit exceeded");
    if (v === null) return "null";
    if (typeof v === "string") {
      if (v !== v.normalize("NFC") || !validUnicode(v)) throw new TypeError("non-NFC or invalid Unicode string");
      return JSON.stringify(v);
    }
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") {
      if (!Number.isFinite(v) || Object.is(v, -0)) throw new TypeError("invalid JSON number");
      return JSON.stringify(v);
    }
    if (typeof v !== "object") throw new TypeError("unsupported JSON value");
    if (path.has(v)) throw new TypeError("cyclic JSON value");
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
      throw new TypeError("non-plain object");
    path.add(v);
    try {
      if (Array.isArray(v)) {
        if (Object.keys(v).length !== v.length) throw new TypeError("sparse or extended array");
        return `[${v.map(item => encode(item, depth + 1)).join(",")}]`;
      }
      const keys = Object.keys(v).sort();
      for (const key of keys) if (key !== key.normalize("NFC") || !validUnicode(key)) throw new TypeError("invalid JSON key");
      return `{${keys.map(key => `${JSON.stringify(key)}:${encode((v as Record<string, unknown>)[key], depth + 1)}`).join(",")}}`;
    } finally { path.delete(v); }
  };
  return encode(value);
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

export function codeMonsterActionDigest(input: {
  method: CodeMonsterMethod;
  actorId: string;
  tenantId: string;
  args: Record<string, unknown>;
}): string {
  return sha256(codeMonsterCanonicalV1({ version: 1, ...input }));
}

export class CodeMonsterTransportError extends Error {
  constructor(public readonly state: "SOURCE_UNAVAILABLE" | "UNKNOWN_EXTERNAL_STATE", public readonly status: number, message: string) {
    super(message);
    this.name = "CodeMonsterTransportError";
  }
}

/** The constructor only accepts configured URLs, never a caller-supplied URL. */
export class CodeMonsterBridgeClient {
  private readonly endpoint: URL;
  private readonly key: Buffer;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(options: CodeMonsterClientOptions) {
    const base = new URL(options.baseUrl);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((base.protocol !== "https:" && !(base.protocol === "http:" && loopback)) ||
        base.username || base.password || base.search || base.hash || base.pathname !== "/") {
      throw new Error("Code Monster service requires a configured HTTPS origin (or local loopback)");
    }
    if (!Buffer.isBuffer(options.secret) || options.secret.length < 32) throw new Error("Code Monster bridge key must be at least 32 bytes");
    const timeout = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(timeout) || timeout < 100 || timeout > 30_000) throw new Error("invalid Code Monster bridge timeout");
    this.endpoint = new URL("/v1/mgr-code-monster/invoke", base);
    this.key = Buffer.from(options.secret);
    this.timeoutMs = timeout;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async invoke(input: {
    auth: AuthContext;
    method: CodeMonsterMethod;
    args?: Record<string, unknown>;
    approval?: CodeMonsterApproval;
  }): Promise<Record<string, unknown>> {
    const { auth, method } = input;
    const now = this.now();
    if (!auth.actorId || !auth.tenantId || auth.expiresAt <= now || !auth.scopes.includes(METHOD_SCOPES[method]))
      throw new Error("unauthorized actor, tenant, expiry or tool scope");
    const args = input.args ?? {};
    if (method === "repair.stage") {
      const digest = codeMonsterActionDigest({ method, actorId: auth.actorId, tenantId: auth.tenantId, args });
      if (input.approval?.state !== "approved" || input.approval.actionDigest !== digest || input.approval.expiresAt <= now)
        throw new Error("trusted exact-action approval required for repair.stage");
    } else if (input.approval) {
      throw new Error("read methods cannot carry an action approval");
    }

    const principal = { actorId: auth.actorId, tenantId: auth.tenantId, audience: AUDIENCE,
      scopes: auth.scopes, expiresAt: auth.expiresAt };
    const message = { version: 1, method, principal, args, ...(input.approval ? { approval: input.approval } : {}) };
    // Verify ambiguous data is rejected before anything is signed or sent.
    codeMonsterCanonicalV1(message);
    const body = Buffer.from(JSON.stringify(message), "utf8");
    if (body.length > MAX_BODY) throw new Error("Code Monster request exceeds signed payload limit");
    const timestamp = this.now();
    const nonce = randomBytes(20).toString("hex");
    const signature = createHmac("sha256", this.key)
      .update(`mgr-code-monster-v1\n${timestamp}\n${nonce}\n${sha256(body)}`).digest("hex");
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(this.timeoutMs),
        headers: { "content-type": "application/json", "x-mgr-date": String(timestamp),
          "x-mgr-nonce": nonce, "x-mgr-signature": signature }, body,
      });
    } catch {
      throw new CodeMonsterTransportError(method === "repair.stage" ? "UNKNOWN_EXTERNAL_STATE" : "SOURCE_UNAVAILABLE", 0,
        "Code Monster response unavailable; never blindly retry a possible code write");
    }
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE) throw new CodeMonsterTransportError("SOURCE_UNAVAILABLE", response.status, "oversized downstream response");
    const chunks: Buffer[] = [];
    let size = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_RESPONSE) throw new CodeMonsterTransportError("SOURCE_UNAVAILABLE", response.status, "oversized downstream response");
        chunks.push(bytes);
      }
    }
    let data: unknown;
    try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new CodeMonsterTransportError("SOURCE_UNAVAILABLE", response.status, "invalid downstream response"); }
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new CodeMonsterTransportError("SOURCE_UNAVAILABLE", response.status, "invalid downstream message");
    if (!response.ok) {
      const error = (data as Record<string, unknown>).error;
      throw new CodeMonsterTransportError("SOURCE_UNAVAILABLE", response.status,
        typeof error === "string" ? error.slice(0, 150) : "Code Monster request denied");
    }
    return data as Record<string, unknown>;
  }
}
