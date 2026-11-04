import asyncio
from backend.app.assistant.communications_assistant import ensure_assistant_tables
from backend.app.services.memory.database import engine
from sqlalchemy import text

async def seed():
    await ensure_assistant_tables()
    async with engine.begin() as conn:
        await conn.execute(text("""
            INSERT OR REPLACE INTO user_communications_profile 
            (id, email, phone_number, whatsapp_enabled, auto_reply_mode, monitored_threads, created_at, updated_at)
            VALUES 
            ('primary_user', 'ayyappa.rayudu.ravuvari@gmail.com', '+91 98765 43210', 1, 'HUMAN_CONFIRMATION', '["VIP", "Core Team", "Autonomous Swarm"]', datetime('now'), datetime('now'))
        """))
        await conn.execute(text("""
            INSERT OR REPLACE INTO brain_metaparameters
            (id, version, alignment_score, system_prompt, temperature, empathy_bias, conciseness_ratio, reasoning_depth, autonomous_threshold, updated_at)
            VALUES
            ('active', 'ABHI-BRAIN-v2.6-SOVEREIGN', 0.968, 'You are ABHI, personal AI companion to Ayyappa Rayudu Ravuvari.', 0.35, 0.88, 0.72, 'DEEP_CHAIN_OF_THOUGHT', 0.85, datetime('now'))
        """))
    print("SUCCESS: Seeded primary operator profile and brain metaparameters")

if __name__ == "__main__":
    asyncio.run(seed())
