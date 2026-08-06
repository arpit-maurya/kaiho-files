"use strict";

const dgram = require("dgram");
const os = require("os");
const EventEmitter = require("events");

const MULTICAST_ADDRESS = "239.255.42.42";
const DISCOVERY_PORT = 38470;

function privateAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

function makeAnnouncement(device, servicePort) {
  return {
    app: "kaiho.files",
    v: 1,
    type: "announce",
    device: {
      id: device.deviceId,
      name: device.displayName,
      platform: device.platform
    },
    endpoints: privateAddresses().map((host) => ({ host, port: servicePort })),
    sentAt: new Date().toISOString()
  };
}

class DiscoveryService extends EventEmitter {
  constructor(device, servicePort) {
    super();
    this.device = device;
    this.servicePort = servicePort;
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.timer = null;
    this.devices = new Map();
  }

  start() {
    this.socket.on("message", (message, rinfo) => {
      try {
        const payload = JSON.parse(message.toString("utf8"));
        if (payload.app !== "kaiho.files" || payload.type !== "announce") return;
        if (payload.device.id === this.device.deviceId) return;
        const record = { ...payload, remoteAddress: rinfo.address, lastSeenAt: new Date().toISOString() };
        this.devices.set(payload.device.id, record);
        this.emit("device", record);
      } catch {
        // Ignore malformed multicast traffic from other apps.
      }
    });
    this.socket.bind(DISCOVERY_PORT, () => {
      try {
        this.socket.addMembership(MULTICAST_ADDRESS);
        this.socket.setMulticastTTL(1);
      } catch {
        // Some networks block multicast. Manual connection and QR pairing still work.
      }
      this.announce();
      this.timer = setInterval(() => this.announce(), 5000);
    });
  }

  announce() {
    const buffer = Buffer.from(JSON.stringify(makeAnnouncement(this.device, this.servicePort)));
    this.socket.send(buffer, 0, buffer.length, DISCOVERY_PORT, MULTICAST_ADDRESS);
  }

  list() {
    return Array.from(this.devices.values());
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.socket.close();
  }
}

module.exports = {
  MULTICAST_ADDRESS,
  DISCOVERY_PORT,
  privateAddresses,
  makeAnnouncement,
  DiscoveryService
};

