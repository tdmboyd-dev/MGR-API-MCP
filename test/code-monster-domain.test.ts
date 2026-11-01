import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {loadCodeMonsterDomain} from '../src/code-monster-domain.js';
import {projectBindingReader} from '../src/project-bindings.js';
import type {AuthContext} from '../src/authz.js';

test('source domain is absent until explicitly configured and refuses partial paths',()=>{
 assert.equal(loadCodeMonsterDomain({}),undefined);
 assert.throws(()=>loadCodeMonsterDomain({MGR_CODE_MONSTER_CONFIG:'relative.json'}),/absolute host-owned/);
});
function owned(t:any){const root=fs.mkdtempSync(path.join(os.tmpdir(),'mgr-cm-edge-'));t.after(()=>{assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(os.tmpdir()));assert(path.basename(root).startsWith('mgr-cm-edge-'));fs.rmSync(root,{recursive:true});});return root;}
test('shared host binding reader refuses duplicate, unexpected and hardlinked grants',t=>{
 const root=owned(t),file=path.join(root,'bindings.json'),read=projectBindingReader(file,'fixture');
 const binding={actorId:'a',tenantId:'t',project:'p'};
 for(const value of [[binding,binding],[{...binding,root:'/caller'}],[{...binding,actorId:'bad identity'}],{}]){fs.writeFileSync(file,JSON.stringify(value));assert.throws(read);}
 fs.writeFileSync(file,JSON.stringify([binding]));assert.deepEqual(read(),[binding]);fs.linkSync(file,path.join(root,'alias.json'));assert.throws(read,/unavailable/);
});
const toolkit=process.env.MGR_CODE_MONSTER_TEST_ROOT;
test('actual source service enforces project scope, post-read revocation and global analysis ownership',{skip:!toolkit,timeout:120000},async t=>{
 const root=owned(t),repo=path.join(root,'repo');fs.mkdirSync(repo);
 fs.writeFileSync(path.join(repo,'fixture.ts'),'export function ownedCapability(value: number){ return value + 1; }\n');
 const gitEnv:NodeJS.ProcessEnv={GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};for(const n of ['PATH','SystemRoot','TEMP','TMP'])if(process.env[n])gitEnv[n]=process.env[n];
 const git=(...args:string[])=>execFileSync('git',['-C',repo,'-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','core.fsmonitor=false',...args],{env:gitEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 git('init','--quiet');git('add','fixture.ts');git('-c','user.name=Owned fixture','-c','user.email=fixture@localhost','commit','-qm','Owned source fixture');
 const config=path.join(root,'projects.json'),bindings=path.join(root,'bindings.json'),grant={actorId:'actor',tenantId:'tenant',project:'owned'};
 fs.writeFileSync(config,JSON.stringify({projects:[{id:'owned',root:repo}]}));fs.writeFileSync(bindings,JSON.stringify([grant]));
 const domain=loadCodeMonsterDomain({MGR_CODE_MONSTER_TOOLKIT_ROOT:toolkit!,MGR_CODE_MONSTER_CONFIG:config,MGR_CODE_MONSTER_BINDINGS_FILE:bindings})!;t.after(()=>domain.close());
 let auth:AuthContext={actorId:'actor',tenantId:'tenant',audience:'https://owned-cm.fixture.invalid/mcp',scopes:['tools:read','code-monster:read'],expiresAt:Date.now()+120000};
 function register(revalidateAuth=async()=>({...auth,scopes:[...auth.scopes]})){
  const tools=new Map<string,(input:any,context:any)=>Promise<any>>();domain.register({registerTool(name:string,_definition:any,handler:any){tools.set(name,handler);}} as any,{auth,resourceAudience:auth.audience,revalidateAuth});return tools;
 }
 const tools=register(),call=(name:string,input:any={})=>tools.get(name)!(input,{}),input={project:'owned',revision:'HEAD',prefixes:[]};
 assert.equal(tools.size,4);assert.equal((await call('code_monster_self')).isError,undefined);
 const profile=await call('code_monster_profile',input);assert(!profile.isError,JSON.stringify(profile));assert(JSON.stringify(profile).includes('owned'));
 const symbols=await call('code_monster_symbols',{...input,symbol:'ownedCapability',offset:0,limit:10});assert(!symbols.isError);assert(JSON.stringify(symbols).includes('ownedCapability'));
 for(const change of [{actorId:'other'},{tenantId:'other'},{scopes:['tools:read']},{expiresAt:0}]){const saved=auth;auth={...auth,...change};const result=await call('code_monster_profile',input);assert.equal(result.isError,true);assert(!JSON.stringify(result).includes('ownedCapability'));auth=saved;}
 fs.writeFileSync(bindings,'[]');assert.equal((await call('code_monster_profile',input)).isError,true);fs.writeFileSync(bindings,JSON.stringify([grant]));
 let validations=0;
 const revoked=register(async()=>{validations++;if(validations===4)fs.writeFileSync(bindings,'[]');return {...auth,scopes:[...auth.scopes]};});
 const withheld=await revoked.get('code_monster_profile')!(input,{});assert(validations>=4,'actual analysis reached post-read validation');assert.equal(withheld.isError,true);assert(!JSON.stringify(withheld).includes('ownedCapability'));fs.writeFileSync(bindings,JSON.stringify([grant]));
 let release!:()=>void,reached!:()=>void,calls=0;const held=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>reached=r);
 const first=register(async()=>{if(++calls===2){reached();await held;}return {...auth,scopes:[...auth.scopes]};}),second=register();
 const pending=first.get('code_monster_profile')!(input,{});await entered;
 try{const busy=await second.get('code_monster_profile')!(input,{});assert.equal(busy.isError,true,'one analysis admission across distinct HTTP server instances');}finally{release();}assert(!(await pending).isError);
 assert(!(await second.get('code_monster_profile')!(input,{})).isError,'admission releases after owned analysis cleanup');
 const abort=new AbortController();abort.abort();assert.equal((await tools.get('code_monster_profile')!(input,{mcpReq:{signal:abort.signal}})).isError,true);assert(!(await call('code_monster_profile',input)).isError,'cancelled read releases analysis admission');
 fs.writeFileSync(config,JSON.stringify({projects:[]}));assert.equal((await call('code_monster_profile',input)).isError,true);
 domain.close();assert.equal((await call('code_monster_self')).isError,true);
 assert.equal(git('status','--porcelain').trim(),'');assert.equal(fs.readFileSync(path.join(repo,'fixture.ts'),'utf8'),'export function ownedCapability(value: number){ return value + 1; }\n');
});
