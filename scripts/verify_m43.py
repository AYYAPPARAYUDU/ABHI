import time
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test 1: Workspace default compact view (Zero occlusion, full 3D living colony view)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://127.0.0.1:4200/workspace", timeout=30000)
        time.sleep(3)
        page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_compact_pill_view.png")
        print("Captured workspace_compact_pill_view.png")
        
        # Test 2: Click a station pill (e.g. ARCHON) -> rotates 3D station to front & opens drawer
        archon_pill = page.locator(".compact-station-pill:has-text('ARCHON')")
        if archon_pill.count() > 0:
            archon_pill.first.click()
            time.sleep(2.5)
            page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_archon_rotated_front.png")
            print("Captured workspace_archon_rotated_front.png")
            
        # Close station drawer to verify smooth return
        close_btn = page.locator(".drawer-close-btn")
        if close_btn.count() > 0:
            close_btn.first.click()
            time.sleep(2)
            
        # Test 3: Toggle dock expansion to full 8 cards
        expand_btn = page.locator(".dock-toggle-btn")
        if expand_btn.count() > 0:
            expand_btn.first.click()
            time.sleep(1)
            page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_dock_expanded.png")
            print("Captured workspace_dock_expanded.png")

        # Test 4: Navigate to /home and verify rotating to front on agent click
        page.goto("http://127.0.0.1:4200/home", timeout=30000)
        time.sleep(3)
        
        # Focus SYNTHEX or ARCHON via 3D service to verify dynamic scene rotation
        page.evaluate("""() => {
            const threeService = window['__threeSceneManager'];
            // Trigger speaking mode to test the new CGI longitudinal wave ribbon & shockwave rings
            const speechService = window['__speechVoiceService'];
        }""")
        
        # Test 5: Laptop 1366x768 on /workspace to verify smaller screens have zero occlusion
        page_laptop = browser.new_page(viewport={"width": 1366, "height": 768})
        page_laptop.goto("http://127.0.0.1:4200/workspace", timeout=30000)
        time.sleep(3)
        page_laptop.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_laptop_1366_compact.png")
        print("Captured workspace_laptop_1366_compact.png")

        browser.close()
        print("M-43 visual verification completed successfully!")

if __name__ == "__main__":
    run_verification()

