# Kaiho Files

Kaiho Files is an offline, LAN-based, cross-platform file browser and transfer application for Windows and Android.

It is not a sync tool. The core workflow is:

1. Open Kaiho Files.
2. Discover nearby devices on the same LAN.
3. Browse exposed remote folders.
4. Preview supported files over the network.
5. Transfer files only when desired.

No accounts, cloud service, external server, telemetry service, or Internet connection is required at runtime.

## Features

- LAN-only HTTP protocol for remote filesystem browsing.
- Automatic local discovery using LAN multicast announcements.
- Shared-root security model; the service exposes only configured folders.
- Path traversal protection using canonical path validation.
- Paginated directory listing.
- File metadata and preview classification.
- HTTP range support for image, video, audio, PDF, text, and download streams.
- Upload and local copy endpoints using streaming I/O.
- QR-code-based pairing design implemented in the core protocol.
- Paired device management with rename and revoke/remove.
- Windows-friendly browser UI served by the local Kaiho service.
- Android project structure with discovery, protocol client, scoped-storage model, and QR scan entry point.

## Repository Structure

```text
kaiho-files/
  core/        Shared protocol, filesystem, discovery, transfer, and pairing logic
  protocol/    HTTP API adapter
  windows/     Windows local service and web UI
  android/     Android app module
  docs/        Architecture, protocol, security, and development notes
  tests/       Node test suite
```

## Windows Build And Run

Requirements:

- Node.js 20 or newer.

Install dependencies:

```powershell
npm install
```

Run the Windows LAN service and UI:

```powershell
npm start
```

Then open:

```text
http://localhost:38471
```

By default, Kaiho Files exposes:

```text
.kaiho/share
```

You can choose another shared root:

```powershell
$env:KAIHO_SHARE="D:\KaihoShare"
npm start
```

## Android Build

Requirements:

- Android Studio or Android SDK command-line tools.
- JDK 17 or newer.

From the `android/` directory:

```bash
./gradlew assembleDebug
```

This environment did not include Java or Gradle, so the Android module was not compiled here. The source is structured for a native Android client and declares CameraX plus ML Kit Barcode Scanning for the QR scanner flow.

## Tests

Run:

```powershell
npm test
```

The tests cover path traversal prevention, directory listing, range parsing, discovery payloads, transfer copy, and QR pairing payload validation.

## Security Model

- Devices expose only explicit shared roots.
- Paths are normalized and validated against canonical real paths.
- Private keys, passwords, tokens, filesystem paths, and personal data are not placed in QR payloads.
- QR pairing payloads are short-lived and single-use.
- Pairing establishes trust with device identity public keys.
- Removing a pairing revokes the trusted public key.

See [docs/security.md](docs/security.md) for more detail.

## Known Limitations

- The Windows app is currently a local Node service with a polished browser UI, not a packaged native WinUI installer.
- QR image rendering uses the mature `qrcode` package; if dependencies are not installed, the API still returns the pairing payload for development diagnostics.
- Android has the native module architecture and discovery/protocol foundation, but the full CameraX scanning screen and remote browser UI need the Android toolchain to complete and verify.
- mDNS/Bonjour is documented as a target, while this implementation uses LAN multicast announcements as the first discovery backend.
- Thumbnail generation is not yet implemented; preview streams are available directly.

## Roadmap

- Package the Windows service as a native tray/desktop app.
- Complete Android CameraX scanner and file browser screens.
- Add thumbnail cache and progressive media grids.
- Add resumable transfers.
- Add mDNS backend alongside multicast fallback.
- Add authenticated transport for all privileged post-pairing requests.

