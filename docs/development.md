# Development

## Run The Windows Service

```powershell
npm install
npm start
```

## Run Tests

```powershell
npm test
```

## Useful Environment Variables

- `KAIHO_PORT`: HTTP service port. Default: `38471`.
- `KAIHO_SHARE`: shared folder path. Default: `.kaiho/share`.
- `KAIHO_STATE`: state file path. Default: `.kaiho/state.json`.

## Android

Open `android/` in Android Studio. The module declares CameraX and ML Kit for the QR scanner implementation and uses background executors for network and discovery work.

