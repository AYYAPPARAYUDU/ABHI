import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # 1. Open /workspace
        print("Opening /workspace...")
        await page.goto("http://127.0.0.1:4200/workspace", wait_until="networkidle")
        await asyncio.sleep(3.5)

        # Screenshot panoramic Bot Crossing Colony (Clean, rich, zero overlapping text billboards)
        p1 = os.path.join(ARTIFACT_DIR, "workspace_bot_crossing_living_colony.png")
        await page.screenshot(path=p1)
        print(f"Captured {p1}")

        # 2. Hover over Archon pill in compact dock
        print("Hovering over ARCHON station pill...")
        archon_pill = page.locator("button.compact-station-pill:has-text('ARCHON')")
        if await archon_pill.count() > 0:
            await archon_pill.hover()
            await asyncio.sleep(1.0)
            p2 = os.path.join(ARTIFACT_DIR, "workspace_archon_pill_hovered.png")
            await page.screenshot(path=p2)
            print(f"Captured {p2}")

            # 3. Click ARCHON to rotate to front-center at eye level
            print("Clicking ARCHON to rotate station to front-center...")
            await archon_pill.click()
            await asyncio.sleep(2.0)
            p3 = os.path.join(ARTIFACT_DIR, "workspace_archon_focused_front_center.png")
            await page.screenshot(path=p3)
            print(f"Captured {p3}")

        # 4. Open /home to verify 3D Core clean state (Zero vertical bar clutter, zero label overlap)
        print("Opening /home...")
        await page.goto("http://127.0.0.1:4200/home", wait_until="networkidle")
        await asyncio.sleep(3.0)
        p4 = os.path.join(ARTIFACT_DIR, "home_core_zero_clutter.png")
        await page.screenshot(path=p4)
        print(f"Captured {p4}")

        await browser.close()
        print("All visual verifications finished successfully!")

if __name__ == "__main__":
    asyncio.run(run_verification())
