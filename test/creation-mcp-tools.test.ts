import test from "node:test";
import assert from "node:assert/strict";
import { executeCreationMcpCommand } from "../src/creation-mcp-tools.js";

test("Creation MCP dispatch binds authenticated tenant and actor",async()=>{
  let captured:any;
  const result=await executeCreationMcpCommand({
    auth:{
      actorId:"actor-1",
      tenantId:"tenant-1",
      audience:"https://api.mgr.example/mcp",
      scopes:["creation:execute"],
      expiresAt:Date.now()+60_000
    },
    resourceAudience:"https://api.mgr.example/mcp",
    creation:{
      async execute(request){
        captured=request;
        return {
          requestId:request.requestId,
          status:"SUCCEEDED",
          artifactRefs:["artifact-1"],
          evidenceRefs:["evidence-1"]
        };
      }
    }
  },{
    workspaceId:"workspace-1",
    capability:"image.generate",
    input:{prompt:"test"},
    acceptanceCriteria:["image exists"],
    risk:"low",
    correlationId:"corr-1"
  });

  assert.equal(result.accepted,true);
  assert.equal(captured.tenantId,"tenant-1");
  assert.equal(captured.input.actorId,"actor-1");
  assert.equal(captured.input.correlationId,"corr-1");
});

test("Creation MCP dispatch refuses missing scope",async()=>{
  let called=false;
  const result=await executeCreationMcpCommand({
    auth:{
      actorId:"actor-1",
      tenantId:"tenant-1",
      audience:"https://api.mgr.example/mcp",
      scopes:["tools:read"],
      expiresAt:Date.now()+60_000
    },
    resourceAudience:"https://api.mgr.example/mcp",
    creation:{
      async execute(request){
        called=true;
        return {
          requestId:request.requestId,
          status:"SUCCEEDED",
          artifactRefs:[],
          evidenceRefs:[]
        };
      }
    }
  },{
    workspaceId:"workspace-1",
    capability:"image.generate",
    input:{},
    acceptanceCriteria:["done"],
    risk:"low"
  });

  assert.equal(result.accepted,false);
  assert.equal(result.state,"DENY");
  assert.equal(called,false);
});
