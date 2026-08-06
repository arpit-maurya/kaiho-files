"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const { JsonStore } = require("../core/store");
const { createDeviceIdentity } = require("../core/deviceIdentity");
const {
  PairingSessionManager,
  decodeQrPayload,
  createScannerPairingRequest
} = require("../core/pairing");

const TMP = path.join(__dirname, ".tmp-pairing");

test.beforeEach(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
  await fs.promises.mkdir(TMP, { recursive: true });
});

test.after(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
});

test("creates QR payloads without sensitive filesystem data", async () => {
  const display = createDeviceIdentity("windows");
  const store = new JsonStore(path.join(TMP, "state.json"), TMP);
  await store.save({ localDevice: display, sharedRoots: [TMP], pairedDevices: [] });
  const manager = new PairingSessionManager(display, store);
  const session = manager.createSession([{ host: "192.168.1.10", port: 38471 }]);
  const decoded = decodeQrPayload(session.qrText);
  assert.equal(decoded.app, "kaiho.files");
  assert.equal(decoded.plat, "windows");
  assert.equal(JSON.stringify(decoded).includes(TMP), false);
  assert.equal(JSON.stringify(decoded).includes("identityPrivateKey"), false);
});

test("rejects expired QR payloads", () => {
  const expired = 'kaiho-pair:{"v":1,"app":"kaiho.files","pid":"abcdefghijklmnop","did":"dev_a","plat":"windows","eps":[{"host":"192.168.1.10","port":38471}],"idpk":"abcdefghijklmnopqrstuvwxyzABCDEF","epk":"abcdefghijklmnopqrstuvwxyzABCDEF","exp":1700000001,"nonce":"abcdefghijklmnop"}';
  assert.throws(() => decodeQrPayload(expired), /expired/);
});

test("accepts a signed scanner request and stores trust", async () => {
  const display = createDeviceIdentity("windows");
  const scanner = createDeviceIdentity("android");
  const store = new JsonStore(path.join(TMP, "state.json"), TMP);
  await store.save({ localDevice: display, sharedRoots: [TMP], pairedDevices: [] });
  const manager = new PairingSessionManager(display, store);
  const session = manager.createSession([{ host: "192.168.1.10", port: 38471 }]);
  const request = createScannerPairingRequest(session.payload, scanner);
  const response = await manager.acceptPairing(request.request);
  assert.equal(response.did, display.deviceId);
  const state = await store.load();
  assert.equal(state.pairedDevices.length, 1);
  assert.equal(state.pairedDevices[0].deviceId, scanner.deviceId);
});

