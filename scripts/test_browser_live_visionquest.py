import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ARTIFACT_DIR = Path(r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275")

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))

        print("[1] Navigating to http://127.0.0.1:4200/ ...", flush=True)
        await page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # 1. Capture base view
        base_screenshot = ARTIFACT_DIR / "ui_home_visionquest_mesh.png"
        await page.screenshot(path=str(base_screenshot))
        print(f"Captured base home view -> {base_screenshot}", flush=True)

        # 2. Test dynamic 'hi' command
        print("[2] Testing chat greeting 'hi' ...", flush=True)
        input_box = page.locator(".dock-input-field")
        await input_box.wait_for(state="visible")
        await input_box.click()
        await input_box.fill("")
        await input_box.type("hi", delay=100)
        await page.wait_for_timeout(500)

        submit_btn = page.locator(".submit-btn")
        is_disabled = await submit_btn.is_disabled()
        print(f"Submit button disabled status: {is_disabled}", flush=True)

        print("Clicking submit button...", flush=True)
        async with page.expect_response(lambda r: "/api/v1/agent/command" in r.url, timeout=25000) as response_info:
            await submit_btn.click()

        resp = await response_info.value
        print(f"Received API response status: {resp.status}", flush=True)
        resp_json = await resp.json()
        clean_msg = resp_json.get('message', '').encode('ascii', errors='replace').decode('ascii')
        print(f"API Response message: {clean_msg[:120]}...", flush=True)

        # Wait for floating result sheet
        print("[3] Waiting for result sheet to render ...", flush=True)
        result_overlay = page.locator(".active-result-overlay")
        await result_overlay.wait_for(state="visible", timeout=10000)
        await page.wait_for_timeout(1000)

        result_text = await result_overlay.inner_text()
        clean_res_text = result_text.encode('ascii', errors='replace').decode('ascii')
        print(f"Result sheet content preview:\n{clean_res_text[:200]}...", flush=True)

        hi_screenshot = ARTIFACT_DIR / "ui_chat_hi_verified.png"
        await page.screenshot(path=str(hi_screenshot))
        print(f"Captured greeting response screenshot -> {hi_screenshot}", flush=True)

        # Dismiss result sheet
        close_btn = page.locator("button.sheet-close-btn, .active-result-overlay button")
        if await close_btn.count() > 0:
            await close_btn.first.click()
            await page.wait_for_timeout(800)

        # 3. Test Swarm Agent HUD
        print("[4] Testing Swarm Agent HUD modal via top ribbon ...", flush=True)
        swarm_chip = page.locator(".swarm-chip-btn").first
        await swarm_chip.wait_for(state="visible")
        chip_text = await swarm_chip.inner_text()
        clean_chip_text = chip_text.encode('ascii', errors='replace').decode('ascii')
        print(f"Clicking first swarm chip: {clean_chip_text.strip()} ...", flush=True)
        await swarm_chip.click()
        await page.wait_for_timeout(1000)

        # Verify Tactical HUD modal opened
        hud_modal = page.locator(".agent-tactical-hud-modal")
        await hud_modal.wait_for(state="visible", timeout=5000)
        hud_text = await hud_modal.inner_text()
        clean_hud_text = hud_text.encode('ascii', errors='replace').decode('ascii')
        print(f"HUD Modal content preview:\n{clean_hud_text[:200]}...", flush=True)

        # Test Ping button
        ping_btn = page.locator(".btn-ping-synapse")
        if await ping_btn.count() > 0:
            print("Clicking '⚡ PING AGENT' ...", flush=True)
            await ping_btn.click()
            await page.wait_for_timeout(800)

        # Test Evolve button
        evolve_btn = page.locator(".btn-evolve-skill")
        if await evolve_btn.count() > 0:
            print("Clicking '🧬 EVOLVE' ...", flush=True)
            await evolve_btn.click()
            await page.wait_for_timeout(800)

        # Capture Swarm modal screenshot
        swarm_screenshot = ARTIFACT_DIR / "ui_swarm_modal_verified.png"
        await page.screenshot(path=str(swarm_screenshot))
        print(f"Captured swarm tactical HUD screenshot -> {swarm_screenshot}", flush=True)

        # Close HUD
        modal_close = page.locator(".modal-close-btn")
        if await modal_close.count() > 0:
            await modal_close.click()
            await page.wait_for_timeout(500)

        # 4. Test Three Dots Actions menu
        print("[5] Testing Actions Menu (Three dots button) ...", flush=True)
        dots_btn = page.locator(".dots-btn")
        await dots_btn.click()
        await page.wait_for_timeout(800)
        actions_popup = page.locator(".actions-popup-card.open")
        await actions_popup.wait_for(state="visible")

        actions_screenshot = ARTIFACT_DIR / "ui_actions_menu_verified.png"
        await page.screenshot(path=str(actions_screenshot))
        print(f"Captured actions menu screenshot -> {actions_screenshot}", flush=True)

        print("\nAll browser verification steps completed successfully!", flush=True)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
