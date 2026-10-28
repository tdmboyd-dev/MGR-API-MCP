import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {DepartmentGateway,departmentCommand,canonicalDepartmentJson} from "../src/department-gateway.js";
import {LegacyEdgeClient} from "../src/legacy-client.js";
import {createAuthorizedMgrMcpHttpHandler} from "../src/mcp-http.js";
const audience="https://edge.fixture.invalid/mcp";
const endpoint={baseUrl:"http://127.0.0.1:1234/",token:"fixture-only-service-token-00000000"};
const legacy=new LegacyEdgeClient({baseUrl:endpoint.baseUrl});
const config={actorId:"actor",tenantId:"tenant",legacy,creation:endpoint,voice:endpoint,signme:endpoint};
const auth={actorId:"actor",tenantId:"tenant",audience,expiresAt:Date.now()+60000,scopes:["tools:read","departments:execute","departments:read"]};
const command={operation:"creation.document.render" as const,requestId:"request-1",input:{workspaceId:"workspace",title:"Actual text",sections:[{heading:"Heading",body:"Body"}],rightsRefs:["owner-authored"]}};
const expectedCreationDigest=createHash("sha256").update(canonicalDepartmentJson({requestId:command.requestId,tenantId:"tenant",workspaceId:"workspace",capability:"document.markdown",input:{actorId:"actor",correlationId:command.requestId,payload:{title:command.input.title,sections:command.input.sections,rightsRefs:command.input.rightsRefs}},acceptanceCriteria:["nonempty durable Markdown artifact with matching SHA256"],maxCost:0})).digest("hex");
test("department edge binds identity/scopes and rejects unsafe endpoint configuration",()=>{
 const gateway=new DepartmentGateway(config);gateway.authorize(auth,audience,true);
 assert.throws(()=>gateway.authorize({...auth,tenantId:"other"},audience,true),/principal mismatch/);
 assert.throws(()=>gateway.authorize({...auth,scopes:[]},audience,true),/missing required scopes/);
 assert.throws(()=>gateway.authorize({...auth,expiresAt:0},audience,true),/expired/);
 for(const baseUrl of ["http://remote.example/","https://user:secret@example.com/","https://example.com/path","https://example.com/?token=secret"]){assert.throws(()=>new DepartmentGateway({...config,voice:{...endpoint,baseUrl}}));}
 assert.equal(departmentCommand.safeParse({...command,tenantId:"spoof"}).success,false);
 assert.equal(departmentCommand.safeParse({operation:"signme.sign",requestId:"r",input:{}}).success,false);
 assert.equal(departmentCommand.safeParse({...command,input:{...command.input,maxCost:100}}).success,false);
});
test("creation acceptance independently downloads and hashes actual artifact bytes",async()=>{
 const bytes=Buffer.from("# Actual text\n");let calls=0;let wrong=false;
 const gateway=new DepartmentGateway({...config,fetcher:async(input,init)=>{
  calls++;assert.equal(new Headers(init?.headers).get("x-actor-id"),"actor");assert.equal(init?.redirect,"error");
  if(String(input).includes("/artifacts/"))return new Response(bytes,{headers:{"content-type":"text/markdown"}});
  return Response.json({requestId:"request-1",inputDigest:expectedCreationDigest,status:"SUCCEEDED",artifacts:[{id:"artifact-1",sha256:wrong?"0".repeat(64):createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length}]});
 }});
 assert.equal((await gateway.execute(command)).readbackVerified,true);assert.equal(calls,2);
 wrong=true;await assert.rejects(gateway.execute(command),/readback mismatch/);
});
test("artifact rejects oversized stream before trusting provider metadata",async()=>{
 const gateway=new DepartmentGateway({...config,fetcher:async()=>new Response(new Uint8Array(1024*1024+1))});
 await assert.rejects(gateway.status(command),/exceeds limit/);
});
test("official MCP client discovers and calls bounded department schemas; invalid identities never dispatch",async()=>{
 let calls=0;const bytes=Buffer.from("# Actual text\n");
 const gateway=new DepartmentGateway({...config,fetcher:async(input)=>{calls++;return String(input).includes("artifacts")?new Response(bytes):Response.json({requestId:"request-1",inputDigest:expectedCreationDigest,status:"SUCCEEDED",artifacts:[{id:"a",bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")}]});}});
 const handler=createAuthorizedMgrMcpHttpHandler({resourceAudience:audience,resourceMetadataUrl:audience,requiredScopes:["tools:read"],legacy,departments:gateway,verifier:{async verify(token){return token==="fixture"?{subject:auth.actorId,tenantId:auth.tenantId,audience,scopes:auth.scopes,expiresAt:auth.expiresAt}:null;}}});
 const client=new Client({name:"department-contract",version:"1"});
 try{
 await client.connect(new StreamableHTTPClientTransport(new URL(audience),{authProvider:{token:async()=>"fixture"},fetch:async(input,init)=>handler.fetch(new Request(input,init))}));
 assert.ok((await client.listTools()).tools.some(t=>t.name==="mgr_department_execute"));
 const result=await client.callTool({name:"mgr_department_execute",arguments:command});assert.notEqual(result.isError,true);assert.equal(calls,2);
 const denied=await client.callTool({name:"mgr_department_execute",arguments:{...command,actorId:"spoof"}});assert.equal(denied.isError,true);assert.equal(calls,2);
 }finally{await client.close();await handler.close();}
});
