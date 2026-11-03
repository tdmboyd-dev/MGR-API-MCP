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
  assert.equal(agents.runtimeVerified,false);
  assert.deepEqual(agents.integration.tools,[]);
});
