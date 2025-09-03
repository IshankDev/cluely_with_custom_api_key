# AI Overlay Assistant - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Configuration](#configuration)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)
6. [Tips and Tricks](#tips-and-tricks)

## Getting Started

### First Launch

When you first launch AI Overlay Assistant, you'll see a small overlay window appear in the top-right corner of your screen. The app will request necessary permissions:

#### macOS Permissions
- **Accessibility**: Required for global hotkeys
  - Go to System Preferences > Security & Privacy > Privacy > Accessibility
  - Add AI Overlay Assistant and check the box
- **Clipboard**: May be requested for clipboard monitoring

#### Windows Permissions
- **Administrator**: Run as Administrator for full functionality
- **Global Hotkeys**: May require elevated privileges

#### Linux Permissions
- **Clipboard Access**: May need additional clipboard manager
- **Global Hotkeys**: May require `xdotool` or similar

### Initial Setup

1. **Launch the application**
2. **Grant permissions** when prompted
3. **Test the global hotkey**:
   - macOS: `Cmd+Shift+Space`
   - Windows/Linux: `Ctrl+Shift+Space`
4. **Open settings** by clicking the gear icon

## Basic Usage

### Workflow Overview

The basic workflow is simple:

1. **Copy text** from any application
2. **Press the global hotkey** to open the overlay
3. **View the AI response** as it streams in
4. **Interact with the response** (copy, close, etc.)
5. **Hide the overlay** when done

### Step-by-Step Instructions

#### Step 1: Copy Text
- Select and copy any text from any application
- The app will automatically detect the clipboard change
- You'll see a brief processing indicator

#### Step 2: Open Overlay
- Press the global hotkey:
  - **macOS**: `Cmd+Shift+Space`
  - **Windows/Linux**: `Ctrl+Shift+Space`
- The overlay will appear with the AI response

#### Step 3: View Response
- The AI response will stream in real-time
- You'll see a pulsing indicator during streaming
- The response appears in a clean, readable format

#### Step 4: Interact
- **Copy response**: Click the copy button
- **Close overlay**: Click outside or press `Escape`
- **Settings**: Click the gear icon

### Visual Indicators

- **Processing**: Loading spinner while AI generates response
- **Streaming**: Pulsing dot indicator during response streaming
- **Complete**: Response fully loaded and ready
- **Error**: Red error message with details

## Configuration

### Backend Setup

#### Ollama Backend (Local AI)

**Prerequisites:**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`

**Configuration:**
1. Open settings (gear icon)
2. Select "Ollama" backend
3. Enter model name (e.g., "llama3.2")
4. Click "Test Connection"
5. Save settings

**Available Models:**
- `llama3.2` - General purpose
- `llama3.2:3b` - Faster, smaller model
- `codellama` - Code-focused
- `mistral` - Balanced performance

#### Gemini Backend (Cloud AI)

**Prerequisites:**
1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. Ensure stable internet connection

**Configuration:**
1. Open settings (gear icon)
2. Select "Gemini" backend
3. Enter your API key
4. Click "Test Connection"
5. Save settings

**API Key Security:**
- Keys are stored securely using system keychain
- Never shared or transmitted unnecessarily
- Can be updated anytime in settings

### Overlay Settings

#### Position Configuration

Choose from 6 different positions:

- **Top Right** (default): Upper right corner
- **Top Left**: Upper left corner
- **Bottom Right**: Lower right corner
- **Bottom Left**: Lower left corner
- **Center Right**: Middle right side
- **Center Left**: Middle left side

**How to change:**
1. Open settings
2. Go to "Overlay Position" section
3. Select desired position
4. Position changes immediately

#### Theme Settings

Three theme options:

- **Auto**: Follows your system theme
- **Light**: Always light theme
- **Dark**: Always dark theme

**How to change:**
1. Open settings
2. Go to "Theme" section
3. Select desired theme
4. Theme changes immediately

#### Auto-Hide Configuration

Control when the overlay automatically hides:

**Enable Auto-Hide:**
- Check to enable automatic hiding
- Overlay hides after specified delay

**Auto-Hide Delay:**
- Time before hiding (in seconds)
- Range: 1-60 seconds
- Default: 5 seconds

**Auto-Hide After Response:**
- Hide after AI response completes
- Useful for hands-free operation

**Response Delay:**
- Time after response before hiding
- Range: 1-30 seconds
- Default: 3 seconds

## Advanced Features

### Performance Monitoring

The app includes built-in performance monitoring:

**Real-time Metrics:**
- Polling efficiency percentage
- Total polls and changes
- Average poll time
- Current polling interval

**Adaptive Polling:**
- Automatically adjusts polling frequency
- Reduces CPU usage during inactivity
- Increases responsiveness during activity

**View Performance:**
- Performance metrics are logged to console
- Available in developer tools
- Helps optimize resource usage

### Error Handling

The app provides comprehensive error handling:

**Connection Issues:**
- Automatic retry with exponential backoff
- Clear error messages
- Recovery suggestions

**API Errors:**
- Detailed error descriptions
- Suggested solutions
- Fallback options

**Network Problems:**
- Graceful degradation
- Offline mode indicators
- Reconnection attempts

### Keyboard Shortcuts

**Global Hotkey:**
- `Cmd+Shift+Space` (macOS)
- `Ctrl+Shift+Space` (Windows/Linux)

**Overlay Controls:**
- `Escape`: Hide overlay
- `Enter`: Confirm settings
- `Tab`: Navigate settings

### Settings Panel

**Backend Configuration:**
- Switch between Ollama and Gemini
- Test connections
- Update credentials

**Overlay Settings:**
- Position control
- Theme selection
- Auto-hide configuration

**Performance Settings:**
- Polling interval adjustment
- Resource usage monitoring
- Optimization controls

## Troubleshooting

### Common Issues

#### App Won't Start

**macOS:**
- Check Security & Privacy settings
- Click "Open Anyway" if blocked
- Grant accessibility permissions

**Windows:**
- Run as Administrator
- Check Windows Defender settings
- Ensure proper permissions

**Linux:**
- Check dependencies: `sudo apt install xdotool`
- Verify clipboard manager
- Check system permissions

#### Global Hotkey Not Working

**macOS:**
1. Go to System Preferences > Security & Privacy > Privacy > Accessibility
2. Add AI Overlay Assistant
3. Check the box to enable
4. Restart the application

**Windows:**
1. Run as Administrator
2. Check for conflicting hotkeys
3. Restart the application

**Linux:**
1. Install xdotool: `sudo apt install xdotool`
2. Check for conflicting hotkeys
3. Restart the application

#### Clipboard Not Detected

**All Platforms:**
1. Ensure text is actually copied
2. Check clipboard permissions
3. Restart the application
4. Try copying from different applications

#### AI Backend Connection Failed

**Ollama:**
1. Ensure Ollama is running: `ollama serve`
2. Check model is downloaded: `ollama list`
3. Verify model name in settings
4. Check Ollama logs for errors

**Gemini:**
1. Verify API key is correct
2. Check internet connection
3. Ensure API key has proper permissions
4. Check Google AI Studio for quota limits

### Performance Issues

#### High CPU Usage
1. Reduce polling frequency in settings
2. Close other resource-intensive applications
3. Restart the application
4. Check for background processes

#### Memory Issues
1. Close other applications
2. Restart the application
3. Check system memory usage
4. Update to latest version

#### Slow Responses
1. Check network connection
2. Verify backend is running
3. Try different AI model
4. Check backend logs

### Getting Help

#### Check Logs
- Application logs show detailed error information
- Available in developer tools (F12)
- Help identify specific issues

#### Common Solutions
1. **Restart the application**
2. **Check permissions**
3. **Verify backend status**
4. **Update to latest version**
5. **Check system requirements**

#### Support Resources
- [Installation Guide](INSTALLATION.md)
- [GitHub Issues](https://github.com/your-repo/ai-overlay-assistant/issues)
- [Documentation](README.md)

## Tips and Tricks

### Productivity Tips

1. **Position the overlay** where it doesn't interfere with your work
2. **Use auto-hide** for hands-free operation
3. **Configure themes** for better visibility
4. **Test different models** for optimal results

### Workflow Optimization

1. **Copy text first**, then press hotkey
2. **Use keyboard shortcuts** for faster interaction
3. **Configure auto-hide** for minimal interruption
4. **Position overlay** strategically

### Advanced Usage

1. **Monitor performance** for optimization
2. **Use different models** for different tasks
3. **Configure polling** based on usage patterns
4. **Backup settings** for easy restoration

### Best Practices

1. **Keep the app updated**
2. **Monitor resource usage**
3. **Test connections regularly**
4. **Backup important settings**
5. **Report issues promptly**

---

## Need More Help?

- **Documentation**: [README](README.md)
- **Installation**: [Installation Guide](INSTALLATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/ai-overlay-assistant/issues)
- **Support**: support@aioverlayassistant.com

---

*This guide covers the essential features and usage of AI Overlay Assistant. For technical details and development information, see the main [README](README.md).*
