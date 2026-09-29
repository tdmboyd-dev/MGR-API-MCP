export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: Array<"header">;
  resource_documentation?: string;
}

export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
}

export function buildProtectedResourceMetadata(input: {
  resource: string;
  authorizationServers: string[];
  scopes: string[];
  documentation?: string;
}): ProtectedResourceMetadata {
  if (!input.resource.startsWith("https://")) {
    throw new Error("protected MCP resource must use https");
  }
  if (!input.authorizationServers.length) {
    throw new Error("at least one authorization server is required");
  }

  return {
    resource: input.resource,
    authorization_servers: input.authorizationServers,
    scopes_supported: [...new Set(input.scopes)].sort(),
    bearer_methods_supported: ["header"],
    ...(input.documentation ? { resource_documentation: input.documentation } : {}),
  };
}

export function buildWwwAuthenticate(input: {
  resourceMetadataUrl: string;
  scope?: string[];
  error?: "invalid_token" | "insufficient_scope";
}): string {
  if (!input.resourceMetadataUrl.startsWith("https://")) {
    throw new Error("resource metadata URL must use https");
  }
  const parts = [`resource_metadata="${input.resourceMetadataUrl}"`];
  if (input.error) parts.push(`error="${input.error}"`);
  if (input.scope?.length) parts.push(`scope="${input.scope.join(" ")}"`);
  return `Bearer ${parts.join(", ")}`;
}
