import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..'),toolkit=process.env.MGR_BACKPACK_BUILD_ROOT,docker=process.env.MGR_DOCKER_BIN||'docker';
if(!toolkit||!path.isAbsolute(toolkit)||JSON.parse(fs.readFileSync(path.join(toolkit,'package.json'),'utf8')).name!=='@mgr/backpack')throw Error('Set MGR_BACKPACK_BUILD_ROOT to the reviewed absolute Backpack checkout');
if(process.env.MGR_DOCKER_BIN&&!path.isAbsolute(docker))throw Error('MGR_DOCKER_BIN must be an absolute reviewed executable');
const local=host=>typeof host==='string'&&(/^(npipe|unix):\/\//.test(host));
if(process.env.DOCKER_HOST&&!local(process.env.DOCKER_HOST))throw Error('Remote Docker host refused: private source must stay on the local engine');
const capture=args=>execFileSync(docker,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024}).trim();
const context=JSON.parse(capture(['context','inspect']));
if(context.length!==1||!local(context[0]?.Endpoints?.docker?.Host))throw Error('Local Docker context required; remote source transfer refused');
const engineVersion=capture(['version','--format','{{.Server.Version}}']);if(!engineVersion)throw Error('Docker server not ready');
const builder=JSON.parse(capture(['buildx','inspect','default','--format','{{json .}}']));
if(builder.Driver!=='docker'||!Array.isArray(builder.Nodes)||!builder.Nodes.length)throw Error('Built-in local Docker builder required');
for(const node of builder.Nodes){
 const endpoint=node.Endpoint;
 if(local(endpoint))continue;
 if(typeof endpoint!=='string'||!/^[A-Za-z0-9_.-]+$/.test(endpoint))throw Error('Remote build endpoint refused');
 const selected=JSON.parse(capture(['context','inspect',endpoint]));
 if(selected.length!==1||!local(selected[0]?.Endpoints?.docker?.Host))throw Error('Remote build context refused');
}
const git=(directory,args)=>execFileSync('git',['-C',directory,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000}).trim();
const source=directory=>{if(git(directory,['status','--porcelain','--untracked-files=all']))throw Error('Commit the reviewed source before container build');return {commit:git(directory,['rev-parse','HEAD']),tree:git(directory,['rev-parse','HEAD^{tree}'])};};
const identities={api:source(root),backpack:source(toolkit)},id=randomUUID(),apiImage='mgr-api-mcp:backpack-'+id,image='mgr-backpack-edge:qualification-'+id;
const output=process.argv[2];if(!output||!path.isAbsolute(output)||fs.existsSync(output))throw Error('Supply a new absolute JSON receipt path');
fs.mkdirSync(path.dirname(output),{recursive:true});
const receipt={at:new Date().toISOString(),state:'started',scope:'Local image builds only; not runtime, worker containment, hosted OAuth or production acceptance',engineVersion,context:context[0].Name,builder:{name:'default',driver:builder.Driver},source:identities,apiImage,image,files:['Dockerfile','Dockerfile.backpack','package-lock.json'].map(file=>({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))};
const save=()=>fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');save();
function build(args){execFileSync(docker,args,{cwd:root,windowsHide:true,stdio:'inherit',timeout:20*60*1000});}
try{
 build(['build','--builder','default','--pull','--tag',apiImage,'.']);receipt.state='api-image-built';save();
 build(['build','--builder','default','--file','Dockerfile.backpack','--build-context','backpack-source='+fs.realpathSync(toolkit),'--build-arg','API_IMAGE='+apiImage,'--tag',image,'.']);
 receipt.imageId=capture(['image','inspect','--format','{{.Id}}',image]);
 if(JSON.stringify(identities)!==JSON.stringify({api:source(root),backpack:source(toolkit)}))throw Error('Source identity changed during build');
 receipt.state='images-built-runtime-unverified';save();console.log(JSON.stringify(receipt));
}catch(error){receipt.state='failed-or-unconfirmed';receipt.failure=error instanceof Error?error.message:String(error);save();throw error;}
