const issuer=required("MCP_AUTH_ISSUER").replace(/\/$/,"");
const audience=required("MCP_RESOURCE_AUDIENCE");
const discoveryUrl=process.env.MCP_OIDC_DISCOVERY_URL ?? `${issuer}/.well-known/openid-configuration`;

const response=await fetch(discoveryUrl,{headers:{accept:"application/json"}});
if(!response.ok) throw new Error(`OIDC discovery failed: HTTP ${response.status}`);
const metadata=await response.json();

for(const field of ["issuer","authorization_endpoint","token_endpoint","jwks_uri"]){
  if(typeof metadata[field]!=="string" || !metadata[field]){
    throw new Error(`OIDC discovery missing ${field}`);
  }
}
if(normalize(metadata.issuer)!==normalize(issuer)){
  throw new Error(`issuer mismatch: expected ${issuer}, got ${metadata.issuer}`);
}
const methods=Array.isArray(metadata.code_challenge_methods_supported)?metadata.code_challenge_methods_supported:[];
if(!methods.includes("S256")){
  throw new Error("authorization server does not advertise PKCE S256");
}
const scopes=Array.isArray(metadata.scopes_supported)?metadata.scopes_supported:[];
const offlineAccess=scopes.includes("offline_access");

const jwksResponse=await fetch(metadata.jwks_uri,{headers:{accept:"application/json"}});
if(!jwksResponse.ok) throw new Error(`JWKS fetch failed: HTTP ${jwksResponse.status}`);
const jwks=await jwksResponse.json();
if(!Array.isArray(jwks.keys) || jwks.keys.length===0) throw new Error("JWKS contains no signing keys");

const token=process.env.MCP_TEST_BEARER_TOKEN;
let tokenChecks=null;
if(token){
  const payload=decodeJwtPayload(token);
  const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
  tokenChecks={
    subject:typeof payload.sub==="string",
    issuer:normalize(String(payload.iss??""))===normalize(issuer),
    audience:aud.includes(audience),
    expires:typeof payload.exp==="number" && payload.exp*1000>Date.now()
  };
  for(const [name,ok] of Object.entries(tokenChecks)){
    if(!ok) throw new Error(`test access token failed ${name} check`);
  }
}

console.log(JSON.stringify({
  ok:true,
  issuer:metadata.issuer,
  authorizationEndpoint:metadata.authorization_endpoint,
  tokenEndpoint:metadata.token_endpoint,
  jwksUri:metadata.jwks_uri,
  pkceS256:true,
  offlineAccessAdvertised:offlineAccess,
  signingKeyCount:jwks.keys.length,
  tokenChecks
},null,2));

function required(name){
  const value=process.env[name];
  if(!value) throw new Error(`${name} is required`);
  return value;
}
function normalize(value){return value.replace(/\/$/,"");}
function decodeJwtPayload(token){
  const parts=token.split(".");
  if(parts.length!==3) throw new Error("MCP_TEST_BEARER_TOKEN is not a JWT");
  return JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
}
