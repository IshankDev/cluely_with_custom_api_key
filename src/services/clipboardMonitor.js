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

    // Adaptive polling configuration
    this.adaptivePolling = {
      enabled: true,
      minInterval: 500, // Minimum 500ms
      maxInterval: 5000, // Maximum 5 seconds
      currentInterval: 1000,
      activityThreshold: 10000, // 10 seconds
      inactivityThreshold: 30000, // 30 seconds
      changeRateThreshold: 5, // Changes per minute
      lastChangeRate: 0,
      changeHistory: [],
    };

    // Performance monitoring
    this.performanceMetrics = {
      startTime: 0,
      totalPolls: 0,
      totalChanges: 0,
      averagePollTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      lastMetricsUpdate: 0,
    };

    // Debouncing for rapid changes
    this.debounceTimer = null;
    this.debounceDelay = 100; // 100ms debounce

    // Bind methods to preserve context
    this.startMonitoring = this.startMonitoring.bind(this);
    this.stopMonitoring = this.stopMonitoring.bind(this);
    this.pollClipboard = this.pollClipboard.bind(this);
    this.handleClipboardChange = this.handleClipboardChange.bind(this);
    this.optimizePolling = this.optimizePolling.bind(this);
    this.handlePollingError = this.handlePollingError.bind(this);
    this.updateAdaptiveInterval = this.updateAdaptiveInterval.bind(this);
    this.calculatePerformanceMetrics =
      this.calculatePerformanceMetrics.bind(this);
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
      this.adaptivePolling.currentInterval = intervalMs;

      // Initialize performance metrics
      this.performanceMetrics.startTime = Date.now();
      this.performanceMetrics.lastMetricsUpdate = Date.now();

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
        adaptivePolling: this.adaptivePolling.enabled,
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
      // Clear polling interval and debounce timer
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // Calculate final performance metrics
      this.calculatePerformanceMetrics();

      const finalStatus = this.getStatus();
      this.isMonitoring = false;
      this.previousValue = '';

      console.log('Clipboard monitoring stopped');

      // Emit comprehensive stop event with performance data
      this.emit('monitoring-stopped', {
        finalStatus: finalStatus,
        timestamp: Date.now(),
        duration: Date.now() - finalStatus.lastChangeTime,
        performance: this.performanceMetrics,
        adaptivePolling: {
          enabled: this.adaptivePolling.enabled,
          finalInterval: this.adaptivePolling.currentInterval,
          changeRate: this.adaptivePolling.lastChangeRate,
        },
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

    // Update performance metrics
    this.calculatePerformanceMetrics();

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

    // Update adaptive polling interval
    if (this.adaptivePolling.enabled) {
      this.updateAdaptiveInterval();
    }
  }

  /**
   * Update adaptive polling interval based on activity
   */
  updateAdaptiveInterval() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const timeSinceLastChange = now - this.lastChangeTime;

    // Calculate change rate (changes per minute)
    const oneMinuteAgo = now - 60000;
    this.adaptivePolling.changeHistory =
      this.adaptivePolling.changeHistory.filter(
        timestamp => timestamp > oneMinuteAgo
      );
    this.adaptivePolling.lastChangeRate =
      this.adaptivePolling.changeHistory.length;

    let newInterval = this.adaptivePolling.currentInterval;

    // Increase interval if no recent activity
    if (timeSinceLastActivity > this.adaptivePolling.inactivityThreshold) {
      newInterval = Math.min(
        this.adaptivePolling.maxInterval,
        this.adaptivePolling.currentInterval * 1.5
      );
    }
    // Decrease interval if recent activity
    else if (timeSinceLastActivity < this.adaptivePolling.activityThreshold) {
      newInterval = Math.max(
        this.adaptivePolling.minInterval,
        this.adaptivePolling.currentInterval * 0.8
      );
    }
    // Adjust based on change rate
    else if (
      this.adaptivePolling.lastChangeRate >
      this.adaptivePolling.changeRateThreshold
    ) {
      newInterval = Math.max(
        this.adaptivePolling.minInterval,
        this.adaptivePolling.currentInterval * 0.7
      );
    }

    // Apply new interval if it changed significantly
    if (Math.abs(newInterval - this.adaptivePolling.currentInterval) > 100) {
      this.adaptivePolling.currentInterval = newInterval;
      this.pollingIntervalMs = newInterval;

      // Restart polling with new interval
      if (this.isMonitoring && this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(
          this.pollClipboard,
          this.pollingIntervalMs
        );
      }

      console.log(`Adaptive polling interval updated to ${newInterval}ms`);
      this.emit('adaptive-interval-updated', {
        newInterval: newInterval,
        reason: 'activity-based',
        timestamp: now,
        changeRate: this.adaptivePolling.lastChangeRate,
      });
    }
  }

  /**
   * Calculate and update performance metrics
   */
  calculatePerformanceMetrics() {
    const now = Date.now();

    // Update metrics every 10 seconds
    if (now - this.performanceMetrics.lastMetricsUpdate < 10000) {
      return;
    }

    this.performanceMetrics.lastMetricsUpdate = now;
    this.performanceMetrics.totalPolls = this.pollCount;
    this.performanceMetrics.totalChanges = this.changeCount;

    // Calculate average poll time
    if (this.pollCount > 0) {
      this.performanceMetrics.averagePollTime =
        (now - this.performanceMetrics.startTime) / this.pollCount;
    }

    // Emit performance metrics
    this.emit('performance-metrics', {
      ...this.performanceMetrics,
      timestamp: now,
      adaptiveInterval: this.adaptivePolling.currentInterval,
      isPaused: this.isPaused,
    });
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

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce rapid changes
    this.debounceTimer = setTimeout(() => {
      // Update state
      this.previousValue = newValue;
      this.lastChangeTime = now;
      this.changeCount++;

      // Track change for adaptive polling
      this.adaptivePolling.changeHistory.push(now);

      // Emit change event
      const changeEvent = {
        newValue: newValue,
        oldValue: oldValue,
        timestamp: now,
        isEmpty: !newValue || newValue.trim() === '',
        length: newValue ? newValue.length : 0,
        type: this.detectContentType(newValue),
        isSignificant: this.isSignificantChange(newValue, oldValue),
        performance: {
          pollCount: this.pollCount,
          changeCount: this.changeCount,
          averagePollTime: this.performanceMetrics.averagePollTime,
        },
      };

      console.log('Clipboard change detected:', {
        length: changeEvent.length,
        isEmpty: changeEvent.isEmpty,
        type: changeEvent.type,
        isSignificant: changeEvent.isSignificant,
        timestamp: new Date(now).toISOString(),
        performance: changeEvent.performance,
      });

      this.emit('clipboard-changed', changeEvent);
    }, this.debounceDelay);
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
      adaptivePolling: {
        enabled: this.adaptivePolling.enabled,
        currentInterval: this.adaptivePolling.currentInterval,
        changeRate: this.adaptivePolling.lastChangeRate,
        changeHistory: this.adaptivePolling.changeHistory.length,
      },
      performance: {
        pollsPerMinute: this.calculatePollsPerMinute(),
        changesPerMinute: this.calculateChangesPerMinute(),
        averagePollInterval: this.calculateAveragePollInterval(),
        averagePollTime: this.performanceMetrics.averagePollTime,
        uptime: this.isMonitoring ? Date.now() - this.lastChangeTime : 0,
        totalPolls: this.performanceMetrics.totalPolls,
        totalChanges: this.performanceMetrics.totalChanges,
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
      'performance-metrics': this.listenerCount('performance-metrics'),
      'adaptive-interval-updated': this.listenerCount(
        'adaptive-interval-updated'
      ),
    };
  }

  /**
   * Get detailed performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const now = Date.now();
    const uptime = this.isMonitoring
      ? now - this.performanceMetrics.startTime
      : 0;

    return {
      uptime: uptime,
      totalPolls: this.pollCount,
      totalChanges: this.changeCount,
      averagePollTime: this.performanceMetrics.averagePollTime,
      pollsPerMinute: this.calculatePollsPerMinute(),
      changesPerMinute: this.calculateChangesPerMinute(),
      currentInterval: this.pollingIntervalMs,
      adaptiveInterval: this.adaptivePolling.currentInterval,
      isPaused: this.isPaused,
      changeRate: this.adaptivePolling.lastChangeRate,
      efficiency: this.calculateEfficiency(),
      timestamp: now,
    };
  }

  /**
   * Calculate polling efficiency
   * @returns {number} Efficiency percentage
   */
  calculateEfficiency() {
    if (this.pollCount === 0) return 100;

    const changeRatio = this.changeCount / this.pollCount;
    const efficiency = Math.min(100, changeRatio * 100);

    return Math.round(efficiency);
  }

  /**
   * Enable or disable adaptive polling
   * @param {boolean} enabled - Whether to enable adaptive polling
   */
  setAdaptivePolling(enabled) {
    this.adaptivePolling.enabled = enabled;
    console.log(`Adaptive polling ${enabled ? 'enabled' : 'disabled'}`);
    this.emit('adaptive-polling-toggled', {
      enabled: enabled,
      timestamp: Date.now(),
    });
  }

  /**
   * Get adaptive polling configuration
   * @returns {Object} Adaptive polling configuration
   */
  getAdaptivePollingConfig() {
    return {
      ...this.adaptivePolling,
      changeHistory: this.adaptivePolling.changeHistory.length,
    };
  }
}

module.exports = ClipboardMonitor;
