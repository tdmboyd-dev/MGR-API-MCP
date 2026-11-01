import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync,realpathSync,lstatSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRepositoryManuals} from '../src/repository-manuals.mjs';
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
