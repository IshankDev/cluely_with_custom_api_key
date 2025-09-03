/**
 * Global setup for Playwright tests
 * This file runs once before all tests
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('Setting up global test environment...');
  
  // Create test results directory
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Create test data directory
  const testDataDir = path.join(__dirname, '..', 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // Create test fixtures
  await createTestFixtures();
  
  console.log('Global setup completed');
}

async function createTestFixtures() {
  const testDataDir = path.join(__dirname, '..', 'test-data');
  
  // Create test text files
  const testTexts = {
    'short-text.txt': 'Hello world',
    'long-text.txt': 'This is a longer text for testing clipboard monitoring with substantial content that should trigger the AI processing functionality.',
    'code-snippet.txt': 'function hello() {\n  console.log("Hello, world!");\n}',
    'special-chars.txt': 'Test with émojis 🚀 and special characters: ñ, ü, ç',
    'large-text.txt': 'A'.repeat(1000) // 1000 character text
  };
  
  for (const [filename, content] of Object.entries(testTexts)) {
    const filePath = path.join(testDataDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  // Create test configuration
  const testConfig = {
    ollama: {
      backend: 'ollama',
      modelName: 'llama3.2',
      geminiApiKey: ''
    },
    gemini: {
      backend: 'gemini',
      modelName: '',
      geminiApiKey: 'test-api-key'
    }
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );
}

module.exports = globalSetup;
