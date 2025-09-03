/**
 * Test utilities for AI Overlay Assistant tests
 */

const fs = require('fs');
const path = require('path');

class TestUtils {
  /**
   * Wait for a condition to be true
   * @param {Function} condition - Function that returns a boolean
   * @param {number} timeout - Timeout in milliseconds
   * @param {number} interval - Check interval in milliseconds
   */
  static async waitForCondition(condition, timeout = 10000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Mock clipboard content
   * @param {string} content - Content to set in clipboard
   */
  static async mockClipboardContent(content) {
    // This would need to be implemented based on the platform
    // For now, we'll simulate clipboard changes
    return content;
  }

  /**
   * Simulate global hotkey press
   * @param {string} platform - Platform (macos, windows, linux)
   */
  static async simulateGlobalHotkey(platform = 'macos') {
    const keyCombination = platform === 'macos' ? 'Meta+Shift+Space' : 'Control+Shift+Space';
    // This would need to be implemented based on the platform
    return keyCombination;
  }

  /**
   * Load test data
   * @param {string} filename - Test data filename
   */
  static loadTestData(filename) {
    const testDataPath = path.join(__dirname, '..', '..', 'test-data', filename);
    if (fs.existsSync(testDataPath)) {
      return fs.readFileSync(testDataPath, 'utf8');
    }
    throw new Error(`Test data file not found: ${filename}`);
  }

  /**
   * Load test configuration
   * @param {string} backend - Backend type (ollama, gemini)
   */
  static loadTestConfig(backend) {
    const configPath = path.join(__dirname, '..', '..', 'test-data', 'test-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config[backend] || config.ollama;
    }
    throw new Error('Test configuration file not found');
  }

  /**
   * Check if service is running
   * @param {string} service - Service name (ollama, gemini)
   */
  static async checkServiceStatus(service) {
    try {
      if (service === 'ollama') {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
      }
      // Add other service checks as needed
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate test content
   * @param {string} type - Content type (short, long, code, special)
   */
  static generateTestContent(type) {
    const contentMap = {
      short: 'Hello world',
      long: 'This is a longer text for testing clipboard monitoring with substantial content that should trigger the AI processing functionality.',
      code: 'function hello() {\n  console.log("Hello, world!");\n}',
      special: 'Test with émojis 🚀 and special characters: ñ, ü, ç',
      large: 'A'.repeat(1000)
    };
    
    return contentMap[type] || contentMap.short;
  }

  /**
   * Wait for overlay to be visible
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async waitForOverlayVisible(page) {
    await page.waitForSelector('#overlay-container', { state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for overlay to be hidden
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async waitForOverlayHidden(page) {
    await page.waitForSelector('#overlay-container', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Check if response text contains expected content
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {string} expectedContent - Expected content
   */
  static async checkResponseContent(page, expectedContent) {
    const responseText = await page.textContent('#response-text');
    return responseText && responseText.includes(expectedContent);
  }

  /**
   * Wait for AI response to complete
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async waitForAIResponse(page) {
    await this.waitForCondition(async () => {
      const isGenerating = await page.evaluate(() => {
        return window.overlayUI && window.overlayUI.state && !window.overlayUI.state.isGenerating;
      });
      return isGenerating;
    }, 30000);
  }

  /**
   * Check for error messages
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async checkForErrors(page) {
    const errorElements = await page.$$('.error, [data-error="true"]');
    return errorElements.length > 0;
  }

  /**
   * Get error message text
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async getErrorMessage(page) {
    const errorElement = await page.$('.error, [data-error="true"]');
    return errorElement ? await errorElement.textContent() : null;
  }

  /**
   * Take screenshot for debugging
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {string} name - Screenshot name
   */
  static async takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-results/screenshot-${name}-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath });
    return screenshotPath;
  }
}

module.exports = TestUtils;
