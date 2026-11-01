import test from 'node:test';
import assert from 'node:assert/strict';
import * as z from 'zod/v4';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createAuthorizedMgrMcpHttpHandler} from '../src/mcp-http.js';
import {LegacyEdgeClient} from '../src/legacy-client.js';

for(const mode of ['current','revoked','changed-actor','changed-tenant','expired','scope'])test(`actual authorized domain tool composition rechecks ${mode} without trusting caller identity`,async t=>{
 let actor='a',tenant='t',allowed=true,expiry=Date.now()+60000,scopes=['tools:read','backpack:read'],registrations=0;
 const audience='https://domain-composition.fixture.invalid/mcp';
 const handler=createAuthorizedMgrMcpHttpHandler({resourceAudience:audience,resourceMetadataUrl:'https://domain-composition.fixture.invalid/.well-known/oauth-protected-resource',requiredScopes:['tools:read'],legacy:new LegacyEdgeClient({baseUrl:'https://legacy.fixture.invalid',fetcher:async()=>{throw Error('No domain mutation/network allowed');}}),verifier:{async verify(token){return token==='fixture'&&allowed?{subject:actor,tenantId:tenant,audience,scopes,expiresAt:expiry}:null;}},registerReadOnlyDomainTools(server,context){
  registrations++;server.registerTool('domain_read',{description:'Read-only authorization integration fixture',inputSchema:z.object({project:z.literal('p')}).strict(),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async()=>{
   try{const before=await context.revalidateAuth();if(mode==='revoked')allowed=false;if(mode==='changed-actor')actor='changed';if(mode==='changed-tenant')tenant='changed';if(mode==='expired')expiry=0;if(mode==='scope')scopes=['tools:read'];await Promise.resolve();const after=await context.revalidateAuth();if(!after.scopes.includes('backpack:read'))throw Error('Required domain scope missing');return {content:[{type:'text',text:JSON.stringify({project:'p',actor:before.actorId,tenant:before.tenantId})}]};}
   catch{return {isError:true,content:[{type:'text',text:'Domain read unavailable'}]};}
  });
 }});
 t.after(()=>handler.close());const client=new Client({name:'actual-domain-composition',version:'1'});t.after(()=>client.close());
 const unauthenticated=await handler.fetch(new Request(audience));assert.equal(unauthenticated.status,401);assert.equal(registrations,0);
 await client.connect(new StreamableHTTPClientTransport(new URL(audience),{authProvider:{token:async()=>'fixture'},fetch:async(input,init)=>handler.fetch(new Request(input,init))}));
 const result=await client.callTool({name:'domain_read',arguments:{project:'p'}});if(mode==='current'){assert(!result.isError);const text=result.content.find(item=>item.type==='text');assert(text&&text.type==='text');assert.equal(JSON.parse(text.text).actor,'a');}else{assert.equal(result.isError,true);assert(!JSON.stringify(result).includes('"tenant"'));}
 assert(registrations>0);
});
