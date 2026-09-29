"""Phase 7 Stage 7.4 — Goal Progress Evaluator & Goal Integrity Verification."""

from typing import Dict, List, Optional, Tuple

from backend.app.cognitive.workflow.models import (
    GoalConstraint,
    GoalContract,
    GoalProgressEvaluation,
    GoalProgressStatus,
    HumanHandoffReason,
    Milestone,
    MilestoneStatus,
    PlanNode,
    PlanNodeStatus,
    WorkflowPlan,
    WorkflowWorldState
)
from backend.app.core.logging import logger


class GoalProgressEvaluator:
    """Evaluates milestone progression, goal integrity, impossibility, and dynamic replanning triggers."""

    def evaluate_progress(
        self,
        goal: GoalContract,
        plan: WorkflowPlan,
        world_state: WorkflowWorldState
    ) -> GoalProgressEvaluation:
        """Assess workflow progress against milestones, node completion, and the SuccessContract."""
        total_nodes = len(plan.nodes)
        if total_nodes == 0:
            return GoalProgressEvaluation(
                status=GoalProgressStatus.FAILED,
                completed_nodes_count=0,
                total_nodes_count=0,
                progress_percentage=0.0,
                blocked_reason="Empty plan with no nodes.",
                explanation="The plan contains no executable steps."
            )

        completed_nodes = [n for n in plan.nodes.values() if n.status == PlanNodeStatus.COMPLETED]
        failed_nodes = [n for n in plan.nodes.values() if n.status == PlanNodeStatus.FAILED]
        blocked_nodes = [n for n in plan.nodes.values() if n.status == PlanNodeStatus.BLOCKED]
        running_nodes = [n for n in plan.nodes.values() if n.status == PlanNodeStatus.RUNNING]

        # Update milestones
        completed_milestones: List[str] = []
        active_milestone: Optional[str] = None

        for milestone in plan.milestones:
            m_nodes = [plan.nodes[nid] for nid in milestone.node_ids if nid in plan.nodes]
            if not m_nodes:
                continue

            all_m_done = all(n.status == PlanNodeStatus.COMPLETED for n in m_nodes)
            any_m_failed = any(n.status == PlanNodeStatus.FAILED for n in m_nodes)

            if all_m_done:
                milestone.status = MilestoneStatus.COMPLETED
                completed_milestones.append(milestone.title)
            elif any_m_failed:
                milestone.status = MilestoneStatus.FAILED
            elif any(n.status == PlanNodeStatus.RUNNING for n in m_nodes):
                milestone.status = MilestoneStatus.RUNNING
                active_milestone = milestone.title
            else:
                if not active_milestone and milestone.status == MilestoneStatus.PENDING:
                    active_milestone = milestone.title

        # Check SuccessContract
        success_verified = self._verify_success_contract(plan, world_state)

        # Determine Goal Progress Status
        if success_verified or len(completed_nodes) == total_nodes:
            status = GoalProgressStatus.COMPLETED
            progress_pct = 100.0
            explanation = "Goal successfully completed and verified against SuccessContract."
            replan_needed = False
            blocked_reason = None
        elif failed_nodes:
            # Check if failure is recoverable or requires replan
            replan_needed = True
            first_fail = failed_nodes[0]
            status = GoalProgressStatus.REPLAN_REQUIRED
            progress_pct = (len(completed_nodes) / total_nodes) * 90.0
            blocked_reason = f"Node '{first_fail.node_id}' ({first_fail.title}) failed: {first_fail.error_message or 'Unknown error'}"
            explanation = f"Execution paused on step '{first_fail.title}'. Replan required to find alternative pathway."
        elif blocked_nodes:
            status = GoalProgressStatus.BLOCKED
            progress_pct = (len(completed_nodes) / total_nodes) * 90.0
            blocked_reason = blocked_nodes[0].error_message or "Blocked by external condition."
            explanation = "Workflow blocked awaiting external input or human handoff."
            replan_needed = False
        else:
            status = GoalProgressStatus.PROGRESSING
            progress_pct = (len(completed_nodes) / total_nodes) * 95.0
            explanation = f"Workflow in progress ({len(completed_nodes)}/{total_nodes} steps complete)."
            replan_needed = False
            blocked_reason = None

        return GoalProgressEvaluation(
            status=status,
            completed_milestones=completed_milestones,
            active_milestone=active_milestone,
            completed_nodes_count=len(completed_nodes),
            total_nodes_count=total_nodes,
            progress_percentage=round(progress_pct, 1),
            blocked_reason=blocked_reason,
            replan_needed=replan_needed,
            explanation=explanation
        )

    def _verify_success_contract(self, plan: WorkflowPlan, world_state: WorkflowWorldState) -> bool:
        """Evaluate if observable conditions in the SuccessContract are satisfied."""
        succ = plan.success_contract
        if not succ.observable_conditions:
            return False

        for condition in succ.observable_conditions:
            # e.g., "world_state.output_file_exists == true"
            if "output_file_exists" in condition:
                val = world_state.get_fact("output_file_exists")
                if val is not True:
                    return False
            elif "text_verified" in condition:
                val = world_state.get_fact("text_verified")
                if val is not True:
                    return False
            elif "search_completed" in condition:
                val = world_state.get_fact("search_completed")
                if val is not True:
                    return False

        return True

    def verify_goal_integrity(
        self,
        goal: GoalContract,
        candidate_nodes: Dict[str, PlanNode]
    ) -> Tuple[bool, Optional[str]]:
        """Ensure replanning or plan updates do not alter the WHAT, violate prohibitions, or drop constraints."""
        # 1. Prohibited action check
        for node in candidate_nodes.values():
            for prohibited in goal.prohibited_actions:
                prohibited_clean = prohibited.lower().strip()
                if prohibited_clean in node.skill_id.lower() or prohibited_clean in node.title.lower():
                    logger.warning(f"[GoalIntegrity] Prohibited action '{prohibited}' violated by node '{node.node_id}' ({node.skill_id})")
                    return False, f"Goal integrity violation: Candidate node '{node.title}' executes prohibited action '{prohibited}'."

        # 2. Strict constraint adherence
        for constraint in goal.constraints:
            if not constraint.is_strict:
                continue

            if constraint.key == "prohibit_modify_source" and constraint.value is True:
                for node in candidate_nodes.values():
                    if "delete" in node.skill_id or "overwrite" in node.skill_id:
                        return False, "Goal integrity violation: Node violates constraint 'prohibit_modify_source'."

            if constraint.key == "allowed_domains":
                allowed = constraint.value if isinstance(constraint.value, list) else [constraint.value]
                for node in candidate_nodes.values():
                    url = node.inputs.get("url", "")
                    if url and not any(dom in url for dom in allowed):
                        return False, f"Goal integrity violation: URL '{url}' outside allowed domains {allowed}."

        return True, None

    def check_impossibility(
        self,
        goal: GoalContract,
        plan: WorkflowPlan,
        world_state: WorkflowWorldState,
        failure_reason: Optional[str] = None
    ) -> Optional[HumanHandoffReason]:
        """Detect when a goal cannot proceed without human operator intervention."""
        fail_lower = (failure_reason or "").lower()

        if "auth" in fail_lower or "login" in fail_lower or "credentials" in fail_lower or "unauthorized" in fail_lower:
            return HumanHandoffReason.AUTHENTICATION_REQUIRED
        if "captcha" in fail_lower or "bot challenge" in fail_lower or "cloudflare" in fail_lower:
            return HumanHandoffReason.CAPTCHA_REQUIRED
        if "consent" in fail_lower or "permission denied by policy" in fail_lower:
            return HumanHandoffReason.CONSENT_REQUIRED
        if "ambiguous" in fail_lower or "grounding_ambiguous" in fail_lower:
            return HumanHandoffReason.AMBIGUOUS_TARGET
        if "budget exceeded" in fail_lower or "resource" in fail_lower or "duration limit" in fail_lower:
            return HumanHandoffReason.RESOURCE_EXHAUSTED

        return None
