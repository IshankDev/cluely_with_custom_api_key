// Test script to verify renderer functionality (only in development)
if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
  console.log('=== TEST.JS LOADED ===');

  // Test if we can access the DOM
  document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM CONTENT LOADED IN TEST.JS ===');

    const testElement = document.getElementById('response-text');
    console.log('Response text element found:', !!testElement);

    if (testElement) {
      console.log('Response text content:', testElement.textContent);
      console.log('Response text element type:', testElement.tagName);
    }

    // Test if we can access electron
    try {
      const { ipcRenderer } = require('electron');
      console.log('=== ELECTRON IPC RENDERER AVAILABLE IN TEST.JS ===');

      // Test sending a message to main process
      ipcRenderer.send('test-message-from-renderer', {
        message: 'Test from renderer test.js',
        timestamp: Date.now(),
      });

      console.log('Test message sent to main process');
    } catch (error) {
      console.error('Failed to access electron in test.js:', error);
    }
  });
}

// Test if we can modify the response text
function testResponseTextUpdate() {
  if (
    process.argv.includes('--dev') ||
    process.env.NODE_ENV === 'development'
  ) {
    const responseText = document.getElementById('response-text');
    if (responseText) {
      console.log('Testing response text update...');
      responseText.textContent =
        'Test response from test.js - ' + new Date().toLocaleTimeString();
      console.log('Response text updated successfully');
    } else {
      console.error('Response text element not found for testing');
    }
  }
}

// Export for potential use (only in development)
if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
  window.testResponseTextUpdate = testResponseTextUpdate;
}
