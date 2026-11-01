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
