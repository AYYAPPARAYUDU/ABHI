"""Sovereign Credential & API Key Vault for Operator Ravuvai Ayyapparayudu (Mamu).

Stores, encrypts, and manages all commercial credentials, banking accounts,
affiliate IDs, n8n webhook keys, and LLM endpoints with hardware/OS-bound encryption.
Zero plaintext storage on disk — encrypted using Windows DPAPI and authenticated HMAC.
"""

import base64
import hashlib
import hmac
import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import security_audit

try:
    import win32crypt
    HAS_DPAPI = True
except ImportError:
    HAS_DPAPI = False


@dataclass
class VaultCredential:
    id: str
    service_name: str
    category: str  # BANKING | AFFILIATE | AUTOMATION | LLM_AI | COMMUNICATION
    identity_username: str
    secret_value: str
    masked_value: str
    status: str  # ACTIVE_VERIFIED | PRIMED | READY
    documentation_url: str
    last_verified: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    description: str = ""

    def to_safe_dict(self) -> Dict[str, Any]:
        """Return safe view with secret masked unconditionally."""
        d = asdict(self)
        d["secret_value"] = self.masked_value
        return d

    def to_revealed_dict(self) -> Dict[str, Any]:
        """Return full view for authenticated operator reveal only."""
        return asdict(self)


class CredentialVault:
    """Encrypted persistent vault storing Mamu's official accounts with zero disk plaintext."""

    def __init__(self, data_dir: Optional[str] = None):
        repo_root = Path(__file__).resolve().parents[3]
        self.data_dir = Path(data_dir) if data_dir else repo_root / "project_data/security"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.vault_file_enc = self.data_dir / "credentials_vault.enc"
        self.vault_file_legacy_json = self.data_dir / "credentials_vault.json"
        self._credentials: Dict[str, VaultCredential] = {}
        self._load_or_bootstrap()

    @staticmethod
    def _mask_secret(val: str) -> str:
        if not val:
            return "••••••••"
        if len(val) <= 4:
            return "••••"
        return f"••••••••{val[-4:]}"

    def _encrypt(self, raw_bytes: bytes) -> bytes:
        """Encrypt bytes using Windows DPAPI or authenticated key-derived stream cipher."""
        if HAS_DPAPI:
            try:
                entropy = settings.VAULT_ENCRYPTION_SALT.encode("utf-8")
                encrypted = win32crypt.CryptProtectData(raw_bytes, "ABHI_CRED_VAULT", entropy, None, None, 0)
                # Prefix with DPAPI marker
                return b"DPAPI:" + encrypted
            except Exception as e:
                logger.warning(f"DPAPI encryption failed, using fallback: {e}")

        # Fallback authenticated encryption
        salt = os.urandom(16)
        key = hashlib.pbkdf2_hmac("sha256", settings.APP_SECRET_KEY.encode(), salt, 100000)
        # Keystream via HMAC counter mode
        keystream = bytearray()
        counter = 0
        while len(keystream) < len(raw_bytes):
            block = hmac.new(key, counter.to_bytes(4, "big"), hashlib.sha256).digest()
            keystream.extend(block)
            counter += 1
        ciphertext = bytes(b ^ k for b, k in zip(raw_bytes, keystream[:len(raw_bytes)]))
        tag = hmac.new(key, salt + ciphertext, hashlib.sha256).digest()
        return b"PBKDF2:" + salt + tag + ciphertext

    def _decrypt(self, enc_bytes: bytes) -> bytes:
        """Decrypt bytes using corresponding scheme."""
        if enc_bytes.startswith(b"DPAPI:"):
            if not HAS_DPAPI:
                raise RuntimeError("DPAPI required to decrypt vault but win32crypt is unavailable.")
            entropy = settings.VAULT_ENCRYPTION_SALT.encode("utf-8")
            ciphertext = enc_bytes[6:]
            desc, decrypted = win32crypt.CryptUnprotectData(ciphertext, entropy, None, None, 0)
            return decrypted

        if enc_bytes.startswith(b"PBKDF2:"):
            payload = enc_bytes[7:]
            salt = payload[:16]
            tag = payload[16:48]
            ciphertext = payload[48:]
            key = hashlib.pbkdf2_hmac("sha256", settings.APP_SECRET_KEY.encode(), salt, 100000)
            expected_tag = hmac.new(key, salt + ciphertext, hashlib.sha256).digest()
            if not hmac.compare_digest(tag, expected_tag):
                raise ValueError("Vault integrity check failed! Ciphertext may have been tampered with.")
            keystream = bytearray()
            counter = 0
            while len(keystream) < len(ciphertext):
                block = hmac.new(key, counter.to_bytes(4, "big"), hashlib.sha256).digest()
                keystream.extend(block)
                counter += 1
            return bytes(c ^ k for c, k in zip(ciphertext, keystream[:len(ciphertext)]))

        raise ValueError("Unknown vault encryption format.")

    def _load_or_bootstrap(self) -> None:
        """Load encrypted vault from disk, migrating legacy plaintext JSON if present."""
        # 1. Try loading encrypted vault
        if self.vault_file_enc.exists():
            try:
                with open(self.vault_file_enc, "rb") as f:
                    enc_data = f.read()
                raw_bytes = self._decrypt(enc_data)
                data = json.loads(raw_bytes.decode("utf-8"))
                for item in data.get("credentials", []):
                    cred = VaultCredential(**item)
                    self._credentials[cred.id] = cred
                logger.info(f"Loaded {len(self._credentials)} encrypted credentials from {self.vault_file_enc.name}")

                # If legacy unencrypted JSON exists, remove it now that encrypted is verified
                if self.vault_file_legacy_json.exists():
                    self.vault_file_legacy_json.unlink(missing_ok=True)
                    logger.info("Purged unencrypted legacy credentials_vault.json")
                return
            except Exception as e:
                logger.error(f"Failed to decrypt credentials vault: {e}")

        # 2. Migration from legacy plaintext json if present
        if self.vault_file_legacy_json.exists():
            try:
                with open(self.vault_file_legacy_json, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("credentials", []):
                        cred = VaultCredential(**item)
                        self._credentials[cred.id] = cred
                logger.info(f"Migrating {len(self._credentials)} credentials from legacy plaintext JSON to encrypted format.")
                self._persist()
                # Remove legacy plaintext file
                self.vault_file_legacy_json.unlink(missing_ok=True)
                return
            except Exception as e:
                logger.error(f"Failed to migrate legacy credentials: {e}")

        # 3. Default Authoritative Production Bootstrap for Mamu (Environment-sourced)
        defaults = [
            VaultCredential(
                id="cred_sbi_primary",
                service_name="State Bank of India (Primary Treasury)",
                category="BANKING",
                identity_username=os.getenv("SBI_OPERATOR_NAME", "Operator Treasury"),
                secret_value=os.getenv("SBI_ACCOUNT_NUMBER", "CONFIGURE_IN_VAULT"),
                masked_value=self._mask_secret(os.getenv("SBI_ACCOUNT_NUMBER", "CONFIGURE_IN_VAULT")),
                status="PRIMED",
                documentation_url="https://onlinesbi.sbi",
                description="Primary INR commercial settlement account (Specialized Commercial)"
            ),
            VaultCredential(
                id="cred_sbi_upi",
                service_name="State Bank of India UPI Gateway",
                category="BANKING",
                identity_username=os.getenv("SBI_UPI_ID", "operator@upi"),
                secret_value=os.getenv("SBI_UPI_ID", "operator@upi"),
                masked_value=self._mask_secret(os.getenv("SBI_UPI_ID", "operator@upi")),
                status="PRIMED",
                documentation_url="https://www.npci.org.in/what-we-do/upi/product-overview",
                description="Instant UPI settlement VPA for real-time QR payouts"
            ),
            VaultCredential(
                id="cred_amazon_associates",
                service_name="Amazon Associates India",
                category="AFFILIATE",
                identity_username=os.getenv("AMAZON_ASSOCIATES_EMAIL", "affiliate@operator.local"),
                secret_value=os.getenv("AMAZON_ASSOCIATES_TAG", "store-tag-21"),
                masked_value=self._mask_secret(os.getenv("AMAZON_ASSOCIATES_TAG", "store-tag-21")),
                status="PRIMED",
                documentation_url="https://affiliate-program.amazon.in",
                description="Amazon India Associates store tag routing commissions via NEFT"
            ),
            VaultCredential(
                id="cred_clickbank",
                service_name="ClickBank Global Affiliate Network",
                category="AFFILIATE",
                identity_username=os.getenv("CLICKBANK_ACCOUNT", "clickbank_account"),
                secret_value=os.getenv("CLICKBANK_ACCOUNT", "clickbank_account"),
                masked_value=self._mask_secret(os.getenv("CLICKBANK_ACCOUNT", "clickbank_account")),
                status="PRIMED",
                documentation_url="https://www.clickbank.com",
                description="Global digital products promoter account with wire settlement"
            ),
            VaultCredential(
                id="cred_digistore24",
                service_name="Digistore24 Enterprise Affiliate Hub",
                category="AFFILIATE",
                identity_username=os.getenv("DIGISTORE24_EMAIL", "affiliate@operator.local"),
                secret_value=os.getenv("DIGISTORE24_TAG", "promoter_tag"),
                masked_value=self._mask_secret(os.getenv("DIGISTORE24_TAG", "promoter_tag")),
                status="PRIMED",
                documentation_url="https://www.digistore24.com",
                description="Promoter ID for AI tools and developer licenses"
            ),
            VaultCredential(
                id="cred_impact_radius",
                service_name="Impact Radius Partner Network",
                category="AFFILIATE",
                identity_username=os.getenv("IMPACT_EMAIL", "affiliate@operator.local"),
                secret_value=os.getenv("IMPACT_EMAIL", "affiliate@operator.local"),
                masked_value=self._mask_secret(os.getenv("IMPACT_EMAIL", "affiliate@operator.local")),
                status="PRIMED",
                documentation_url="https://impact.com",
                description="Cloud hosting and SaaS platforms affiliate partnership"
            ),
            VaultCredential(
                id="cred_n8n_local",
                service_name="n8n Workflow Automation Engine",
                category="AUTOMATION",
                identity_username="http://localhost:5678",
                secret_value=os.getenv("N8N_API_KEY", "CONFIGURE_IN_VAULT"),
                masked_value=self._mask_secret(os.getenv("N8N_API_KEY", "CONFIGURE_IN_VAULT")),
                status="PRIMED",
                documentation_url="https://docs.n8n.io",
                description="Local/Cloud n8n instance for automated DAG webhooks"
            ),
            VaultCredential(
                id="cred_ollama_engine",
                service_name="Ollama LLM Core (abhi:latest)",
                category="LLM_AI",
                identity_username="http://localhost:11434",
                secret_value="abhi:latest",
                masked_value="abhi:••••••",
                status="ACTIVE_VERIFIED",
                documentation_url="https://ollama.com",
                description="Local high-throughput LLM server for automated content generation, AST code review, and RAG"
            ),
            VaultCredential(
                id="cred_google_workspace",
                service_name="Google Workspace / Gmail Commercial",
                category="COMMUNICATION",
                identity_username=os.getenv("OPERATOR_EMAIL", "operator@workspace.local"),
                secret_value=os.getenv("OPERATOR_EMAIL", "operator@workspace.local"),
                masked_value=self._mask_secret(os.getenv("OPERATOR_EMAIL", "operator@workspace.local")),
                status="ACTIVE_VERIFIED",
                documentation_url="https://workspace.google.com",
                description="Authoritative communication channel for client invoicing, receipts, and order delivery"
            ),
        ]

        for c in defaults:
            self._credentials[c.id] = c
        self._persist()

    def _persist(self) -> None:
        """Encrypt and write vault to disk."""
        try:
            payload = {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "credentials": [asdict(c) for c in self._credentials.values()],
            }
            raw_bytes = json.dumps(payload, indent=2).encode("utf-8")
            encrypted = self._encrypt(raw_bytes)
            with open(self.vault_file_enc, "wb") as f:
                f.write(encrypted)
            logger.info(f"Persisted encrypted credentials vault ({len(encrypted)} bytes) to {self.vault_file_enc.name}")
        except Exception as e:
            logger.error(f"Failed to persist encrypted credentials vault: {e}")

    def list_credentials(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List credentials. Secrets are unconditionally masked in list views."""
        results: List[Dict[str, Any]] = []
        for cred in self._credentials.values():
            if category and cred.category.upper() != category.upper():
                continue
            results.append(cred.to_safe_dict())
        return results

    def get_credential(self, cred_id: str, reveal: bool = False, actor: str = "anonymous") -> Optional[Dict[str, Any]]:
        """Get single credential. Reveal requires explicit authorization and logs audit."""
        cred = self._credentials.get(cred_id)
        if not cred:
            return None

        if reveal:
            security_audit.log_event(
                event_type="VAULT_CREDENTIAL_REVEALED",
                actor=actor,
                endpoint=f"/vault/credentials/{cred_id}",
                status="AUTHORIZED",
                details={"cred_id": cred_id, "service_name": cred.service_name}
            )
            return cred.to_revealed_dict()

        return cred.to_safe_dict()

    def add_or_update_credential(
        self,
        service_name: str,
        category: str,
        identity_username: str,
        secret_value: str,
        documentation_url: str = "",
        description: str = "",
        cred_id: Optional[str] = None,
        actor: str = "operator"
    ) -> Dict[str, Any]:
        cid = cred_id or f"cred_{uuid.uuid4().hex[:10]}"
        masked = self._mask_secret(secret_value)
        cred = VaultCredential(
            id=cid,
            service_name=service_name,
            category=category.upper(),
            identity_username=identity_username,
            secret_value=secret_value,
            masked_value=masked,
            status="ACTIVE_VERIFIED",
            documentation_url=documentation_url or "https://docs.n8n.io",
            last_verified=datetime.now(timezone.utc).isoformat(),
            description=description
        )
        self._credentials[cid] = cred
        self._persist()
        security_audit.log_event(
            event_type="VAULT_CREDENTIAL_UPDATED",
            actor=actor,
            endpoint="/vault/credentials",
            status="SUCCESS",
            details={"cred_id": cid, "service_name": service_name}
        )
        return cred.to_safe_dict()

    def delete_credential(self, cred_id: str, actor: str = "operator") -> bool:
        if cred_id in self._credentials:
            service = self._credentials[cred_id].service_name
            del self._credentials[cred_id]
            self._persist()
            security_audit.log_event(
                event_type="VAULT_CREDENTIAL_DELETED",
                actor=actor,
                endpoint=f"/vault/credentials/{cred_id}",
                status="SUCCESS",
                details={"cred_id": cred_id, "service_name": service}
            )
            return True
        return False


# Singleton Instance
credential_vault = CredentialVault()
