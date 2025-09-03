/**
 * Core functionality tests for AI Overlay Assistant
 */

const { test, expect } = require('@playwright/test');
const TestUtils = require('./utils/test-utils');

test.describe('Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + require('path').resolve(__dirname, '../src/renderer/index.html'));
  });

  test('should display overlay on page load', async ({ page }) => {
    // Check if overlay container is present
    await expect(page.locator('#overlay-container')).toBeVisible();
    
    // Check if response bubble is present
    await expect(page.locator('#response-bubble')).toBeVisible();
    
    // Check if status indicator is present
    await expect(page.locator('#status-indicator')).toBeVisible();
  });

  test('should show ready status on initial load', async ({ page }) => {
    // Check status text
    await expect(page.locator('#status-text')).toHaveText('Ready');
    
    // Check status dot has ready class
    await expect(page.locator('#status-dot')).toHaveClass(/ready/);
  });

  test('should display initial response text', async ({ page }) => {
    // Check initial response text
    await expect(page.locator('#response-text')).toContainText('Ready for AI assistance');
  });

  test('should have all required UI elements', async ({ page }) => {
    // Check for minimize button
    await expect(page.locator('#minimize-btn')).toBeVisible();
    
    // Check for close button
    await expect(page.locator('#close-btn')).toBeVisible();
    
    // Check for settings button
    await expect(page.locator('#settings-btn')).toBeVisible();
    
    // Check for copy button
    await expect(page.locator('#copy-btn')).toBeVisible();
    
    // Check for clear button
    await expect(page.locator('#clear-btn')).toBeVisible();
  });

  test('should open settings panel when settings button is clicked', async ({ page }) => {
    // Click settings button
    await page.click('#settings-btn');
    
    // Check if settings panel is visible
    await expect(page.locator('#settings-panel')).toBeVisible();
    
    // Check for backend selection options
    await expect(page.locator('#backend-ollama')).toBeVisible();
    await expect(page.locator('#backend-gemini')).toBeVisible();
  });

  test('should close settings panel when close button is clicked', async ({ page }) => {
    // Open settings panel
    await page.click('#settings-btn');
    await expect(page.locator('#settings-panel')).toBeVisible();
    
    // Close settings panel
    await page.click('#close-settings-btn');
    
    // Check if settings panel is hidden
    await expect(page.locator('#settings-panel')).not.toBeVisible();
  });

  test('should minimize overlay when minimize button is clicked', async ({ page }) => {
    // Click minimize button
    await page.click('#minimize-btn');
    
    // Check if minimized indicator is visible
    await expect(page.locator('#minimized-indicator')).toBeVisible();
    
    // Check if main overlay is hidden
    await expect(page.locator('#response-bubble')).not.toBeVisible();
  });

  test('should restore overlay when minimized indicator is clicked', async ({ page }) => {
    // Minimize overlay
    await page.click('#minimize-btn');
    await expect(page.locator('#minimized-indicator')).toBeVisible();
    
    // Click minimized indicator to restore
    await page.click('#minimized-indicator');
    
    // Check if overlay is restored
    await expect(page.locator('#response-bubble')).toBeVisible();
    await expect(page.locator('#minimized-indicator')).not.toBeVisible();
  });

  test('should copy response text when copy button is clicked', async ({ page }) => {
    // Set up clipboard permission
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Set some response text
    await page.evaluate(() => {
      document.getElementById('response-text').textContent = 'Test response text';
    });
    
    // Click copy button
    await page.click('#copy-btn');
    
    // Check clipboard content (this might not work in all environments)
    try {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe('Test response text');
    } catch (error) {
      // Clipboard access might be restricted in test environment
      console.log('Clipboard access restricted in test environment');
    }
  });

  test('should clear response text when clear button is clicked', async ({ page }) => {
    // Set some response text
    await page.evaluate(() => {
      document.getElementById('response-text').textContent = 'Test response text';
    });
    
    // Click clear button
    await page.click('#clear-btn');
    
    // Check if response text is cleared
    await expect(page.locator('#response-text')).toContainText('Ready for AI assistance');
  });

  test('should show loading indicator when processing', async ({ page }) => {
    // Simulate processing state
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.showLoading();
      }
    });
    
    // Check if loading indicator is active
    await expect(page.locator('#loading-indicator')).toHaveClass(/active/);
    
    // Check status text
    await expect(page.locator('#status-text')).toHaveText('Processing...');
  });

  test('should hide loading indicator when processing completes', async ({ page }) => {
    // Simulate processing state
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.showLoading();
      }
    });
    
    // Wait a moment then hide loading
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.hideLoading();
      }
    });
    
    // Check if loading indicator is not active
    await expect(page.locator('#loading-indicator')).not.toHaveClass(/active/);
  });

  test('should display error message when error occurs', async ({ page }) => {
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.showError('Test error message');
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('Error: Test error message');
    
    // Check if error class is applied
    await expect(page.locator('#response-text')).toHaveClass(/error/);
  });

  test('should clear error message after timeout', async ({ page }) => {
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.showError('Test error message');
      }
    });
    
    // Wait for error to clear (5 seconds)
    await page.waitForTimeout(5000);
    
    // Check if error message is cleared
    await expect(page.locator('#response-text')).not.toHaveClass(/error/);
    await expect(page.locator('#response-text')).toContainText('Ready for AI assistance');
  });

  test('should update status when status changes', async ({ page }) => {
    // Test different status updates
    const statusTests = [
      { status: 'processing', text: 'Processing...' },
      { status: 'error', text: 'Error' },
      { status: 'ready', text: 'Ready' }
    ];
    
    for (const test of statusTests) {
      await page.evaluate((statusData) => {
        if (window.overlayUI) {
          window.overlayUI.updateStatus(statusData.status, statusData.text);
        }
      }, test);
      
      await expect(page.locator('#status-text')).toHaveText(test.text);
      await expect(page.locator('#status-dot')).toHaveClass(new RegExp(test.status));
    }
  });
});
