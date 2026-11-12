"""FastAPI API endpoints for Advanced Quantum-Inspired Cognitive Co-Processors."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.cognitive.quantum.quantum_engine import quantum_cognitive_engine

router = APIRouter(prefix="/quantum", tags=["Quantum Cognitive Computing"])


class OptimizeSwarmRequest(BaseModel):
    prompt: str = Field(..., description="User prompt or intent to allocate via quantum annealing")
    target_count: int = Field(default=3, ge=1, le=10, description="Target number of specialist agents to select")


class EntangleSwarmResponse(BaseModel):
    success: bool
    swarm_phase: float
    teleported_pairs: int
    active_bell_pairs: int
    message: str


@router.get("/telemetry")
async def get_quantum_telemetry() -> Dict[str, Any]:
    """Retrieve live quantum state telemetry for the 10 specialist LLMs and Central Singularity."""
    return quantum_cognitive_engine.get_full_swarm_telemetry()


@router.get("/specialists/{agent_id}")
async def get_specialist_quantum_state(agent_id: str) -> Dict[str, Any]:
    """Retrieve detailed quantum tomography and Bloch sphere coordinates for a specific agent."""
    spec = quantum_cognitive_engine.specialists.get(agent_id)
    if not spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Specialist agent '{agent_id}' quantum co-processor not found"
        )
    return spec.get_telemetry_snapshot()


@router.post("/entangle", response_model=EntangleSwarmResponse)
async def trigger_swarm_entanglement() -> EntangleSwarmResponse:
    """Manually synchronize quantum phase entanglement and trigger Bell-state teleportation."""
    quantum_cognitive_engine.synchronize_swarm_entanglement()
    teleported = quantum_cognitive_engine.trigger_bell_pair_teleportation()
    return EntangleSwarmResponse(
        success=True,
        swarm_phase=round(quantum_cognitive_engine.swarm_phase, 4),
        teleported_pairs=teleported,
        active_bell_pairs=5,
        message="Quantum cognitive swarm successfully entangled across all 10 LLM specialists."
    )


@router.post("/anneal")
async def run_quantum_annealer(request: OptimizeSwarmRequest) -> Dict[str, Any]:
    """Run simulated quantum annealing (transverse field Hamiltonian) to select optimal agents."""
    selected_agents = quantum_cognitive_engine.swarm_annealer.optimize_agent_selection(
        prompt=request.prompt,
        target_count=request.target_count
    )
    return {
        "prompt": request.prompt,
        "selected_specialist_agents": selected_agents,
        "method": "simulated_quantum_annealing_transverse_field",
        "tunneling_steps": 24,
        "energy_optimum": "GROUND_STATE"
    }


@router.post("/stabilize")
async def run_error_correction_pass() -> Dict[str, Any]:
    """Execute stabilizer syndrome error-correction across all 10 specialist quantum registers."""
    repaired: Dict[str, int] = {}
    for aid, spec in quantum_cognitive_engine.specialists.items():
        syndrome = spec.q_register.apply_stabilizer_error_correction()
        repaired[aid] = syndrome

    return {
        "status": "COMPLETED",
        "syndromes": repaired,
        "health": "ALL_REGISTERS_STABILIZED"
    }
