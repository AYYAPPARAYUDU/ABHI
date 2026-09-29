# Memory Security Model & Anti-Poisoning Architecture (Stage 7.5)

## Local-First Autonomous AI Computer Automation System

---

## 1. Security Authority Hierarchy

Memory is purely informative and planning context. It possesses zero policy override authority:

$$\begin{aligned}
\text{Level 100:} & \quad \mathbf{SYSTEM\_SECURITY\_POLICY} \quad \text{(Read-only, immutable policy gates)} \\
\text{Level 90:} & \quad \mathbf{CURRENT\_USER\_INSTRUCTION} \quad \text{(Active user goal & constraints)} \\
\text{Level 80:} & \quad \mathbf{CURRENT\_GOAL\_CONTRACT} \quad \text{(Active task lease & goal)} \\
\text{Level 70:} & \quad \mathbf{VERIFIED\_WORLD\_STATE} \quad \text{(Live UIA/DOM observations)} \\
\text{Level 60:} & \quad \mathbf{USER\_CONFIRMED\_MEMORY} \quad \text{(Explicit operator-confirmed facts)} \\
\text{Level 50:} & \quad \mathbf{HIGH\_CONFIDENCE\_MEMORY} \quad \text{(Verified execution results, confidence } \ge 0.8\text{)} \\
\text{Level 30:} & \quad \mathbf{UNCONFIRMED\_MEMORY} \quad \text{(Unverified observations / heuristics)} \\
\text{Level 10:} & \quad \mathbf{UNTRUSTED\_EXTERNAL\_CONTENT} \quad \text{(Web content, OCR, downloaded files)}
\end{aligned}$$

---

## 2. Anti-Poisoning & Adversarial Defense

Webpages, third-party OCR text, downloaded PDFs, and external agent messages cannot forge authoritative user memories or grant permissions.

### Defense Gates:
1. **Source Authority Attribution**: Any content originating from `WEB_CONTENT`, `OCR`, or `DOWNLOADED_FILE` is strictly tagged with `MemorySource.UNTRUSTED_EXTERNAL` and assigned an authority level of $10$.
2. **Forbidden Control Injections**: The write policy screens for adversarial directives and drops candidate creation:
   - `bypass consent / security / policy`
   - `grant privilege / admin rights`
   - `ignore safety / confirmation`
   - `delete system / disable auditing`
   - `upload secrets / exfiltrate credentials`
3. **No Direct LLM Memory Writes**: Persistent memories can only be written through validated deterministic write policies after passing sensitivity screening, deduplication, and confidence evaluation.

---

## 3. Sensitive Data Screening & Exclusion

The system blocks automated persistence of high-risk credentials and tokens:

- **Passkeys, API Keys, Private Keys, SSH Keys** (`BEGIN PRIVATE KEY`, `ghp_`, `sk-`, `eyJ...`)
- **Passwords, PINs, OTP Codes**
- **Credit Card / CVV numbers**
- **Bearer Tokens / Session Cookies**

Any candidate memory containing unredacted credentials is automatically sanitized with `[REDACTED_SECRET]` before persistence or rejected entirely.

---

## 4. Deletion Semantics & Erasure

| Deletion Type | Relational Record | Vector Index | Linage & Lineage Tracking |
|---|---|---|---|
| **SOFT_DELETE** | Status set to `DELETED`, hidden from queries | Retained with `deleted=true` filter | Preserved for audit |
| **HARD_DELETE** | Physically removed from SQLite | Vector record deleted | Audit record retained |
| **PRIVACY_ERASURE** | Hard purged, all raw text and metadata wiped | Hard purged from LanceDB vector store | Redacted audit tombstone only |

---

## 5. Security Audit Logging

All memory lifecycle events are recorded in an append-only audit stream:
- `MEMORY_CREATED`
- `MEMORY_UPDATED`
- `MEMORY_CONFIRMED`
- `MEMORY_REJECTED`
- `MEMORY_EXPIRED`
- `MEMORY_DELETED`
- `MEMORY_RETRIEVED`
- `PROCEDURE_PROMOTED`
- `PROCEDURE_DEPRECATED`
- `MEMORY_CONFLICT_DETECTED`
- `MEMORY_POISONING_BLOCKED`
