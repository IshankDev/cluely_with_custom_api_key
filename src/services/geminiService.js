const { EventEmitter } = require('events');
const SecureStorageService = require('./secureStorage');

class GeminiService extends EventEmitter {
  constructor(secureStorageService = null) {
    super();

    // API Configuration
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = 'gemini-1.5-flash-002'; // Fast model for better UX
    this.currentModel = this.defaultModel;
    this.secureStorage = secureStorageService;
    this.apiKey = null; // Will be loaded from secure storage
    this.isConnected = false;
    this.requestTimeout = 60000; // 60 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay

    // Available models (we'll populate this dynamically)
    this.availableModels = [
      {
        name: 'gemini-1.5-flash-002',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast, efficient model for quick responses',
        contextWindow: '1M tokens',
        multimodal: true,
      },
      {
        name: 'gemini-1.5-pro-latest',
        displayName: 'Gemini 1.5 Pro',
        description: 'General-purpose model with advanced capabilities',
        contextWindow: '1M tokens',
        multimodal: true,
      },
      {
        name: 'gemini-2.0-flash-live-preview-04-09',
        displayName: 'Gemini 2.0 Flash',
        description: 'Latest model with agentic features',
        contextWindow: '1M tokens',
        multimodal: true,
      },
    ];
  }

  async initialize() {
    try {
      console.log('Initializing Gemini service...');

      // Load API key from secure storage
      if (this.secureStorage) {
        this.apiKey = this.secureStorage.retrieveGeminiApiKey();
        if (!this.apiKey) {
          throw new Error(
            'Gemini API key not found in secure storage. Please configure your API key first.'
          );
        }
      } else {
        // Fallback to environment variable for backward compatibility
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey || this.apiKey.trim() === '') {
          throw new Error(
            'GEMINI_API_KEY not found in environment variables or secure storage'
          );
        }
      }

      // Validate API key format
      if (!this.validateApiKeyFormat(this.apiKey)) {
        throw new Error('Invalid Gemini API key format');
      }

      // Test connection
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Gemini API');
      }

      this.isConnected = true;

      this.emit('initialized', {
        model: this.currentModel,
        availableModels: this.availableModels,
        hasSecureStorage: !!this.secureStorage,
        timestamp: Date.now(),
      });

      console.log('Gemini service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      this.emit('error', {
        type: 'initialization-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Update the API key and store it securely
   * @param {string} newApiKey - The new API key
   * @returns {boolean} - Success status
   */
  async updateApiKey(newApiKey) {
    try {
      if (
        !newApiKey ||
        typeof newApiKey !== 'string' ||
        newApiKey.trim().length === 0
      ) {
        throw new Error('Invalid API key provided');
      }

      // Validate API key format
      if (!this.validateApiKeyFormat(newApiKey)) {
        throw new Error('Invalid API key format');
      }

      // Store in secure storage if available
      if (this.secureStorage) {
        const stored = this.secureStorage.storeGeminiApiKey(newApiKey);
        if (!stored) {
          throw new Error('Failed to store API key securely');
        }
      }

      // Update the current API key
      this.apiKey = newApiKey;

      // Test the new API key
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Gemini API with new key');
      }

      this.isConnected = true;

      this.emit('api-key-updated', {
        timestamp: Date.now(),
      });

      console.log('API key updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update API key:', error);
      this.emit('error', {
        type: 'api-key-update-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - The API key to validate
   * @returns {boolean} - Whether the API key format is valid
   */
  validateApiKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 20) {
      return false;
    }

    // Basic Gemini API key validation (starts with AI and is reasonably long)
    // Additional validation can be added based on specific requirements
    return true;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'X-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.emit('connection-checked', {
        connected: true,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Gemini connection check failed:', error);
      this.emit('connection-checked', {
        connected: false,
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  setModel(modelName) {
    const model = this.availableModels.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model '${modelName}' not found`);
    }

    this.currentModel = modelName;
    this.emit('model-changed', {
      model: modelName,
      timestamp: Date.now(),
    });

    return true;
  }

  async generateResponse(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1024,
      topP = 0.9,
      topK = 40,
      stream = true,
    } = options;

    if (!this.isConnected) {
      const error = new Error('Gemini service not connected');
      this.emit('error', {
        type: 'service-not-connected',
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }

    if (!prompt || prompt.trim().length === 0) {
      const error = new Error('Empty prompt provided');
      this.emit('error', {
        type: 'invalid-prompt',
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: temperature,
        topP: topP,
        topK: topK,
        maxOutputTokens: maxTokens,
      },
    };

    this.emit('generation-started', {
      model: this.currentModel,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      options: options,
      timestamp: Date.now(),
    });

    let retryCount = 0;
    const maxRetries = this.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.requestTimeout
        );

        const endpoint = stream
          ? `${this.baseUrl}/models/${this.currentModel}:streamGenerateContent`
          : `${this.baseUrl}/models/${this.currentModel}:generateContent`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMessage = await this.getErrorMessage(response);
          throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }

        if (stream) {
          return this.handleStreamingResponse(response);
        } else {
          return this.handleNonStreamingResponse(response);
        }
      } catch (error) {
        retryCount++;

        if (error.name === 'AbortError') {
          this.emit('error', {
            type: 'timeout',
            error: `Request timed out after ${this.requestTimeout}ms`,
            model: this.currentModel,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        } else if (error.message.includes('HTTP 401')) {
          this.emit('error', {
            type: 'invalid-api-key',
            error: 'Invalid API key provided',
            model: this.currentModel,
            timestamp: Date.now(),
          });
          throw error; // Don't retry for invalid API key
        } else if (error.message.includes('HTTP 429')) {
          this.emit('error', {
            type: 'rate-limited',
            error: 'Rate limit exceeded',
            model: this.currentModel,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        } else if (error.message.includes('HTTP 400')) {
          this.emit('error', {
            type: 'invalid-request',
            error: 'Invalid request parameters',
            model: this.currentModel,
            timestamp: Date.now(),
          });
          throw error; // Don't retry for invalid requests
        } else {
          this.emit('error', {
            type: 'generation-failed',
            error: error.message,
            model: this.currentModel,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        }

        if (retryCount > maxRetries) {
          throw new Error(
            `Failed after ${maxRetries} retries: ${error.message}`
          );
        }

        const delay = this.retryDelay * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async handleStreamingResponse(response) {
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse multiple JSON objects separated by commas
        const jsonObjects = this.parseStreamingJSON(buffer);

        for (const data of jsonObjects) {
          if (
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content
          ) {
            const content = data.candidates[0].content.parts[0].text;
            if (content) {
              fullResponse += content;
              this.emit('token-received', {
                token: content,
                model: this.currentModel,
                timestamp: Date.now(),
              });
            }
          }

          // Check if generation is complete
          if (
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].finishReason
          ) {
            this.emit('generation-completed', {
              fullResponse: fullResponse,
              model: this.currentModel,
              finishReason: data.candidates[0].finishReason,
              timestamp: Date.now(),
            });
            return {
              response: fullResponse,
              isComplete: true,
              model: this.currentModel,
            };
          }
        }
      }

      return {
        response: fullResponse,
        isComplete: true,
        model: this.currentModel,
      };
    } catch (error) {
      this.emit('error', {
        type: 'streaming-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  parseStreamingJSON(buffer) {
    const objects = [];
    let currentObject = '';
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];

      if (escapeNext) {
        currentObject += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentObject += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }

      currentObject += char;

      if (braceCount === 0 && currentObject.trim()) {
        try {
          const parsed = JSON.parse(currentObject.trim());
          objects.push(parsed);
        } catch (e) {
          // Skip malformed JSON
        }
        currentObject = '';
      }
    }

    return objects;
  }

  async handleNonStreamingResponse(response) {
    try {
      const data = await response.json();

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const fullResponse = data.candidates[0].content.parts[0].text;

        this.emit('generation-completed', {
          fullResponse: fullResponse,
          model: this.currentModel,
          finishReason: data.candidates[0].finishReason,
          timestamp: Date.now(),
        });

        return {
          response: fullResponse,
          isComplete: true,
          model: this.currentModel,
        };
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      this.emit('error', {
        type: 'response-parsing-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  async validateModel(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/models/${modelName}`, {
        method: 'GET',
        headers: {
          'X-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      return response.ok;
    } catch (error) {
      console.error('Model validation failed:', error);
      return false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      model: this.currentModel,
      availableModels: this.availableModels,
      apiKeyConfigured: !!this.apiKey,
    };
  }

  getAvailableModels() {
    return this.availableModels;
  }

  getCurrentModel() {
    return this.currentModel;
  }

  isModelAvailable(modelName) {
    return this.availableModels.some(model => model.name === modelName);
  }

  async healthCheck() {
    try {
      await this.checkConnection();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getErrorMessage(response) {
    try {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        return (
          errorJson.error?.message || errorJson.message || response.statusText
        );
      } catch {
        return errorText || response.statusText;
      }
    } catch {
      return response.statusText;
    }
  }

  getErrorType(error) {
    if (error.name === 'AbortError') return 'timeout';
    if (error.message.includes('HTTP 401')) return 'invalid-api-key';
    if (error.message.includes('HTTP 429')) return 'rate-limited';
    if (error.message.includes('HTTP 400')) return 'invalid-request';
    if (error.message.includes('not connected')) return 'service-not-connected';
    if (error.message.includes('Empty prompt')) return 'invalid-prompt';
    return 'generation-failed';
  }
}

module.exports = GeminiService;
