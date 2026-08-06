# Security

## Shared Roots

Kaiho Files exposes only user-approved shared roots. Every requested path is normalized and resolved against the canonical real path of the shared root.

Blocked cases include:

- `../` traversal
- Windows backslash traversal
- null bytes
- symlink escapes
- nonexistent parent paths for writes

## QR Pairing

QR payloads contain:

- protocol version
- application id
- public device id
- temporary pairing id
- LAN endpoint hints
- public identity key
- temporary public pairing key
- expiration timestamp
- nonce

QR payloads do not contain:

- private keys
- passwords
- filesystem paths
- permanent tokens
- personal data

The displaying device stores pairing sessions in memory, expires them quickly, and marks them used after success.

## Revocation

Removing a paired device deletes its trusted identity public key and last-known endpoint hints. Existing privileged sessions from that device should be closed by platform adapters.

