// Real normal HTTP startup + real local JWKS/JWT + actual Backpack store.
// Owned synthetic credentials only. No provider, deployment or Tevin acceptance.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {generateKeyPair,exportJWK,SignJWT,createRemoteJWKSet,jwtVerify} from 'jose';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const toolkit=process.env.MGR_BACKPACK_TOOLKIT_ROOT,codeMonster=process.env.MGR_CODE_MONSTER_TEST_ROOT;
if(!codeMonster||!path.isAbsolute(codeMonster))throw Error('Set MGR_CODE_MONSTER_TEST_ROOT to the actual reviewed toolkit');
if(!toolkit||!path.isAbsolute(toolkit))throw Error('Set MGR_BACKPACK_TOOLKIT_ROOT to the actual trusted source checkout');
const {Backpack}=await import(pathToFileURL(path.join(toolkit,'src/engine.js')).href);
const base=fs.mkdtempSync(path.join(os.tmpdir(),'mgr-backpack-http-')),root=path.join(base,'source');fs.mkdirSync(root);
fs.writeFileSync(path.join(root,'README.md'),'Owned HTTP verification fixture. No repository code is run.');
fs.writeFileSync(path.join(root,'fixture.ts'),'export function ownedSourceCapability(value: number){ return value + 1; }\nexport const observed = ownedSourceCapability(2);\n');
fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,scripts:{test:'FIXTURE_BODY_MUST_NOT_LEAVE_AUTOMATION'}}));
const gitEnv:NodeJS.ProcessEnv={GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};for(const name of ['PATH','SystemRoot','TEMP','TMP'])if(process.env[name])gitEnv[name]=process.env[name];
const git=(...args:string[])=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','core.fsmonitor=false',...args],{env:gitEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']});
git('init','--quiet');git('add','README.md','fixture.ts','package.json');git('-c','user.name=Owned fixture','-c','user.email=fixture@localhost','commit','-qm','Owned source fixture');
const cmConfig=path.join(base,'cm-projects.json'),cmBindings=path.join(base,'cm-bindings.json');
const extraSourceRoot=process.env.MGR_LARGE_REPO_READ_ROOT;if(extraSourceRoot)assert(path.isAbsolute(extraSourceRoot));
fs.writeFileSync(cmConfig,JSON.stringify({projects:[{id:'owned-project',root},...(extraSourceRoot?[{id:'real-large-source',root:extraSourceRoot}]:[])]}));
const config=path.join(base,'host.json'),bindingPath=path.join(base,'bindings.json');
const host={dataDir:path.join(base,'store'),roots:[root],actor:'owned-host'};
fs.writeFileSync(config,JSON.stringify(host));
const binding={tenantId:'owned-tenant',actorId:'owned-actor',project:'owned-project'};
fs.writeFileSync(bindingPath,JSON.stringify([binding]));fs.writeFileSync(cmBindings,JSON.stringify([binding,...(extraSourceRoot?[{...binding,project:'real-large-source'}]:[])]));
const engine=new Backpack(host);engine.register({id:binding.project,root,purpose:'Real normal HTTP qualification',owner:'fixture'});engine.close();
const {privateKey,publicKey}=await generateKeyPair('RS256');
const key={...await exportJWK(publicKey),kid:'owned-fixture-key',alg:'RS256',use:'sig'};
const jwks=createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({keys:[key]}));});
await new Promise<void>(resolve=>jwks.listen(0,'127.0.0.1',resolve));
const issuer=`http://127.0.0.1:${(jwks.address() as any).port}`;
const reserve=createServer();await new Promise<void>(resolve=>reserve.listen(0,'127.0.0.1',resolve));
const port=(reserve.address() as any).port;await new Promise<void>((resolve,reject)=>reserve.close(error=>error?reject(error):resolve()));
const origin='https://owned-backpack.fixture.invalid',local=`http://127.0.0.1:${port}`,audience=origin+'/mcp';
const localFetch:typeof fetch=async(input,init)=>{const request=new Request(input,init),headers=Object.fromEntries(request.headers),body=Buffer.from(await request.arrayBuffer());headers.host=new URL(origin).host;headers.connection='close';if(body.length)headers['content-length']=String(body.length);return new Promise<Response>((resolve,reject)=>{const req=httpRequest(local+new URL(request.url).pathname,{method:request.method,headers,agent:false},res=>{const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(Buffer.from(chunk)));res.on('error',reject);res.on('end',()=>{const out=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)out.set(key,Array.isArray(value)?value.join(','):value);resolve(new Response(res.statusCode===204?null:Buffer.concat(chunks),{status:res.statusCode,headers:out}));});});req.on('error',reject);req.end(body);});};
const env:NodeJS.ProcessEnv={...process.env,MGR_CODE_MONSTER_TOOLKIT_ROOT:codeMonster,MGR_CODE_MONSTER_CONFIG:cmConfig,MGR_CODE_MONSTER_BINDINGS_FILE:cmBindings,PORT:String(port),MCP_PUBLIC_BASE_URL:origin,MCP_AUTH_ISSUER:issuer,MCP_JWKS_URL:issuer+'/jwks',MGR_BACKPACK_TOOLKIT_ROOT:toolkit,BACKPACK_CONFIG:config,MGR_BACKPACK_BINDINGS_FILE:bindingPath,MCP_REQUIRED_SCOPES:'tools:read',MCP_ADVERTISED_SCOPES:'tools:read,backpack:read,code-monster:read',MGR_DEPARTMENTS_ENABLED:'false'};
delete env.LEGACY_BASE_URL;
const compiledEntry=process.env.MGR_API_HTTP_ENTRY;
if(compiledEntry&&(!path.isAbsolute(compiledEntry)||!fs.statSync(compiledEntry).isFile()))throw Error('MGR_API_HTTP_ENTRY must be an existing absolute compiled entrypoint');
const child=spawn(process.execPath,compiledEntry?[compiledEntry]:['--import','tsx','src/http-server.ts'],{env,cwd:path.resolve('.'),stdio:['ignore','pipe','pipe'],windowsHide:true});
let diagnostics='';child.stderr.on('data',chunk=>diagnostics+=String(chunk));
const clients:Client[]=[],checks:string[]=[];
async function token(actor='owned-actor',tenant='owned-tenant',scope='tools:read backpack:read code-monster:read',expires='2m'){
 return new SignJWT({tenant_id:tenant,scope}).setProtectedHeader({alg:'RS256',kid:key.kid}).setIssuer(issuer).setAudience(audience).setSubject(actor).setIssuedAt().setExpirationTime(expires).sign(privateKey);
}
async function connect(accessToken:string){const client=new Client({name:'actual-normal-backpack-http',version:'1'});clients.push(client);await client.connect(new StreamableHTTPClientTransport(new URL(audience),{authProvider:{token:async()=>accessToken},fetch:localFetch}));return client;}
try{
 await new Promise<void>((resolve,reject)=>{let done=false;const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve();};const timer=setTimeout(()=>finish(Error('Normal HTTP startup timed out: '+diagnostics)),20000);child.once('error',error=>finish(error));child.once('exit',code=>finish(Error('Normal HTTP startup exited '+code+': '+diagnostics)));child.stdout.on('data',chunk=>{if(String(chunk).includes('mgr_api_mcp_listening'))finish();});});
 assert.equal((await localFetch(audience)).status,401);checks.push('unauthenticated-refused');
 const metadata=await (await localFetch(origin+'/.well-known/oauth-protected-resource')).json() as any;assert.equal(metadata.resource,audience);checks.push('real-protected-resource-metadata');
 const access=await token('owned-actor','owned-tenant','tools:read backpack:read code-monster:read',extraSourceRoot?'10m':'2m');await jwtVerify(access,createRemoteJWKSet(new URL(issuer+'/jwks')),{issuer,audience});const probe=await localFetch(audience,{method:'POST',headers:{authorization:'Bearer '+access,'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'probe',version:'1'}}})});assert.equal(probe.status,200,await probe.text());const client=await connect(access);
 const tools=(await client.listTools()).tools;
 assert.equal(tools.filter(tool=>tool.name.startsWith('mgr_backpack_')).length,9);
 assert(!tools.some(tool=>tool.name.startsWith('mgr_legacy_')));checks.push('normal-startup-nine-read-tools-no-legacy-transport');
 const context=await client.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}});assert(!context.isError);checks.push('signed-jwt-actual-project-context');
 for(const [actor,tenant,scope] of [['other-actor','owned-tenant','tools:read backpack:read'],['owned-actor','other-tenant','tools:read backpack:read'],['owned-actor','owned-tenant','tools:read']]){
  const other=await connect(await token(actor,tenant,scope));const result=await other.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}});assert.equal(result.isError,true);checks.push('refused-'+(actor==='other-actor'?'actor':tenant==='other-tenant'?'tenant':'scope'));
 }
 fs.writeFileSync(bindingPath,'[]');assert.equal((await client.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError,true);checks.push('binding-revocation-takes-effect-without-restart');
 fs.writeFileSync(bindingPath,JSON.stringify([binding]));assert(!(await client.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError);checks.push('explicit-binding-restored');
 const expired=await localFetch(audience,{headers:{authorization:'Bearer '+await token('owned-actor','owned-tenant','tools:read backpack:read','-1s')}});assert.equal(expired.status,401);checks.push('expired-signed-token-refused');
 assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'Owned HTTP verification fixture. No repository code is run.');checks.push('source-unchanged');
 const cmInput={project:binding.project};
 assert.equal(tools.filter(tool=>tool.name.startsWith('code_monster_')).length,8);checks.push('normal-startup-eight-code-monster-tools');
 assert(!(await client.callTool({name:'code_monster_self',arguments:{}})).isError);checks.push('authenticated-code-monster-self');
 const profile=await client.callTool({name:'code_monster_profile',arguments:cmInput});assert(!profile.isError,JSON.stringify(profile));checks.push('real-git-compiler-source-profile');
 const symbols=await client.callTool({name:'code_monster_symbols',arguments:{...cmInput,symbol:'ownedSourceCapability'}});assert(!symbols.isError);assert(JSON.stringify(symbols).includes('ownedSourceCapability'));checks.push('exact-source-symbol-citation');
 for(const [name,label]of [['code_monster_references','real-bound-references'],['code_monster_impact','real-potential-impact']]){const result=await client.callTool({name,arguments:{...cmInput,symbol:'ownedSourceCapability'}});assert(!result.isError,JSON.stringify(result));const data=JSON.parse((result.content as any[])[0].text);assert.equal(data.resolution,'unique');assert(data.totalMatches>=1);assert.equal(data.contract,name==='code_monster_references'?'mgr.code-monster.source-references.v1':'mgr.code-monster.source-impact.v1');checks.push(label);}
 for(const [name,contract]of [['code_monster_outline','mgr.code-monster.source-outline.v1'],['code_monster_automation','mgr.code-monster.automation-map.v1']]){const result=await client.callTool({name,arguments:cmInput});assert(!result.isError,JSON.stringify(result));const data=JSON.parse((result.content as any[])[0].text);assert.equal(data.contract,contract);assert(data.totalMatches>=1);assert(!JSON.stringify(data).includes('FIXTURE_BODY_MUST_NOT_LEAVE_AUTOMATION'));checks.push('real-'+name);}
 const largeRoot=process.env.MGR_LARGE_REPO_READ_ROOT,largeRevision=process.env.MGR_LARGE_REPO_READ_REVISION;
 if(largeRoot){
  assert(path.isAbsolute(largeRoot));assert(largeRevision&&/^[a-f0-9]{40}$/.test(largeRevision));const realBinding={...binding,project:'real-large-source'};
  fs.writeFileSync(cmConfig,JSON.stringify({projects:[{id:binding.project,root},{id:realBinding.project,root:largeRoot}]}));fs.writeFileSync(cmBindings,JSON.stringify([binding,realBinding]));
  let next:any={revision:largeRevision},windows=0,parsed=0,finished=false;
  for(let i=0;i<100;i++){
   const result=await client.callTool({name:'code_monster_profile',arguments:{project:realBinding.project,...next}},{timeout:120000});assert(!result.isError,JSON.stringify(result));const data=JSON.parse((result.content as any[])[0].text);assert.equal(data.commit,largeRevision);assert.equal(data.analysisWindow.securityAuditPerformed,false);assert.equal(data.analysisWindow.repairsPerformed,0);windows++;parsed+=data.coverage.parsed;
   if(data.analysisWindow.next&&i===0){fs.writeFileSync(cmBindings,JSON.stringify([binding]));assert.equal((await client.callTool({name:'code_monster_profile',arguments:{project:realBinding.project,...data.analysisWindow.next}})).isError,true);checks.push('real-large-continuation-revocation-refused');fs.writeFileSync(cmBindings,JSON.stringify([binding,realBinding]));}
   if(!data.analysisWindow.next){finished=true;break;}assert.notEqual(data.analysisWindow.next.continuation,next.continuation);next=data.analysisWindow.next;
  }
  assert(finished);assert(windows>1);assert(parsed>2000);checks.push('real-large-source-all-windows:'+windows+':parsed:'+parsed);
  fs.writeFileSync(cmConfig,JSON.stringify({projects:[{id:binding.project,root}]}));fs.writeFileSync(cmBindings,JSON.stringify([binding]));assert.equal((await client.callTool({name:'code_monster_profile',arguments:{project:realBinding.project,revision:largeRevision}})).isError,true);checks.push('real-large-root-removal-refused');
 }
 const sourceDenied=await connect(await token('owned-actor','owned-tenant','tools:read backpack:read'));assert.equal((await sourceDenied.callTool({name:'code_monster_profile',arguments:cmInput})).isError,true);assert(!(await sourceDenied.callTool({name:'mgr_backpack_context',arguments:cmInput})).isError);checks.push('component-scope-does-not-cross-grant');
 for(const [actor,tenant]of [['other-actor','owned-tenant'],['owned-actor','other-tenant']]){const denied=await connect(await token(actor,tenant));assert.equal((await denied.callTool({name:'code_monster_profile',arguments:cmInput})).isError,true);}checks.push('code-monster-actor-and-tenant-refused');
 assert.equal((await client.callTool({name:'code_monster_profile',arguments:{...cmInput,root,actorId:'owned-actor'}})).isError,true);checks.push('caller-root-and-identity-fields-refused');
 fs.writeFileSync(cmBindings,'[]');assert.equal((await client.callTool({name:'code_monster_profile',arguments:cmInput})).isError,true);assert(!(await client.callTool({name:'mgr_backpack_context',arguments:cmInput})).isError);checks.push('source-binding-revocation-is-independent');for(const name of ['code_monster_references','code_monster_impact','code_monster_outline','code_monster_automation'])assert.equal((await client.callTool({name,arguments:{...cmInput,...(name==='code_monster_automation'?{}:{symbol:'ownedSourceCapability'})}})).isError,true);checks.push('navigation-reads-obey-current-project-revocation');fs.writeFileSync(cmBindings,JSON.stringify([binding]));
 fs.writeFileSync(cmConfig,JSON.stringify({projects:[]}));assert.equal((await client.callTool({name:'code_monster_profile',arguments:cmInput})).isError,true);fs.writeFileSync(cmConfig,JSON.stringify({projects:[{id:binding.project,root}]}));checks.push('source-root-removal-refused-without-restart');
 assert(!(await client.callTool({name:'code_monster_profile',arguments:cmInput})).isError);assert.equal(git('status','--porcelain').trim(),'');checks.push('explicit-source-restoration-and-unchanged-git');
 console.log(JSON.stringify({at:new Date().toISOString(),scope:'Actual normal HTTP/JWKS/JWT/SQLite plus real Git/compiler Code Monster and Backpack; synthetic identity, no deployment/provider/Tevin acceptance',passed:checks.length,checks,codeMonsterVersion:JSON.parse(fs.readFileSync(path.join(codeMonster,'package.json'),'utf8')).version,toolkitVersion:JSON.parse(fs.readFileSync(path.join(toolkit,'package.json'),'utf8')).version,normalEntrypoint:compiledEntry?'compiled dist/src/http-server.js':'src/http-server.ts',legacyConfigured:false},null,2));
}finally{
 await Promise.allSettled(clients.map(client=>client.close()));
 if(child.exitCode===null){child.kill();await new Promise<void>(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',()=>resolve());});}
 await new Promise<void>(resolve=>{jwks.close(()=>resolve());jwks.closeAllConnections();});
 const resolved=fs.realpathSync(base),parent=fs.realpathSync(os.tmpdir());
 if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('mgr-backpack-http-')||fs.lstatSync(base).isSymbolicLink())throw Error('Owned fixture cleanup boundary refused');
 fs.rmSync(resolved,{recursive:true});
}
