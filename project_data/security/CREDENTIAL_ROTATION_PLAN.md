# Project ABHI — Sovereign Credential Inventory & Rotation Plan

**Date:** 2026-11-24  
**Authoritative Security Officer:** Sovereign Security Subsystem  
**Scope:** Operator Ravuvai Ayyapparayudu (Mamu) Production Accounts & Webhooks  

---

## 1. Executive Summary
During Stage A, a security audit revealed that commercial banking, affiliate network accounts, and automation API tokens were stored in an unencrypted file (`project_data/security/credentials_vault.json`) and exposed over an unauthenticated REST endpoint (`GET /api/v1/business/vault/credentials?show_secrets=true`).

Under Stage B Phase 0:
1. The plaintext vault file was permanently purged from disk.
2. An encrypted vault (`credentials_vault.enc`) using Windows DPAPI (tied to local user TPM/OS credentials) and HMAC-SHA256 was implemented.
3. Plaintext secret disclosure in list views was disabled; single-secret access now strictly requires authenticated `OPERATOR` privileges and writes an entry to `project_data/security/security_audit.log`.

---

## 2. Inventory of Affected Credentials (Zero Secret Values Disclosed)

| Credential ID | Service Name | Category | Masked Identifier | Rotation Feasibility | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cred_sbi_primary` | State Bank of India | Banking | A/C ending in `5649` | External Bank Procedure | External bank account cannot be rotated by software. Protect via DPAPI encryption & strict RBAC. |
| `cred_sbi_upi` | State Bank of India UPI | Banking | VPA ending in `@ybl` | External Bank Procedure | VPA is linked to primary bank account. Verified local-only. |
| `cred_amazon_associates` | Amazon Associates India | Affiliate | Tag ending in `-21` | External Partner Portal | Store tracking tag; no API key rotation required unless password reset on Amazon portal. |
| `cred_clickbank` | ClickBank Network | Affiliate | Nickname `ayyapp*****` | External Partner Portal | Account nickname; update account password via ClickBank portal if shared outside trusted environment. |
| `cred_digistore24` | Digistore24 Hub | Affiliate | Tag `ayyappa_**` | External Partner Portal | Promoter tag; rotate API credentials on Digistore24 if API access key is enabled. |
| `cred_impact_radius` | Impact Radius | Affiliate | Operator email | External Partner Portal | Account email; update password & 2FA on Impact portal. |
| `cred_n8n_local` | n8n Automation Engine | Automation | Token ending in `2026` | **Software Configurable** | **Rotate immediately.** Re-issue fresh cryptographic random token (`secrets.token_urlsafe(32)`) in both n8n `.env` and vault. |
| `cred_ollama_engine` | Ollama LLM Core | LLM / AI | Tag `abhi:******` | Local Model Reference | Local service identifier; bind strictly to loopback `127.0.0.1:11434`. |
| `cred_google_workspace` | Google Workspace | Communication | Operator Gmail | External Google Account | Ensure 2FA is active on Google account; use App Passwords or OAuth2 refresh tokens only. |

---

## 3. Immediate Rotation Protocol for Configurable Secrets

### Step 3.1: n8n Internal Token Rotation
1. Generate fresh 256-bit token:
   ```python
   import secrets
   new_n8n_key = "n8n_live_" + secrets.token_urlsafe(32)
   ```
2. Update `N8N_ENCRYPTION_KEY` / `N8N_AUTH_PASSWORD` in local n8n runtime configuration.
3. Update `cred_n8n_local` in the encrypted credential vault using `credential_vault.add_or_update_credential(...)`.
4. Verify n8n webhook listener accepts the new key and rejects the old `n8n_api_key_abhi_internal_sovereign_2026`.

### Step 3.2: Local Application Secret Key
- `APP_SECRET_KEY` in `.env`: Ensure it is set to a dedicated local production string not committed to any public git repository.
- `LOCAL_API_KEY`: Set to `abhi_local_secure_key_2026_operator_mamu` and required for all high-privilege REST endpoints.

---

## 4. Verification Checkpoints
- [x] Disk storage verified: `credentials_vault.json` deleted.
- [x] Encrypted storage verified: `credentials_vault.enc` loads and decrypts only via authorized DPAPI / HMAC key.
- [x] REST endpoint verified: `/api/v1/business/vault/credentials` masks all secrets.
- [x] Unauthorized access returns `401 Unauthorized`.
- [x] Audit trail verified: all reveal/modification operations logged in `project_data/security/security_audit.log`.
