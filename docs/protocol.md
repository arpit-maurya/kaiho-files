# Kaiho Files Protocol

Base transport: HTTP over the local network.

Default port: `38471`

Discovery port: UDP multicast `239.255.42.42:38470`

## Endpoints

### `GET /api/device`

Returns local device information and shared-root summary.

### `GET /api/devices/nearby`

Returns devices discovered through LAN announcements.

### `GET /api/devices/paired`

Returns trusted paired devices.

### `POST /api/devices/paired/rename`

Body:

```json
{"deviceId":"dev_...","name":"Doremon-PC"}
```

### `POST /api/devices/paired/remove`

Removes trust for the device.

```json
{"deviceId":"dev_..."}
```

### `POST /api/pairing/session`

Creates a short-lived QR pairing session.

Returns:

```json
{
  "payload": {},
  "qrText": "kaiho-pair:{...}",
  "qr": "data:image/png;base64,..."
}
```

### `POST /api/pairing/accept`

Accepts a scanner pairing request after cryptographic validation.

### `GET /api/files?path=/&limit=200&offset=0`

Lists a directory.

### `GET /api/file/info?path=/file.txt`

Returns metadata for a file or directory.

### `GET /api/file/preview?path=/movie.mp4`

Streams a previewable file. Supports `Range`.

### `GET /api/file/stream?path=/movie.mp4`

Streams file bytes. Supports `Range`.

### `GET /api/file/download?path=/file.zip`

Downloads file bytes. Supports `Range`.

### `POST /api/file/upload?path=/target/name.ext`

Uploads bytes to a file inside the shared root.

### `POST /api/file/copy`

Copies a file inside the same exposed root.

```json
{"from":"/a.txt","to":"/copies/a.txt"}
```

## Range Requests

The server supports standard single-range byte requests:

```text
Range: bytes=0-1048575
```

Responses use `206 Partial Content` and `Content-Range`.

