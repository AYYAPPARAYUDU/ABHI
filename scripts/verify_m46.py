import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275"

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        # 1. Check Home Core (steady, no waves)
        print("1. Loading Home Page...")
        page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        time.sleep(2.0)
        home_path = os.path.join(ARTIFACT_DIR, "home_core_clean_nowaves.png")
        page.screenshot(path=home_path)
        print(f"Saved: {home_path}")

        # 2. Check Workspace in Quantum White
        print("2. Loading Workspace Page...")
        page.goto("http://127.0.0.1:4200/workspace", wait_until="networkidle")
        time.sleep(2.0)

        # Switch theme to Quantum White
        theme_btn = page.locator(".theme-btn, .theme-badge, [title*='Theme'], button:has-text('Cyan'), button:has-text('Obsidian'), button:has-text('Amethyst'), button:has-text('Matrix'), button:has-text('White')").first
        if theme_btn.count() > 0:
            for _ in range(4):
                txt = theme_btn.inner_text()
                if "White" in txt or "Quantum" in txt:
                    break
                theme_btn.click()
                time.sleep(0.8)

        time.sleep(1.5)
        ws_white_path = os.path.join(ARTIFACT_DIR, "workspace_quantum_white_illuminated.png")
        page.screenshot(path=ws_white_path)
        print(f"Saved: {ws_white_path}")

        browser.close()
        print("Verification complete!")

if __name__ == "__main__":
    run_verification()
