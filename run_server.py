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
import asyncio

def setup_windows_proactor_handler():
    if sys.platform == "win32":
        try:
            import asyncio.proactor_events
            orig_call_conn_lost = asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost

            def safe_call_conn_lost(self, exc=None):
                try:
                    orig_call_conn_lost(self, exc)
                except (ConnectionResetError, ConnectionAbortedError, OSError):
                    pass

            asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost = safe_call_conn_lost
        except Exception:
            pass

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            orig_handler = loop.get_exception_handler()

            def custom_handler(loop_instance, context):
                exc = context.get("exception")
                if isinstance(exc, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
                    return
                if isinstance(exc, OSError) and getattr(exc, "winerror", None) in (64, 121, 10054):
                    return
                if orig_handler:
                    orig_handler(loop_instance, context)
                else:
                    loop_instance.default_exception_handler(context)

            loop.set_exception_handler(custom_handler)
        except Exception:
            pass

if __name__ == "__main__":
    setup_windows_proactor_handler()
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, log_level="info")


