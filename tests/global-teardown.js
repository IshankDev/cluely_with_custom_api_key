/**
 * Global teardown for Playwright tests
 * This file runs once after all tests
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('Cleaning up global test environment...');
  
  // Clean up test data directory
  const testDataDir = path.join(__dirname, '..', 'test-data');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  
  // Clean up temporary files
  const tempDir = path.join(__dirname, '..', 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  console.log('Global teardown completed');
}

module.exports = globalTeardown;
