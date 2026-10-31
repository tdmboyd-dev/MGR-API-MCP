"""Cross-process Forge Studio -> API/MCP Source Atlas proof, no secrets logged.

Run from MGR-API-MCP with MGR-3D-FORGE checked out alongside it, or set
MGR_FORGE_SOURCE_DIR. No external services, paid model or GitHub Actions.
"""

import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import threading


api_root = Path(__file__).resolve().parent.parent
forge_root = Path(os.environ.get("MGR_FORGE_SOURCE_DIR", api_root.parent / "MGR-3D-FORGE"))
if not (forge_root / "forge" / "studio_server.py").is_file():
    raise SystemExit("MGR Forge checkout missing; set MGR_FORGE_SOURCE_DIR")

sys.path.insert(0, str(forge_root))
from forge.cli import build  # noqa: E402
from forge.spec import WorldSpec  # noqa: E402
from forge.studio_server import start_server  # noqa: E402


with TemporaryDirectory(prefix="mgr-forge-bridge-") as directory:
    scratch = Path(directory)
    build(WorldSpec(seed=42, columns=2, rows=2, buildings=2), scratch / "world")
    server, studio = start_server(scratch / "world", scratch / "workstation")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    environment = dict(os.environ)
    environment["MGR_FORGE_STUDIO_URL"] = f"http://127.0.0.1:{server.server_port}"
    environment["MGR_FORGE_STUDIO_TOKEN"] = studio.token
    try:
        result = subprocess.run(
            ["node", "--import", "tsx", "scripts/verify-forge-studio-client.mjs"],
            cwd=api_root, env=environment, capture_output=True, text=True, timeout=30,
        )
        if result.returncode:
            # This helper prints diagnostic errors, never the ephemeral token.
            raise RuntimeError("Forge bridge smoke failed: " + result.stderr[-1500:])
        print(result.stdout.strip())
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
