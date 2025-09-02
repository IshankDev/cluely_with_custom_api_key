const { safeStorage } = require('electron');
const Store = require('electron-store');
const { EventEmitter } = require('events');

class SecureStorageService extends EventEmitter {
  constructor() {
    super();

    // Initialize electron-store for persistence
    this.store = new Store({
      name: 'secure-config',
      encryptionKey: null, // We'll handle encryption ourselves with safeStorage
    });

    // Storage keys
    this.KEYS = {
      GEMINI_API_KEY: 'gemini_api_key',
      BACKEND_CONFIG: 'backend_config',
    };

    // Platform detection for security warnings
    this.platform = process.platform;
    this.storageBackend = null;

    this.initialize();
  }

  initialize() {
    try {
      // Check storage backend for security assessment
      this.checkStorageBackend();

      console.log('SecureStorageService initialized successfully');
      this.emit('initialized', {
        platform: this.platform,
        storageBackend: this.storageBackend,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize SecureStorageService:', error);
      this.emit('error', {
        type: 'initialization-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  checkStorageBackend() {
    try {
      // Get the selected storage backend for security assessment
      this.storageBackend = safeStorage.getSelectedStorageBackend();

      console.log(`Storage backend: ${this.storageBackend}`);

      // Platform-specific security assessment and user guidance
      this.assessPlatformSecurity();

      return this.storageBackend;
    } catch (error) {
      console.error('Failed to check storage backend:', error);
      throw error;
    }
  }

  assessPlatformSecurity() {
    const assessment = {
      platform: this.platform,
      storageBackend: this.storageBackend,
      securityLevel: 'high',
      warnings: [],
      recommendations: [],
    };

    switch (this.platform) {
      case 'darwin': // macOS
        if (this.storageBackend === 'keychain') {
          assessment.securityLevel = 'high';
          assessment.recommendations.push(
            'macOS Keychain Access provides strong encryption'
          );
        } else {
          assessment.securityLevel = 'medium';
          assessment.warnings.push('Not using macOS Keychain Access');
          assessment.recommendations.push(
            'Consider enabling Keychain Access for better security'
          );
        }
        break;

      case 'win32': // Windows
        if (this.storageBackend === 'dpapi') {
          assessment.securityLevel = 'high';
          assessment.recommendations.push(
            'Windows DPAPI provides strong encryption'
          );
        } else {
          assessment.securityLevel = 'medium';
          assessment.warnings.push('Not using Windows DPAPI');
          assessment.recommendations.push(
            'Consider enabling DPAPI for better security'
          );
        }
        break;

      case 'linux':
        if (this.storageBackend === 'basic_text') {
          assessment.securityLevel = 'low';
          assessment.warnings.push(
            'Using basic text encryption - no secret store available'
          );
          assessment.recommendations.push(
            'Install kwallet or gnome-libsecret for better security'
          );
          assessment.recommendations.push(
            'Consider using a password manager for API key storage'
          );
        } else if (this.storageBackend === 'secret_service') {
          assessment.securityLevel = 'high';
          assessment.recommendations.push(
            'Linux Secret Service provides strong encryption'
          );
        } else {
          assessment.securityLevel = 'medium';
          assessment.warnings.push('Unknown storage backend on Linux');
          assessment.recommendations.push('Verify secret store installation');
        }
        break;

      default:
        assessment.securityLevel = 'unknown';
        assessment.warnings.push('Unknown platform');
        assessment.recommendations.push('Verify platform compatibility');
    }

    // Emit security assessment
    this.emit('security-assessment', assessment);

    // Warn if using basic text encryption (less secure)
    if (this.storageBackend === 'basic_text') {
      const warning = {
        type: 'basic-text-encryption',
        message: 'Using basic text encryption instead of OS keychain',
        platform: this.platform,
        securityLevel: assessment.securityLevel,
        recommendations: assessment.recommendations,
        timestamp: Date.now(),
      };

      console.warn('SECURITY WARNING:', warning.message);
      this.emit('security-warning', warning);
    }

    return assessment;
  }

  /**
   * Securely store an API key with enhanced validation and error handling
   * @param {string} keyName - The name/key identifier
   * @param {string} apiKey - The API key to store
   * @param {Object} options - Additional options
   * @returns {Object} - Result with success status and details
   */
  async storeApiKey(keyName, apiKey, options = {}) {
    const result = {
      success: false,
      error: null,
      details: {},
    };

    try {
      // Input validation
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('Invalid API key provided');
      }

      // Enhanced format validation
      const validation = this.validateApiKeyFormat(apiKey);
      if (!validation.isValid) {
        throw new Error(
          `API key format validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn(`API key warnings: ${validation.warnings.join(', ')}`);
        result.details.warnings = validation.warnings;
      }

      // Test API key against Gemini API if requested
      if (options.testAgainstApi) {
        console.log('Testing API key against Gemini API...');
        const apiTest = await this.testApiKeyAgainstGemini(apiKey);
        if (!apiTest.isValid) {
          throw new Error(`API key test failed: ${apiTest.error}`);
        }
        result.details.apiTest = apiTest.details;
      }

      // Encrypt the API key using safeStorage
      const encryptedBuffer = safeStorage.encryptString(apiKey);

      // Convert buffer to string for storage in electron-store
      const encryptedString = encryptedBuffer.toString('latin1');

      // Store the encrypted string
      this.store.set(keyName, encryptedString);

      console.log(`API key stored securely: ${keyName}`);
      this.emit('api-key-stored', {
        keyName,
        timestamp: Date.now(),
        storageBackend: this.storageBackend,
        warnings: validation.warnings,
      });

      result.success = true;
      result.details = {
        keyName,
        storageBackend: this.storageBackend,
        timestamp: Date.now(),
        ...result.details,
      };

      return result;
    } catch (error) {
      console.error(`Failed to store API key ${keyName}:`, error);
      result.error = error.message;

      this.emit('error', {
        type: 'store-failed',
        keyName,
        error: error.message,
        timestamp: Date.now(),
      });

      return result;
    }
  }

  /**
   * Retrieve and decrypt an API key
   * @param {string} keyName - The name/key identifier
   * @returns {string|null} - The decrypted API key or null if not found/invalid
   */
  retrieveApiKey(keyName) {
    try {
      // Get the encrypted string from storage
      const encryptedString = this.store.get(keyName);

      if (!encryptedString) {
        console.log(`No API key found for: ${keyName}`);
        return null;
      }

      // Convert string back to buffer
      const encryptedBuffer = Buffer.from(encryptedString, 'latin1');

      // Decrypt using safeStorage
      const decryptedApiKey = safeStorage.decryptString(encryptedBuffer);

      console.log(`API key retrieved successfully: ${keyName}`);
      this.emit('api-key-retrieved', {
        keyName,
        timestamp: Date.now(),
        storageBackend: this.storageBackend,
      });

      return decryptedApiKey;
    } catch (error) {
      console.error(`Failed to retrieve API key ${keyName}:`, error);
      this.emit('error', {
        type: 'retrieve-failed',
        keyName,
        error: error.message,
        timestamp: Date.now(),
      });
      return null;
    }
  }

  /**
   * Delete an API key from storage
   * @param {string} keyName - The name/key identifier
   * @returns {boolean} - Success status
   */
  deleteApiKey(keyName) {
    try {
      const exists = this.store.has(keyName);

      if (exists) {
        this.store.delete(keyName);
        console.log(`API key deleted: ${keyName}`);
        this.emit('api-key-deleted', {
          keyName,
          timestamp: Date.now(),
        });
        return true;
      } else {
        console.log(`API key not found for deletion: ${keyName}`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to delete API key ${keyName}:`, error);
      this.emit('error', {
        type: 'delete-failed',
        keyName,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Check if an API key exists
   * @param {string} keyName - The name/key identifier
   * @returns {boolean} - Whether the key exists
   */
  hasApiKey(keyName) {
    return this.store.has(keyName);
  }

  /**
   * Store Gemini API key specifically with enhanced validation
   * @param {string} apiKey - The Gemini API key
   * @param {Object} options - Additional options
   * @returns {Object} - Result with success status and details
   */
  async storeGeminiApiKey(apiKey, options = {}) {
    // Default to testing against API for Gemini keys
    const defaultOptions = {
      testAgainstApi: true,
      ...options,
    };

    return await this.storeApiKey(
      this.KEYS.GEMINI_API_KEY,
      apiKey,
      defaultOptions
    );
  }

  /**
   * Retrieve Gemini API key specifically
   * @returns {string|null} - The Gemini API key or null if not found
   */
  retrieveGeminiApiKey() {
    return this.retrieveApiKey(this.KEYS.GEMINI_API_KEY);
  }

  /**
   * Delete Gemini API key specifically
   * @returns {boolean} - Success status
   */
  deleteGeminiApiKey() {
    return this.deleteApiKey(this.KEYS.GEMINI_API_KEY);
  }

  /**
   * Check if Gemini API key exists
   * @returns {boolean} - Whether the Gemini API key exists
   */
  hasGeminiApiKey() {
    return this.hasApiKey(this.KEYS.GEMINI_API_KEY);
  }

  /**
   * Store backend configuration securely
   * @param {Object} config - The backend configuration object
   * @returns {boolean} - Success status
   */
  storeBackendConfig(config) {
    try {
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid backend configuration provided');
      }

      // Encrypt the configuration
      const configString = JSON.stringify(config);
      const encryptedBuffer = safeStorage.encryptString(configString);
      const encryptedString = encryptedBuffer.toString('latin1');

      // Store the encrypted configuration
      this.store.set(this.KEYS.BACKEND_CONFIG, encryptedString);

      console.log('Backend configuration stored securely');
      this.emit('backend-config-stored', {
        timestamp: Date.now(),
        storageBackend: this.storageBackend,
      });

      return true;
    } catch (error) {
      console.error('Failed to store backend configuration:', error);
      this.emit('error', {
        type: 'config-store-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Retrieve backend configuration
   * @returns {Object|null} - The backend configuration or null if not found
   */
  retrieveBackendConfig() {
    try {
      const encryptedString = this.store.get(this.KEYS.BACKEND_CONFIG);

      if (!encryptedString) {
        console.log('No backend configuration found');
        return null;
      }

      // Decrypt the configuration
      const encryptedBuffer = Buffer.from(encryptedString, 'latin1');
      const decryptedString = safeStorage.decryptString(encryptedBuffer);

      const config = JSON.parse(decryptedString);

      console.log('Backend configuration retrieved successfully');
      this.emit('backend-config-retrieved', {
        timestamp: Date.now(),
        storageBackend: this.storageBackend,
      });

      return config;
    } catch (error) {
      console.error('Failed to retrieve backend configuration:', error);
      this.emit('error', {
        type: 'config-retrieve-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return null;
    }
  }

  /**
   * Get storage status and security information
   * @returns {Object} - Storage status information
   */
  getStatus() {
    return {
      platform: this.platform,
      storageBackend: this.storageBackend,
      isSecure: this.storageBackend !== 'basic_text',
      hasGeminiApiKey: this.hasGeminiApiKey(),
      hasBackendConfig: this.store.has(this.KEYS.BACKEND_CONFIG),
      timestamp: Date.now(),
    };
  }

  /**
   * Validate API key format (enhanced validation)
   * @param {string} apiKey - The API key to validate
   * @returns {Object} - Validation result with status and details
   */
  validateApiKeyFormat(apiKey) {
    const result = {
      isValid: false,
      errors: [],
      warnings: [],
    };

    // Basic type and presence checks
    if (!apiKey || typeof apiKey !== 'string') {
      result.errors.push('API key must be a non-empty string');
      return result;
    }

    const trimmedKey = apiKey.trim();

    // Length validation
    if (trimmedKey.length < 20) {
      result.errors.push('API key is too short (minimum 20 characters)');
      return result;
    }

    if (trimmedKey.length > 100) {
      result.warnings.push('API key is unusually long');
    }

    // Gemini API key specific validation
    // Gemini API keys typically start with "AI" and contain alphanumeric characters
    if (!trimmedKey.startsWith('AI')) {
      result.errors.push('Gemini API key should start with "AI"');
      return result;
    }

    // Check for valid characters (alphanumeric and some special characters)
    const validPattern = /^[A-Za-z0-9_-]+$/;
    if (!validPattern.test(trimmedKey)) {
      result.errors.push('API key contains invalid characters');
      return result;
    }

    // Check for common patterns that might indicate invalid keys
    if (trimmedKey.includes(' ')) {
      result.errors.push('API key should not contain spaces');
      return result;
    }

    if (
      trimmedKey.toLowerCase().includes('example') ||
      trimmedKey.toLowerCase().includes('test') ||
      trimmedKey.toLowerCase().includes('demo')
    ) {
      result.warnings.push('API key appears to be a test/demo key');
    }

    // If we get here, the key format is valid
    result.isValid = true;
    return result;
  }

  /**
   * Test API key against Gemini API for correctness
   * @param {string} apiKey - The API key to test
   * @returns {Promise<Object>} - Test result with status and details
   */
  async testApiKeyAgainstGemini(apiKey) {
    const result = {
      isValid: false,
      error: null,
      details: {},
    };

    try {
      // Make a simple request to the Gemini API to test the key
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        {
          method: 'GET',
          headers: {
            'X-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (response.ok) {
        result.isValid = true;
        result.details = {
          status: response.status,
          statusText: response.statusText,
          message: 'API key is valid and has access to Gemini API',
        };
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;

        // Provide specific error messages based on status codes
        switch (response.status) {
          case 400:
            result.error = 'Invalid API key format';
            break;
          case 401:
            result.error = 'API key is invalid or expired';
            break;
          case 403:
            result.error =
              'API key does not have permission to access Gemini API';
            break;
          case 429:
            result.error = 'API rate limit exceeded';
            break;
          default:
            result.error = `API request failed: ${response.statusText}`;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        result.error = 'API request timed out';
      } else if (
        error.name === 'TypeError' &&
        error.message.includes('fetch')
      ) {
        result.error = 'Network error - unable to reach Gemini API';
      } else {
        result.error = `Unexpected error: ${error.message}`;
      }
    }

    return result;
  }

  /**
   * Retry API key operation with exponential backoff
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise<Object>} - Result of the operation
   */
  async retryOperation(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = error => {
        // Retry on network errors, timeouts, and rate limits
        return (
          error.message.includes('timeout') ||
          error.message.includes('network') ||
          error.message.includes('rate limit') ||
          error.message.includes('temporary')
        );
      },
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        console.log(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Validate and test stored API key with retry logic
   * @param {string} keyName - The name/key identifier
   * @returns {Promise<Object>} - Validation result
   */
  async validateStoredApiKey(keyName) {
    const result = {
      isValid: false,
      error: null,
      details: {},
    };

    try {
      // Retrieve the API key
      const apiKey = this.retrieveApiKey(keyName);
      if (!apiKey) {
        result.error = 'API key not found in storage';
        return result;
      }

      // Validate format
      const formatValidation = this.validateApiKeyFormat(apiKey);
      if (!formatValidation.isValid) {
        result.error = `Format validation failed: ${formatValidation.errors.join(', ')}`;
        result.details.formatErrors = formatValidation.errors;
        result.details.warnings = formatValidation.warnings;
        return result;
      }

      // Test against API with retry logic
      const apiTest = await this.retryOperation(
        () => this.testApiKeyAgainstGemini(apiKey),
        {
          maxRetries: 2,
          baseDelay: 2000,
          shouldRetry: error => {
            return (
              error.message.includes('timeout') ||
              error.message.includes('rate limit') ||
              error.message.includes('network')
            );
          },
        }
      );

      if (apiTest.isValid) {
        result.isValid = true;
        result.details = {
          formatValidation,
          apiTest: apiTest.details,
          timestamp: Date.now(),
        };
      } else {
        result.error = apiTest.error;
        result.details.apiTest = apiTest;
      }
    } catch (error) {
      result.error = error.message;
      result.details.error = error;
    }

    return result;
  }

  /**
   * Migrate API key from environment variable to secure storage
   * @param {string} keyName - The name/key identifier
   * @param {string} envVarName - The environment variable name
   * @returns {Object} - Migration result
   */
  migrateFromEnvironment(keyName, envVarName = 'GEMINI_API_KEY') {
    const result = {
      success: false,
      migrated: false,
      error: null,
      details: {},
    };

    try {
      // Check if key already exists in secure storage
      if (this.hasApiKey(keyName)) {
        result.error = 'API key already exists in secure storage';
        result.details.existing = true;
        return result;
      }

      // Get API key from environment variable
      const envApiKey = process.env[envVarName];
      if (!envApiKey || envApiKey.trim().length === 0) {
        result.error = `Environment variable ${envVarName} not found or empty`;
        return result;
      }

      // Validate the API key format
      const validation = this.validateApiKeyFormat(envApiKey);
      if (!validation.isValid) {
        result.error = `Invalid API key format: ${validation.errors.join(', ')}`;
        result.details.validationErrors = validation.errors;
        return result;
      }

      // Store the API key securely
      const storeResult = this.storeApiKey(keyName, envApiKey);
      if (storeResult.success) {
        result.success = true;
        result.migrated = true;
        result.details = {
          source: 'environment',
          envVarName,
          timestamp: Date.now(),
        };

        console.log(
          `Successfully migrated API key from environment variable ${envVarName}`
        );
        this.emit('api-key-migrated', result.details);
      } else {
        result.error = storeResult.error;
        result.details = storeResult.details;
      }
    } catch (error) {
      result.error = error.message;
      console.error('Migration failed:', error);
    }

    return result;
  }

  /**
   * Export API key for backup (encrypted)
   * @param {string} keyName - The name/key identifier
   * @returns {Object} - Export result
   */
  exportApiKey(keyName) {
    const result = {
      success: false,
      data: null,
      error: null,
    };

    try {
      const apiKey = this.retrieveApiKey(keyName);
      if (!apiKey) {
        result.error = 'API key not found';
        return result;
      }

      // Create export data with metadata
      const exportData = {
        keyName,
        platform: this.platform,
        storageBackend: this.storageBackend,
        exportTimestamp: Date.now(),
        encryptedData: this.store.get(keyName), // Already encrypted
      };

      result.success = true;
      result.data = exportData;

      console.log(`API key exported: ${keyName}`);
      this.emit('api-key-exported', {
        keyName,
        timestamp: Date.now(),
      });
    } catch (error) {
      result.error = error.message;
      console.error('Export failed:', error);
    }

    return result;
  }

  /**
   * Import API key from backup
   * @param {Object} exportData - The exported data
   * @returns {Object} - Import result
   */
  importApiKey(exportData) {
    const result = {
      success: false,
      imported: false,
      error: null,
      details: {},
    };

    try {
      // Validate export data
      if (!exportData || !exportData.keyName || !exportData.encryptedData) {
        result.error = 'Invalid export data format';
        return result;
      }

      // Check if key already exists
      if (this.hasApiKey(exportData.keyName)) {
        result.error = 'API key already exists in secure storage';
        result.details.existing = true;
        return result;
      }

      // Store the encrypted data directly
      this.store.set(exportData.keyName, exportData.encryptedData);

      result.success = true;
      result.imported = true;
      result.details = {
        keyName: exportData.keyName,
        sourcePlatform: exportData.platform,
        importTimestamp: Date.now(),
      };

      console.log(`API key imported: ${exportData.keyName}`);
      this.emit('api-key-imported', result.details);
    } catch (error) {
      result.error = error.message;
      console.error('Import failed:', error);
    }

    return result;
  }

  /**
   * Get platform-specific security recommendations
   * @returns {Object} - Security recommendations
   */
  getSecurityRecommendations() {
    const recommendations = {
      platform: this.platform,
      storageBackend: this.storageBackend,
      securityLevel: 'unknown',
      recommendations: [],
      warnings: [],
    };

    switch (this.platform) {
      case 'darwin': // macOS
        recommendations.securityLevel =
          this.storageBackend === 'keychain' ? 'high' : 'medium';
        recommendations.recommendations.push(
          'Use macOS Keychain Access for maximum security'
        );
        recommendations.recommendations.push(
          'Enable FileVault for disk encryption'
        );
        recommendations.recommendations.push(
          'Keep macOS updated for security patches'
        );
        break;

      case 'win32': // Windows
        recommendations.securityLevel =
          this.storageBackend === 'dpapi' ? 'high' : 'medium';
        recommendations.recommendations.push(
          'Use Windows DPAPI for maximum security'
        );
        recommendations.recommendations.push(
          'Enable BitLocker for disk encryption'
        );
        recommendations.recommendations.push(
          'Keep Windows updated for security patches'
        );
        break;

      case 'linux':
        if (this.storageBackend === 'basic_text') {
          recommendations.securityLevel = 'low';
          recommendations.warnings.push(
            'Using basic text encryption - consider installing a secret store'
          );
          recommendations.recommendations.push(
            'Install kwallet (KDE) or gnome-libsecret (GNOME)'
          );
          recommendations.recommendations.push(
            'Use a password manager for additional security'
          );
        } else {
          recommendations.securityLevel = 'high';
          recommendations.recommendations.push(
            'Linux Secret Service provides strong encryption'
          );
        }
        recommendations.recommendations.push('Use full disk encryption (LUKS)');
        recommendations.recommendations.push(
          'Keep system updated for security patches'
        );
        break;

      default:
        recommendations.securityLevel = 'unknown';
        recommendations.warnings.push(
          'Unknown platform - security level uncertain'
        );
    }

    return recommendations;
  }

  /**
   * Clear all stored data (use with caution)
   * @returns {boolean} - Success status
   */
  clearAll() {
    try {
      this.store.clear();
      console.log('All secure storage cleared');
      this.emit('storage-cleared', {
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      this.emit('error', {
        type: 'clear-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }
}

module.exports = SecureStorageService;
