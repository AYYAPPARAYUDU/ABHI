import time
from playwright.sync_api import sync_playwright

def verify_click():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://127.0.0.1:4200/home", timeout=30000)
        time.sleep(3)
        
        # Click on canvas to focus ARCHON directly via Angular service or window evaluation
        page.evaluate("""() => {
            const el = document.querySelector('app-home-page');
            // Check if threeSceneManager is accessible or click canvas
            const canvas = document.querySelector('canvas');
            if (canvas) {
                // Click on the lower-left area where ARCHON orbits
                const rect = canvas.getBoundingClientRect();
                const clickEvent = new PointerEvent('pointerdown', {
                    clientX: rect.left + rect.width * 0.32,
                    clientY: rect.top + rect.height * 0.68,
                    bubbles: true
                });
                canvas.dispatchEvent(clickEvent);
            }
        }""")
        time.sleep(2)
        page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\home_3d_agent_focused.png")
        print("Captured home_3d_agent_focused.png")
        browser.close()

if __name__ == "__main__":
    verify_click()

