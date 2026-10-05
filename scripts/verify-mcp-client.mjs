import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const base=required("MCP_TEST_BASE_URL").replace(/\/$/,"");
const token=required("MCP_TEST_BEARER_TOKEN");
const mode=process.env.MCP_TEST_MODE ?? "full";

const client=new Client({name:"mgr-boundary-proof",version:"1.0.0"});
const transport=new StreamableHTTPClientTransport(new URL(`${base}/mcp`),{
  authProvider:{token:async()=>token}
});

await client.connect(transport);
try{
  if(mode==="restart-replay"){
    const replay=await callExecute({
      action:"test.restart_seed",
      payload:{phase:"after-restart"},
      correlationId:"corr-restart-seed",
      idempotencyKey:"idem-restart-seed"
    });
    assert(replay.accepted===true,"restart replay was not accepted");
    assert(replay.replayed===true,"restart replay did not reuse authoritative Legacy result");
    console.log(JSON.stringify({ok:true,mode,restartReplay:"pass",receiptId:replay.receiptId}));
  }else{
    const first=await callExecute({
      action:"test.duplicate",
      payload:{sequence:1},
      correlationId:"corr-duplicate-boundary",
      idempotencyKey:"idem-duplicate-boundary"
    });
    const second=await callExecute({
      action:"test.duplicate",
      payload:{sequence:1},
      correlationId:"corr-duplicate-boundary",
      idempotencyKey:"idem-duplicate-boundary"
    });
    assert(first.accepted===true,"first duplicate probe failed");
    assert(second.accepted===true && second.replayed===true,"duplicate delivery was not replayed");

    const timeout=await callExecute({
      action:"test.timeout_after_commit",
      payload:{sequence:2},
      correlationId:"corr-timeout-boundary",
      idempotencyKey:"idem-timeout-boundary"
    });
    assert(timeout.accepted===true,"timeout probe did not reconcile to accepted");
    assert(timeout.reconciled===true,"timeout probe did not report reconciliation");

    const seed=await callExecute({
      action:"test.restart_seed",
      payload:{phase:"before-restart"},
      correlationId:"corr-restart-seed",
      idempotencyKey:"idem-restart-seed"
    });
    assert(seed.accepted===true && seed.replayed!==true,"restart seed failed");

    console.log(JSON.stringify({
      ok:true,
      mode,
      duplicateDelivery:"pass",
      timeoutReconciliation:"pass",
      restartSeed:"pass",
      duplicateReceiptId:second.receiptId,
      timeoutReceiptId:timeout.receiptId,
      restartReceiptId:seed.receiptId
    }));
  }
}finally{
  await client.close();
}

async function callExecute({action,payload,correlationId,idempotencyKey}){
  const result=await client.callTool({
    name:"mgr_legacy_execute",
    arguments:{
      action,
      payload,
      risk:"low",
      correlationId,
      idempotencyKey
    }
  });
  const block=result.content?.find(item=>item.type==="text");
  if(!block || block.type!=="text") throw new Error("MCP tool result missing text content");
  return JSON.parse(block.text);
}

function required(name){
  const value=process.env[name];
  if(!value) throw new Error(`${name} is required`);
  return value;
}
function assert(condition,message){
  if(!condition) throw new Error(message);
}
