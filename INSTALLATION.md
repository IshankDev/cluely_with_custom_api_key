# AI Overlay Assistant - Installation Guide

## Overview

AI Overlay Assistant is a lightweight desktop application that provides AI-powered assistance through a transparent overlay window. It supports both Ollama (local) and Gemini (cloud) AI backends.

## System Requirements

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

## Installation by Platform

### macOS Installation

#### Option 1: DMG Installer (Recommended)
1. Download the latest `.dmg` file from the releases page
2. Double-click the `.dmg` file to mount it
3. Drag the "AI Overlay Assistant" app to your Applications folder
4. Eject the mounted disk image
5. Launch the app from Applications

#### Option 2: ZIP Archive
1. Download the `.zip` file for macOS
2. Extract the archive
3. Move the app to your Applications folder
4. Launch the app

#### First Launch (macOS)
- You may see a security warning. Go to System Preferences > Security & Privacy
- Click "Open Anyway" to allow the app to run
- The app will request accessibility permissions for global hotkeys

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

#### First Launch (Windows)
- Windows Defender may show a warning. Click "Run anyway"
- The app will request permissions for global hotkeys
- You may need to run as Administrator for full functionality

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

#### First Launch (Linux)
- The app may request permissions for global hotkeys
- You may need to install additional dependencies for clipboard access

## Configuration

### Initial Setup
1. Launch the application
2. Press `Cmd+Shift+Space` (macOS) or `Ctrl+Shift+Space` (Windows/Linux) to open the overlay
3. Click the settings icon (gear) to configure backends

### Backend Configuration

#### Ollama Backend (Local)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. In the app settings, select "Ollama" backend
4. Enter model name (e.g., "llama3.2")
5. Test the connection

#### Gemini Backend (Cloud)
1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. In the app settings, select "Gemini" backend
3. Enter your API key
4. Test the connection

### Overlay Configuration
- **Position**: Choose from 6 corner positions
- **Theme**: Auto, Light, or Dark
- **Auto-hide**: Configure automatic hiding behavior
- **Hotkey**: Customize the global hotkey (requires restart)

## Usage

### Basic Usage
1. Copy text to clipboard
2. Press the global hotkey (`Cmd+Shift+Space` / `Ctrl+Shift+Space`)
3. The overlay will appear with AI-generated response
4. Click outside or press Escape to hide

### Advanced Features
- **Settings Panel**: Configure backends, themes, and behavior
- **Auto-hide**: Automatically hide overlay after responses
- **Position Control**: Move overlay to different screen corners
- **Theme Support**: Light, dark, or automatic theme switching

## Troubleshooting

### Common Issues

#### App Won't Start
- **macOS**: Check Security & Privacy settings
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
- Reduce polling frequency in settings
- Close other resource-intensive applications
- Check system resource usage

### Getting Help
- Check the logs in the application
- Review the troubleshooting section
- Open an issue on GitHub with detailed information

## Uninstallation

### macOS
1. Drag the app from Applications to Trash
2. Empty the Trash
3. Remove preferences: `rm -rf ~/Library/Preferences/com.aioverlay.assistant.plist`

### Windows
1. Use Control Panel > Programs > Uninstall
2. Or run the installer and choose "Uninstall"
3. Remove remaining files manually if needed

### Linux
1. **AppImage**: Delete the file and desktop entry
2. **DEB**: `sudo apt remove ai-overlay-assistant`
3. Remove configuration: `rm -rf ~/.config/ai-overlay-assistant`

## Development

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

### Contributing
- Fork the repository
- Create a feature branch
- Make your changes
- Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.
