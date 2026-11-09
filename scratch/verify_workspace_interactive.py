import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        
        await page.goto("http://127.0.0.1:4200/workspace", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        
        # Test 1: Click 3D station on the canvas at (960, 446)
        print("Clicking 3D station on canvas at (960, 446)...")
        await page.mouse.click(960, 446)
        await page.wait_for_timeout(1000)
        
        popup1 = await page.query_selector(".station-side-popup")
        print("Popup 1 present:", bool(popup1))
        if popup1:
            name1 = await page.inner_text(".popup-agent-name")
            print("Popup 1 agent:", name1)
        await page.screenshot(path="scratch/verified_workspace_canvas_click.png")
        
        # Test 2: Click another 3D station (e.g. left pylon station)
        # Or click bottom pill (DROIDMARK-MOBILE)
        pills = await page.query_selector_all(".compact-station-pill")
        print("Clicking 10th pill (DROIDMARK-MOBILE)...")
        await pills[-1].click()
        await page.wait_for_timeout(1000)
        
        popup2 = await page.query_selector(".station-side-popup")
        print("Popup 2 present:", bool(popup2))
        if popup2:
            name2 = await page.inner_text(".popup-agent-name")
            print("Popup 2 agent:", name2)
            
            # Switch to Tab 2
            tab2 = await page.query_selector("button.popup-tab-btn:nth-child(2)")
            if tab2:
                await tab2.click()
                await page.wait_for_timeout(1000)
                await page.screenshot(path="scratch/verified_workspace_tab2.png")
                print("Saved scratch/verified_workspace_tab2.png")
                
        await page.screenshot(path="scratch/verified_workspace_final.png")
        print("Saved scratch/verified_workspace_final.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
