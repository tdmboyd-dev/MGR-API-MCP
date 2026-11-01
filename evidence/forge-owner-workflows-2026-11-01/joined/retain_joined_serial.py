from pathlib import Path
prefix=(Path(__file__).parent/'qualify_forge_owner_joined.py').read_text().split('before=inputs();',1)[0].replace("out=b/'work/forge-owner-joined-qualification'","out=b/'work/forge-owner-joined-serial-retained'")
exec(prefix)
before=inputs();assert before==json.loads((b/'work/forge-owner-joined-qualification/source-before.json').read_text())
(out/'source-before.json').write_text(json.dumps(before,indent=2)+'\n');start=time.time();env=dict(os.environ);env['MGR_ONE_TEST_ROOT']=str(one)
for group in ['MGR_DEPT','MGR_CONNECTED']:
 for label,root in [('ONE',one),('EDGE',api),('CREATION',creation)]:env[group+'_'+label+'_ROOT']=str(root)
phases=json.loads((one/'evidence/owner-memory-history-recovery-2026-11-01/verification.json').read_text())['phases'][1:];runs=[]
for i,p in enumerate(phases):
 file='serial-'+str(i)+'.txt'
 with (out/file).open('wb') as log:run=subprocess.run(['node','--test','--test-concurrency='+str(p['concurrency']),*p['files']],cwd=one,env=env,stdout=log,stderr=subprocess.STDOUT)
 content=(out/file).read_text(encoding='utf-8',errors='replace');counts={k:int(re.search(r'(?:ℹ|#) '+k+r' (\d+)',content).group(1)) for k in ['tests','pass','fail','cancelled','skipped']};row={'log':file,'exitCode':run.returncode,'counts':counts,'files':p['files']};runs.append(row);print(json.dumps(row),flush=True)
after=inputs();(out/'source-after.json').write_text(json.dumps(after,indent=2)+'\n');proof={'passed':before==after and all(r['exitCode']==0 for r in runs),'sourceStable':before==after,'guardedInputs':len(before),'sameInputsAsJoinedQualification':True,'runs':runs,'elapsedSeconds':round(time.time()-start,2)};(out/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof),flush=True);raise SystemExit(not proof['passed'])
