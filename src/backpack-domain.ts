import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import type {AuthorizedMgrMcpHttpOptions} from './mcp-http.js';
import {authorizeTool} from './authz.js';

/** Trusted startup configuration only. Neither requests nor model arguments may
 * choose code, data directories, roots, principals or project bindings. */
export function loadBackpackDomain(env:NodeJS.ProcessEnv=process.env):{
 register:NonNullable<AuthorizedMgrMcpHttpOptions['registerReadOnlyDomainTools']>;
 close():void;
}|undefined{
 const names=['MGR_BACKPACK_TOOLKIT_ROOT','BACKPACK_CONFIG','MGR_BACKPACK_BINDINGS_FILE'] as const;
 if(!names.some(name=>env[name]))return undefined;
 for(const name of names)if(!env[name]||!path.isAbsolute(env[name]!))throw Error(`${name} must be an absolute host-owned path`);
 const root=fs.realpathSync(env.MGR_BACKPACK_TOOLKIT_ROOT!);
 const requireToolkit=createRequire(path.join(root,'package.json'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 if(manifest.name!=='@mgr/backpack')throw Error('Backpack toolkit package identity mismatch');
 const cli=requireToolkit('./src/host-config.js');
 const edge=requireToolkit('./src/shared-edge.js');
 if(typeof cli.configuredEngine!=='function'||typeof edge.registerBackpackEdgeTools!=='function')throw Error('Backpack toolkit interfaces unavailable');
 const bindingPath=env.MGR_BACKPACK_BINDINGS_FILE!;
 function bindings(){
  const stat=fs.lstatSync(bindingPath);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>65536)throw Error('Backpack binding file unavailable');
  const value:unknown=JSON.parse(fs.readFileSync(bindingPath,'utf8'));
  if(!Array.isArray(value)||value.length>256)throw Error('Invalid Backpack binding list');
  const keys=new Set<string>();
  for(const entry of value){
   if(!entry||typeof entry!=='object'||Object.keys(entry).sort().join(',')!=='actorId,project,tenantId')throw Error('Invalid Backpack binding');
   for(const key of ['tenantId','actorId','project'])if(typeof entry[key]!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/.test(entry[key]))throw Error('Invalid Backpack binding identity');
   const key=JSON.stringify([entry.tenantId,entry.actorId,entry.project]);if(keys.has(key))throw Error('Duplicate Backpack binding');keys.add(key);
  }
  return value;
 }
 bindings(); // Refuse malformed enrollment before opening the store/listener.
 const engine=cli.configuredEngine(env.BACKPACK_CONFIG);
 return {register(server,context){edge.registerBackpackEdgeTools(server,{engine,getAuth:context.revalidateAuth,authorize:authorizeTool,getBindings:bindings,audience:context.resourceAudience});},close(){engine.close();}};
}
