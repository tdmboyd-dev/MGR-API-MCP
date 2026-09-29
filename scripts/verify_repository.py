"""Check the research home and optionally its private checkpoint. No network."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[1]

def verify(root=ROOT, local=False):
    errors=[]
    checked=0
    public=[p for p in root.rglob('*') if p.is_file() and not any(x in {'.git','.local','__pycache__','node_modules'} for x in p.relative_to(root).parts)]
    for name in ['README.md','AGENTS.md','BEAST-UNIVERSAL.md','HANDOFF.md','BUILD-QUEUE.md','AUDIT-LEDGER.md','research/README.md','docs/full-build/SCORECARD.md']:
        checked+=1
        if not (root/name).is_file(): errors.append(f'Missing required file: {name}')
    for p in public:
        rel=p.relative_to(root).as_posix()
        if p.suffix in {'.zip','.pdf','.pem','.key','.pfx','.p12'} or p.name.startswith('.env'):
            errors.append(f'Unexpected public binary/secret-config file: {rel}')
        if p.suffix=='.json':
            checked+=1
            try: json.loads(p.read_text(encoding='utf-8'))
            except (ValueError,UnicodeError) as e: errors.append(f'Invalid JSON: {rel}: {e}')
        if p.suffix=='.md':
            text=p.read_text(encoding='utf-8')
            for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
                if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',link) or link.startswith('#'): continue
                path=unquote(link.split('#')[0].split(' "')[0])
                checked+=1
                if not (p.parent/path).exists(): errors.append(f'Broken local link in {rel}: {link}')
        if p.suffix in {'.md','.json','.txt','.mjs','.py','.yml','.yaml'}:
            text=p.read_text(encoding='utf-8')
            patterns=[r'gh[pousr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{40,}',r'sk-[A-Za-z0-9_-]{30,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'https://files\.skool\.com/[^\s"<>]*[?&]Signature=']
            checked+=1
            if any(re.search(pattern,text) for pattern in patterns): errors.append(f'Potential secret or signed URL in {rel}; inspect locally')
    if local:
        inventory=json.loads((root/'research/manifests/checkpoint-inventory.json').read_text())
        for row in inventory:
            checked+=1
            p=(root/row['local_path']).resolve()
            if not p.is_relative_to((root/'.local').resolve()):
                errors.append('Unsafe local inventory path'); continue
            if not p.is_file() or p.stat().st_size!=row['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:
                errors.append(f'Checkpoint missing or changed: {row["checkpoint_path"]}')
        for manifest in ['community-additions-2026-09-28.json','standards-2026-09-28.json']:
            data=json.loads((root/'research/manifests'/manifest).read_text())
            for row in data if isinstance(data,list) else data['files']:
                checked+=1
                p=(root/row['local_path']).resolve()
                if not p.is_relative_to((root/'.local').resolve()):
                    errors.append('Unsafe acquisition path'); continue
                if not p.is_file() or p.stat().st_size!=row['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:
                    errors.append(f'Acquisition missing or changed: {row["local_path"]}')
    return {'scope':'Research repository integrity only; not assistant/runtime/provider verification','checks':checked,'failures':len(errors),'errors':errors,'status':'PASS' if not errors else 'FAIL'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local',action='store_true')
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    result=verify(local=args.local)
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2))
    raise SystemExit(bool(result['failures']))
