import test from "node:test";
import assert from "node:assert/strict";
import { LegacyEdgeClient } from "../src/legacy-client.js";
import { LegacyDispatchCoordinator } from "../src/legacy-dispatch.js";

test("dispatch coordinator reconciles a lost response by correlation receipt",async()=>{
  let postCount=0;
  const fetcher:typeof fetch=async(input,init)=>{
    const request=new Request(input,init);
    if(request.method==="POST"){
      postCount+=1;
      throw new Error("socket closed after dispatch");
    }
    return new Response(JSON.stringify([{
      receiptId:"receipt-1",
      correlationId:"corr-1",
      status:"succeeded",
      outcome:{contactId:"c1"}
    }]),{status:200});
  };

  const coordinator=new LegacyDispatchCoordinator(new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher
  }));

  const result=await coordinator.execute({
    tenantId:"tenant-1",
    actorId:"actor-1",
    correlationId:"corr-1",
    idempotencyKey:"idem-1"
  },{
    action:"crm.create_contact",
    payload:{firstName:"LostResponse"}
  });

  assert.equal(postCount,1,"coordinator must not blindly retry the mutation");
  assert.equal(result.state,"confirmed");
  if(result.state==="confirmed"){
    assert.equal(result.reconciled,true);
    assert.equal(result.result.receiptId,"receipt-1");
  }
});

test("dispatch coordinator preserves unknown external state when reconciliation is unavailable",async()=>{
  const fetcher:typeof fetch=async()=>{
    throw new Error("network unavailable");
  };

  const coordinator=new LegacyDispatchCoordinator(new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher
  }));

  const result=await coordinator.execute({
    tenantId:"tenant-1",
    actorId:"actor-1",
    correlationId:"corr-2",
    idempotencyKey:"idem-2"
  },{
    action:"crm.update_contact",
    payload:{id:"c1"}
  });

  assert.equal(result.state,"unknown_external_state");
  if(result.state==="unknown_external_state"){
    assert.equal(result.correlationId,"corr-2");
    assert.equal(result.idempotencyKey,"idem-2");
  }
});
