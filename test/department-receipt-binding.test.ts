/** Independent adversarial provider fixtures, not real provider evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {DepartmentGateway,registerDepartmentTools,canonicalDepartmentJson,type DepartmentCommand} from "../src/department-gateway.js";
import {LegacyEdgeClient} from "../src/legacy-client.js";

const sha=(x:string|Uint8Array)=>createHash("sha256").update(x).digest("hex");
const endpoint={baseUrl:"http://127.0.0.1:1234/",token:"independent-fixture-service-token-long"};
const config={actorId:"actor",tenantId:"tenant",legacy:new LegacyEdgeClient({baseUrl:endpoint.baseUrl}),creation:endpoint,voice:endpoint,signme:endpoint};
const creation:DepartmentCommand={operation:"creation.document.render",requestId:"request-1",input:{workspaceId:"workspace",title:"Approved title",sections:[{heading:"Approved heading",body:"Approved exact body"}],rightsRefs:["owner-authored"]}};
const signme:DepartmentCommand={operation:"signme.draft.create",requestId:"request-1",input:{workspaceId:"workspace",title:"Approved title",content:"Approved exact text"}};
const voice:DepartmentCommand={operation:"voice.speech",requestId:"request-1",input:{sessionId:"session-1",turnId:"turn-1",text:"Approved exact text",profileId:"af_heart",exactText:true}};

test("self-consistent Creation artifact cannot prove a receipt for different inputs",async()=>{
 const wrongBytes=Buffer.from("# A different user's document\n");
 const result={requestId:"request-1",status:"SUCCEEDED",inputDigest:"f".repeat(64),artifacts:[{id:"artifact-1",sha256:sha(wrongBytes),bytes:wrongBytes.length}]};
 const gateway=new DepartmentGateway({...config,fetcher:async input=>String(input).includes("/artifacts/")?new Response(wrongBytes):Response.json(result)});
 for(const method of ["execute","status","artifact"] as const){
  await assert.rejects(gateway[method](creation),/mismatch|digest|binding|receipt/i,method+" must bind exact original Creation inputs");
 }
});

test("self-consistent SignMe draft hash cannot prove a different draft or request",async()=>{
 const wrong="Different approved draft";
 const operation={requestId:"different-request",documentId:"document-1",version:1,status:"draft",inputDigest:"f".repeat(64),sha256:sha(wrong),bytes:Buffer.byteLength(wrong)};
 const document={documentId:"document-1",version:1,workspaceId:"different-workspace",tenantId:"tenant",status:"draft",title:"Different title",content:wrong,sha256:sha(wrong),bytes:Buffer.byteLength(wrong)};
 const gateway=new DepartmentGateway({...config,fetcher:async input=>Response.json(String(input).includes("/versions/")?document:operation)});
 await assert.rejects(gateway.execute(signme),/mismatch|digest|binding|receipt/i);
 await assert.rejects(gateway.status(signme),/mismatch|digest|binding|receipt/i);
});

test("VOICE exact-text status and artifact reject self-consistent audio for a different session/text",async()=>{
 const bytes=Buffer.alloc(44);bytes.write("RIFF");bytes.write("WAVE",8);
 const result={requestId:"request-1",sessionId:"different-session",turnId:"different-turn",profileId:"af_heart",exactText:true,status:"succeeded",inputSha256:"f".repeat(64),textSha256:sha("Wrong text"),audio:{sha256:sha(bytes),bytes:bytes.length,mediaType:"audio/wav"}};
 const gateway=new DepartmentGateway({...config,fetcher:async input=>String(input).includes("/audio?")?new Response(bytes,{headers:{"content-type":"audio/wav"}}):Response.json(result)});
 for(const method of ["execute","status","artifact","cancel"] as const){
  await assert.rejects(gateway[method](voice),/mismatch|digest|binding|receipt/i,method+" must bind speech request, session, turn and exact text");
 }
});

test("expired authorization after dispatch cannot publish a department result",async()=>{
 const audience="https://independent.fixture.invalid/mcp";
 const auth={actorId:"actor",tenantId:"tenant",audience,expiresAt:Date.now()+60000,scopes:["departments:execute","departments:read"]};
 const gateway=new DepartmentGateway(config);
 // Deterministic clock-boundary fixture: authentication was valid before the await.
 gateway.execute=async()=>{auth.expiresAt=0;return {requestId:"request-1",status:"SUCCEEDED",readbackVerified:true};};
 const handlers=new Map<string,(input:any)=>Promise<any>>();
 registerDepartmentTools({registerTool(name:string,_schema:unknown,handler:(input:any)=>Promise<any>){handlers.set(name,handler);}} as any,{auth,resourceAudience:audience,gateway});
 const response=await handlers.get("mgr_department_execute")!(creation);
 assert.equal(response.isError,true,"expiry during work must be checked before returning its result");
 assert.match(response.content[0].text,/expired/i);
});

test("SignMe updates bind the actual target and next immutable version",async()=>{
 const command={operation:"signme.draft.create" as const,requestId:"request-1",input:{workspaceId:"workspace",documentId:"original-document",expectedVersion:2,title:"Approved title",content:"Approved exact text"}};
 const inputDigest=sha(canonicalDepartmentJson({actorId:"actor",tenantId:"tenant",requestId:command.requestId,...command.input}));
 let target="different-document",version=3;
 const gateway=new DepartmentGateway({...config,fetcher:async input=>Response.json(String(input).includes("/versions/")?{documentId:target,version,tenantId:"tenant",workspaceId:"workspace",title:command.input.title,content:command.input.content}:{requestId:command.requestId,documentId:target,version,status:"draft",inputDigest,receiptId:"receipt-1",sha256:sha(command.input.content),bytes:Buffer.byteLength(command.input.content)})});
 await assert.rejects(gateway.execute(command),/mismatch|digest|binding|receipt/i,"a valid digest cannot substitute a different document target");
 target=command.input.documentId;version=4;
 await assert.rejects(gateway.execute(command),/mismatch|digest|binding|receipt/i,"a version update must advance exactly one immutable version");
 version=3;
 assert.equal((await gateway.execute(command)).readbackVerified,true);
});
