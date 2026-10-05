const base=required("MCP_TEST_BASE_URL").replace(/\/$/,"");
const token=process.env.MCP_TEST_BEARER_TOKEN;

const health=await fetch(`${base}/healthz`);
assert(health.ok,`health failed: ${health.status}`);
const healthBody=await health.json();
assert(healthBody?.ok===true,"health payload did not report ok");

const metadata=await fetch(`${base}/.well-known/oauth-protected-resource`);
assert(metadata.ok,`metadata failed: ${metadata.status}`);
const meta=await metadata.json();
assert(typeof meta.resource==="string" && meta.resource.endsWith("/mcp"),"metadata resource is not /mcp");
assert(Array.isArray(meta.authorization_servers) && meta.authorization_servers.length>0,"authorization server metadata missing");

const denied=await fetch(`${base}/mcp`,{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({
    jsonrpc:"2.0",
    id:1,
    method:"initialize",
    params:{
      protocolVersion:"2025-11-25",
      capabilities:{},
      clientInfo:{name:"mgr-boundary-probe",version:"1.0.0"}
    }
  })
});
assert(denied.status===401,`unauthenticated /mcp must return 401, got ${denied.status}`);
assert((denied.headers.get("www-authenticate")??"").includes("resource_metadata="),"401 is missing protected-resource challenge");

if(token){
  const authorized=await fetch(`${base}/mcp`,{
    method:"POST",
    headers:{
      authorization:`Bearer ${token}`,
      "content-type":"application/json",
      accept:"application/json, text/event-stream"
    },
    body:JSON.stringify({
      jsonrpc:"2.0",
      id:2,
      method:"initialize",
      params:{
        protocolVersion:"2025-11-25",
        capabilities:{},
        clientInfo:{name:"mgr-boundary-probe",version:"1.0.0"}
      }
    })
  });
  assert(authorized.ok,`authorized MCP initialize failed: ${authorized.status} ${await authorized.text()}`);
}

console.log(JSON.stringify({
  ok:true,
  health:"pass",
  protectedResourceMetadata:"pass",
  unauthenticatedChallenge:"pass",
  authenticatedInitialize:token?"pass":"skipped-no-token"
}));

function required(name){
  const value=process.env[name];
  if(!value) throw new Error(`${name} is required`);
  return value;
}
function assert(condition,message){
  if(!condition) throw new Error(message);
}
