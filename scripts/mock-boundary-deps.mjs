import { createServer } from "node:http";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { writeFile } from "node:fs/promises";

const port=Number(process.env.MOCK_BOUNDARY_PORT ?? "9999");
const tokenFile=process.env.MCP_TEST_TOKEN_FILE ?? "/tmp/mgr-mcp-boundary-token";
const issuer=`http://127.0.0.1:${port}/`;
const audience=process.env.MCP_TEST_AUDIENCE ?? "https://127.0.0.1:8787/mcp";

const {publicKey,privateKey}=await generateKeyPair("RS256");
const jwk=await exportJWK(publicKey);
Object.assign(jwk,{kid:"mgr-boundary-test",alg:"RS256",use:"sig"});

const token=await new SignJWT({
  tenant_id:"tenant-boundary",
  scope:"tools:read tools:execute"
})
  .setProtectedHeader({alg:"RS256",kid:"mgr-boundary-test"})
  .setSubject("actor-boundary")
  .setIssuer(issuer)
  .setAudience(audience)
  .setIssuedAt()
  .setExpirationTime("30m")
  .sign(privateKey);

await writeFile(tokenFile,token,{mode:0o600});

const commands=new Map();
const receipts=new Map();
let mutationCount=0;

const server=createServer(async(req,res)=>{
  const url=new URL(req.url ?? "/",issuer);

  if(req.method==="GET" && url.pathname==="/jwks.json"){
    return json(res,200,{keys:[jwk]});
  }

  if(req.method==="GET" && url.pathname==="/metrics"){
    return json(res,200,{mutationCount,keys:[...commands.keys()]});
  }

  if(req.method==="GET" && url.pathname==="/v1/connectors"){
    return json(res,200,[{id:"mock-connector",status:"healthy"}]);
  }

  if(req.method==="GET" && url.pathname==="/v1/truth/summary"){
    return json(res,200,{
      total:receipts.size,
      succeeded:receipts.size,
      failed:0,
      blocked:0,
      approvalRate:1,
      totalProviderCost:0
    });
  }

  if(req.method==="GET" && url.pathname==="/v1/truth/receipts"){
    const correlationId=url.searchParams.get("correlationId");
    const list=[...receipts.values()].filter(item=>!correlationId || item.correlationId===correlationId);
    return json(res,200,list);
  }

  if(req.method==="POST" && url.pathname==="/v1/commands"){
    const idempotencyKey=req.headers["x-idempotency-key"];
    const correlationId=req.headers["x-correlation-id"];
    if(typeof idempotencyKey!=="string" || typeof correlationId!=="string"){
      return json(res,400,{error:"missing idempotency/correlation headers"});
    }

    const body=JSON.parse((await readBody(req)).toString("utf8"));
    const prior=commands.get(idempotencyKey);
    if(prior){
      return json(res,200,{...prior,replayed:true});
    }

    mutationCount+=1;
    const receiptId=`receipt-${mutationCount}`;
    const result={
      accepted:true,
      receiptId,
      correlationId,
      result:{
        mutationNumber:mutationCount,
        action:body.action
      },
      replayed:false
    };
    commands.set(idempotencyKey,result);
    receipts.set(correlationId,{
      receiptId,
      correlationId,
      status:"succeeded",
      outcome:result.result
    });

    if(body.action==="test.timeout_after_commit"){
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return json(res,200,result);
  }

  json(res,404,{error:"not found"});
});

server.listen(port,"0.0.0.0",()=>{
  console.log(JSON.stringify({event:"boundary_mocks_ready",port,issuer,audience,tokenFile}));
});

process.on("SIGTERM",()=>server.close(()=>process.exit(0)));
process.on("SIGINT",()=>server.close(()=>process.exit(0)));

function json(res,status,body){
  res.statusCode=status;
  res.setHeader("content-type","application/json");
  res.end(JSON.stringify(body));
}

async function readBody(req){
  const chunks=[];
  for await(const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}
