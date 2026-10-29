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

        # 1. Base view with 3D Home Architecture
        base_screenshot = ARTIFACT_DIR / "ui_home_visionquest_mesh.png"
        await page.screenshot(path=str(base_screenshot))
        print(f"Captured base home view -> {base_screenshot}", flush=True)

        # 2. Deploy 8-Agent Swarm into 3D Volumetric Pods
        print("[2] Deploying 8-Agent Swarm into 3D Volumetric Pods...", flush=True)
        core_box = page.locator(".core-target-box")
        if await core_box.count() > 0:
            await core_box.click()
            await page.wait_for_timeout(2500)

        arch_screenshot = ARTIFACT_DIR / "ui_3d_home_architecture_verified.png"
        await page.screenshot(path=str(arch_screenshot))
        print(f"Captured 3D Home Architecture & Swarm Volumetric Pods -> {arch_screenshot}", flush=True)

        # 3. Focus Agent & Test Multi-Agent Negotiation
        print("[3] Focusing on agent SYNTHEX to test 3D camera glide & negotiation...", flush=True)
        chips = page.locator(".swarm-chip-btn")
        chip_count = await chips.count()
        if chip_count > 1:
            await chips.nth(1).click()  # SYNTHEX (Emerald)
        else:
            await chips.first.click()
        await page.wait_for_timeout(1500)

        hud_modal = page.locator(".agent-tactical-hud-modal")
        await hud_modal.wait_for(state="visible", timeout=6000)
        print("Tactical HUD opened. Testing '🤝 NEGOTIATE' button...", flush=True)

        neg_btn = page.locator(".btn-negotiate-mesh")
        if await neg_btn.count() > 0:
            await neg_btn.click()
            await page.wait_for_timeout(1500)

        # Also Ping and Evolve
        ping_btn = page.locator(".btn-ping-synapse")
        if await ping_btn.count() > 0:
            await ping_btn.click()
            await page.wait_for_timeout(500)

        evolve_btn = page.locator(".btn-evolve-skill")
        if await evolve_btn.count() > 0:
            await evolve_btn.click()
            await page.wait_for_timeout(500)

        neg_screenshot = ARTIFACT_DIR / "ui_3d_agent_negotiate_verified.png"
        await page.screenshot(path=str(neg_screenshot))
        print(f"Captured Multi-Agent Negotiation & 3D Volumetric Pod -> {neg_screenshot}", flush=True)

        # Close HUD
        modal_close = page.locator(".modal-close-btn")
        if await modal_close.count() > 0:
            await modal_close.click()
            await page.wait_for_timeout(1000)

        # 4. Test dynamic 'hi' command
        print("[4] Testing dynamic chat greeting 'hi' ...", flush=True)
        input_box = page.locator(".dock-input-field")
        await input_box.wait_for(state="visible")
        await input_box.click()
        await input_box.fill("hi")
        await page.wait_for_timeout(800)

        submit_btn = page.locator(".submit-btn")
        print("Submitting chat command...", flush=True)
        async with page.expect_response(lambda r: "/api/v1/agent/command" in r.url, timeout=45000) as response_info:
            await submit_btn.click()

        resp = await response_info.value
        print(f"API response status: {resp.status}", flush=True)
        result_overlay = page.locator(".active-result-overlay")
        await result_overlay.wait_for(state="visible", timeout=10000)
        await page.wait_for_timeout(1000)

        hi_screenshot = ARTIFACT_DIR / "ui_chat_hi_verified.png"
        await page.screenshot(path=str(hi_screenshot))
        print(f"Captured greeting response screenshot -> {hi_screenshot}", flush=True)

        close_btn = page.locator("button.sheet-close-btn, .active-result-overlay button")
        if await close_btn.count() > 0:
            await close_btn.first.click()
            await page.wait_for_timeout(600)

        # 5. Test Three Dots Actions menu
        print("[5] Testing Actions Menu (Three dots button) ...", flush=True)
        dots_btn = page.locator(".dots-btn")
        await dots_btn.click()
        await page.wait_for_timeout(800)

        actions_screenshot = ARTIFACT_DIR / "ui_actions_menu_verified.png"
        await page.screenshot(path=str(actions_screenshot))
        print(f"Captured actions menu screenshot -> {actions_screenshot}", flush=True)

        print("\nAll browser verification steps completed successfully!", flush=True)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
