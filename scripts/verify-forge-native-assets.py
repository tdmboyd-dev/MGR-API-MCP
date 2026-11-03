"""Disposable secured native Forge + actual SDK/shared HTTP asset-job proof."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
from tempfile import TemporaryDirectory
import threading
import zlib

repo=Path(__file__).resolve().parents[1]
forge=Path(os.environ.get('MGR_FORGE_SOURCE_DIR',repo.parent/'MGR-3D-FORGE'))
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--receipt',type=Path,required=True)
args=parser.parse_args()
target=args.receipt.resolve()
if target.exists():raise FileExistsError('fresh proof receipt required')
sys.path.insert(0,str(forge))
from forge.cli import build
from forge.spec import WorldSpec
from forge.geometry import Mesh
from forge.glb import export_glb
from forge.studio_server import start_server


def source_window():
    paths=list((repo/'src').glob('*.ts'))+list((forge/'forge').rglob('*.py'))
    paths.extend([Path(__file__),repo/'scripts/verify-forge-native-assets-protocol.mjs'])
    return {str(path.relative_to(repo) if path.is_relative_to(repo) else Path('native-forge')/path.relative_to(forge)):
            hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(paths)}


def png(rows):
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    data=b''.join(bytes([0])+bytes(255 if cell else 0 for cell in row) for row in rows)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',len(rows[0]),len(rows),8,0,0,0,0))+chunk(b'IDAT',zlib.compress(data))+chunk(b'IEND',b'')


before=source_window()
with TemporaryDirectory(prefix='mgr-native-asset-mcp-') as temporary:
    scratch=Path(temporary)
    build(WorldSpec(seed=88,columns=2,rows=2,buildings=2),scratch/'world')
    front=png([[4<=x<28 if 8<=y<24 else 8<=x<24 for x in range(32)] for y in range(32)])
    side=png([[8<=x<24 for x in range(32)] for _ in range(32)])
    mesh=Mesh();mesh.box(0,0,0,1,2,1)
    model=export_glb([mesh],name='Original owned native proof box',materials=(('proof-box',[.6,.7,.8,1]),))
    inputs={'reconstruction':{'requestId':'mcp-native-reconstruct-0001','frontPngBase64':base64.b64encode(front).decode(),
               'sidePngBase64':base64.b64encode(side).decode(),'bounds':{'width':2,'height':3,'depth':2},'grid':32,'surface':'smooth'},
            'morph':{'requestId':'mcp-native-morph-0001','glbBase64':base64.b64encode(model).decode(),
               'expectedSha256':hashlib.sha256(model).hexdigest(),'morph':{'twist_degrees':12,'taper':1.1}},
            'uv':{'requestId':'mcp-native-uv-0001','glbBase64':base64.b64encode(model).decode(),
                  'expectedSha256':hashlib.sha256(model).hexdigest(),'atlasSize':2048,'padding':2}}
    service,studio=start_server(scratch/'world',scratch/'workspace')
    thread=threading.Thread(target=service.serve_forever,daemon=True);thread.start()
    try:
        environment=os.environ.copy()
        environment.update(MGR_FORGE_STUDIO_URL=f'http://127.0.0.1:{service.server_port}',MGR_FORGE_STUDIO_TOKEN=studio.token,
                           MGR_FORGE_QA_ASSET_INPUTS=json.dumps(inputs))
        process=subprocess.run(['node','--import','tsx','scripts/verify-forge-native-assets-protocol.mjs'],cwd=repo,env=environment,
                               capture_output=True,text=True,timeout=180)
        if process.returncode:
            print('NATIVE_ASSET_PROTOCOL_FAILED',process.stdout[-2500:],process.stderr[-4500:]);raise SystemExit(1)
        lines=[line for line in process.stdout.splitlines() if line.startswith('MGR_NATIVE_ASSET_PROTOCOL=')]
        if len(lines)!=1:raise RuntimeError('unique native proof missing')
        proof=json.loads(lines[0].partition('=')[2])
        if proof['status']!='REAL_SDK_HTTP_NATIVE_ASSETS_PASS' or len(proof['cases'])!=3:raise RuntimeError('incomplete protocol evidence')
        counts={}
        for case in proof['cases']:
            rows=json.loads((scratch/'workspace'/(case['kind']+'-requests.json')).read_text(encoding='utf8'))
            if len(rows)!=1 or rows[case['requestId']]['sha256']!=case['sha256']:raise RuntimeError('native journal identity or duplicate job changed')
            counts[case['kind']]=len(rows)
            job=studio.valid_job(case['jobId'])
            path=job/{'reconstruction':'reconstructed/hull.glb','morph':'morphed/morphed.glb','uv':'uv/uv-mapped.glb'}[case['kind']]
            if hashlib.sha256(path.read_bytes()).hexdigest()!=case['sha256'] or path.stat().st_size!=case['bytes']:
                raise RuntimeError('original stored native artifact disagrees with independent MCP bytes')
        jobs=list((scratch/'workspace/jobs').iterdir())
        if len(jobs)!=3:raise RuntimeError('denied/replay/read unexpectedly allocated native jobs')
        after=source_window()
        if before!=after:raise RuntimeError('owning runtime source changed during proof; retain failure and requalify')
        proof.update(nativeJournalCounts=counts,totalNativeJobs=len(jobs),deniedReplayReadCreatedNoAdditionalJobs=True,
                     sourceWindowStable=True,sourceFiles=len(before),sourceSha256=before,
                     fixture='original locally generated grayscale PNG masks and static box GLB',permanentOwnerStateTouched=False)
        target.parent.mkdir(parents=True,exist_ok=True)
        with target.open('x',encoding='utf8',newline='\n') as output:output.write(json.dumps(proof,indent=2,sort_keys=True)+'\n')
        print('MGR_NATIVE_ASSET_PROTOCOL_PASS='+json.dumps({'kinds':counts,'jobs':len(jobs),'sourceFiles':len(before)}))
    finally:
        service.shutdown();service.server_close();thread.join(timeout=2)
