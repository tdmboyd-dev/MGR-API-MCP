// Trusted local-only wrapper for the existing SDK transport. No grants, model,
// service startup, discovery endpoint, OAuth flow or automatic mutation retry.
import {AsyncLocalStorage} from 'node:async_hooks';
import {types} from 'node:util';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import * as z from 'zod/v4';
import {departmentCommand} from '../src/department-gateway.js';
import {omniBindingInput} from '../src/omnidev-client.js';

type Current=()=>unknown;
const promiseThen=Promise.prototype.then,maximumBytes=16*1024*1024;
function fence(fn:Current){
 if(typeof fn!=='function'||types.isAsyncFunction(fn)||types.isGeneratorFunction(fn))throw Error('owner-department-synchronous-context-required');
 const value=fn();if(types.isPromise(value)){Reflect.apply(promiseThen,value,[()=>{},()=>{}]);throw Error('owner-department-synchronous-context-required');}
 let object=value;for(let depth=0;object!==null&&(typeof object==='object'||typeof object==='function');depth++,object=Object.getPrototypeOf(object))if(depth>=8||Object.getOwnPropertyDescriptor(object,'then'))throw Error('owner-department-synchronous-context-required');
}
function data(value:unknown,depth=0,budget={bytes:0,nodes:0}):any{
 if(depth>24||++budget.nodes>10000)throw Error('owner-department-input-limit');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('owner-department-input-denied');return value;}
 if(typeof value==='string'){budget.bytes+=Buffer.byteLength(value);if(budget.bytes>524288||Buffer.from(value,'utf8').toString('utf8')!==value)throw Error('owner-department-input-limit');return value;}
 if(!value||typeof value!=='object'||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value)))throw Error('owner-department-input-denied');
 const array=Array.isArray(value),keys=Reflect.ownKeys(value),out:any=array?[]:{};
 if(array&&(value.length>1000||keys.length!==value.length+1))throw Error('owner-department-input-denied');
 for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d?.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9][0-9]*)$/.test(key))throw Error('owner-department-input-denied');Object.defineProperty(out,key,{value:data(d.value,depth+1,budget),enumerable:true,writable:true,configurable:true});}
 return out;
}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
const schemas=new Map<string,z.ZodType>([
 ...['execute','status','artifact','cancel','resume'].map(name=>['mgr_department_'+name,departmentCommand] as [string,z.ZodType]),
 ['mgr_department_context',z.object({}).strict()],['mgr_omnidev_candidate_binding',omniBindingInput],
 ['mgr_ecosystem_catalog',z.object({repoId:z.string().min(1).max(120).optional()}).strict()]
]);
const definitions=new Map([...schemas].map(([name,schema])=>[name,freeze({name,description:'Fixed trusted local department tool',inputSchema:{...JSON.parse(JSON.stringify(z.toJSONSchema(schema))),type:'object' as const}})]));

export function createOwnerDepartmentClient({endpoint,accessToken,tenantId,actorId,assertCurrent,fetcher=fetch}:{endpoint:string;accessToken:string;tenantId:string;actorId:string;assertCurrent:Current;fetcher?:typeof fetch}){
 const url=new URL(endpoint);
 if(url.href!==endpoint||url.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/mcp'||url.username||url.password||url.search||url.hash||!url.port)throw Error('owner-department-loopback-required');
 if(typeof accessToken!=='string'||accessToken.length<24||accessToken.length>8192||!/^[A-Za-z0-9._~+\/-]+=*$/.test(accessToken)||![tenantId,actorId].every(x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x))||typeof fetcher!=='function'||typeof assertCurrent!=='function'||types.isAsyncFunction(assertCurrent)||types.isGeneratorFunction(assertCurrent))throw Error('owner-department-host-required');
 const requests=new AsyncLocalStorage<{assertCurrent?:Current}>(),pending=new Set<Promise<Response>>(),controllers=new Set<AbortController>();let closed=false,busy=false,settled=true,connecting:Promise<void>|undefined,closing:Promise<void>|undefined;
 const current=()=>{if(closed)throw Error('owner-department-closed');const request=requests.getStore();if(request?.assertCurrent)fence(request.assertCurrent);fence(assertCurrent);if(closed)throw Error('owner-department-closed');};
 const finish=()=>{if(settled&&pending.size===0)busy=false;};
 const guardedFetch:typeof fetch=(input,options={})=>{
  current();if((input instanceof Request?input.url:String(input))!==endpoint||options.method!=='POST')throw Error('owner-department-transport-denied');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);controllers.add(controller);
  const signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
  const operation=(async()=>{let response:Response|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,consumed=false;try{current();signal.throwIfAborted();response=await fetcher(input,{...options,signal,redirect:'error'});current();signal.throwIfAborted();if(response.status>=300&&response.status<400)throw Error('owner-department-redirect-denied');
   let length=0;const chunks:Uint8Array[]=[];if(response.body){reader=response.body.getReader();for(;;){const {value,done}=await reader.read();if(done){consumed=true;break;}current();signal.throwIfAborted();length+=value.length;if(length>maximumBytes||chunks.length>=4096)throw Error('owner-department-response-limit');chunks.push(value);}}
   current();signal.throwIfAborted();return new Response(length?Buffer.concat(chunks):null,{status:response.status,statusText:response.statusText,headers:response.headers});
  }finally{controller.abort();try{if(!consumed){if(reader)await reader.cancel();else if(response?.body)await response.body.cancel();}}finally{reader?.releaseLock();clearTimeout(timer);controllers.delete(controller);}}})();pending.add(operation);void operation.finally(()=>{pending.delete(operation);finish();}).catch(()=>{});return operation;
 };
 const client=new Client({name:'tevin-local-department-owner',version:'1.0.0'}),transport=new StreamableHTTPClientTransport(url,{authProvider:{token:async()=>{current();return accessToken;}},fetch:guardedFetch});
 async function connect(){if(!connecting)connecting=(async()=>{current();await client.connect(transport,{timeout:15000});current();const result=await client.callTool({name:'mgr_department_context',arguments:{}},{timeout:15000,allowInputRequired:true,toolDefinition:definitions.get('mgr_department_context')!});current();if(result.isError||result.content.length!==1||result.content[0]?.type!=='text'||result.content[0].text.length>2048)throw Error('owner-department-principal-unconfirmed');const body=data(JSON.parse(result.content[0].text));if(Object.keys(body).sort().join(',')!=='actorId,schemaVersion,tenantId'||body.schemaVersion!==1||body.tenantId!==tenantId||body.actorId!==actorId)throw Error('owner-department-principal-mismatch');})();return connecting;}
 async function invoke(raw:unknown,context:{assertCurrent?:Current}={},prepareOnly=false){
  const ds=Object.getOwnPropertyDescriptors(context);if(Reflect.ownKeys(ds).some(k=>k!=='assertCurrent'||(!ds[k]||!Object.hasOwn(ds[k]!,'value')))||ds.assertCurrent&&(typeof ds.assertCurrent.value!=='function'||types.isAsyncFunction(ds.assertCurrent.value)||types.isGeneratorFunction(ds.assertCurrent.value)))throw Error('owner-department-synchronous-context-required');
  const request=prepareOnly?null:data(raw);if(request&&(Object.keys(request).sort().join(',')!=='arguments,name'||typeof request.name!=='string'||!schemas.has(request.name)))throw Error('owner-department-tool-denied');
  const args=request?schemas.get(request.name)!.parse(request.arguments):null;current();if(busy||pending.size)throw Error('owner-department-busy');busy=true;settled=false;
  const requestContext:{assertCurrent?:Current}=ds.assertCurrent?{assertCurrent:ds.assertCurrent.value as Current}:{};return requests.run(Object.freeze(requestContext),async()=>{try{current();await connect();current();if(!request)return {ready:true};const result=await client.callTool({name:request.name,arguments:args as Record<string,unknown>},{timeout:15000,allowInputRequired:true,toolDefinition:definitions.get(request.name)!});current();return result;}catch{throw Error('owner-department-request-unconfirmed');}finally{settled=true;finish();}});
 }
 return Object.freeze({callTool:(raw:unknown)=>invoke(raw),callToolWithContext:(raw:unknown,context:{assertCurrent?:Current})=>invoke(raw,context),prepareForDispatch:(context:{assertCurrent?:Current}={})=>invoke(null,context,true),status:()=>({closed,busy:busy||pending.size>0,pendingTransports:pending.size,liveVerified:false}),close(){if(closing)return closing;closed=true;for(const controller of controllers)controller.abort();closing=Promise.resolve().then(()=>client.close()).then(()=>Promise.allSettled([...pending])).then(()=>undefined);return closing;}});
}
