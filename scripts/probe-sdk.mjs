import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const source = resolve('.local/vendor/typesafe-sdk-js/src');
const build = resolve('.local/sdk-inspection-runtime');
function compile(dir) {
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) { compile(file); continue; }
    if (!file.endsWith('.ts')) continue;
    const target = resolve(build, relative(source,file).replace(/\.ts$/,'.mjs'));
    mkdirSync(dirname(target),{recursive:true});
    const code = stripTypeScriptTypes(readFileSync(file,'utf8'))
      .replace(/(from\s+["'])(\.[^"']+)(["'])/g, '$1$2.mjs$3');
    writeFileSync(target,code);
  }
}
compile(source);
const {TypeSafeClient, choice, score, APIUserAbortError} = await import(pathToFileURL(resolve(build,'index.mjs')));
const rows=[];
async function check(name, fn){try {const observed=await fn(); rows.push({name,status:'PASS',observed});} catch(error) {rows.push({name,status:'FAIL',error:String(error)});}}
const valid={model:'jev-1.13.0',answers:{route:{type:'choice',choice:'read',confidence:1,probabilities:{read:1,write:0}}},usage:{input_tokens:1,output_tokens:1}};
const request={state:'SYNTHETIC_TEST_ONLY',questions:{route:choice('Select handler',{read:'Read',write:'Write'})}};
const config={apiKey:'SYNTHETIC_TEST_KEY',baseURL:'http://localhost.invalid',retry:{maxRetries:0}};
await check('Valid typed response passes through',async()=>{const client=new TypeSafeClient({...config,fetch:async()=>Response.json(valid)}); assert.deepEqual(await client.systemOne(request),valid); return 'Expected payload returned; transport simulated locally.';});
await check('Malformed 200 JSON is not runtime-schema rejected',async()=>{const client=new TypeSafeClient({...config,fetch:async()=>Response.json({unexpected:true})}); assert.deepEqual(await client.systemOne(request),{unexpected:true});return 'Confirmed runtime boundary validation is needed in consuming application.';});
await check('Empty choice criteria reaches injected transport',async()=>{let calls=0;const client=new TypeSafeClient({...config,fetch:async()=>{calls++;return Response.json(valid);}});await client.systemOne({state:'test',questions:{route:choice('route',{})}});assert.equal(calls,1);return 'Client does not reject empty choice locally; actual API may reject it.';});
await check('Invalid score is rejected before transport',async()=>{let calls=0;const client=new TypeSafeClient({...config,fetch:async()=>{calls++;return Response.json(valid);}});assert.throws(()=>client.systemOne({state:'test',questions:{rating:score('rate',['only'])}}));assert.equal(calls,0);return 'Local score minimum validation works.';});
await check('Debug logging contains synthetic request body',async()=>{const logs=[];const sink={debug:(...x)=>logs.push(x),info:()=>{},warn:()=>{},error:()=>{}};const client=new TypeSafeClient({...config,logLevel:'debug',logger:sink,fetch:async()=>Response.json(valid)});await client.systemOne(request);assert.ok(JSON.stringify(logs).includes('SYNTHETIC_TEST_ONLY'));assert.ok(!JSON.stringify(logs).includes('SYNTHETIC_TEST_KEY'));return 'Body present, standard authorization secret masked. Do not enable raw debug payload logging for private tasks.';});
await check('429 retries once when explicitly configured',async()=>{let calls=0;const client=new TypeSafeClient({...config,retry:{maxRetries:1,backoffInitialMs:0},fetch:async()=>++calls===1?Response.json({error:'synthetic rate limit'},{status:429}):Response.json(valid)});await client.systemOne(request);assert.equal(calls,2);return 'One synthetic 429 then valid response; two attempts.';});
await check('Pre-cancelled request surfaces cancellation',async()=>{const controller=new AbortController();controller.abort();const client=new TypeSafeClient({...config,fetch:async(_url,init)=>{init.signal.throwIfAborted();return Response.json(valid);}});await assert.rejects(client.systemOne(request,{signal:controller.signal}),APIUserAbortError);return 'Cancellation recognized with cooperative injected fetch.';});
mkdirSync('.local/evidence',{recursive:true});
const report={scope:'TypeSafe SDK 0.6.0 local source probes. Synthetic injected transport only; no real API calls, credentials or provider verification.',results:rows};
writeFileSync('.local/evidence/typesafe-sdk-probes.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(rows.some(x=>x.status==='FAIL'))process.exitCode=1;
