import os
import sys

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Disable compiled Cython extensions if Application Control policy blocks DLLs
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"
os.environ["SQLALCHEMY_DISABLE_CEXTENSIONS"] = "1"
os.environ["SQLALCHEMY_WARN_20"] = "1"

# Force fallback for sqlalchemy._util_cy if needed
try:
    import sqlalchemy.cyextension
except ImportError:
    pass
