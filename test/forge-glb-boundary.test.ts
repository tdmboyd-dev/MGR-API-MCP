import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.js';
import {readForgeArtifactMcp} from '../src/forge-mcp-tools.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const input=(b:Buffer)=>({jobId:'a'.repeat(24),kind:'creature' as const,expectedSha256:sha(b)});
const auth={actorId:'owner',tenantId:'tenant',audience:'https://mgr.example/mcp',scopes:['tools:read'],expiresAt:Date.now()+120000};
for(const [name,make] of Object.entries({
 'magic-only forgery':()=>Buffer.concat([Buffer.from('glTF'),Buffer.alloc(300)]),
 'wrong version':()=>{const b=forgeTriangleGlb();b.writeUInt32LE(1,4);return b;},
 'wrong total':()=>{const b=forgeTriangleGlb();b.writeUInt32LE(b.length+4,8);return b;},
 'truncated chunk':()=>{const b=forgeTriangleGlb();b.writeUInt32LE(0xfffffffc,12);return b;},
 'invalid JSON UTF8':()=>{const b=forgeTriangleGlb();b[20]=0xff;return b;},
 'wrong chunk order':()=>{const b=forgeTriangleGlb();b.writeUInt32LE(0x004e4942,16);return b;},
 'external buffer':()=>forgeTriangleGlb(d=>d.buffers[0].uri='https://example.invalid/private'),
 'external image':()=>forgeTriangleGlb(d=>d.images=[{uri:'file:///C:/private.png'}]),
 'unqualified compression':()=>forgeTriangleGlb(d=>d.extensionsRequired=['KHR_draco_mesh_compression']),
 'escaped view':()=>forgeTriangleGlb(d=>d.bufferViews[0].byteLength=800000),
 'escaped accessor':()=>forgeTriangleGlb(d=>d.accessors[0].count=1000),
 'misaligned accessor':()=>forgeTriangleGlb(d=>d.accessors[0].byteOffset=1),
 'unsupported sparse accessor':()=>forgeTriangleGlb(d=>d.accessors[0].sparse={count:1}),
 'non-triangle primitive':()=>forgeTriangleGlb(d=>d.meshes[0].primitives[0].mode=1),
 'excessive nesting':()=>forgeTriangleGlb(d=>{let x=d;for(let i=0;i<65;i++)x=x.extras={};}),
 'out of range vertex':()=>forgeTriangleGlb((_d,b)=>b.writeUInt16LE(3,72)),
 'nonfinite geometry':()=>forgeTriangleGlb((_d,b)=>b.writeFloatLE(NaN,0)),
 'missing geometry':()=>forgeTriangleGlb(d=>d.meshes=[]),
 'wrong morph count':()=>forgeTriangleGlb(d=>{d.accessors.push({...d.accessors[0],count:2});d.meshes[0].primitives[0].targets=[{POSITION:3}];}),
})){test('receiver rejects matching-hash '+name+' at HTTP and custom adapter boundaries',async()=>{
 const blob=make(),args=input(blob);
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(blob)});
 await assert.rejects(client.readArtifact(args),/GLB|glTF/);
 const result=await readForgeArtifactMcp({auth,allowedActorId:auth.actorId,allowedTenantId:auth.tenantId,resourceAudience:auth.audience,forge:{async search(){return {};},async readArtifact(){return {blobBase64:blob.toString('base64'),sha256:sha(blob),bytes:blob.length,mimeType:'model/gltf-binary'};}}},args);
 assert.equal(result.accepted,false);assert.equal(result.state,'ARTIFACT_UNAVAILABLE_OR_CHANGED');
});}
test('artifact response is canceled and released on overflow, including absent length',async()=>{
 let canceled=0;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(800001));},cancel(){canceled++;}});
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(stream)});
 await assert.rejects(client.readArtifact(input(forgeTriangleGlb())),/bounded MCP transfer/);
 assert.equal(canceled,1);assert.equal(stream.locked,false);
});
test('declared oversized response is canceled without locking or reading',async()=>{
 let canceled=0;const stream=new ReadableStream({cancel(){canceled++;}});
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(stream,{headers:{'content-length':'800001'}})});
 await assert.rejects(client.readArtifact(input(forgeTriangleGlb())),/bounded MCP transfer/);assert.equal(canceled,1);assert.equal(stream.locked,false);
});
test('HTTP failure disposes of unread response for catalog and artifact calls',async()=>{
 let canceled=0;
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(new ReadableStream({cancel(){canceled++;}}),{status:503})});
 await assert.rejects(client.readArtifact(input(forgeTriangleGlb())),/HTTP 503/);
 await assert.rejects(client.search({mode:'sources',query:''}),/HTTP 503/);assert.equal(canceled,2);
});
test('small-chunk overflow cancels response before retaining unbounded stream metadata',async()=>{
 let canceled=0,count=0;const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(new ReadableStream({pull(c){count++;c.enqueue(Uint8Array.of(1));},cancel(){canceled++;}}))});
 await assert.rejects(client.readArtifact(input(forgeTriangleGlb())),/bounded MCP transfer/);assert.equal(canceled,1);assert.ok(count<=4100);
});
test('declared length mismatch refuses delivery even if bytes and hash are valid',async()=>{
 const blob=forgeTriangleGlb(),client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(blob,{headers:{'content-length':String(blob.length+1)}})});
 await assert.rejects(client.readArtifact(input(blob)),/declared response length mismatch/);
});
test('noncanonical base64 from a custom adapter cannot pass matching byte/hash proof',async()=>{
 const blob=forgeTriangleGlb(),args=input(blob);const result=await readForgeArtifactMcp({auth,allowedActorId:auth.actorId,allowedTenantId:auth.tenantId,resourceAudience:auth.audience,forge:{async search(){return {};},async readArtifact(){return {blobBase64:blob.toString('base64')+'\n',sha256:sha(blob),bytes:blob.length,mimeType:'model/gltf-binary'};}}},args);
 assert.equal(result.accepted,false);
});
test('catalog JSON never replaces malformed UTF8 with a misleading valid string',async()=>{
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:9999',token:'fixture',transport:async()=>new Response(Buffer.from([123,34,120,34,58,34,255,34,125]))});
 await assert.rejects(client.search({mode:'sources',query:''}));
});
