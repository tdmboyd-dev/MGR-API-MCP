/** Real official SDK -> shared authenticated HTTP -> native Forge asset jobs.
 * Fixture token identities only. No deployed OAuth, GPU, provider or art claim.
 */
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createAuthorizedMgrMcpHttpHandler} from '../src/mcp-http.ts';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.ts';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const inputs=JSON.parse(process.env.MGR_FORGE_QA_ASSET_INPUTS??'null');
if(!inputs||!process.env.MGR_FORGE_STUDIO_URL||!process.env.MGR_FORGE_STUDIO_TOKEN)throw Error('Explicit disposable native fixture required');
const audience='https://native-assets.local-proof.invalid/mcp';
const kinds=inputs.uv?['reconstruction','morph','uv']:['reconstruction','morph'];
const handler=createAuthorizedMgrMcpHttpHandler({resourceAudience:audience,requiredScopes:['tools:read'],
 resourceMetadataUrl:'https://native-assets.local-proof.invalid/.well-known/oauth-protected-resource',
 verifier:{async verify(value){if(!['owner','read','foreign','other-actor'].includes(value))return null;
  return {subject:value==='other-actor'?'foreign-actor':'fixture-owner',tenantId:value==='foreign'?'foreign-tenant':'fixture-tenant',
   audience,scopes:value==='read'?['tools:read']:['tools:read','tools:execute'],expiresAt:Date.now()+120000};}},
 forge:new ForgeStudioCatalogClient({baseUrl:process.env.MGR_FORGE_STUDIO_URL,token:process.env.MGR_FORGE_STUDIO_TOKEN,timeoutMs:30000}),
 forgeAllowedActorId:'fixture-owner',forgeAllowedTenantId:'fixture-tenant'});
const server=createServer(async(req,res)=>{try{
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>1_200_000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
 const body=Buffer.concat(chunks),headers=new Headers();
 for(const [key,value] of Object.entries(req.headers))if(Array.isArray(value))value.forEach(item=>headers.append(key,item));else if(value!==undefined)headers.set(key,value);
 const response=await handler.fetch(new Request(new URL(req.url??'/','http://127.0.0.1:'+server.address().port),
  {method:req.method,headers,...(body.length?{body:new Uint8Array(body)}:{})}));
 res.writeHead(response.status,Object.fromEntries(response.headers));
 if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch{res.writeHead(500);res.end('fixture request failed');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const endpoint=new URL('http://127.0.0.1:'+server.address().port+'/mcp'),clients=[];
async function connect(token){const client=new Client({name:'mgr-native-assets-proof',version:'1.0.0'});
 await client.connect(new StreamableHTTPClientTransport(endpoint,{authProvider:{token:async()=>token}}));clients.push(client);return client;}
async function call(client,name,args){const result=await client.callTool({name,arguments:args},{timeout:60000});
 const text=result.content.find(item=>item.type==='text')?.text;if(typeof text!=='string')throw Error('Missing MCP JSON receipt');
 return {result,body:JSON.parse(text)};}
const cases=[];
let reconstructionSource;
try{
 let owner=await connect('owner');const tools=(await owner.listTools()).tools.map(item=>item.name);
 for(const kind of kinds)for(const action of ['create','status'])assert.ok(tools.includes('mgr_forge_'+kind+'_'+action));
 for(const kind of kinds){
  const input=kind==='uv'?Object.assign(inputs.uv,reconstructionSource):inputs[kind],name='mgr_forge_'+kind;
  const created=(await call(owner,name+'_create',input)).body;
  assert.equal(created.accepted,true,JSON.stringify(created));assert.equal(created.artifactBytesVerified,true);assert.equal(created.nativeInputVerified,true);
  const replay=(await call(owner,name+'_create',input)).body;
  assert.equal(replay.accepted,true,JSON.stringify(replay));assert.equal(replay.replayed,true);assert.equal(replay.jobId,created.jobId);assert.equal(replay.artifactSha256,created.artifactSha256);
  // Fresh official SDK transport still reads the original exact native job.
  await owner.close();clients.splice(clients.indexOf(owner),1);owner=await connect('owner');
  const status=(await call(owner,name+'_status',input)).body;
  assert.equal(status.accepted,true,JSON.stringify(status));assert.equal(status.jobId,created.jobId);assert.equal(status.artifactSha256,created.artifactSha256);assert.equal(status.creationPerformed,false);
  if(kind==='uv')for(const receipt of [created,replay,status])assert.equal(receipt.layout,input.layout);
  const verified=(await call(owner,'mgr_forge_request_verify',{kind,input})).body;
  assert.equal(verified.accepted,true);assert.equal(verified.nativeStatus,'MATERIALIZED');assert.equal(verified.inputFingerprint,created.inputFingerprint);
  const changed=kind==='reconstruction'?{...input,grid:input.grid+8}:kind==='uv'?{...input,layout:'triangles'}:
   {...input,morph:{...input.morph,twist_degrees:input.morph.twist_degrees+1}};
  assert.equal((await call(owner,name+'_create',changed)).body.accepted,false);
  assert.equal((await call(owner,name+'_status',changed)).body.accepted,false);
  assert.equal((await call(owner,'mgr_forge_request_verify',{kind,input:changed})).body.accepted,false);
  const listed=(await call(owner,'mgr_forge_saved_jobs',{kind,limit:1})).body;
  assert.equal(listed.accepted,true);assert.equal(listed.artifactVerified,false);assert.equal(listed.creationPerformed,false);
  assert.equal(listed.journal.items.length,1);assert.equal(listed.journal.items[0].request_id,input.requestId);assert.equal(listed.journal.items[0].artifact_verified,false);
  const reopened=(await call(owner,'mgr_forge_saved_job_reopen',{kind,requestId:input.requestId})).body;
  assert.equal(reopened.accepted,true);assert.equal(reopened.artifactSha256,created.artifactSha256);assert.equal(reopened.creationPerformed,false);
  const delivery=await call(owner,'mgr_forge_artifact_read',{kind,jobId:created.jobId,expectedSha256:created.artifactSha256,includeData:true});
  assert.equal(delivery.body.accepted,true);const resource=delivery.result.content.find(item=>item.type==='resource');
  assert.ok(resource&&'blob' in resource.resource);const binary=Buffer.from(resource.resource.blob,'base64');
  assert.equal(createHash('sha256').update(binary).digest('hex'),created.artifactSha256);assert.equal(binary.length,created.artifactBytes);
  if(kind==='reconstruction')reconstructionSource={glbBase64:binary.toString('base64'),expectedSha256:created.artifactSha256};
  assert.equal((await call(owner,'mgr_forge_artifact_read',{kind,jobId:created.jobId,expectedSha256:'f'.repeat(64),includeData:true})).body.accepted,false);
  cases.push({kind,requestId:input.requestId,jobId:created.jobId,sha256:created.artifactSha256,bytes:binary.length,...(kind==='uv'?{layout:status.layout}:{}),
   inputFingerprint:created.inputFingerprint,sourceBytesSha256:kind!=='reconstruction'?input.expectedSha256:
    ['frontPngBase64','sidePngBase64'].map(key=>createHash('sha256').update(Buffer.from(input[key],'base64')).digest('hex')),
   stableReplay:true,freshSdkStatusExactInputVerified:true,changedInputCreateStatusVerifyDenied:true,
   savedJournalObservationOnly:true,reopenVerified:true,downloadIndependentSha256Verified:true,wrongDigestDenied:true});
 }
 const observed=(await call(owner,'mgr_forge_saved_jobs',{limit:1})).body;
 assert.equal(observed.journal.total,kinds.length);assert.ok(observed.journal.next_cursor);
 const next=(await call(owner,'mgr_forge_saved_jobs',{limit:1,cursor:observed.journal.next_cursor})).body;
 assert.equal(next.accepted,true);assert.equal(next.journal.items.length,1);assert.notEqual(next.journal.items[0].kind,observed.journal.items[0].kind);
 for(const identity of ['read','foreign','other-actor']){
  const client=await connect(identity);
  for(const kind of kinds){
   const input=inputs[kind],deniedInput={...input,requestId:identity+'-new-'+kind+'-0001'};
   assert.equal((await call(client,'mgr_forge_'+kind+'_create',deniedInput)).body.state,'DENY');
   const state=(await call(client,'mgr_forge_'+kind+'_status',input)).body;
   const reopen=(await call(client,'mgr_forge_saved_job_reopen',{kind,requestId:input.requestId})).body;
   const artifact=(await call(client,'mgr_forge_artifact_read',{kind,jobId:cases.find(item=>item.kind===kind).jobId,expectedSha256:cases.find(item=>item.kind===kind).sha256,includeData:true})).body;
   if(identity==='read'){assert.equal(state.accepted,true);assert.equal(reopen.accepted,true);assert.equal(artifact.accepted,true);}
   else{assert.equal(state.state,'DENY');assert.equal(reopen.state,'DENY');assert.equal(artifact.state,'DENY');}
  }
 }
 console.log('MGR_NATIVE_ASSET_PROTOCOL='+JSON.stringify({schema:'mgr.forge.native-assets-protocol.v1',status:'REAL_SDK_HTTP_NATIVE_ASSETS_PASS',
  protocol:'official @modelcontextprotocol/client StreamableHTTPClientTransport',transport:'real local Node HTTP -> shared authorized MCP -> secured Python Forge',
  tokenVerifier:'synthetic explicit fixture identities; not deployed OAuth/JWKS',availableForgeTools:tools.filter(name=>name.startsWith('mgr_forge_')),
  cases,savedPaginationVerified:true,readOnlyCreationDenied:true,readOnlyStatusReopenArtifactAllowed:true,
  crossActorTenantCreationAndReadsDenied:true,noAutomaticRetry:true,paidCalls:0,neuralInference:false,productionVerified:false,hostedConsumerVerified:false}));
}finally{
 for(const client of clients)await client.close();await handler.close();await new Promise(resolve=>server.close(resolve));
}
