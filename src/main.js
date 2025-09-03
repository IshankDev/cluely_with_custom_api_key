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
      position: 'center-top',
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
    const windowWidth = Math.min(screenWidth * 0.15); // Max 90% of screen width
    const windowHeight = 40; // Fixed height for just the control bar

    // Position in center-top with margin
    const margin = 20;
    const x = Math.round((screenWidth - windowWidth) / 2);
    const y = margin;

    // Platform-specific window options
    const windowOptions = {
      width: windowWidth,
      height: windowHeight,

      x: x,
      y: y,
      frame: false, // Remove window frame completely
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: false,
      focusable: false, // Prevent focus stealing
      minimizable: false, // Prevent minimizing
      maximizable: false, // Prevent maximizing
      fullscreenable: false, // Prevent fullscreen
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
      },
      show: false, // Don't show until ready
      // Enhanced transparency settings
      backgroundColor: 'transparent', // Completely transparent background
    };

    // Platform-specific adjustments to ensure no title bar
    if (process.platform === 'win32') {
      // Windows-specific settings
      windowOptions.thickFrame = false; // Remove thick frame
      windowOptions.titleBarStyle = 'hidden'; // Hide title bar completely
      windowOptions.autoHideMenuBar = true; // Hide menu bar
      windowOptions.frame = false; // Ensure no frame
      windowOptions.minimizable = false; // Prevent minimizing
      windowOptions.maximizable = false; // Prevent maximizing
    } else if (process.platform === 'darwin') {
      // macOS-specific settings - completely hide title bar
      windowOptions.titleBarStyle = 'hiddenInset'; // Hidden title bar with inset (removes space)
      windowOptions.vibrancy = 'under-window'; // Add vibrancy effect
      windowOptions.backgroundColor = 'transparent'; // Completely transparent
      windowOptions.frame = false; // Ensure no frame
      windowOptions.minimizable = false; // Prevent minimizing
      windowOptions.maximizable = false; // Prevent maximizing
      windowOptions.fullscreenable = false; // Prevent fullscreen
      windowOptions.trafficLightPosition = { x: 0, y: 0 }; // Move traffic lights off-screen
      windowOptions.titleBarOverlay = false; // Disable title bar overlay
      // Force remove title bar space by adjusting window bounds
      windowOptions.useContentSize = true; // Use content size instead of window size
    } else if (process.platform === 'linux') {
      // Linux-specific settings
      windowOptions.icon = path.join(__dirname, 'assets', 'icon.png'); // Set icon
      windowOptions.backgroundColor = 'transparent'; // Completely transparent
      windowOptions.frame = false; // Ensure no frame
      windowOptions.minimizable = false; // Prevent minimizing
      windowOptions.maximizable = false; // Prevent maximizing
    }

    // Create the overlay window with platform-specific settings
    this.mainWindow = new BrowserWindow(windowOptions);

    // Load the overlay HTML
    const htmlPath = path.join(__dirname, 'renderer', 'index.html');
    console.log('Loading HTML file:', htmlPath);
    console.log('HTML file exists:', require('fs').existsSync(htmlPath));

    this.mainWindow.loadFile(htmlPath);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready-to-show event fired');

      // Force remove title bar and window controls
      this.mainWindow.setMenu(null); // Remove menu bar

      this.mainWindow.show();

      // Make window invisible in screen sharing
      this.setWindowDisplayAffinity();

      // Setup screen sharing detection
      this.setupScreenSharingDetection();

      // Platform-specific visibility and focus settings
      this.applyPlatformSpecificSettings();

      // Configure mouse event behavior
      this.setupMouseEventHandling();

      // Open DevTools for debugging (only in development)
      if (
        process.argv.includes('--dev') ||
        process.env.NODE_ENV === 'development'
      ) {
        // this.mainWindow.webContents.openDevTools();
      }

      // Check if webContents is ready
      console.log(
        'WebContents ready state:',
        this.mainWindow.webContents.isLoading()
      );
      console.log('WebContents URL:', this.mainWindow.webContents.getURL());

      // Send a test message to verify renderer is working
      setTimeout(() => {
        console.log('Sending initial test message to renderer');
        this.sendToRenderer('test-message', {
          message: 'Initial test from main process',
        });
      }, 1000);

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

    // Note: Window is set to focusable: false, so no focus handling needed

    // Development: DevTools are now opened conditionally in the ready-to-show event
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

    ipcMain.on('overlay-position-changed', (event, position) => {
      console.log('Overlay position changed to:', position);
      // The position is handled by the renderer process
      // This is just for logging and potential future main process actions
    });

    // Handle settings window requests
    ipcMain.on('open-settings-window', () => {
      console.log('=== RECEIVED OPEN-SETTINGS-WINDOW REQUEST ===');
      console.log('Settings window exists:', !!this.settingsWindow);
      this.openSettingsWindow();
    });

    // Handle settings save request
    ipcMain.on('save-settings', (event, settings) => {
      console.log('Received settings save request:', settings);
      this.saveSettings(settings);
    });

    // Handle settings request
    ipcMain.on('request-settings', event => {
      console.log('Received settings request');
      this.sendSettingsToRenderer(event.sender);
    });

    // Handle settings window close request
    ipcMain.on('close-settings-window', () => {
      console.log('Received request to close settings window');
      if (this.settingsWindow) {
        this.settingsWindow.close();
        this.settingsWindow = null;
      }
    });

    // Handle test message
    ipcMain.on('test-message', (event, data) => {
      console.log('Received test message from renderer:', data);
    });

    // Handle test message from renderer
    ipcMain.on('test-message-from-renderer', (event, data) => {
      console.log('Received test message from renderer test.js:', data);

      // Send a response back to verify communication
      if (this.mainWindow && this.mainWindow.webContents) {
        this.mainWindow.webContents.send('test-response-from-main', {
          message: 'Test response from main process',
          timestamp: Date.now(),
          received: data,
        });
      }
    });

    // Handle window movement from renderer
    ipcMain.on('move-window', (event, data) => {
      console.log('Received move-window IPC:', data);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const [currentX, currentY] = this.mainWindow.getPosition();
        const newX = currentX + data.deltaX;
        const newY = currentY + data.deltaY;

        console.log('Moving window from', currentX, currentY, 'to', newX, newY);
        this.mainWindow.setPosition(newX, newY);
      } else {
        console.log('Cannot move window - window not available or destroyed');
      }
    });

    // Handle window drag completion
    ipcMain.on('window-drag-complete', (event, data) => {
      console.log('Window drag completed at position:', data);
    });

    // Handle toggle listening
    ipcMain.on('toggle-listening', (event, isListening) => {
      console.log('Toggle listening:', isListening);
      // You can add logic here to enable/disable clipboard monitoring
    });

    // Handle submit question
    ipcMain.on('submit-question', (event, data) => {
      console.log('Submit question:', data.question);
      // Process the question with AI backend
      this.processQuestion(data.question);
    });

    // Handle toggle window visibility
    ipcMain.on('toggle-window-visibility', (event, isVisible) => {
      console.log('Toggle window visibility:', isVisible);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (isVisible) {
          this.mainWindow.show();
        } else {
          this.mainWindow.hide();
        }
      }
    });

    // Handle toggle display affinity (screen sharing visibility)
    ipcMain.on('toggle-display-affinity', (event, enabled) => {
      console.log('=== TOGGLE SCREEN SHARING CONTROL REQUESTED ===');
      console.log('Enabled:', enabled);
      console.log('Main window exists:', !!this.mainWindow);
      console.log(
        'Main window destroyed:',
        this.mainWindow ? this.mainWindow.isDestroyed() : 'No window'
      );

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          if (enabled) {
            // Enable screen sharing control using available methods
            this.mainWindow.setVisibleOnAllWorkspaces(true, {
              visibleOnFullScreen: true,
            });
            this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
            this.mainWindow.setSkipTaskbar(true);

            console.log(
              '✅ Screen sharing control ENABLED - window configured for less intrusive behavior'
            );

            // Test the settings
            this.testDisplayAffinity();

            // Send confirmation to renderer
            this.sendToRenderer('display-affinity-updated', {
              enabled: true,
              status: 'success',
              message: 'Window configured for screen sharing control',
            });
          } else {
            // Disable screen sharing control
            this.mainWindow.setVisibleOnAllWorkspaces(false);
            this.mainWindow.setAlwaysOnTop(false);
            this.mainWindow.setSkipTaskbar(false);

            console.log(
              '✅ Screen sharing control DISABLED - window restored to normal behavior'
            );

            // Test the settings
            this.testDisplayAffinity();

            // Send confirmation to renderer
            this.sendToRenderer('display-affinity-updated', {
              enabled: false,
              status: 'success',
              message: 'Window restored to normal behavior',
            });
          }
        } catch (error) {
          console.error(
            '❌ Could not toggle screen sharing control:',
            error.message
          );

          // Send error to renderer
          this.sendToRenderer('display-affinity-updated', {
            enabled: enabled,
            status: 'error',
            message: `Failed to toggle screen sharing control: ${error.message}`,
          });
        }
      } else {
        console.error(
          '❌ Cannot toggle screen sharing control - window not available'
        );

        // Send error to renderer
        this.sendToRenderer('display-affinity-updated', {
          enabled: enabled,
          status: 'error',
          message: 'Window not available for screen sharing control toggle',
        });
      }
    });
  }

  setupBackendSwitchingIPCHandlers() {
    // Handle backend switching requests
    ipcMain.handle('switch-backend', async (event, backend) => {
      console.log('Switching backend to:', backend);

      try {
        this.activeBackend = backend;

        // Update backend configuration
        this.backendConfig.backend = backend;

        // Save to secure storage
        if (this.secureStorage) {
          this.secureStorage.storeBackendConfig(this.backendConfig);
        }

        // Notify renderer about backend change
        if (this.mainWindow) {
          this.mainWindow.webContents.send('backend-switched', backend);
        }

        return { success: true, backend };
      } catch (error) {
        console.error('Failed to switch backend:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle backend status requests
    ipcMain.handle('get-active-backend', () => {
      return this.activeBackend;
    });

    // Handle backend configuration requests
    ipcMain.handle('get-backend-config', () => {
      return this.backendConfig;
    });
  }

  openSettingsWindow() {
    if (this.settingsWindow) {
      // If settings window already exists, just show and focus it
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return;
    }

    // Create new settings window
    this.createSettingsWindow();
  }

  createSettingsWindow() {
    console.log('=== CREATING SETTINGS WINDOW ===');

    // Get screen dimensions for intelligent positioning
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    console.log('Screen dimensions:', { screenWidth, screenHeight });

    // Calculate optimal window size and position
    const windowWidth = Math.min(800, screenWidth * 0.8); // 80% of screen width, max 800px
    const windowHeight = Math.min(600, screenHeight * 0.8); // 80% of screen height, max 600px

    // Center the window
    const x = Math.round((screenWidth - windowWidth) / 2);
    const y = Math.round((screenHeight - windowHeight) / 2);

    console.log('Window position:', { x, y, windowWidth, windowHeight });

    // Settings window options
    const windowOptions = {
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      frame: true,
      transparent: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
      movable: true,
      minimizable: true,
      maximizable: true,
      fullscreenable: false,
      focusable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
      },
      show: false,
      title: 'AI Overlay Assistant - Settings',
    };

    // Platform-specific adjustments
    if (process.platform === 'darwin') {
      windowOptions.titleBarStyle = 'default';
    }

    // Create the settings window
    this.settingsWindow = new BrowserWindow(windowOptions);

    // Load the settings HTML
    const settingsPath = path.join(__dirname, 'renderer', 'settings.html');
    console.log('Loading settings from:', settingsPath);
    console.log(
      'Settings file exists:',
      require('fs').existsSync(settingsPath)
    );

    this.settingsWindow.loadFile(settingsPath);

    // Show window when ready
    this.settingsWindow.once('ready-to-show', () => {
      console.log('=== SETTINGS WINDOW READY TO SHOW ===');
      this.settingsWindow.show();
      this.settingsWindow.focus();
      console.log('Settings window created and shown');
    });

    // Handle window closed
    this.settingsWindow.on('closed', () => {
      console.log('Settings window closed');
      this.settingsWindow = null;
    });

    // Handle window close
    this.settingsWindow.on('close', () => {
      // Just close the window normally
      console.log('Settings window close event');
    });

    // Handle window errors
    this.settingsWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL) => {
        console.error('Settings window failed to load:', {
          errorCode,
          errorDescription,
          validatedURL,
        });
      }
    );

    this.settingsWindow.webContents.on('crashed', () => {
      console.error('Settings window webContents crashed');
    });
  }

  saveSettings(settings) {
    try {
      console.log('Saving settings:', settings);

      // Update backend configuration
      if (settings.backend) {
        this.backendConfig.backend = settings.backend;
        this.activeBackend = settings.backend;
      }

      if (settings.modelName) {
        this.backendConfig.modelName = settings.modelName;
      }

      if (settings.geminiApiKey) {
        this.backendConfig.geminiApiKey = settings.geminiApiKey;
      }

      // Update overlay position
      if (settings.position) {
        this.backendConfig.position = settings.position;
        // Reposition the main window
        this.repositionWindowToPosition(settings.position);
      }

      // Update theme
      if (settings.theme) {
        this.backendConfig.theme = settings.theme;
        // Send theme update to renderer
        if (this.mainWindow) {
          this.mainWindow.webContents.send('theme-changed', settings.theme);
        }
      }

      // Update auto-hide settings
      if (settings.autoHide !== undefined) {
        this.backendConfig.autoHide = settings.autoHide;
      }

      if (settings.autoHideDelay) {
        this.backendConfig.autoHideDelay = settings.autoHideDelay;
      }

      if (settings.autoHideAfterResponse !== undefined) {
        this.backendConfig.autoHideAfterResponse =
          settings.autoHideAfterResponse;
      }

      if (settings.autoHideDelayAfterResponse) {
        this.backendConfig.autoHideDelayAfterResponse =
          settings.autoHideDelayAfterResponse;
      }

      // Save to secure storage
      if (this.secureStorage) {
        this.secureStorage.storeBackendConfig(this.backendConfig);
      }

      // Notify renderer about settings update
      if (this.mainWindow) {
        this.mainWindow.webContents.send(
          'settings-updated',
          this.backendConfig
        );
      }

      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  sendSettingsToRenderer(webContents) {
    try {
      console.log('Sending settings to renderer');
      webContents.send('settings-loaded', this.backendConfig);
    } catch (error) {
      console.error('Failed to send settings to renderer:', error);
    }
  }

  repositionWindowToPosition(position) {
    if (!this.mainWindow) return;

    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    const windowWidth = Math.min(400, screenWidth * 0.3);
    const windowHeight = Math.min(200, screenHeight * 0.2);
    const margin = 20;

    let x, y;

    switch (position) {
      case 'center-top':
        x = Math.round((screenWidth - windowWidth) / 2);
        y = margin;
        break;
      case 'top-right':
        x = screenWidth - windowWidth - margin;
        y = margin;
        break;
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-right':
        x = screenWidth - windowWidth - margin;
        y = screenHeight - windowHeight - margin;
        break;
      case 'bottom-left':
        x = margin;
        y = screenHeight - windowHeight - margin;
        break;
      case 'center-right':
        x = screenWidth - windowWidth - margin;
        y = Math.round((screenHeight - windowHeight) / 2);
        break;
      case 'center-left':
        x = margin;
        y = Math.round((screenHeight - windowHeight) / 2);
        break;
      default:
        x = Math.round((screenWidth - windowWidth) / 2);
        y = margin;
    }

    this.mainWindow.setBounds({
      x,
      y,
      width: windowWidth,
      height: windowHeight,
    });

    console.log(`Overlay window repositioned to ${position}:`, { x, y });
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

    // Force remove title bar and window controls for all platforms
    this.mainWindow.setMenu(null); // Remove menu bar
    this.mainWindow.setMenuBarVisibility(false); // Hide menu bar

    // macOS-specific settings
    if (process.platform === 'darwin') {
      // Set window to be visible on all workspaces including fullscreen apps
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });

      // Use higher always-on-top level for better overlay persistence
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');

      // Force remove traffic lights (close, minimize, maximize buttons)
      try {
        this.mainWindow.setWindowButtonVisibility(false);
      } catch (error) {
        console.log('Could not hide window buttons:', error.message);
      }

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

  setWindowDisplayAffinity() {
    if (!this.mainWindow) return;

    try {
      // Note: setDisplayAffinity is not available in Electron v35.7.5
      // Use alternative methods for screen sharing control

      // Set window to be visible on all workspaces (including fullscreen apps)
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });

      // Set window to always be on top
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');

      // Skip taskbar to make it less intrusive
      this.mainWindow.setSkipTaskbar(true);

      console.log(
        'Window configured for screen sharing control using alternative methods'
      );

      // Test function to verify the settings worked
      this.testDisplayAffinity();
    } catch (error) {
      console.log(
        'Could not configure window for screen sharing control:',
        error.message
      );
      console.log('This feature may not be available on all platforms');
    }
  }

  testDisplayAffinity() {
    if (!this.mainWindow) return;

    try {
      // Test if the window is configured for screen sharing control
      const isVisibleOnAllWorkspaces =
        this.mainWindow.isVisibleOnAllWorkspaces();
      const isAlwaysOnTop = this.mainWindow.isAlwaysOnTop();

      console.log('Window configuration test:');
      console.log('- Visible on all workspaces:', isVisibleOnAllWorkspaces);
      console.log('- Always on top:', isAlwaysOnTop);
      console.log('- Window should be less intrusive in screen sharing');
    } catch (error) {
      console.log('Could not test window configuration:', error.message);
    }
  }

  // New method to detect and handle screen sharing
  setupScreenSharingDetection() {
    if (!this.mainWindow) return;

    try {
      // Listen for screen sharing events
      this.mainWindow.webContents.on('desktop-capturer-get-sources', () => {
        console.log('Screen sharing detected - hiding overlay window');
        this.mainWindow.hide();
      });

      // Alternative: Check for screen recording permission changes
      this.mainWindow.webContents.on(
        'media-access-requested',
        (event, details) => {
          if (details.mediaTypes.includes('screen')) {
            console.log(
              'Screen recording access requested - hiding overlay window'
            );
            this.mainWindow.hide();
          }
        }
      );

      // Listen for window focus changes that might indicate screen sharing
      this.mainWindow.on('blur', () => {
        // Check if screen sharing is active
        this.checkForScreenSharing();
      });
    } catch (error) {
      console.log('Could not setup screen sharing detection:', error.message);
    }
  }

  checkForScreenSharing() {
    // This is a basic check - in a real implementation you might want more sophisticated detection
    try {
      // Check if any screen sharing apps are running
      const { exec } = require('child_process');

      if (process.platform === 'darwin') {
        // macOS - check for common screen sharing apps
        exec(
          'ps aux | grep -E "(zoom|teams|slack|discord|obs|quicktime)" | grep -v grep',
          (error, stdout) => {
            if (stdout.trim()) {
              console.log(
                'Screen sharing app detected - hiding overlay window'
              );
              this.mainWindow.hide();
            }
          }
        );
      } else if (process.platform === 'win32') {
        // Windows - check for common screen sharing apps
        exec(
          'tasklist | findstr /i "zoom teams slack discord obs"',
          (error, stdout) => {
            if (stdout.trim()) {
              console.log(
                'Screen sharing app detected - hiding overlay window'
              );
              this.mainWindow.hide();
            }
          }
        );
      }
    } catch (error) {
      console.log('Could not check for screen sharing apps:', error.message);
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
      // Check if Gemini API key exists before attempting to initialize
      if (!this.secureStorage) {
        console.log(
          'Secure storage not available, skipping Gemini service initialization'
        );
        return;
      }

      const hasApiKey = this.secureStorage.hasGeminiApiKey();
      if (!hasApiKey) {
        console.log(
          'No Gemini API key found, skipping Gemini service initialization'
        );
        console.log(
          'Gemini service will be available once an API key is configured in settings'
        );
        return;
      }

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
        newValue: changeEvent.newValue
          ? changeEvent.newValue.substring(0, 100) + '...'
          : 'empty',
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

    // Performance monitoring events
    this.clipboardMonitor.on('performance-metrics', metrics => {
      // console.log('Clipboard performance metrics:', {
      //   totalPolls: metrics.totalPolls,
      //   totalChanges: metrics.totalChanges,
      //   averagePollTime: metrics.averagePollTime,
      //   adaptiveInterval: metrics.adaptiveInterval,
      //   isPaused: metrics.isPaused,
      // });
      this.sendToRenderer('clipboard-performance-metrics', metrics);
    });

    this.clipboardMonitor.on('adaptive-interval-updated', data => {
      console.log('Adaptive polling interval updated:', {
        newInterval: data.newInterval,
        reason: data.reason,
        changeRate: data.changeRate,
      });
      this.sendToRenderer('clipboard-adaptive-interval-updated', data);
    });

    this.clipboardMonitor.on('adaptive-polling-toggled', data => {
      console.log('Adaptive polling toggled:', data.enabled);
      this.sendToRenderer('clipboard-adaptive-polling-toggled', data);
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
      console.log('Ollama generation started:');
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

  /**
   * Set up streaming response handlers for real-time updates
   * @param {Object} service - The AI service instance
   * @param {string} backend - The backend type ('ollama' or 'gemini')
   * @param {Object} changeEvent - The original clipboard change event
   */
  setupStreamingResponseHandlers(service, backend, changeEvent) {
    // Clear any existing handlers to prevent duplicates
    service.removeAllListeners('token-received');
    service.removeAllListeners('generation-completed');
    service.removeAllListeners('error');

    // Ensure window is visible before setting up streaming
    if (this.mainWindow && !this.mainWindow.isVisible()) {
      console.log('Making window visible for streaming response');
      this.mainWindow.show();
    }

    // Handle individual token updates
    service.on('token-received', tokenData => {
      // console.log(`Received token from ${backend}:`, {
      //   token: tokenData.token,
      //   fullResponse: tokenData.fullResponse?.substring(0, 100) + '...',
      //   done: tokenData.done,
      // });

      // Ensure window is visible for each token
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('Making window visible for token update');
        this.mainWindow.show();
      }

      // Send token update to renderer for real-time display
      this.sendToRenderer('ai-token-received', {
        token: tokenData.token,
        fullResponse: tokenData.fullResponse || '',
        done: tokenData.done || false,
        backend: backend,
        contentType: changeEvent.type,
        timestamp: Date.now(),
        model: tokenData.model || 'N/A',
      });
    });

    // Handle generation completion
    service.on('generation-completed', completionData => {
      console.log(`Generation completed for ${backend}:`, {
        fullResponse: completionData.fullResponse?.substring(0, 100) + '...',
        model: completionData.model,
        finishReason: completionData.finishReason,
      });

      // Ensure window is visible for completion
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('Making window visible for completion');
        this.mainWindow.show();
      }

      // Send completion event to renderer
      this.sendToRenderer('ai-generation-completed', {
        fullResponse: completionData.fullResponse,
        backend: backend,
        contentType: changeEvent.type,
        timestamp: Date.now(),
        model: completionData.model || 'N/A',
        finishReason: completionData.finishReason,
        usage: completionData.usage,
      });
    });

    // Handle streaming errors
    service.on('error', errorData => {
      console.error(`Streaming error from ${backend}:`, errorData);

      // Ensure window is visible for error display
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('Making window visible for error display');
        this.mainWindow.show();
      }

      // Send error to renderer
      const errorChannel =
        backend === 'gemini' ? 'gemini-error' : 'ollama-error';
      this.sendToRenderer(errorChannel, {
        ...errorData,
        backend: backend,
        contentType: changeEvent.type,
        contentLength: changeEvent.length,
      });
    });
  }

  /**
   * Determine and validate the appropriate backend based on user settings
   * @returns {Object} - Backend configuration with validation results
   */
  determineBackendFromSettings() {
    const backend = this.activeBackend || 'ollama';
    const config = this.backendConfig || {};

    console.log('Determining backend from settings:', {
      activeBackend: backend,
      config: config,
    });

    const validation = {
      backend: backend,
      isValid: false,
      error: null,
      config: config,
    };

    try {
      if (backend === 'gemini') {
        // Validate Gemini configuration
        if (!this.geminiService) {
          console.log('Gemini service not initialized, falling back to Ollama');
          // Fall back to Ollama if Gemini is not available
          validation.backend = 'ollama';
          backend = 'ollama';
        } else if (!this.geminiService.isConnected) {
          throw new Error(
            'Gemini service is not connected. Please check your API key configuration.'
          );
        } else {
          // Check if API key is available
          const apiKey = this.secureStorage?.retrieveGeminiApiKey();
          if (!apiKey) {
            throw new Error(
              'Gemini API key is not configured. Please set up your API key in settings.'
            );
          }

          validation.isValid = true;
          validation.service = this.geminiService;
          validation.apiKeyConfigured = true;
          return validation;
        }
      }

      // Validate Ollama configuration (default or fallback)
      if (!this.ollamaService) {
        throw new Error('Ollama service is not initialized');
      }

      if (!this.ollamaService.isConnected) {
        throw new Error(
          'Ollama service is not connected. Please ensure Ollama is running locally at http://localhost:11434'
        );
      }

      // Check if model is available
      const currentModel = this.ollamaService.getCurrentModel();
      if (!currentModel) {
        throw new Error(
          'No Ollama model is configured. Please select a model in settings.'
        );
      }

      validation.isValid = true;
      validation.service = this.ollamaService;
      validation.modelConfigured = true;
      validation.currentModel = currentModel;

      console.log('Backend validation successful:', {
        backend: validation.backend,
        isValid: validation.isValid,
      });
    } catch (error) {
      validation.error = error.message;
      console.error('Backend validation failed:', error.message);
    }

    return validation;
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

    // Determine and validate backend from user settings
    const backendValidation = this.determineBackendFromSettings();

    if (!backendValidation.isValid) {
      console.error('Backend validation failed:', backendValidation.error);

      // Send error to renderer
      const errorData = {
        type: 'backend-validation-failed',
        error: backendValidation.error,
        timestamp: Date.now(),
        contentType: changeEvent.type,
        contentLength: changeEvent.length,
        backend: backendValidation.backend,
      };

      this.sendToRenderer('backend-error', errorData);
      return;
    }

    const backend = backendValidation.backend;
    const service = backendValidation.service;

    // Notify if we fell back to Ollama from Gemini
    if (this.activeBackend === 'gemini' && backend === 'ollama') {
      console.log('Fell back to Ollama because Gemini is not available');
      this.sendToRenderer('backend-fallback', {
        from: 'gemini',
        to: 'ollama',
        reason: 'Gemini service not initialized (no API key)',
        timestamp: Date.now(),
      });
    }

    console.log(`Processing clipboard content with ${backend}:`, {
      type: changeEvent.type,
      length: changeEvent.length,
      content: changeEvent.newValue.substring(0, 100) + '...',
      model: backendValidation.currentModel || 'N/A',
    });

    try {
      // Ensure window is visible before starting AI processing
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('Making window visible before AI processing');
        this.mainWindow.show();
      }

      // Send a test message to verify renderer is ready (only in development)
      if (
        process.argv.includes('--dev') ||
        process.env.NODE_ENV === 'development'
      ) {
        this.sendToRenderer('test-message', {
          message: 'Starting AI processing...',
          timestamp: Date.now(),
        });
      }

      // Create a prompt based on clipboard content
      const prompt = this.createPromptFromClipboard(changeEvent);

      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Generated prompt is empty');
      }

      console.log('Generated prompt:', prompt.substring(0, 200) + '...');

      // Set up streaming response handling
      this.setupStreamingResponseHandlers(service, backend, changeEvent);

      // Generate response using the validated backend service with streaming
      let result;
      if (backend === 'gemini') {
        result = await service.generateResponse(prompt, {
          temperature: 0.7,
          maxTokens: 500,
          stream: true,
        });
      } else {
        // Ollama with enhanced options
        result = await service.generateResponse(prompt, {
          temperature: 0.7,
          maxTokens: 500,
          stream: true,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1,
        });
      }

      console.log(`AI response generated successfully using ${backend}`);

      // Store the response in application state for potential reuse
      this.lastGeneratedResponse = {
        prompt: prompt,
        response: result.response || result,
        timestamp: Date.now(),
        contentType: changeEvent.type,
        backend: backend,
        model: backendValidation.currentModel || 'N/A',
      };

      // Send final success event to renderer
      console.log(
        'Sending ai-response-completed to renderer with response length:',
        result.response || result ? (result.response || result).length : 0
      );

      // Ensure window is visible before sending response
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('Making window visible before sending response');
        this.mainWindow.show();
      }

      // Force window to be visible and focused
      if (this.mainWindow) {
        console.log('Forcing window to be visible and focused');
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          this.mainWindow.setAlwaysOnTop(false);
        }, 1000);
      }

      console.log('Window visibility before sending response:', {
        windowExists: !!this.mainWindow,
        isVisible: this.mainWindow ? this.mainWindow.isVisible() : 'No window',
        isFocused: this.mainWindow ? this.mainWindow.isFocused() : 'No window',
        isDestroyed: this.mainWindow
          ? this.mainWindow.isDestroyed()
          : 'No window',
      });

      // Send test message first
      this.sendToRenderer('test-message', {
        message: 'Test from main process',
      });

      // Send another test message to verify IPC is working
      console.log('Sending test message to verify IPC communication');
      this.sendToRenderer('test-response-from-main', {
        message: 'IPC test from main process',
        timestamp: Date.now(),
        responseLength: result.response ? result.response.length : 0,
      });

      this.sendToRenderer('ai-response-completed', {
        response: result.response || result,
        backend: backend,
        contentType: changeEvent.type,
        timestamp: Date.now(),
        model: backendValidation.currentModel || 'N/A',
      });
    } catch (error) {
      console.error(`Failed to generate AI response with ${backend}:`, error);

      // Enhanced error reporting with more context
      const errorData = {
        type: this.getErrorType(error),
        error: error.message,
        timestamp: Date.now(),
        contentType: changeEvent.type,
        contentLength: changeEvent.length,
        backend: backend,
        model: backendValidation.currentModel || 'N/A',
      };

      // Send error to renderer with backend-specific channel
      const errorChannel =
        backend === 'gemini' ? 'gemini-error' : 'ollama-error';
      this.sendToRenderer(errorChannel, errorData);
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

  /**
   * Process and validate clipboard text before sending to AI backend
   * @param {Object} changeEvent - Clipboard change event
   * @returns {Object} - Processed text data with validation results
   */
  processAndValidateClipboardText(changeEvent) {
    const rawContent = changeEvent.newValue;
    const contentType = changeEvent.type;

    // Basic validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Invalid clipboard content: not a string');
    }

    // Remove leading/trailing whitespace
    let processedContent = rawContent.trim();

    // Check for empty content after trimming
    if (!processedContent) {
      throw new Error('Clipboard content is empty after processing');
    }

    // Validate content length
    if (processedContent.length < 3) {
      throw new Error('Clipboard content is too short (minimum 3 characters)');
    }

    if (processedContent.length > 10000) {
      throw new Error(
        'Clipboard content is too long (maximum 10,000 characters)'
      );
    }

    // Filter out unsupported formats
    if (this.isUnsupportedFormat(processedContent)) {
      throw new Error('Unsupported clipboard format detected');
    }

    // Sanitize content for AI processing
    processedContent = this.sanitizeContent(processedContent);

    // Validate final processed content
    if (!processedContent || processedContent.trim().length === 0) {
      throw new Error('Content became empty after sanitization');
    }

    return {
      originalContent: rawContent,
      processedContent: processedContent,
      contentType: contentType,
      length: processedContent.length,
      isValid: true,
      sanitizationApplied: true,
    };
  }

  /**
   * Check if content is in an unsupported format
   * @param {string} content - Content to check
   * @returns {boolean} - Whether the format is unsupported
   */
  isUnsupportedFormat(content) {
    // Check for binary data indicators
    if (content.includes('\x00') || content.includes('\ufffd')) {
      return true;
    }

    // Check for file paths (likely not text content)
    if (content.includes('\\') && content.includes(':')) {
      return true;
    }

    // Check for very long lines (likely not readable text)
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 200);
    if (longLines.length > lines.length * 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Sanitize content for AI processing
   * @param {string} content - Content to sanitize
   * @returns {string} - Sanitized content
   */
  sanitizeContent(content) {
    // Remove null characters
    let sanitized = content.replace(/\x00/g, '');

    // Normalize line endings
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    sanitized = sanitized.replace(/[ \t]+/g, ' '); // Normalize spaces/tabs

    // Trim each line
    sanitized = sanitized
      .split('\n')
      .map(line => line.trim())
      .join('\n');

    // Final trim
    sanitized = sanitized.trim();

    return sanitized;
  }

  createPromptFromClipboard(changeEvent) {
    // First process and validate the clipboard text
    const processedData = this.processAndValidateClipboardText(changeEvent);
    const content = processedData.processedContent;
    const contentType = processedData.contentType;

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
    // console.log(`Sending ${event} to renderer:`, {
    //   hasMainWindow: !!this.mainWindow,
    //   hasWebContents: !!(this.mainWindow && this.mainWindow.webContents),
    //   dataKeys: data ? Object.keys(data) : 'no data',
    // });

    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(event, data);
    } else {
      console.error(
        `Cannot send ${event}: mainWindow or webContents not available`
      );
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

  // Process question with AI backend
  processQuestion(question) {
    console.log('Processing question:', question);

    if (!this.currentService) {
      console.error('No AI service available');
      this.sendToRenderer('error-message', {
        error: 'No AI service available. Please check your settings.',
      });
      return;
    }

    // Create a prompt from the question
    const prompt = `Question: ${question}\n\nPlease provide a helpful and informative response.`;

    // Generate response using the current service
    this.currentService
      .generateResponse(prompt)
      .then(result => {
        console.log('Question processed successfully');
        this.sendToRenderer('ai-response-completed', {
          backend: this.currentService.name,
          model: this.backendConfig.model,
          contentType: 'text',
          response: result.response,
        });
      })
      .catch(error => {
        console.error('Error processing question:', error);
        this.sendToRenderer('error-message', {
          error: `Failed to process question: ${error.message}`,
        });
      });
  }
}

// Create the application instance
let overlayAssistant;

app.on('ready', () => {
  overlayAssistant = new AIOverlayAssistant();
});

// Export for potential use in other modules
module.exports = { AIOverlayAssistant };
