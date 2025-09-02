const { clipboard } = require('electron');
const EventEmitter = require('events');

class ClipboardMonitor extends EventEmitter {
  constructor() {
    super();

    // Initialize state
    this.isMonitoring = false;
    this.pollingInterval = null;
    this.previousValue = '';
    this.pollingIntervalMs = 1000; // Default 1 second
    this.lastChangeTime = 0;
    this.minChangeInterval = 500; // Minimum 500ms between changes

    // Performance optimization settings
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.retryCount = 0;
    this.lastPollTime = 0;
    this.pollCount = 0;
    this.changeCount = 0;

    // Resource management
    this.isPaused = false;
    this.pauseThreshold = 30000; // 30 seconds of inactivity
    this.resumeThreshold = 5000; // 5 seconds to resume
    this.lastActivityTime = Date.now();

    // Bind methods to preserve context
    this.startMonitoring = this.startMonitoring.bind(this);
    this.stopMonitoring = this.stopMonitoring.bind(this);
    this.pollClipboard = this.pollClipboard.bind(this);
    this.handleClipboardChange = this.handleClipboardChange.bind(this);
    this.optimizePolling = this.optimizePolling.bind(this);
    this.handlePollingError = this.handlePollingError.bind(this);
  }

  /**
   * Start monitoring the clipboard for changes
   * @param {number} intervalMs - Polling interval in milliseconds (default: 1000)
   */
  startMonitoring(intervalMs = 1000) {
    if (this.isMonitoring) {
      console.log('Clipboard monitoring is already active');
      this.emit('monitoring-already-active');
      return false;
    }

    try {
      // Set polling interval
      this.pollingIntervalMs = intervalMs;

      // Get initial clipboard value
      this.previousValue = clipboard.readText() || '';
      this.lastChangeTime = Date.now();

      // Start polling
      this.pollingInterval = setInterval(
        this.pollClipboard,
        this.pollingIntervalMs
      );
      this.isMonitoring = true;

      console.log(
        `Clipboard monitoring started with ${this.pollingIntervalMs}ms interval`
      );

      // Emit comprehensive start event
      this.emit('monitoring-started', {
        intervalMs: this.pollingIntervalMs,
        initialValue: this.previousValue,
        timestamp: Date.now(),
        status: this.getStatus(),
      });

      return true;
    } catch (error) {
      console.error('Failed to start clipboard monitoring:', error);
      this.emit('error', {
        type: 'start-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Stop monitoring the clipboard
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('Clipboard monitoring is not active');
      this.emit('monitoring-not-active');
      return false;
    }

    try {
      // Clear polling interval
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      const finalStatus = this.getStatus();
      this.isMonitoring = false;
      this.previousValue = '';

      console.log('Clipboard monitoring stopped');

      // Emit comprehensive stop event
      this.emit('monitoring-stopped', {
        finalStatus: finalStatus,
        timestamp: Date.now(),
        duration: Date.now() - finalStatus.lastChangeTime,
      });

      return true;
    } catch (error) {
      console.error('Failed to stop clipboard monitoring:', error);
      this.emit('error', {
        type: 'stop-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Poll the clipboard for changes
   */
  pollClipboard() {
    const now = Date.now();

    // Skip if paused
    if (this.isPaused) {
      return;
    }

    // Rate limiting to prevent excessive polling
    if (now - this.lastPollTime < 50) {
      // Minimum 50ms between polls
      return;
    }

    this.lastPollTime = now;
    this.pollCount++;

    try {
      const currentValue = clipboard.readText() || '';

      // Update activity time
      this.lastActivityTime = now;

      // Emit polling event for debugging/monitoring
      this.emit('polling', {
        currentValue: currentValue,
        previousValue: this.previousValue,
        timestamp: now,
        hasChanged: currentValue !== this.previousValue,
        pollCount: this.pollCount,
      });

      // Check if value has changed
      if (currentValue !== this.previousValue) {
        this.handleClipboardChange(currentValue, this.previousValue);
      }

      // Reset retry count on successful poll
      this.retryCount = 0;

      // Optimize polling based on activity
      this.optimizePolling();
    } catch (error) {
      this.handlePollingError(error, now);
    }
  }

  /**
   * Handle polling errors with retry logic
   */
  handlePollingError(error, timestamp) {
    console.error('Error polling clipboard:', error);

    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      console.log(
        `Retrying clipboard poll (${this.retryCount}/${this.maxRetries})`
      );

      // Exponential backoff
      const backoffDelay = this.retryDelay * Math.pow(2, this.retryCount - 1);

      setTimeout(() => {
        this.pollClipboard();
      }, backoffDelay);
    } else {
      console.error('Max retries exceeded, stopping monitoring');
      this.emit('error', {
        type: 'max-retries-exceeded',
        error: error.message,
        timestamp: timestamp,
        retryCount: this.retryCount,
      });

      // Stop monitoring after max retries
      this.stopMonitoring();
    }
  }

  /**
   * Optimize polling based on activity patterns
   */
  optimizePolling() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    // Pause monitoring if no activity for threshold
    if (!this.isPaused && timeSinceLastActivity > this.pauseThreshold) {
      this.isPaused = true;
      console.log('Pausing clipboard monitoring due to inactivity');
      this.emit('monitoring-paused', {
        reason: 'inactivity',
        timestamp: now,
        duration: timeSinceLastActivity,
      });
    }

    // Resume monitoring if activity detected
    if (this.isPaused && timeSinceLastActivity < this.resumeThreshold) {
      this.isPaused = false;
      console.log('Resuming clipboard monitoring');
      this.emit('monitoring-resumed', {
        reason: 'activity-detected',
        timestamp: now,
      });
    }
  }

  /**
   * Handle clipboard content changes
   * @param {string} newValue - New clipboard content
   * @param {string} oldValue - Previous clipboard content
   */
  handleClipboardChange(newValue, oldValue) {
    const now = Date.now();

    // Prevent rapid-fire changes
    if (now - this.lastChangeTime < this.minChangeInterval) {
      console.log('Clipboard change ignored (too frequent)');
      return;
    }

    // Validate and filter changes
    if (!this.isValidClipboardChange(newValue, oldValue)) {
      console.log('Clipboard change ignored (invalid or filtered)');
      return;
    }

    // Update state
    this.previousValue = newValue;
    this.lastChangeTime = now;
    this.changeCount++;

    // Emit change event
    const changeEvent = {
      newValue: newValue,
      oldValue: oldValue,
      timestamp: now,
      isEmpty: !newValue || newValue.trim() === '',
      length: newValue ? newValue.length : 0,
      type: this.detectContentType(newValue),
      isSignificant: this.isSignificantChange(newValue, oldValue),
    };

    console.log('Clipboard change detected:', {
      length: changeEvent.length,
      isEmpty: changeEvent.isEmpty,
      type: changeEvent.type,
      isSignificant: changeEvent.isSignificant,
      timestamp: new Date(now).toISOString(),
    });

    this.emit('clipboard-changed', changeEvent);
  }

  /**
   * Validate if a clipboard change should be processed
   * @param {string} newValue - New clipboard content
   * @param {string} oldValue - Previous clipboard content
   * @returns {boolean} - Whether the change is valid
   */
  isValidClipboardChange(newValue, oldValue) {
    // Skip if new value is null or undefined
    if (newValue === null || newValue === undefined) {
      return false;
    }

    // Skip if new value is empty and old value was also empty
    if (!newValue.trim() && !oldValue.trim()) {
      return false;
    }

    // Skip if new value is too short (likely not meaningful)
    if (newValue.trim().length < 3) {
      return false;
    }

    // Skip if new value is too long (likely not text content)
    if (newValue.length > 10000) {
      return false;
    }

    // Skip if it's the same value (shouldn't happen but safety check)
    if (newValue === oldValue) {
      return false;
    }

    return true;
  }

  /**
   * Detect the type of clipboard content
   * @param {string} content - Clipboard content
   * @returns {string} - Content type
   */
  detectContentType(content) {
    if (!content || !content.trim()) {
      return 'empty';
    }

    const trimmed = content.trim();

    // Check for URLs
    if (/^https?:\/\/.+/.test(trimmed) || /^www\./.test(trimmed)) {
      return 'url';
    }

    // Check for email addresses
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'email';
    }

    // Check for code (basic detection)
    if (
      trimmed.includes('function') ||
      trimmed.includes('const ') ||
      trimmed.includes('var ') ||
      trimmed.includes('let ') ||
      (trimmed.includes('{') && trimmed.includes('}')) ||
      (trimmed.includes('(') && trimmed.includes(')'))
    ) {
      return 'code';
    }

    // Check for long text (likely paragraphs)
    if (trimmed.length > 100 && trimmed.includes('.')) {
      return 'text';
    }

    // Default to short text
    return 'short-text';
  }

  /**
   * Determine if a change is significant enough to process
   * @param {string} newValue - New clipboard content
   * @param {string} oldValue - Previous clipboard content
   * @returns {boolean} - Whether the change is significant
   */
  isSignificantChange(newValue, oldValue) {
    // New content is always significant if old was empty
    if (!oldValue || !oldValue.trim()) {
      return true;
    }

    // Significant if length difference is substantial
    const lengthDiff = Math.abs(newValue.length - oldValue.length);
    const avgLength = (newValue.length + oldValue.length) / 2;

    if (lengthDiff > avgLength * 0.5) {
      return true;
    }

    // Significant if content type changed
    const newType = this.detectContentType(newValue);
    const oldType = this.detectContentType(oldValue);

    if (newType !== oldType) {
      return true;
    }

    // Default to significant for any change
    return true;
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      isPaused: this.isPaused,
      pollingIntervalMs: this.pollingIntervalMs,
      previousValue: this.previousValue,
      lastChangeTime: this.lastChangeTime,
      lastActivityTime: this.lastActivityTime,
      pollCount: this.pollCount,
      changeCount: this.changeCount,
      retryCount: this.retryCount,
      performance: {
        pollsPerMinute: this.calculatePollsPerMinute(),
        changesPerMinute: this.calculateChangesPerMinute(),
        averagePollInterval: this.calculateAveragePollInterval(),
        uptime: Date.now() - this.lastChangeTime,
      },
    };
  }

  /**
   * Calculate polls per minute
   */
  calculatePollsPerMinute() {
    if (this.pollCount === 0) return 0;

    const uptime = Date.now() - this.lastChangeTime;
    const minutes = uptime / 60000;

    return Math.round(this.pollCount / minutes);
  }

  /**
   * Calculate changes per minute
   */
  calculateChangesPerMinute() {
    if (this.changeCount === 0) return 0;

    const uptime = Date.now() - this.lastChangeTime;
    const minutes = uptime / 60000;

    return Math.round(this.changeCount / minutes);
  }

  /**
   * Calculate average poll interval
   */
  calculateAveragePollInterval() {
    if (this.pollCount <= 1) return this.pollingIntervalMs;

    const uptime = Date.now() - this.lastChangeTime;
    return Math.round(uptime / this.pollCount);
  }

  /**
   * Update polling interval
   * @param {number} intervalMs - New polling interval in milliseconds
   */
  updatePollingInterval(intervalMs) {
    if (this.isMonitoring) {
      // Stop current monitoring
      this.stopMonitoring();

      // Restart with new interval
      return this.startMonitoring(intervalMs);
    } else {
      this.pollingIntervalMs = intervalMs;
      return true;
    }
  }

  /**
   * Get current clipboard content
   */
  getCurrentClipboardContent() {
    try {
      return clipboard.readText() || '';
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }

  /**
   * Clear clipboard content
   */
  clearClipboard() {
    try {
      clipboard.clear();
      console.log('Clipboard cleared');
      this.emit('clipboard-cleared', {
        timestamp: Date.now(),
        previousValue: this.previousValue,
      });
      return true;
    } catch (error) {
      console.error('Error clearing clipboard:', error);
      this.emit('error', {
        type: 'clear-failed',
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  /**
   * Get all available events that this monitor can emit
   */
  getAvailableEvents() {
    return {
      'monitoring-started': 'Emitted when monitoring starts successfully',
      'monitoring-stopped': 'Emitted when monitoring stops successfully',
      'monitoring-already-active':
        'Emitted when trying to start already active monitoring',
      'monitoring-not-active':
        'Emitted when trying to stop inactive monitoring',
      'clipboard-changed': 'Emitted when clipboard content changes',
      'clipboard-cleared': 'Emitted when clipboard is cleared',
      polling: 'Emitted on each polling cycle (for debugging)',
      error: 'Emitted when any error occurs',
    };
  }

  /**
   * Get event listener count for debugging
   */
  getEventListeners() {
    return {
      'monitoring-started': this.listenerCount('monitoring-started'),
      'monitoring-stopped': this.listenerCount('monitoring-stopped'),
      'monitoring-already-active': this.listenerCount(
        'monitoring-already-active'
      ),
      'monitoring-not-active': this.listenerCount('monitoring-not-active'),
      'clipboard-changed': this.listenerCount('clipboard-changed'),
      'clipboard-cleared': this.listenerCount('clipboard-cleared'),
      polling: this.listenerCount('polling'),
      error: this.listenerCount('error'),
    };
  }
}

module.exports = ClipboardMonitor;
