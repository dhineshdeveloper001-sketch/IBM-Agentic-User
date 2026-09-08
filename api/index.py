"""
Vercel Serverless Entry Point for TalentLens
"""
import sys
import traceback
from pathlib import Path

# Add project root and lambda task path to sys.path
ROOT = Path(__file__).resolve().parent.parent
for p in [ROOT, Path.cwd(), Path("/var/task")]:
    sp = str(p)
    if sp not in sys.path:
        sys.path.insert(0, sp)

try:
    from src.server import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="TalentLens Startup Fallback")
    err_msg = str(e)
    err_tb = traceback.format_exc()

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    async def catch_all(path_name: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "status": "startup_error",
                "error": err_msg,
                "traceback": err_tb,
                "requested_path": path_name,
            },
        )


