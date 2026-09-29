"""Restore pinned public research checkouts without running their code."""
import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', action='append', required=True)
    parser.add_argument('--git', default=shutil.which('git'))
    args = parser.parse_args()
    if not args.git:
        parser.error('Git is required; supply --git PATH or add git to PATH')
    rows = json.loads((ROOT/'research/manifests/repositories.json').read_text())
    by_name = {r['name']: r for r in rows}
    for name in args.name:
        if name not in by_name:
            parser.error(f'Unknown manifest name: {name}')
    def git(*argv):
        return subprocess.check_output([args.git, *map(str, argv)], text=True).strip()
    reports=[]
    for name in args.name:
        row=by_name[name]
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', name):
            raise ValueError('Unsafe source name')
        if not re.fullmatch(r'https://github\.com/[\w.-]+/[\w.-]+',row['url']):
            raise ValueError('Only public GitHub repository URLs are accepted')
        if not re.fullmatch(r'[0-9a-f]{40}',row['commit']):
            raise ValueError('A full pinned commit is required')
        target=ROOT/'.local/vendor'/name
        if target.exists():
            if git('-C',target,'rev-parse','HEAD') != row['commit'] or git('-C',target,'status','--porcelain'):
                raise RuntimeError(f'Existing {name} is modified or a different revision; preserving it')
        else:
            target.parent.mkdir(parents=True,exist_ok=True)
            git('clone','--no-checkout',row['url'],target)
            git('-C',target,'checkout','--detach',row['commit'])
        observed=git('-C',target,'rev-parse','HEAD')
        if observed != row['commit']:
            raise RuntimeError(f'Commit mismatch for {name}')
        reports.append({'name':name,'commit':observed,'state':'RESTORED_NOT_INSTALLED','path':target.relative_to(ROOT).as_posix()})
    print(json.dumps(reports,indent=2))

if __name__ == '__main__':
    main()
