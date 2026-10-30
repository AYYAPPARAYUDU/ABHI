import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ARTIFACT_DIR = Path(r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        print("Navigating to http://127.0.0.1:4200/ ...", flush=True)
        await page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        await page.wait_for_timeout(3500)

        # Take full home screenshot with working environments navbar
        out_home = ARTIFACT_DIR / "ui_working_environment_home.png"
        await page.screenshot(path=str(out_home))
        print(f"Captured home view -> {out_home}", flush=True)

        # Click on 'Decisions' working environment
        decisions_btn = page.locator('.env-btn[data-env="decision-pipeline"]')
        if await decisions_btn.count() > 0:
            print("Clicking on Decisions workspace...", flush=True)
            await decisions_btn.first.click()
            await page.wait_for_timeout(2500)
            out_decisions = ARTIFACT_DIR / "ui_working_environment_navigated.png"
            await page.screenshot(path=str(out_decisions))
            print(f"Captured navigated view -> {out_decisions}", flush=True)
        else:
            print("Decisions button not found!", flush=True)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

