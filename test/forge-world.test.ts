import test from "node:test";
import assert from "node:assert/strict";
import {createForgeWorldMcp, statusForgeWorldMcp} from "../src/forge-mcp-tools.js";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";

const audience = "https://mgr.example/mcp";
const edits = {schema:"mgr.forge.world-edit.v1" as const, asset_sha256:"a".repeat(64),
  buildings:[{id:"original",center:[0,0,0],size:[4,5,6],material:"brick"}]};
const auth = {actorId:"tester",tenantId:"owner",audience,
  scopes:["tools:read","tools:execute"],expiresAt:Date.now()+60000};
const valid = {status:"MATERIALIZED",job_id:"a".repeat(24),world_sha256:"f".repeat(64),
  world_bytes:8192,glb_url:"/files/"+"a".repeat(24)+"/edited/world.glb",replayed:false};
const options = (overrides:Record<string,unknown>={})=>({
  auth,resourceAudience:audience,allowedTenantId:"owner",allowedActorId:auth.actorId,
  forge:{async search(){return {};},async createWorld(){return valid;},
    async worldStatus(){return valid;}},...overrides
});

test("authorized Forge world tool requires real materialized digest",async()=>{
  const result=await createForgeWorldMcp(options(),{requestId:"stable-world-1234",edits});
  assert.equal(result.accepted,true);
  assert.equal(result.artifactSha256,valid.world_sha256);
  assert.equal(result.independentlyBlenderVerified,false);
  assert.equal(result.hostedTevinVerified,false);
});

test("wrong tenant, missing write scope and wrong audience deny before effects",async()=>{
  let calls=0;
  const forge={async search(){return {};},async createWorld(){calls++;return valid;}};
  const base=options({forge});
  for(const current of [
    {...base,allowedTenantId:"wrong"},
    {...base,auth:{...auth,scopes:["tools:read"]}},
    {...base,auth:{...auth,audience:"https://wrong.example"}},
  ]){
    const result=await createForgeWorldMcp(current,{requestId:"stable-world-1234",edits});
    assert.equal(result.state,"DENY");
  }
  assert.equal(calls,0);
});

test("interruption never gets described as successful creation",async()=>{
  const result=await createForgeWorldMcp(options({
    forge:{async search(){return {};},
      async createWorld(){return {status:"NEEDS_RECONCILIATION"};}}
  }),{requestId:"stable-world-1234",edits});
  assert.equal(result.accepted,false);
  assert.equal(result.state,"RECONCILIATION_REQUIRED");
  const falseSuccess=await createForgeWorldMcp(options({
    forge:{async search(){return {};},async createWorld(){return {status:"MATERIALIZED"};}}
  }),{requestId:"stable-world-1234",edits});
  assert.equal(falseSuccess.state,"UNVERIFIED_RECEIPT");
});

test("Forge Studio adapter posts only bound JSON, no arbitrary action or redirect",async()=>{
  const calls:Array<{path:string;body:unknown;token:string}>=[];
  const client=new ForgeStudioCatalogClient({
    baseUrl:"http://127.0.0.1:9876", token:"temporary-token",
    transport:async(input,init)=>{
      calls.push({path:new URL(String(input)).pathname,body:JSON.parse(String(init?.body)),
                  token:new Headers(init?.headers).get("X-MGR-Forge-Token")??""});
      return Response.json(valid);
    }
  });
  await client.createWorld({requestId:"stable-world-1234",edits});
  await client.worldStatus("stable-world-1234");
  assert.deepEqual(calls.map(x=>x.path),["/api/world-job","/api/world-job-status"]);
  assert.equal(calls[0]?.token,"temporary-token");
  assert.deepEqual(calls[0]?.body,{request_id:"stable-world-1234",edits});
  await assert.rejects(client.createWorld({requestId:"bad",edits}),/stable/);
});

test("status is read-only and honors the same actor and tenant gate",async()=>{
  const got=await statusForgeWorldMcp(options(),"stable-world-1234");
  assert.equal(got.accepted,true);
  const denied=await statusForgeWorldMcp(options({auth:{...auth,scopes:[]}}),"stable-world-1234");
  assert.equal(denied.state,"DENY");
});
