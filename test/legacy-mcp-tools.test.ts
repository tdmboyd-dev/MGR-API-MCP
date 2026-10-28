import {legacyRequestDigest} from "../src/legacy-client.js";
import test from "node:test";
import assert from "node:assert/strict";
import { executeLegacyMcpCommand,registerLegacyMcpTools } from "../src/legacy-mcp-tools.js";
import { LegacyEdgeClient } from "../src/legacy-client.js";

test('caller low-risk label cannot admit unknown, messaging, deletion or financial actions',async()=>{
 let calls=0;const legacy=new LegacyEdgeClient({baseUrl:'https://legacy.example/',fetcher:async()=>{calls++;return Response.json({accepted:true});}});
 const options={auth:{actorId:'actor',tenantId:'tenant',audience:'edge',scopes:['tools:execute'],expiresAt:Date.now()+60000},resourceAudience:'edge',legacy};
 for(const action of ['communication.send','payments.transfer','crm.delete_contact','unknown.action']){
  const result=await executeLegacyMcpCommand(options,{action,payload:{},risk:'low'});
  assert.equal(result.accepted,false);assert.equal(result.state,'REQUIRE_APPROVAL');
 }
 assert.equal(calls,0);
});

for(const name of ['mgr_truth_summary','mgr_legacy_connectors'])test(name+' denies missing scope and expiry while read is pending',async()=>{
 const handlers=new Map<string,any>(),auth={actorId:'actor',tenantId:'tenant',audience:'edge',scopes:['tools:execute'],expiresAt:Date.now()+60000};let reads=0;
 const legacy=new LegacyEdgeClient({baseUrl:'https://legacy.example/',fetcher:async()=>{reads++;auth.expiresAt=0;return Response.json({private:'PRIVATE_RECORD'});}});
 registerLegacyMcpTools({registerTool:(name:string,_:unknown,f:any)=>handlers.set(name,f)} as any,{auth,resourceAudience:'edge',legacy});
 assert.equal((await handlers.get(name)({})).isError,true);assert.equal(reads,0);
 auth.scopes=['tools:read'];const result=await handlers.get(name)({});assert.equal(reads,1);assert.equal(result.isError,true);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_RECORD/);
});

test('generic Legacy result cannot publish after token expiry during effect',async()=>{
 const auth={actorId:'actor',tenantId:'tenant',audience:'edge',scopes:['tools:execute'],expiresAt:Date.now()+60000};let calls=0;
 const legacy=new LegacyEdgeClient({baseUrl:'https://legacy.example/',fetcher:async()=>{calls++;auth.expiresAt=0;return Response.json({accepted:true,private:'PRIVATE_RECORD'});}});
 await assert.rejects(executeLegacyMcpCommand({auth,resourceAudience:'edge',legacy},{action:'crm.create_contact',payload:{firstName:'Test'},risk:'low'}),/authorization expired/);assert.equal(calls,1);
});

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
        tenantId:"tenant-auth",scope:{tenantId:"tenant-auth"},actor:{actorType:"service",actorId:"actor-auth",tenantId:"tenant-auth"},action:"crm.create_contact",evidence:{idempotencyKey:"idem-mcp-reconcile",requestDigest:legacyRequestDigest({tenantId:"tenant-auth",actorId:"actor-auth",correlationId:"corr-mcp-reconcile",idempotencyKey:"idem-mcp-reconcile"},{action:"crm.create_contact",payload:{firstName:"Reconciled"}})},
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
