"use strict";

const crypto = require("crypto");
const { badRequest, conflict } = require("./errors");
const { createEphemeralKeyPair, sign, verify, deriveSharedSecret } = require("./deviceIdentity");
const { encode } = require("./base64url");

const PREFIX = "kaiho-pair:";
const APP_ID = "kaiho.files";
const VERSION = 1;
const DEFAULT_TTL_SECONDS = 120;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createPayload(localDevice, endpoints, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const ephemeral = createEphemeralKeyPair();
  return {
    payload: {
      v: VERSION,
      app: APP_ID,
      pid: encode(crypto.randomBytes(18)),
      did: localDevice.deviceId,
      name: localDevice.displayName,
      plat: localDevice.platform,
      eps: endpoints,
      idpk: localDevice.identityPublicKey,
      epk: ephemeral.publicKey,
      exp: nowSeconds() + ttlSeconds,
      nonce: encode(crypto.randomBytes(18))
    },
    ephemeralPrivateKey: ephemeral.privateKey
  };
}

function encodeQrPayload(payload) {
  return `${PREFIX}${JSON.stringify(payload)}`;
}

function decodeQrPayload(text) {
  if (typeof text !== "string" || !text.startsWith(PREFIX)) {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  let payload;
  try {
    payload = JSON.parse(text.slice(PREFIX.length));
  } catch {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  validatePayload(payload);
  return payload;
}

function validateBase64Url(value, min = 16, max = 128) {
  return typeof value === "string" && value.length >= min && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  if (payload.app !== APP_ID) {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  if (payload.v !== VERSION) {
    throw badRequest("This pairing code uses an unsupported version of Kaiho Files.");
  }
  if (!validateBase64Url(payload.pid) || !validateBase64Url(payload.nonce) || !validateBase64Url(payload.idpk, 32) || !validateBase64Url(payload.epk, 32)) {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  if (!payload.did || !["windows", "android"].includes(payload.plat)) {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  if (!Number.isSafeInteger(payload.exp) || payload.exp <= nowSeconds()) {
    throw badRequest("QR code expired. Generate a new code.");
  }
  if (!Array.isArray(payload.eps) || payload.eps.length < 1 || payload.eps.length > 8) {
    throw badRequest("This isn't a valid Kaiho Files pairing code.");
  }
  for (const endpoint of payload.eps) {
    if (!endpoint || typeof endpoint.host !== "string" || !Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) {
      throw badRequest("This isn't a valid Kaiho Files pairing code.");
    }
  }
}

function transcriptHash(parts) {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

class PairingSessionManager {
  constructor(localDevice, store) {
    this.localDevice = localDevice;
    this.store = store;
    this.sessions = new Map();
  }

  createSession(endpoints, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const session = createPayload(this.localDevice, endpoints, ttlSeconds);
    this.sessions.set(session.payload.pid, {
      ...session,
      used: false,
      createdAt: nowSeconds()
    });
    return {
      payload: session.payload,
      qrText: encodeQrPayload(session.payload)
    };
  }

  getSession(pairingId) {
    const session = this.sessions.get(pairingId);
    if (!session || session.used || session.payload.exp <= nowSeconds()) {
      throw badRequest("QR code expired. Generate a new code.");
    }
    return session;
  }

  async acceptPairing(request) {
    const session = this.getSession(request.pid);
    if (request.nonce !== session.payload.nonce) {
      throw badRequest("Pairing could not be verified.");
    }
    const scannedTranscript = {
      qr: session.payload,
      scanner: {
        did: request.did,
        name: request.name,
        plat: request.plat,
        idpk: request.idpk,
        epk: request.epk
      }
    };
    const hash = transcriptHash(scannedTranscript);
    if (!verify(request.idpk, hash, request.sig)) {
      throw badRequest("Pairing could not be verified.");
    }
    session.used = true;
    const responseTranscript = {
      ...scannedTranscript,
      display: {
        did: this.localDevice.deviceId,
        idpk: this.localDevice.identityPublicKey,
        epk: session.payload.epk
      }
    };
    const responseHash = transcriptHash(responseTranscript);
    const responseSignature = sign(this.localDevice.identityPrivateKey, responseHash);
    const sharedSecret = deriveSharedSecret(session.ephemeralPrivateKey, request.epk, responseHash);
    await this.store.update((state) => {
      const exists = state.pairedDevices.some((device) => device.deviceId === request.did);
      if (exists) throw conflict("Device is already paired.");
      state.pairedDevices.push({
        deviceId: request.did,
        displayName: request.name || "Kaiho Device",
        userAlias: null,
        platform: request.plat,
        identityPublicKey: request.idpk,
        pairedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastKnownEndpoints: [],
        trustState: "trusted"
      });
      return state;
    });
    return {
      did: this.localDevice.deviceId,
      name: this.localDevice.displayName,
      plat: this.localDevice.platform,
      idpk: this.localDevice.identityPublicKey,
      epk: session.payload.epk,
      sig: responseSignature,
      transcript: responseHash,
      confirmation: sign(this.localDevice.identityPrivateKey, sharedSecret)
    };
  }
}

function createScannerPairingRequest(qrPayload, localDevice) {
  validatePayload(qrPayload);
  const ephemeral = createEphemeralKeyPair();
  const scanner = {
    did: localDevice.deviceId,
    name: localDevice.displayName,
    plat: localDevice.platform,
    idpk: localDevice.identityPublicKey,
    epk: ephemeral.publicKey
  };
  const hash = transcriptHash({ qr: qrPayload, scanner });
  return {
    request: {
      pid: qrPayload.pid,
      nonce: qrPayload.nonce,
      ...scanner,
      sig: sign(localDevice.identityPrivateKey, hash)
    },
    ephemeralPrivateKey: ephemeral.privateKey,
    transcript: hash
  };
}

module.exports = {
  PREFIX,
  APP_ID,
  VERSION,
  DEFAULT_TTL_SECONDS,
  createPayload,
  encodeQrPayload,
  decodeQrPayload,
  validatePayload,
  transcriptHash,
  PairingSessionManager,
  createScannerPairingRequest
};

