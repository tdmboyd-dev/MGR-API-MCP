import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync,realpathSync,lstatSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRepositoryManuals,MANUAL_RESPONSE_BYTES} from '../src/repository-manuals.mjs';
function fixture(t:any,bytes:Buffer|string,path='README.md'){
 const outer=mkdtempSync(join(tmpdir(),'owned-api-manual-')),root=join(outer,'tool');mkdirSync(root);
 const git=(...args:string[])=>execFileSync('git',['-C',root,...args],{stdio:'pipe',windowsHide:true}).toString().trim();
 git('init');git('config','core.autocrlf','false');git('config','user.name','Owned fixture');git('config','user.email','owned@example.invalid');
 writeFileSync(join(root,path),bytes);git('add','.');git('commit','-m','Owned committed source');
 t.after(()=>rmSync(outer,{recursive:true,force:true}));const reader=createRepositoryManuals({tool:root});const index=reader.read('tool') as any;
 return {outer,root,git,reader,index};
}
test('malformed UTF8 cannot be silently replaced and published with a misleading content hash',t=>{
 const f=fixture(t,Buffer.from([0x23,0x20,0xc3,0x28,0x0a]));assert.throws(()=>f.reader.read('tool',{document:f.index.documents[0].id}),/utf.?8/i);
});
test('valid Unicode/BOM/CRLF documents preserve the committed byte hash and readable text',t=>{
 const raw=Buffer.from('\uFEFF# MGR 制作\r\nCafé instructions\r\n'),f=fixture(t,raw,'制作.md'),page=f.reader.read('tool',{document:f.index.documents[0].id}) as any;
 assert.equal(page.source.path,'制作.md');assert.equal(page.source.sha256,createHash('sha256').update(raw).digest('hex'));assert.equal(page.text,'\uFEFF# MGR 制作\nCafé instructions');
});
test('a replacement directory at the same enrolled path cannot inherit old repository knowledge enrollment',t=>{
 const f=fixture(t,'# Original tool\n'),resolved=realpathSync(f.root),inside=relative(realpathSync(f.outer),resolved);assert.ok(inside&&!inside.startsWith('..')&&!isAbsolute(inside));assert.equal(lstatSync(resolved).isSymbolicLink(),false);
 renameSync(resolved,join(f.outer,'original-retained'));mkdirSync(f.root);f.git('init');f.git('config','user.name','Owned replacement');f.git('config','user.email','owned@example.invalid');writeFileSync(join(f.root,'README.md'),'# Replacement tool\n');f.git('add','.');f.git('commit','-m','Different root identity');
 assert.throws(()=>f.reader.read('tool'),/manual-project-unavailable/);
});
test('an oversized source document and a line beyond the page budget are refused explicitly',t=>{
 for(const [bytes,error] of [[Buffer.alloc(1048577,65),/manual-document-limit/],['X'.repeat(6501),/manual-line-exceeds-page-bound/]] as const){const f=fixture(t,bytes);assert.throws(()=>f.reader.read('tool',{document:f.index.documents[0].id}),error);}
});

test('manual continuations require the original revision and refuse a changed checkout',t=>{
 const f=fixture(t,Array.from({length:80},(_,i)=>'Line '+(i+1)).join('\n'));
 const document=f.index.documents[0].id,first=f.reader.read('tool',{document}) as any;
 assert.equal(first.nextStartLine,61);
 assert.throws(()=>f.reader.read('tool',{document,startLine:61}),/continuation-commit-required/);
 const pinned=f.reader.read('tool',{document,startLine:61,expectedCommit:first.source.commit}) as any;
 assert.match(pinned.text,/^Line 61\n/);
 writeFileSync(join(f.root,'README.md'),'# New revision\n');
 f.git('add','.');f.git('commit','-m','Change owning source');
 assert.throws(()=>f.reader.read('tool',{document,startLine:61,expectedCommit:first.source.commit}),/manual-source-changed/);
 assert.notEqual((f.reader.read('tool',{document}) as typeof first).source.commit,first.source.commit);
});

test('long committed paths paginate within the actual MCP response bound',t=>{
 const f=fixture(t,'# Manual');
 const blob=f.git('rev-parse','HEAD:README.md');
 for(let i=0;i<21;i++){
  const path=Array.from({length:6},()=> 'a'.repeat(100)).join('/')+'/manual-'+i+'.md';
  f.git('update-index','--add','--cacheinfo','100644,'+blob+','+path);
 }
 f.git('commit','-m','Index nested manuals without checking them out');
 const paths:string[]=[];
 let page=f.reader.read('tool') as any;
 const commit=page.source.commit;
 assert.ok(page.documents.length<20);
 while(true){
  assert.ok(Buffer.byteLength(JSON.stringify(page))<=MANUAL_RESPONSE_BYTES);
  paths.push(...page.documents.map((doc:{path:string})=>doc.path));
  if(page.nextStartLine===null)break;
  page=f.reader.read('tool',{startLine:page.nextStartLine,expectedCommit:commit}) as any;
 }
 assert.equal(paths.length,22);
 assert.equal(new Set(paths).size,22);
});

test('JSON-escaped manual lines fit the wire limit and replay without gaps',t=>{
 const lines=Array.from({length:9},(_,i)=>String(i)+String.fromCharCode(9).repeat(1000));
 const f=fixture(t,lines.join('\n')),document=f.index.documents[0].id;
 let page=f.reader.read('tool',{document}) as any;
 assert.ok(page.endLine<6);
 const commit=page.source.commit,recovered:string[]=[];
 while(true){
  assert.ok(Buffer.byteLength(JSON.stringify(page))<=MANUAL_RESPONSE_BYTES);
  recovered.push(...page.text.split('\n'));
  if(page.nextStartLine===null)break;
  page=f.reader.read('tool',{document,startLine:page.nextStartLine,expectedCommit:commit}) as any;
 }
 assert.deepEqual(recovered,lines);
});

test('archived handoffs and collaborator snapshots cannot be read as operating manuals',t=>{
 const f=fixture(t,'# Current root manual');
 const archived=['docs/history/HANDOFF.md','docs/recovery/collaborator-checkpoints-2026-10-28/crown/HANDOFF.md'];
 const current='docs/recovery/CURRENT-RUNBOOK.md';
 for(const path of [...archived,current]){
  mkdirSync(join(f.root,path.slice(0,path.lastIndexOf('/'))),{recursive:true});
  writeFileSync(join(f.root,path),'# Repository handoff');
 }
 f.git('add','.');f.git('commit','-m','Preserve historical and operating handoffs');
 const index=f.reader.read('tool') as any;
 assert.deepEqual(index.documents.map((doc:{path:string})=>doc.path).sort(),['README.md',current]);
 for(const path of archived){
  const document='doc-'+createHash('sha256').update(path).digest('hex').slice(0,16);
  assert.throws(()=>f.reader.read('tool',{document,expectedCommit:index.source.commit}),/manual-document-unavailable/);
 }
});

test('manual inventory hash distinguishes documentation changes from unrelated commits',t=>{
 const f=fixture(t,'# Original manual');
 const before=f.index.source;
 writeFileSync(join(f.root,'code.js'),'export const sample = true;');
 f.git('add','.');f.git('commit','-m','Change only code');
 const code=(f.reader.read('tool') as any).source;
 assert.notEqual(code.commit,before.commit);
 assert.match(code.indexSha256,/^[a-f0-9]{64}$/);
 assert.equal(code.indexSha256,before.indexSha256);
 writeFileSync(join(f.root,'README.md'),'# Revised manual');
 f.git('add','.');f.git('commit','-m','Change operating manual');
 const revised=(f.reader.read('tool') as any).source;
 assert.notEqual(revised.indexSha256,code.indexSha256);
 assert.throws(()=>f.reader.read('tool',{expectedCommit:code.commit}),/manual-source-changed/);
});
