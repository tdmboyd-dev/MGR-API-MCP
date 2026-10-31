import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve("integrations/forge-creator-plugin");

test("MGR Forge Creator is a truthful skills-only package with no fake hosted MCP URL",()=>{
  const manifest=JSON.parse(readFileSync(join(root,"plugin.json"),"utf8"));
  assert.equal(manifest.name,"mgr-forge-creator");
  assert.equal(manifest.version,"0.1.0");
  assert.equal(manifest["$schema"],"https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(manifest.extensions["com.openai"].interface.displayName,"MGR Forge Creator");
  assert.ok(manifest.extensions["com.openai"].interface.shortDescription.length<=30);
  assert.equal(existsSync(join(root,"mcp.json")),false);
  const skill=readFileSync(join(root,"skills/mgr-forge-create/SKILL.md"),"utf8");
  assert.match(skill,/^---\nname: mgr-forge-create/);
  assert.match(skill,/TOOLS?/i);
  assert.match(skill,/not.*mobile|mobile.*not/i);
  assert.match(skill,/artifact/i);
  assert.match(skill,/tools:execute/);
  assert.match(skill,/MGR-API-MCP/);
});
