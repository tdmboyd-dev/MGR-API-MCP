import {isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Trusted local host composition, not a model/HTTP configuration interface.
// The caller owns login, service startup and the already enrolled ONE store.
export async function prepareTevinOwnerStartup({oneRoot,store,ownerToken,publicOrigin,tenantId,actorId,omnidevExpectedPolicy,modelLaunchFile}:{oneRoot:string;store:any;ownerToken:string;publicOrigin:string;tenantId:string;actorId:string;omnidevExpectedPolicy?:unknown;modelLaunchFile?:string}){
 if(typeof oneRoot!=='string'||!isAbsolute(oneRoot)||typeof ownerToken!=='string'||ownerToken.length<32||modelLaunchFile!==undefined&&(typeof modelLaunchFile!=='string'||!isAbsolute(modelLaunchFile)))throw Error('invalid-local-owner-startup');
 const load=(name:string)=>import(pathToFileURL(resolve(oneRoot,'web',name)).href);
 const [serverModule,storeModule,execution,workflows,launch]=await Promise.all([load('server.mjs'),load('durable-store.mjs'),load('execution-coordinator.mjs'),load('ecosystem-workflows.mjs'),load('model-launch-registration.mjs')]);
 if(!(store instanceof storeModule.ReignStore)||!store.durable)throw Error('local-owner-durable-store-required');
 const coordinator=new execution.ExecutionCoordinator(store);coordinator.assertAuthority(coordinator.hostContext());
 const prepared=modelLaunchFile===undefined?null:launch.prepareModelLaunch({store,coordinator,registration:launch.readModelLaunchManifest(modelLaunchFile)});
 prepared?.assertReady();
 const assertCurrent=()=>{coordinator.assertAuthority(coordinator.hostContext());prepared?.assertReady();};
 return Object.freeze({
  modelRegistrationSelected:prepared!==null,
  assertCurrent,
  createServer(client:any){
   assertCurrent();
   const ecosystemWorkflows=new workflows.EcosystemWorkflows(store,{client,tenantId,actorId,coordinator,...(omnidevExpectedPolicy===undefined?{}:{omnidevExpectedPolicy})});
   return serverModule.createRegisteredStartupServer({store,ownerToken,publicOrigin,engineeringCoordinator:coordinator,modelStartup:prepared?.modelStartup??null,ecosystemWorkflows,modelEnvironment:{},billingSource:null,billingSyncSecret:null,mailSender:{configured:false},emailChannel:{configured:false},repositoryScanner:{repositories:()=>[]}});
  }
 });
}
