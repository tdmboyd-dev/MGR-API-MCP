// Controlled failure injection, never a real process signal/provider/OS stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Readable} from 'node:stream';
import ts from 'typescript';
import {createHttpShutdownController,type OwnedDeadline} from '../src/http-shutdown.js';
import {buildProtectedResourceMetadata} from '../src/oauth-metadata.js';
function deferred(){let resolve!:()=>void,reject!:(error:unknown)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function fixture({listenerThrow,handlerThrow,forceThrow,refThrow,reportThrow}:{listenerThrow?:unknown;handlerThrow?:unknown;forceThrow?:unknown;refThrow?:unknown;reportThrow?:unknown}={}){
 const trace:string[]=[],exits:number[]=[],exitCodes:number[]=[],logs:unknown[]=[],handler=deferred();let callback:((error?:Error)=>void)|undefined,fire!:()=>void,referenced=false,cleared=false;
 const server={close(fn:(error?:Error)=>void){trace.push('listener');callback=fn;if(listenerThrow!==undefined)throw listenerThrow;},closeAllConnections(){trace.push('force');if(forceThrow!==undefined)throw forceThrow;}};
 const ownedHandler={close(){trace.push('handler');if(handlerThrow!==undefined)throw handlerThrow;return handler.promise;}};
 const timer={ref(){trace.push('ref');if(refThrow!==undefined)throw refThrow;referenced=true;}};
 const controller=createHttpShutdownController({server,handler:ownedHandler,report:record=>{logs.push(record);if(reportThrow!==undefined)throw reportThrow;},exit:code=>{trace.push('exit');exits.push(code);},setExitCode:code=>{trace.push('exit-code-'+code);exitCodes.push(code);},setDeadline:(fn,ms)=>{trace.push('deadline');assert.equal(ms,10000);fire=fn;return timer;},clearDeadline:handle=>{assert.equal(handle,timer);trace.push('clear');cleared=true;referenced=false;}});
 return{controller,trace,exits,exitCodes,logs,handler,listener:(error?:Error)=>{assert.ok(callback);callback(error);},fire:()=>fire(),referenced:()=>referenced,cleared:()=>cleared};
}
for(const first of ['listener','handler'])test('no success until both owners confirm, '+first+' settles first',async()=>{
 const f=fixture();assert.equal(f.controller.isClosing(),false);const operation=f.controller.begin('SIGTERM');assert.equal(f.controller.isClosing(),true);assert.deepEqual(f.trace.slice(0,5),['exit-code-1','deadline','ref','listener','handler']);assert.equal(f.referenced(),true);assert.equal(f.controller.begin('SIGINT'),operation);
 if(first==='listener')f.listener();else{f.handler.resolve();await Promise.resolve();}assert.deepEqual(f.exits,[]);assert.deepEqual(f.exitCodes,[1]);
 if(first==='listener')f.handler.resolve();else f.listener();const result=await operation;assert.deepEqual(result,{exitCode:0,listenerClosed:true,handlerClosed:true,timedOut:false});assert.deepEqual(f.exits,[0]);assert.deepEqual(f.exitCodes,[1,0]);assert.equal(f.cleared(),true);f.fire();assert.deepEqual(f.exits,[0]);assert.equal(f.controller.failureCauses().length,0);assert.equal(f.controller.begin('SIGTERM'),operation);
});
test('injected never-settling handler still starts listener close and has a referenced deadline',async()=>{
 const f=fixture(),operation=f.controller.begin('SIGTERM');f.listener();assert.equal(f.referenced(),true);assert.deepEqual(f.exits,[]);f.fire();const result=await operation;assert.deepEqual(result,{exitCode:1,listenerClosed:true,handlerClosed:false,timedOut:true});assert.deepEqual(f.exits,[1]);assert.equal(f.trace.filter(value=>value==='force').length,1);f.handler.resolve();await Promise.resolve();assert.deepEqual(f.exits,[1]);assert.equal(result.handlerClosed,false);
});
test('injected listener synchronous throw cannot skip handler cleanup or hide its exact cause',async()=>{
 const failure=Error('PRIVATE_OWNER_DIAGNOSTIC'),f=fixture({listenerThrow:failure}),operation=f.controller.begin('SIGTERM');assert.ok(f.trace.includes('handler'));f.handler.resolve();assert.equal((await operation).exitCode,1);assert.ok(f.controller.failureCauses().includes(failure));assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE_OWNER_DIAGNOSTIC/);assert.deepEqual(f.exits,[1]);
});
test('injected handler synchronous throw cannot skip listener cleanup',async()=>{
 const failure=Error('owned handler throw'),f=fixture({handlerThrow:failure}),operation=f.controller.begin('SIGINT');assert.ok(f.trace.includes('listener'));assert.deepEqual(f.exits,[]);f.listener();const result=await operation;assert.equal(result.exitCode,1);assert.equal(result.listenerClosed,true);assert.equal(result.handlerClosed,false);assert.ok(f.controller.failureCauses().includes(failure));
});
test('both callback failure and async rejection remain private and never yield exit zero',async()=>{
 const listener=Error('owned listener failure'),handler=Error('owned handler rejection'),f=fixture(),operation=f.controller.begin('SIGTERM');f.listener(listener);f.handler.reject(handler);const result=await operation;assert.equal(result.exitCode,1);assert.equal(result.listenerClosed,false);assert.equal(result.handlerClosed,false);assert.ok(f.controller.failureCauses().includes(listener));assert.ok(f.controller.failureCauses().includes(handler));assert.deepEqual(f.exits,[1]);
});
test('undefined Promise rejection is failure, not a successful handler acknowledgment',async()=>{
 const f=fixture(),operation=f.controller.begin('SIGTERM');f.listener();f.handler.reject(undefined);const result=await operation;assert.equal(result.exitCode,1);assert.equal(result.handlerClosed,false);assert.equal(f.controller.failureCauses().length,1);assert.equal(f.controller.failureCauses()[0],undefined);
});
test('deadline survives force-close throw and late failure cannot rewrite timed-out result',async()=>{
 const force=Error('owned force-close failure'),late=Error('owned late handler failure'),f=fixture({forceThrow:force}),operation=f.controller.begin('SIGTERM');f.fire();const result=await operation;assert.equal(result.exitCode,1);assert.equal(result.timedOut,true);assert.ok(f.controller.failureCauses().includes(force));f.handler.reject(late);f.listener();await Promise.resolve();await Promise.resolve();assert.ok(f.controller.failureCauses().includes(late));assert.equal(result.handlerClosed,false);assert.equal(result.listenerClosed,false);assert.deepEqual(f.exits,[1]);
});
test('an injected failed timer reference still attempts both closes and fails conservatively',async()=>{
 const failure=Error('owned timer ref failure'),f=fixture({refThrow:failure}),operation=f.controller.begin('SIGTERM');assert.ok(f.trace.includes('listener'));assert.ok(f.trace.includes('handler'));const result=await operation;assert.equal(result.exitCode,1);assert.equal(result.timedOut,true);assert.ok(f.controller.failureCauses().includes(failure));f.handler.resolve();
});
test('logging failure cannot bypass cleanup and raw causes never become log payloads',async()=>{
 const failure=Error('PRIVATE_LOG_FAILURE'),f=fixture({reportThrow:failure}),operation=f.controller.begin('SIGTERM');f.listener();f.handler.resolve();assert.equal((await operation).exitCode,1);assert.ok(f.controller.failureCauses().includes(failure));assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE_LOG_FAILURE/);assert.deepEqual(f.exits,[1]);
});
test('actual normal HTTP entrypoint uses the controller and gates health/body after Host/Origin',async()=>{
 const source=readFileSync(new URL('../src/http-server.ts',import.meta.url),'utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let serve!:(req:any,res:any)=>Promise<unknown>,listenerDone!:(error?:Error)=>void,fire!:()=>void,bodyReads=0,mcpCalls=0,controller!:ReturnType<typeof createHttpShutdownController>;
 const handler=deferred(),signals=new Map<string,()=>void>(),exits:number[]=[],exitCodes:number[]=[];
 const server={close(fn:(error?:Error)=>void){listenerDone=fn;},closeAllConnections(){},listen(_port:number,_host:string,callback:()=>void){callback();}};
 const dependencies:Record<string,unknown>={'node:http':{createServer:(callback:typeof serve)=>{serve=callback;return server;}},'node:stream':{Readable},'./oauth-metadata.js':{buildProtectedResourceMetadata},'./mcp-http.js':{createAuthorizedMgrMcpHttpHandler:()=>({fetch:async()=>{mcpCalls++;return Response.json({});},close:()=>handler.promise})},'./legacy-client.js':{LegacyEdgeClient:class{}},'./jwt-verifier.js':{JwksAccessTokenVerifier:class{}},'./department-gateway.js':{DepartmentGateway:class{}},'./omnidev-client.js':{},'./http-shutdown.js':{createHttpShutdownController:(options:any)=>controller=createHttpShutdownController({...options,exit:(code:0|1)=>exits.push(code),setExitCode:(code:0|1)=>exitCodes.push(code),setDeadline:(callback:()=>void)=>{fire=callback;return{ref(){}};},clearDeadline:(_handle:OwnedDeadline)=>{}})}};
 runInNewContext(compiled,{require:(name:string)=>{assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name];},exports:{},process:{env:{MCP_PUBLIC_BASE_URL:'https://owned-edge.fixture.invalid',MCP_AUTH_ISSUER:'https://owned-auth.fixture.invalid',MCP_JWKS_URL:'https://owned-auth.fixture.invalid/jwks',LEGACY_BASE_URL:'https://owned-domain.fixture.invalid'},on:(signal:string,callback:()=>void)=>signals.set(signal,callback)},console:{log(){}},URL,Headers,Request,Response,Buffer,setTimeout,clearTimeout},{timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});
 async function response(path:string,headers:Record<string,string>={},method='GET'){const result={statusCode:0,body:'',setHeader(){},end(value:string){this.body=value;}};await serve({url:path,method,headers:{host:'owned-edge.fixture.invalid',...headers},async *[Symbol.asyncIterator](){bodyReads++;throw Error('closing gate must precede body read');}},result);return result;}
 assert.equal((await response('/healthz')).statusCode,200);assert.ok(signals.has('SIGTERM'));assert.ok(signals.has('SIGINT'));signals.get('SIGTERM')!();assert.equal((await response('/healthz')).statusCode,503);assert.equal(controller.isClosing(),true);const denied=await response('/mcp',{},'POST');assert.equal(denied.statusCode,503);assert.deepEqual(JSON.parse(denied.body),{error:'MCP service unavailable'});assert.equal((await response('/healthz',{host:'other.invalid'})).statusCode,421);assert.equal((await response('/healthz',{origin:'https://other.invalid'})).statusCode,403);assert.equal(bodyReads,0);assert.equal(mcpCalls,0);assert.deepEqual(exitCodes,[1]);signals.get('SIGINT')!();listenerDone();handler.resolve();await controller.begin('SIGTERM');assert.deepEqual(exits,[0]);fire();assert.deepEqual(exits,[0]);
});
