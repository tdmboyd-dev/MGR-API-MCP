"""Actual MCP StreamableHTTP protocol -> shared API auth -> Forge Python original 3D.

The verifier accepts only explicit test owner tokens, never a deployed JWT.
No production credentials are written to any file.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse,json,os,subprocess,sys,threading
repo=Path(__file__).resolve().parents[1]
forge=Path(os.environ.get("MGR_FORGE_SOURCE_DIR",repo.parent/"MGR-3D-FORGE"))
if not (forge/"forge/studio_server.py").is_file():
    raise RuntimeError("Forge source missing; set MGR_FORGE_SOURCE_DIR")
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--receipt",type=Path)
args=parser.parse_args()
human_mode=os.environ.get("MGR_RUN_HUMAN_LIPSYNC")=="1"
compose_mode=os.environ.get("MGR_RUN_WORLD_COMPOSITION")=="1"
target=args.receipt or repo/"evidence"/"forge-creator"/("2026-10-31-native-mcp-protocol-human.json" if human_mode else "2026-10-31-native-mcp-protocol-artifact-transfer.json")
if target.exists():raise FileExistsError("Refusing to overwrite existing proof; provide a fresh --receipt path before running jobs")
sys.path.insert(0,str(forge))
from forge.cli import build
from forge.spec import WorldSpec
from forge.studio_server import start_server

with TemporaryDirectory(prefix="mgr-mcp-protocol-") as temp:
    scratch=Path(temp)
    build(WorldSpec(seed=88,columns=2,rows=2,buildings=2),scratch/"world")
    human_mode=os.environ.get("MGR_RUN_HUMAN_LIPSYNC")=="1"
    compose_mode=os.environ.get("MGR_RUN_WORLD_COMPOSITION")=="1"
    blender_binary=r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
    blender_binary=os.environ.get("MGR_FORGE_BLENDER_BINARY",blender_binary)
    if (human_mode or compose_mode) and not Path(blender_binary).is_file():
        raise RuntimeError("Real Human Forge MCP proof requires installed Blender 5.2")
    service,studio=start_server(scratch/"world",scratch/"workspace",
                               blender=blender_binary if human_mode or compose_mode else "blender")
    t=threading.Thread(target=service.serve_forever,daemon=True)
    t.start()
    try:
        env=os.environ.copy()
        env["MGR_FORGE_STUDIO_URL"]=f"http://127.0.0.1:{service.server_port}"
        env["MGR_FORGE_STUDIO_TOKEN"]=studio.token
        process=subprocess.run(
            ["node","--import","tsx","scripts/verify-forge-native-mcp-protocol.mjs"],
            cwd=repo,env=env,capture_output=True,text=True,timeout=180)
        if process.returncode:
            print("MGR_LOCAL_MCP_PROTOCOL_FAILED",process.stderr[-4000:],process.stdout[-1800:])
            raise SystemExit(1)
        line=[x for x in process.stdout.splitlines() if x.startswith("MGR_FULL_MCP_PROTOCOL=")]
        if len(line)!=1:raise RuntimeError("missing unique verified MCP protocol receipt")
        proof=json.loads(line[0].partition("=")[2])
        if proof["status"]!="MGR_FULL_LOCAL_MCP_PROTOCOL_VERIFIED" or not (
           proof["stable_replay"] and proof["cross_tenant_execution_denied"] and
           proof["read_only_execution_denied"] and not proof["hosted_chatgpt_verified"] and
           proof.get("verified_mcp_binary_resource") is True and
           proof.get("private_read_only_access_approved") is True and
           proof.get("foreign_tenant_artifact_denied") is True and
           proof.get("same_tenant_foreign_actor_denied") is True):
            raise RuntimeError("MCP evidence incomplete")
        for name in ["creature-requests.json","biome-requests.json"]:
            if len(json.loads((scratch/"workspace"/name).read_text(encoding="utf8")))!=1:
                raise RuntimeError("Denied actor/scope/tenant must not allocate another job")
        valid={
          row["sha256"] for p in (scratch/"workspace"/"creature-requests.json",
                                scratch/"workspace"/"biome-requests.json")
          for row in json.loads(p.read_text(encoding="utf8")).values()
        }
        assert {proof["creature_sha256"],proof["biome_sha256"]}==valid
        if human_mode:
            human=proof.get("human_facial_blender_proof")
            if not human or human.get("actual_mcp_blob_verified") is not True:
                raise RuntimeError("Human MCP proof did not verify actual Blender GLB bytes")
            human_rows=json.loads((scratch/"workspace"/"human-lipsync-requests.json").read_text())
            if len(human_rows)!=1 or human["sha256"] not in {x.get("sha256") for x in human_rows.values()}:
                raise RuntimeError("Human MCP result did not persist in real Forge worker")
        target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():raise FileExistsError("do not overwrite prior actual MCP proof")
        target.write_text(json.dumps(proof,indent=2,sort_keys=True)+"\n",encoding="utf8")
        print("MGR_FULL_MCP_LOCAL_ACCEPTANCE_PASS="+json.dumps({
          "creature_sha256":proof["creature_sha256"],"biome_sha256":proof["biome_sha256"],
          "same_protocol_client":True,"cross_tenant_denied":True}))
    finally:
        service.shutdown();service.server_close();t.join(timeout=2)
