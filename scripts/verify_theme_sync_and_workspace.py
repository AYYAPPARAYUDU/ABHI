import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("1. Opening Home Page...")
        page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        time.sleep(2.0)

        # 1. Home Default Obsidian Cyan
        cyan_path = os.path.join(ARTIFACT_DIR, "theme_home_obsidian_cyan.png")
        page.screenshot(path=cyan_path)
        print(f"Saved: {cyan_path}")

        # 2. Cycle theme to Midnight Amethyst
        print("2. Cycling Theme to Midnight Amethyst...")
        theme_btn = page.locator(".theme-btn, .theme-badge, [title*='Theme'], [data-testid='theme-cycler'], button:has-text('Cyan'), button:has-text('Obsidian')").first
        if theme_btn.count() > 0:
            theme_btn.click()
            time.sleep(1.5)
            amethyst_home_path = os.path.join(ARTIFACT_DIR, "theme_home_midnight_amethyst.png")
            page.screenshot(path=amethyst_home_path)
            print(f"Saved: {amethyst_home_path}")

            # 3. Cycle theme to Emerald Matrix
            print("3. Cycling Theme to Emerald Matrix...")
            theme_btn.click()
            time.sleep(1.5)
            emerald_home_path = os.path.join(ARTIFACT_DIR, "theme_home_emerald_matrix.png")
            page.screenshot(path=emerald_home_path)
            print(f"Saved: {emerald_home_path}")
        else:
            print("Theme button locator not matched directly, clicking by topbar text...")

        # 4. Navigate to /workspace
        print("4. Navigating to /workspace...")
        page.goto("http://127.0.0.1:4200/workspace", wait_until="networkidle")
        time.sleep(2.5)

        ws_emerald_path = os.path.join(ARTIFACT_DIR, "theme_workspace_emerald_matrix.png")
        page.screenshot(path=ws_emerald_path)
        print(f"Saved: {ws_emerald_path}")

        # 5. Cycle theme on Workspace to Midnight Amethyst
        theme_btn_ws = page.locator(".theme-btn, .theme-badge, [title*='Theme'], button:has-text('Emerald'), button:has-text('Matrix'), button:has-text('Amethyst'), button:has-text('Cyan'), button:has-text('White')").first
        if theme_btn_ws.count() > 0:
            # Cycle to Quantum White then Obsidian Cyan then Midnight Amethyst
            theme_btn_ws.click()
            time.sleep(1.0)
            theme_btn_ws.click()
            time.sleep(1.0)
            theme_btn_ws.click()
            time.sleep(1.5)
            ws_amethyst_path = os.path.join(ARTIFACT_DIR, "theme_workspace_midnight_amethyst.png")
            page.screenshot(path=ws_amethyst_path)
            print(f"Saved: {ws_amethyst_path}")

        # 6. Click ARCHON station pill to verify front-center vertical framing
        print("6. Clicking ARCHON Station Pill...")
        archon_pill = page.locator(".compact-station-pill:has-text('ARCHON')").first
        if archon_pill.count() > 0:
            archon_pill.click()
            time.sleep(2.0)
            archon_focused_path = os.path.join(ARTIFACT_DIR, "workspace_station_archon_centered.png")
            page.screenshot(path=archon_focused_path)
            print(f"Saved: {archon_focused_path}")

            # Close drawer to see centered station and bot avatar unobstructed
            close_btn = page.locator(".drawer-close-btn").first
            if close_btn.count() > 0:
                close_btn.click()
                time.sleep(1.0)
                archon_bot_view = os.path.join(ARTIFACT_DIR, "workspace_station_archon_unobstructed.png")
                page.screenshot(path=archon_bot_view)
                print(f"Saved: {archon_bot_view}")

        browser.close()
        print("Verification completed successfully!")

if __name__ == "__main__":
    run_verification()

