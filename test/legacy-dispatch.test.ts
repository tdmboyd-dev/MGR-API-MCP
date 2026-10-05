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


test("dispatch timeout reconciles through authoritative Legacy receipt without mutation retry",async()=>{
  let postCount=0;
  let receiptReads=0;
  const fetcher:typeof fetch=async(input,init)=>{
    const request=new Request(input,init);
    if(request.method==="POST"){
      postCount+=1;
      return await new Promise<Response>((_resolve,reject)=>{
        const signal=init?.signal;
        const onAbort=()=>reject(signal?.reason ?? new DOMException("Aborted","AbortError"));
        if(signal?.aborted) return onAbort();
        signal?.addEventListener("abort",onAbort,{once:true});
      });
    }
    receiptReads+=1;
    return new Response(JSON.stringify([{
      receiptId:"receipt-timeout",
      correlationId:"corr-timeout",
      status:"succeeded",
      outcome:{contactId:"c-timeout"}
    }]),{status:200});
  };

  const coordinator=new LegacyDispatchCoordinator(new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher,
    timeoutMs:10
  }));

  const result=await coordinator.execute({
    tenantId:"tenant-1",
    actorId:"actor-1",
    correlationId:"corr-timeout",
    idempotencyKey:"idem-timeout"
  },{
    action:"crm.create_contact",
    payload:{firstName:"TimeoutButCommitted"}
  });

  assert.equal(postCount,1,"timed-out mutation must not be blindly retried");
  assert.equal(receiptReads,1,"coordinator must reconcile against Legacy truth");
  assert.equal(result.state,"confirmed");
  if(result.state==="confirmed"){
    assert.equal(result.reconciled,true);
    assert.equal(result.result.receiptId,"receipt-timeout");
  }
});

test("duplicate delivery preserves one business mutation through the same idempotency key",async()=>{
  let businessMutationCount=0;
  const seen=new Map<string,{receiptId:string;correlationId:string;result:unknown;replayed:boolean}>();
  const fetcher:typeof fetch=async(input,init)=>{
    const request=new Request(input,init);
    if(request.method!=="POST") return new Response("[]",{status:200});
    const key=request.headers.get("x-idempotency-key");
    const correlationId=request.headers.get("x-correlation-id") ?? "";
    assert.ok(key);
    const prior=seen.get(key);
    if(prior){
      return new Response(JSON.stringify({...prior,replayed:true}),{status:200});
    }
    businessMutationCount+=1;
    const committed={
      receiptId:"receipt-duplicate",
      correlationId,
      result:{contactId:"c-duplicate"},
      replayed:false
    };
    seen.set(key,committed);
    return new Response(JSON.stringify(committed),{status:200});
  };

  const coordinator=new LegacyDispatchCoordinator(new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher
  }));
  const context={
    tenantId:"tenant-1",
    actorId:"actor-1",
    correlationId:"corr-duplicate",
    idempotencyKey:"idem-duplicate"
  };
  const request={
    action:"crm.create_contact",
    payload:{firstName:"DuplicateDelivery"}
  };

  const first=await coordinator.execute(context,request);
  const second=await coordinator.execute(context,request);

  assert.equal(businessMutationCount,1);
  assert.equal(first.state,"confirmed");
  assert.equal(second.state,"confirmed");
  if(second.state==="confirmed"){
    assert.equal(second.result.replayed,true);
    assert.equal(second.result.receiptId,"receipt-duplicate");
  }
});
