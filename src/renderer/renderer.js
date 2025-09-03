// Only log in development mode
if (
  process.argv &&
  (process.argv.includes('--dev') || process.env.NODE_ENV === 'development')
) {
  console.log('=== RENDERER.JS LOADING ===');
  console.log('Development mode detected');
}

class OverlayUI {
  constructor() {
    console.log('Initializing OverlayUI...');

    // Main elements
    this.container = document.getElementById('overlay-container');
    this.controlBar = document.getElementById('control-bar');
    this.responsePanel = document.getElementById('response-panel');
    this.responseText = document.getElementById('response-text');

    console.log('Elements found:', {
      container: !!this.container,
      controlBar: !!this.controlBar,
      responsePanel: !!this.responsePanel,
      responseText: !!this.responseText,
    });

    // Control bar elements
    this.listenBtn = document.getElementById('listen-btn');
    this.questionInput = document.getElementById('question-input');
    this.visibilityToggle = document.getElementById('visibility-toggle');
    this.screenShareToggle = document.getElementById('screen-share-toggle');
    this.settingsBtn = document.getElementById('settings-btn');
    this.dragHandle = document.getElementById('drag-handle');
    this.closeBtn = document.getElementById('close-btn');

    // Response panel elements
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.copyBtn = document.getElementById('copy-btn');
    this.clearBtn = document.getElementById('clear-btn');

    // State management
    this.state = {
      isMinimized: false,
      isVisible: true,
      isProcessing: false,
      isGenerating: false,
      currentPosition: 'center-top',
      lastResponse: '',
      clipboardHistory: [],
      currentBackend: null,
      currentModel: null,
      autoHideTimer: null,
      isListening: true,
      isWindowVisible: true,
      settings: {
        autoHide: false,
        autoHideDelay: 5000,
        showNotifications: true,
        theme: 'auto',
        position: 'center-top',
        autoHideAfterResponse: true,
        autoHideDelayAfterResponse: 10000,
      },
    };

    this.initializeEventListeners();
    this.setupIPCListeners();
    this.initializeState();
    this.loadState();
    this.makeDraggable();
  }

  initializeEventListeners() {
    // Listen button
    if (this.listenBtn) {
      this.listenBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleListening();
      });
    }

    // Question input
    if (this.questionInput) {
      this.questionInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitQuestion();
        }
      });

      this.questionInput.addEventListener('input', e => {
        this.handleQuestionInput(e.target.value);
      });
    }

    // Visibility toggle
    if (this.visibilityToggle) {
      this.visibilityToggle.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleWindowVisibility();
      });
    }

    // Screen share toggle button
    if (this.screenShareToggle) {
      this.screenShareToggle.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleScreenShareVisibility();
      });
    }

    // Settings button
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.openSettings();
      });
    }

    // Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.hide();
      });
    }

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

      // Ctrl/Cmd + , to open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        this.openSettings();
      }

      // Escape to hide response panel
      if (e.key === 'Escape') {
        this.hideResponsePanel();
      }
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      this.ensureVisibility();
    });

    // User interaction handlers for auto-hide
    this.container.addEventListener('mouseenter', () => {
      this.handleUserInteraction();
    });

    this.container.addEventListener('click', () => {
      this.handleUserInteraction();
    });

    this.container.addEventListener('keydown', () => {
      this.handleUserInteraction();
    });
  }

  setupIPCListeners() {
    // Listen for AI response updates from main process
    ipcRenderer.on('ai-response-update', (event, data) => {
      this.updateResponse(data.text, data.isComplete);
    });

    // Listen for new streaming AI token events
    ipcRenderer.on('ai-token-received', (event, data) => {
      // Only log in development mode
      if (
        process.argv.includes('--dev') ||
        process.env.NODE_ENV === 'development'
      ) {
        console.log('=== RENDERER RECEIVED AI-TOKEN-RECEIVED ===');
        console.log('Token:', data.token);
        console.log('Backend:', data.backend);
      }
      this.handleTokenReceived(data);
    });

    // Listen for AI generation completion
    ipcRenderer.on('ai-generation-completed', (event, data) => {
      // Only log in development mode
      if (
        process.argv.includes('--dev') ||
        process.env.NODE_ENV === 'development'
      ) {
        console.log('=== RENDERER RECEIVED AI-GENERATION-COMPLETED ===');
        console.log(
          'Full response length:',
          data.fullResponse ? data.fullResponse.length : 0
        );
      }
      this.handleGenerationCompleted(data);
    });

    // Listen for AI response completion (legacy)
    ipcRenderer.on('ai-response-completed', (event, data) => {
      console.log('=== RENDERER RECEIVED AI-RESPONSE-COMPLETED ===');
      console.log('Event data:', data);
      console.log('Renderer window ID:', window.location.href);
      console.log('Response text element exists:', !!this.responseText);
      console.log(
        'Current response text content:',
        this.responseText ? this.responseText.textContent : 'No element'
      );
      this.handleResponseCompleted(data);
    });

    // Listen for test message
    ipcRenderer.on('test-message', (event, data) => {
      console.log('Renderer received test message:', data);
    });

    // Listen for test response from main process
    ipcRenderer.on('test-response-from-main', (event, data) => {
      console.log('Renderer received test response from main:', data);
    });

    // Listen for backend errors
    ipcRenderer.on('backend-error', (event, error) => {
      this.handleBackendError(error);
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
      console.log('Renderer received clipboard-monitoring-started event');
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

    // Listen for display affinity updates
    ipcRenderer.on('display-affinity-updated', (event, data) => {
      console.log('=== SCREEN SHARING CONTROL UPDATE RECEIVED ===');
      console.log('Data:', data);

      if (data.status === 'success') {
        // Update button state to match the actual setting
        if (this.screenShareToggle) {
          if (data.enabled) {
            this.screenShareToggle.classList.add('active');
            this.screenShareToggle.classList.remove('inactive');
            this.screenShareToggle.title = 'Screen Sharing Control: Enabled';
          } else {
            this.screenShareToggle.classList.remove('active');
            this.screenShareToggle.classList.add('inactive');
            this.screenShareToggle.title = 'Screen Sharing Control: Disabled';
          }
        }

        // Show success message
        this.updateStatus('ready', data.message);
        console.log(
          '✅ Screen sharing control updated successfully:',
          data.message
        );
      } else {
        // Show error message
        this.updateStatus('error', 'Error');
        this.showError(data.message);
        console.error('❌ Screen sharing control update failed:', data.message);
      }
    });
  }

  // New control bar methods
  toggleListening() {
    this.state.isListening = !this.state.isListening;

    if (this.listenBtn) {
      if (this.state.isListening) {
        this.listenBtn.classList.add('active');
        this.listenBtn.querySelector('.control-text').textContent = 'Listen';
        this.updateStatus('ready', 'Listening');
      } else {
        this.listenBtn.classList.remove('active');
        this.listenBtn.querySelector('.control-text').textContent = 'Paused';
        this.updateStatus('ready', 'Paused');
      }
    }

    // Notify main process
    ipcRenderer.send('toggle-listening', this.state.isListening);
  }

  submitQuestion() {
    const question = this.questionInput.value.trim();
    if (!question) return;

    this.questionInput.value = '';
    this.showResponsePanel();
    this.updateStatus('processing', 'Processing...');

    // Send question to main process
    ipcRenderer.send('submit-question', {
      question: question,
      timestamp: Date.now(),
    });
  }

  handleQuestionInput(value) {
    // Handle real-time input changes if needed
    if (value.length > 0) {
      this.questionInput.classList.add('has-content');
    } else {
      this.questionInput.classList.remove('has-content');
    }
  }

  toggleWindowVisibility() {
    this.state.isWindowVisible = !this.state.isWindowVisible;

    if (this.visibilityToggle) {
      if (this.state.isWindowVisible) {
        this.visibilityToggle.classList.remove('hidden');
        this.container.style.opacity = '1';
        this.container.style.pointerEvents = 'auto';
      } else {
        this.visibilityToggle.classList.add('hidden');
        this.container.style.opacity = '0.3';
        this.container.style.pointerEvents = 'none';
      }
    }

    // Notify main process
    ipcRenderer.send('toggle-window-visibility', this.state.isWindowVisible);
  }

  openSettings() {
    console.log('Opening settings window...');
    // Send IPC message to main process to open settings
    ipcRenderer.send('open-settings-window');
  }

  toggleScreenShareVisibility() {
    console.log('=== TOGGLE SCREEN SHARING CONTROL REQUESTED ===');

    const isCurrentlyEnabled =
      this.screenShareToggle.classList.contains('active');
    const newState = !isCurrentlyEnabled;

    console.log('Current state:', isCurrentlyEnabled ? 'enabled' : 'disabled');
    console.log('New state:', newState ? 'enabled' : 'disabled');

    // Show loading state
    this.updateStatus('processing', 'Updating screen sharing control...');

    // Send IPC message to main process
    ipcRenderer.send('toggle-display-affinity', newState);

    console.log(
      'Screen sharing control toggle sent to main process:',
      newState ? 'enabled' : 'disabled'
    );
  }

  showResponsePanel() {
    if (this.responsePanel) {
      this.responsePanel.classList.remove('hidden');
    }
  }

  hideResponsePanel() {
    if (this.responsePanel) {
      this.responsePanel.classList.add('hidden');
    }
  }

  makeDraggable() {
    if (!this.controlBar) {
      console.log('Control bar not found, cannot make draggable');
      return;
    }

    console.log('Setting up dragging for control bar');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Make the entire control bar draggable
    this.controlBar.addEventListener('mousedown', e => {
      // Don't start dragging if clicking on interactive elements
      if (
        e.target.closest('.control-btn') ||
        e.target.closest('.question-input')
      ) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;

      // Visual feedback
      this.controlBar.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // Move the entire window
        this.container.style.transform = `translate(${currentX}px, ${currentY}px)`;

        // Also notify main process to move the actual window
        ipcRenderer.send('move-window', {
          x: currentX,
          y: currentY,
          deltaX: e.movementX,
          deltaY: e.movementY,
        });
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;

        // Reset cursors
        this.controlBar.style.cursor = 'grab';
        document.body.style.cursor = 'default';

        // Save position
        this.updateState({
          dragOffset: { x: xOffset, y: yOffset },
        });

        // Notify main process that dragging is complete
        ipcRenderer.send('window-drag-complete', {
          finalX: xOffset,
          finalY: yOffset,
        });
      }
    });

    // Also handle touch events for mobile
    this.controlBar.addEventListener('touchstart', e => {
      if (
        e.target.closest('.control-btn') ||
        e.target.closest('.question-input')
      ) {
        return;
      }

      const touch = e.touches[0];
      initialX = touch.clientX - xOffset;
      initialY = touch.clientY - yOffset;
      isDragging = true;
    });

    document.addEventListener('touchmove', e => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];

        currentX = touch.clientX - initialX;
        currentY = touch.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        this.container.style.transform = `translate(${currentX}px, ${currentY}px)`;

        ipcRenderer.send('move-window', {
          x: currentX,
          y: currentY,
          deltaX: touch.clientX - (initialX + xOffset),
          deltaY: touch.clientY - (initialY + yOffset),
        });
      }
    });

    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;

        this.updateState({
          dragOffset: { x: xOffset, y: yOffset },
        });

        ipcRenderer.send('window-drag-complete', {
          finalX: xOffset,
          finalY: yOffset,
        });
      }
    });
  }

  // Legacy methods (keeping for compatibility)
  setPosition(position) {
    const validPositions = [
      'center-top',
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
      'position-center-top',
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
      'center-top',
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

  toggleMinimize() {
    this.state.isMinimized = !this.state.isMinimized;

    if (this.state.isMinimized) {
      this.container.classList.add('minimized');
    } else {
      this.container.classList.remove('minimized');
    }
  }

  hide() {
    this.state.isVisible = false;
    this.container.classList.add('hidden');
  }

  show() {
    this.state.isVisible = true;
    this.container.classList.remove('hidden');
  }

  toggleVisibility() {
    if (this.state.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateStatus(status, text) {
    if (this.statusDot) {
      this.statusDot.className = `status-dot ${status}`;
    }

    if (this.statusText) {
      this.statusText.textContent = text;
    }
  }

  showLoading() {
    this.updateStatus('processing', 'Processing...');
  }

  hideLoading() {
    this.updateStatus('ready', 'Ready');
  }

  showError(message) {
    if (this.responseText) {
      this.responseText.textContent = `Error: ${message}`;
      this.responseText.classList.add('error');
    }
    this.updateStatus('error', 'Error');
  }

  clearError() {
    if (this.responseText) {
      this.responseText.classList.remove('error');
    }
  }

  copyResponse() {
    if (this.responseText && this.responseText.textContent) {
      navigator.clipboard.writeText(this.responseText.textContent);
    }
  }

  clearResponse() {
    if (this.responseText) {
      this.responseText.textContent = 'Ready for AI assistance';
      this.responseText.classList.remove('error', 'streaming');
    }
    this.hideResponsePanel();
  }

  handleUserInteraction() {
    // Reset auto-hide timer
    if (this.state.autoHideTimer) {
      clearTimeout(this.state.autoHideTimer);
      this.state.autoHideTimer = null;
    }
  }

  handleClipboardChange(changeEvent) {
    // Handle clipboard changes if listening is enabled
    if (this.state.isListening) {
      this.showResponsePanel();
      this.showLoading();
    }
  }

  handleTokenReceived(data) {
    // Only log in development mode
    if (
      process.argv.includes('--dev') ||
      process.env.NODE_ENV === 'development'
    ) {
      console.log('=== HANDLE TOKEN RECEIVED ===');
      console.log('Token received:', data.token);
      console.log('Response text element exists:', !!this.responseText);
      console.log(
        'Current response text content:',
        this.responseText ? this.responseText.textContent : 'No element'
      );
      console.log('Appending token to response text:', data.token);
      console.log(
        'Response text after appending:',
        this.responseText ? this.responseText.textContent : 'No element'
      );
    }

    if (this.responseText) {
      // Add streaming class for visual feedback
      this.responseText.classList.add('streaming');

      // Append the token
      this.responseText.textContent += data.token;

      // Auto-scroll to bottom
      this.responseText.scrollTop = this.responseText.scrollHeight;
    }
  }

  handleGenerationCompleted(data) {
    if (this.responseText) {
      // Remove streaming class
      this.responseText.classList.remove('streaming');

      // Update the full response
      this.responseText.textContent = data.fullResponse || data.response || '';

      // Auto-scroll to bottom
      this.responseText.scrollTop = this.responseText.scrollHeight;
    }

    this.hideLoading();
    this.updateStatus('ready', 'Ready');
  }

  handleResponseCompleted(data) {
    console.log('Response completed:', {
      backend: data.backend,
      model: data.model,
      contentType: data.contentType,
      response: data.response
        ? data.response.substring(0, 100) + '...'
        : 'No response',
    });

    this.hideLoading();
    this.updateStatus('ready', 'AI Ready');

    // Display the response in the UI
    if (data.response && this.responseText) {
      console.log(
        'Setting response text:',
        data.response.substring(0, 100) + '...'
      );
      console.log('Response text element exists:', !!this.responseText);
      console.log(
        'Current response text content:',
        this.responseText.textContent
      );
      this.responseText.textContent = data.response;
      console.log(
        'Response text content after setting:',
        this.responseText.textContent
      );

      // Auto-scroll to bottom for long responses
      this.responseText.scrollTop = this.responseText.scrollHeight;
    }

    // Update state
    this.updateState({
      isProcessing: false,
      lastResponse: data.response,
      currentBackend: data.backend,
    });

    // Store in clipboard history
    this.updateState({
      clipboardHistory: [
        ...this.state.clipboardHistory.slice(-9), // Keep last 10
        {
          type: data.contentType || 'text',
          response: data.response,
          timestamp: Date.now(),
        },
      ],
    });
  }

  handleBackendError(error) {
    console.error('Backend error:', error);
    this.hideLoading();
    this.showError(error.error || 'Backend error occurred');
  }

  updateResponse(text, isComplete = false) {
    if (this.responseText) {
      if (isComplete) {
        this.responseText.textContent = text;
        this.responseText.classList.remove('streaming');
      } else {
        this.responseText.textContent = text;
        this.responseText.classList.add('streaming');
      }

      // Auto-scroll to bottom
      this.responseText.scrollTop = this.responseText.scrollHeight;
    }
  }

  updateState(newState) {
    this.state = { ...this.state, ...newState };
  }

  initializeState() {
    // Initialize with default state
    this.setPosition(this.state.currentPosition);
    this.updateStatus('ready', 'Ready');
  }

  loadState() {
    // Load saved state if any
    // This could be expanded to load from localStorage or other storage
  }
}

// Initialize the UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (
    process.argv &&
    (process.argv.includes('--dev') || process.env.NODE_ENV === 'development')
  ) {
    console.log('AI Overlay Assistant UI initialized');
  }

  // Create the overlay UI instance
  window.overlayUI = new OverlayUI();
});
// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayUI;
}
