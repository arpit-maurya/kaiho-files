# Contributing

Thanks for helping improve Kaiho Files.

## Development Principles

- Keep the app offline-first and LAN-only.
- Do not add cloud dependencies or telemetry.
- Keep Windows, Android, and shared protocol code separated.
- Prefer streaming I/O over loading files into memory.
- Add tests for filesystem, network, and security behavior.
- Keep UI practical and uncluttered.

## Pull Requests

Before opening a pull request:

1. Run the test suite.
2. Update docs when protocol or security behavior changes.
3. Avoid unrelated refactors.
4. Clearly describe platform behavior and tested environments.

