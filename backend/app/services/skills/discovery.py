"""Phase 7 Stage 7.1 — Deterministic & Semantic Skill Discovery Engine."""

import re
from typing import Any, Dict, List, Optional
from backend.app.core.logging import logger
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillDiscoveryCandidate,
    SkillLifecycleState,
    SkillRiskLevel
)
from backend.app.services.skills.registry import skill_registry, SkillRegistry


class SkillDiscoveryEngine:
    """Discovers matching registered skills for a given user goal or subtask intent."""

    def __init__(self, registry: Optional[SkillRegistry] = None):
        self.registry = registry or skill_registry

    def discover(
        self,
        goal: str,
        category: Optional[SkillCategory] = None,
        max_risk: Optional[SkillRiskLevel] = None,
        max_results: int = 5
    ) -> List[SkillDiscoveryCandidate]:
        """Discover policy-compatible skills matching the specified goal."""
        available_skills = self.registry.list_skills(enabled_only=True)
        if not available_skills:
            return []

        tokens = self._tokenize(goal)
        scored_candidates: List[SkillDiscoveryCandidate] = []

        risk_order = [
            SkillRiskLevel.READ_ONLY,
            SkillRiskLevel.LOW,
            SkillRiskLevel.MEDIUM,
            SkillRiskLevel.HIGH,
            SkillRiskLevel.CRITICAL
        ]
        max_risk_idx = risk_order.index(max_risk) if max_risk else len(risk_order) - 1

        for skill in available_skills:
            # Check lifecycle state
            if skill.lifecycle_state not in [SkillLifecycleState.ENABLED, SkillLifecycleState.REGISTERED]:
                continue

            # Check category constraint
            if category and skill.category != category:
                continue

            # Check risk ceiling
            skill_risk_idx = risk_order.index(skill.risk_level)
            if skill_risk_idx > max_risk_idx:
                continue

            # Compute match score based on token overlaps with skill_id, name, description, and tags
            score = self._compute_relevance(tokens, skill)
            if score > 0.0:
                required_inputs = list(skill.input_schema.get("properties", {}).keys()) if skill.input_schema else []
                candidate = SkillDiscoveryCandidate(
                    skill_id=skill.skill_id,
                    version=skill.version,
                    name=skill.name,
                    description=skill.description,
                    category=skill.category,
                    risk_level=skill.risk_level,
                    required_permissions=skill.permissions,
                    required_inputs=required_inputs,
                    supported_workers=skill.supported_workers,
                    verification_method=skill.verification_policy,
                    score=round(score, 3)
                )
                scored_candidates.append(candidate)

        # Sort descending by score, then ascending by risk level (prefer safer skills)
        scored_candidates.sort(
            key=lambda c: (c.score, -risk_order.index(c.risk_level)),
            reverse=True
        )

        return scored_candidates[:max_results]

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower())
        stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "is", "my", "me", "please"}
        return {w for w in words if w not in stop_words and len(w) > 1}

    def _compute_relevance(self, tokens: set[str], skill: SkillDefinition) -> float:
        """Compute matching score between query tokens and skill definition metadata."""
        if not tokens:
            return 0.1

        score = 0.0
        id_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", skill.skill_id.lower()))
        name_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", skill.name.lower()))
        desc_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", skill.description.lower()))

        # Direct skill_id match (highest weight)
        id_overlap = tokens.intersection(id_tokens)
        score += len(id_overlap) * 3.0

        # Direct name match
        name_overlap = tokens.intersection(name_tokens)
        score += len(name_overlap) * 2.0

        # Description overlap
        desc_overlap = tokens.intersection(desc_tokens)
        score += len(desc_overlap) * 1.0

        # Specific intent heuristics
        goal_text = " ".join(tokens)
        if "notepad" in goal_text and "windows.open_application" in skill.skill_id:
            score += 4.0
        if "browser" in goal_text and "browser" in skill.skill_id:
            score += 2.5
        if ("pdf" in goal_text or "download" in goal_text or "file" in goal_text) and "files" in skill.skill_id:
            score += 2.0
        if ("screen" in goal_text or "see" in goal_text or "look" in goal_text) and "perception" in skill.skill_id:
            score += 2.0

        return score


# Global singleton discovery engine
skill_discovery = SkillDiscoveryEngine()
