"""
Vercel Serverless Entry Point for TalentLens
"""
import sys
from pathlib import Path

# Add project root and lambda task path to sys.path
ROOT = Path(__file__).resolve().parent.parent
for p in [ROOT, Path.cwd(), Path("/var/task")]:
    sp = str(p)
    if sp not in sys.path:
        sys.path.insert(0, sp)

from src.server import app

# Vercel ASGI Handler
app = app

