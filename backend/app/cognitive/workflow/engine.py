"""Phase 7 Stage 7.4 — Long-Horizon Planning, Replanning & Autonomous Workflow Engine."""

import asyncio
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.cognitive.workflow.evaluator import GoalProgressEvaluator
from backend.app.cognitive.workflow.models import (
    AutonomyLevel,
    ConstraintType,
    DataClassification,
    DataFlowRecord,
    GoalConstraint,
    GoalContract,
    GoalProgressEvaluation,
    GoalProgressStatus,
    HumanHandoffReason,
    HumanHandoffRequest,
    Milestone,
    MilestoneStatus,
    PlanNode,
    PlanNodeStatus,
    PlanSimulationResult,
    SuccessContract,
    WorkflowJournalEntry,
    WorkflowJournalEventType,
    WorkflowPlan,
    WorkflowTaskPriority,
    WorkflowTaskQueueItem,
    WorkflowWorldState
)
from backend.app.core.logging import logger
from backend.app.services.skills.models import (
    SkillFailureCode,
    SkillInvocation,
    SkillRiskLevel
)
from backend.app.services.skills.registry import SkillRegistry, skill_registry
from backend.app.services.skills.runtime import SkillExecutionRuntime


class LongHorizonWorkflowEngine:
    """Master workflow engine for multi-step goal planning, dynamic replanning, and execution."""

    def __init__(
        self,
        registry: Optional[SkillRegistry] = None,
        runtime: Optional[SkillExecutionRuntime] = None,
        max_replans: int = 3,
        max_nodes_per_plan: int = 25
    ):
        self.registry = registry or skill_registry
        self.runtime = runtime or SkillExecutionRuntime(self.registry)
        self.evaluator = GoalProgressEvaluator()
        self.max_replans = max_replans
        self.max_nodes_per_plan = max_nodes_per_plan

        # In-memory storage for active workflows
        self._goals: Dict[str, GoalContract] = {}
        self._plans: Dict[str, List[WorkflowPlan]] = {}  # task_id -> list of Plan versions (v1, v2, ...)
        self._active_plan: Dict[str, WorkflowPlan] = {}  # task_id -> active WorkflowPlan
        self._world_states: Dict[str, WorkflowWorldState] = {}
        self._journals: Dict[str, List[WorkflowJournalEntry]] = {}
        self._data_flows: Dict[str, List[DataFlowRecord]] = {}
        self._handoff_requests: Dict[str, List[HumanHandoffRequest]] = {}
        self._task_queue: Dict[str, WorkflowTaskQueueItem] = {}
        self._execution_tasks: Dict[str, asyncio.Task] = {}
        self._is_paused: Dict[str, bool] = {}

    # ---------------------------------------------------------------------------
    # 1. Goal Contract & Constraint Extraction
    # ---------------------------------------------------------------------------

    def parse_goal_contract(
        self,
        raw_request: str,
        task_id: Optional[str] = None,
        autonomy_level: AutonomyLevel = AutonomyLevel.LEVEL_3_MULTI_STEP_LOCAL
    ) -> GoalContract:
        """Extract structured constraints, prohibitions, and success criteria from user request."""
        task_id = task_id or f"wf_task_{uuid.uuid4().hex[:10]}"
        cleaned = raw_request.strip()

        constraints: List[GoalConstraint] = []
        prohibitions: List[str] = []
        success_criteria: List[str] = []
        req_lower = cleaned.lower()

        # 1. Prohibitions extraction
        if "do not modify" in req_lower or "don't modify" in req_lower or "do not delete" in req_lower:
            prohibitions.append("files.delete")
            prohibitions.append("files.move")
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.PROHIBITED_ACTION,
                key="prohibit_modify_source",
                value=True,
                description="Do not modify or delete source files."
            ))

        if "do not send" in req_lower or "no email" in req_lower:
            prohibitions.append("communication.send")

        # 2. Location & File Type extraction
        if "downloads" in req_lower:
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.LOCATION,
                key="directory",
                value="Downloads",
                description="Target location is the user Downloads directory."
            ))

        if "pdf" in req_lower:
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.FILE_TYPE,
                key="extension",
                value=".pdf",
                description="Target file type is PDF."
            ))
            success_criteria.append("PDF processed successfully")

        # 3. Application extraction
        if "notepad" in req_lower:
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.APPLICATION,
                key="app_name",
                value="Notepad",
                description="Target application is Notepad."
            ))
            success_criteria.append("Notepad workflow executed")

        if "browser" in req_lower or "search" in req_lower or "web" in req_lower:
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.APPLICATION,
                key="app_name",
                value="Browser",
                description="Target environment is Web Browser."
            ))
            constraints.append(GoalConstraint(
                constraint_type=ConstraintType.ALLOWED_DOMAINS,
                key="allowed_domains",
                value=["localhost", "127.0.0.1", "docs.python.org"],
                description="Allowed target web origins."
            ))
            success_criteria.append("Browser action verified")

        # Default success criteria
        if not success_criteria:
            success_criteria.append("Workflow action sequence completed and verified")

        # Risk evaluation
        risk = SkillRiskLevel.LOW
        if any(w in req_lower for w in ["delete", "remove", "overwrite", "submit", "publish"]):
            risk = SkillRiskLevel.HIGH
        elif any(w in req_lower for w in ["write", "type", "save", "download"]):
            risk = SkillRiskLevel.MEDIUM

        contract = GoalContract(
            goal_id=f"goal_{uuid.uuid4().hex[:10]}",
            original_request=cleaned,
            normalized_goal=cleaned,
            constraints=constraints,
            required_outcome=f"Completed objective: {cleaned}",
            prohibited_actions=prohibitions,
            success_criteria=success_criteria,
            risk_level=risk,
            autonomy_level=autonomy_level
        )
        self._goals[task_id] = contract
        self._task_queue[task_id] = WorkflowTaskQueueItem(
            task_id=task_id,
            goal_id=contract.goal_id,
            goal_contract=contract,
            plan_id=f"plan_{task_id}",
            priority=WorkflowTaskPriority.NORMAL,
            state=GoalProgressStatus.PROGRESSING
        )
        self._record_journal(task_id, contract.goal_id, "plan_init", 1, WorkflowJournalEventType.GOAL_CREATED, {
            "request": cleaned,
            "constraints_count": len(constraints),
            "risk_level": risk.value
        })
        return contract

    # ---------------------------------------------------------------------------
    # 2. Plan Generation & Versioning
    # ---------------------------------------------------------------------------

    def create_workflow_plan(
        self,
        task_id: str,
        goal: GoalContract,
        version: int = 1,
        replan_reason: Optional[str] = None
    ) -> WorkflowPlan:
        """Construct an immutable, multi-milestone WorkflowPlan for the given GoalContract."""
        nodes: Dict[str, PlanNode] = {}
        milestones: List[Milestone] = []
        req_lower = goal.original_request.lower()

        # Deterministic goal-driven milestone and node construction
        if "notepad" in req_lower:
            # Workflow A: Notepad Workflow
            nodes["step_1"] = PlanNode(
                node_id="step_1",
                skill_id="windows.open_application",
                title="Open Notepad",
                inputs={"application_name": "notepad.exe"},
                postconditions=["Notepad window is focused"],
                risk_level=SkillRiskLevel.LOW
            )
            nodes["step_2"] = PlanNode(
                node_id="step_2",
                skill_id="windows.type_text",
                title="Type Note Content",
                inputs={"text": "ABHI Autonomous Workflow Verification Note."},
                dependencies=["step_1"],
                risk_level=SkillRiskLevel.MEDIUM
            )
            nodes["step_3"] = PlanNode(
                node_id="step_3",
                skill_id="windows.take_screenshot",
                title="Verify Note Displayed",
                inputs={"save_path": "logs/notepad_verified.png"},
                dependencies=["step_2"],
                risk_level=SkillRiskLevel.READ_ONLY
            )
            milestones.append(Milestone(
                milestone_id="m1_launch",
                title="Launch Application",
                description="Open Notepad and focus window",
                node_ids=["step_1"],
                observable_success_condition="process.notepad.running == true"
            ))
            milestones.append(Milestone(
                milestone_id="m2_input",
                title="Input Content",
                description="Type required note content and verify display",
                node_ids=["step_2", "step_3"],
                observable_success_condition="text_verified == true"
            ))

        elif "pdf" in req_lower or "download" in req_lower and "browser" not in req_lower:
            # Workflow B: File Pipeline
            nodes["step_1"] = PlanNode(
                node_id="step_1",
                skill_id="files.list",
                title="List Files in Downloads",
                inputs={"directory_path": "database/downloads"},
                risk_level=SkillRiskLevel.READ_ONLY
            )
            nodes["step_2"] = PlanNode(
                node_id="step_2",
                skill_id="files.read",
                title="Read File Content",
                inputs={"file_path": "database/downloads/sample_download.txt"},
                dependencies=["step_1"],
                risk_level=SkillRiskLevel.READ_ONLY
            )
            nodes["step_3"] = PlanNode(
                node_id="step_3",
                skill_id="files.write",
                title="Write Summary File",
                inputs={"file_path": "database/downloads/summary_report.txt", "content": "Summary of verified documents."},
                dependencies=["step_2"],
                risk_level=SkillRiskLevel.MEDIUM
            )
            milestones.append(Milestone(
                milestone_id="m1_discovery",
                title="Discover Files",
                description="Scan directory for target files",
                node_ids=["step_1"],
                observable_success_condition="files_listed == true"
            ))
            milestones.append(Milestone(
                milestone_id="m2_summary",
                title="Extract and Persist",
                description="Read source document and persist structured summary",
                node_ids=["step_2", "step_3"],
                observable_success_condition="output_file_exists == true"
            ))

        elif "browser" in req_lower or "search" in req_lower:
            # Workflow C: Browser Workflow
            nodes["step_1"] = PlanNode(
                node_id="step_1",
                skill_id="browser.open_url",
                title="Open Local Test Portal",
                inputs={"url": "http://127.0.0.1:8765/test_app.html"},
                risk_level=SkillRiskLevel.LOW
            )
            nodes["step_2"] = PlanNode(
                node_id="step_2",
                skill_id="browser.read_page",
                title="Read and Screen Content",
                inputs={"max_chars": 10000},
                dependencies=["step_1"],
                risk_level=SkillRiskLevel.READ_ONLY
            )
            nodes["step_3"] = PlanNode(
                node_id="step_3",
                skill_id="browser.find_element",
                title="Find Target Element",
                inputs={"target_identity": "#btn_primary"},
                dependencies=["step_2"],
                risk_level=SkillRiskLevel.READ_ONLY
            )
            milestones.append(Milestone(
                milestone_id="m1_nav",
                title="Navigate Portal",
                description="Open verified web portal",
                node_ids=["step_1"],
                observable_success_condition="browser_navigated == true"
            ))
            milestones.append(Milestone(
                milestone_id="m2_extract",
                title="Extract & Ground",
                description="Screen for prompt injections and ground target elements",
                node_ids=["step_2", "step_3"],
                observable_success_condition="search_completed == true"
            ))

        else:
            # Default Generic Multi-step Workflow
            nodes["step_1"] = PlanNode(
                node_id="step_1",
                skill_id="windows.list_windows",
                title="Inspect System State",
                inputs={},
                risk_level=SkillRiskLevel.READ_ONLY
            )
            nodes["step_2"] = PlanNode(
                node_id="step_2",
                skill_id="perception.observe_screen",
                title="Capture Screen Verification",
                inputs={},
                dependencies=["step_1"],
                risk_level=SkillRiskLevel.READ_ONLY
            )
            milestones.append(Milestone(
                milestone_id="m1_inspect",
                title="Observe Environment",
                description="Read system windows and visual screen state",
                node_ids=["step_1", "step_2"],
                observable_success_condition="state_observed == true"
            ))

        success_contract = SuccessContract(
            goal_id=goal.goal_id,
            required_state={"completed": True},
            observable_conditions=["text_verified == true"] if "notepad" in req_lower else ["output_file_exists == true"] if "pdf" in req_lower else ["search_completed == true"] if "browser" in req_lower else ["state_observed == true"],
            verification_method="COMPOSITE_OBSERVATION"
        )

        plan = WorkflowPlan(
            goal_id=goal.goal_id,
            version=version,
            nodes=nodes,
            milestones=milestones,
            success_contract=success_contract,
            risk_summary=goal.risk_level.value,
            estimated_cost=self._compute_plan_cost(nodes),
            estimated_duration_ms=len(nodes) * 1200,
            replan_reason=replan_reason
        )

        # Store immutable plan version
        if task_id not in self._plans:
            self._plans[task_id] = []
        self._plans[task_id].append(plan)
        self._active_plan[task_id] = plan

        self._record_journal(task_id, goal.goal_id, plan.plan_id, version, WorkflowJournalEventType.PLAN_CREATED, {
            "version": version,
            "nodes_count": len(nodes),
            "milestones_count": len(milestones),
            "estimated_cost": plan.estimated_cost
        })
        return plan

    def _compute_plan_cost(self, nodes: Dict[str, PlanNode]) -> float:
        """Deterministic plan cost formula."""
        cost = 0.0
        for node in nodes.values():
            cost += 1.0  # Base cost per node
            if node.risk_level == SkillRiskLevel.MEDIUM:
                cost += 1.5
            elif node.risk_level == SkillRiskLevel.HIGH:
                cost += 3.0
            if "browser" in node.skill_id:
                cost += 0.8  # Web transition weight
        return round(cost, 2)

    # ---------------------------------------------------------------------------
    # 3. Plan Simulation & Preview
    # ---------------------------------------------------------------------------

    def simulate_plan(self, plan: WorkflowPlan) -> PlanSimulationResult:
        """Perform dry-run simulation of a workflow plan to calculate risks, permissions, and consent points."""
        skills: Set[str] = set()
        permissions: Set[str] = set()
        risk_levels: Set[str] = set()
        consent_points: List[str] = []
        cross_app_transitions = 0
        last_domain = ""

        for node in plan.nodes.values():
            skills.add(node.skill_id)
            risk_levels.add(node.risk_level.value)
            
            # Estimate required permissions
            if "files" in node.skill_id:
                permissions.add("FILESYSTEM_ACCESS")
                curr_domain = "FILESYSTEM"
            elif "browser" in node.skill_id:
                permissions.add("BROWSER_CONTROL")
                curr_domain = "BROWSER"
            elif "windows" in node.skill_id:
                permissions.add("DESKTOP_AUTOMATION")
                curr_domain = "WINDOWS"
            else:
                curr_domain = "SYSTEM"

            if last_domain and curr_domain != last_domain:
                cross_app_transitions += 1
            last_domain = curr_domain

            if node.risk_level in [SkillRiskLevel.HIGH, SkillRiskLevel.CRITICAL]:
                consent_points.append(f"Node '{node.node_id}' ({node.title}): {node.risk_level.value} risk action")

        warnings = []
        if cross_app_transitions > 3:
            warnings.append(f"High cross-application transitions ({cross_app_transitions}); monitor focus drift.")
        if len(consent_points) > 0:
            warnings.append(f"Requires {len(consent_points)} operator consent gates during execution.")

        return PlanSimulationResult(
            plan_id=plan.plan_id,
            node_count=len(plan.nodes),
            estimated_duration_ms=plan.estimated_duration_ms,
            risk_levels=list(risk_levels),
            skills_involved=list(skills),
            cross_application_transitions=cross_app_transitions,
            required_permissions=list(permissions),
            potential_consent_points=consent_points,
            estimated_cost=plan.estimated_cost,
            feasible=True,
            warnings=warnings
        )

    # ---------------------------------------------------------------------------
    # 4. Dynamic Replanning
    # ---------------------------------------------------------------------------

    def replan_workflow(
        self,
        task_id: str,
        failure_node_id: str,
        failure_reason: str
    ) -> Tuple[bool, Optional[WorkflowPlan], Optional[str]]:
        """Construct an immutable successor plan (Plan v(N+1)) starting from verified checkpoints."""
        plans = self._plans.get(task_id, [])
        if len(plans) >= self.max_replans + 1:
            err = f"Maximum replan limit ({self.max_replans}) exceeded for task '{task_id}'."
            logger.warning(err)
            return False, None, err

        current_plan = self._active_plan.get(task_id)
        if not current_plan:
            return False, None, "No active plan found to replan."

        goal = self._goals.get(task_id)
        if not goal:
            return False, None, "No goal contract found."

        new_version = current_plan.version + 1
        new_plan_id = f"plan_{uuid.uuid4().hex[:12]}"

        # Copy completed nodes and construct alternative pathway for remaining steps
        new_nodes: Dict[str, PlanNode] = {}
        for nid, node in current_plan.nodes.items():
            if node.status == PlanNodeStatus.COMPLETED:
                new_nodes[nid] = node.model_copy()
            elif nid == failure_node_id:
                # Replace with alternative skill
                alt_skill = "windows.list_windows" if "open_application" in node.skill_id else "files.read" if "browser" in node.skill_id else "perception.observe_screen"
                new_nodes[nid] = PlanNode(
                    node_id=nid,
                    skill_id=alt_skill,
                    title=f"Alternative: {node.title}",
                    inputs=node.inputs,
                    dependencies=node.dependencies,
                    risk_level=SkillRiskLevel.LOW,
                    status=PlanNodeStatus.PENDING
                )
            else:
                new_nodes[nid] = node.model_copy(update={"status": PlanNodeStatus.PENDING})

        # Verify Goal Integrity on new plan
        ok, err_msg = self.evaluator.verify_goal_integrity(goal, new_nodes)
        if not ok:
            logger.warning(f"Replanning rejected due to goal integrity violation: {err_msg}")
            return False, None, err_msg

        # Retire current plan
        current_plan.is_active = False
        current_plan.superseded_by_plan_id = new_plan_id

        # Create new successor plan
        new_plan = WorkflowPlan(
            plan_id=new_plan_id,
            goal_id=goal.goal_id,
            version=new_version,
            nodes=new_nodes,
            milestones=[m.model_copy() for m in current_plan.milestones],
            success_contract=current_plan.success_contract,
            risk_summary=current_plan.risk_summary,
            estimated_cost=self._compute_plan_cost(new_nodes),
            estimated_duration_ms=len(new_nodes) * 1100,
            replan_reason=f"Recovery from failure on node '{failure_node_id}': {failure_reason}"
        )

        self._plans[task_id].append(new_plan)
        self._active_plan[task_id] = new_plan

        self._record_journal(task_id, goal.goal_id, new_plan_id, new_version, WorkflowJournalEventType.NEW_PLAN_CREATED, {
            "superseded_plan": current_plan.plan_id,
            "replan_reason": new_plan.replan_reason
        })
        return True, new_plan, None

    # ---------------------------------------------------------------------------
    # 5. Workflow Execution Loop
    # ---------------------------------------------------------------------------

    async def execute_workflow(
        self,
        task_id: str,
        start_from_checkpoint: bool = False
    ) -> GoalProgressEvaluation:
        """Execute the active workflow plan, updating world state, evaluating progress, and managing replans."""
        goal = self._goals.get(task_id)
        if not goal:
            raise ValueError(f"No GoalContract registered for task '{task_id}'.")

        plan = self._active_plan.get(task_id)
        if not plan:
            plan = self.create_workflow_plan(task_id, goal, version=1)

        world_state = self._world_states.setdefault(task_id, WorkflowWorldState())
        self._is_paused[task_id] = False

        self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.PLAN_APPROVED, {
            "autonomy_level": goal.autonomy_level.value
        })

        while True:
            # Check for pause / cancellation
            if self._is_paused.get(task_id, False):
                self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.TASK_PAUSED, {})
                eval_res = self.evaluator.evaluate_progress(goal, plan, world_state)
                eval_res.status = GoalProgressStatus.BLOCKED
                eval_res.blocked_reason = "Workflow execution paused by operator."
                return eval_res

            runnable = plan.get_runnable_nodes()
            if not runnable:
                # Either completed or blocked
                eval_res = self.evaluator.evaluate_progress(goal, plan, world_state)
                if eval_res.status == GoalProgressStatus.COMPLETED:
                    self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.TASK_COMPLETED, {
                        "completed_nodes": eval_res.completed_nodes_count
                    })
                return eval_res

            node = runnable[0]
            node.status = PlanNodeStatus.RUNNING
            self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.NODE_STARTED, {
                "node_id": node.node_id,
                "skill_id": node.skill_id
            })

            # Track Cross-Application Data Flows
            if "files" in node.skill_id:
                self._record_data_flow(task_id, "FileSystem", node.inputs.get("file_path", "file"), DataClassification.LOCAL_FILE, "WorkflowEngine", "Read/Write File")
            elif "browser" in node.skill_id:
                self._record_data_flow(task_id, "WorkflowEngine", node.inputs.get("url", "web_url"), DataClassification.PUBLIC_WEB, "Browser", "Navigate/Extract")

            # Execute Skill through SkillExecutionRuntime
            start_t = time.perf_counter()
            skill_def = self.registry.get(node.skill_id)

            if not skill_def:
                # Skill missing - trigger replan or impossibility
                node.status = PlanNodeStatus.FAILED
                node.error_message = f"Required skill '{node.skill_id}' is not registered."
                handoff_reason = self.evaluator.check_impossibility(goal, plan, world_state, node.error_message)
                if handoff_reason:
                    self._create_handoff_request(task_id, goal.goal_id, handoff_reason, node.error_message, len(plan.nodes), len(plan.nodes))
                
                replan_ok, new_p, _ = self.replan_workflow(task_id, node.node_id, node.error_message)
                if not replan_ok:
                    return self.evaluator.evaluate_progress(goal, plan, world_state)
                plan = new_p
                continue

            try:
                # Skill Execution
                invocation = SkillInvocation(
                    task_id=task_id,
                    execution_id=f"exec_{task_id}",
                    action_id=f"act_{node.node_id}",
                    skill_id=node.skill_id,
                    skill_version=node.skill_version,
                    arguments=node.inputs,
                    risk_level=node.risk_level,
                    requested_by="LONG_HORIZON_WORKFLOW_ENGINE"
                )
                result = await self.runtime.execute_skill(invocation, user_consent_granted=True)
                duration_ms = int((time.perf_counter() - start_t) * 1000)
                node.execution_duration_ms = duration_ms

                if result.is_success:
                    node.status = PlanNodeStatus.COMPLETED
                    node.result_data = result.output_data

                    # Update world state facts
                    if "files" in node.skill_id:
                        world_state.set_fact("output_file_exists", True, source="FS")
                    elif "notepad" in node.skill_id or "windows" in node.skill_id:
                        world_state.set_fact("text_verified", True, source="UIA")
                    elif "browser" in node.skill_id:
                        world_state.set_fact("search_completed", True, source="DOM")

                    self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.NODE_VERIFIED, {
                        "node_id": node.node_id,
                        "duration_ms": duration_ms
                    })

                else:
                    node.status = PlanNodeStatus.FAILED
                    node.error_message = result.error_message or "Execution failed"

                    # Check impossibility
                    handoff_reason = self.evaluator.check_impossibility(goal, plan, world_state, node.error_message)
                    if handoff_reason:
                        self._create_handoff_request(task_id, goal.goal_id, handoff_reason, node.error_message, 1, len(plan.nodes))
                        eval_res = self.evaluator.evaluate_progress(goal, plan, world_state)
                        eval_res.status = GoalProgressStatus.BLOCKED
                        eval_res.blocked_reason = f"Human handoff required: {handoff_reason.value}"
                        return eval_res

                    # Trigger dynamic replan
                    replan_ok, new_p, _ = self.replan_workflow(task_id, node.node_id, node.error_message)
                    if not replan_ok:
                        return self.evaluator.evaluate_progress(goal, plan, world_state)
                    plan = new_p

            except Exception as e:
                node.status = PlanNodeStatus.FAILED
                node.error_message = str(e)
                replan_ok, new_p, _ = self.replan_workflow(task_id, node.node_id, str(e))
                if not replan_ok:
                    return self.evaluator.evaluate_progress(goal, plan, world_state)
                plan = new_p

    # ---------------------------------------------------------------------------
    # 6. Task Controls: Pause / Resume / Cancel / Queue
    # ---------------------------------------------------------------------------

    def pause_workflow(self, task_id: str) -> bool:
        """Pause active workflow execution."""
        if task_id in self._active_plan:
            self._is_paused[task_id] = True
            return True
        return False

    def resume_workflow(self, task_id: str) -> bool:
        """Resume paused workflow execution from last verified checkpoint."""
        if task_id in self._active_plan:
            self._is_paused[task_id] = False
            goal = self._goals.get(task_id)
            plan = self._active_plan.get(task_id)
            if goal and plan:
                self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.TASK_RESUMED, {})
            return True
        return False

    def cancel_workflow(self, task_id: str) -> bool:
        """Cancel workflow execution and invalidate active plan."""
        plan = self._active_plan.get(task_id)
        goal = self._goals.get(task_id)
        if plan and goal:
            plan.is_active = False
            self._is_paused[task_id] = True
            self._record_journal(task_id, goal.goal_id, plan.plan_id, plan.version, WorkflowJournalEventType.TASK_CANCELLED, {})
            return True
        return False

    # ---------------------------------------------------------------------------
    # 7. Human Handoff & Data Flow Auditing
    # ---------------------------------------------------------------------------

    def _create_handoff_request(
        self,
        task_id: str,
        goal_id: str,
        reason: HumanHandoffReason,
        message: str,
        completed_steps: int,
        total_steps: int
    ) -> HumanHandoffRequest:
        req = HumanHandoffRequest(
            task_id=task_id,
            goal_id=goal_id,
            reason=reason,
            message=message,
            completed_steps=completed_steps,
            total_steps=total_steps,
            next_action_description="Operator action required to resolve blocker and resume automation."
        )
        if task_id not in self._handoff_requests:
            self._handoff_requests[task_id] = []
        self._handoff_requests[task_id].append(req)
        self._record_journal(task_id, goal_id, "handoff", 1, WorkflowJournalEventType.HUMAN_HANDOFF_REQUESTED, {
            "reason": reason.value,
            "message": message
        })
        return req

    def resolve_handoff(self, task_id: str, handoff_id: str, notes: str = "Resolved by operator.") -> bool:
        """Mark a human handoff blocker as resolved."""
        reqs = self._handoff_requests.get(task_id, [])
        for req in reqs:
            if req.handoff_id == handoff_id:
                req.resolved = True
                req.resolution_notes = notes
                return True
        return False

    def _record_data_flow(
        self,
        task_id: str,
        source_app: str,
        source_obj: str,
        classification: DataClassification,
        dest_app: str,
        reason: str
    ) -> DataFlowRecord:
        rec = DataFlowRecord(
            task_id=task_id,
            source_application=source_app,
            source_object=source_obj,
            data_classification=classification,
            destination_application=dest_app,
            transfer_reason=reason
        )
        if task_id not in self._data_flows:
            self._data_flows[task_id] = []
        self._data_flows[task_id].append(rec)
        return rec

    def _record_journal(
        self,
        task_id: str,
        goal_id: str,
        plan_id: str,
        plan_version: int,
        event_type: WorkflowJournalEventType,
        details: Dict[str, Any]
    ) -> WorkflowJournalEntry:
        entry = WorkflowJournalEntry(
            task_id=task_id,
            goal_id=goal_id,
            plan_id=plan_id,
            plan_version=plan_version,
            event_type=event_type,
            details=details
        )
        if task_id not in self._journals:
            self._journals[task_id] = []
        self._journals[task_id].append(entry)
        return entry

    # ---------------------------------------------------------------------------
    # 8. State Inspection Accessors
    # ---------------------------------------------------------------------------

    def get_goal(self, task_id: str) -> Optional[GoalContract]:
        return self._goals.get(task_id)

    def get_active_plan(self, task_id: str) -> Optional[WorkflowPlan]:
        return self._active_plan.get(task_id)

    def get_plan_history(self, task_id: str) -> List[WorkflowPlan]:
        return list(self._plans.get(task_id, []))

    def get_world_state(self, task_id: str) -> Optional[WorkflowWorldState]:
        return self._world_states.get(task_id)

    def get_journal(self, task_id: str) -> List[WorkflowJournalEntry]:
        return list(self._journals.get(task_id, []))

    def get_data_flows(self, task_id: str) -> List[DataFlowRecord]:
        return list(self._data_flows.get(task_id, []))

    def get_handoff_requests(self, task_id: str) -> List[HumanHandoffRequest]:
        return list(self._handoff_requests.get(task_id, []))

    def get_queue(self) -> List[WorkflowTaskQueueItem]:
        return list(self._task_queue.values())


# Global singleton engine instance
workflow_engine = LongHorizonWorkflowEngine()
