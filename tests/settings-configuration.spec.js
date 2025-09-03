/**
 * Settings and configuration tests for AI Overlay Assistant
 */

const { test, expect } = require('@playwright/test');
const TestUtils = require('./utils/test-utils');

test.describe('Settings and Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + require('path').resolve(__dirname, '../src/renderer/index.html'));
    
    // Open settings panel
    await page.click('#settings-btn');
    await expect(page.locator('#settings-panel')).toBeVisible();
  });

  test('should display all settings sections', async ({ page }) => {
    // Check for backend selection section
    await expect(page.locator('#backend-selection')).toBeVisible();
    
    // Check for position selection section
    await expect(page.locator('#position-selection')).toBeVisible();
    
    // Check for theme selection section
    await expect(page.locator('#theme-selection')).toBeVisible();
    
    // Check for auto-hide settings section
    await expect(page.locator('#auto-hide-settings')).toBeVisible();
  });

  test('should have Ollama backend option', async ({ page }) => {
    // Check Ollama radio button
    await expect(page.locator('#backend-ollama')).toBeVisible();
    await expect(page.locator('#backend-ollama')).not.toBeChecked();
  });

  test('should have Gemini backend option', async ({ page }) => {
    // Check Gemini radio button
    await expect(page.locator('#backend-gemini')).toBeVisible();
    await expect(page.locator('#backend-gemini')).not.toBeChecked();
  });

  test('should select Ollama backend when clicked', async ({ page }) => {
    // Click Ollama backend
    await page.click('#backend-ollama');
    
    // Check if Ollama is selected
    await expect(page.locator('#backend-ollama')).toBeChecked();
    await expect(page.locator('#backend-gemini')).not.toBeChecked();
    
    // Check if model name input is visible
    await expect(page.locator('#model-name')).toBeVisible();
    
    // Check if API key section is hidden
    await expect(page.locator('#api-key-section')).not.toBeVisible();
  });

  test('should select Gemini backend when clicked', async ({ page }) => {
    // Click Gemini backend
    await page.click('#backend-gemini');
    
    // Check if Gemini is selected
    await expect(page.locator('#backend-gemini')).toBeChecked();
    await expect(page.locator('#backend-ollama')).not.toBeChecked();
    
    // Check if API key section is visible
    await expect(page.locator('#api-key-section')).toBeVisible();
    
    // Check if model name input is hidden
    await expect(page.locator('#model-name')).not.toBeVisible();
  });

  test('should display model name input for Ollama', async ({ page }) => {
    // Select Ollama backend
    await page.click('#backend-ollama');
    
    // Check model name input
    await expect(page.locator('#model-name')).toBeVisible();
    await expect(page.locator('#model-name')).toHaveAttribute('placeholder', 'Enter model name (e.g., llama3.2)');
  });

  test('should display API key input for Gemini', async ({ page }) => {
    // Select Gemini backend
    await page.click('#backend-gemini');
    
    // Check API key input
    await expect(page.locator('#api-key')).toBeVisible();
    await expect(page.locator('#api-key')).toHaveAttribute('type', 'password');
    await expect(page.locator('#api-key')).toHaveAttribute('placeholder', 'Enter your Gemini API key');
  });

  test('should toggle API key visibility', async ({ page }) => {
    // Select Gemini backend
    await page.click('#backend-gemini');
    
    // Enter API key
    await page.fill('#api-key', 'test-api-key');
    
    // Check initial state (password type)
    await expect(page.locator('#api-key')).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await page.click('#toggle-api-key-btn');
    
    // Check if API key is now visible (text type)
    await expect(page.locator('#api-key')).toHaveAttribute('type', 'text');
    
    // Click toggle button again
    await page.click('#toggle-api-key-btn');
    
    // Check if API key is hidden again
    await expect(page.locator('#api-key')).toHaveAttribute('type', 'password');
  });

  test('should have all position options', async ({ page }) => {
    const positions = [
      'top-right', 'top-left', 'bottom-right', 
      'bottom-left', 'center-right', 'center-left'
    ];
    
    for (const position of positions) {
      const radio = page.locator(`#position-${position}`);
      await expect(radio).toBeVisible();
      await expect(radio).not.toBeChecked();
    }
  });

  test('should select position when clicked', async ({ page }) => {
    // Click center-left position
    await page.click('#position-center-left');
    
    // Check if it's selected
    await expect(page.locator('#position-center-left')).toBeChecked();
    
    // Check if other positions are not selected
    await expect(page.locator('#position-top-right')).not.toBeChecked();
    await expect(page.locator('#position-top-left')).not.toBeChecked();
  });

  test('should have all theme options', async ({ page }) => {
    const themes = ['auto', 'light', 'dark'];
    
    for (const theme of themes) {
      const radio = page.locator(`#theme-${theme}`);
      await expect(radio).toBeVisible();
      await expect(radio).not.toBeChecked();
    }
  });

  test('should select theme when clicked', async ({ page }) => {
    // Click dark theme
    await page.click('#theme-dark');
    
    // Check if it's selected
    await expect(page.locator('#theme-dark')).toBeChecked();
    
    // Check if other themes are not selected
    await expect(page.locator('#theme-auto')).not.toBeChecked();
    await expect(page.locator('#theme-light')).not.toBeChecked();
  });

  test('should have auto-hide settings', async ({ page }) => {
    // Check auto-hide enabled checkbox
    await expect(page.locator('#auto-hide-enabled')).toBeVisible();
    await expect(page.locator('#auto-hide-enabled')).not.toBeChecked();
    
    // Check auto-hide delay input
    await expect(page.locator('#auto-hide-delay')).toBeVisible();
    await expect(page.locator('#auto-hide-delay')).toHaveAttribute('type', 'number');
    await expect(page.locator('#auto-hide-delay')).toHaveAttribute('min', '1');
    await expect(page.locator('#auto-hide-delay')).toHaveAttribute('max', '60');
  });

  test('should enable auto-hide when checkbox is clicked', async ({ page }) => {
    // Click auto-hide enabled checkbox
    await page.click('#auto-hide-enabled');
    
    // Check if it's selected
    await expect(page.locator('#auto-hide-enabled')).toBeChecked();
    
    // Check if delay input is enabled
    await expect(page.locator('#auto-hide-delay')).toBeEnabled();
  });

  test('should have auto-hide after response setting', async ({ page }) => {
    // Check auto-hide after response checkbox
    await expect(page.locator('#auto-hide-after-response')).toBeVisible();
    await expect(page.locator('#auto-hide-after-response')).not.toBeChecked();
    
    // Check response delay input
    await expect(page.locator('#auto-hide-delay-response')).toBeVisible();
    await expect(page.locator('#auto-hide-delay-response')).toHaveAttribute('type', 'number');
    await expect(page.locator('#auto-hide-delay-response')).toHaveAttribute('min', '1');
    await expect(page.locator('#auto-hide-delay-response')).toHaveAttribute('max', '30');
  });

  test('should enable auto-hide after response when checkbox is clicked', async ({ page }) => {
    // Click auto-hide after response checkbox
    await page.click('#auto-hide-after-response');
    
    // Check if it's selected
    await expect(page.locator('#auto-hide-after-response')).toBeChecked();
    
    // Check if response delay input is enabled
    await expect(page.locator('#auto-hide-delay-response')).toBeEnabled();
  });

  test('should have test backend button', async ({ page }) => {
    // Check test backend button
    await expect(page.locator('#test-backend-btn')).toBeVisible();
    await expect(page.locator('#test-backend-btn')).toHaveText('Test Backend');
  });

  test('should have validate API key button for Gemini', async ({ page }) => {
    // Select Gemini backend
    await page.click('#backend-gemini');
    
    // Check validate API key button
    await expect(page.locator('#validate-api-key-btn')).toBeVisible();
    await expect(page.locator('#validate-api-key-btn')).toHaveText('Validate API Key');
  });

  test('should have refresh status button', async ({ page }) => {
    // Check refresh status button
    await expect(page.locator('#refresh-status-btn')).toBeVisible();
    await expect(page.locator('#refresh-status-btn')).toHaveText('Refresh Status');
  });

  test('should have save and cancel buttons', async ({ page }) => {
    // Check save settings button
    await expect(page.locator('#save-settings-btn')).toBeVisible();
    await expect(page.locator('#save-settings-btn')).toHaveText('Save Settings');
    
    // Check cancel settings button
    await expect(page.locator('#cancel-settings-btn')).toBeVisible();
    await expect(page.locator('#cancel-settings-btn')).toHaveText('Cancel');
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    // Select Ollama backend
    await page.click('#backend-ollama');
    
    // Try to save without model name
    await page.click('#save-settings-btn');
    
    // Check for validation error
    await expect(page.locator('#model-validation-error')).toBeVisible();
    await expect(page.locator('#model-validation-error')).toContainText('Model name is required');
  });

  test('should show validation errors for invalid API key', async ({ page }) => {
    // Select Gemini backend
    await page.click('#backend-gemini');
    
    // Enter invalid API key
    await page.fill('#api-key', 'invalid-key');
    
    // Try to save
    await page.click('#save-settings-btn');
    
    // Check for validation error
    await expect(page.locator('#api-key-validation-error')).toBeVisible();
    await expect(page.locator('#api-key-validation-error')).toContainText('Invalid API key format');
  });

  test('should show backend status information', async ({ page }) => {
    // Check backend status icon
    await expect(page.locator('#backend-status-icon')).toBeVisible();
    
    // Check backend status text
    await expect(page.locator('#backend-status-text')).toBeVisible();
    await expect(page.locator('#backend-status-text')).toContainText('Not configured');
  });

  test('should update backend status when backend is selected', async ({ page }) => {
    // Select Ollama backend
    await page.click('#backend-ollama');
    
    // Check if status updates
    await expect(page.locator('#backend-status-text')).toContainText('Ollama');
    
    // Select Gemini backend
    await page.click('#backend-gemini');
    
    // Check if status updates
    await expect(page.locator('#backend-status-text')).toContainText('Gemini');
  });

  test('should close settings panel when cancel is clicked', async ({ page }) => {
    // Click cancel button
    await page.click('#cancel-settings-btn');
    
    // Check if settings panel is hidden
    await expect(page.locator('#settings-panel')).not.toBeVisible();
  });

  test('should close settings panel when close button is clicked', async ({ page }) => {
    // Click close button
    await page.click('#close-settings-btn');
    
    // Check if settings panel is hidden
    await expect(page.locator('#settings-panel')).not.toBeVisible();
  });

  test('should maintain settings state when switching between backends', async ({ page }) => {
    // Select Ollama and enter model name
    await page.click('#backend-ollama');
    await page.fill('#model-name', 'llama3.2');
    
    // Switch to Gemini
    await page.click('#backend-gemini');
    await page.fill('#api-key', 'test-api-key');
    
    // Switch back to Ollama
    await page.click('#backend-ollama');
    
    // Check if model name is preserved
    await expect(page.locator('#model-name')).toHaveValue('llama3.2');
  });
});
