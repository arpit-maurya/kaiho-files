"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { JsonStore } = require("../core/store");
const { PairingSessionManager } = require("../core/pairing");
const { DiscoveryService, privateAddresses } = require("../core/discovery");
const { createApiHandler } = require("../protocol/httpApi");
const { contentTypeFor } = require("../core/mime");

const PORT = Number(process.env.KAIHO_PORT || 38471);
const REPO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const SHARE_ROOT = path.resolve(process.env.KAIHO_SHARE || path.join(REPO_ROOT, ".kaiho", "share"));
const STORE_PATH = process.env.KAIHO_STATE || JsonStore.defaultPath();

async function ensureShareRoot() {
  await fs.promises.mkdir(SHARE_ROOT, { recursive: true });
  const readme = path.join(SHARE_ROOT, "Welcome to Kaiho Files.txt");
  try {
    await fs.promises.writeFile(readme, "Drop files here to expose them through Kaiho Files on your LAN.\n", { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function qrDataUrl(text) {
  try {
    const QRCode = require("qrcode");
    return await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, width: 280 });
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const absolute = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.createReadStream(absolute)
    .on("error", () => {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    })
    .once("open", () => {
      res.writeHead(200, { "Content-Type": contentTypeFor(absolute) });
    })
    .pipe(res);
}

async function main() {
  await ensureShareRoot();
  const store = new JsonStore(STORE_PATH, SHARE_ROOT);
  const state = await store.load();
  const pairing = new PairingSessionManager(state.localDevice, store);
  const discovery = new DiscoveryService(state.localDevice, PORT);
  const context = {
    store,
    discovery,
    pairing,
    rootPath: SHARE_ROOT,
    endpoints: () => privateAddresses().map((host) => ({ host, port: PORT })),
    getQrPngDataUrl: qrDataUrl
  };
  const api = createApiHandler(context);
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) {
      const handled = await api(req, res);
      if (handled) return;
    }
    serveStatic(req, res);
  });
  server.listen(PORT, () => {
    discovery.start();
    console.log(`Kaiho Files is running at http://localhost:${PORT}`);
    console.log(`Shared root: ${SHARE_ROOT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

