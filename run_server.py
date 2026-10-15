"""Authoritative server launcher for ABHI Backend with embedded site-packages."""
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
site_pkgs = os.path.join(root_dir, ".venv", "Lib", "site-packages")

if site_pkgs not in sys.path:
    sys.path.insert(0, site_pkgs)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ["PYTHONPATH"] = f"{site_pkgs};{root_dir};" + os.environ.get("PYTHONPATH", "")

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, log_level="info")
