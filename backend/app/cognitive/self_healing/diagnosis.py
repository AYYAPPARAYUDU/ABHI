"""Diagnosis engine leveraging local Ollama LLM with bounded context injection."""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional
from backend.app.cognitive.self_healing.models import DefectReport, DiagnosisHypothesis, RepairRiskTier
from backend.app.cognitive.self_healing.sanitizer import sanitizer
from backend.app.services.llm.ollama_client import ollama_client
from backend.app.core.logging import logger


class DiagnosisEngine:
    """Diagnoses root causes from sanitized evidence using local Ollama model."""

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(__file__).resolve().parent.parent.parent.parent.parent

    def _determine_risk_tier(self, affected_files: List[str], error_type: str) -> RepairRiskTier:
        """Assign risk tier based on file sensitivity and security boundaries."""
        for f in affected_files:
            if sanitizer.is_protected_path(f):
                return RepairRiskTier.PROTECTED
            norm = f.replace("\\", "/").lower()
            if any(k in norm for k in ["supervisor", "auth", "security", "database", "migration", "payment", "execute_command"]):
                return RepairRiskTier.MEDIUM

        if any(k in error_type.lower() for k in ["auth", "permission", "security"]):
            return RepairRiskTier.PROTECTED

        return RepairRiskTier.LOW

    def _gather_file_context(self, filepaths: List[str], max_lines: int = 150) -> Dict[str, str]:
        """Read sanitized source code slices for context injection."""
        snippets = {}
        for fp in filepaths:
            full_p = self.project_root / fp if not os.path.isabs(fp) else Path(fp)
            if full_p.exists() and full_p.is_file() and not sanitizer.is_protected_path(str(full_p)):
                try:
                    lines = full_p.read_text(encoding="utf-8", errors="replace").splitlines()
                    snippets[fp] = "\n".join(lines[:max_lines])
                except Exception as e:
                    logger.warning(f"Could not read context file {fp}: {e}")
        return snippets

    async def diagnose(self, defect: DefectReport, candidate_files: Optional[List[str]] = None) -> DiagnosisHypothesis:
        """Perform evidence-based LLM diagnosis."""
        target_files = candidate_files or []
        # Attempt to auto-detect source file from stack trace
        if not target_files and defect.stack_trace:
            for line in defect.stack_trace.splitlines():
                if "File \"" in line or "File '" in line:
                    parts = line.split('"') if 'File "' in line else line.split("'")
                    if len(parts) >= 2:
                        p = parts[1]
                        if str(self.project_root) in p:
                            rel_p = str(Path(p).relative_to(self.project_root)).replace("\\", "/")
                            if rel_p not in target_files and not sanitizer.is_protected_path(rel_p):
                                target_files.append(rel_p)

        file_contexts = self._gather_file_context(target_files)
        risk_tier = self._determine_risk_tier(target_files, defect.error_type)
        requires_approval = risk_tier in [RepairRiskTier.MEDIUM, RepairRiskTier.PROTECTED]

        # Prepare prompt for local Ollama model
        prompt = (
            f"You are the ABHI autonomous self-repair engineering agent.\n"
            f"Diagnose this defect strictly and output JSON.\n\n"
            f"Defect ID: {defect.defect_id}\n"
            f"Error Type: {defect.error_type}\n"
            f"Component: {defect.component}\n"
            f"Message: {defect.message}\n"
            f"Stack Trace:\n{defect.stack_trace or 'None'}\n"
            f"Source Files:\n{json.dumps(file_contexts, indent=2)}\n\n"
            f"Respond with JSON format:\n"
            f"{{\n"
            f"  \"root_cause_hypothesis\": \"explanation of failure mechanism\",\n"
            f"  \"affected_files\": [\"list of file paths relative to project root\"],\n"
            f"  \"confidence_score\": 0.95,\n"
            f"  \"suggested_fix_summary\": \"summary of code patch\",\n"
            f"  \"reproduction_strategy\": \"how to reproduce via pytest or command\"\n"
            f"}}"
        )

        # Check local Ollama health
        is_healthy = await ollama_client.is_healthy()
        if is_healthy:
            try:
                import asyncio
                raw_response = await asyncio.wait_for(
                    ollama_client.generate(prompt=prompt, stream=False),
                    timeout=8.0
                )
                clean_json = raw_response.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()

                parsed = json.loads(clean_json)
                return DiagnosisHypothesis(
                    defect_id=defect.defect_id,
                    root_cause_hypothesis=parsed.get("root_cause_hypothesis", "Diagnosed by local LLM"),
                    affected_files=parsed.get("affected_files", target_files),
                    confidence_score=float(parsed.get("confidence_score", 0.85)),
                    suggested_fix_summary=parsed.get("suggested_fix_summary", "Apply targeted bugfix"),
                    reproduction_strategy=parsed.get("reproduction_strategy", defect.reproduction_command or "pytest"),
                    risk_tier=risk_tier,
                    requires_approval=requires_approval
                )
            except Exception as e:
                logger.warning(f"Ollama diagnosis parse failed ({e}), falling back to deterministic heuristic.")

        # Deterministic heuristic fallback
        return DiagnosisHypothesis(
            defect_id=defect.defect_id,
            root_cause_hypothesis=f"Exception in {defect.component}: {defect.message}",
            affected_files=target_files or [f"backend/app/{defect.component.replace('.', '/')}.py"],
            confidence_score=0.80,
            suggested_fix_summary=f"Fix {defect.error_type} in {defect.component}",
            reproduction_strategy=defect.reproduction_command or f"pytest backend/tests -k {defect.component}",
            risk_tier=risk_tier,
            requires_approval=requires_approval
        )


diagnosis_engine = DiagnosisEngine()
