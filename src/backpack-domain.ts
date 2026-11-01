import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import type {AuthorizedMgrMcpHttpOptions} from './mcp-http.js';
import {authorizeTool} from './authz.js';
import {projectBindingReader} from './project-bindings.js';

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
 const bindings=projectBindingReader(bindingPath,'Backpack');
 bindings(); // Refuse malformed enrollment before opening the store/listener.
 const engine=cli.configuredEngine(env.BACKPACK_CONFIG);
 return {register(server,context){edge.registerBackpackEdgeTools(server,{engine,getAuth:context.revalidateAuth,authorize:authorizeTool,getBindings:bindings,audience:context.resourceAudience});},close(){engine.close();}};
}
