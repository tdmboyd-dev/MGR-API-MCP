import fs from 'node:fs';

export interface ProjectBinding {actorId:string;tenantId:string;project:string}
/** Read host-owned grants. This validates an existing binding file; it issues no
 * identity, permission or project enrollment and is never caller-configurable. */
export function projectBindingReader(file:string,label:string):()=>ProjectBinding[]{
 return ()=>{
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>65536)throw Error(`${label} binding file unavailable`);
  const value:unknown=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(value)||value.length>256)throw Error(`Invalid ${label} binding list`);
  const keys=new Set<string>();
  for(const entry of value){
   if(!entry||typeof entry!=='object'||Object.keys(entry).sort().join(',')!=='actorId,project,tenantId')throw Error(`Invalid ${label} binding`);
   for(const key of ['tenantId','actorId','project'])if(typeof entry[key]!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/.test(entry[key]))throw Error(`Invalid ${label} binding identity`);
   const key=JSON.stringify([entry.tenantId,entry.actorId,entry.project]);if(keys.has(key))throw Error(`Duplicate ${label} binding`);keys.add(key);
  }
  return value;
 };
}
