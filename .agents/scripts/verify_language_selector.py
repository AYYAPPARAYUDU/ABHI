import asyncio
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from playwright.async_api import async_playwright

artifacts_dir = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("Navigating to http://127.0.0.1:4200/...")
        await page.goto("http://127.0.0.1:4200/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # 1. Locate Topbar Language Button
        topbar_lang_btn = page.locator(".lang-select-btn")
        await topbar_lang_btn.wait_for(state="visible", timeout=10000)
        lang_text = await topbar_lang_btn.inner_text()
        print(f"Topbar language button found! Text: '{lang_text.strip()}'")

        # 2. Open Topbar Language Dropdown
        await topbar_lang_btn.click()
        await page.wait_for_timeout(800)

        # Screenshot 1: Topbar Dropdown Open
        topbar_shot_path = os.path.join(artifacts_dir, "verified_topbar_lang_dropdown.png")
        await page.screenshot(path=topbar_shot_path)
        print(f"Captured topbar dropdown screenshot: {topbar_shot_path}")

        # 3. Select Telugu from Topbar Dropdown
        te_btn = page.locator(".lang-item-btn").filter(has_text="తెలుగు")
        await te_btn.click()
        await page.wait_for_timeout(800)

        # Verify active language updated
        updated_lang_text = await topbar_lang_btn.inner_text()
        print(f"Topbar language after selecting Telugu: '{updated_lang_text.strip()}'")

        # 4. Check Dock Language Button and Placeholder
        dock_lang_btn = page.locator(".lang-dock-btn")
        dock_text = await dock_lang_btn.inner_text()
        print(f"Dock language button text: '{dock_text.strip()}'")

        dock_input = page.locator(".dock-input-field")
        placeholder = await dock_input.get_attribute("placeholder")
        print(f"Dock input placeholder in Telugu: '{placeholder}'")

        # 5. Open Dock Language Popover
        await dock_lang_btn.click()
        await page.wait_for_timeout(800)

        dock_shot_path = os.path.join(artifacts_dir, "verified_dock_lang_popover.png")
        await page.screenshot(path=dock_shot_path)
        print(f"Captured dock popover screenshot: {dock_shot_path}")

        # 6. Select Hindi from Dock Popover
        hi_btn = page.locator(".dock-lang-opt").filter(has_text="हिंदी")
        await hi_btn.click()
        await page.wait_for_timeout(800)

        hi_placeholder = await dock_input.get_attribute("placeholder")
        hi_topbar_text = await topbar_lang_btn.inner_text()
        print(f"Topbar language after Hindi: '{hi_topbar_text.strip()}'")
        print(f"Dock input placeholder in Hindi: '{hi_placeholder}'")

        final_shot_path = os.path.join(artifacts_dir, "verified_multilingual_system.png")
        await page.screenshot(path=final_shot_path)
        print(f"Captured full verification screenshot: {final_shot_path}")

        await browser.close()
        print("Verification finished successfully!")

if __name__ == "__main__":
    asyncio.run(main())
