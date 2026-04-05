from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))
        page.goto("http://localhost:3000")
        page.wait_for_timeout(2000)
        page.click('[data-testid="render-video-btn"]')
        page.wait_for_timeout(5000)
        is_gen = page.is_visible('[data-testid="render-video-btn"] span.animate-spin')
        print(f"Generating spinner visible: {is_gen}")
        browser.close()

if __name__ == "__main__":
    run()
