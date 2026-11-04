import test from "node:test";
import assert from "node:assert/strict";
import { readEcosystemCatalog } from "../src/ecosystem-catalog.js";

test("ecosystem catalog retains the original twenty-one products and adds owner-confirmed Backpack without invented global execution",()=>{
  const catalog=readEcosystemCatalog();
  assert.equal(catalog.schemaVersion,"mgr.ecosystem.catalog.v1");
  assert.equal(catalog.entries.length,22);
  assert.equal(new Set(catalog.entries.map(e=>e.repoId)).size,22);
  assert.ok(catalog.entries.some(e=>e.repoId==='MGR-BACKPACK'));
  for(const e of catalog.entries){assert.match(e.source.commit,/^[0-9a-f]{40}$/);assert.equal(e.runtimeVerified,false);assert.deepEqual(e.integration.tools,[]);}
  for(const id of ['MGR-CODE-MONSTER','MGR-OMNISIGHT']){const entry=catalog.entries.find(e=>e.repoId===id)!;assert.equal(entry.integration.state,'source-available/receiving-read-verified');assert.equal('knowledgeInterface' in entry&&entry.knowledgeInterface.enrollmentRequired,true);assert.doesNotMatch(entry.description,/no source commit/);}
});
test("catalog filtering rejects unknown repositories and cannot mutate later responses",()=>{
  const first=readEcosystemCatalog("MGR-ONE");
  assert.equal(first.entries.length,1);
  first.entries.length=0;
  assert.equal(readEcosystemCatalog("MGR-ONE").entries.length,1);
  assert.throws(()=>readEcosystemCatalog("not-a-repo"),/Unknown ecosystem repository/);
});

test("the shared catalog advertises each of the thirteen owner-enrolled manual routes",()=>{
  const manualEntries=readEcosystemCatalog().entries.flatMap(entry=>"knowledgeInterface" in entry?[entry.knowledgeInterface]:[]);
  assert.deepEqual(manualEntries.map(entry=>entry.project).sort(),
    ["agents","api-mcp","backpack","code-monster","create-loco","creation","forge","hu","legacy","omnidev","omnisight","signme","voice"]);
  assert.ok(manualEntries.every(entry=>entry.enrollmentRequired && !entry.automaticRemoteFetch));
});

test("Legacy local verification is revision-scoped and grants no runtime tools",()=>{
  const [legacy]=readEcosystemCatalog("MGR-LEGACY").entries;
  assert.ok(legacy && "localVerification" in legacy && legacy.localVerification);
  const proof=legacy.localVerification;
  assert.ok("startupSourceCommit" in proof);
  assert.equal(legacy.source.defaultBranch,"main");
  assert.notEqual(legacy.source.commit,proof.workflowSourceCommit);
  assert.notEqual(proof.workflowSourceCommit,proof.startupSourceCommit);
  assert.match(proof.workflowSourceCommit,/^[0-9a-f]{40}$/);
  assert.match(proof.startupSourceCommit,/^[0-9a-f]{40}$/);
  assert.equal(legacy.runtimeVerified,false);
  assert.deepEqual(legacy.integration.tools,[]);
});

test("Agents workflow evidence keeps its audit revision separate from the default source pin",()=>{
  const [agents]=readEcosystemCatalog("MGR-Agents").entries;
  assert.ok(agents && "localVerification" in agents && "branch" in agents.localVerification);
  assert.equal(agents.localVerification.branch,"audit/workflow-ownership-20261101");
  assert.match(agents.localVerification.workflowSourceCommit,/^[0-9a-f]{40}$/);
  assert.notEqual(agents.localVerification.workflowSourceCommit,agents.source.commit);
  assert.ok("handoffCommit" in agents.localVerification && "remaining" in agents.localVerification);
  assert.match(agents.localVerification.handoffCommit,/^[a-f0-9]{40}$/);
  assert.match(agents.localVerification.remaining,/Hosted Neon/);
  assert.equal(agents.localVerification.workflowSourceCommit,"c1f44f18bd7e17fd8e73dcde4374129c6b737db2");
  assert.match(agents.localVerification.scope,/owner catalog pagination/);
  assert.ok("workflowReadInterface" in agents);
  assert.deepEqual(agents.workflowReadInterface,{
    tool:"mgr_agents_workflow_read",enrollmentRequired:true,
    operations:["Owned workflow catalog","Saved history by workflow ID","Exact saved run","Exact saved tool receipt by run and receipt ID"],executionSupported:false,
  });
  assert.equal(agents.runtimeVerified,false);
  assert.deepEqual(agents.integration.tools,[]);
});

test("SignMe catalog separates unsigned draft proof from signing and default source",()=>{
  const [entry]=readEcosystemCatalog("MGR-SIGN-ME").entries;
  assert.ok(entry && "localVerification" in entry && "signmeSourceCommit" in entry.localVerification);
  assert.notEqual(entry.source.commit,entry.localVerification.signmeSourceCommit);
  assert.match(entry.localVerification.scope,/title search, exact immutable version history/);
  assert.match(entry.localVerification.scope,/unsigned download/);
  assert.match(entry.localVerification.remaining,/signing, sending/);
  assert.equal(entry.runtimeVerified,false);
  assert.deepEqual(entry.integration.tools,[]);
  assert.ok("draftReadInterface" in entry);
  assert.deepEqual(entry.draftReadInterface,{
    searchTool:"mgr_department_signme_search",historyTool:"mgr_department_signme_history",
    enrollmentRequired:true,scope:"departments:read",executionSupported:false,
  });
});
