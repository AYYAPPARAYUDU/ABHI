import sys
import time
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test 1: Desktop 1920x1080
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://127.0.0.1:4200/home", timeout=30000)
        time.sleep(3)
        page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\home_default_1080p.png")
        print("Captured home_default_1080p.png")
        
        # Test 2: Laptop 1366x768
        page_laptop = browser.new_page(viewport={"width": 1366, "height": 768})
        page_laptop.goto("http://127.0.0.1:4200/home", timeout=30000)
        time.sleep(3)
        page_laptop.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\home_default_laptop_1366.png")
        print("Captured home_default_laptop_1366.png")
        
        # Test 3: Tablet 1024x768
        page_tablet = browser.new_page(viewport={"width": 1024, "height": 768})
        page_tablet.goto("http://127.0.0.1:4200/home", timeout=30000)
        time.sleep(3)
        page_tablet.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\home_default_tablet_1024.png")
        print("Captured home_default_tablet_1024.png")
        
        # Test 4: Click LLM agent on /home
        # Click ARCHON pill
        archon_chip = page.locator(".swarm-chip-btn:has-text('ARCHON')")
        if archon_chip.count() > 0:
            archon_chip.first.click()
            time.sleep(2)
            page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\home_agent_archon_focused.png")
            print("Captured home_agent_archon_focused.png")
            
        # Test 5: Navigate to /workspace and click a station
        page.goto("http://127.0.0.1:4200/workspace", timeout=30000)
        time.sleep(3)
        page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_colony_view.png")
        print("Captured workspace_colony_view.png")
        
        # Click on SYNTHEX station card
        synthex_card = page.locator(".station-card:has-text('SYNTHEX')")
        if synthex_card.count() > 0:
            synthex_card.first.click()
            time.sleep(2)
            page.screenshot(path=r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\workspace_station_focused.png")
            print("Captured workspace_station_focused.png")
            
        browser.close()
        print("All visual verification tests completed successfully!")

if __name__ == "__main__":
    run_verification()
