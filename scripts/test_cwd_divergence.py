import os
import sys
import subprocess
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

# Test 1: From project root
from backend.app.core.config import settings
print("From Project Root:")
print("  DATABASE_DIR:", settings.DATABASE_DIR)
print("  DATABASE_SQLITE_URL:", settings.DATABASE_SQLITE_URL)
assert Path(settings.DATABASE_DIR).is_absolute()
assert Path(settings.DATABASE_DIR) == (Path(__file__).resolve().parent.parent / "database")

# Test 2: Subprocess from backend/ directory
res = subprocess.run(
    ["python", "-c", "from app.core.config import settings; print(settings.DATABASE_DIR); print(settings.DATABASE_SQLITE_URL)"],
    cwd=os.path.abspath("backend"),
    capture_output=True,
    text=True
)
print("\nFrom backend/ directory:")
print("  STDOUT:\n", res.stdout.strip())
if res.stderr:
    print("  STDERR:\n", res.stderr.strip())
assert res.returncode == 0
lines = res.stdout.strip().splitlines()
assert lines[0] == str(Path(__file__).resolve().parent.parent / "database")
print("\nVERIFICATION PASSED: No CWD divergence possible. Both resolve to identical absolute path!")
