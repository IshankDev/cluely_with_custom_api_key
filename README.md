# AI Overlay Assistant

<div align="center">

![AI Overlay Assistant](https://img.shields.io/badge/AI-Overlay%20Assistant-blue?style=for-the-badge&logo=electron)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A lightweight desktop assistant with transparent overlay, clipboard monitoring, and dual AI backend support**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Troubleshooting](#troubleshooting)

</div>

## 🚀 Overview

AI Overlay Assistant is a powerful desktop application that provides AI-powered assistance through a transparent overlay window. It monitors your clipboard, processes text with AI, and displays responses in a sleek, always-on-top interface.

### Key Features
- **🪟 Transparent Overlay**: Always-on-top window with customizable positioning
- **⌨️ Global Hotkey**: Quick access with `Cmd+Shift+Space` (macOS) or `Ctrl+Shift+Space` (Windows/Linux)
- **📋 Clipboard Integration**: Automatic AI processing of clipboard content
- **🤖 Dual AI Backends**: Support for both Ollama (local) and Gemini (cloud) AI services
- **⚡ Streaming Responses**: Real-time, incremental response rendering
- **🎨 Theme Support**: Light, dark, and automatic theme switching
- **⚙️ Adaptive Polling**: Intelligent resource management and performance optimization

## 📋 Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Functionality
- **Transparent Overlay**: Always-on-top window that doesn't interfere with your workflow
- **Global Hotkey**: Instant access from anywhere on your system
- **Clipboard Monitoring**: Automatic detection and processing of clipboard changes
- **Position Control**: 6 different corner positions for optimal placement
- **Auto-hide Settings**: Configurable automatic hiding behavior

### AI Backend Support
- **Ollama Integration**: Local AI processing with any Ollama model
- **Gemini Integration**: Cloud-based AI with Google's Gemini API
- **Streaming Responses**: Real-time, incremental response rendering
- **Model Configuration**: Easy backend switching and model selection

### User Interface
- **Theme Support**: Light, dark, and automatic theme switching
- **Settings Panel**: Comprehensive configuration interface
- **Performance Monitoring**: Real-time metrics and efficiency tracking
- **Error Handling**: Robust error recovery and user feedback

### Performance & Optimization
- **Adaptive Polling**: Intelligent clipboard monitoring with resource optimization
- **Memory Management**: Optimized resource usage and cleanup
- **Cross-Platform**: Native support for macOS, Windows, and Linux

## 💻 System Requirements

### Minimum Requirements
- **Operating System**: macOS 10.14+, Windows 10+, or Linux (Ubuntu 18.04+)
- **Architecture**: x64 (Intel/AMD) or ARM64 (Apple Silicon)
- **Memory**: 4GB RAM
- **Storage**: 100MB free space
- **Network**: Internet connection for Gemini backend

### Recommended Requirements
- **Operating System**: macOS 12+, Windows 11+, or Linux (Ubuntu 20.04+)
- **Architecture**: x64 or ARM64
- **Memory**: 8GB RAM
- **Storage**: 500MB free space
- **Network**: Stable internet connection

## 📦 Installation

### macOS Installation

#### Option 1: DMG Installer (Recommended)
1. Download the latest `.dmg` file from the [releases page](https://github.com/your-repo/ai-overlay-assistant/releases)
2. Double-click the `.dmg` file to mount it
3. Drag the "AI Overlay Assistant" app to your Applications folder
4. Eject the mounted disk image
5. Launch the app from Applications

#### Option 2: ZIP Archive
1. Download the `.zip` file for macOS
2. Extract the archive
3. Move the app to your Applications folder
4. Launch the app

### Windows Installation

#### Option 1: NSIS Installer (Recommended)
1. Download the latest `.exe` installer
2. Run the installer as Administrator
3. Follow the installation wizard
4. Choose installation directory and shortcuts
5. Launch the app from Start Menu or Desktop

#### Option 2: Portable Version
1. Download the portable `.exe` file
2. Extract to a folder of your choice
3. Run the executable directly
4. No installation required

### Linux Installation

#### Option 1: AppImage (Recommended)
1. Download the `.AppImage` file
2. Make it executable: `chmod +x AI-Overlay-Assistant-*.AppImage`
3. Run the AppImage: `./AI-Overlay-Assistant-*.AppImage`
4. The app will create a desktop entry automatically

#### Option 2: DEB Package (Ubuntu/Debian)
1. Download the `.deb` package
2. Install using: `sudo dpkg -i AI-Overlay-Assistant-*.deb`
3. Fix dependencies if needed: `sudo apt-get install -f`
4. Launch from Applications menu

## 🚀 Quick Start

### First Launch
1. **Launch the application**
2. **Grant permissions** when prompted:
   - **macOS**: Accessibility permissions for global hotkeys
   - **Windows**: Run as Administrator for full functionality
   - **Linux**: Clipboard access permissions

### Basic Usage
1. **Copy text** to your clipboard
2. **Press the global hotkey**:
   - `Cmd+Shift+Space` (macOS)
   - `Ctrl+Shift+Space` (Windows/Linux)
3. **View AI response** in the overlay
4. **Click outside** or press `Escape` to hide

### Configure AI Backend
1. **Open settings**: Click the gear icon in the overlay
2. **Choose backend**:
   - **Ollama**: For local AI processing
   - **Gemini**: For cloud-based AI
3. **Enter credentials**:
   - **Ollama**: Model name (e.g., "llama3.2")
   - **Gemini**: API key from Google AI Studio
4. **Test connection** and save settings

## ⚙️ Configuration

### Backend Configuration

#### Ollama Backend (Local)
1. **Install Ollama** from [ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull llama3.2`
3. **Configure in app**:
   - Select "Ollama" backend
   - Enter model name (e.g., "llama3.2")
   - Test the connection

#### Gemini Backend (Cloud)
1. **Get API key** from [Google AI Studio](https://aistudio.google.com/)
2. **Configure in app**:
   - Select "Gemini" backend
   - Enter your API key
   - Test the connection

### Overlay Configuration

#### Position Settings
- **Top Right**: Default position
- **Top Left**: Alternative corner
- **Bottom Right**: Lower corner
- **Bottom Left**: Lower left
- **Center Right**: Middle right
- **Center Left**: Middle left

#### Theme Settings
- **Auto**: Follows system theme
- **Light**: Always light theme
- **Dark**: Always dark theme

#### Auto-Hide Settings
- **Enable auto-hide**: Automatically hide overlay
- **Auto-hide delay**: Time before hiding (seconds)
- **Auto-hide after response**: Hide after AI response
- **Response delay**: Time after response before hiding

## 📖 Usage

### Basic Workflow
1. **Copy text** from any application
2. **Press global hotkey** to open overlay
3. **View AI response** as it streams in
4. **Interact with response** (copy, close, etc.)
5. **Hide overlay** when done

### Advanced Features

#### Settings Panel
- **Backend Configuration**: Switch between Ollama and Gemini
- **Model Selection**: Choose specific AI models
- **Position Control**: Move overlay to different corners
- **Theme Settings**: Customize appearance
- **Auto-hide Configuration**: Set hiding behavior

#### Performance Monitoring
- **Real-time Metrics**: View polling efficiency and performance
- **Resource Usage**: Monitor CPU and memory usage
- **Adaptive Polling**: Automatic optimization based on activity

#### Error Handling
- **Connection Issues**: Automatic retry and fallback
- **API Errors**: Clear error messages and recovery options
- **Network Problems**: Graceful degradation and user feedback

### Keyboard Shortcuts
- **Global Hotkey**: `Cmd+Shift+Space` (macOS) / `Ctrl+Shift+Space` (Windows/Linux)
- **Escape**: Hide overlay
- **Settings**: Click gear icon or use settings panel
- **Close**: Click X button or use close option

## 🔧 Troubleshooting

### Common Issues

#### App Won't Start
- **macOS**: Check Security & Privacy settings, click "Open Anyway"
- **Windows**: Run as Administrator
- **Linux**: Check dependencies and permissions

#### Global Hotkey Not Working
- **macOS**: Grant accessibility permissions in System Preferences
- **Windows**: Run as Administrator
- **Linux**: Install `xdotool` or similar

#### Clipboard Not Detected
- **macOS**: Check clipboard permissions
- **Windows**: Ensure app has clipboard access
- **Linux**: Install clipboard manager if needed

#### AI Backend Connection Failed
- **Ollama**: Ensure Ollama is running and model is downloaded
- **Gemini**: Check API key and internet connection

### Performance Issues
- **High CPU Usage**: Reduce polling frequency in settings
- **Memory Issues**: Close other resource-intensive applications
- **Slow Responses**: Check network connection and backend status

### Getting Help
- **Check Logs**: Review application logs for detailed error information
- **Review Documentation**: See [Installation Guide](INSTALLATION.md) for detailed instructions
- **Open Issues**: Report problems on [GitHub Issues](https://github.com/your-repo/ai-overlay-assistant/issues)

## 🛠️ Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/your-repo/ai-overlay-assistant.git
cd ai-overlay-assistant

# Install dependencies
npm install

# Run in development mode
npm start

# Build for distribution
npm run build
```

### Development Scripts
- `npm start`: Run in development mode
- `npm run dev`: Run with development flags
- `npm run build`: Build for all platforms
- `npm run build:mac`: Build for macOS
- `npm run build:win`: Build for Windows
- `npm run build:linux`: Build for Linux
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Project Structure
```
ai-overlay-assistant/
├── src/
│   ├── main.js              # Electron main process
│   ├── renderer/
│   │   ├── index.html       # Overlay UI
│   │   ├── renderer.js      # Renderer process logic
│   │   └── styles.css       # UI styling
│   └── services/
│       ├── clipboardMonitor.js    # Clipboard monitoring
│       ├── ollamaService.js       # Ollama integration
│       ├── geminiService.js       # Gemini integration
│       └── secureStorage.js       # Secure storage
├── build/                   # Build assets
├── dist/                    # Distribution files
├── scripts/                 # Build scripts
└── docs/                    # Documentation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### How to Contribute
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron**: For the cross-platform framework
- **Ollama**: For local AI processing capabilities
- **Google Gemini**: For cloud AI services
- **Contributors**: For their valuable contributions

## 📞 Support

- **Documentation**: [Installation Guide](INSTALLATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/ai-overlay-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/ai-overlay-assistant/discussions)
- **Email**: support@aioverlayassistant.com

---

<div align="center">

**Made with ❤️ by the AI Overlay Assistant Team**

[![GitHub stars](https://img.shields.io/github/stars/your-repo/ai-overlay-assistant?style=social)](https://github.com/your-repo/ai-overlay-assistant)
[![GitHub forks](https://img.shields.io/github/forks/your-repo/ai-overlay-assistant?style=social)](https://github.com/your-repo/ai-overlay-assistant)
[![GitHub issues](https://img.shields.io/github/issues/your-repo/ai-overlay-assistant)](https://github.com/your-repo/ai-overlay-assistant/issues)

</div>

