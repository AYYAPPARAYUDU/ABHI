"""Stage 5.5 and 5.6 End-to-End Supervisor Orchestration & Recovery Package."""

from backend.app.automation.orchestration.agents import GroundedBrowserAgent, GroundedDesktopAgent, register_grounded_agents
from backend.app.automation.orchestration.benchmarks import (
    OrchestrationBenchmarkSuite,
    orchestration_benchmark_suite,
    RecoveryBenchmarkSuite,
    recovery_benchmark_suite
)
from backend.app.automation.orchestration.models import (
    ExecutionAuditRecord,
    OrchestrationExecutionContext,
    OrchestrationState,
    OrchestrationTaskResult,
    SupervisorDecisionTrace
)
from backend.app.automation.orchestration.orchestrator import SupervisorOrchestrator, supervisor_orchestrator
from backend.app.automation.orchestration.persistence import ExecutionJournal, execution_journal
from backend.app.automation.orchestration.recovery import ExecutionRecoveryEngine, execution_recovery_engine
from backend.app.automation.orchestration.strategy_selector import GroundingStrategySelector, grounding_strategy_selector

__all__ = [
    "OrchestrationState",
    "SupervisorDecisionTrace",
    "OrchestrationExecutionContext",
    "OrchestrationTaskResult",
    "ExecutionAuditRecord",
    "GroundingStrategySelector",
    "grounding_strategy_selector",
    "SupervisorOrchestrator",
    "supervisor_orchestrator",
    "GroundedDesktopAgent",
    "GroundedBrowserAgent",
    "register_grounded_agents",
    "OrchestrationBenchmarkSuite",
    "orchestration_benchmark_suite",
    "RecoveryBenchmarkSuite",
    "recovery_benchmark_suite",
    "ExecutionJournal",
    "execution_journal",
    "ExecutionRecoveryEngine",
    "execution_recovery_engine"
]

