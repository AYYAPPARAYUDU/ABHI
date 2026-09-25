"""Deterministic Local HTTP Test Server for Browser Automation.

Serves the Stage 5.3 local test website over http://127.0.0.1:<port> to strictly adhere to
origin allowlist policy without requiring file:// URI access.
"""

import functools
import http.server
import socketserver
import threading
from pathlib import Path
from typing import Optional


class LocalTestHttpServer:
    """Lightweight background HTTP server bound strictly to 127.0.0.1."""

    def __init__(self, port: int = 8765):
        self.port = port
        self.host = "127.0.0.1"
        self._server: Optional[socketserver.TCPServer] = None
        self._thread: Optional[threading.Thread] = None
        self.site_dir = Path(__file__).parent.resolve()

    @property
    def base_url(self) -> str:
        return f"http://{self.host}:{self.port}"

    def start(self) -> None:
        """Start the HTTP server in a background daemon thread."""
        if self._server:
            return

        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(self.site_dir))
        
        # Allow socket reuse to prevent port binding conflicts in test runs
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True

        self._server = ReusableTCPServer((self.host, self.port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Shutdown the HTTP server."""
        if self._server:
            try:
                self._server.shutdown()
                self._server.server_close()
            except Exception:
                pass
            self._server = None
            self._thread = None


# Global singleton instance
local_http_test_server = LocalTestHttpServer(port=8765)
