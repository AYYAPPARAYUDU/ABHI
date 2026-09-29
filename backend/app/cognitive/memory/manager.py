"""Master Orchestrator for Personal & Procedural Memory (Stage 7.5)."""

import math
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.app.cognitive.memory.evaluator import (
    DeterministicConfidenceModel,
    MemoryConflictDetector,
    MemoryDecayEngine,
    MemoryDeduplicator,
)
from backend.app.cognitive.memory.models import (
    AuthorityLevel,
    DeletionType,
    EpisodicMemoryModel,
    MemoryAuditEntry,
    MemoryConflict,
    MemoryContract,
    MemoryRetrievalQuery,
    MemoryRetrievalResult,
    MemorySource,
    MemoryStatus,
    MemoryType,
    PrivacyClassification,
    ProcedureModel,
    SemanticMemoryModel,
    UserPreferenceModel,
    WorkingMemory,
)
from backend.app.cognitive.memory.policy import (
    AuthorityHierarchy,
    MemoryWritePolicy,
    SensitivityDetector,
)
from backend.app.cognitive.memory.procedural import ProceduralMemoryEngine
from backend.app.core.logging import logger
from backend.app.services.rag.vector_store import vector_store


class PersonalMemoryManager:
    """Coordinates Working, Episodic, Semantic, Preference, and Procedural memory subsystems."""

    def __init__(self):
        # In-memory fast stores (synced with persistent SQLite/LanceDB where needed)
        self.working_memories: Dict[str, WorkingMemory] = {}
        self.memories: Dict[str, MemoryContract] = {}
        self.procedures: Dict[str, ProcedureModel] = {}
        self.conflicts: Dict[str, MemoryConflict] = {}
        self.audit_log: List[MemoryAuditEntry] = []
        self._seed_default_preferences()

    def _seed_default_preferences(self) -> None:
        """Seed baseline personal preferences and procedures."""
        base_prefs = [
            ("editor", "VS Code", "editor", MemorySource.USER_EXPLICIT),
            ("theme", "dark", "ui", MemorySource.USER_EXPLICIT),
            ("language", "English", "system", MemorySource.USER_EXPLICIT),
            ("working_directory", "C:\\Users\\AYYAPPA RAYUDU\\OneDrive\\Desktop\\ABHI", "filesystem", MemorySource.USER_EXPLICIT),
            ("response_format", "concise", "interaction", MemorySource.USER_EXPLICIT),
        ]
        for key, val, cat, src in base_prefs:
            mid = f"mem_pref_{key}_{uuid.uuid4().hex[:8]}"
            contract = MemoryContract(
                memory_id=mid,
                memory_type=MemoryType.PREFERENCE,
                title=f"Preferred {key.replace('_', ' ').title()}",
                content={"key": key, "value": val, "category": cat},
                summary=f"User preferred {key} is {val}.",
                source=src,
                confidence=1.0,
                privacy_classification=PrivacyClassification.PERSONAL,
                status=MemoryStatus.ACTIVE,
                confirmed_by_user=True,
                tags=["preference", cat, key]
            )
            self.memories[mid] = contract

    def _audit(self, event_type: str, memory_id: Optional[str] = None, procedure_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """Record structured memory audit entry."""
        sanitized_details = SensitivityDetector.sanitize_dict(details or {})
        entry = MemoryAuditEntry(
            audit_id=f"aud_{uuid.uuid4().hex[:12]}",
            event_type=event_type,
            memory_id=memory_id,
            procedure_id=procedure_id,
            details=sanitized_details,
            timestamp=datetime.now(timezone.utc)
        )
        self.audit_log.append(entry)

    # -------------------------------------------------------------------------
    # 1. Working Memory (Ephemeral, task-scoped)
    # -------------------------------------------------------------------------
    def start_working_memory(self, task_id: str, current_goal: str) -> WorkingMemory:
        """Initialize temporary task-scoped working memory."""
        wm = WorkingMemory(task_id=task_id, current_goal=current_goal)
        self.working_memories[task_id] = wm
        self._audit("working_memory_started", details={"task_id": task_id, "goal": current_goal})
        return wm

    def update_working_memory(
        self,
        task_id: str,
        active_plan_id: Optional[str] = None,
        active_node_id: Optional[str] = None,
        current_app: Optional[str] = None,
        browser_url: Optional[str] = None,
        focused_window: Optional[str] = None,
        milestone_id: Optional[str] = None,
        selected_files: Optional[List[str]] = None,
        observation: Optional[Dict[str, Any]] = None,
        variable: Optional[Tuple[str, Any]] = None
    ) -> Optional[WorkingMemory]:
        """Update active execution state in working memory."""
        wm = self.working_memories.get(task_id)
        if not wm:
            return None
        if active_plan_id:
            wm.active_plan_id = active_plan_id
        if active_node_id:
            wm.active_node_id = active_node_id
        if current_app:
            wm.current_application = current_app
        if browser_url:
            wm.current_browser_url = browser_url
        if focused_window:
            wm.focused_window_title = focused_window
        if milestone_id:
            wm.active_milestone_id = milestone_id
        if selected_files:
            wm.selected_files = selected_files
        if observation:
            wm.recent_observations.append(observation)
            if len(wm.recent_observations) > 20:
                wm.recent_observations.pop(0)
        if variable:
            k, v = variable
            wm.ephemeral_variables[k] = v
        wm.updated_at = datetime.now(timezone.utc)
        return wm

    def get_working_memory(self, task_id: str) -> Optional[WorkingMemory]:
        """Retrieve task working memory if not expired."""
        wm = self.working_memories.get(task_id)
        if not wm:
            return None
        now = datetime.now(timezone.utc)
        elapsed = (now - wm.updated_at).total_seconds()
        if elapsed > wm.ttl_seconds:
            self.working_memories.pop(task_id, None)
            return None
        return wm

    def clear_working_memory(self, task_id: str) -> bool:
        """Clear ephemeral working memory upon task completion."""
        removed = self.working_memories.pop(task_id, None)
        if removed:
            self._audit("working_memory_cleared", details={"task_id": task_id})
            return True
        return False

    # -------------------------------------------------------------------------
    # 2. Episodic Experience Recording
    # -------------------------------------------------------------------------
    def record_episodic_experience(
        self,
        goal_summary: str,
        plan_summary: str,
        skill_sequence: List[str],
        outcome: str = "SUCCESS",
        task_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        duration_ms: int = 0,
        recovery_count: int = 0,
        verification_result: Optional[Dict[str, Any]] = None,
        privacy: PrivacyClassification = PrivacyClassification.PERSONAL
    ) -> EpisodicMemoryModel:
        """Record structured completed task experience."""
        mid = f"mem_epi_{uuid.uuid4().hex[:12]}"
        epi = EpisodicMemoryModel(
            memory_id=mid,
            task_id=task_id,
            execution_id=execution_id,
            goal_summary=goal_summary,
            plan_summary=plan_summary,
            skill_sequence=skill_sequence,
            outcome=outcome,
            duration_ms=duration_ms,
            recovery_count=recovery_count,
            verification_result=verification_result or {},
            privacy_classification=privacy,
            created_at=datetime.now(timezone.utc)
        )

        contract = MemoryContract(
            memory_id=mid,
            memory_type=MemoryType.EPISODIC,
            title=f"Task: {goal_summary[:60]}",
            content=epi.model_dump(mode="json"),
            summary=f"Task '{goal_summary}' completed with outcome {outcome}. Skills used: {', '.join(skill_sequence)}.",
            source=MemorySource.WORKFLOW_RESULT if task_id else MemorySource.EXECUTION_RESULT,
            source_reference=task_id,
            confidence=0.95 if outcome == "SUCCESS" else 0.70,
            privacy_classification=privacy,
            status=MemoryStatus.ACTIVE,
            tags=["episodic", outcome.lower()] + skill_sequence
        )

        self.memories[mid] = contract
        self._audit("episodic_memory_recorded", memory_id=mid, details={"goal": goal_summary, "outcome": outcome})
        return epi

    # -------------------------------------------------------------------------
    # 3. Semantic & Preference Memory Operations
    # -------------------------------------------------------------------------
    def set_preference(
        self,
        key: str,
        value: Any,
        category: str = "general",
        source: MemorySource = MemorySource.USER_EXPLICIT,
        confirmed: bool = True,
        privacy: PrivacyClassification = PrivacyClassification.PERSONAL
    ) -> Tuple[MemoryContract, Optional[MemoryConflict]]:
        """Set or update a user preference with conflict detection."""
        # Sanitize
        val_sanitized = SensitivityDetector.sanitize_text(str(value)) if isinstance(value, str) else value
        mid = f"mem_pref_{key}_{uuid.uuid4().hex[:8]}"
        confidence = DeterministicConfidenceModel.get_initial_confidence(source, confirmed=confirmed)

        contract = MemoryContract(
            memory_id=mid,
            memory_type=MemoryType.PREFERENCE,
            title=f"Preferred {key.replace('_', ' ').title()}",
            content={"key": key, "value": val_sanitized, "category": category},
            summary=f"User preferred {key} is {val_sanitized}.",
            source=source,
            confidence=confidence,
            privacy_classification=privacy,
            status=MemoryStatus.ACTIVE,
            confirmed_by_user=confirmed,
            tags=["preference", category, key]
        )

        # Validate write policy
        is_valid, err, sanitized_content = MemoryWritePolicy.validate_memory_write(
            source=source,
            content=contract.content,
            summary=contract.summary,
            privacy=privacy,
            confidence=confidence
        )
        if not is_valid:
            raise ValueError(err)

        if sanitized_content:
            contract.content = sanitized_content

        # Detect conflicts against existing active memories
        conflict = MemoryConflictDetector.detect_conflict(contract, list(self.memories.values()))
        if conflict:
            self.conflicts[conflict.conflict_id] = conflict
            self._audit("conflict_detected", memory_id=mid, details={"key": key, "conflict_id": conflict.conflict_id})

        self.memories[mid] = contract
        self._audit("preference_set", memory_id=mid, details={"key": key, "category": category})
        return contract, conflict

    def set_semantic_fact(
        self,
        key: str,
        value: Any,
        category: str = "general",
        source: MemorySource = MemorySource.SYSTEM_OBSERVED,
        confidence: Optional[float] = None,
        privacy: PrivacyClassification = PrivacyClassification.PERSONAL
    ) -> Tuple[MemoryContract, Optional[MemoryConflict]]:
        """Store a stable semantic fact."""
        mid = f"mem_sem_{key}_{uuid.uuid4().hex[:8]}"
        conf = confidence if confidence is not None else DeterministicConfidenceModel.get_initial_confidence(source)

        contract = MemoryContract(
            memory_id=mid,
            memory_type=MemoryType.SEMANTIC,
            title=f"Fact: {key.replace('_', ' ').title()}",
            content={"key": key, "value": value, "category": category},
            summary=f"{key.replace('_', ' ').title()} is {value}.",
            source=source,
            confidence=conf,
            privacy_classification=privacy,
            status=MemoryStatus.ACTIVE,
            tags=["semantic", category, key]
        )

        is_valid, err, sanitized_content = MemoryWritePolicy.validate_memory_write(
            source=source,
            content=contract.content,
            summary=contract.summary,
            privacy=privacy,
            confidence=conf
        )
        if not is_valid:
            raise ValueError(err)

        if sanitized_content:
            contract.content = sanitized_content

        conflict = MemoryConflictDetector.detect_conflict(contract, list(self.memories.values()))
        if conflict:
            self.conflicts[conflict.conflict_id] = conflict
            self._audit("conflict_detected", memory_id=mid, details={"key": key, "conflict_id": conflict.conflict_id})

        self.memories[mid] = contract
        self._audit("semantic_fact_stored", memory_id=mid, details={"key": key})
        return contract, conflict

    # -------------------------------------------------------------------------
    # 4. Memory Lifecycle: Confirm, Reject, Delete, Conflict Resolution
    # -------------------------------------------------------------------------
    def confirm_memory(self, memory_id: str) -> Optional[MemoryContract]:
        """Operator confirmation of a memory candidate."""
        mem = self.memories.get(memory_id)
        if not mem:
            return None
        mem.confirmed_by_user = True
        mem.confidence = DeterministicConfidenceModel.confirm(mem.confidence)
        mem.source = MemorySource.USER_CONFIRMED
        mem.status = MemoryStatus.ACTIVE
        mem.updated_at = datetime.now(timezone.utc)
        self._audit("memory_confirmed", memory_id=memory_id)
        return mem

    def reject_memory(self, memory_id: str, reason: str = "") -> Optional[MemoryContract]:
        """Operator rejection of a memory candidate."""
        mem = self.memories.get(memory_id)
        if not mem:
            return None
        mem.status = MemoryStatus.REJECTED
        mem.confidence = 0.0
        mem.updated_at = datetime.now(timezone.utc)
        self._audit("memory_rejected", memory_id=memory_id, details={"reason": reason})
        return mem

    def delete_memory(self, memory_id: str, deletion_type: DeletionType = DeletionType.SOFT_DELETE) -> bool:
        """Delete memory with explicit deletion semantics."""
        mem = self.memories.get(memory_id)
        if not mem:
            return False

        if deletion_type == DeletionType.SOFT_DELETE:
            mem.status = MemoryStatus.DELETED
            mem.updated_at = datetime.now(timezone.utc)
            self._audit("memory_soft_deleted", memory_id=memory_id)
            return True
        elif deletion_type == DeletionType.HARD_DELETE:
            self.memories.pop(memory_id, None)
            self._audit("memory_hard_deleted", memory_id=memory_id)
            return True
        elif deletion_type == DeletionType.PRIVACY_ERASURE:
            # Complete scrub from memories, conflicts, and audit scrub
            self.memories.pop(memory_id, None)
            # Remove associated conflicts
            to_remove_conflicts = [cid for cid, c in self.conflicts.items() if c.memory_id_a == memory_id or c.memory_id_b == memory_id]
            for cid in to_remove_conflicts:
                self.conflicts.pop(cid, None)
            self._audit("privacy_erasure_executed", memory_id=memory_id)
            return True
        return False

    def resolve_conflict(self, conflict_id: str, chosen_candidate: str, resolution_notes: str = "") -> bool:
        """Resolve contradiction by declaring winning candidate or manual override."""
        conf = self.conflicts.get(conflict_id)
        if not conf:
            return False

        conf.status = "RESOLVED"
        conf.resolution = f"Chosen: {chosen_candidate}. Notes: {resolution_notes}"

        # Adjust winner and loser confidence
        winner_id = conf.memory_id_a if chosen_candidate == "A" else conf.memory_id_b
        loser_id = conf.memory_id_b if chosen_candidate == "A" else conf.memory_id_a

        if winner_id in self.memories:
            self.memories[winner_id].confidence = DeterministicConfidenceModel.confirm(self.memories[winner_id].confidence)
            self.memories[winner_id].status = MemoryStatus.ACTIVE
            self.memories[winner_id].confirmed_by_user = True

        if loser_id in self.memories:
            self.memories[loser_id].confidence = DeterministicConfidenceModel.apply_conflict_penalty(self.memories[loser_id].confidence)
            self.memories[loser_id].status = MemoryStatus.SUPERSEDED

        self._audit("conflict_resolved", details={"conflict_id": conflict_id, "winner": winner_id, "loser": loser_id})
        return True

    # -------------------------------------------------------------------------
    # 5. Procedural Memory Management
    # -------------------------------------------------------------------------
    def register_procedure(self, procedure: ProcedureModel) -> ProcedureModel:
        """Register or update a procedural memory."""
        self.procedures[procedure.procedure_id] = procedure
        self._audit("procedure_registered", procedure_id=procedure.procedure_id, details={"name": procedure.name, "version": procedure.version})
        return procedure

    def get_procedure(self, procedure_id: str) -> Optional[ProcedureModel]:
        """Retrieve procedure by ID."""
        return self.procedures.get(procedure_id)

    def list_procedures(
        self,
        status: Optional[MemoryStatus] = None,
        skill_id: Optional[str] = None
    ) -> List[ProcedureModel]:
        """List procedures with optional filtering."""
        procs = list(self.procedures.values())
        if status:
            procs = [p for p in procs if p.status == status]
        if skill_id:
            procs = [p for p in procs if skill_id in p.required_skills]
        return procs

    # -------------------------------------------------------------------------
    # 6. Task-Aware Retrieval & Ranking
    # -------------------------------------------------------------------------
    def retrieve_task_context(self, query: MemoryRetrievalQuery) -> MemoryRetrievalResult:
        """
        Multi-factor task-aware memory retrieval with multilingual query normalization,
        confidence decay, relevance scoring, and strict context budgeting.
        """
        # Multilingual query token normalization
        norm_goal = self._normalize_multilingual_query(query.goal)
        tokens = set(re.findall(r'\w+', norm_goal.lower()))

        scored_candidates: List[Tuple[float, MemoryContract]] = []
        now = datetime.now(timezone.utc)

        for mem in self.memories.values():
            # Filter inactive, deleted, or rejected memories
            if mem.status not in [MemoryStatus.ACTIVE, MemoryStatus.CANDIDATE]:
                continue

            # Check expiration
            if MemoryDecayEngine.is_expired(mem, as_of=now):
                mem.status = MemoryStatus.STALE
                continue

            # Type filter
            if query.types and mem.memory_type not in query.types:
                continue

            # Privacy filter (cannot exceed query privacy limit)
            privacy_order = [
                PrivacyClassification.PUBLIC,
                PrivacyClassification.PERSONAL,
                PrivacyClassification.PRIVATE,
                PrivacyClassification.SENSITIVE,
                PrivacyClassification.RESTRICTED
            ]
            if privacy_order.index(mem.privacy_classification) > privacy_order.index(query.privacy_limit):
                continue

            # Compute decayed confidence
            effective_conf = MemoryDecayEngine.calculate_decayed_confidence(mem, as_of=now)
            if effective_conf < query.min_confidence:
                continue

            # 1. Relevance score (keyword overlap + tag matching)
            mem_text = f"{mem.title} {mem.summary} {' '.join(mem.tags)}".lower()
            mem_tokens = set(re.findall(r'\w+', mem_text))
            overlap = len(tokens.intersection(mem_tokens))
            relevance = overlap / max(1, len(tokens))

            # Application match bonus
            app_bonus = 0.2 if (query.current_app and query.current_app.lower() in mem_text) else 0.0

            # 2. Authority level score
            auth_level = AuthorityHierarchy.get_authority_level(mem.source, confirmed=mem.confirmed_by_user)
            auth_score = auth_level.value / 100.0

            # 3. Recency score (newer / recently confirmed gets higher score)
            recency_delta = max(0.0, (now - mem.updated_at).total_seconds())
            recency_score = max(0.1, math.exp(-recency_delta / 2592000.0))  # 30 day decay

            # 4. Verification bonus
            verification_bonus = 0.15 if mem.confirmed_by_user else 0.0

            # Composite Multi-factor Rank formula:
            # Score = 0.35 * Relevance + 0.25 * Confidence + 0.15 * Recency + 0.15 * Authority + 0.10 * Verification
            total_score = round(
                (0.35 * (relevance + app_bonus)) +
                (0.25 * effective_conf) +
                (0.15 * recency_score) +
                (0.15 * auth_score) +
                (0.10 * verification_bonus),
                4
            )

            # Update access timestamp
            mem.last_accessed_at = now
            scored_candidates.append((total_score, mem))

        # Sort by total score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        # Procedural matching
        matched_procs: List[ProcedureModel] = []
        for proc in self.procedures.values():
            if proc.status != MemoryStatus.ACTIVE:
                continue
            proc_text = f"{proc.name} {proc.description} {' '.join(proc.trigger_conditions)}".lower()
            if any(t in proc_text for t in tokens) or (query.current_app and query.current_app.lower() in proc_text):
                matched_procs.append(proc)

        # Context Budget Application
        budget = query.budget
        selected_memories: List[MemoryContract] = []
        context_lines: List[str] = ["[RETRIEVED PERSONAL CONTEXT]"]
        total_chars = 0

        for score, mem in scored_candidates[:budget.max_records]:
            line = f"- [{mem.memory_type.value}] {mem.title}: {mem.summary} (Confidence: {mem.confidence:.2f})"
            if total_chars + len(line) > budget.max_characters:
                break
            selected_memories.append(mem)
            context_lines.append(line)
            total_chars += len(line)

        if matched_procs:
            context_lines.append("\n[AVAILABLE PROCEDURAL WORKFLOWS]")
            for p in matched_procs[:3]:
                pline = f"- Procedure '{p.name}' (v{p.version}, Success Rate: {p.metrics.success_rate * 100:.1f}%, Skills: {', '.join(p.required_skills)})"
                if total_chars + len(pline) <= budget.max_characters:
                    context_lines.append(pline)
                    total_chars += len(pline)

        formatted_context = "\n".join(context_lines) if len(context_lines) > 1 else ""
        estimated_tokens = len(formatted_context.split()) * 4 // 3

        return MemoryRetrievalResult(
            memories=selected_memories,
            relevant_procedures=matched_procs,
            formatted_context_for_planner=formatted_context,
            total_records=len(selected_memories),
            estimated_tokens=estimated_tokens
        )

    def _normalize_multilingual_query(self, query: str) -> str:
        """Map common Telugu, Hindi, and Tamil operational terms to canonical concepts."""
        normalized = query
        # Multilingual dictionary mapping common intents
        translations = {
            # Telugu
            "editor": "editor",
            "ఎడిటర్": "editor",
            "సాధారణ": "usual preferred",
            "తెరువు": "open launch",
            "ప్రాజెక్ట్": "project",
            # Hindi
            "खोलो": "open launch",
            "सामान्य": "usual preferred",
            "प्रोजेक्ट": "project",
            # Tamil
            "திற": "open launch",
            "வழக்கமான": "usual preferred",
            "திட்டம்": "project"
        }
        for foreign_word, en_equivalent in translations.items():
            normalized = normalized.replace(foreign_word, f" {en_equivalent} ")
        return normalized

    def sweep_expired_and_decayed_memories(self) -> int:
        """Periodic background sweep marking expired memories as STALE."""
        count = 0
        now = datetime.now(timezone.utc)
        for mem in self.memories.values():
            if mem.status == MemoryStatus.ACTIVE and MemoryDecayEngine.is_expired(mem, as_of=now):
                mem.status = MemoryStatus.STALE
                mem.updated_at = now
                count += 1
                self._audit("memory_expired", memory_id=mem.memory_id)
        return count


# Global singleton memory manager instance
personal_memory_manager = PersonalMemoryManager()
