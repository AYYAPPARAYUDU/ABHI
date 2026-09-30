# Bounded Agent Context & Lifecycle Architecture (Phase 9 Stage 3)

## 1. Context Model Definition
`AgentContext` provides bounded, short-lived situational awareness for multi-turn interactions without leaking permissions or bloat.

### 1.1 Context Schema
```python
class AgentContext(BaseModel):
    active_task_id: Optional[str] = None
    active_project_id: Optional[str] = None
    selected_artifact_id: Optional[str] = None
    selected_application: Optional[str] = None
    current_route: Optional[str] = None
    recent_command: Optional[str] = None
    recent_result: Optional[Dict[str, Any]] = None
    language: str = "auto"
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    ttl_seconds: int = 300  # 5 Minute Authoritative TTL
    updated_at: int
```

## 2. Core Architectural Guarantees
1. **Context is Information, NOT Permission**:
   - Contextual references never bypass `PolicyEngine`, `ResourceManager`, or human consent requirements.
2. **Authoritative TTL & Bounded Size**:
   - Context expires automatically after 300 seconds (5 minutes) of inactivity.
   - History logs maintain a maximum window of 20 recent items to prevent memory degradation.
3. **Server-Side Validation**:
   - Every referenced `artifact_id`, `project_id`, or `task_id` is validated for existence and ownership before invocation.
4. **Ambiguity Handling**:
   - If an instruction (e.g., *"change scene 2"*) has multiple candidate targets, the Gateway returns `WAITING_FOR_APPROVAL` with `result_type="APPROVAL_REQUEST"` asking the operator to explicitly pick the target rather than guessing.
