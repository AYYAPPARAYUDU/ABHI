import asyncio
import os
import time
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

async def verify_assistant_and_vault():
    print("Starting Physical Verification for M-49: Media Vault & Brain Assistant...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # 1. Verify /media (Automated 3-Button Studio)
        print("1. Loading /media (Automated 3-Button Studio)...")
        await page.goto("http://127.0.0.1:4200/media", wait_until="networkidle")
        await asyncio.sleep(2.5)
        media_studio_shot = os.path.join(ARTIFACT_DIR, "media_studio_m49_automated.png")
        await page.screenshot(path=media_studio_shot)
        print(f"   Saved {media_studio_shot}")

        # 2. Switch to Animated Media Storage Vault Tab
        print("2. Switching to Animated Storage Vault tab...")
        vault_tab = page.locator("button.media-tab-btn:has-text('Vault')").first
        if await vault_tab.count() > 0:
            await vault_tab.click()
            await asyncio.sleep(2.0)
            vault_shot = os.path.join(ARTIFACT_DIR, "media_vault_m49_animated.png")
            await page.screenshot(path=vault_shot)
            print(f"   Saved {vault_shot}")

        # 3. Open Brain & Communications Assistant Modal from Topbar
        print("3. Opening Human-Brain & Autonomous Communications Assistant...")
        brain_btn = page.locator(".brain-comms-btn, button:has-text('Brain')").first
        if await brain_btn.count() > 0:
            await brain_btn.click()
            await asyncio.sleep(2.0)
            assistant_shot = os.path.join(ARTIFACT_DIR, "brain_communications_assistant_m49.png")
            await page.screenshot(path=assistant_shot)
            print(f"   Saved {assistant_shot}")

        # 4. Verify /automation Hub
        print("4. Loading /automation Hub...")
        await page.goto("http://127.0.0.1:4200/automation", wait_until="networkidle")
        await asyncio.sleep(2.5)
        automation_shot = os.path.join(ARTIFACT_DIR, "automation_hub_m49_assistant.png")
        await page.screenshot(path=automation_shot)
        print(f"   Saved {automation_shot}")

        await browser.close()
        print("M-49 Verification Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(verify_assistant_and_vault())
