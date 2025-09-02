const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const ClipboardMonitor = require('./services/clipboardMonitor');
const OllamaService = require('./services/ollamaService');
const SecureStorageService = require('./services/secureStorage');

class AIOverlayAssistant {
  constructor() {
    this.mainWindow = null;
    this.isOverlayVisible = true;
    this.clipboardMonitor = null;
    this.ollamaService = null;
    this.geminiService = null;
    this.secureStorage = null;
    this.activeBackend = 'ollama'; // Track the currently active backend
    this.backendConfig = {
      backend: 'ollama',
      modelName: 'llama3.2',
      geminiApiKey: '',
    };

    this.initializeApp();
  }

  initializeApp() {
    // App event listeners
    app.whenReady().then(async () => {
      this.initializeSecureStorage();
      this.createOverlayWindow();
      this.initializeClipboardMonitor();
      await this.initializeOllamaService();
      await this.initializeGeminiService();
      await this.loadBackendConfiguration(); // Load saved backend configuration
      this.registerGlobalShortcut();
      this.setupIPCHandlers();
      this.setupHotkeyIPCHandlers();
      this.setupClipboardIPCHandlers();
      this.setupOllamaIPCHandlers();
      this.setupGeminiIPCHandlers();
      this.setupSecureStorageIPCHandlers();
      this.setupBackendSwitchingIPCHandlers(); // Add backend switching IPC handlers
      this.setupScreenChangeHandlers();
      this.setupLifecycleHandlers();
      this.setupAppLifecycleHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createOverlayWindow();
      }
    });

    app.on('will-quit', () => {
      this.cleanup();
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  createOverlayWindow() {
    // Get screen dimensions for intelligent positioning
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    // Calculate optimal window size and position
    const windowWidth = Math.min(400, screenWidth * 0.3); // Max 30% of screen width
    const windowHeight = Math.min(200, screenHeight * 0.2); // Max 20% of screen height

    // Position in top-right corner with margin
    const margin = 20;
    const x = screenWidth - windowWidth - margin;
    const y = margin;

    // Platform-specific window options
    const windowOptions = {
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false, // Prevent focus stealing
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
      },
      show: false, // Don't show until ready
      // Enhanced transparency settings
      hasShadow: false, // Remove window shadow for cleaner look
    };

    // Platform-specific adjustments
    if (process.platform === 'win32') {
      // Windows-specific settings
      windowOptions.thickFrame = false; // Remove thick frame
      windowOptions.titleBarStyle = 'hidden'; // Hide title bar
      windowOptions.autoHideMenuBar = true; // Hide menu bar
    } else if (process.platform === 'darwin') {
      // macOS-specific settings
      windowOptions.titleBarStyle = 'hiddenInset'; // Hidden title bar with inset
      windowOptions.vibrancy = 'under-window'; // Add vibrancy effect
    } else if (process.platform === 'linux') {
      // Linux-specific settings
      windowOptions.icon = path.join(__dirname, 'assets', 'icon.png'); // Set icon
    }

    // Create the overlay window with platform-specific settings
    this.mainWindow = new BrowserWindow(windowOptions);

    // Load the overlay HTML
    this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();

      // Platform-specific visibility and focus settings
      this.applyPlatformSpecificSettings();

      // Configure mouse event behavior
      this.setupMouseEventHandling();

      console.log('AI Overlay Assistant window created and shown');
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Prevent window from being closed by user (will be hidden instead)
    this.mainWindow.on('close', event => {
      if (!app.isQuiting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Handle focus events to prevent focus stealing
    this.mainWindow.on('focus', () => {
      // Immediately blur the window to prevent focus stealing
      this.mainWindow.blur();
    });

    // Handle window activation
    this.mainWindow.on('show', () => {
      // Ensure window doesn't steal focus when shown
      setTimeout(() => {
        this.mainWindow.blur();
      }, 100);
    });

    // Development: Open DevTools in development mode
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  registerGlobalShortcut() {
    // Platform-specific shortcut configuration
    const shortcutConfig = this.getPlatformShortcutConfig();

    // Register global shortcut for toggling overlay visibility
    const ret = globalShortcut.register(shortcutConfig.accelerator, () => {
      console.log(`Global shortcut triggered: ${shortcutConfig.name}`);
      this.toggleOverlayVisibility();
    });

    if (!ret) {
      console.error(
        `Failed to register global shortcut: ${shortcutConfig.name}`
      );
      this.handleShortcutRegistrationFailure(shortcutConfig);
    } else {
      console.log(
        `Global shortcut registered successfully: ${shortcutConfig.name}`
      );
      this.registeredShortcut = shortcutConfig.accelerator;
    }
  }

  getPlatformShortcutConfig() {
    const platform = process.platform;

    switch (platform) {
      case 'darwin':
        return {
          accelerator: 'Command+Shift+Space',
          name: 'Cmd+Shift+Space',
          platform: 'macOS',
        };
      case 'win32':
        return {
          accelerator: 'Ctrl+Shift+Space',
          name: 'Ctrl+Shift+Space',
          platform: 'Windows',
        };
      case 'linux':
        return {
          accelerator: 'Ctrl+Shift+Space',
          name: 'Ctrl+Shift+Space',
          platform: 'Linux',
        };
      default:
        return {
          accelerator: 'CommandOrControl+Shift+Space',
          name: 'Cmd/Ctrl+Shift+Space',
          platform: 'Cross-platform',
        };
    }
  }

  handleShortcutRegistrationFailure(shortcutConfig) {
    console.error(
      `Shortcut registration failed for ${shortcutConfig.platform}`
    );

    // Try alternative shortcuts if primary fails
    const alternatives = this.getAlternativeShortcuts(shortcutConfig.platform);

    for (const alt of alternatives) {
      const ret = globalShortcut.register(alt.accelerator, () => {
        console.log(`Alternative shortcut triggered: ${alt.name}`);
        this.toggleOverlayVisibility();
      });

      if (ret) {
        console.log(`Alternative shortcut registered: ${alt.name}`);
        this.registeredShortcut = alt.accelerator;
        return;
      }
    }

    console.error('All shortcut registration attempts failed');
  }

  getAlternativeShortcuts(platform) {
    if (platform === 'macOS') {
      return [
        { accelerator: 'Command+Shift+A', name: 'Cmd+Shift+A' },
        { accelerator: 'Command+Shift+O', name: 'Cmd+Shift+O' },
      ];
    } else {
      return [
        { accelerator: 'Ctrl+Shift+A', name: 'Ctrl+Shift+A' },
        { accelerator: 'Ctrl+Shift+O', name: 'Ctrl+Shift+O' },
      ];
    }
  }

  setupIPCHandlers() {
    // Handle IPC messages from renderer
    ipcMain.on('overlay-minimized', (event, isMinimized) => {
      console.log('Overlay minimized:', isMinimized);
    });

    ipcMain.on('overlay-closed', () => {
      console.log('Overlay closed by user');
      this.mainWindow.hide();
    });
  }

  setupScreenChangeHandlers() {
    const { screen } = require('electron');

    // Handle display changes (e.g., external monitor connected/disconnected)
    screen.on('display-added', () => {
      this.repositionWindow();
    });

    screen.on('display-removed', () => {
      this.repositionWindow();
    });

    screen.on('display-metrics-changed', () => {
      this.repositionWindow();
    });
  }

  repositionWindow() {
    if (this.mainWindow) {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } =
        primaryDisplay.workAreaSize;

      const windowWidth = Math.min(400, screenWidth * 0.3);
      const windowHeight = Math.min(200, screenHeight * 0.2);

      const margin = 20;
      const x = screenWidth - windowWidth - margin;
      const y = margin;

      this.mainWindow.setBounds({
        x,
        y,
        width: windowWidth,
        height: windowHeight,
      });
      console.log('Overlay window repositioned due to screen change');
    }
  }

  setupMouseEventHandling() {
    if (!this.mainWindow) return;

    // Track mouse position for hover effects
    let isHovering = false;
    let hoverTimeout = null;

    // Handle mouse enter/leave events
    this.mainWindow.webContents.on('dom-ready', () => {
      this.mainWindow.webContents.executeJavaScript(`
        const overlay = document.getElementById('overlay-container');
        let isHovering = false;
        let hoverTimeout = null;

        overlay.addEventListener('mouseenter', () => {
          isHovering = true;
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
          }
          // Send mouse enter event to main process
          require('electron').ipcRenderer.send('overlay-mouse-enter');
        });

        overlay.addEventListener('mouseleave', () => {
          isHovering = false;
          // Delay hiding to prevent flickering
          hoverTimeout = setTimeout(() => {
            if (!isHovering) {
              require('electron').ipcRenderer.send('overlay-mouse-leave');
            }
          }, 100);
        });
      `);
    });

    // Handle mouse events from renderer
    ipcMain.on('overlay-mouse-enter', () => {
      console.log('Mouse entered overlay');
      // Could implement hover effects here
    });

    ipcMain.on('overlay-mouse-leave', () => {
      console.log('Mouse left overlay');
      // Could implement auto-hide or other effects here
    });
  }

  applyPlatformSpecificSettings() {
    if (!this.mainWindow) return;

    // macOS-specific settings
    if (process.platform === 'darwin') {
      // Set window to be visible on all workspaces including fullscreen apps
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });

      // Use higher always-on-top level for better overlay persistence
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');

      console.log('Applied macOS-specific overlay settings');
    }
    // Windows-specific settings
    else if (process.platform === 'win32') {
      // Use floating level for Windows (less intrusive than screen-saver)
      this.mainWindow.setAlwaysOnTop(true, 'floating');

      // Ensure DWM composition is enabled for transparency
      console.log('Applied Windows-specific overlay settings');
    }
    // Linux-specific settings
    else if (process.platform === 'linux') {
      // Use normal level for Linux
      this.mainWindow.setAlwaysOnTop(true, 'normal');

      console.log('Applied Linux-specific overlay settings');
    }
  }

  setupLifecycleHandlers() {
    if (!this.mainWindow) return;

    // Track window state
    this.windowState = {
      isVisible: true,
      isMinimized: false,
      isDestroyed: false,
    };

    // Window lifecycle events
    this.mainWindow.on('closed', () => {
      this.windowState.isDestroyed = true;
      this.mainWindow = null;
      console.log('Overlay window closed and cleaned up');
    });

    this.mainWindow.on('hide', () => {
      this.windowState.isVisible = false;
      console.log('Overlay window hidden');
    });

    this.mainWindow.on('show', () => {
      this.windowState.isVisible = true;
      console.log('Overlay window shown');
    });

    this.mainWindow.on('minimize', () => {
      this.windowState.isMinimized = true;
      console.log('Overlay window minimized');
    });

    this.mainWindow.on('restore', () => {
      this.windowState.isMinimized = false;
      console.log('Overlay window restored');
    });
  }

  cleanup() {
    console.log('Cleaning up AI Overlay Assistant resources...');

    // Stop clipboard monitoring
    if (this.clipboardMonitor) {
      try {
        this.clipboardMonitor.stopMonitoring();
        console.log('Clipboard monitoring stopped during cleanup');
      } catch (error) {
        console.error('Error stopping clipboard monitoring:', error);
      }
      this.clipboardMonitor = null;
    }

    // Clean up Ollama service
    if (this.ollamaService) {
      try {
        // Remove all event listeners
        this.ollamaService.removeAllListeners();
        console.log('Ollama service cleaned up');
      } catch (error) {
        console.error('Error cleaning up Ollama service:', error);
      }
      this.ollamaService = null;
    }

    // Clean up secure storage service
    if (this.secureStorage) {
      try {
        // Remove all event listeners
        this.secureStorage.removeAllListeners();
        console.log('Secure storage service cleaned up');
      } catch (error) {
        console.error('Error cleaning up secure storage service:', error);
      }
      this.secureStorage = null;
    }

    // Clean up Gemini service
    if (this.geminiService) {
      try {
        // Remove all event listeners
        this.geminiService.removeAllListeners();
        console.log('Gemini service cleaned up');
      } catch (error) {
        console.error('Error cleaning up Gemini service:', error);
      }
      this.geminiService = null;
    }

    // Unregister specific registered shortcut
    if (this.registeredShortcut) {
      const unregistered = globalShortcut.unregister(this.registeredShortcut);
      if (unregistered) {
        console.log(`Unregistered shortcut: ${this.registeredShortcut}`);
      }
      this.registeredShortcut = null;
    }

    // Unregister all shortcuts as safety measure
    globalShortcut.unregisterAll();

    // Close window if it exists
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
    }

    // Clear any timeouts or intervals
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    console.log('Cleanup completed');
  }

  toggleOverlayVisibility() {
    console.log('Toggle overlay visibility requested');

    // Validate window integrity first
    if (!this.validateWindowIntegrity()) {
      console.log('Window integrity check failed, recreating window');
      this.createOverlayWindow();
      return;
    }

    try {
      const wasVisible = this.mainWindow.isVisible();

      if (wasVisible) {
        // Hide the overlay
        this.mainWindow.hide();
        this.isOverlayVisible = false;
        console.log('Overlay hidden');

        // Update window state
        if (this.windowState) {
          this.windowState.isVisible = false;
        }
      } else {
        // Show the overlay
        this.mainWindow.show();
        this.isOverlayVisible = true;
        console.log('Overlay shown');

        // Ensure window stays on top after showing
        this.mainWindow.setAlwaysOnTop(true);

        // Update window state
        if (this.windowState) {
          this.windowState.isVisible = true;
        }
      }

      // Send toggle event to renderer with state information
      this.mainWindow.webContents.send('toggle-overlay', {
        isVisible: this.isOverlayVisible,
        wasVisible: wasVisible,
      });

      // Provide user feedback (optional - could be visual or audio)
      this.provideToggleFeedback(wasVisible);
    } catch (error) {
      console.error('Error toggling overlay visibility:', error);

      // Attempt to recover by recreating the window
      try {
        this.createOverlayWindow();
      } catch (recoveryError) {
        console.error('Failed to recover from toggle error:', recoveryError);
      }
    }
  }

  provideToggleFeedback(wasVisible) {
    // Optional: Provide visual or audio feedback for toggle
    // This could be a brief notification, sound, or visual indicator

    const action = wasVisible ? 'hidden' : 'shown';
    console.log(`Overlay ${action} successfully`);

    // Could add visual feedback here (e.g., brief notification)
    // or audio feedback for accessibility
  }

  setupAppLifecycleHandlers() {
    // Handle app suspension and resumption
    app.on('suspend', () => {
      console.log('App suspended - unregistering global shortcuts');
      this.unregisterGlobalShortcuts();
    });

    app.on('resume', () => {
      console.log('App resumed - re-registering global shortcuts');
      this.registerGlobalShortcut();
    });

    // Handle app focus changes
    app.on('browser-window-blur', () => {
      console.log('App window lost focus');
    });

    app.on('browser-window-focus', () => {
      console.log('App window gained focus');
    });

    // Handle second instance launch (prevent multiple instances)
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      console.log('Another instance is already running, quitting...');
      app.quit();
      return;
    }

    app.on('second-instance', (event, commandLine, workingDirectory) => {
      console.log('Second instance attempted to launch');

      // Focus existing window if it exists
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.focus();
      }
    });
  }

  unregisterGlobalShortcuts() {
    if (this.registeredShortcut) {
      const unregistered = globalShortcut.unregister(this.registeredShortcut);
      if (unregistered) {
        console.log(
          `Unregistered shortcut during suspend: ${this.registeredShortcut}`
        );
      }
    }

    // Also unregister all as safety measure
    globalShortcut.unregisterAll();
  }

  initializeClipboardMonitor() {
    try {
      this.clipboardMonitor = new ClipboardMonitor();

      // Set up clipboard monitor event listeners
      this.setupClipboardMonitorEvents();

      // Start monitoring with default interval
      const started = this.clipboardMonitor.startMonitoring(1000);

      if (started) {
        console.log('Clipboard monitoring initialized successfully');
      } else {
        console.error('Failed to initialize clipboard monitoring');
      }
    } catch (error) {
      console.error('Error initializing clipboard monitor:', error);
    }
  }

  initializeSecureStorage() {
    try {
      this.secureStorage = new SecureStorageService();

      // Set up secure storage event listeners
      this.setupSecureStorageEvents();

      console.log('Secure storage service initialized successfully');
      console.log('Storage status:', this.secureStorage.getStatus());
    } catch (error) {
      console.error('Error initializing secure storage service:', error);
    }
  }

  async initializeOllamaService() {
    try {
      this.ollamaService = new OllamaService();

      // Set up Ollama service event listeners
      this.setupOllamaServiceEvents();

      // Initialize the service
      const initialized = await this.ollamaService.initialize();

      if (initialized) {
        console.log('Ollama service initialized successfully');
        console.log(
          'Available models:',
          this.ollamaService.getAvailableModels().map(m => m.name)
        );
        console.log('Current model:', this.ollamaService.getCurrentModel());
      } else {
        console.error('Failed to initialize Ollama service');
      }
    } catch (error) {
      console.error('Error initializing Ollama service:', error);
    }
  }

  async initializeGeminiService() {
    try {
      // Create Gemini service with secure storage
      const GeminiService = require('./services/geminiService');
      this.geminiService = new GeminiService(this.secureStorage);

      // Set up Gemini service event listeners
      this.setupGeminiServiceEvents();

      // Initialize the service
      const initialized = await this.geminiService.initialize();

      if (initialized) {
        console.log('Gemini service initialized successfully');
        console.log('Current model:', this.geminiService.currentModel);
        console.log('Using secure storage:', !!this.secureStorage);
      } else {
        console.error('Failed to initialize Gemini service');
      }
    } catch (error) {
      console.error('Error initializing Gemini service:', error);
    }
  }

  async loadBackendConfiguration() {
    try {
      const config = await this.secureStorage.retrieveBackendConfig();
      if (config) {
        this.backendConfig = config;
        this.activeBackend = config.backend;
        console.log('Loaded backend configuration:', this.backendConfig);
      } else {
        console.log('No backend configuration found, using default.');
      }
    } catch (error) {
      console.error('Error loading backend configuration:', error);
    }
  }

  setupClipboardMonitorEvents() {
    if (!this.clipboardMonitor) return;

    // Monitor lifecycle events
    this.clipboardMonitor.on('monitoring-started', data => {
      console.log('Clipboard monitoring started:', data);
      this.sendToRenderer('clipboard-monitoring-started', data);
    });

    this.clipboardMonitor.on('monitoring-stopped', data => {
      console.log('Clipboard monitoring stopped:', data);
      this.sendToRenderer('clipboard-monitoring-stopped', data);
    });

    this.clipboardMonitor.on('monitoring-paused', data => {
      console.log('Clipboard monitoring paused:', data);
      this.sendToRenderer('clipboard-monitoring-paused', data);
    });

    this.clipboardMonitor.on('monitoring-resumed', data => {
      console.log('Clipboard monitoring resumed:', data);
      this.sendToRenderer('clipboard-monitoring-resumed', data);
    });

    // Monitor clipboard changes
    this.clipboardMonitor.on('clipboard-changed', changeEvent => {
      console.log('Clipboard change detected:', {
        type: changeEvent.type,
        length: changeEvent.length,
        isSignificant: changeEvent.isSignificant,
      });

      // Send to renderer for UI updates
      this.sendToRenderer('clipboard-changed', changeEvent);

      // Trigger AI processing with Ollama
      this.handleClipboardChange(changeEvent);
    });

    // Monitor errors
    this.clipboardMonitor.on('error', error => {
      console.error('Clipboard monitor error:', error);
      this.sendToRenderer('clipboard-error', error);
    });
  }

  setupSecureStorageEvents() {
    if (!this.secureStorage) return;

    // Service lifecycle events
    this.secureStorage.on('initialized', data => {
      console.log('Secure storage service initialized:', data);
      this.sendToRenderer('secure-storage-initialized', data);
    });

    // API key events
    this.secureStorage.on('api-key-stored', data => {
      console.log('API key stored:', data);
      this.sendToRenderer('api-key-stored', data);
    });

    this.secureStorage.on('api-key-retrieved', data => {
      console.log('API key retrieved:', data);
      this.sendToRenderer('api-key-retrieved', data);
    });

    this.secureStorage.on('api-key-deleted', data => {
      console.log('API key deleted:', data);
      this.sendToRenderer('api-key-deleted', data);
    });

    // Configuration events
    this.secureStorage.on('backend-config-stored', data => {
      console.log('Backend configuration stored:', data);
      this.sendToRenderer('backend-config-stored', data);
    });

    this.secureStorage.on('backend-config-retrieved', data => {
      console.log('Backend configuration retrieved:', data);
      this.sendToRenderer('backend-config-retrieved', data);
    });

    // Security assessment events
    this.secureStorage.on('security-assessment', data => {
      console.log('Security assessment:', data);
      this.sendToRenderer('security-assessment', data);
    });

    // Security warning events
    this.secureStorage.on('security-warning', data => {
      console.warn('Security warning:', data);
      this.sendToRenderer('security-warning', data);
    });

    // Migration events
    this.secureStorage.on('api-key-migrated', data => {
      console.log('API key migrated:', data);
      this.sendToRenderer('api-key-migrated', data);
    });

    this.secureStorage.on('api-key-exported', data => {
      console.log('API key exported:', data);
      this.sendToRenderer('api-key-exported', data);
    });

    this.secureStorage.on('api-key-imported', data => {
      console.log('API key imported:', data);
      this.sendToRenderer('api-key-imported', data);
    });

    // Error events
    this.secureStorage.on('error', error => {
      console.error('Secure storage service error:', error);
      this.sendToRenderer('secure-storage-error', error);
    });
  }

  setupGeminiServiceEvents() {
    if (!this.geminiService) return;

    // Service lifecycle events
    this.geminiService.on('initialized', data => {
      console.log('Gemini service initialized:', data);
      this.sendToRenderer('gemini-initialized', data);
    });

    this.geminiService.on('connection-checked', data => {
      console.log('Gemini connection checked:', data);
      this.sendToRenderer('gemini-connection-checked', data);
    });

    this.geminiService.on('api-key-updated', data => {
      console.log('Gemini API key updated:', data);
      this.sendToRenderer('gemini-api-key-updated', data);
    });

    // Generation events
    this.geminiService.on('generation-started', data => {
      console.log('Gemini generation started:', data);
      this.sendToRenderer('gemini-generation-started', data);
    });

    this.geminiService.on('token-received', data => {
      this.sendToRenderer('gemini-token-received', data);
    });

    this.geminiService.on('generation-completed', data => {
      console.log('Gemini generation completed:', data);
      this.sendToRenderer('gemini-generation-completed', data);
    });

    // Error events
    this.geminiService.on('error', error => {
      console.error('Gemini service error:', error);
      this.sendToRenderer('gemini-error', error);
    });
  }

  setupOllamaServiceEvents() {
    if (!this.ollamaService) return;

    // Service lifecycle events
    this.ollamaService.on('initialized', data => {
      console.log('Ollama service initialized:', data);
      this.sendToRenderer('ollama-initialized', data);
    });

    this.ollamaService.on('connection-checked', data => {
      console.log('Ollama connection checked:', data);
      this.sendToRenderer('ollama-connection-checked', data);
    });

    this.ollamaService.on('models-loaded', data => {
      console.log('Ollama models loaded:', data);
      this.sendToRenderer('ollama-models-loaded', data);
    });

    this.ollamaService.on('model-changed', data => {
      console.log('Ollama model changed:', data);
      this.sendToRenderer('ollama-model-changed', data);
    });

    // Generation events
    this.ollamaService.on('generation-started', data => {
      console.log('Ollama generation started:', data);
      this.sendToRenderer('ollama-generation-started', data);
    });

    this.ollamaService.on('token-received', data => {
      this.sendToRenderer('ollama-token-received', data);
    });

    this.ollamaService.on('generation-completed', data => {
      console.log('Ollama generation completed:', data);
      this.sendToRenderer('ollama-generation-completed', data);
    });

    // Error events
    this.ollamaService.on('error', error => {
      console.error('Ollama service error:', error);
      this.sendToRenderer('ollama-error', error);
    });
  }

  async handleClipboardChange(changeEvent) {
    // Only process significant changes
    if (!changeEvent.isSignificant) {
      console.log('Skipping insignificant clipboard change');
      return;
    }

    // Only process non-empty content
    if (changeEvent.isEmpty) {
      console.log('Skipping empty clipboard content');
      return;
    }

    if (!this.ollamaService || !this.ollamaService.isConnected) {
      console.log('Ollama service not available for AI processing');
      this.sendToRenderer('ollama-error', {
        type: 'service-not-connected',
        error: 'Ollama service is not connected',
        timestamp: Date.now(),
      });
      return;
    }

    console.log('Processing clipboard content with Ollama:', {
      type: changeEvent.type,
      length: changeEvent.length,
      content: changeEvent.newValue.substring(0, 100) + '...',
    });

    try {
      // Create a prompt based on clipboard content
      const prompt = this.createPromptFromClipboard(changeEvent);

      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Generated prompt is empty');
      }

      console.log('Generated prompt:', prompt.substring(0, 200) + '...');

      // Generate response using Ollama with enhanced options
      const result = await this.ollamaService.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 500,
        stream: true,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
      });

      console.log('AI response generated successfully');

      // Store the response in application state for potential reuse
      this.lastGeneratedResponse = {
        prompt: prompt,
        response: result,
        timestamp: Date.now(),
        contentType: changeEvent.type,
      };
    } catch (error) {
      console.error('Failed to generate AI response:', error);

      // Enhanced error reporting with more context
      const errorData = {
        type: this.getErrorType(error),
        error: error.message,
        timestamp: Date.now(),
        contentType: changeEvent.type,
        contentLength: changeEvent.length,
      };

      this.sendToRenderer('ollama-error', errorData);
    }
  }

  getErrorType(error) {
    if (error.message.includes('not connected')) return 'service-not-connected';
    if (error.message.includes('Empty prompt')) return 'invalid-prompt';
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('model not found')) return 'model-not-found';
    if (error.message.includes('HTTP 500')) return 'server-error';
    return 'generation-failed';
  }

  createPromptFromClipboard(changeEvent) {
    const content = changeEvent.newValue;
    const contentType = changeEvent.type;

    switch (contentType) {
      case 'code':
        return `Please analyze this code and provide a brief explanation or suggestions for improvement:\n\n${content}`;
      case 'url':
        return `This appears to be a URL. Please provide a brief description of what this link might contain:\n\n${content}`;
      case 'email':
        return `This appears to be an email address. Please provide a brief analysis:\n\n${content}`;
      case 'text':
      default:
        return `Please provide a brief analysis or summary of this text:\n\n${content}`;
    }
  }

  sendToRenderer(event, data) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  getWindowState() {
    return {
      ...this.windowState,
      isDestroyed: this.mainWindow ? this.mainWindow.isDestroyed() : true,
      isVisible: this.mainWindow ? this.mainWindow.isVisible() : false,
    };
  }

  validateWindowIntegrity() {
    if (!this.mainWindow) {
      console.log('Window integrity check: No window exists');
      return false;
    }

    if (this.mainWindow.isDestroyed()) {
      console.log('Window integrity check: Window is destroyed');
      return false;
    }

    console.log('Window integrity check: Window is healthy');
    return true;
  }

  // Method to send AI response updates to the overlay
  sendAIResponse(text, isComplete = false) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('ai-response-update', {
        text: text,
        isComplete: isComplete,
      });
    }
  }

  // Method to send error messages to the overlay
  sendErrorMessage(message) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('error-message', {
        message: message,
      });
    }
  }

  // Public methods for hotkey management
  getRegisteredShortcut() {
    return this.registeredShortcut || null;
  }

  isShortcutRegistered() {
    return (
      this.registeredShortcut !== null && this.registeredShortcut !== undefined
    );
  }

  changeHotkey(newAccelerator) {
    console.log(
      `Attempting to change hotkey from ${this.registeredShortcut} to ${newAccelerator}`
    );

    try {
      // Unregister current shortcut
      if (this.registeredShortcut) {
        const unregistered = globalShortcut.unregister(this.registeredShortcut);
        if (!unregistered) {
          console.error(
            `Failed to unregister current shortcut: ${this.registeredShortcut}`
          );
          return false;
        }
      }

      // Register new shortcut
      const ret = globalShortcut.register(newAccelerator, () => {
        console.log(`New hotkey triggered: ${newAccelerator}`);
        this.toggleOverlayVisibility();
      });

      if (ret) {
        this.registeredShortcut = newAccelerator;
        console.log(`Hotkey successfully changed to: ${newAccelerator}`);

        // Notify renderer of hotkey change
        if (this.mainWindow && this.mainWindow.webContents) {
          this.mainWindow.webContents.send('hotkey-changed', {
            newAccelerator: newAccelerator,
          });
        }

        return true;
      } else {
        console.error(`Failed to register new shortcut: ${newAccelerator}`);

        // Try to re-register the old shortcut
        if (this.registeredShortcut) {
          this.registerGlobalShortcut();
        }

        return false;
      }
    } catch (error) {
      console.error('Error changing hotkey:', error);
      return false;
    }
  }

  getAvailableShortcuts() {
    return {
      default: 'CommandOrControl+Shift+Space',
      alternatives: {
        macOS: ['Command+Shift+A', 'Command+Shift+O', 'Command+Shift+T'],
        Windows: ['Ctrl+Shift+A', 'Ctrl+Shift+O', 'Ctrl+Shift+T'],
        Linux: ['Ctrl+Shift+A', 'Ctrl+Shift+O', 'Ctrl+Shift+T'],
      },
    };
  }

  // IPC handlers for hotkey management
  setupHotkeyIPCHandlers() {
    ipcMain.handle('get-registered-shortcut', () => {
      return this.getRegisteredShortcut();
    });

    ipcMain.handle('is-shortcut-registered', () => {
      return this.isShortcutRegistered();
    });

    ipcMain.handle('change-hotkey', (event, newAccelerator) => {
      return this.changeHotkey(newAccelerator);
    });

    ipcMain.handle('get-available-shortcuts', () => {
      return this.getAvailableShortcuts();
    });
  }

  // IPC handlers for clipboard management
  setupClipboardIPCHandlers() {
    ipcMain.handle('clipboard-get-status', () => {
      return this.clipboardMonitor ? this.clipboardMonitor.getStatus() : null;
    });

    ipcMain.handle('clipboard-start-monitoring', (event, intervalMs) => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.startMonitoring(intervalMs)
        : false;
    });

    ipcMain.handle('clipboard-stop-monitoring', () => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.stopMonitoring()
        : false;
    });

    ipcMain.handle('clipboard-update-interval', (event, intervalMs) => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.updatePollingInterval(intervalMs)
        : false;
    });

    ipcMain.handle('clipboard-get-content', () => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.getCurrentClipboardContent()
        : '';
    });

    ipcMain.handle('clipboard-clear', () => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.clearClipboard()
        : false;
    });

    ipcMain.handle('clipboard-get-events', () => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.getAvailableEvents()
        : {};
    });

    ipcMain.handle('clipboard-get-listeners', () => {
      return this.clipboardMonitor
        ? this.clipboardMonitor.getEventListeners()
        : {};
    });
  }

  setupGeminiIPCHandlers() {
    ipcMain.handle('gemini-get-status', () => {
      return this.geminiService ? this.geminiService.getStatus() : null;
    });

    ipcMain.handle('gemini-get-models', () => {
      return this.geminiService ? this.geminiService.getAvailableModels() : [];
    });

    ipcMain.handle('gemini-get-current-model', () => {
      return this.geminiService ? this.geminiService.getCurrentModel() : null;
    });

    ipcMain.handle('gemini-set-model', async (event, modelName) => {
      if (!this.geminiService) return false;
      try {
        await this.geminiService.setModel(modelName);
        return true;
      } catch (error) {
        console.error('Failed to set model:', error);
        return false;
      }
    });

    ipcMain.handle('gemini-update-api-key', async (event, apiKey) => {
      if (!this.geminiService) return false;
      try {
        return await this.geminiService.updateApiKey(apiKey);
      } catch (error) {
        console.error('Failed to update API key:', error);
        return false;
      }
    });

    ipcMain.handle('gemini-generate', async (event, prompt, options) => {
      if (!this.geminiService) {
        throw new Error('Gemini service not available');
      }
      try {
        return await this.geminiService.generateResponse(prompt, options);
      } catch (error) {
        console.error('Generation failed:', error);
        throw error;
      }
    });

    ipcMain.handle('gemini-health-check', async () => {
      return this.geminiService
        ? await this.geminiService.healthCheck()
        : false;
    });
  }

  setupSecureStorageIPCHandlers() {
    // Get secure storage status
    ipcMain.handle('secure-storage-get-status', () => {
      return this.secureStorage ? this.secureStorage.getStatus() : null;
    });

    // API key operations
    ipcMain.handle(
      'secure-storage-store-gemini-api-key',
      async (event, apiKey, options = {}) => {
        if (!this.secureStorage)
          return { success: false, error: 'Secure storage not available' };
        return await this.secureStorage.storeGeminiApiKey(apiKey, options);
      }
    );

    ipcMain.handle('secure-storage-retrieve-gemini-api-key', () => {
      if (!this.secureStorage) return null;
      return this.secureStorage.retrieveGeminiApiKey();
    });

    ipcMain.handle('secure-storage-delete-gemini-api-key', () => {
      if (!this.secureStorage) return false;
      return this.secureStorage.deleteGeminiApiKey();
    });

    ipcMain.handle('secure-storage-has-gemini-api-key', () => {
      if (!this.secureStorage) return false;
      return this.secureStorage.hasGeminiApiKey();
    });

    // General API key operations
    ipcMain.handle(
      'secure-storage-store-api-key',
      async (event, keyName, apiKey, options = {}) => {
        if (!this.secureStorage)
          return { success: false, error: 'Secure storage not available' };
        return await this.secureStorage.storeApiKey(keyName, apiKey, options);
      }
    );

    ipcMain.handle('secure-storage-retrieve-api-key', (event, keyName) => {
      if (!this.secureStorage) return null;
      return this.secureStorage.retrieveApiKey(keyName);
    });

    ipcMain.handle('secure-storage-delete-api-key', (event, keyName) => {
      if (!this.secureStorage) return false;
      return this.secureStorage.deleteApiKey(keyName);
    });

    ipcMain.handle('secure-storage-has-api-key', (event, keyName) => {
      if (!this.secureStorage) return false;
      return this.secureStorage.hasApiKey(keyName);
    });

    // Backend configuration operations
    ipcMain.handle('secure-storage-store-backend-config', (event, config) => {
      if (!this.secureStorage) return false;
      return this.secureStorage.storeBackendConfig(config);
    });

    ipcMain.handle('secure-storage-retrieve-backend-config', () => {
      if (!this.secureStorage) return null;
      return this.secureStorage.retrieveBackendConfig();
    });

    // Validation
    ipcMain.handle(
      'secure-storage-validate-api-key-format',
      (event, apiKey) => {
        if (!this.secureStorage)
          return { isValid: false, errors: ['Secure storage not available'] };
        return this.secureStorage.validateApiKeyFormat(apiKey);
      }
    );

    ipcMain.handle(
      'secure-storage-test-api-key-against-gemini',
      async (event, apiKey) => {
        if (!this.secureStorage)
          return { isValid: false, error: 'Secure storage not available' };
        return await this.secureStorage.testApiKeyAgainstGemini(apiKey);
      }
    );

    ipcMain.handle(
      'secure-storage-validate-stored-api-key',
      async (event, keyName) => {
        if (!this.secureStorage)
          return { isValid: false, error: 'Secure storage not available' };
        return await this.secureStorage.validateStoredApiKey(keyName);
      }
    );

    // Migration and backup operations
    ipcMain.handle(
      'secure-storage-migrate-from-environment',
      async (event, keyName, envVarName) => {
        if (!this.secureStorage)
          return { success: false, error: 'Secure storage not available' };
        return this.secureStorage.migrateFromEnvironment(keyName, envVarName);
      }
    );

    ipcMain.handle('secure-storage-export-api-key', (event, keyName) => {
      if (!this.secureStorage)
        return { success: false, error: 'Secure storage not available' };
      return this.secureStorage.exportApiKey(keyName);
    });

    ipcMain.handle('secure-storage-import-api-key', (event, exportData) => {
      if (!this.secureStorage)
        return { success: false, error: 'Secure storage not available' };
      return this.secureStorage.importApiKey(exportData);
    });

    // Security recommendations
    ipcMain.handle('secure-storage-get-security-recommendations', () => {
      if (!this.secureStorage) return { error: 'Secure storage not available' };
      return this.secureStorage.getSecurityRecommendations();
    });

    // Clear all data (use with caution)
    ipcMain.handle('secure-storage-clear-all', () => {
      if (!this.secureStorage) return false;
      return this.secureStorage.clearAll();
    });
  }

  setupOllamaIPCHandlers() {
    ipcMain.handle('ollama-get-status', () => {
      return this.ollamaService ? this.ollamaService.getStatus() : null;
    });

    ipcMain.handle('ollama-get-models', () => {
      return this.ollamaService ? this.ollamaService.getAvailableModels() : [];
    });

    ipcMain.handle('ollama-get-current-model', () => {
      return this.ollamaService ? this.ollamaService.getCurrentModel() : null;
    });

    ipcMain.handle('ollama-set-model', async (event, modelName) => {
      if (!this.ollamaService) return false;
      try {
        await this.ollamaService.setModel(modelName);
        return true;
      } catch (error) {
        console.error('Failed to set model:', error);
        return false;
      }
    });

    ipcMain.handle('ollama-validate-model', async (event, modelName) => {
      return this.ollamaService
        ? await this.ollamaService.validateModel(modelName)
        : false;
    });

    ipcMain.handle('ollama-health-check', async () => {
      return this.ollamaService
        ? await this.ollamaService.healthCheck()
        : false;
    });

    ipcMain.handle('ollama-generate', async (event, prompt, options) => {
      if (!this.ollamaService) {
        throw new Error('Ollama service not available');
      }
      try {
        return await this.ollamaService.generateResponse(prompt, options);
      } catch (error) {
        console.error('Generation failed:', error);
        throw error;
      }
    });

    // New handlers for enhanced integration
    ipcMain.handle('ollama-process-clipboard', async event => {
      // Get current clipboard content and process it
      const clipboard = require('electron').clipboard;
      const content = clipboard.readText();

      if (!content || content.trim().length === 0) {
        throw new Error('Clipboard is empty');
      }

      const changeEvent = {
        newValue: content,
        type: this.detectContentType(content),
        length: content.length,
        isSignificant: true,
        isEmpty: false,
      };

      await this.handleClipboardChange(changeEvent);
      return { success: true, contentLength: content.length };
    });

    ipcMain.handle('ollama-get-last-response', () => {
      return this.lastGeneratedResponse || null;
    });

    ipcMain.handle('ollama-clear-response', () => {
      this.lastGeneratedResponse = null;
      return { success: true };
    });
  }

  detectContentType(content) {
    // Enhanced content type detection
    if (content.includes('http://') || content.includes('https://')) {
      return 'url';
    }
    if (
      content.includes('@') &&
      content.includes('.') &&
      content.includes(' ')
    ) {
      return 'email';
    }
    if (
      content.includes('function') ||
      content.includes('const ') ||
      content.includes('let ') ||
      content.includes('var ') ||
      content.includes('if(') ||
      content.includes('for(') ||
      (content.includes('{') && content.includes('}'))
    ) {
      return 'code';
    }
    if (content.length > 1000) {
      return 'long-text';
    }
    return 'text';
  }
}

// Create the application instance
let overlayAssistant;

app.on('ready', () => {
  overlayAssistant = new AIOverlayAssistant();
});

// Export for potential use in other modules
module.exports = { AIOverlayAssistant };
