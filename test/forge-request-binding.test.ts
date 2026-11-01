import test from 'node:test';
import assert from 'node:assert/strict';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.js';
import {verifyForgeRequestMcp} from '../src/forge-mcp-tools.js';
import {forgeVerifyInput} from '../src/forge-inputs.js';
const audience='https://mgr.example/mcp',auth={actorId:'owner',tenantId:'tenant',audience,scopes:['tools:read'],expiresAt:Date.now()+60000};
const input={kind:'creature' as const,input:{requestId:'original-creature-0001',prompt:'Original native creature',seed:42,variants:4,morph:{}}};
const receipt={request_id:input.input.requestId,request_kind:'creature',input_verified:true,input_fingerprint:'b'.repeat(64),job_id:'a'.repeat(24),status:'MATERIALIZED'};
function options(result:any=receipt){return {auth,allowedActorId:'owner',allowedTenantId:'tenant',resourceAudience:audience,forge:{async search(){return {};},async verifyRequest(){return result;}}};}
test('native verification preserves original job identity and actual lifecycle state',async()=>{
 for(const status of ['MATERIALIZED','RUNNING','NEEDS_RECONCILIATION','FAILED']){const r=await verifyForgeRequestMcp(options({...receipt,status}),input);assert.equal(r.accepted,true);assert.equal(r.nativeStatus,status);assert.equal(r.status,'NATIVE_REQUEST_INPUT_VERIFIED');}
});
test('missing job and changed input are never acceptance of old artifact',async()=>{
 assert.equal((await verifyForgeRequestMcp(options({...receipt,status:'NOT_FOUND',input_verified:false}),input)).state,'NOT_FOUND');
 for(const change of [{request_id:'different-request-0001'},{request_kind:'biome'},{input_verified:false},{input_fingerprint:'bad'},{job_id:'bad'},{status:'unknown-new-state'}])assert.equal((await verifyForgeRequestMcp(options({...receipt,...change}),input)).accepted,false);
});
test('native verification needs the same current enrolled actor and read scope',async()=>{
 for(const auth of [{actorId:'foreign'}, {tenantId:'foreign'}, {scopes:[]}, {expiresAt:0}]){const o=options();o.auth={...o.auth,...auth};assert.equal((await verifyForgeRequestMcp(o,input)).state,'DENY');}
});
test('all five exact schemas map only to read-only native request verification',async()=>{
 const variants=[input,{kind:'biome',input:{requestId:'native-biome-0001',biome:'forest',seed:3,resolution:10}},{kind:'human',input:{requestId:'native-human-0001',fps:24,timings:{schema:'mgr.forge.phoneme-timeline.v1',actor_id:'native',language:'en-US',duration_ms:100,phonemes:[{phoneme:'AA',start_ms:0,end_ms:100}]}}},{kind:'composed',input:{requestId:'native-compose-0001',biomeRequestId:'native-biome-0001'}},{kind:'world',input:{requestId:'native-world-0001',edits:{schema:'mgr.forge.world-edit.v1',asset_sha256:'b'.repeat(64),buildings:[{id:'building',center:[0,0,0],size:[1,1,1],material:'Blue'}]}}}];
 for(const raw of variants){const parsed=forgeVerifyInput.parse(raw);let calls=0;const c=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'native-fixture',transport:async(url,init)=>{calls++;assert.equal(new URL(String(url)).pathname,'/api/request-verify');const body=JSON.parse(String(init?.body));assert.equal(body.kind,parsed.kind);assert.equal(body.request.request_id,parsed.input.requestId);assert.equal(body.request.requestId,undefined);return Response.json({status:'NOT_FOUND'});}});await c.verifyRequest(parsed);assert.equal(calls,1);assert.equal(forgeVerifyInput.safeParse({...raw,unexpected:true}).success,false);}
});
