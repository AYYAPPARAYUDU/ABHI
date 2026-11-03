import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        print("Navigating to http://127.0.0.1:4200/perception...")
        page.goto("http://127.0.0.1:4200/perception", wait_until="networkidle")
        time.sleep(2)
        
        # Take full page screenshot of the 3D Biometric Station
        page.screenshot(path="project_data/status/verified_3d_biometric_scanner.png")
        print("Screenshot saved to project_data/status/verified_3d_biometric_scanner.png")
        
        # Also test clicking Face ID in topbar on /home
        print("Navigating to http://127.0.0.1:4200/home...")
        page.goto("http://127.0.0.1:4200/home", wait_until="networkidle")
        time.sleep(2)
        
        face_btn = page.locator(".biometric-hud-btn")
        if face_btn.count() > 0:
            face_btn.first.click()
            time.sleep(1.5)
            page.screenshot(path="project_data/status/verified_biometric_modal_overlay.png")
            print("Modal screenshot saved to project_data/status/verified_biometric_modal_overlay.png")
            
        browser.close()

if __name__ == "__main__":
    run()
