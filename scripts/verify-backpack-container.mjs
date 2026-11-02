// Real Docker qualification, never a simulated passing receipt. No owner repo,
// provider credential or production signing key enters the owned fixture.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createServer,request as httpRequest} from 'node:http';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const [buildFile,output]=process.argv.slice(2),docker=process.env.MGR_DOCKER_BIN||'docker';
if(!buildFile||!output||!path.isAbsolute(buildFile)||!path.isAbsolute(output)||fs.existsSync(output))throw Error('Supply existing absolute build receipt and new absolute runtime receipt paths');
const build=JSON.parse(fs.readFileSync(buildFile,'utf8'));
if(build.state!=='images-built-runtime-unverified'||!/^mgr-backpack-edge:qualification-[a-f0-9-]{36}$/.test(build.image)||!/^sha256:[a-f0-9]{64}$/.test(build.imageId))throw Error('Successful owned image build receipt required');
const local=host=>typeof host==='string'&&/^(npipe|unix):\/\//.test(host);
if(process.env.DOCKER_HOST&&!local(process.env.DOCKER_HOST))throw Error('Remote Docker host refused');
const capture=args=>execFileSync(docker,args,{encoding:'utf8',windowsHide:true,timeout:45000,stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024}).trim();
const context=JSON.parse(capture(['context','inspect']));if(context.length!==1||!local(context[0]?.Endpoints?.docker?.Host))throw Error('Local Docker engine required');
assert.equal(capture(['image','inspect','--format','{{.Id}}',build.image]),build.imageId);
const withSource=Boolean(build.source?.codeMonster);
const base=fs.mkdtempSync(path.join(os.tmpdir(),'mgr-backpack-container-')),configDir=path.join(base,'config'),dataDir=path.join(base,'store'),source=path.join(base,'source');
for(const directory of [configDir,dataDir,source])fs.mkdirSync(directory);
fs.writeFileSync(path.join(source,'README.md'),'Owned container fixture; no source code executes.');
let sourceGitStatus;
if(withSource){fs.writeFileSync(path.join(source,'fixture.ts'),'export const ownedContainerCapability = true;');const gitEnv={GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};for(const key of ['PATH','SystemRoot','TEMP','TMP'])if(process.env[key])gitEnv[key]=process.env[key];const git=(...args)=>execFileSync('git',['-C',source,'-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','core.fsmonitor=false',...args],{env:gitEnv,stdio:['ignore','pipe','pipe']});sourceGitStatus=()=>git('status','--porcelain').toString('utf8');git('init','--quiet');git('add','README.md','fixture.ts');git('-c','user.name=Owned fixture','-c','user.email=fixture@localhost','commit','-qm','Owned container source fixture');fs.writeFileSync(path.join(configDir,'cm-projects.json'),JSON.stringify({projects:[{id:'owned-project',root:'/projects/fixture'}]}));}
const binding={tenantId:'owned-tenant',actorId:'owned-actor',project:'owned-project'},bindingFile=path.join(configDir,'bindings.json');
fs.writeFileSync(path.join(configDir,'host.json'),JSON.stringify({dataDir:'/data',roots:['/projects/fixture'],profiles:[],actor:'owned-host'}));fs.writeFileSync(bindingFile,JSON.stringify([binding]));
const id=randomUUID(),prefix='mgr-backpack-proof-'+id,names=new Set(),checks=[];
const mounts=['--mount',`type=bind,source=${configDir},target=/run/backpack,readonly`,'--mount',`type=bind,source=${source},target=/projects/fixture,readonly`,'--mount',`type=bind,source=${dataDir},target=/data`];
const constrained=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:rw,noexec,nosuid,size=64m'];
const configEnv=['--env','BACKPACK_CONFIG=/run/backpack/host.json','--env','MGR_BACKPACK_BINDINGS_FILE=/run/backpack/bindings.json',...(withSource?['--env','MGR_CODE_MONSTER_TOOLKIT_ROOT=/opt/mgr-code-monster','--env','MGR_CODE_MONSTER_CONFIG=/run/backpack/cm-projects.json','--env','MGR_CODE_MONSTER_BINDINGS_FILE=/run/backpack/bindings.json']:[])];
const {privateKey,publicKey}=await generateKeyPair('RS256'),key={...await exportJWK(publicKey),kid:'owned-key',alg:'RS256',use:'sig'};
const jwks=createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({keys:[key]}));});
await new Promise(resolve=>jwks.listen(0,'0.0.0.0',resolve));
const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise((resolve,reject)=>reserve.close(error=>error?reject(error):resolve()));
const origin='https://owned-backpack-container.fixture.invalid',audience=origin+'/mcp',issuer='https://owned-auth.fixture.invalid',localOrigin=`http://127.0.0.1:${port}`;
const localFetch=async(input,init)=>{const request=new Request(input,init),headers=Object.fromEntries(request.headers),body=Buffer.from(await request.arrayBuffer());headers.host=new URL(origin).host;headers.connection='close';if(body.length)headers['content-length']=String(body.length);return new Promise((resolve,reject)=>{const req=httpRequest(localOrigin+new URL(request.url).pathname,{method:request.method,headers,agent:false,signal:request.signal,timeout:5000},res=>{const chunks=[];res.on('data',chunk=>chunks.push(Buffer.from(chunk)));res.on('error',reject);res.on('end',()=>{const out=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)out.set(key,Array.isArray(value)?value.join(','):value);resolve(new Response(res.statusCode===204?null:Buffer.concat(chunks),{status:res.statusCode,headers:out}));});});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('Owned local HTTP deadline expired')));req.end(body);});};
async function token(actor=binding.actorId,tenant=binding.tenantId,scope=withSource?'tools:read backpack:read code-monster:read':'tools:read backpack:read',expiration='2m'){return new SignJWT({tenant_id:tenant,scope}).setProtectedHeader({alg:'RS256',kid:key.kid}).setIssuer(issuer).setAudience(audience).setSubject(actor).setIssuedAt().setExpirationTime(expiration).sign(privateKey);}
const clients=[];
async function clientFor(access){const client=new Client({name:'actual-docker-backpack-proof',version:'1'});clients.push(client);await client.connect(new StreamableHTTPClientTransport(new URL(audience),{authProvider:{token:async()=>access},fetch:localFetch}));return client;}
const inspect=name=>JSON.parse(capture(['container','inspect',name]))[0];
function owned(name){const value=inspect(name);if(value.Config.Labels?.['mgr.qualification']!==id)throw Error('Container ownership changed; cleanup refused');return value;}
const exists=name=>Boolean(capture(['container','ls','--all','--filter','name=^/'+name+'$','--format','{{.ID}}']));
function stopRemove(name){if(!exists(name)){names.delete(name);return null;}const value=owned(name);if(value.State.Running)capture(['stop','--time','10',name]);const final=owned(name);if(final.State.Running)throw Error('Container stop unconfirmed');capture(['rm',name]);names.delete(name);return final.State.ExitCode;}
function oneShot(suffix,code){const name=prefix+'-'+suffix;names.add(name);const result=capture(['run','--rm','--name',name,'--label','mgr.qualification='+id,...constrained,...mounts,...configEnv,'--network','none','--entrypoint','node',build.image,'--input-type=module','-e',code]);if(!exists(name))names.delete(name);return result;}
const ledgerCode="import {configuredEngine} from '/opt/mgr-backpack/src/host-config.js';const e=configuredEngine('/run/backpack/host.json');try{console.log(JSON.stringify({ledger:e.verifyLedger(),projects:e.projects().map(p=>p.id),tasks:e.listTasks('owned-project').items.length,runs:e.listRuns('owned-project').items.length}));}finally{e.close();}";
async function start(suffix){
 const name=prefix+'-'+suffix;names.add(name);
 capture(['run','--detach','--name',name,'--label','mgr.qualification='+id,...constrained,...mounts,...configEnv,'--publish',`127.0.0.1:${port}:8787`,...(process.platform==='win32'?[]:['--add-host','host.docker.internal:host-gateway']),'--env','PORT=8787','--env','MCP_PUBLIC_BASE_URL='+origin,'--env','MCP_AUTH_ISSUER='+issuer,'--env',`MCP_JWKS_URL=http://host.docker.internal:${jwks.address().port}/jwks`,'--env','MCP_REQUIRED_SCOPES=tools:read','--env','MCP_ADVERTISED_SCOPES=tools:read,backpack:read'+(withSource?',code-monster:read':''),build.image]);
 for(let attempt=0;attempt<40;attempt++){const value=owned(name);if(!value.State.Running)throw Error('API container exited before readiness: '+capture(['logs',name]));try{if((await localFetch(origin+'/healthz')).status===200)return name;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 throw Error('Container readiness timed out');
}
const receipt={at:new Date().toISOString(),state:'started',scope:'Actual local Docker image/API/JWKS/JWT/SQLite persistence; synthetic identity. Not hosted TLS/OAuth, hostile-worker isolation or production acceptance',image:build.image,imageId:build.imageId,source:build.source,codeMonsterEnabled:withSource,checks};
fs.mkdirSync(path.dirname(output),{recursive:true});const save=()=>fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');save();
let cleanupConfirmed=true;
try{
 oneShot('enroll',"import {configuredEngine} from '/opt/mgr-backpack/src/host-config.js';const e=configuredEngine('/run/backpack/host.json');try{e.register({id:'owned-project',root:'/projects/fixture',purpose:'Owned real Docker verification',owner:'fixture'});}finally{e.close();}");
 const before=JSON.parse(oneShot('before',ledgerCode));assert(before.ledger.valid);checks.push('actual-container-enrollment-and-persistent-store');
 const name=await start('first'),configuration=owned(name);assert.equal(configuration.HostConfig.ReadonlyRootfs,true);assert.notEqual(configuration.Config.User,'root');checks.push('actual-running-nonroot-readonly-container');
 assert.equal((await localFetch(audience)).status,401);checks.push('unauthenticated-refused');
 const client=await clientFor(await token());assert.equal((await client.listTools()).tools.filter(t=>t.name.startsWith('mgr_backpack_')).length,11);checks.push('actual-eleven-guarded-tools');
 assert(!(await client.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError);checks.push('signed-token-context');
 if(withSource){assert.equal((await client.listTools()).tools.filter(t=>t.name.startsWith('code_monster_')).length,8);const result=await client.callTool({name:'code_monster_symbols',arguments:{project:binding.project,symbol:'ownedContainerCapability'}});assert(!result.isError,JSON.stringify(result));assert(JSON.stringify(result).includes('ownedContainerCapability'));checks.push('actual-container-git-compiler-symbols');for(const name of ['code_monster_references','code_monster_impact','code_monster_outline']){const navigation=await client.callTool({name,arguments:{project:binding.project,symbol:'ownedContainerCapability'}});assert(!navigation.isError,JSON.stringify(navigation));}checks.push('actual-container-source-navigation');const scoped=await clientFor(await token(binding.actorId,binding.tenantId,'tools:read backpack:read'));assert.equal((await scoped.callTool({name:'code_monster_profile',arguments:{project:binding.project}})).isError,true);checks.push('container-source-scope-is-independent');}
 for(const [actor,tenant,scope,label] of [['other',binding.tenantId,'tools:read backpack:read','actor'],[binding.actorId,'other','tools:read backpack:read','tenant'],[binding.actorId,binding.tenantId,'tools:read','scope']]){const other=await clientFor(await token(actor,tenant,scope));assert.equal((await other.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError,true);checks.push('refused-'+label);}
 fs.writeFileSync(bindingFile,'[]');assert.equal((await client.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError,true);checks.push('binding-revoked-without-restart');if(withSource){assert.equal((await client.callTool({name:'code_monster_profile',arguments:{project:binding.project}})).isError,true);checks.push('container-source-binding-revocation');}fs.writeFileSync(bindingFile,JSON.stringify([binding]));
 assert.equal((await localFetch(audience,{headers:{authorization:'Bearer '+await token(binding.actorId,binding.tenantId,'tools:read backpack:read','-1s')}})).status,401);checks.push('expired-signed-token-refused');
 await Promise.all(clients.splice(0).map(client=>client.close()));assert.equal(stopRemove(name),0);checks.push('actual-graceful-container-stop');
 const second=await start('reopen'),reopened=await clientFor(await token());assert(!(await reopened.callTool({name:'mgr_backpack_context',arguments:{project:binding.project}})).isError);await reopened.close();clients.splice(clients.indexOf(reopened),1);assert.equal(stopRemove(second),0);checks.push('recreated-container-reopens-same-project');
 const after=JSON.parse(oneShot('after',ledgerCode));assert.deepEqual(after,before);checks.push('ledger-preserved-no-mirrored-tasks-or-runs');assert.equal(fs.readFileSync(path.join(source,'README.md'),'utf8'),'Owned container fixture; no source code executes.');checks.push('readonly-source-unchanged');if(withSource){assert.equal(sourceGitStatus().trim(),'');assert.equal(fs.readFileSync(path.join(source,'fixture.ts'),'utf8'),'export const ownedContainerCapability = true;');checks.push('container-git-source-unchanged');}
 receipt.state='local-container-runtime-verified';receipt.passed=checks.length;save();console.log(JSON.stringify(receipt,null,2));
}catch(error){receipt.state='failed-or-unconfirmed';receipt.error=error instanceof Error?error.message:String(error);save();throw error;}
finally{
 await Promise.allSettled(clients.map(client=>client.close()));for(const name of names){try{stopRemove(name);}catch{cleanupConfirmed=false;}}
 await new Promise(resolve=>{jwks.close(resolve);jwks.closeAllConnections();});
 if(cleanupConfirmed){const actual=fs.realpathSync(base);if(path.dirname(actual)!==fs.realpathSync(os.tmpdir())||!path.basename(actual).startsWith('mgr-backpack-container-')||fs.lstatSync(base).isSymbolicLink())throw Error('Fixture cleanup boundary changed');fs.rmSync(actual,{recursive:true});}
 else{receipt.cleanup='unconfirmed; preserve owned fixture directory and inspect recorded container names';receipt.preservedFixture=base;receipt.containers=[...names];save();throw Error('Owned container cleanup remains unconfirmed');}
}
