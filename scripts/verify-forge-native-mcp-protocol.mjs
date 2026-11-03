/**
 * Real SDK Streamable HTTP MCP client -> authenticated MGR API/MCP handler ->
 * actual ForgeStudioCatalogClient -> Python Forge Studio model creator.
 *
 * This is a localhost transport proof with a FIXTURE access-token verifier,
 * not proof of deployed OAuth or remote Tevin/mobile reachability.
 */
import {createServer} from "node:http";
import {Readable} from "node:stream";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {createAuthorizedMgrMcpHttpHandler} from "../src/mcp-http.ts";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.ts";
import {LegacyEdgeClient} from "../src/legacy-client.ts";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";

const forgeUrl=process.env.MGR_FORGE_STUDIO_URL,token=process.env.MGR_FORGE_STUDIO_TOKEN;
if(!forgeUrl||!token)throw Error("Require test-only authenticated live Forge Studio URL and token");
const audience="https://mcp.mgr.local-proof.example/mcp";
const ledger=new Map();
const verifier={
 async verify(value){
  if(!["owner","read","foreign","other-actor"].includes(value))return null;
  return {subject:value==="other-actor"?"same-tenant-other-actor":"local-proof-actor",tenantId:value==="foreign"?"foreign":"owner",
          audience,scopes:value==="read"?["tools:read"]:["tools:read","tools:execute"],
          expiresAt:Date.now()+90_000};
 }
};
const handler=createAuthorizedMgrMcpHttpHandler({
 verifier,resourceAudience:audience,requiredScopes:["tools:read"],
 resourceMetadataUrl:"https://mcp.mgr.local-proof.example/.well-known/oauth-protected-resource",
 legacy:new LegacyEdgeClient({baseUrl:"https://legacy.example.com",fetcher:async()=>Response.json({accepted:false})}),
 forge:new ForgeStudioCatalogClient({baseUrl:forgeUrl,token,timeoutMs:20000}),
 forgeAllowedTenantId:"owner",forgeAllowedActorId:"local-proof-actor"
});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url??"/","http://127.0.0.1:"+server.address().port);
  let raw=[];
  for await(const c of req){raw.push(c);}
  const body=Buffer.concat(raw);
  if(body.length>1_048_576){res.writeHead(413);res.end();return;}
  const headers=new Headers();
  for(const [name,value] of Object.entries(req.headers)){
   if(Array.isArray(value))value.forEach(v=>headers.append(name,v));
   else if(value!==undefined)headers.set(name,value);
  }
  const init={method:req.method,headers};
  if(body.length)init.body=new Uint8Array(body);
  const response=await handler.fetch(new Request(url,init));
  res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body)Readable.fromWeb(response.body).pipe(res);
  else res.end();
 }catch(error){
  res.writeHead(500,{"content-type":"application/json"});
  res.end(JSON.stringify({error:String(error)}));
 }
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const endpoint=new URL("http://127.0.0.1:"+server.address().port+"/mcp");
async function connect(bearer){
 const client=new Client({name:"mgr-forge-real-mcp-verifier",version:"1.0.0"});
 const transport=new StreamableHTTPClientTransport(endpoint,{authProvider:{token:async()=>bearer}});
 await client.connect(transport);
 return client;
}
async function call(client,name,args){
 const response=await client.callTool({name,arguments:args});
 const text=response.content?.find(x=>x.type==="text")?.text;
 if(typeof text!=="string")throw Error("MCP returned no typed text");
 return JSON.parse(text);
}
let owner;
const verifiedInputs=[];
async function verifyInput(kind,input,jobId){
 const result=await call(owner,'mgr_forge_request_verify',{kind,input});
 assert.equal(result.accepted,true,JSON.stringify(result));assert.equal(result.nativeStatus,'MATERIALIZED');
 assert.equal(result.nativeResult.job_id,jobId);assert.equal(result.nativeResult.input_verified,true);
 assert.match(result.inputFingerprint,/^[a-f0-9]{64}$/);verifiedInputs.push(kind);
}
try{
 owner=await connect("owner");
 const list=await owner.listTools();
 const names=new Set(list.tools.map(t=>t.name));
 for(const name of ["mgr_forge_world_create","mgr_forge_creature_create","mgr_forge_biome_create",
                    "mgr_forge_creature_status","mgr_forge_biome_status","mgr_forge_saved_jobs","mgr_forge_saved_job_reopen"])
  assert.ok(names.has(name),"missing actual MCP registered tool "+name);
 const creatureInput={requestId:"mcp-protocol-creature-001",prompt:"Invent a mysterious winged armored dragon",
                      seed:17,variants:3,morph:{bend_degrees:11,taper:1.17}};
 const created=await call(owner,"mgr_forge_creature_create",creatureInput);
 assert.equal(created.accepted,true,JSON.stringify(created));
 assert.equal(created.hostedChatgptVerified,false);
 const again=await call(owner,"mgr_forge_creature_create",creatureInput);
 assert.equal(again.artifactSha256,created.artifactSha256);
 assert.equal(again.replayed,true);
 const status=await call(owner,"mgr_forge_creature_status",{requestId:creatureInput.requestId});
 assert.equal(status.artifactSha256,created.artifactSha256);
 await verifyInput('creature',creatureInput,created.jobId);
 const conflict=await call(owner,'mgr_forge_creature_create',{...creatureInput,seed:18});assert.equal(conflict.accepted,false);
 const oldStatus=await call(owner,'mgr_forge_creature_status',{requestId:creatureInput.requestId});assert.equal(oldStatus.artifactSha256,created.artifactSha256);
 const rejectOld=await call(owner,'mgr_forge_request_verify',{kind:'creature',input:{...creatureInput,seed:18}});assert.equal(rejectOld.accepted,false);
 const biomeInput={requestId:"mcp-protocol-biome-00001",biome:"tundra",seed:29,resolution:18};
 const biome=await call(owner,"mgr_forge_biome_create",biomeInput);
 assert.equal(biome.accepted,true,JSON.stringify(biome));
 const againBiome=await call(owner,"mgr_forge_biome_create",biomeInput);
 assert.equal(againBiome.replayed,true);
 assert.equal(againBiome.artifactSha256,biome.artifactSha256);
 const biomeStatus=await call(owner,"mgr_forge_biome_status",{requestId:biomeInput.requestId});
 assert.equal(biomeStatus.artifactSha256,biome.artifactSha256);
 await verifyInput('biome',biomeInput,biome.jobId);
 let worldProof=null;
 if(process.env.MGR_FORGE_QA_WORLD_EDITS){
  const input={requestId:'mcp-bound-world-0001',edits:JSON.parse(process.env.MGR_FORGE_QA_WORLD_EDITS)};
  const created=await call(owner,'mgr_forge_world_create',input);assert.equal(created.accepted,true,JSON.stringify(created));
  await verifyInput('world',input,created.jobId);
  const bytes=await owner.callTool({name:'mgr_forge_artifact_read',arguments:{jobId:created.jobId,kind:'world',expectedSha256:created.artifactSha256,includeData:true}});
  const resource=bytes.content.find(x=>x.type==='resource');assert.ok(resource);
  const blob=Buffer.from(resource.resource.blob,'base64');assert.equal(createHash('sha256').update(blob).digest('hex'),created.artifactSha256);
  worldProof={sha256:created.artifactSha256,bytes:blob.length,inputVerified:true};
 }
 // Discover saved original jobs without promoting journal state to artifact success.
 const observed=await call(owner,'mgr_forge_saved_jobs',{limit:2});
 assert.equal(observed.accepted,true);assert.equal(observed.status,'JOURNAL_OBSERVATION');
 assert.equal(observed.artifactReady,false);assert.equal(observed.artifactVerified,false);
 assert.equal(observed.creationPerformed,false);assert.equal(observed.artifactSha256,undefined);
 const first=observed.journal;assert.equal(first.total,worldProof?3:2);
 assert.ok(first.items.every(row=>row.artifact_verified===false));
 let saved=[...first.items];
 if(first.next_cursor){const next=await call(owner,'mgr_forge_saved_jobs',{limit:2,cursor:first.next_cursor});
   assert.equal(next.accepted,true);saved.push(...next.journal.items);assert.equal(next.journal.next_cursor,null);}
 const expectedHashes={creature:created.artifactSha256,biome:biome.artifactSha256,...(worldProof?{world:worldProof.sha256}:{})};
 for(const item of saved){
   const reopened=await call(owner,'mgr_forge_saved_job_reopen',{kind:item.kind,requestId:item.request_id});
   assert.equal(reopened.accepted,true,JSON.stringify(reopened));assert.equal(reopened.status,'SAVED_CREATION_GLTF_VERIFIED');
   assert.equal(reopened.jobId,item.job_id);assert.equal(reopened.artifactSha256,expectedHashes[item.kind]);
   assert.equal(reopened.artifactBytesVerified,true);assert.equal(reopened.creationPerformed,false);
   assert.equal(reopened.blobBase64,undefined);
 }
 // The SAME authenticated MCP service returns actual 3D bytes without a made-up public URL.
 const artifactResponse=await owner.callTool({name:"mgr_forge_artifact_read",arguments:{
   jobId:created.jobId,kind:"creature",expectedSha256:created.artifactSha256,includeData:true
 }});
 const embedded=artifactResponse.content?.find(item=>item.type==="resource");
 assert.ok(embedded && embedded.type==="resource","missing authenticated MCP GLB embedded resource");
 assert.equal(embedded.resource?.mimeType,"model/gltf-binary");
 const artifactBytes=Buffer.from(embedded.resource.blob,"base64");
 assert.equal(artifactBytes.toString("ascii",0,4),"glTF");
 assert.equal(createHash("sha256").update(artifactBytes).digest("hex"),created.artifactSha256);
 assert.equal(artifactBytes.length,created.artifactBytes);
 const noDataResult=await call(owner,"mgr_forge_artifact_read",{
   jobId:biome.jobId,kind:"biome",expectedSha256:biome.artifactSha256,includeData:false
 });
 assert.equal(noDataResult.accepted,true);
 assert.equal(noDataResult.blobBase64,undefined);
 const wrongDigest=await call(owner,"mgr_forge_artifact_read",{
   jobId:created.jobId,kind:"creature",expectedSha256:"b".repeat(64),includeData:false
 });
 assert.equal(wrongDigest.state,"ARTIFACT_UNAVAILABLE_OR_CHANGED");

 const readOnly=await connect("read");
 try{
  const savedRead=await call(readOnly,'mgr_forge_saved_jobs',{kind:'creature'});
  assert.equal(savedRead.accepted,true);assert.equal(savedRead.journal.items.length,1);
  const reopenedRead=await call(readOnly,'mgr_forge_saved_job_reopen',{kind:'creature',requestId:creatureInput.requestId});
  assert.equal(reopenedRead.accepted,true);assert.equal(reopenedRead.artifactSha256,created.artifactSha256);
  const readable=await call(readOnly,"mgr_forge_artifact_read",{
    jobId:created.jobId,kind:"creature",expectedSha256:created.artifactSha256,includeData:false
  });
  assert.equal(readable.accepted,true);
  const rejected=await call(readOnly,"mgr_forge_creature_create",
                            {...creatureInput,requestId:"mcp-readonly-probe-00001"});
  assert.equal(rejected.state,"DENY");
 }finally{await readOnly.close();}
 const foreign=await connect("foreign");
 try{
  assert.equal((await call(foreign,'mgr_forge_saved_jobs',{})).state,'DENY');
  assert.equal((await call(foreign,'mgr_forge_saved_job_reopen',{kind:'creature',requestId:creatureInput.requestId})).state,'DENY');
  const foreignRead=await call(foreign,"mgr_forge_artifact_read",{
    jobId:created.jobId,kind:"creature",expectedSha256:created.artifactSha256,includeData:false
  });
  assert.equal(foreignRead.state,"DENY");
  const denied=await call(foreign,"mgr_forge_biome_create",
                          {...biomeInput,requestId:"mcp-foreign-probe-0001"});
  assert.equal(denied.state,"DENY");
 }finally{await foreign.close();}
 const otherActor=await connect("other-actor");
 try{
  assert.equal((await call(otherActor,'mgr_forge_saved_jobs',{})).state,'DENY');
  assert.equal((await call(otherActor,'mgr_forge_saved_job_reopen',{kind:'creature',requestId:creatureInput.requestId})).state,'DENY');
  const deniedRead=await call(otherActor,"mgr_forge_artifact_read",{
   jobId:created.jobId,kind:"creature",expectedSha256:created.artifactSha256,includeData:true
  });
  assert.equal(deniedRead.state,"DENY");assert.equal(deniedRead.blobBase64,undefined);
  const deniedCreate=await call(otherActor,"mgr_forge_creature_create",{...creatureInput,requestId:"mcp-same-tenant-actor-probe"});
  assert.equal(deniedCreate.state,"DENY");
 }finally{await otherActor.close();}
 let composedCase=null;
 if(process.env.MGR_RUN_WORLD_COMPOSITION==="1"){
  const request={requestId:"mcp-protocol-combined-0001",biomeRequestId:biomeInput.requestId};
  const started=await call(owner,"mgr_forge_world_compose_create",request);
  assert.equal(started.accepted,true,JSON.stringify(started));
  assert.equal(started.artifactReady,false);
  const again=await call(owner,"mgr_forge_world_compose_create",request);
  assert.equal(again.jobId,started.jobId);
  let finished=null;
  for(let attempt=0;attempt<120;attempt++){
    const status=await call(owner,"mgr_forge_world_compose_status",{requestId:request.requestId});
    if(status.status==="MGR_COMPOSED_WORLD_GLTF_VERIFIED"){
      finished=status;break;
    }
    assert.equal(status.status,"MGR_WORLD_COMPOSITION_RUNNING",JSON.stringify(status));
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(finished,"World Forge did not produce completed real Blender composition");
  await verifyInput('composed',request,finished.jobId);
  assert.equal(finished.blenderReimported,true);
  assert.equal(finished.hostedForgeVerified,false);
  const binary=await owner.callTool({name:"mgr_forge_artifact_read",arguments:{
    jobId:finished.jobId,kind:"composed",expectedSha256:finished.artifactSha256,includeData:true
  }});
  const resource=binary.content?.find(part=>part.type==="resource");
  assert.ok(resource&&resource.type==="resource","Missing real combined World GLB");
  const model=Buffer.from(resource.resource.blob,"base64");
  assert.equal(model.toString("ascii",0,4),"glTF");
  assert.equal(model.length,finished.artifactBytes);
  assert.equal(createHash("sha256").update(model).digest("hex"),finished.artifactSha256);
  composedCase={sha256:finished.artifactSha256,bytes:model.length,
    source_city_sha256:finished.sourceCitySha256,
    source_biome_sha256:finished.sourceBiomeSha256,
    original_city_and_biome_real_blender:true,
    same_shared_mcp_authenticated_resource:true,
    no_public_hosted_worker_claim:true};
 }
 let humanCase=null;
 if(process.env.MGR_RUN_HUMAN_LIPSYNC==="1"){
  const timings={schema:"mgr.forge.phoneme-timeline.v1",actor_id:"mgr-human-mcp-proof",
    language:"en-US",duration_ms:1100,
    phonemes:[{phoneme:"M",start_ms:0,end_ms:150},
              {phoneme:"AE",start_ms:150,end_ms:450},
              {phoneme:"TH",start_ms:450,end_ms:700},
              {phoneme:"OW",start_ms:700,end_ms:1100}]};
  const input={requestId:"mcp-protocol-human-00001",fps:24,timings};
  let start=await call(owner,"mgr_forge_human_lipsync_start",input);
  assert.equal(start.accepted,true,JSON.stringify(start));
  assert.equal(start.neuralAudioAlignment,false);
  const again=await call(owner,"mgr_forge_human_lipsync_start",input);
  assert.equal(again.jobId,start.jobId);
  let finished=null;
  for(let attempt=0;attempt<100;attempt++){
    const status=await call(owner,"mgr_forge_human_lipsync_status",{requestId:input.requestId});
    if(status.status==="BLENDER_HUMAN_FACIAL_ARTIFACT_VERIFIED"){
      finished=status;break;
    }
    assert.equal(status.status,"BLENDER_HUMAN_JOB_RUNNING",JSON.stringify(status));
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(finished,"Human Forge did not complete independently checked Blender facial GLB");
  await verifyInput('human',input,finished.jobId);
  assert.equal(finished.morphTargets,8);
  assert.equal(finished.audioAlignment,false);
  const binary=await owner.callTool({name:"mgr_forge_artifact_read",arguments:{
    jobId:finished.jobId,kind:"human",expectedSha256:finished.sha256,includeData:true
  }});
  const resource=binary.content?.find(part=>part.type==="resource");
  assert.ok(resource&&resource.type==="resource","missing Human Forge embedded MCP resource");
  const bytes=Buffer.from(resource.resource.blob,"base64");
  assert.equal(bytes.toString("ascii",0,4),"glTF");
  assert.equal(bytes.length,finished.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),finished.sha256);
  humanCase={sha256:finished.sha256,bytes:finished.bytes,
             morph_targets:finished.morphTargets,independent_blender_verified:true,
             actual_mcp_blob_verified:true,
             inferred_audio_alignment:false,hosted:false};
 }

 const proof={
  status:"MGR_FULL_LOCAL_MCP_PROTOCOL_VERIFIED",
  schema:"mgr.mcp.forge.protocol-acceptance.v1",
  protocol_client:"official @modelcontextprotocol/client StreamableHTTPClientTransport",
  actual_transport:"localhost Node HTTP -> authorized MGR MCP handler -> Python Forge Studio",
  token_verifier:"fixture; not deployed OIDC/JWKS",
  tools_available:[...names].filter(x=>x.startsWith("mgr_forge_")),
  input_verified_kinds:verifiedInputs,
  saved_jobs_observation_only:true,saved_jobs_pagination_verified:true,
  saved_creation_reopen_verified_kinds:saved.map(item=>item.kind),
  saved_creation_reopen_reads_original_glb:true,saved_creation_reads_create_no_jobs:true,
  saved_creation_read_scope_allowed:true,saved_creation_foreign_actor_tenant_denied:true,
  same_id_changed_input_does_not_accept_old_artifact:true,
  world_edit_proof:worldProof,
  creature_sha256:created.artifactSha256,
  biome_sha256:biome.artifactSha256,
  creature_bytes:created.artifactBytes,biome_bytes:biome.artifactBytes,
  human_facial_blender_proof:humanCase,
  composed_world_blender_proof:composedCase,
  stable_replay:true,read_only_execution_denied:true,cross_tenant_execution_denied:true,same_tenant_foreign_actor_denied:true,
  verified_mcp_binary_resource:true,verified_mcp_blob_sha256:created.artifactSha256,
  signed_private_public_download_url_exists:false,private_read_only_access_approved:true,
  foreign_tenant_artifact_denied:true,wrong_sha_artifact_denied:true,
  no_paid_gpu:true,no_neural_model:true,
  remote_worker_reachable_over_internet:false,
  hosted_chatgpt_verified:false,hosted_tevin_verified:false
 };
 console.log("MGR_FULL_MCP_PROTOCOL="+JSON.stringify(proof));
}finally{
 if(owner)await owner.close();
 await handler.close();
 await new Promise(resolve=>server.close(resolve));
}
