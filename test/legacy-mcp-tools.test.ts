import test from "node:test";
import assert from "node:assert/strict";
import { executeLegacyMcpCommand } from "../src/legacy-mcp-tools.js";
import { LegacyEdgeClient } from "../src/legacy-client.js";

test("authenticated Legacy MCP dispatch binds tenant and actor from auth context",async()=>{
  let capturedBody:any;
  let capturedTenant:string|null=null;

  const legacy=new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher:async(input,init)=>{
      const req=new Request(input,init);
      capturedTenant=req.headers.get("x-tenant-id");
      capturedBody=JSON.parse(await req.text());
      return new Response(JSON.stringify({
        accepted:true,
        correlationId:capturedBody.metadata.correlationId
      }),{status:200});
    }
  });

  const result=await executeLegacyMcpCommand({
    auth:{
      actorId:"actor-auth",
      tenantId:"tenant-auth",
      audience:"https://api.mgr.example/mcp",
      scopes:["tools:execute"],
      expiresAt:Date.now()+60_000
    },
    resourceAudience:"https://api.mgr.example/mcp",
    legacy
  },{
    action:"crm.update_contact",
    payload:{id:"contact-1"},
    risk:"low",
    correlationId:"corr-1",
    idempotencyKey:"idem-1"
  });

  assert.equal(result.accepted,true);
  assert.equal(capturedTenant,"tenant-auth");
  assert.equal(capturedBody.metadata.tenantId,"tenant-auth");
  assert.equal(capturedBody.metadata.userId,"actor-auth");
  assert.equal(capturedBody.metadata.correlationId,"corr-1");
  assert.equal(capturedBody.metadata.idempotencyKey,"idem-1");
});

test("authenticated Legacy MCP dispatch denies missing execute scope",async()=>{
  let called=false;
  const legacy=new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher:async()=>{
      called=true;
      return new Response(JSON.stringify({accepted:true}),{status:200});
    }
  });

  const result=await executeLegacyMcpCommand({
    auth:{
      actorId:"actor-auth",
      tenantId:"tenant-auth",
      audience:"https://api.mgr.example/mcp",
      scopes:["tools:read"],
      expiresAt:Date.now()+60_000
    },
    resourceAudience:"https://api.mgr.example/mcp",
    legacy
  },{
    action:"crm.update_contact",
    payload:{id:"contact-1"},
    risk:"low"
  });

  assert.equal(result.accepted,false);
  assert.equal(result.state,"DENY");
  assert.equal(called,false);
});


test("authenticated Legacy MCP write reconciles a lost response instead of blind retry",async()=>{
  let postCount=0;
  let receiptReads=0;
  const legacy=new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher:async(input,init)=>{
      const req=new Request(input,init);
      if(req.method==="POST"){
        postCount+=1;
        throw new Error("socket closed after dispatch");
      }
      receiptReads+=1;
      return new Response(JSON.stringify([{
        receiptId:"receipt-mcp-reconcile",
        correlationId:"corr-mcp-reconcile",
        status:"succeeded",
        outcome:{contactId:"contact-1"}
      }]),{status:200});
    }
  });

  const result=await executeLegacyMcpCommand({
    auth:{
      actorId:"actor-auth",
      tenantId:"tenant-auth",
      audience:"https://api.mgr.example/mcp",
      scopes:["tools:execute"],
      expiresAt:Date.now()+60_000
    },
    resourceAudience:"https://api.mgr.example/mcp",
    legacy
  },{
    action:"crm.create_contact",
    payload:{firstName:"Reconciled"},
    risk:"low",
    correlationId:"corr-mcp-reconcile",
    idempotencyKey:"idem-mcp-reconcile"
  });

  assert.equal(postCount,1);
  assert.equal(receiptReads,1);
  assert.equal(result.accepted,true);
  assert.equal(result.reconciled,true);
  assert.equal(result.receiptId,"receipt-mcp-reconcile");
});
