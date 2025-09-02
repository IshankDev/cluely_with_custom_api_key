// Renderer process script for the overlay UI
const { ipcRenderer } = require('electron');

class OverlayUI {
  constructor() {
    // Main elements
    this.container = document.getElementById('overlay-container');
    this.responseBubble = document.getElementById('response-bubble');
    this.responseText = document.getElementById('response-text');
    this.minimizeBtn = document.getElementById('minimize-btn');
    this.closeBtn = document.getElementById('close-btn');

    // New elements from enhanced HTML
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.responseFooter = document.getElementById('response-footer');
    this.copyBtn = document.getElementById('copy-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.processClipboardBtn = document.getElementById('process-clipboard-btn');
    this.minimizedIndicator = document.getElementById('minimized-indicator');

    // Settings panel elements
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsPanel = document.getElementById('settings-panel');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    this.backendOllama = document.getElementById('backend-ollama');
    this.backendGemini = document.getElementById('backend-gemini');
    this.modelNameInput = document.getElementById('model-name');
    this.apiKeySection = document.getElementById('api-key-section');
    this.apiKeyInput = document.getElementById('api-key');
    this.toggleApiKeyBtn = document.getElementById('toggle-api-key-btn');
    this.apiKeyStatusIcon = document.getElementById('api-key-status-icon');
    this.apiKeyStatusText = document.getElementById('api-key-status-text');
    this.testApiKeyBtn = document.getElementById('test-api-key-btn');
    this.validateApiKeyBtn = document.getElementById('validate-api-key-btn');
    this.backendStatusIcon = document.getElementById('backend-status-icon');
    this.backendStatusText = document.getElementById('backend-status-text');
    this.testBackendBtn = document.getElementById('test-backend-btn');
    this.refreshStatusBtn = document.getElementById('refresh-status-btn');
    this.saveSettingsBtn = document.getElementById('save-settings-btn');
    this.cancelSettingsBtn = document.getElementById('cancel-settings-btn');

    // Validation error elements
    this.backendValidationError = document.getElementById(
      'backend-validation-error'
    );
    this.modelValidationError = document.getElementById(
      'model-validation-error'
    );
    this.apiKeyValidationError = document.getElementById(
      'api-key-validation-error'
    );

    // State management
    this.state = {
      isMinimized: false,
      isVisible: true,
      isProcessing: false,
      currentPosition: 'top-right',
      lastResponse: '',
      clipboardHistory: [],
      settings: {
        autoHide: false,
        autoHideDelay: 5000,
        showNotifications: true,
        theme: 'auto',
      },
    };

    this.initializeEventListeners();
    this.setupIPCListeners();
    this.initializeState();
    this.loadState();
  }

  initializeEventListeners() {
    // Minimize button
    this.minimizeBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    // Close button
    this.closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });

    // Copy button
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.copyResponse();
      });
    }

    // Clear button
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.clearResponse();
      });
    }

    // Process clipboard button
    if (this.processClipboardBtn) {
      this.processClipboardBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.processClipboard();
      });
    }

    // Minimized indicator click
    if (this.minimizedIndicator) {
      this.minimizedIndicator.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + P to cycle position
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        const newPosition = this.cyclePosition();
        console.log('Position cycled to:', newPosition);
      }

      // Ctrl/Cmd + M to toggle minimize
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        this.toggleMinimize();
      }
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      this.ensureVisibility();
    });

    // Make overlay draggable
    this.makeDraggable();
  }

  setupIPCListeners() {
    // Listen for AI response updates from main process
    ipcRenderer.on('ai-response-update', (event, data) => {
      this.updateResponse(data.text, data.isComplete);
    });

    // Listen for overlay visibility toggle
    ipcRenderer.on('toggle-overlay', (event, data) => {
      this.toggleVisibility();
    });

    // Listen for error messages
    ipcRenderer.on('error-message', (event, error) => {
      this.showError(error.message);
    });

    // Listen for clipboard monitoring events
    ipcRenderer.on('clipboard-monitoring-started', (event, data) => {
      this.updateStatus('monitoring', 'Monitoring clipboard...');
    });

    ipcRenderer.on('clipboard-monitoring-stopped', (event, data) => {
      this.updateStatus('ready', 'Ready');
    });

    ipcRenderer.on('clipboard-changed', (event, changeEvent) => {
      this.handleClipboardChange(changeEvent);
    });

    ipcRenderer.on('clipboard-error', (event, error) => {
      this.updateStatus('error', 'Error');
      this.showError(`Clipboard error: ${error.error || error.message}`);
    });

    // Listen for Ollama events
    ipcRenderer.on('ollama-initialized', (event, data) => {
      this.updateStatus('ready', 'AI Ready');
      console.log('Ollama initialized:', data);
    });

    ipcRenderer.on('ollama-generation-started', (event, data) => {
      this.showLoading();
      this.responseText.textContent = '';
      console.log('AI generation started:', data);
    });

    ipcRenderer.on('ollama-token-received', (event, data) => {
      this.hideLoading();

      // Append token to response text
      if (data.token) {
        this.responseText.textContent += data.token;

        // Auto-scroll to bottom for long responses
        this.responseText.scrollTop = this.responseText.scrollHeight;

        // Show footer once we have content
        if (this.responseText.textContent.trim().length > 0) {
          this.showFooter();
        }
      }

      // Update state
      this.updateState({
        isProcessing: false,
        lastResponse: this.responseText.textContent,
      });
    });

    ipcRenderer.on('ollama-generation-completed', (event, data) => {
      this.hideLoading();
      this.updateStatus('ready', 'AI Ready');

      // Store the complete response
      this.updateState({
        isProcessing: false,
        lastResponse: this.responseText.textContent,
        clipboardHistory: [
          ...this.state.clipboardHistory.slice(-9), // Keep last 10
          {
            type: data.contentType || 'text',
            response: this.responseText.textContent,
            timestamp: Date.now(),
          },
        ],
      });

      console.log('AI generation completed:', data);
    });

    ipcRenderer.on('ollama-error', (event, error) => {
      this.hideLoading();

      // Enhanced error handling with specific error types
      let errorMessage = 'AI error occurred';
      let statusText = 'AI Error';

      switch (error.type) {
        case 'service-not-connected':
          errorMessage =
            'Ollama service is not connected. Please check if Ollama is running.';
          statusText = 'Not Connected';
          break;
        case 'timeout':
          errorMessage =
            'Request timed out. The model may be too large or the server is slow.';
          statusText = 'Timeout';
          break;
        case 'model-not-found':
          errorMessage = `Model '${error.model}' not found. Please check available models.`;
          statusText = 'Model Not Found';
          break;
        case 'server-error':
          errorMessage = 'Ollama server error. Please try again later.';
          statusText = 'Server Error';
          break;
        case 'invalid-prompt':
          errorMessage =
            'Invalid prompt generated. Please try copying different content.';
          statusText = 'Invalid Prompt';
          break;
        default:
          errorMessage =
            error.error || error.message || 'Unknown error occurred';
          statusText = 'Error';
      }

      this.updateStatus('error', statusText);
      this.showError(errorMessage);

      // Update state
      this.updateState({
        isProcessing: false,
        lastError: {
          type: error.type,
          message: errorMessage,
          timestamp: Date.now(),
        },
      });
    });

    // Listen for Gemini service events
    ipcRenderer.on('gemini-initialized', (event, data) => {
      console.log('Gemini service initialized:', data);
      this.updateBackendStatus('ready', 'Gemini Ready');
    });

    ipcRenderer.on('gemini-generation-started', (event, data) => {
      this.showLoading();
      this.updateStatus('processing', 'Generating...');
      this.updateState({ isProcessing: true });
    });

    ipcRenderer.on('gemini-token-received', (event, data) => {
      // Append new tokens to the response
      this.updateResponse(data.token, false);

      // Auto-scroll to bottom for long responses
      this.responseText.scrollTop = this.responseText.scrollHeight;

      // Show footer once we have content
      if (this.responseText.textContent.trim().length > 0) {
        this.showFooter();
      }
    });

    ipcRenderer.on('gemini-generation-completed', (event, data) => {
      this.hideLoading();
      this.updateStatus('ready', 'AI Ready');

      // Store the complete response
      this.updateState({
        isProcessing: false,
        lastResponse: this.responseText.textContent,
        clipboardHistory: [
          ...this.state.clipboardHistory.slice(-9), // Keep last 10
          {
            type: data.contentType || 'text',
            response: this.responseText.textContent,
            timestamp: Date.now(),
          },
        ],
      });

      console.log('AI generation completed:', data);
    });

    ipcRenderer.on('gemini-error', (event, error) => {
      this.hideLoading();

      // Enhanced error handling with specific error types
      let errorMessage = 'AI error occurred';
      let statusText = 'AI Error';

      switch (error.type) {
        case 'api-key-invalid':
          errorMessage = 'Invalid Gemini API key. Please check your settings.';
          statusText = 'Invalid API Key';
          break;
        case 'service-not-available':
          errorMessage =
            'Gemini service is not available. Please try again later.';
          statusText = 'Service Unavailable';
          break;
        case 'timeout':
          errorMessage = 'Request timed out. Please try again.';
          statusText = 'Timeout';
          break;
        case 'quota-exceeded':
          errorMessage =
            'API quota exceeded. Please check your Gemini account.';
          statusText = 'Quota Exceeded';
          break;
        default:
          errorMessage =
            error.error || error.message || 'Unknown error occurred';
          statusText = 'Error';
      }

      this.updateStatus('error', statusText);
      this.showError(errorMessage);

      // Update state
      this.updateState({
        isProcessing: false,
        lastError: {
          type: error.type,
          message: errorMessage,
          timestamp: Date.now(),
        },
      });
    });

    // Listen for secure storage events
    ipcRenderer.on('secure-storage-status', (event, data) => {
      console.log('Secure storage status:', data);
    });

    ipcRenderer.on('api-key-validated', (event, data) => {
      this.updateApiKeyStatus(data.isValid ? 'ready' : 'error', data.message);
    });

    ipcRenderer.on('api-key-tested', (event, data) => {
      this.updateApiKeyStatus(data.isValid ? 'ready' : 'error', data.message);
    });

    // Listen for backend switching events
    ipcRenderer.on('backend-switched', (event, data) => {
      console.log('Backend switched:', data);
      this.state.settings.backend = data.backend;
      this.state.settings = { ...this.state.settings, ...data.config };
      this.updateSettingsForm();
      this.updateBackendStatus('ready', `${data.backend} Active`);
      this.showSuccessMessage(`Switched to ${data.backend} backend`);
    });

    ipcRenderer.on('backend-switch-error', (event, data) => {
      console.error('Backend switch error:', data);
      this.showError(`Failed to switch backend: ${data.error}`);
    });
  }

  initializeState() {
    this.updateStatus('ready', 'Ready');
    this.hideLoading();
    this.hideFooter();
    this.applyState();
  }

  loadState() {
    try {
      const savedState = localStorage.getItem('ai-overlay-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  saveState() {
    try {
      localStorage.setItem('ai-overlay-state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  applyState() {
    // Apply visibility state
    this.container.style.display = this.state.isVisible ? 'block' : 'none';

    // Apply minimized state
    this.container.classList.toggle('minimized', this.state.isMinimized);

    // Apply position
    this.setPosition(this.state.currentPosition);

    // Apply processing state
    if (this.state.isProcessing) {
      this.showLoading();
    } else {
      this.hideLoading();
    }
  }

  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveState();
    this.applyState();
  }

  toggleMinimize() {
    this.updateState({ isMinimized: !this.state.isMinimized });

    // Update button text and title
    const btnIcon = this.minimizeBtn.querySelector('.btn-icon');
    if (btnIcon) {
      btnIcon.textContent = this.state.isMinimized ? '+' : '−';
    }
    this.minimizeBtn.title = this.state.isMinimized
      ? 'Expand overlay'
      : 'Minimize overlay';

    // Notify main process
    ipcRenderer.send('overlay-minimized', this.state.isMinimized);
  }

  toggleVisibility() {
    this.updateState({ isVisible: !this.state.isVisible });
  }

  show() {
    this.updateState({ isVisible: true });
  }

  hide() {
    this.updateState({ isVisible: false });
  }

  updateResponse(text, isComplete = false) {
    this.responseText.textContent = text;

    if (isComplete) {
      this.responseText.classList.add('complete');
    } else {
      this.responseText.classList.remove('complete');
    }
  }

  showError(message) {
    this.responseText.textContent = `Error: ${message}`;
    this.responseText.classList.add('error');
    this.updateStatus('error', 'Error');

    // Remove error class after 5 seconds
    setTimeout(() => {
      this.responseText.classList.remove('error');
      this.updateStatus('ready', 'Ready');
    }, 5000);
  }

  updateStatus(status, text) {
    if (this.statusDot && this.statusText) {
      this.statusDot.className = `status-dot ${status}`;
      this.statusText.textContent = text;
    }
  }

  showLoading() {
    this.updateState({ isProcessing: true });
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.add('active');
    }
    this.updateStatus('processing', 'Processing...');
  }

  hideLoading() {
    this.updateState({ isProcessing: false });
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.remove('active');
    }
  }

  showFooter() {
    if (this.responseFooter) {
      this.responseFooter.classList.add('active');
    }
  }

  hideFooter() {
    if (this.responseFooter) {
      this.responseFooter.classList.remove('active');
    }
  }

  copyResponse() {
    const text = this.responseText.textContent;
    if (text && text.trim()) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // Show brief feedback
          const originalText =
            this.copyBtn.querySelector('.btn-icon').textContent;
          this.copyBtn.querySelector('.btn-icon').textContent = '✓';
          setTimeout(() => {
            this.copyBtn.querySelector('.btn-icon').textContent = originalText;
          }, 1000);
        })
        .catch(err => {
          console.error('Failed to copy text:', err);
        });
    }
  }

  clearResponse() {
    this.responseText.textContent = 'Ready for AI assistance...';
    this.responseText.classList.remove('error', 'complete');
    this.hideFooter();
    this.updateStatus('ready', 'Ready');
  }

  async processClipboard() {
    try {
      this.updateStatus('processing', 'Processing clipboard...');
      this.showLoading();

      const result = await ipcRenderer.invoke('ollama-process-clipboard');

      if (result.success) {
        console.log('Clipboard processed successfully:', result);
        // The actual response will come through the Ollama event listeners
      } else {
        throw new Error('Failed to process clipboard');
      }
    } catch (error) {
      console.error('Error processing clipboard:', error);
      this.hideLoading();
      this.updateStatus('error', 'Error');
      this.showError(`Failed to process clipboard: ${error.message}`);
    }
  }

  handleClipboardChange(changeEvent) {
    if (changeEvent.isSignificant && !changeEvent.isEmpty) {
      // The actual AI processing is now handled by the main process
      // This method provides immediate feedback while processing starts

      const contentType = changeEvent.type || 'text';
      const contentLength = changeEvent.length || 0;

      // Show processing message with content details
      this.responseText.textContent = `Processing ${contentType} content (${contentLength} characters)...`;
      this.updateStatus('processing', 'Processing...');

      // Update state to reflect processing
      this.updateState({
        isProcessing: true,
        lastClipboardContent: {
          type: contentType,
          length: contentLength,
          timestamp: Date.now(),
        },
      });

      // Show loading indicator
      this.showLoading();

      console.log('Clipboard change detected:', {
        type: contentType,
        length: contentLength,
        timestamp: Date.now(),
      });
    }
  }

  setPosition(position) {
    const validPositions = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
      'center-right',
      'center-left',
    ];

    if (!validPositions.includes(position)) {
      console.error('Invalid position:', position);
      return false;
    }

    // Remove all position classes
    this.container.classList.remove(
      'position-top-right',
      'position-top-left',
      'position-bottom-right',
      'position-bottom-left',
      'position-center-right',
      'position-center-left'
    );

    // Add new position class
    this.container.classList.add(`position-${position}`);
    this.updateState({ currentPosition: position });

    // Notify main process of position change
    ipcRenderer.send('overlay-position-changed', position);

    return true;
  }

  getPosition() {
    return this.state.currentPosition;
  }

  cyclePosition() {
    const positions = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
      'center-right',
      'center-left',
    ];

    const currentIndex = positions.indexOf(this.state.currentPosition);
    const nextIndex = (currentIndex + 1) % positions.length;
    const nextPosition = positions[nextIndex];

    this.setPosition(nextPosition);
    return nextPosition;
  }

  ensureVisibility() {
    // Check if overlay is within viewport bounds
    const rect = this.container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let needsReposition = false;
    let newPosition = this.state.currentPosition;

    // Check horizontal bounds
    if (rect.right > viewportWidth) {
      if (this.state.currentPosition.includes('right')) {
        newPosition = this.state.currentPosition.replace('right', 'left');
        needsReposition = true;
      }
    } else if (rect.left < 0) {
      if (this.state.currentPosition.includes('left')) {
        newPosition = this.state.currentPosition.replace('left', 'right');
        needsReposition = true;
      }
    }

    // Check vertical bounds
    if (rect.bottom > viewportHeight) {
      if (this.state.currentPosition.includes('bottom')) {
        newPosition = this.state.currentPosition.replace('bottom', 'top');
        needsReposition = true;
      }
    } else if (rect.top < 0) {
      if (this.state.currentPosition.includes('top')) {
        newPosition = this.state.currentPosition.replace('top', 'bottom');
        needsReposition = true;
      }
    }

    if (needsReposition) {
      this.setPosition(newPosition);
    }
  }

  makeDraggable() {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    this.responseBubble.addEventListener('mousedown', e => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === this.responseBubble) {
        isDragging = true;
      }
    });

    document.addEventListener('mousemove', e => {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        this.container.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    });
  }
}

// Initialize the overlay UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.overlayUI = new OverlayUI();
  console.log('AI Overlay Assistant UI initialized');
});
