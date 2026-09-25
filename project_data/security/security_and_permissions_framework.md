# Security, Permissions & Access Control Framework

## 1. Local Security Architecture

A local-first autonomous agent possessing operating system automation capabilities requires stringent security controls to prevent unintended actions, security breaches, and destructive commands:

```
                            [Tool Request from Agent]
                                        │
                                        ▼
                         [Security Gate Interceptor]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
    [Path Whitelist Check]     [Command Regex Barrier]    [Browser Sandbox Guard]
    • Confines disk access     • Blocks `rm -rf /`,       • Disables unsafe downloads
    • Protects OS system files   `format C:`, `reg delete` • Isolates banking domains
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        ▼
                            [Risk Level Evaluation]
                                        │
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
              [Tier 1/2: Permitted]             [Tier 3: Critical]
                       │                                 │
                       ▼                                 ▼
             [Execute & Audit Log]             [Trigger UI Modal for User
                                                Explicit Authorization]
```

---

## 2. Security Enforcement Policies

1. **Zero Hardcoded Secrets:** All system credentials, encryption keys, and environment variables are stored using Windows Data Protection API (DPAPI) or local AES-GCM encrypted keystores.
2. **Credential Redaction in Logs:** Observability logs automatically scrub regex patterns matching API keys, passwords, bearer tokens, and credit card numbers prior to disk writes.
3. **Execution Sandboxing:** Subprocess command execution runs with restricted environment variables and timeouts to prevent hanging or orphaned runaway processes.
4. **Emergency Stop (Panic Button):** Hardware-level global hotkey listener running as a high-priority thread immediately revokes all agent automation handles upon trigger.
