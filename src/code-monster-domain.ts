import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {authorizeTool,type AuthContext} from './authz.js';
import {projectBindingReader} from './project-bindings.js';
import type {AuthorizedMgrMcpHttpOptions} from './mcp-http.js';

const catalog=new Set(['code_monster_self','code_monster_help','code_monster_profile','code_monster_symbols','code_monster_references','code_monster_impact','code_monster_outline','code_monster_automation']);
const principal=(auth:AuthContext)=>JSON.stringify([auth.actorId,auth.tenantId,auth.audience,[...auth.scopes].sort(),auth.expiresAt]);
/** Host composition of the existing read-only source service. No new token,
 * scheduler, canonical evidence store, code runner or root enrollment is added. */
export function loadCodeMonsterDomain(env:NodeJS.ProcessEnv=process.env):{
 register:NonNullable<AuthorizedMgrMcpHttpOptions['registerReadOnlyDomainTools']>;
 close():void;
}|undefined{
 const names=['MGR_CODE_MONSTER_TOOLKIT_ROOT','MGR_CODE_MONSTER_CONFIG','MGR_CODE_MONSTER_BINDINGS_FILE'] as const;
 if(!names.some(name=>env[name]))return undefined;
 for(const name of names)if(!env[name]||!path.isAbsolute(env[name]!))throw Error(`${name} must be an absolute host-owned path`);
 const root=fs.realpathSync(env.MGR_CODE_MONSTER_TOOLKIT_ROOT!);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 if(manifest.name!=='@mgr/code-monster')throw Error('Code Monster toolkit package identity mismatch');
 const requireToolkit=createRequire(path.join(root,'package.json'));
 const {registerSourceTools}=requireToolkit('./src/mcp.mjs');
 const {localProjectResolver}=requireToolkit('./src/source-configuration.mjs');
 if(typeof registerSourceTools!=='function'||typeof localProjectResolver!=='function')throw Error('Code Monster source interfaces unavailable');
 const bindings=projectBindingReader(env.MGR_CODE_MONSTER_BINDINGS_FILE!,'Code Monster');bindings();
 const resolveProject=localProjectResolver(env.MGR_CODE_MONSTER_CONFIG);
 let closed=false,activeAnalyses=0;
 return {close(){closed=true;},register(server,context){
  async function current(project?:string){
   if(closed)throw Error('Code Monster host closed');
   const auth=await context.revalidateAuth();
   if(closed)throw Error('Code Monster host closed');
   authorizeTool(auth,context.resourceAudience,['tools:read','code-monster:read']);
   if(project&&!bindings().some(b=>b.actorId===auth.actorId&&b.tenantId===auth.tenantId&&b.project===project))throw Error('Code Monster project denied');
   return auth;
  }
  const facade={registerTool(name:string,definition:any,handler:(input:any,callContext:any)=>Promise<any>){
   if(!catalog.has(name)||definition.annotations?.readOnlyHint!==true)throw Error('Unexpected Code Monster tool declaration');
   return server.registerTool(name,definition,async(input:any,callContext:any)=>{
    const analyzes=['code_monster_profile','code_monster_symbols','code_monster_references','code_monster_impact','code_monster_outline','code_monster_automation'].includes(name);let ownsAnalysis=false;
    try{
     const auth=await current(analyzes?input.project:undefined);
     // Reserve across all HTTP handlers, not just one newly-created MCP server.
     if(analyzes){if(activeAnalyses)throw Error('Code Monster analysis busy');activeAnalyses++;ownsAnalysis=true;}
     const result=await handler(input,callContext);
     const after=await current(analyzes?input.project:undefined);
     if(principal(auth)!==principal(after)||Buffer.byteLength(JSON.stringify(result))>262144)throw Error('Code Monster authority or response changed');
     return result;
    }catch{return {isError:true,content:[{type:'text',text:'Code Monster read unavailable, unauthorized, cancelled or beyond current source/resource limits.'}]};}
    finally{if(ownsAnalysis)activeAnalyses--;}
   });
  }};
  registerSourceTools(facade,{resolveAuthorizedProject:async(project:string)=>{
   const auth=await current(project),allowed=await resolveProject(project),after=await current(project);
   if(principal(auth)!==principal(after))throw Error('Code Monster authority changed');
   return {...allowed,principal:principal(after)};
  }});
 }};
}
