import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()
        
        print("1. Navigating to http://127.0.0.1:4200/home...")
        await page.goto('http://127.0.0.1:4200/home', wait_until='domcontentloaded', timeout=15000)
        await page.wait_for_timeout(2500)
        await page.screenshot(path='C:/Users/AYYAPPA RAYUDU/.gemini/antigravity/brain/9e62f329-e793-4149-9220-b61e27b03275/verified_no_core_collision.png')
        print("Saved verified_no_core_collision.png")

        print("2. Navigating to http://127.0.0.1:4200/workspace...")
        await page.goto('http://127.0.0.1:4200/workspace', wait_until='domcontentloaded', timeout=15000)
        await page.wait_for_timeout(2500)
        
        pills = page.locator('button.compact-station-pill')
        count = await pills.count()
        print(f"Station pills count: {count}")
        await pills.last.click()
        await page.wait_for_timeout(2000)
        
        popup = page.locator('aside.station-side-popup')
        visible = await popup.is_visible()
        print(f"Popup visible: {visible}")

        await page.screenshot(path='C:/Users/AYYAPPA RAYUDU/.gemini/antigravity/brain/9e62f329-e793-4149-9220-b61e27b03275/verified_agent_popup_mission.png')
        print("Saved verified_agent_popup_mission.png")

        # Tab 2: Live Telemetry
        tab2 = page.locator('button.popup-tab-btn', has_text="Live Telemetry")
        await tab2.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path='C:/Users/AYYAPPA RAYUDU/.gemini/antigravity/brain/9e62f329-e793-4149-9220-b61e27b03275/verified_agent_popup_telemetry.png')
        print("Saved verified_agent_popup_telemetry.png")

        # Tab 3: Synaptic Chat
        tab3 = page.locator('button.popup-tab-btn', has_text="Synaptic Chat")
        await tab3.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path='C:/Users/AYYAPPA RAYUDU/.gemini/antigravity/brain/9e62f329-e793-4149-9220-b61e27b03275/verified_agent_popup_chat.png')
        print("Saved verified_agent_popup_chat.png")

        await browser.close()
        print("All steps finished cleanly.")

if __name__ == "__main__":
    asyncio.run(verify())
