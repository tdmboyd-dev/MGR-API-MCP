import test from "node:test";
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {createForgeBiomeMcp,statusForgeBiomeMcp} from "../src/forge-mcp-tools.js";

const audience="https://mgr.example/mcp";
const auth={actorId:"builder",tenantId:"owner",audience,
  scopes:["tools:read","tools:execute"],expiresAt:Date.now()+120000};
const input={requestId:"owner-biome-creation-001",biome:"alien" as const,seed:88,resolution:24};
const returned={status:"MATERIALIZED",job_id:"a".repeat(24),biome_sha256:"f".repeat(64),
  biome_bytes:20000,triangles:1800,source_world_sha256:"b".repeat(64),
  glb_url:"/files/"+"a".repeat(24)+"/biome/biome.glb",
  manifest_url:"/files/"+"a".repeat(24)+"/biome/biome.json",
  biome:"alien",replayed:false,external_model_used:false,
  editor_world_unchanged:true,added_as_layer:true};
const options=(overrides:Record<string,unknown>={})=>({
 auth,resourceAudience:audience,allowedTenantId:"owner",
 forge:{async search(){return {};},async createBiome(){return returned;},
        async biomeStatus(){return returned;}},...overrides
});

test("verified optional terrain carries real digest, no false scene merged claim",async()=>{
 const result=await createForgeBiomeMcp(options(),input);
 assert.equal(result.accepted,true);
 assert.equal(result.artifactSha256,returned.biome_sha256);
 assert.equal(result.standaloneWorldMerged,false);
 assert.equal(result.externalModelsUsed,false);
 assert.equal(result.hostedConsumerVerified,false);
});

test("tenant/execution denial blocks the side effect before dispatch",async()=>{
 let calls=0;
 const forge={async search(){return {};},async createBiome(){calls++;return returned;}};
 for(const item of [
  options({forge,allowedTenantId:"wrong"}),
  options({forge,auth:{...auth,scopes:["tools:read"]}}),
  options({forge,auth:{...auth,audience:"https://wrong"}})
 ]){
  const result=await createForgeBiomeMcp(item,input);
  assert.equal(result.state,"DENY");
 }
 assert.equal(calls,0);
});

test("missing hash and interrupted jobs are not claimed successful",async()=>{
 for(const bad of [
   {...returned,biome_sha256:"invalid"},
   {...returned,external_model_used:true},
   {...returned,editor_world_unchanged:false},
   {status:"MATERIALIZED"}
 ]){
  const result=await createForgeBiomeMcp(options({forge:{
    async search(){return {};},async createBiome(){return bad;}
  }}),input);
  assert.equal(result.state,"UNVERIFIED_BIOME_RECEIPT");
 }
 const interrupted=await createForgeBiomeMcp(options({forge:{
  async search(){return {};},async createBiome(){return {status:"NEEDS_RECONCILIATION"};}
 }}),input);
 assert.equal(interrupted.state,"RECONCILIATION_REQUIRED");
});

test("existing ForgeStudioCatalogClient uses only permitted biome/status endpoints",async()=>{
 const paths:string[]=[];
 const client=new ForgeStudioCatalogClient({
  baseUrl:"http://127.0.0.1:8888",token:"local-secret",
  transport:async(target,init)=>{
    paths.push(new URL(String(target)).pathname);
    assert.equal(new Headers(init?.headers).get("X-MGR-Forge-Token"),"local-secret");
    return Response.json(returned);
  }});
 await client.createBiome(input);
 await client.biomeStatus(input.requestId);
 assert.deepEqual(paths,["/api/biome-create","/api/biome-status"]);
 await assert.rejects(client.createBiome({...input,resolution:99}),/invalid/);
});

test("biome status uses read scope, preserves unknown state",async()=>{
 const r=await statusForgeBiomeMcp(options(),input.requestId);
 assert.equal(r.accepted,true);
 const denied=await statusForgeBiomeMcp(options({allowedTenantId:"other"}),input.requestId);
 assert.equal(denied.state,"DENY");
 const unknown=await statusForgeBiomeMcp(options({forge:{
  async search(){return {};},async biomeStatus(){return {status:"NEEDS_RECONCILIATION"};}
 }}),input.requestId);
 assert.equal(unknown.accepted,false);
 assert.equal(unknown.reconciliationRequired,true);
});
