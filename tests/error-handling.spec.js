/**
 * Error handling tests for AI Overlay Assistant
 */

const { test, expect } = require('@playwright/test');
const TestUtils = require('./utils/test-utils');

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + require('path').resolve(__dirname, '../src/renderer/index.html'));
  });

  test('should handle backend validation failures', async ({ page }) => {
    // Simulate backend validation failure
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'backend-validation-failed',
          error: 'Invalid backend configuration'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('Invalid backend configuration');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('Invalid Config');
    await expect(page.locator('#status-dot')).toHaveClass(/error/);
  });

  test('should handle service not initialized errors', async ({ page }) => {
    // Simulate service not initialized error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'service-not-initialized',
          error: 'AI service is not initialized'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('AI service is not initialized');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('Not Initialized');
  });

  test('should handle service not connected errors', async ({ page }) => {
    // Simulate service not connected error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'service-not-connected',
          error: 'AI service is not connected'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('AI service is not connected');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('Not Connected');
  });

  test('should handle API key not configured errors', async ({ page }) => {
    // Simulate API key not configured error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'api-key-not-configured',
          error: 'API key is not configured'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('API key is not configured');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('No API Key');
  });

  test('should handle model not configured errors', async ({ page }) => {
    // Simulate model not configured error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'model-not-configured',
          error: 'No model is configured'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('No model is configured');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('No Model');
  });

  test('should handle streaming failures', async ({ page }) => {
    // Simulate streaming failure
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'streaming-failed',
          error: 'Streaming failed. Please try again.'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('Streaming failed. Please try again.');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('Streaming Error');
  });

  test('should handle unknown backend errors', async ({ page }) => {
    // Simulate unknown backend error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'unknown-error',
          error: 'Unknown backend error'
        });
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('Unknown backend error');
    
    // Check if status is updated
    await expect(page.locator('#status-text')).toHaveText('Error');
  });

  test('should clear streaming visual feedback on error', async ({ page }) => {
    // Simulate streaming state
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.responseText.classList.add('streaming');
      }
    });
    
    // Verify streaming class is applied
    await expect(page.locator('#response-text')).toHaveClass(/streaming/);
    
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'streaming-failed',
          error: 'Streaming failed'
        });
      }
    });
    
    // Check if streaming class is removed
    await expect(page.locator('#response-text')).not.toHaveClass(/streaming/);
  });

  test('should update state on error', async ({ page }) => {
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'backend-validation-failed',
          error: 'Test error'
        });
      }
    });
    
    // Check if state is updated
    const state = await page.evaluate(() => {
      return window.overlayUI ? window.overlayUI.state : null;
    });
    
    expect(state).toBeTruthy();
    expect(state.isProcessing).toBe(false);
    expect(state.isGenerating).toBe(false);
    expect(state.lastError).toBeTruthy();
    expect(state.lastError.type).toBe('backend-validation-failed');
    expect(state.lastError.message).toContain('Test error');
  });

  test('should clear auto-hide timer on error', async ({ page }) => {
    // Set up auto-hide timer
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.state.autoHideTimer = setTimeout(() => {}, 5000);
      }
    });
    
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'backend-validation-failed',
          error: 'Test error'
        });
      }
    });
    
    // Check if auto-hide timer is cleared
    const state = await page.evaluate(() => {
      return window.overlayUI ? window.overlayUI.state.autoHideTimer : null;
    });
    
    expect(state).toBeNull();
  });

  test('should handle clipboard processing errors', async ({ page }) => {
    // Simulate clipboard processing error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.showError('Failed to process clipboard: Network error');
      }
    });
    
    // Check if error message is displayed
    await expect(page.locator('#response-text')).toContainText('Failed to process clipboard: Network error');
    
    // Check if error class is applied
    await expect(page.locator('#response-text')).toHaveClass(/error/);
  });

  test('should handle multiple consecutive errors', async ({ page }) => {
    // Simulate multiple errors
    const errors = [
      { type: 'backend-validation-failed', error: 'First error' },
      { type: 'service-not-connected', error: 'Second error' },
      { type: 'api-key-not-configured', error: 'Third error' }
    ];
    
    for (const error of errors) {
      await page.evaluate((errorData) => {
        if (window.overlayUI) {
          window.overlayUI.handleBackendError(errorData);
        }
      }, error);
      
      // Check if error message is displayed
      await expect(page.locator('#response-text')).toContainText(error.error);
      
      // Wait a moment before next error
      await page.waitForTimeout(100);
    }
  });

  test('should recover from errors gracefully', async ({ page }) => {
    // Simulate error
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.handleBackendError({
          type: 'backend-validation-failed',
          error: 'Test error'
        });
      }
    });
    
    // Verify error state
    await expect(page.locator('#response-text')).toContainText('Test error');
    await expect(page.locator('#status-dot')).toHaveClass(/error/);
    
    // Simulate recovery
    await page.evaluate(() => {
      if (window.overlayUI) {
        window.overlayUI.updateStatus('ready', 'Ready');
        window.overlayUI.responseText.textContent = 'Ready for AI assistance...';
        window.overlayUI.responseText.classList.remove('error');
      }
    });
    
    // Verify recovery
    await expect(page.locator('#response-text')).toContainText('Ready for AI assistance');
    await expect(page.locator('#response-text')).not.toHaveClass(/error/);
    await expect(page.locator('#status-dot')).toHaveClass(/ready/);
  });
});
