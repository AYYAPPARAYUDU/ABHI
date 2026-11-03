import asyncio
import os
import sys

sys.path.insert(0, os.getcwd())

from backend.app.services.memory.database import engine
from sqlalchemy import text

async def clean_db():
    try:
        async with engine.begin() as conn:
            res = await conn.execute(text("DELETE FROM communications_inbox WHERE message_id LIKE 'comm_seed_%'"))
            print('Cleaned seeded messages from DB. Deleted rows:', res.rowcount)
    except Exception as e:
        print('DB Notice:', e)

if __name__ == '__main__':
    asyncio.run(clean_db())
