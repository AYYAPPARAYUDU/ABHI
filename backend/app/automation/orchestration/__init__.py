"""Stage 5.5 End-to-End Supervisor Orchestration Package."""

from backend.app.automation.orchestration.agents import GroundedBrowserAgent, GroundedDesktopAgent, register_grounded_agents
from backend.app.automation.orchestration.benchmarks import OrchestrationBenchmarkSuite, orchestration_benchmark_suite
from backend.app.automation.orchestration.models import (
    OrchestrationExecutionContext,
    OrchestrationState,
    OrchestrationTaskResult,
    SupervisorDecisionTrace
)
from backend.app.automation.orchestration.orchestrator import SupervisorOrchestrator, supervisor_orchestrator
from backend.app.automation.orchestration.strategy_selector import GroundingStrategySelector, grounding_strategy_selector

__all__ = [
    "OrchestrationState",
    "SupervisorDecisionTrace",
    "OrchestrationExecutionContext",
    "OrchestrationTaskResult",
    "GroundingStrategySelector",
    "grounding_strategy_selector",
    "SupervisorOrchestrator",
    "supervisor_orchestrator",
    "GroundedDesktopAgent",
    "GroundedBrowserAgent",
    "register_grounded_agents",
    "OrchestrationBenchmarkSuite",
    "orchestration_benchmark_suite"
]
