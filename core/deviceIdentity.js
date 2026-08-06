"use strict";

const crypto = require("crypto");
const os = require("os");
const { encode } = require("./base64url");

function exportPublicKey(keyObject) {
  return encode(keyObject.export({ type: "spki", format: "der" }));
}

function exportPrivateKey(keyObject) {
  return encode(keyObject.export({ type: "pkcs8", format: "der" }));
}

function importPublicKey(encodedKey, algorithm = "ed25519") {
  return crypto.createPublicKey({
    key: Buffer.from(encodedKey.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    type: "spki",
    format: "der",
    namedCurve: algorithm
  });
}

function importPrivateKey(encodedKey) {
  return crypto.createPrivateKey({
    key: Buffer.from(encodedKey.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    type: "pkcs8",
    format: "der"
  });
}

function createDeviceIdentity(platform = process.platform === "win32" ? "windows" : "unknown") {
  const identity = crypto.generateKeyPairSync("ed25519");
  return {
    deviceId: `dev_${crypto.randomBytes(8).toString("hex")}`,
    displayName: os.hostname() || "Kaiho Device",
    platform,
    identityPublicKey: exportPublicKey(identity.publicKey),
    identityPrivateKey: exportPrivateKey(identity.privateKey)
  };
}

function createEphemeralKeyPair() {
  const pair = crypto.generateKeyPairSync("x25519");
  return {
    publicKey: exportPublicKey(pair.publicKey),
    privateKey: exportPrivateKey(pair.privateKey)
  };
}

function sign(privateKeyEncoded, payload) {
  const privateKey = importPrivateKey(privateKeyEncoded);
  return encode(crypto.sign(null, Buffer.from(payload), privateKey));
}

function verify(publicKeyEncoded, payload, signatureEncoded) {
  try {
    const publicKey = importPublicKey(publicKeyEncoded);
    return crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signatureEncoded.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  } catch {
    return false;
  }
}

function deriveSharedSecret(privateKeyEncoded, remotePublicKeyEncoded, transcriptHash) {
  const privateKey = importPrivateKey(privateKeyEncoded);
  const remotePublicKey = importPublicKey(remotePublicKeyEncoded, "x25519");
  const secret = crypto.diffieHellman({ privateKey, publicKey: remotePublicKey });
  return encode(crypto.hkdfSync("sha256", secret, Buffer.from("kaiho-files-pairing-v1"), Buffer.from(transcriptHash), 32));
}

module.exports = {
  createDeviceIdentity,
  createEphemeralKeyPair,
  exportPublicKey,
  sign,
  verify,
  deriveSharedSecret
};

