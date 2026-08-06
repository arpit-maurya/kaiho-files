# Security Policy

Kaiho Files is a LAN file browser. LAN does not mean trusted.

## Reporting Vulnerabilities

Please open a private security advisory or contact the maintainers before public disclosure.

## Security Boundaries

- Only configured shared roots may be exposed.
- Path traversal and symlink escapes must be blocked.
- QR codes must not contain private keys, passwords, filesystem paths, permanent tokens, or personal data.
- Paired devices are trusted by public key, not by IP address alone.
- Removing pairing must revoke trust.

## Supported Versions

The project is pre-1.0. Security fixes should target the main branch until release branches exist.

