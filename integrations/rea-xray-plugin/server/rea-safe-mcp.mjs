#!/usr/bin/env node
// Read-only MGR X-Ray MCP server. Does not proxy REA's full active tool surface.
// REA 6.8.0 is installed separately. Only a statically constrained CLI command
// may run against a file inside the owner-controlled workspace directory.
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, relative, isAbsolute, extname } from 'node:path';
import readline from 'node:readline';

const VERSION = '6.8.0';
const DEFAULT_HOME = join(homedir(), '.mgr-tools', 'rea');
const HOME = resolve(process.env.MGR_REA_HOME || DEFAULT_HOME);
const ROOT = resolve(process.env.MGR_REA_ALLOWED_ROOT || join(HOME, 'workspace'));
const WINDOWS = process.platform === 'win32';
const NODE = resolve(process.env.MGR_REA_NODE || (WINDOWS ? join(HOME, 'node', 'node.exe') : process.execPath));
const PACKAGE = resolve(process.env.MGR_REA_PACKAGE || join(HOME, 'runtime', 'node_modules', 'rea-agents'));
const ENTRY = join(PACKAGE, 'scripts', 'rea.mjs');
const MAX_BYTES = 150_000_000;
const MAX_RESULT_BYTES = 4_000_000;
const READ_EXTENSIONS = new Set(['.zip','.pck','.asar','.apk','.exe','.dll','.so','.dylib','.wasm','.gguf','.safetensors','.glb','.gltf','.obj','.bin','.json','.uf2']);
const TOOLS = [{name:'mgr_rea_inspect_artifact',description:'Statically inspect one authorized local software/3D kit package with REA 6.8.0. Does not execute targets or grant any asset rights.',inputSchema:{type:'object',additionalProperties:false,properties:{path:{type:'string',description:'Path relative to the approved local MGR REA workspace.'}},required:['path']}}];
function respond(id,result){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');}
function error(id,code,message){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}})+'\n');}
function problem(message){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'BLOCKED',reason:message})}]};}
async function authorizedPath(file){
  if(typeof file!=='string'||file.length<1||file.length>1024||file.includes('\0'))throw Error('valid local artifact path required');
  await mkdir(ROOT,{recursive:true});
  const root = await realpath(ROOT);
  const path = isAbsolute(file)?resolve(file):resolve(root,file);
  const lexical=relative(root,path);
  if(lexical===''||lexical.startsWith('..')||isAbsolute(lexical))throw Error('artifact path outside authorized workspace');
  const safe = await realpath(path);
  const rel=relative(root,safe);
  if(rel===''||rel.startsWith('..')||isAbsolute(rel))throw Error('artifact must be an ordinary file within the approved MGR REA workspace');
  const info=await stat(safe);
  if(!info.isFile()||info.size<1||info.size>MAX_BYTES)throw Error('artifact not a bounded regular file');
  if(!READ_EXTENSIONS.has(extname(safe).toLowerCase()))throw Error('file extension unsupported for static artifact inspection');
  return {path:safe,relativePath:rel,size:info.size};
}
async function runRea(target){
  const evidenceDir=join(ROOT,'.rea-evidence');
  await mkdir(evidenceDir,{recursive:true});
  const fullEvidencePath=join(evidenceDir,'rea-full-'+randomUUID()+'.json');
  const pkg = JSON.parse(await readFile(join(PACKAGE,'package.json'),'utf8'));
  if(pkg.name!=='rea-agents'||pkg.version!==VERSION)throw Error('REA 6.8.0 installed runtime not found or version drifted');
  const launch=[ENTRY,'inspect-artifact',target.path,'--detail','summary','--evidence_output',fullEvidencePath,'--json'];
  return new Promise((accept,reject)=>{
    const proc=spawn(NODE,launch,{cwd:ROOT,env:{...process.env,NO_COLOR:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='',killed=false;
    const timer=setTimeout(()=>{killed=true;proc.kill();},45_000);
    proc.on('error',e=>{clearTimeout(timer);reject(e);});
    proc.stdout.on('data',chunk=>{stdout+=chunk.toString('utf8');if(Buffer.byteLength(stdout)>MAX_RESULT_BYTES){killed=true;proc.kill();}});
    proc.stderr.on('data',chunk=>{stderr+=chunk.toString('utf8');if(Buffer.byteLength(stderr)>100_000){killed=true;proc.kill();}});
    proc.on('close',code=>{clearTimeout(timer);if(killed)return reject(Error('REA inspection exceeded time or output limits'));if(code!==0)return reject(Error('REA inspection failed (exit '+code+'): '+stderr.slice(-350)));try{accept({payload:JSON.parse(stdout),raw:stdout,fullEvidencePath});}catch{return reject(Error('REA emitted non-JSON result'));}});
  });
}
async function inspect(args){
  try{
    if(!args||Object.keys(args).some(key=>key!=='path'))throw Error('only an exact artifact path is accepted');
    const target=await authorizedPath(args.path);
    const {payload,raw,fullEvidencePath}=await runRea(target);
    const fullEvidence=await readFile(fullEvidencePath,'utf8');
    const bundle=JSON.parse(fullEvidence);
    const record=bundle?.records?.find(r=>r?.normalized_result?.coverage?.scope==='container-entries');
    const rootDigest=bundle?.artifacts?.[0]?.digest?.sha256;
    const summary=payload?.summary;
    if(!record||!/^([a-f0-9]{64})$/.test(rootDigest||'')||!summary?.normalized_result)throw Error('REA missing complete artifact Evidence');
    if(Buffer.byteLength(fullEvidence)>MAX_RESULT_BYTES*10)throw Error('REA full evidence exceeds local budget');
    const evidenceHash=createHash('sha256').update(fullEvidence).digest('hex');
    const evidencePath=fullEvidencePath;
    const normalized=summary.normalized_result;
    const detail=normalized?.summary??null;
    const receipt={status:'INSPECTED_NOT_RIGHTS_CLEARED',reaVersion:VERSION,targetRelativePath:target.relativePath,targetBytes:target.size,artifactSha256:rootDigest,summaryEvidenceId:summary.evidence_id??null,sourceInventoryEvidenceId:record.evidence_id??null,evidenceSha256:evidenceHash,localEvidencePath:evidencePath,coverage:record.normalized_result.coverage,inventory:detail?.manifest??null,entryKindCounts:detail?.observed_entry_kind_counts??null,limitations:normalized?.limitations??[],unknowns:normalized?.unknowns??[],noAssetLicenseApproval:true,noSourceCodeReconstructionClaim:true};
    return {content:[{type:'text',text:JSON.stringify(receipt)}],structuredContent:receipt,isError:false};
  }catch(e){return problem(String(e?.message??e).slice(0,400));}
}
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){let m;try{m=JSON.parse(line);}catch{continue;}if(!m||m.jsonrpc!=='2.0'||m.id===undefined)continue;
  if(m.method==='initialize'){let v=m.params?.protocolVersion;respond(m.id,{protocolVersion:['2025-03-26','2025-06-18','2025-11-25'].includes(v)?v:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'mgr-rea-xray',version:'0.1.0'}});}
  else if(m.method==='ping')respond(m.id,{});
  else if(m.method==='tools/list')respond(m.id,{tools:TOOLS});
  else if(m.method==='tools/call'){if(m.params?.name!=='mgr_rea_inspect_artifact')respond(m.id,problem('tool denied'));else respond(m.id,await inspect(m.params?.arguments??{}));}
  else if(m.method==='resources/list')respond(m.id,{resources:[]});
  else if(m.method==='prompts/list')respond(m.id,{prompts:[]});
  else error(m.id,-32601,'unsupported MCP method');
}
