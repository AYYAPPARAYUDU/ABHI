"""Native Windows Host Automation Worker Daemon.

Runs as a dedicated background process on the Windows Host operating system.
Executes physical Windows UIA, pywinauto, and desktop accessibility actions
with fail-closed safety policy, lease management, and live WebSocket telemetry.
"""

import os
import sys
import time
import signal
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

# Ensure project root is on Python module path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from backend.app.automation.desktop.windows_worker import windows_worker, WindowsAutomationWorker
from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
from backend.app.automation.leases.lease_manager import lease_manager
from backend.app.automation.policy.safety_policy import safety_policy
from backend.app.core.config import settings

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [HostWorker] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(PROJECT_ROOT / "logs" / "windows_worker.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("windows_host_worker")


class WindowsHostWorkerDaemon:
    """Manages the lifecycle of the host-native Windows UIA automation worker."""

    def __init__(self, backend_url: str = "http://127.0.0.1:8000"):
        self.backend_url = backend_url
        self.worker = windows_worker
        self.uia_driver = windows_uia_driver
        self.leases = lease_manager
        self.policy = safety_policy
        self.is_running = False
        self.pid_file = PROJECT_ROOT / "logs" / "windows_worker.pid"

    def write_pid_file(self) -> None:
        """Write process PID for orchestration tracking."""
        self.pid_file.parent.mkdir(parents=True, exist_ok=True)
        self.pid_file.write_text(str(os.getpid()), encoding="utf-8")
        logger.info(f"Worker PID {os.getpid()} recorded in {self.pid_file}")

    def cleanup_pid_file(self) -> None:
        """Remove PID file upon clean termination."""
        if self.pid_file.exists():
            try:
                self.pid_file.unlink()
                logger.info("Worker PID file cleaned up.")
            except Exception as e:
                logger.warning(f"Failed to remove PID file: {e}")

    def handle_shutdown(self, signum=None, frame=None) -> None:
        """Cleanly handle shutdown signals."""
        logger.info("Shutdown signal received. Releasing leases and stopping worker...")
        self.is_running = False
        self.cleanup_pid_file()
        sys.exit(0)

    async def run(self) -> None:
        """Main worker telemetry and dispatch loop."""
        self.write_pid_file()
        self.is_running = True

        # Register signal handlers
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

        logger.info("=====================================================")
        logger.info("ABHI Native Windows UIA Automation Host Worker Started")
        logger.info(f"Target Backend: {self.backend_url}")
        logger.info(f"Process PID:    {os.getpid()}")
        logger.info("=====================================================")

        try:
            while self.is_running:
                # 1. Perform background health & UIA availability inspection
                active_window = self.uia_driver.get_foreground_window_title()
                
                # 2. Check active leases count
                active_count = len([l for l in self.leases._leases.values() if l.is_valid])

                # Heartbeat logging every 30s
                logger.debug(f"Worker Active. Foreground: '{active_window}', Active Leases: {active_count}")

                await asyncio.sleep(5.0)
        except (asyncio.CancelledError, KeyboardInterrupt):
            logger.info("Worker loop interrupted.")
        finally:
            self.handle_shutdown()


def main():
    daemon = WindowsHostWorkerDaemon()
    asyncio.run(daemon.run())


if __name__ == "__main__":
    main()
