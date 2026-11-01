import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const plugin=resolve("integrations/rea-xray-plugin");
const manifest=JSON.parse(readFileSync(join(plugin,"plugin.json"),"utf8"));
const mcp=JSON.parse(readFileSync(join(plugin,"mcp.json"),"utf8"));

test("MGR REA plugin is portable, pinned and does not register unrestricted REA MCP",()=>{
  assert.equal(manifest.name,"mgr-rea-xray");
  assert.equal(manifest.version,"0.1.0");
  const servers=Object.values(mcp.mcpServers) as Array<Record<string,unknown>>;
  assert.equal(servers.length,1);
  assert.equal(servers[0]?.type,"stdio");
  assert.equal(servers[0]?.command,"node");
  assert.ok(JSON.stringify(servers[0]?.args).includes("rea-safe-mcp.mjs"));
  const pin=JSON.parse(readFileSync(join(plugin,"rea-dependency-pin.json"),"utf8"));
  assert.equal(pin.npm_version,"6.8.0");
  assert.equal(pin.root_rea_license,"MIT");
  assert.equal(pin.remote_chat_mobile_supported_without_bridge,false);
});

test("the real plugin MCP starts without REA and blocks arbitrary system-file inspection",()=>{
  const server=join(plugin,"server/rea-safe-mcp.mjs");
  const messages=[
    {jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25"}},
    {jsonrpc:"2.0",id:2,method:"tools/list",params:{}},
    {jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"mgr_rea_inspect_artifact",
                                                 arguments:{path:"../../etc/passwd"}}}
  ];
  const proc=spawnSync(process.execPath,[server],{
    cwd:plugin,input:messages.map(x=>JSON.stringify(x)).join("\n")+"\n",
    encoding:"utf8",timeout:15000,maxBuffer:2_000_000});
  assert.equal(proc.error,undefined,String(proc.error));
  assert.equal(proc.status,0,proc.stderr||proc.stdout);
  const replies=proc.stdout.trim().split("\n").map(x=>JSON.parse(x));
  assert.equal(replies.length,3);
  assert.equal(replies[0].result.serverInfo.name,"mgr-rea-xray");
  assert.equal(replies[1].result.tools.length,1);
  assert.equal(replies[1].result.tools[0].name,"mgr_rea_inspect_artifact");
  assert.equal(replies[2].result.isError,true);
  assert.match(replies[2].result.content[0].text,/outside authorized workspace/);
});
