const { ipcRenderer } = require('electron');

class SettingsWindow {
  constructor() {
    this.currentSettings = {};
    this.initializeElements();
    this.initializeEventListeners();
    this.loadSettings();
    this.updateBackendStatus();
  }

  initializeElements() {
    // Backend elements
    this.backendOllama = document.getElementById('backend-ollama');
    this.backendGemini = document.getElementById('backend-gemini');
    this.modelNameInput = document.getElementById('model-name');
    this.apiKeySection = document.getElementById('api-key-section');
    this.apiKeyInput = document.getElementById('api-key');
    this.apiKeyStatus = document.getElementById('api-key-status');

    // Position elements
    this.positionInputs = {
      'center-top': document.getElementById('position-center-top'),
      'top-right': document.getElementById('position-top-right'),
      'top-left': document.getElementById('position-top-left'),
      'bottom-right': document.getElementById('position-bottom-right'),
      'bottom-left': document.getElementById('position-bottom-left'),
      'center-right': document.getElementById('position-center-right'),
      'center-left': document.getElementById('position-center-left'),
    };

    // Theme elements
    this.themeInputs = {
      auto: document.getElementById('theme-auto'),
      light: document.getElementById('theme-light'),
      dark: document.getElementById('theme-dark'),
    };

    // Auto-hide elements
    this.autoHideEnabled = document.getElementById('auto-hide-enabled');
    this.autoHideDelayGroup = document.getElementById('auto-hide-delay-group');
    this.autoHideDelay = document.getElementById('auto-hide-delay');
    this.autoHideAfterResponse = document.getElementById(
      'auto-hide-after-response'
    );
    this.autoHideDelayResponseGroup = document.getElementById(
      'auto-hide-delay-response-group'
    );
    this.autoHideDelayResponse = document.getElementById(
      'auto-hide-delay-response'
    );

    // Status elements
    this.connectionStatus = document.getElementById('connection-status');
    this.connectionText = document.getElementById('connection-text');
    this.backendStatus = document.getElementById('backend-status');

    // Action buttons
    this.testBackendBtn = document.getElementById('test-backend-btn');
    this.refreshStatusBtn = document.getElementById('refresh-status-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
  }

  initializeEventListeners() {
    // Backend selection
    this.backendOllama.addEventListener('change', () =>
      this.switchBackend('ollama')
    );
    this.backendGemini.addEventListener('change', () =>
      this.switchBackend('gemini')
    );

    // Model name input
    this.modelNameInput.addEventListener('input', e =>
      this.updateModelName(e.target.value)
    );

    // API key input
    this.apiKeyInput.addEventListener('input', e =>
      this.updateApiKey(e.target.value)
    );

    // Position inputs
    Object.values(this.positionInputs).forEach(input => {
      input.addEventListener('change', e =>
        this.updatePosition(e.target.value)
      );
    });

    // Theme inputs
    Object.values(this.themeInputs).forEach(input => {
      input.addEventListener('change', e => this.updateTheme(e.target.value));
    });

    // Auto-hide inputs
    this.autoHideEnabled.addEventListener('change', e =>
      this.updateAutoHideEnabled(e.target.checked)
    );
    this.autoHideDelay.addEventListener('input', e =>
      this.updateAutoHideDelay(parseInt(e.target.value) * 1000)
    );
    this.autoHideAfterResponse.addEventListener('change', e =>
      this.updateAutoHideAfterResponse(e.target.checked)
    );
    this.autoHideDelayResponse.addEventListener('input', e =>
      this.updateAutoHideDelayAfterResponse(parseInt(e.target.value) * 1000)
    );

    // Action buttons
    this.testBackendBtn.addEventListener('click', () => this.testBackend());
    this.refreshStatusBtn.addEventListener('click', () =>
      this.refreshBackendStatus()
    );
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.cancelBtn.addEventListener('click', () => this.closeWindow());

    // IPC listeners
    ipcRenderer.on('settings-loaded', (event, settings) => {
      this.currentSettings = settings;
      this.updateUI();
    });

    ipcRenderer.on('backend-status-updated', (event, status) => {
      this.updateBackendStatusUI(status);
    });

    ipcRenderer.on('api-key-status-updated', (event, status) => {
      this.updateApiKeyStatusUI(status);
    });
  }

  async loadSettings() {
    try {
      // Request settings from main process
      ipcRenderer.send('request-settings');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  updateUI() {
    // Update backend selection
    if (this.currentSettings.backend === 'ollama') {
      this.backendOllama.checked = true;
      this.apiKeySection.style.display = 'none';
    } else if (this.currentSettings.backend === 'gemini') {
      this.backendGemini.checked = true;
      this.apiKeySection.style.display = 'block';
    }

    // Update model name
    if (this.currentSettings.modelName) {
      this.modelNameInput.value = this.currentSettings.modelName;
    }

    // Update API key
    if (this.currentSettings.geminiApiKey) {
      this.apiKeyInput.value = this.currentSettings.geminiApiKey;
    }

    // Update position
    if (
      this.currentSettings.position &&
      this.positionInputs[this.currentSettings.position]
    ) {
      this.positionInputs[this.currentSettings.position].checked = true;
    }

    // Update theme
    if (
      this.currentSettings.theme &&
      this.themeInputs[this.currentSettings.theme]
    ) {
      this.themeInputs[this.currentSettings.theme].checked = true;
    }

    // Update auto-hide settings
    if (this.currentSettings.autoHide !== undefined) {
      this.autoHideEnabled.checked = this.currentSettings.autoHide;
      this.autoHideDelayGroup.style.display = this.currentSettings.autoHide
        ? 'block'
        : 'none';
    }

    if (this.currentSettings.autoHideDelay) {
      this.autoHideDelay.value = Math.round(
        this.currentSettings.autoHideDelay / 1000
      );
    }

    if (this.currentSettings.autoHideAfterResponse !== undefined) {
      this.autoHideAfterResponse.checked =
        this.currentSettings.autoHideAfterResponse;
      this.autoHideDelayResponseGroup.style.display = this.currentSettings
        .autoHideAfterResponse
        ? 'block'
        : 'none';
    }

    if (this.currentSettings.autoHideDelayAfterResponse) {
      this.autoHideDelayResponse.value = Math.round(
        this.currentSettings.autoHideDelayAfterResponse / 1000
      );
    }
  }

  switchBackend(backend) {
    this.currentSettings.backend = backend;

    if (backend === 'gemini') {
      this.apiKeySection.style.display = 'block';
    } else {
      this.apiKeySection.style.display = 'none';
    }

    // Update backend status
    this.updateBackendStatus();
  }

  updateModelName(modelName) {
    this.currentSettings.modelName = modelName;
  }

  updateApiKey(apiKey) {
    this.currentSettings.geminiApiKey = apiKey;
    this.validateApiKey();
  }

  updatePosition(position) {
    this.currentSettings.position = position;
  }

  updateTheme(theme) {
    this.currentSettings.theme = theme;
  }

  updateAutoHideEnabled(enabled) {
    this.currentSettings.autoHide = enabled;
    this.autoHideDelayGroup.style.display = enabled ? 'block' : 'none';
  }

  updateAutoHideDelay(delayMs) {
    this.currentSettings.autoHideDelay = delayMs;
  }

  updateAutoHideAfterResponse(enabled) {
    this.currentSettings.autoHideAfterResponse = enabled;
    this.autoHideDelayResponseGroup.style.display = enabled ? 'block' : 'none';
  }

  updateAutoHideDelayAfterResponse(delayMs) {
    this.currentSettings.autoHideDelayAfterResponse = delayMs;
  }

  async updateBackendStatus() {
    try {
      if (this.currentSettings.backend === 'ollama') {
        const status = await ipcRenderer.invoke('ollama-get-status');
        this.updateBackendStatusUI(status);
      } else if (this.currentSettings.backend === 'gemini') {
        const status = await ipcRenderer.invoke('gemini-get-status');
        this.updateBackendStatusUI(status);
      }
    } catch (error) {
      console.error('Failed to get backend status:', error);
      this.updateBackendStatusUI({ connected: false, error: error.message });
    }
  }

  updateBackendStatusUI(status) {
    const statusDot = this.backendStatus.querySelector('.status-dot');
    const statusText = this.backendStatus.querySelector('span:last-child');

    if (status.connected) {
      statusDot.className = 'status-dot';
      statusText.textContent = `${this.currentSettings.backend} connected`;
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent =
        status.error || `${this.currentSettings.backend} disconnected`;
    }
  }

  async validateApiKey() {
    if (!this.currentSettings.geminiApiKey) {
      this.updateApiKeyStatusUI({
        valid: false,
        message: 'API key not configured',
      });
      return;
    }

    try {
      const status = await ipcRenderer.invoke('gemini-health-check');
      this.updateApiKeyStatusUI(status);
    } catch (error) {
      this.updateApiKeyStatusUI({ valid: false, error: error.message });
    }
  }

  updateApiKeyStatusUI(status) {
    const statusDot = this.apiKeyStatus.querySelector('.status-dot');
    const statusText = this.apiKeyStatus.querySelector('span:last-child');

    if (status.valid) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'API key valid';
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent =
        status.error || status.message || 'API key invalid';
    }
  }

  async testBackend() {
    this.testBackendBtn.disabled = true;
    this.testBackendBtn.textContent = 'Testing...';

    try {
      if (this.currentSettings.backend === 'ollama') {
        await ipcRenderer.invoke('ollama-health-check');
      } else if (this.currentSettings.backend === 'gemini') {
        await ipcRenderer.invoke('gemini-health-check');
      }

      this.showSuccessMessage('Backend connection test successful!');
    } catch (error) {
      this.showErrorMessage(`Backend connection test failed: ${error.message}`);
    } finally {
      this.testBackendBtn.disabled = false;
      this.testBackendBtn.textContent = 'Test Connection';
    }
  }

  async refreshBackendStatus() {
    this.refreshStatusBtn.disabled = true;
    this.refreshStatusBtn.textContent = 'Refreshing...';

    try {
      await this.updateBackendStatus();
      this.showSuccessMessage('Status refreshed!');
    } catch (error) {
      this.showErrorMessage(`Failed to refresh status: ${error.message}`);
    } finally {
      this.refreshStatusBtn.disabled = false;
      this.refreshStatusBtn.textContent = 'Refresh Status';
    }
  }

  async saveSettings() {
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Saving...';

    try {
      // Send settings to main process
      ipcRenderer.send('save-settings', this.currentSettings);

      this.showSuccessMessage('Settings saved successfully!');

      // Close window after a short delay
      setTimeout(() => {
        this.closeWindow();
      }, 1000);
    } catch (error) {
      this.showErrorMessage(`Failed to save settings: ${error.message}`);
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Save Settings';
    }
  }

  closeWindow() {
    ipcRenderer.send('close-settings-window');
  }

  showSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      document.body.removeChild(successDiv);
    }, 3000);
  }

  showErrorMessage(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 3000);
  }
}

// Initialize settings window when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsWindow();
});
