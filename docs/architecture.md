# Architecture

Kaiho Files is split into shared protocol logic, platform-specific UI, and platform adapters.

## Modules

- `core/`: device identity, pairing, discovery, safe filesystem access, metadata, streaming, transfer.
- `protocol/`: HTTP API bindings around the core modules.
- `windows/`: local service and browser-based Windows UI.
- `android/`: native Android client source.
- `tests/`: automated coverage for security-sensitive behavior.

## Runtime Model

Each device runs a small local service. Other devices discover it on the LAN and call its HTTP API to browse files, stream previews, upload files, or download files.

The server never exposes arbitrary filesystem paths. It maps request paths to one or more explicit shared roots and validates every path with canonical realpath checks.

## Preview Model

Preview and download use the same safe streaming layer. Media players can seek through HTTP range requests, so video and audio do not need to be fully downloaded before playback.

## Pairing Model

QR pairing is an explicit trust mechanism. It exchanges public keys and temporary connection hints, then stores trusted device identity public keys for later authenticated connections.

