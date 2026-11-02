import asyncio
import os
import time
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

async def verify_all():
    print("Starting Comprehensive Verification for M-48...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # 1. Verify /workspace in Obsidian Cyan with shining metallic luster
        print("1. Testing /workspace (Obsidian Cyan)...")
        await page.goto("http://127.0.0.1:4200/workspace", wait_until="networkidle")
        await asyncio.sleep(3.0)
        ws_cyan = os.path.join(ARTIFACT_DIR, "workspace_m48_obsidian_cyan_shining.png")
        await page.screenshot(path=ws_cyan)
        print(f"   Saved {ws_cyan}")

        # 2. Cycle theme to Midnight Amethyst
        print("2. Switching theme to Midnight Amethyst...")
        theme_btn = page.locator(".theme-quick-btn").first
        if await theme_btn.count() > 0:
            await theme_btn.click()
            await asyncio.sleep(1.5)
            ws_amethyst = os.path.join(ARTIFACT_DIR, "workspace_m48_amethyst_shining.png")
            await page.screenshot(path=ws_amethyst)
            print(f"   Saved {ws_amethyst}")

            # Cycle to Emerald Matrix
            await theme_btn.click()
            await asyncio.sleep(1.5)
            ws_emerald = os.path.join(ARTIFACT_DIR, "workspace_m48_emerald_shining.png")
            await page.screenshot(path=ws_emerald)
            print(f"   Saved {ws_emerald}")

            # Cycle back to Obsidian Cyan
            await theme_btn.click()
            await asyncio.sleep(1.0)
            await theme_btn.click()
            await asyncio.sleep(1.0)

        # 3. Verify /media (Media Studio)
        print("3. Testing /media (Media Studio)...")
        await page.goto("http://127.0.0.1:4200/media", wait_until="networkidle")
        await asyncio.sleep(2.5)
        media_shot = os.path.join(ARTIFACT_DIR, "media_studio_m48_audio_provenance.png")
        await page.screenshot(path=media_shot)
        print(f"   Saved {media_shot}")

        # 4. Verify /sectors (Business & Autonomous Sectors)
        print("4. Testing /sectors (Modular Sectors & Financial Ledger)...")
        await page.goto("http://127.0.0.1:4200/sectors", wait_until="networkidle")
        await asyncio.sleep(2.5)
        sectors_shot = os.path.join(ARTIFACT_DIR, "sectors_dashboard_m48.png")
        await page.screenshot(path=sectors_shot)
        print(f"   Saved {sectors_shot}")

        # 5. Verify /automation ("Automate Everything")
        print("5. Testing /automation (\"Automate Everything\")...")
        await page.goto("http://127.0.0.1:4200/automation", wait_until="networkidle")
        await asyncio.sleep(2.5)
        auto_shot = os.path.join(ARTIFACT_DIR, "automate_everything_m48.png")
        await page.screenshot(path=auto_shot)
        print(f"   Saved {auto_shot}")

        # 6. Verify /home (Main 3D Core)
        print("6. Testing /home (3D Core)...")
        await page.goto("http://127.0.0.1:4200/home", wait_until="networkidle")
        await asyncio.sleep(3.0)
        home_shot = os.path.join(ARTIFACT_DIR, "home_core_m48.png")
        await page.screenshot(path=home_shot)
        print(f"   Saved {home_shot}")

        await browser.close()
        print("M-48 Comprehensive Visual Verification Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(verify_all())
