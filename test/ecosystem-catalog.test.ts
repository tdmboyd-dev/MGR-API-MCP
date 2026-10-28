import test from "node:test";
import assert from "node:assert/strict";
import { readEcosystemCatalog } from "../src/ecosystem-catalog.js";

test("ecosystem catalog keeps nineteen pinned and two explicitly empty repositories without claiming live tools",()=>{
  const catalog=readEcosystemCatalog();
  assert.equal(catalog.schemaVersion,"mgr.ecosystem.catalog.v1");
  assert.equal(catalog.entries.length,21);
  assert.equal(new Set(catalog.entries.map(e=>e.repoId)).size,21);
  for(const e of catalog.entries){if("commit" in e.source){assert.match(e.source.commit,/^[0-9a-f]{40}$/);}else{assert.ok(["MGR-OMNISIGHT","MGR-CODE-MONSTER"].includes(e.repoId));assert.equal(e.source.status,"empty-repository");assert.equal(e.integration.state,"under-construction/source-unavailable");}assert.equal(e.runtimeVerified,false);assert.deepEqual(e.integration.tools,[]);}
});
test("catalog filtering rejects unknown repositories and cannot mutate later responses",()=>{
  const first=readEcosystemCatalog("MGR-ONE");
  assert.equal(first.entries.length,1);
  first.entries.length=0;
  assert.equal(readEcosystemCatalog("MGR-ONE").entries.length,1);
  assert.throws(()=>readEcosystemCatalog("not-a-repo"),/Unknown ecosystem repository/);
});
