# Contributing to AI Overlay Assistant

Thank you for your interest in contributing to AI Overlay Assistant! This document provides guidelines and information for contributors.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style](#code-style)
4. [Testing](#testing)
5. [Pull Request Process](#pull-request-process)
6. [Issue Reporting](#issue-reporting)
7. [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: Latest version
- **Electron**: Will be installed automatically
- **Platform-specific tools**:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools
  - **Linux**: Build essentials

### Quick Start

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/ai-overlay-assistant.git
   cd ai-overlay-assistant
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start development**:
   ```bash
   npm start
   ```

## Development Setup

### Project Structure

```
ai-overlay-assistant/
├── src/
│   ├── main.js                    # Electron main process
│   ├── renderer/
│   │   ├── index.html             # Overlay UI
│   │   ├── renderer.js             # Renderer process logic
│   │   └── styles.css              # UI styling
│   └── services/
│       ├── clipboardMonitor.js     # Clipboard monitoring
│       ├── ollamaService.js        # Ollama integration
│       ├── geminiService.js        # Gemini integration
│       └── secureStorage.js        # Secure storage
├── build/                          # Build assets
├── dist/                           # Distribution files
├── scripts/                        # Build scripts
├── docs/                           # Documentation
└── tests/                          # Test files
```

### Development Scripts

- `npm start`: Run in development mode
- `npm run dev`: Run with development flags
- `npm run build`: Build for all platforms
- `npm run build:mac`: Build for macOS
- `npm run build:win`: Build for Windows
- `npm run build:linux`: Build for Linux
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run format`: Format code with Prettier
- `npm test`: Run tests

### Environment Setup

#### Backend Configuration

**Ollama (Local AI):**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama service: `ollama serve`

**Gemini (Cloud AI):**
1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. Add to environment variables or use app settings

#### Development Environment

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node git
```

**Windows:**
```bash
# Install Node.js from https://nodejs.org/
# Install Git from https://git-scm.com/
# Install Visual Studio Build Tools
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm git build-essential

# Install additional dependencies
sudo apt install xdotool libgtk-3-0 libnotify4
```

## Code Style

### JavaScript/Node.js

We use **ESLint** and **Prettier** for code formatting and linting.

**ESLint Configuration:**
- Extends `eslint:recommended`
- Uses modern JavaScript features
- Enforces consistent code style

**Prettier Configuration:**
- 2 spaces indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in objects and arrays

### Code Guidelines

1. **Use meaningful variable names**
2. **Add JSDoc comments** for functions and classes
3. **Keep functions small and focused**
4. **Use async/await** instead of callbacks
5. **Handle errors properly**
6. **Write self-documenting code**

### Example Code Style

```javascript
/**
 * Process clipboard content with AI backend
 * @param {string} content - Clipboard content to process
 * @param {string} backend - AI backend to use ('ollama' or 'gemini')
 * @returns {Promise<string>} AI-generated response
 */
async function processClipboardContent(content, backend) {
  try {
    const response = await aiService.generate(content, backend);
    return response;
  } catch (error) {
    console.error('Failed to process clipboard content:', error);
    throw new Error('AI processing failed');
  }
}
```

### CSS Guidelines

- Use **CSS custom properties** for theming
- Follow **BEM methodology** for class naming
- Use **flexbox** and **grid** for layouts
- Ensure **accessibility** with proper contrast ratios

### HTML Guidelines

- Use **semantic HTML** elements
- Include **ARIA labels** for accessibility
- Keep **structure clean** and organized
- Use **data attributes** for JavaScript hooks

## Testing

### Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service tests
│   ├── utils/              # Utility tests
│   └── components/         # Component tests
├── integration/            # Integration tests
├── e2e/                   # End-to-end tests
└── fixtures/              # Test data
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

**Unit Test Example:**
```javascript
const { ClipboardMonitor } = require('../src/services/clipboardMonitor');

describe('ClipboardMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ClipboardMonitor();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  test('should start monitoring', () => {
    const result = monitor.startMonitoring();
    expect(result).toBe(true);
    expect(monitor.isMonitoring).toBe(true);
  });

  test('should detect clipboard changes', (done) => {
    monitor.on('clipboard-changed', (event) => {
      expect(event.newValue).toBe('test content');
      done();
    });

    monitor.startMonitoring();
    // Simulate clipboard change
  });
});
```

### Test Guidelines

1. **Write tests for new features**
2. **Maintain good test coverage**
3. **Use descriptive test names**
4. **Test edge cases and error conditions**
5. **Mock external dependencies**

## Pull Request Process

### Before Submitting

1. **Check existing issues** to avoid duplicates
2. **Create a feature branch** from `main`
3. **Write tests** for new functionality
4. **Update documentation** if needed
5. **Run linting and tests** locally

### Pull Request Guidelines

1. **Clear title** describing the change
2. **Detailed description** of changes
3. **Link to related issues**
4. **Include screenshots** for UI changes
5. **Test on multiple platforms** if applicable

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Tested on macOS
- [ ] Tested on Windows
- [ ] Tested on Linux

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on multiple platforms
4. **Documentation** review
5. **Final approval** and merge

## Issue Reporting

### Before Reporting

1. **Check existing issues** for duplicates
2. **Search documentation** for solutions
3. **Test with latest version**
4. **Reproduce the issue** consistently

### Issue Template

```markdown
## Bug Report

### Environment
- OS: [e.g., macOS 12.1]
- Version: [e.g., 1.0.0]
- Node.js: [e.g., 18.0.0]

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Additional Information
- Screenshots
- Logs
- System information
```

### Feature Request Template

```markdown
## Feature Request

### Problem
Description of the problem

### Proposed Solution
Description of the proposed solution

### Alternatives Considered
Other solutions considered

### Additional Context
- Use cases
- Screenshots
- Mockups
```

## Code of Conduct

### Our Standards

- **Be respectful** and inclusive
- **Use welcoming language**
- **Be collaborative**
- **Accept constructive feedback**
- **Focus on what is best for the community**

### Unacceptable Behavior

- **Harassment** or discrimination
- **Trolling** or insulting comments
- **Personal attacks**
- **Inappropriate language**
- **Spam** or off-topic content

### Enforcement

- **Warnings** for minor violations
- **Temporary bans** for repeated violations
- **Permanent bans** for serious violations
- **Appeal process** available

## Getting Help

### Development Questions

- **Check documentation** first
- **Search existing issues**
- **Ask in discussions**
- **Join community chat**

### Resources

- **Documentation**: [README](README.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/ai-overlay-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/ai-overlay-assistant/discussions)
- **Wiki**: [Project Wiki](https://github.com/your-repo/ai-overlay-assistant/wiki)

## Recognition

### Contributors

We recognize all contributors in our [Contributors](https://github.com/your-repo/ai-overlay-assistant/graphs/contributors) page.

### Hall of Fame

Special recognition for significant contributions:
- **Bug fixes**: Critical bug fixes
- **Features**: Major feature implementations
- **Documentation**: Comprehensive documentation
- **Testing**: Test coverage improvements

---

## Quick Reference

### Common Commands
```bash
# Development
npm start
npm run dev
npm run build

# Testing
npm test
npm run lint
npm run format

# Git workflow
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### File Naming
- **JavaScript**: camelCase (e.g., `clipboardMonitor.js`)
- **CSS**: kebab-case (e.g., `styles.css`)
- **HTML**: kebab-case (e.g., `index.html`)
- **Tests**: `.test.js` or `.spec.js` suffix

### Commit Messages
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test changes
- **chore**: Build/tool changes

---

Thank you for contributing to AI Overlay Assistant! Your contributions help make this project better for everyone.
