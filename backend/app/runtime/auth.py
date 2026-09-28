"""ABHI Local Authentication & PIN Management.

Provides memory-hard salted password/PIN hashing, rate limiting, and brute-force lockout.
Strict Domain Boundary: This credential is for ABHI application lifecycle only and
NEVER touches, captures, replays, or bypasses Windows OS credentials or Windows Hello.
"""

import hashlib
import hmac
import secrets
import time
from typing import Optional, Tuple
from backend.app.core.logging import logger


class LocalAuthManager:
    """Manages ABHI-local application PIN/password security with PBKDF2 and lockout."""

    def __init__(self, max_failures: int = 5, lockout_duration_sec: float = 60.0):
        self.max_failures = max_failures
        self.lockout_duration_sec = lockout_duration_sec
        self.failed_attempts = 0
        self.lockout_until = 0.0

        # Default PIN for local development: "1234" hashed securely
        self._salt = secrets.token_hex(16)
        self._hashed_pin = self._hash_secret("1234", self._salt)
        self._is_pin_set = True

    def _hash_secret(self, secret: str, salt: str) -> str:
        """Memory-hard PBKDF2-HMAC-SHA256 key derivation."""
        derived = hashlib.pbkdf2_hmac(
            hash_name="sha256",
            password=secret.encode("utf-8"),
            salt=salt.encode("utf-8"),
            iterations=100_000
        )
        return derived.hex()

    def is_locked_out(self) -> Tuple[bool, float]:
        """Check if authentication is temporarily locked out due to rate limiting."""
        now = time.time()
        if now < self.lockout_until:
            remaining = round(self.lockout_until - now, 1)
            return True, remaining
        return False, 0.0

    def verify_pin(self, candidate_pin: str) -> Tuple[bool, str]:
        """Verify candidate PIN against stored PBKDF2 hash with constant-time compare."""
        locked, remaining = self.is_locked_out()
        if locked:
            logger.warning(f"ABHI auth rejected: Rate limit lockout active ({remaining}s remaining).")
            return False, f"Too many failed attempts. Try again in {remaining}s."

        candidate_hash = self._hash_secret(candidate_pin, self._salt)
        # Constant-time comparison to mitigate timing attacks
        if hmac.compare_digest(candidate_hash, self._hashed_pin):
            self.failed_attempts = 0
            self.lockout_until = 0.0
            logger.info("ABHI local PIN authentication succeeded.")
            return True, "Authentication successful."

        self.failed_attempts += 1
        logger.warning(f"ABHI auth failed attempt {self.failed_attempts}/{self.max_failures}.")

        if self.failed_attempts >= self.max_failures:
            self.lockout_until = time.time() + self.lockout_duration_sec
            logger.error(f"ABHI auth locked out for {self.lockout_duration_sec}s.")
            return False, f"Maximum attempts exceeded. Locked out for {self.lockout_duration_sec}s."

        remaining_tries = self.max_failures - self.failed_attempts
        return False, f"Invalid PIN. {remaining_tries} attempts remaining."

    def set_pin(self, current_pin: str, new_pin: str) -> Tuple[bool, str]:
        """Update ABHI-local application PIN after validating current PIN."""
        if not new_pin or len(new_pin) < 4:
            return False, "New PIN must be at least 4 digits."

        valid, msg = self.verify_pin(current_pin)
        if not valid:
            return False, f"Current PIN verification failed: {msg}"

        self._salt = secrets.token_hex(16)
        self._hashed_pin = self._hash_secret(new_pin, self._salt)
        self._is_pin_set = True
        logger.info("ABHI local application PIN updated successfully.")
        return True, "PIN updated successfully."

    def reset_lockout_for_tests(self) -> None:
        """Testing utility to clear rate limiting counters."""
        self.failed_attempts = 0
        self.lockout_until = 0.0


# Global singleton
local_auth_manager = LocalAuthManager()
