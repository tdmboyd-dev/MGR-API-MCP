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
 ['mgr_department_forge_context',z.object({workspaceId:z.string().regex(/^[a-zA-Z0-9_.:-]{1,128}$/)}).strict()],
 ...['prepare','execute','status','artifact','cancel','resume'].map(name=>['mgr_department_'+name,departmentCommand] as [string,z.ZodType]),
 ['mgr_backpack_capability_map',z.object({}).strict()],
 ['mgr_backpack_capability_card',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/)}).strict()],
 ['mgr_backpack_context',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/)}).strict()],
 ['mgr_repository_manual',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),document:z.string().regex(/^(index|doc-[a-f0-9]{16})$/),startLine:z.number().int().min(1).max(999999),expectedCommit:z.string().regex(/^[a-f0-9]{40}$/).optional()}).strict()],
 ['code_monster_profile',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),prefixes:z.array(z.string().min(1).max(250)).max(32),revision:z.literal('HEAD'),continuation:z.string().min(1).max(32768).optional()}).strict()],
 ['code_monster_symbols',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),prefixes:z.array(z.string().min(1).max(250)).max(32),revision:z.literal('HEAD'),continuation:z.string().min(1).max(32768).optional(),symbol:z.string().max(256),limit:z.number().int().min(1).max(5),offset:z.number().int().min(0).max(999999).optional()}).strict()],
 ...['code_monster_references','code_monster_impact'].map(name=>[name,z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),prefixes:z.array(z.string().min(1).max(250)).max(32),revision:z.literal('HEAD'),continuation:z.string().min(1).max(32768).optional(),symbol:z.string().min(1).max(256),limit:z.number().int().min(1).max(5),offset:z.number().int().min(0).max(999999).optional()}).strict()] as [string,z.ZodType]),
 ['code_monster_outline',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),prefixes:z.array(z.string().min(1).max(250)).max(32),revision:z.literal('HEAD'),continuation:z.string().min(1).max(32768).optional(),symbol:z.string().max(256),limit:z.number().int().min(1).max(5),offset:z.number().int().min(0).max(999999).optional()}).strict()],
 ['code_monster_automation',z.object({project:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),prefixes:z.array(z.string().min(1).max(250)).max(32),revision:z.literal('HEAD'),limit:z.number().int().min(1).max(5),offset:z.number().int().min(0).max(999999).optional()}).strict()],
 ['mgr_department_context',z.object({}).strict()],['mgr_omnidev_candidate_binding',omniBindingInput],
 ['mgr_ecosystem_catalog',z.object({repoId:z.string().min(1).max(120).optional()}).strict()]
]);
const definitions=new Map([...schemas].map(([name,schema])=>[name,freeze({name,description:'Fixed trusted local department tool',inputSchema:{...JSON.parse(JSON.stringify(z.toJSONSchema(schema))),type:'object' as const}})]));

export function createOwnerDepartmentClient({endpoint,accessToken,tenantId,actorId,assertCurrent,fetcher=fetch}:{endpoint:string;accessToken:string;tenantId:string;actorId:string;assertCurrent:Current;fetcher?:typeof fetch}){
 const url=new URL(endpoint);
 if(url.href!==endpoint||url.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/mcp'||url.username||url.password||url.search||url.hash||!url.port)throw Error('owner-department-loopback-required');
 if(typeof accessToken!=='string'||accessToken.length<24||accessToken.length>8192||!/^[A-Za-z0-9._~+\/-]+=*$/.test(accessToken)||![tenantId,actorId].every(x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x))||typeof fetcher!=='function'||typeof assertCurrent!=='function'||types.isAsyncFunction(assertCurrent)||types.isGeneratorFunction(assertCurrent))throw Error('owner-department-host-required');
 const requests=new AsyncLocalStorage<{assertCurrent?:Current;sourceRead?:boolean;signal?:AbortSignal}>(),pending=new Set<Promise<Response>>(),controllers=new Set<AbortController>();let closed=false,busy=false,settled=true,connecting:Promise<void>|undefined,closing:Promise<void>|undefined;
 const current=()=>{if(closed)throw Error('owner-department-closed');const request=requests.getStore();request?.signal?.throwIfAborted();if(request?.assertCurrent)fence(request.assertCurrent);fence(assertCurrent);if(closed)throw Error('owner-department-closed');};
 const finish=()=>{if(settled&&pending.size===0)busy=false;};
 const guardedFetch:typeof fetch=(input,options={})=>{
  current();if((input instanceof Request?input.url:String(input))!==endpoint||options.method!=='POST')throw Error('owner-department-transport-denied');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),requests.getStore()?.sourceRead===true?60000:15000);controllers.add(controller);
  const inherited=requests.getStore()?.signal;const signal=AbortSignal.any([controller.signal,...(options.signal?[options.signal]:[]),...(inherited?[inherited]:[])]);
  const operation=(async()=>{let response:Response|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,consumed=false;try{current();signal.throwIfAborted();response=await fetcher(input,{...options,signal,redirect:'error'});current();signal.throwIfAborted();if(response.status>=300&&response.status<400)throw Error('owner-department-redirect-denied');
   let length=0;const chunks:Uint8Array[]=[];if(response.body){reader=response.body.getReader();for(;;){const {value,done}=await reader.read();if(done){consumed=true;break;}current();signal.throwIfAborted();length+=value.length;if(length>maximumBytes||chunks.length>=4096)throw Error('owner-department-response-limit');chunks.push(value);}}
   current();signal.throwIfAborted();return new Response(length?Buffer.concat(chunks):null,{status:response.status,statusText:response.statusText,headers:response.headers});
  }finally{controller.abort();try{if(!consumed){if(reader)await reader.cancel();else if(response?.body)await response.body.cancel();}}finally{reader?.releaseLock();clearTimeout(timer);controllers.delete(controller);}}})();pending.add(operation);void operation.finally(()=>{pending.delete(operation);finish();}).catch(()=>{});return operation;
 };
 const client=new Client({name:'tevin-local-department-owner',version:'1.0.0'}),transport=new StreamableHTTPClientTransport(url,{authProvider:{token:async()=>{current();return accessToken;}},fetch:guardedFetch});
 async function connect(){if(!connecting)connecting=(async()=>{current();await client.connect(transport,{timeout:15000});current();const result=await client.callTool({name:'mgr_department_context',arguments:{}},{timeout:15000,allowInputRequired:true,toolDefinition:definitions.get('mgr_department_context')!});current();if(result.isError||result.content.length!==1||result.content[0]?.type!=='text'||result.content[0].text.length>2048)throw Error('owner-department-principal-unconfirmed');const body=data(JSON.parse(result.content[0].text));if(Object.keys(body).sort().join(',')!=='actorId,schemaVersion,tenantId'||body.schemaVersion!==1||body.tenantId!==tenantId||body.actorId!==actorId)throw Error('owner-department-principal-mismatch');})();return connecting;}
 async function invoke(raw:unknown,context:{assertCurrent?:Current;signal?:AbortSignal}={},prepareOnly=false){
  const ds=Object.getOwnPropertyDescriptors(context);if(Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!['assertCurrent','signal'].includes(k)||(!ds[k]||!Object.hasOwn(ds[k]!,'value')))||ds.assertCurrent&&(typeof ds.assertCurrent.value!=='function'||types.isAsyncFunction(ds.assertCurrent.value)||types.isGeneratorFunction(ds.assertCurrent.value)))throw Error('owner-department-synchronous-context-required');
  if(ds.signal&&!(ds.signal.value instanceof AbortSignal))throw Error('owner-department-abort-signal-required');
  const request=prepareOnly?null:data(raw);if(request&&(Object.keys(request).sort().join(',')!=='arguments,name'||typeof request.name!=='string'||!schemas.has(request.name)))throw Error('owner-department-tool-denied');
  const args=request?schemas.get(request.name)!.parse(request.arguments):null;current();if(busy||pending.size)throw Error('owner-department-busy');busy=true;settled=false;
  const sourceRead=!!request&&['code_monster_profile','code_monster_symbols','code_monster_references','code_monster_impact','code_monster_outline','code_monster_automation'].includes(request.name);const requestContext:{assertCurrent?:Current;sourceRead?:boolean;signal?:AbortSignal}={...(ds.assertCurrent?{assertCurrent:ds.assertCurrent.value as Current}:{}),sourceRead,...(ds.signal?{signal:ds.signal.value as AbortSignal}:{})};return requests.run(Object.freeze(requestContext),async()=>{try{current();await connect();current();if(!request)return {ready:true};const result=await client.callTool({name:request.name,arguments:args as Record<string,unknown>},{timeout:sourceRead?60000:15000,allowInputRequired:true,toolDefinition:definitions.get(request.name)!});current();return result;}catch(error){const failure=Error('owner-department-request-unconfirmed');if(error&&typeof error==='object'&&'code' in error&&Number.isSafeInteger(error.code))Object.assign(failure,{code:error.code});throw failure;}finally{settled=true;finish();}});
 }
 return Object.freeze({callTool:(raw:unknown)=>invoke(raw),callToolWithContext:(raw:unknown,context:{assertCurrent?:Current;signal?:AbortSignal})=>invoke(raw,context),prepareForDispatch:(context:{assertCurrent?:Current;signal?:AbortSignal}={})=>invoke(null,context,true),status:()=>({closed,busy:busy||pending.size>0,pendingTransports:pending.size,liveVerified:false}),close(){if(closing)return closing;closed=true;for(const controller of controllers)controller.abort();closing=Promise.resolve().then(()=>client.close()).then(()=>Promise.allSettled([...pending])).then(()=>undefined);return closing;}});
}
