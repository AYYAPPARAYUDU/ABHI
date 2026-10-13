import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

import asyncio
from backend.app.services.memory.database import init_db, AsyncSessionFactory
from backend.app.services.memory.models import UserProfileRecord, EpisodicMemoryRecord
from sqlalchemy import delete

async def clean_and_seed():
    await init_db()
    async with AsyncSessionFactory() as session:
        # 1. Clean outdated test user profiles
        await session.execute(delete(UserProfileRecord))
        
        # 2. Insert authentic operator profiles for Ayyappa Rayudu
        profiles = [
            UserProfileRecord(
                key="operator",
                value_json={
                    "name": "Ayyappa Rayudu Ravuvari",
                    "handle": "@ayyapparayudu",
                    "role": "Principal Systems & AI Architect",
                    "workspace": "C:\\Users\\AYYAPPA RAYUDU\\OneDrive\\Desktop\\ABHI",
                    "verified": True
                }
            ),
            UserProfileRecord(
                key="active_theme",
                value_json={
                    "id": "obsidian-cyan",
                    "label": "Obsidian Cyan",
                    "accent": "#00f0ff",
                    "glow": "rgba(0, 240, 255, 0.35)"
                }
            ),
            UserProfileRecord(
                key="hardware_allocation",
                value_json={
                    "gpu_vram": "9.8 GB Dedicated",
                    "gpu_load": "100% GPU",
                    "context_window": 32768,
                    "model": "abhi:latest",
                    "privacy": "Air-Gapped Local Only"
                }
            ),
            UserProfileRecord(
                key="automation_policies",
                value_json={
                    "focus_lock": "STRICT_FOREGROUND",
                    "consent_gate": "TIER_3_PHYSICAL",
                    "verification": "DUAL_STATE_PIXEL_AND_PROCESS",
                    "wal_commit": "IMMEDIATE"
                }
            )
        ]
        for p in profiles:
            session.add(p)
            
        # 3. Clean old synthetic/junk test episodic memories (leave clean authentic system memories)
        await session.execute(delete(EpisodicMemoryRecord))
        
        authentic_memories = [
            EpisodicMemoryRecord(
                memory_id="mem_ctx_32k",
                context_summary="Rebuild abhi:latest model with 32,768 token context window",
                solution_summary="Successfully applied Modelfile PARAMETER num_ctx 32768 on local Ollama RTX GPU.",
                outcome="SUCCESS",
                category="system",
                tags="llm,context,gpu,ollama"
            ),
            EpisodicMemoryRecord(
                memory_id="mem_tts_clean",
                context_summary="Implement clean SpeechVoiceService for executive voice synthesis",
                solution_summary="Stripped Markdown syntax, code blocks, emojis, and noisy symbols before audio generation.",
                outcome="SUCCESS",
                category="interaction",
                tags="speech,voice,tts,audio"
            ),
            EpisodicMemoryRecord(
                memory_id="mem_yt_pipeline",
                context_summary="YouTube Multi-Agent Video Automation Suite integration",
                solution_summary="Local Whisper STT alignment, kinematic subtitles, and ffmpeg multi-track timeline compose.",
                outcome="SUCCESS",
                category="workflow",
                tags="youtube,media,whisper,ffmpeg"
            ),
            EpisodicMemoryRecord(
                memory_id="mem_enterprise_ui",
                context_summary="Enterprise Reactive Monitoring Platform with Angular 22 & RxJS",
                solution_summary="Dynamic metadata form engine supporting 30+ data sources without code modifications.",
                outcome="SUCCESS",
                category="desktop",
                tags="angular,frontend,rxjs,forms"
            ),
            EpisodicMemoryRecord(
                memory_id="mem_decision_dag",
                context_summary="Cybernetic Decision Pipeline DAG & Confidence Stream Engine",
                solution_summary="12 interactive use cases, real-time latency oscilloscope, and pass/fail gate checks.",
                outcome="SUCCESS",
                category="workflow",
                tags="decision,pipeline,dag,cybernetic"
            ),
            EpisodicMemoryRecord(
                memory_id="mem_physical_verify",
                context_summary="Dual-state physical verification for Windows Calculator execution",
                solution_summary="Verified Win32 window focus, UIAutomation keystrokes 125 * 48, and pixel display 6000.",
                outcome="SUCCESS",
                category="desktop",
                tags="uiautomation,calculator,win32,verification"
            )
        ]
        for m in authentic_memories:
            session.add(m)
            
        await session.commit()
        print("Successfully cleaned old test data and seeded authentic operator records.")

if __name__ == "__main__":
    asyncio.run(clean_and_seed())
