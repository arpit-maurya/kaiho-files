"use strict";

const { URL } = require("url");
const { listDirectory, getInfo, createReadStream, writeUpload } = require("../core/fileService");
const { copyInsideRoot } = require("../core/transfer");
const { KaihoError, badRequest, notFound } = require("../core/errors");

function json(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body, null, 2));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(badRequest("Request body must be valid JSON."));
      }
    });
  });
}

function handleError(res, error) {
  if (error instanceof KaihoError) {
    json(res, error.status, { error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  json(res, 500, { error: { code: "internal_error", message: "Kaiho Files hit an unexpected error." } });
}

function createApiHandler(context) {
  const { store, discovery, pairing, rootPath, getQrPngDataUrl } = context;

  return async function apiHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Range",
          "Access-Control-Max-Age": "600"
        });
        res.end();
        return true;
      }
      if (req.method === "GET" && url.pathname === "/api/device") {
        const state = await store.load();
        json(res, 200, {
          device: {
            id: state.localDevice.deviceId,
            name: state.localDevice.displayName,
            platform: state.localDevice.platform
          },
          sharedRoots: state.sharedRoots.map((root) => ({ path: root })),
          discoverable: true
        });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/devices/nearby") {
        json(res, 200, { devices: discovery ? discovery.list() : [] });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/devices/paired") {
        const state = await store.load();
        json(res, 200, { devices: state.pairedDevices });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/devices/paired/remove") {
        const body = await readJson(req);
        await store.update((state) => {
          state.pairedDevices = state.pairedDevices.filter((device) => device.deviceId !== body.deviceId);
          return state;
        });
        json(res, 200, { ok: true });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/devices/paired/rename") {
        const body = await readJson(req);
        await store.update((state) => {
          const device = state.pairedDevices.find((candidate) => candidate.deviceId === body.deviceId);
          if (!device) throw notFound("Paired device was not found.");
          device.userAlias = String(body.name || "").trim().slice(0, 80) || null;
          return state;
        });
        json(res, 200, { ok: true });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/pairing/session") {
        const session = pairing.createSession(context.endpoints());
        const qr = await getQrPngDataUrl(session.qrText);
        json(res, 200, { ...session, qr });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/pairing/accept") {
        const body = await readJson(req);
        const accepted = await pairing.acceptPairing(body);
        json(res, 200, accepted);
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/files") {
        const result = await listDirectory(rootPath, url.searchParams.get("path") || "/", {
          limit: url.searchParams.get("limit"),
          offset: url.searchParams.get("offset")
        });
        json(res, 200, result);
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/file/info") {
        json(res, 200, await getInfo(rootPath, url.searchParams.get("path") || "/"));
        return true;
      }

      if (req.method === "GET" && ["/api/file/stream", "/api/file/download", "/api/file/preview"].includes(url.pathname)) {
        const file = await createReadStream(rootPath, url.searchParams.get("path") || "/", req.headers.range);
        const headers = {
          "Content-Type": file.contentType,
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": "*",
          "Content-Length": file.contentLength,
          "Cache-Control": "private, max-age=30"
        };
        if (file.range.partial) {
          headers["Content-Range"] = `bytes ${file.range.start}-${file.range.end}/${file.size}`;
          res.writeHead(206, headers);
        } else {
          res.writeHead(200, headers);
        }
        file.stream.pipe(res);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/file/upload") {
        const targetPath = url.searchParams.get("path");
        if (!targetPath) throw badRequest("Missing upload path.");
        json(res, 201, await writeUpload(rootPath, targetPath, req));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/file/copy") {
        const body = await readJson(req);
        json(res, 200, await copyInsideRoot(rootPath, body.from, body.to));
        return true;
      }

      return false;
    } catch (error) {
      handleError(res, error);
      return true;
    }
  };
}

module.exports = {
  createApiHandler,
  json,
  readJson,
  handleError
};
