const EventEmitter = require('events');

class OllamaService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = 'http://localhost:11434/api';
    this.defaultModel = 'gpt-oss:20b';
    this.currentModel = this.defaultModel;
    this.isConnected = false;
    this.availableModels = [];
    this.requestTimeout = 120000; // 2 minutes for large models
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    try {
      await this.checkConnection();
      await this.loadAvailableModels();
      this.isConnected = true;
      this.emit('initialized', {
        connected: true,
        models: this.availableModels,
        currentModel: this.currentModel,
      });
      return true;
    } catch (error) {
      this.isConnected = false;
      this.emit('error', {
        type: 'initialization-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.emit('connection-checked', {
        connected: true,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      this.emit('connection-checked', {
        connected: false,
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  async loadAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.availableModels = data.models.map(model => ({
        name: model.name,
        size: model.size,
        modified: model.modified_at,
        details: model.details,
      }));

      this.emit('models-loaded', {
        models: this.availableModels,
        count: this.availableModels.length,
        timestamp: Date.now(),
      });

      return this.availableModels;
    } catch (error) {
      this.emit('error', {
        type: 'models-load-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  async setModel(modelName) {
    if (!this.availableModels.find(m => m.name === modelName)) {
      throw new Error(`Model '${modelName}' not found`);
    }

    this.currentModel = modelName;
    this.emit('model-changed', {
      model: modelName,
      timestamp: Date.now(),
    });

    return modelName;
  }

  async generateResponse(prompt, options = {}) {
    const {
      model = this.currentModel,
      stream = true,
      temperature = 0.7,
      topP = 0.9,
      maxTokens = 500,
      stopSequences = [],
    } = options;

    if (!this.isConnected) {
      const error = new Error('Ollama service not connected');
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
      model: model,
      prompt: prompt,
      stream: stream,
      options: {
        temperature: temperature,
        top_p: topP,
        num_predict: maxTokens,
      },
    };

    if (stopSequences.length > 0) {
      requestBody.options.stop = stopSequences;
    }

    this.emit('generation-started', {
      model: model,
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

        const response = await fetch(`${this.baseUrl}/generate`, {
          method: 'POST',
          headers: {
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
            model: model,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        } else if (error.message.includes('HTTP 404')) {
          this.emit('error', {
            type: 'model-not-found',
            error: `Model '${model}' not found`,
            model: model,
            timestamp: Date.now(),
          });
          throw error; // Don't retry for model not found
        } else if (error.message.includes('HTTP 500')) {
          this.emit('error', {
            type: 'server-error',
            error: 'Ollama server internal error',
            model: model,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        } else {
          this.emit('error', {
            type: 'generation-failed',
            error: error.message,
            model: model,
            retryCount: retryCount,
            timestamp: Date.now(),
          });
        }

        if (retryCount > maxRetries) {
          throw new Error(
            `Failed after ${maxRetries} retries: ${error.message}`
          );
        }

        // Wait before retrying with exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async handleStreamingResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let isComplete = false;

    try {
      while (!isComplete) {
        const { done, value } = await reader.read();

        if (done) {
          isComplete = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.response) {
              fullResponse += data.response;
              this.emit('token-received', {
                token: data.response,
                fullResponse: fullResponse,
                done: data.done || false,
                timestamp: Date.now(),
              });
            }

            if (data.done) {
              isComplete = true;
              this.emit('generation-completed', {
                fullResponse: fullResponse,
                model: data.model,
                usage: data.usage,
                timestamp: Date.now(),
              });
              break;
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming response:', parseError);
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
    } finally {
      reader.releaseLock();
    }
  }

  async handleNonStreamingResponse(response) {
    try {
      const data = await response.json();

      this.emit('generation-completed', {
        fullResponse: data.response,
        model: data.model,
        usage: data.usage,
        timestamp: Date.now(),
      });

      return {
        response: data.response,
        isComplete: true,
        model: data.model,
      };
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
      const response = await fetch(`${this.baseUrl}/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return !!data.model;
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      currentModel: this.currentModel,
      availableModels: this.availableModels,
      defaultModel: this.defaultModel,
      requestTimeout: this.requestTimeout,
      maxRetries: this.maxRetries,
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
        return errorJson.error || errorJson.message || response.statusText;
      } catch {
        return errorText || response.statusText;
      }
    } catch {
      return response.statusText;
    }
  }

  getErrorType(error) {
    if (error.name === 'AbortError') return 'timeout';
    if (error.message.includes('HTTP 404')) return 'model-not-found';
    if (error.message.includes('HTTP 500')) return 'server-error';
    if (error.message.includes('not connected')) return 'service-not-connected';
    if (error.message.includes('Empty prompt')) return 'invalid-prompt';
    return 'generation-failed';
  }
}

module.exports = OllamaService;
