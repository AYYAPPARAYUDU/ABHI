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

        # 1. Type and submit 'read my mails'
        dock_input = page.locator(".dock-input-field")
        await dock_input.wait_for(state="visible", timeout=10000)
        await dock_input.fill("read my mails")
        await page.wait_for_timeout(300)
        await page.keyboard.press("Enter")
        print("Submitted 'read my mails' command.")

        # Wait for execution response
        await page.wait_for_timeout(3500)

        # Screenshot of mails command result
        mail_shot = os.path.join(artifacts_dir, "verified_read_mails_command.png")
        await page.screenshot(path=mail_shot)
        print(f"Captured mails command screenshot: {mail_shot}")

        # 2. Type and submit 'open whatsapp'
        await dock_input.fill("open whatsapp")
        await page.wait_for_timeout(300)
        await page.keyboard.press("Enter")
        print("Submitted 'open whatsapp' command.")

        await page.wait_for_timeout(3500)

        # Screenshot of WhatsApp command result
        wa_shot = os.path.join(artifacts_dir, "verified_open_whatsapp_command.png")
        await page.screenshot(path=wa_shot)
        print(f"Captured WhatsApp command screenshot: {wa_shot}")

        await browser.close()
        print("Browser verification script completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())

