# AI Overlay Assistant

A lightweight desktop assistant app with transparent overlay, clipboard monitoring, and dual AI backend support (Ollama + Gemini).

## Features

- 🪟 **Transparent Always-On-Top Overlay** - Minimal floating UI that stays above other windows
- 📋 **Clipboard Monitoring** - Automatically detects clipboard changes and triggers AI responses
- 🤖 **Dual AI Backend Support** - Choose between local Ollama models or Google Gemini API
- ⌨️ **Global Hotkey** - Toggle overlay visibility with Cmd/Ctrl+Shift+Space
- 🔒 **Secure API Key Storage** - Gemini API keys stored securely using system keychain
- 🎨 **Cross-Platform** - Works on macOS, Windows, and Linux

## Development Status

### ✅ Completed (Task 1 - Project Setup)
- [x] Project repository initialized with Electron
- [x] Basic overlay window implementation
- [x] Global hotkey registration (Cmd/Ctrl+Shift+Space)
- [x] Minimal UI with response bubble and controls
- [x] Cross-platform build configuration
- [x] Basic project structure

### 🚧 In Progress
- [ ] Clipboard monitoring service
- [ ] Ollama backend integration
- [ ] Gemini backend integration
- [ ] Secure API key storage
- [ ] Settings and configuration UI

### 📋 Planned
- [ ] Error handling and user feedback
- [ ] Cross-platform packaging
- [ ] End-to-end testing
- [ ] Documentation and setup instructions

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Electron (installed automatically)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd ai-overlay-assistant

# Install dependencies
npm install

# Start development
npm start

# Start with DevTools
npm run dev
```

### Building
```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:mac
npm run build:win
npm run build:linux
```

## Project Structure

```
src/
├── main.js              # Electron main process
├── renderer/
│   ├── index.html       # Overlay UI HTML
│   ├── styles.css       # Overlay styling
│   └── renderer.js      # Renderer process logic
└── services/            # Backend services (planned)
    ├── clipboard.js     # Clipboard monitoring
    ├── ollama.js       # Ollama integration
    └── gemini.js       # Gemini integration
```

## Usage

1. **Start the app** - The overlay will appear in the top-right corner
2. **Toggle visibility** - Use Cmd/Ctrl+Shift+Space to show/hide the overlay
3. **Copy text** - The app will automatically detect clipboard changes (planned)
4. **AI Response** - Responses will appear in the floating bubble (planned)

## Contributing

This project is in active development. Check the task list for current priorities and areas that need work.

## License

MIT License - see LICENSE file for details.

