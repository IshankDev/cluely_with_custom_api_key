#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('Checking prerequisites...', 'blue');

  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    log('Error: package.json not found', 'red');
    process.exit(1);
  }

  // Check if electron-builder is installed
  try {
    execSync('npx electron-builder --version', { stdio: 'pipe' });
    log('✓ electron-builder found', 'green');
  } catch (error) {
    log('Error: electron-builder not found. Run: npm install', 'red');
    process.exit(1);
  }

  // Check if build directory exists
  if (!fs.existsSync('build')) {
    log('Creating build directory...', 'yellow');
    fs.mkdirSync('build', { recursive: true });
  }

  log('✓ Prerequisites check passed', 'green');
}

function checkBuildAssets() {
  log('Checking build assets...', 'blue');

  const requiredAssets = [
    'build/icon.icns',
    'build/icon.ico',
    'build/icon.png',
    'build/entitlements.mac.plist',
  ];

  const missingAssets = requiredAssets.filter(asset => !fs.existsSync(asset));

  if (missingAssets.length > 0) {
    log('Warning: Missing build assets:', 'yellow');
    missingAssets.forEach(asset => log(`  - ${asset}`, 'yellow'));
    log(
      'Please add the missing assets before building for production',
      'yellow'
    );
  } else {
    log('✓ All build assets found', 'green');
  }
}

function build(platform = 'all') {
  log(`Building for ${platform}...`, 'blue');

  try {
    const command =
      platform === 'all' ? 'npm run build' : `npm run build:${platform}`;
    log(`Executing: ${command}`, 'cyan');

    execSync(command, { stdio: 'inherit' });

    log(`✓ Build completed successfully for ${platform}`, 'green');

    // Check if dist directory was created
    if (fs.existsSync('dist')) {
      const files = fs.readdirSync('dist');
      log(`Generated files in dist/:`, 'cyan');
      files.forEach(file => log(`  - ${file}`, 'cyan'));
    }
  } catch (error) {
    log(`✗ Build failed for ${platform}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'all';

  log('AI Overlay Assistant Build Script', 'bright');
  log('================================', 'bright');

  checkPrerequisites();
  checkBuildAssets();

  if (platform === 'all') {
    build('all');
  } else if (['mac', 'win', 'linux'].includes(platform)) {
    build(platform);
  } else {
    log(
      `Error: Invalid platform "${platform}". Use: mac, win, linux, or all`,
      'red'
    );
    process.exit(1);
  }

  log('Build process completed!', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, checkBuildAssets, build };
