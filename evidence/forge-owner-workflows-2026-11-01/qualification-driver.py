from pathlib import Path
import subprocess,hashlib,json,os,time,re
b=Path(__file__).resolve().parent.parent;one=b/'work/one-forge-actions';api=Path('C:/Users/cool/Documents/Codex/Projects/MGR-API-MCP');forge=api.parent/'MGR-3D-FORGE';creation=Path('C:/Users/cool/Documents/Codex/2026-10-28/files-mentioned-by-the-user-mgr/work/repos/MGR-CREATE-Os');out=b/'work/forge-owner-qualification-final';out.mkdir(exist_ok=False)
assert (creation/'src/api/local-service.ts').is_file(), 'Qualified original native Creation service required'
def inputs():
 result={}
 for tag,root,folders in [('ONE',one,('web','scripts','src','dist')),('API',api,('src','scripts','test')),('FORGE',forge,('forge','bridge','scripts','viewer')),('CREATION_NATIVE',creation,('src','scripts','test'))]:
  names=set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=root,text=True).splitlines())
  if tag=='ONE':names.update(p.relative_to(root).as_posix() for p in (root/'dist').rglob('*') if p.is_file())
  for name in sorted(names):
   p=root/name
   if p.is_file() and (name.split('/')[0] in folders or name.startswith(('package','tsconfig'))) and p.suffix in ['.ts','.mts','.js','.mjs','.py','.json','.css','.html']:result[tag+'/'+name]=hashlib.sha256(p.read_bytes()).hexdigest()
 return result
before=inputs();(out/'source-before.json').write_text(json.dumps(before,indent=2)+'\n');start=time.time();phases=json.loads((one/'evidence/workspace-storage-2026-11-01/verification.json').read_text())['phases'];phases[0]['files'].append('web/forge-workflows.test.mjs');env=dict(os.environ);env['MGR_ONE_TEST_ROOT']=str(one);runs=[]
for prefix in ['MGR_DEPT','MGR_CONNECTED']:
 for label,root in [('ONE',one),('EDGE',api),('CREATION',creation)]:env[prefix+'_'+label+'_ROOT']=str(root)
jobs=[('api-verify.txt',['cmd','/d','/c','npm run verify'],api)]+[(('primary.txt' if i==0 else 'timed.txt'),['node','--test','--test-concurrency='+str(p['concurrency']),*p['files']],one) for i,p in enumerate(phases)]
for file,args,cwd in jobs:
 with (out/file).open('wb') as log:run=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 text=(out/file).read_text(encoding='utf-8',errors='replace');counts={key:int(re.search(r'(?:ℹ|#) '+key+r' (\d+)',text).group(1)) for key in ['tests','pass','fail','cancelled','skipped'] if re.search(r'(?:ℹ|#) '+key+r' (\d+)',text)}
 result={'log':file,'exitCode':run.returncode,'counts':counts};runs.append(result);print(json.dumps(result),flush=True)
after=inputs();(out/'source-after.json').write_text(json.dumps(after,indent=2)+'\n');proof={'passed':all(r['exitCode']==0 for r in runs) and before==after,'sourceStable':before==after,'guardedInputs':len(before),'changed':[n for n in before if before[n]!=after.get(n)],'added':sorted(set(after)-set(before)),'removed':sorted(set(before)-set(after)),'runs':runs,'OneTestFiles':sum(len(p['files']) for p in phases),'sourceBaseONE':subprocess.check_output(['git','rev-parse','HEAD'],cwd=one,text=True).strip(),'elapsedSeconds':round(time.time()-start,2),'modelCalls':0,'permanentForgeInstallationVerified':False,'productionVerified':False};(out/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof),flush=True);raise SystemExit(not proof['passed'])
