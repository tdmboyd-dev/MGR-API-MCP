import type { AuthContext } from "./authz.js";
import { buildWwwAuthenticate } from "./oauth-metadata.js";

export interface VerifiedAccessToken {
  subject: string;
  tenantId: string;
  audience: string;
  scopes: string[];
  expiresAt: number;
}

export interface AccessTokenVerifier {
  verify(token: string): Promise<VerifiedAccessToken | null>;
}

export type McpAuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: 401 | 403; headers: Record<string, string>; error: string };

export async function authorizeMcpRequest(input: {
  authorizationHeader?: string;
  verifier: AccessTokenVerifier;
  resourceAudience: string;
  requiredScopes: string[];
  resourceMetadataUrl: string;
  now?: number;
}): Promise<McpAuthResult> {
  const token = bearerToken(input.authorizationHeader);
  if (!token) {
    return challenge(401, "missing bearer token", input.resourceMetadataUrl);
  }

  const verified = await input.verifier.verify(token);
  if (!verified) {
    return challenge(401, "invalid access token", input.resourceMetadataUrl, "invalid_token");
  }

  if (verified.audience !== input.resourceAudience) {
    return challenge(401, "token audience mismatch", input.resourceMetadataUrl, "invalid_token");
  }

  const now = input.now ?? Date.now();
  if (verified.expiresAt <= now) {
    return challenge(401, "access token expired", input.resourceMetadataUrl, "invalid_token");
  }

  const scopeSet = new Set(verified.scopes);
  const missing = input.requiredScopes.filter((scope) => !scopeSet.has(scope));
  if (missing.length) {
    return {
      ok: false,
      status: 403,
      error: `missing scopes: ${missing.join(", ")}`,
      headers: {
        "WWW-Authenticate": buildWwwAuthenticate({
          resourceMetadataUrl: input.resourceMetadataUrl,
          error: "insufficient_scope",
          scope: missing,
        }),
      },
    };
  }

  return {
    ok: true,
    auth: {
      actorId: verified.subject,
      tenantId: verified.tenantId,
      audience: verified.audience,
      scopes: verified.scopes,
      expiresAt: verified.expiresAt,
    },
  };
}

function bearerToken(header?: string): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function challenge(
  status: 401,
  error: string,
  resourceMetadataUrl: string,
  protocolError: "invalid_token" | "insufficient_scope" = "invalid_token",
): McpAuthResult {
  return {
    ok: false,
    status,
    error,
    headers: {
      "WWW-Authenticate": buildWwwAuthenticate({
        resourceMetadataUrl,
        error: protocolError,
      }),
    },
  };
}
