import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ARTIFACT_DIR = Path(r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        print("1. Navigating to http://127.0.0.1:4200/ ...", flush=True)
        await page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        await page.wait_for_timeout(3500)

        # 2. Open Workspaces Command Center Drawer
        print("2. Opening Workspaces Command Center Drawer...", flush=True)
        workspaces_btn = page.locator('.env-sector-tag.interactive-hub-btn')
        if await workspaces_btn.count() > 0:
            await workspaces_btn.first.click()
            await page.wait_for_timeout(1500)
            
            # Verify drawer is open and take screenshot
            drawer = page.locator('.workspace-drawer-panel')
            is_visible = await drawer.is_visible()
            print(f"   Drawer panel visible: {is_visible}", flush=True)
            
            out_drawer = ARTIFACT_DIR / "ui_realistic_workspace_drawer.png"
            await page.screenshot(path=str(out_drawer))
            print(f"   Captured Workspaces Drawer -> {out_drawer}", flush=True)
            
            # Close drawer
            close_btn = page.locator('.drawer-close-btn')
            if await close_btn.count() > 0:
                await close_btn.first.click()
                await page.wait_for_timeout(1000)
                print("   Closed drawer via close button.", flush=True)

        # 3. Deploy Swarm and Focus into 3D Realistic Station
        print("3. Deploying Swarm and Focusing into 3D Realistic Station...", flush=True)
        core_box = page.locator('.core-target-box')
        if await core_box.count() > 0:
            await core_box.first.click()
            await page.wait_for_timeout(1500)
            print("   Swarm deployed / toggled.", flush=True)

        canvas = page.locator('#spatial-canvas')
        if await canvas.count() > 0:
            box = await canvas.bounding_box()
            if box:
                click_x = box["x"] + box["width"] * 0.72
                click_y = box["y"] + box["height"] * 0.54
                print(f"   Clicking 3D pod workstation at ({click_x:.1f}, {click_y:.1f})...", flush=True)
                await page.mouse.click(click_x, click_y)
                await page.wait_for_timeout(3000)

        out_station = ARTIFACT_DIR / "ui_realistic_3d_pod_station.png"
        await page.screenshot(path=str(out_station))
        print(f"   Captured 3D Station View -> {out_station}", flush=True)

        # 4. Navigate into Neural Lab / Intelligence Workspace via Drawer
        print("4. Navigating to Neural Lab workspace via drawer...", flush=True)
        if await workspaces_btn.count() > 0:
            await workspaces_btn.first.click()
            await page.wait_for_timeout(1000)
            neural_card = page.locator('.workspace-card:has-text("Neural Lab")')
            if await neural_card.count() > 0:
                print("   Clicking Neural Lab card...", flush=True)
                await neural_card.first.click()
                await page.wait_for_timeout(2500)
                out_intel = ARTIFACT_DIR / "ui_realistic_workspace_intelligence.png"
                await page.screenshot(path=str(out_intel))
                print(f"   Captured Neural Lab Workspace -> {out_intel}", flush=True)
                print(f"   Current URL: {page.url}", flush=True)
            else:
                print("   Neural Lab card not found!", flush=True)

        await browser.close()
        print("Verification complete!", flush=True)

if __name__ == "__main__":
    asyncio.run(run())
