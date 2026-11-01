import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("MGR-API-MCP complete baseline file map and actual shared-bridge handbook stay linked",()=>{
 const s=JSON.parse(readFileSync("evidence/audits/2026-10-31-baseline-static-inventory.json","utf8"));
 assert.equal(s.tracked_file_count,169);
 assert.equal(s.all_tracked_file_sha256_bytes_and_parse_classifications.length,169);
 assert.deepEqual(s.errors,[]);
 const handbook=readFileSync("docs/API-MCP-ENGINEERING-HANDBOOK.md","utf8");
 for(const p of ["src/mcp-server.ts","src/forge-mcp-tools.ts","src/forge-catalog-client.ts","src/authz.ts","src/http-server.ts"]){
   assert.ok(handbook.includes(p),p);
 }
 assert.match(handbook,/MGR-API-MCP is|MGR API\/MCP/);
 const handoff=readFileSync("HANDOFF.md","utf8");
 assert.ok(handoff.includes("API-MCP-ENGINEERING-HANDBOOK.md"));
});
