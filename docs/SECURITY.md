# Security Documentation

## Overview

This document outlines the security implementation for API key storage in the AI Overlay Assistant application. The system uses Electron's built-in `safeStorage` for secure encryption and `electron-store` for persistence.

## Security Architecture

### Encryption Method
- **Primary**: Electron's `safeStorage` with OS-level keychain integration
- **Fallback**: Basic text encryption (less secure, used when OS keychain unavailable)
- **Storage**: Encrypted strings stored in `electron-store`

### Platform-Specific Security

#### macOS
- **Encryption**: macOS Keychain Access
- **Security Level**: High
- **Requirements**: No additional setup required
- **Best Practices**:
  - Enable FileVault for disk encryption
  - Keep macOS updated for security patches
  - Use strong system password

#### Windows
- **Encryption**: Windows DPAPI (Data Protection API)
- **Security Level**: High
- **Requirements**: No additional setup required
- **Best Practices**:
  - Enable BitLocker for disk encryption
  - Keep Windows updated for security patches
  - Use strong system password

#### Linux
- **Encryption**: Secret Service (kwallet/gnome-libsecret) or basic text
- **Security Level**: High (with secret store) / Low (basic text)
- **Requirements**: Install kwallet (KDE) or gnome-libsecret (GNOME)
- **Best Practices**:
  - Install a secret store for better security
  - Use full disk encryption (LUKS)
  - Keep system updated for security patches
  - Consider using a password manager for additional security

## API Key Management

### Storage
- API keys are encrypted using OS-level encryption
- Encrypted data is stored in `electron-store`
- All operations occur in the main process only
- No plaintext API keys are ever stored

### Validation
- Format validation for Gemini API keys
- API testing against Gemini service
- Retry logic for temporary failures
- Comprehensive error handling

### Migration
- Support for migrating from environment variables
- Export/import functionality for backup
- Cross-platform compatibility

## Security Best Practices

### For Users
1. **Never share API keys**: Keep your API keys confidential
2. **Use strong system passwords**: Protect your OS keychain
3. **Keep software updated**: Regular updates include security patches
4. **Enable disk encryption**: FileVault (macOS), BitLocker (Windows), LUKS (Linux)
5. **Monitor for security warnings**: The app will warn about security issues

### For Developers
1. **Main process only**: All sensitive operations must occur in the main process
2. **Input validation**: Always validate API keys before storage
3. **Error handling**: Never expose sensitive data in error messages
4. **Logging**: Avoid logging API keys or sensitive data
5. **Testing**: Test on all supported platforms

## Cross-Platform Testing

### Test Cases
1. **API key storage and retrieval**
2. **Format validation**
3. **API testing**
4. **Error handling**
5. **Migration from environment variables**
6. **Export/import functionality**
7. **Security warnings**

### Platform-Specific Tests
- **macOS**: Verify Keychain Access integration
- **Windows**: Verify DPAPI integration
- **Linux**: Test with and without secret store

## Migration Guide

### From Environment Variables
```javascript
// Migrate existing API key from environment
const result = await secureStorage.migrateFromEnvironment('gemini_api_key', 'GEMINI_API_KEY');
if (result.success) {
  console.log('Migration successful');
} else {
  console.error('Migration failed:', result.error);
}
```

### From Keytar (Legacy)
If migrating from a Keytar-based system:
1. Export API keys from Keytar
2. Import into secure storage using the import function
3. Remove Keytar dependency
4. Update code to use new secure storage methods

### Backup and Restore
```javascript
// Export API key for backup
const exportResult = secureStorage.exportApiKey('gemini_api_key');
if (exportResult.success) {
  // Save exportResult.data to secure location
}

// Import API key from backup
const importResult = secureStorage.importApiKey(exportData);
if (importResult.success) {
  console.log('Import successful');
}
```

## Security Considerations

### Linux Fallback
When no secret store is available on Linux:
- Basic text encryption is used (less secure)
- Users are warned about reduced security
- Recommendations provided for improving security

### Network Security
- API key testing requires network access
- Timeout and retry logic implemented
- Rate limiting considerations

### Error Handling
- No sensitive data exposed in error messages
- Comprehensive error categorization
- User-friendly error messages

## Monitoring and Logging

### Security Events
The system emits events for security monitoring:
- `security-assessment`: Platform security assessment
- `security-warning`: Security warnings
- `api-key-stored`: Successful API key storage
- `api-key-retrieved`: Successful API key retrieval
- `api-key-migrated`: Successful migration
- `error`: Error events (no sensitive data)

### Logging Guidelines
- Never log API keys or sensitive data
- Log security events for monitoring
- Include timestamps and platform information
- Use appropriate log levels

## Troubleshooting

### Common Issues

#### "Using basic text encryption" Warning
- **Cause**: No secret store available on Linux
- **Solution**: Install kwallet or gnome-libsecret
- **Workaround**: Use password manager for additional security

#### "API key not found" Error
- **Cause**: API key not stored or corrupted
- **Solution**: Re-enter API key
- **Prevention**: Use export/import for backup

#### "Invalid API key format" Error
- **Cause**: Malformed API key
- **Solution**: Check API key format and re-enter
- **Validation**: Use format validation before storage

### Platform-Specific Issues

#### macOS
- Keychain Access permissions
- FileVault encryption status
- System password strength

#### Windows
- DPAPI availability
- BitLocker encryption status
- User account permissions

#### Linux
- Secret store installation
- Desktop environment compatibility
- Disk encryption setup

## Compliance and Standards

### Data Protection
- API keys are encrypted at rest
- No plaintext storage
- OS-level encryption where available

### Privacy
- No API keys transmitted externally
- Local storage only
- User control over data

### Security Standards
- Follows Electron security best practices
- Uses recommended encryption methods
- Implements proper error handling

## Future Considerations

### Potential Improvements
- Hardware security module (HSM) integration
- Multi-factor authentication
- Advanced key rotation
- Audit logging

### Security Updates
- Monitor Electron security updates
- Update encryption methods as needed
- Review security best practices regularly

## Support

For security-related issues:
1. Check platform-specific requirements
2. Verify encryption method in use
3. Review security warnings
4. Test with sample API keys
5. Contact development team with detailed error information

---

**Note**: This document should be updated as security features evolve and new best practices emerge.
