import test from "node:test";
import assert from "node:assert/strict";
import { LegacyEdgeClient } from "../src/legacy-client.js";

test("Legacy client propagates tenant actor correlation and idempotency",async()=>{
  let captured:Request|undefined;
  const fetcher:typeof fetch=async(input,init)=>{
    captured=new Request(input,init);
    return new Response(JSON.stringify({accepted:true}),{
      status:200,
      headers:{"content-type":"application/json"}
    });
  };
  const client=new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    bearerToken:"edge-token",
    fetcher
  });
  const result=await client.execute({
    tenantId:"tenant-1",
    actorId:"actor-1",
    correlationId:"corr-1",
    idempotencyKey:"idem-1"
  },{
    action:"crm.update_contact",
    payload:{id:"contact-1",phone:"555"}
  });

  assert.equal(result.accepted,true);
  assert.equal(captured?.headers.get("x-tenant-id"),"tenant-1");
  assert.equal(captured?.headers.get("x-actor-id"),"actor-1");
  assert.equal(captured?.headers.get("x-correlation-id"),"corr-1");
  assert.equal(captured?.headers.get("x-idempotency-key"),"idem-1");
  assert.equal(captured?.headers.get("authorization"),"Bearer edge-token");

  const body=JSON.parse(await captured!.text());
  assert.equal(body.metadata.tenantId,"tenant-1");
  assert.equal(body.metadata.userId,"actor-1");
  assert.equal(body.metadata.correlationId,"corr-1");
  assert.equal(body.metadata.idempotencyKey,"idem-1");
});

test("Legacy client reads Truth Console summary",async()=>{
  const fetcher:typeof fetch=async()=>new Response(JSON.stringify({
    total:3,succeeded:2,failed:1,blocked:0,approvalRate:0.5,totalProviderCost:1.25
  }),{status:200});
  const client=new LegacyEdgeClient({baseUrl:"https://legacy.example/",fetcher});
  const summary=await client.truthSummary("tenant-1",{actorId:"agent-1"});
  assert.equal(summary.total,3);
  assert.equal(summary.totalProviderCost,1.25);
});
