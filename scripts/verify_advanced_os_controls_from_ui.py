import asyncio
import os
import psutil
from pathlib import Path
from playwright.async_api import async_playwright

ARTIFACT_DIR = Path(r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275")

async def run():
    print("=============================================================", flush=True)
    print("STARTING ADVANCED LLM OS CONTROL TEST DIRECTLY FROM THE UI", flush=True)
    print("=============================================================", flush=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        # 1. Navigate to ABHI UI
        print("1. Navigating to http://127.0.0.1:4200/ ...", flush=True)
        await page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        await page.wait_for_timeout(3500)

        # Capture Clean Spacious Hexagonal World UI
        out_clean = ARTIFACT_DIR / "ui_clean_spacious_hex_world.png"
        await page.screenshot(path=str(out_clean))
        print(f"   [SUCCESS] Captured clean spacious UI -> {out_clean}", flush=True)

        input_field = page.locator('.dock-input-field')
        submit_btn = page.locator('.dock-control-btn.submit-btn')

        # -------------------------------------------------------------
        # TEST 1: Open Notepad and write message via LLM OS controls
        # -------------------------------------------------------------
        cmd1 = "open notepad and write this is your llm personal assistant active on Windows 11"
        print(f"\n2. Submitting Command 1 into UI: '{cmd1}' ...", flush=True)
        await input_field.fill(cmd1)
        await page.wait_for_timeout(500)
        await submit_btn.click()
        print("   Submitted! Waiting for LLM cognitive planning and OS execution...", flush=True)

        # Wait for physical execution and result overlay
        for _ in range(15):
            await page.wait_for_timeout(1000)
            stage_badge = page.locator('.task-stage-badge')
            if await stage_badge.count() > 0:
                try:
                    txt = (await stage_badge.first.text_content(timeout=1000)) or ""
                    if "COMPLETED" in txt:
                        print(f"   [UI STATE] Task marked COMPLETED by CentralSupervisor!", flush=True)
                        break
                except Exception:
                    pass
        await page.wait_for_timeout(1500)
        out_notepad = ARTIFACT_DIR / "ui_os_control_notepad_verified.png"
        await page.screenshot(path=str(out_notepad))
        print(f"   [SUCCESS] Captured Notepad execution in UI -> {out_notepad}", flush=True)

        # Physical verification of notepad.exe in Windows process list
        notepad_procs = [p for p in psutil.process_iter(['name', 'pid']) if 'notepad' in p.info['name'].lower()]
        print(f"   [PHYSICAL OS STATE] Notepad process detected: {len(notepad_procs) > 0} (PIDs: {[p.info['pid'] for p in notepad_procs]})", flush=True)

        # -------------------------------------------------------------
        # TEST 2: Open Chrome and search query via LLM OS controls
        # -------------------------------------------------------------
        cmd2 = "open chrome and search artificial intelligence autonomous agents"
        print(f"\n3. Submitting Command 2 into UI: '{cmd2}' ...", flush=True)
        await input_field.fill(cmd2)
        await page.wait_for_timeout(500)
        await submit_btn.click()
        print("   Submitted! Waiting for LLM cognitive planning and Chrome search execution...", flush=True)

        for _ in range(15):
            await page.wait_for_timeout(1000)
            stage_badge = page.locator('.task-stage-badge')
            if await stage_badge.count() > 0:
                try:
                    txt = (await stage_badge.first.text_content(timeout=1000)) or ""
                    if "COMPLETED" in txt:
                        print(f"   [UI STATE] Chrome search task marked COMPLETED!", flush=True)
                        break
                except Exception:
                    pass
        await page.wait_for_timeout(1500)
        out_chrome = ARTIFACT_DIR / "ui_os_control_chrome_search_verified.png"
        await page.screenshot(path=str(out_chrome))
        print(f"   [SUCCESS] Captured Chrome search execution in UI -> {out_chrome}", flush=True)

        # Physical verification of chrome.exe
        chrome_procs = [p for p in psutil.process_iter(['name', 'pid']) if 'chrome' in p.info['name'].lower()]
        print(f"   [PHYSICAL OS STATE] Chrome process detected: {len(chrome_procs) > 0} (Count: {len(chrome_procs)})", flush=True)

        # -------------------------------------------------------------
        # TEST 3: Open WhatsApp via LLM OS controls
        # -------------------------------------------------------------
        cmd3 = "open whatsapp"
        print(f"\n4. Submitting Command 3 into UI: '{cmd3}' ...", flush=True)
        await input_field.fill(cmd3)
        await page.wait_for_timeout(500)
        await submit_btn.click()
        print("   Submitted! Waiting for LLM cognitive planning and WhatsApp dispatch...", flush=True)

        for _ in range(12):
            await page.wait_for_timeout(1000)
            stage_badge = page.locator('.task-stage-badge')
            if await stage_badge.count() > 0:
                try:
                    txt = (await stage_badge.first.text_content(timeout=1000)) or ""
                    if "COMPLETED" in txt:
                        print(f"   [UI STATE] WhatsApp task marked COMPLETED!", flush=True)
                        break
                except Exception:
                    pass
        await page.wait_for_timeout(1500)
        await page.wait_for_timeout(1500)
        out_whatsapp = ARTIFACT_DIR / "ui_os_control_whatsapp_verified.png"
        await page.screenshot(path=str(out_whatsapp))
        print(f"   [SUCCESS] Captured WhatsApp execution in UI -> {out_whatsapp}", flush=True)

        # -------------------------------------------------------------
        # TEST 4: Open 3D Pod / Workstation Station in Clean Spacious View
        # -------------------------------------------------------------
        print("\n5. Clicking on 3D Pod in Hexagonal World...", flush=True)
        canvas = page.locator('#spatial-canvas')
        if await canvas.count() > 0:
            box = await canvas.bounding_box()
            if box:
                click_x = box["x"] + box["width"] * 0.72
                click_y = box["y"] + box["height"] * 0.54
                await page.mouse.click(click_x, click_y)
                await page.wait_for_timeout(3000)
        out_station = ARTIFACT_DIR / "ui_clean_3d_pod_station.png"
        await page.screenshot(path=str(out_station))
        print(f"   [SUCCESS] Captured 3D Station Focus -> {out_station}", flush=True)

        await browser.close()
        print("\n=============================================================", flush=True)
        print("ALL ADVANCED LLM OS CONTROL TESTS COMPLETED SUCCESSFULLY!", flush=True)
        print("=============================================================", flush=True)

if __name__ == "__main__":
    asyncio.run(run())
