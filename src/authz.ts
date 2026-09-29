export interface AuthContext {
  actorId: string;
  tenantId: string;
  audience: string;
  scopes: string[];
  expiresAt: number;
}

export interface ProtectedResource {
  audience: string;
  requiredScopes: string[];
}

export function assertAuthorized(
  auth: AuthContext,
  resource: ProtectedResource,
  now = Date.now(),
): void {
  if (auth.expiresAt <= now) throw new Error("authorization expired");
  if (auth.audience !== resource.audience) throw new Error("token audience does not match protected resource");
  const granted = new Set(auth.scopes);
  const missing = resource.requiredScopes.filter((scope) => !granted.has(scope));
  if (missing.length) throw new Error(`missing required scopes: ${missing.join(", ")}`);
}

export function authorizeTool(
  auth: AuthContext,
  toolAudience: string,
  toolScopes: string[],
  now = Date.now(),
): void {
  assertAuthorized(auth, { audience: toolAudience, requiredScopes: toolScopes }, now);
}
