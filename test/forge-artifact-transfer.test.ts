import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {readForgeArtifactMcp} from "../src/forge-mcp-tools.js";

const blob=Buffer.concat([Buffer.from("glTF"),Buffer.alloc(300,17)]);
const sha=createHash("sha256").update(blob).digest("hex");
const input={jobId:"a".repeat(24),kind:"creature" as const,expectedSha256:sha};
const actor={actorId:"owner",tenantId:"tenant",audience:"https://mcp.example",expiresAt:Date.now()+90000,scopes:["tools:read"]};
const client=new ForgeStudioCatalogClient({
 baseUrl:"http://127.0.0.1:9999",token:"private-token",
 transport:async url=>{
  assert.match(String(url),/\/files\/a{24}\/creature\/creature.glb$/);
  return new Response(blob,{status:200,headers:{"Content-Type":"model/gltf-binary"}});
 }
});
const options={auth:actor,resourceAudience:"https://mcp.example",allowedTenantId:"tenant",allowedActorId:actor.actorId,
 forge:{async search(){return {};},async readArtifact(x:typeof input){return client.readArtifact(x)}}};

test("bounded Forge binary fetch verifies bytes and expected SHA",async()=>{
 const result=await client.readArtifact(input);
 assert.equal(result.mimeType,"model/gltf-binary");
 assert.equal(result.sha256,sha);
 assert.deepEqual(Buffer.from(result.blobBase64,"base64"),blob);
 const proof=await readForgeArtifactMcp(options,input);
 assert.equal(proof.accepted,true);
 assert.equal(proof.status,"VERIFIED_PRIVATE_GLTF_BLOB");
 assert.equal(proof.remotePublicDownloadUrl,null);
});

test("untrusted digest, wrong tenant and missing read scope deny",async()=>{
 await assert.rejects(client.readArtifact({...input,expectedSha256:"b".repeat(64)}),/SHA-256 changed/);
 const wrong=await readForgeArtifactMcp({...options,allowedTenantId:"foreign"},input);
 assert.equal(wrong.state,"DENY");
 const scope=await readForgeArtifactMcp({...options,auth:{...actor,scopes:[]}},input);
 assert.equal(scope.state,"DENY");
 const invalid=await readForgeArtifactMcp(options,{...input,jobId:"../.."});
 assert.equal(invalid.state,"INVALID_ARTIFACT_IDENTITY");
});

test("truncated, fake and oversized GLB refuse delivery",async()=>{
 const bad=new ForgeStudioCatalogClient({
  baseUrl:"http://127.0.0.1:9999",token:"private-token",
  transport:async()=>new Response(Buffer.from("NOT-A-3D-FILE-HERE"+ "X".repeat(100)))
 });
 await assert.rejects(bad.readArtifact(input),/not real GLB|SHA-256 changed/);
 const tooLarge=new ForgeStudioCatalogClient({
  baseUrl:"http://127.0.0.1:9999",token:"private-token",
  transport:async()=>new Response(Buffer.alloc(800001,1))
 });
 await assert.rejects(tooLarge.readArtifact(input),/bounded MCP transfer/);
});
