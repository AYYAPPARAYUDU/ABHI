# Windows & Application Skill Ecosystem Architecture

**Phase 7 Stage 7.2 — Advanced Windows & Application Skills**
**System:** ABHI (Local-First Personal AI Computer Automation System)
**Status:** ACTIVE

---

## 1. Executive Architectural Overview

Stage 7.2 transitions ABHI's generic Windows execution primitives into an extensible, deterministic, and securely sandboxed **Application Adapter Architecture**.

```text
                                   USER TASK
                                       │
                                       ▼
                               ┌───────────────┐
                               │  SUPERVISOR   │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │  DAG PLANNER  │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │ SKILL DISCOVERY│
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │ POLICY / RISK │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │ SKILL RUNTIME │
                               └───────┬───────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
               Windows Skills    Browser Skills   Perception Skills
                     │
                     ▼
          ┌───────────────────────┐
          │ APPLICATION REGISTRY  │
          └───────────┬───────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
     Notepad       Explorer     Calculator     Settings
        │             │             │             │
        └─────────────┼─────────────┴─────────────┘
                      ▼
                 Windows UIA
                      │
                      ▼
               Visual Grounding
                      │
                      ▼
                  ACTION
                      │
                      ▼
                 OBSERVATION
                      │
                      ▼
                VERIFICATION
                      │
             ┌────────┴────────┐
             ▼                 ▼
          SUCCESS            FAILURE
             │                 │
             ▼                 ▼
        CHECKPOINT          RECOVERY
             │                 │
             ▼                 ▼
           MEMORY           REPLAN
                              │
                              ▼
                           RETRY/STOP
```

---

## 2. Core Architectural Principles

1. **Deterministic Application Identity**: Identity is grounded in executable paths, window classes, process IDs, and UIA hierarchy—never window titles alone.
2. **Adapter Contract**: Every application is abstracted via `BaseApplicationAdapter`, declaring formal capabilities, risk tiers, launch parameters, grounding patterns, and verification strategies.
3. **No Privileged Execution Path**: Adapters execute strictly through the existing `SkillExecutionRuntime`, `PolicyEngine`, and `ExecutionLease` infrastructure.
4. **UIA-First Semantic Grounding**: Grounding prioritizes `AutomationId`, `ControlType`, `Name`, and `ClassName` with dual-state visual/OCR fallback.
5. **Focus Protection & Stale Grounding Revalidation**: High-risk actions require explicit target window verification and token-based observation freshness validation before mutation.
6. **Zero Arbitrary Execution / Credential Sandboxing**: Arbitrary shell commands, credential harvesting, password manipulation, and system security bypasses are strictly forbidden and fail-closed.

---

## 3. Application Adapter Contract

Every application adapter inherits from `BaseApplicationAdapter`:

```python
class BaseApplicationAdapter(ABC):
    @property
    @abstractmethod
    def identity(self) -> ApplicationIdentity:
        pass

    @property
    @abstractmethod
    def capabilities(self) -> List[ApplicationCapability]:
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        pass

    @abstractmethod
    async def launch(self, session: ApplicationSession, **kwargs) -> ApplicationSession:
        pass

    @abstractmethod
    async def focus(self, session: ApplicationSession) -> bool:
        pass

    @abstractmethod
    async def observe(self, session: ApplicationSession) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def execute_capability(
        self,
        capability_name: str,
        session: ApplicationSession,
        params: Dict[str, Any],
        context: Optional[SkillExecutionContext] = None,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def verify_capability(
        self,
        capability_name: str,
        session: ApplicationSession,
        params: Dict[str, Any],
        result: Dict[str, Any],
        observation: Dict[str, Any],
    ) -> bool:
        pass

    @abstractmethod
    async def recover(
        self,
        session: ApplicationSession,
        error: Exception,
        context: Optional[SkillExecutionContext] = None,
    ) -> bool:
        pass
```

---

## 4. Application Registry & Capability Discovery

The `ApplicationRegistry` acts as the single source of truth for all supported desktop applications:
- **Registration**: Registers adapters and automatically registers corresponding `SkillDefinition` instances in `SkillRegistry` with deterministic ID format `app.<app_id>.<capability>@<version>`.
- **Lookup**: Supports querying by identity, executable name, window class, or advertised capability.
- **Dynamic Toggle**: Allows operator-level enabling/disabling of individual applications or skills.

---

## 5. Supported Foundational Applications

### 5.1 Notepad (`app.notepad.*`)
- `app.notepad.open@1.0.0` (LOW)
- `app.notepad.focus@1.0.0` (LOW)
- `app.notepad.read_text@1.0.0` (READ_ONLY)
- `app.notepad.type_text@1.0.0` (MEDIUM)
- `app.notepad.select_all@1.0.0` (LOW)
- `app.notepad.save@1.0.0` (MEDIUM - requires canonical path validation)
- `app.notepad.close@1.0.0` (HIGH - handles unsaved document prompts)

### 5.2 File Explorer (`app.explorer.*`)
- `app.explorer.open@1.0.0` (LOW)
- `app.explorer.focus@1.0.0` (LOW)
- `app.explorer.navigate@1.0.0` (LOW - canonical directory traversal checks)
- `app.explorer.list_items@1.0.0` (READ_ONLY)
- `app.explorer.select_item@1.0.0` (LOW)
- `app.explorer.open_item@1.0.0` (MEDIUM)
- `app.explorer.create_folder@1.0.0` (LOW)
- `app.explorer.copy_item@1.0.0` (MEDIUM)
- `app.explorer.move_item@1.0.0` (MEDIUM)

### 5.3 Windows Calculator (`app.calculator.*`)
- `app.calculator.open@1.0.0` (LOW)
- `app.calculator.enter_expression@1.0.0` (LOW - sanitized arithmetic AST parser)
- `app.calculator.read_result@1.0.0` (READ_ONLY)
- `app.calculator.clear@1.0.0` (LOW)

### 5.4 Windows Settings (`app.settings.*`)
- `app.settings.open@1.0.0` (LOW)
- `app.settings.search@1.0.0` (READ_ONLY)
- `app.settings.open_result@1.0.0` (LOW)
- `app.settings.read_setting@1.0.0` (READ_ONLY)
- *Security Mutation Shield*: Blocks any attempt to mutate passwords, disable Windows Defender/Firewall, or alter UAC configurations.

### 5.5 Constrained Diagnostic Terminal (`app.terminal.*`)
- `app.terminal.open@1.0.0` (LOW)
- `app.terminal.run_allowlisted_command@1.0.0` (MEDIUM)
- `app.terminal.read_output@1.0.0` (READ_ONLY)
- *Security Boundaries*: Strict command allowlist (`ping`, `ipconfig`, `hostname`, `systeminfo`, `get-process`, `get-service`, `dir`, `echo`, `uptime`). Chained commands (`&&`, `||`, `;`, `|`), redirection (`>`, `>>`, `<`), command substitution (`$()`, `` ` ``), and encoded arguments are immediately rejected with `POLICY_DENIED`.

---

## 6. Security Sandboxing & Guardrails

```text
[ Incoming Action ]
        │
        ├── Focus Validation: (Foreground window == Target Application?) ──[NO]──> FocusMismatchError (ABORT)
        │
        ├── Freshness Check: (Observation Token == Current Screen State?) ──[NO]──> StaleObservationError (RE-GROUND)
        │
        ├── Path Canonicalization: (Path within Allowed Project Boundaries?) ──[NO]──> PathTraversalError (ABORT)
        │
        ├── Credential / Security Probe?: (Password / Defender Mutation?) ──[YES]──> SecurityPolicyViolation (FAIL-CLOSED)
        │
        └── Verified Safe UIA / Visual Grounding Action Executed
```

---

## 7. Multi-Monitor, Resolution & DPI Handling

1. **Semantic Grounding Invariance**: UIA element bindings rely on Automation IDs, hierarchy, and control types, making them immune to DPI scaling and multi-monitor offsets.
2. **Visual Grounding DPI Normalization**: Screen coordinates are captured in native device pixels and mapped using `GetDpiForWindow` / `EnumDisplayMonitors` transforms.
3. **Window Movement Tolerance**: Before any interaction, the active bounding rectangle of the target window is re-queried to handle user repositioning or maximization.

---

## 8. Verification & Dual-State Postconditions

Success requires deterministic dual-state verification:
1. **Precondition Validation**: Application is running, target window is focused, and control element is interactable.
2. **Execution**: Action dispatch with execution lease tracking.
3. **Postcondition Observation**: Inspection of UIA state or screen OCR confirming that the expected mutation (text typed, file saved, result computed) is visible in the application.

---

## 9. Telemetry & Observability

- `application_launch_success` / `application_discovery_success`
- `focus_success` / `focus_conflict_count`
- `stale_observation_count` / `grounding_retry_count`
- `application_crash_count` / `recovery_success_rate`
- Latency percentiles: $p50$, $p95$, $p99$ for UIA actions, skill execution, and end-to-end task plans.
