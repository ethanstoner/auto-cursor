#!/usr/bin/env python3
"""
Playwright test to verify project loading on the Auto-Cursor web interface
"""

import asyncio
import sys
import os
from pathlib import Path

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Installing playwright...")
    os.system("pip install playwright --user --break-system-packages")
    os.system("playwright install chromium")
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

async def test_project_loading():
    """Test that projects are loaded and displayed in the select dropdown"""
    async with async_playwright() as p:
        print("🚀 Starting Playwright test...")
        
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        # Capture console logs
        console_logs = []
        errors = []
        
        def handle_console(msg):
            console_logs.append(msg.text)
            if msg.type == 'error':
                errors.append(msg.text)
        
        def handle_page_error(error):
            errors.append(str(error))
        
        page.on('console', handle_console)
        page.on('pageerror', handle_page_error)
        
        try:
            print("📡 Navigating to http://localhost:8765...")
            await page.goto('http://localhost:8765', wait_until='networkidle', timeout=30000)
            print("✅ Page loaded")
            
            # Wait for the select element to appear
            print("🔍 Waiting for project select element...")
            try:
                select = await page.wait_for_selector('#sidebar-project-select', timeout=10000)
                print("✅ Select element found")
            except PlaywrightTimeout:
                print("❌ Select element not found after 10 seconds")
                await page.screenshot(path='test_project_loading_error.png')
                return False
            
            # Wait a bit for projects to load
            print("⏳ Waiting for projects to load...")
            await asyncio.sleep(3)
            
            # Check if projects are loaded
            print("🔍 Checking project options...")
            options = await select.query_selector_all('option')
            print(f"📊 Found {len(options)} options in select")
            
            # Log all options
            for i, option in enumerate(options):
                value = await option.get_attribute('value')
                text = await option.text_content()
                print(f"   Option {i}: value='{value}', text='{text}'")
            
            # Check if we have more than just the default option
            if len(options) <= 1:
                print("❌ Only default option found - projects not loaded!")
                print("\n📋 Console logs:")
                for log in console_logs[-20:]:  # Last 20 logs
                    print(f"   {log}")
                print("\n❌ Errors:")
                for error in errors:
                    print(f"   {error}")
                await page.screenshot(path='test_project_loading_failed.png')
                return False
            
            # Check if any option has a value (not just empty default)
            has_projects = any(await opt.get_attribute('value') for opt in options if opt != options[0])
            
            if not has_projects:
                print("❌ No project options found (only empty default option)")
                await page.screenshot(path='test_project_loading_no_projects.png')
                return False
            
            print("✅ Projects are loaded in the select dropdown!")
            
            # Take screenshot of success
            await page.screenshot(path='test_project_loading_success.png')
            
            # Try to manually trigger project load
            print("🔧 Testing manual forceLoadProjects()...")
            try:
                await page.evaluate('forceLoadProjects()')
                await asyncio.sleep(1)
                options_after = await select.query_selector_all('option')
                print(f"📊 After manual trigger: {len(options_after)} options")
            except Exception as e:
                print(f"⚠️ Manual trigger error (expected if function doesn't exist): {e}")
            
            # Check stats display
            print("🔍 Checking stats display...")
            stats = {
                'projects': await page.text_content('#stat-projects'),
                'agents': await page.text_content('#stat-agents'),
                'running': await page.text_content('#stat-running'),
                'completed': await page.text_content('#stat-completed')
            }
            print(f"📊 Stats: {stats}")
            
            if stats['projects'] == '-' or stats['projects'] is None:
                print("⚠️ Stats not loaded (showing '-')")
            else:
                print("✅ Stats are displaying correctly")
            
            return True
            
        except Exception as e:
            print(f"❌ Test error: {e}")
            import traceback
            traceback.print_exc()
            await page.screenshot(path='test_project_loading_exception.png')
            return False
        finally:
            await browser.close()
            print("\n📋 Last 10 console logs:")
            for log in console_logs[-10:]:
                print(f"   {log}")
            if errors:
                print("\n❌ Errors encountered:")
                for error in errors:
                    print(f"   {error}")

if __name__ == '__main__':
    result = asyncio.run(test_project_loading())
    sys.exit(0 if result else 1)
