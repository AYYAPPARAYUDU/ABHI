# ABHI Autonomous Business Security Model & Revenue Integrity
**Phase 9 Stage 3 Specification & Technical Documentation**

## 1. Safety Principles & Policy Boundaries
The Autonomous Business subsystem is strictly governed by the authoritative Supervisor and Policy Engine. No agent can grant itself expanded permissions or execute external commercial actions without human authorization.

---

## 2. Hard Security Boundaries & Stop Conditions
An autonomous business execution halts immediately (`PAUSED_STOP_CONDITION` or `PAUSED_APPROVAL`) under any of the following conditions:
1. **External Action Policy Boundary:** Any operation involving financial expenditure, external account registration, contract acceptance, live payment handling, or external customer messaging automatically halts and creates a `BusinessApproval` item.
2. **Budget Overrun:** When accumulated operating expenses reach or exceed `budget_limit_usd`.
3. **Missing Capability:** When a task requires a skill or agent that is offline or disabled.
4. **Weak Research Evidence:** When confidence score falls below 0.5 for key market assertions.
5. **Resource Exhaustion:** When `ResourceManager` denies compute or VRAM leases.
6. **Data Integrity Failure:** When file hashes or artifact attestations cannot be validated.

---

## 3. Strict Revenue & Financial Integrity Rules
- **Prohibition of Fabricated Revenue:** No estimated, potential, or demo revenue is reported as actual income.
- **Double-Entry Ledgers:** Operating expenses (local GPU power estimates, model inference token costs, storage fees) are tracked in `BusinessExpense` and deducted from gross figures.
- **Provenance Classification:**
  - `ACTUAL_RECEIVED`: Verified bank/payment gateway deposit (`MEASURED`).
  - `GROSS_SALES`: Confirmed invoices paid.
  - `REFUNDS`: Reversed transactions.
  - `OPERATING_EXPENSES`: Deducted costs.
  - `NET_RESULT`: $\text{Actual Received} - \text{Refunds} - \text{Expenses}$.
  - `FORECAST` / `POTENTIAL`: Explicitly labeled as `ESTIMATED` with prominent disclaimers:
    > *"Forecast only — not actual earnings. No verified external banking or payment gateway connected."*
- **Audit Logging:** Every financial entry is permanently logged with timestamp and source transaction hash.
