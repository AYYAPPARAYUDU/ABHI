import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto('http://127.0.0.1:4200/media', wait_until='networkidle')
        time.sleep(2)

        # Fill prompt 'cat'
        textarea = page.locator('textarea')
        textarea.fill('cat')
        time.sleep(0.5)

        # Click Create Now
        page.locator('button.create-now-btn').click()
        print('Clicked Create Now, waiting for synthesis...')
        time.sleep(5)

        # Switch to Animated Storage Vault
        page.locator('button.primary-tab:has-text("Animated Storage Vault")').click()
        time.sleep(3)

        out_path = r'C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\9e62f329-e793-4149-9220-b61e27b03275\vault_with_cat_verified.png'
        page.screenshot(path=out_path)
        print('Saved screenshot to:', out_path)
        browser.close()

if __name__ == '__main__':
    main()

