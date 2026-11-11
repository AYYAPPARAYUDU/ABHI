import time
from playwright.sync_api import sync_playwright

def verify_core_dock_and_deploy():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("1. Loading http://127.0.0.1:4200/ ...")
        page.goto("http://127.0.0.1:4200/", wait_until="networkidle")
        time.sleep(3.5)

        # Take screenshot of deployed state
        deployed_path = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\verified_core_deployed_flow.png"
        page.screenshot(path=deployed_path)
        print(f"✓ Deployed screenshot captured: {deployed_path}")

        # Send command 'dock agents' to dock all agents inside the core
        print("2. Sending 'dock agents' command...")
        input_box = page.query_selector("input.command-input, input[type='text']")
        if input_box:
            input_box.fill("dock agents")
            input_box.press("Enter")
            time.sleep(3.5)
        else:
            # Fallback to raycast click directly on core
            canvas = page.query_selector("canvas")
            if canvas:
                box = canvas.bounding_box()
                if box:
                    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2 - 30)
                    time.sleep(3.5)

        docked_path = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\verified_core_docked_clean.png"
        page.screenshot(path=docked_path)
        print(f"✓ Docked screenshot captured: {docked_path}")

        browser.close()
        print("=== COMPLETED VERIFICATION SCRIPT ===")

if __name__ == "__main__":
    verify_core_dock_and_deploy()
