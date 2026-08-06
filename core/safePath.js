"use strict";

const fs = require("fs");
const path = require("path");
const { badRequest, forbidden, notFound } = require("./errors");

function normalizeRequestPath(requestPath = "/") {
  if (typeof requestPath !== "string") {
    throw badRequest("Path must be a string.");
  }
  const decoded = requestPath.replace(/\\/g, "/");
  if (decoded.includes("\0")) {
    throw badRequest("Path contains an invalid character.");
  }
  if (decoded.split("/").includes("..")) {
    throw forbidden("Path traversal is not allowed.");
  }
  const normalized = path.posix.normalize(decoded.startsWith("/") ? decoded : `/${decoded}`);
  return normalized;
}

async function ensureRoot(rootPath) {
  const absolute = path.resolve(rootPath);
  try {
    const stat = await fs.promises.stat(absolute);
    if (!stat.isDirectory()) {
      throw badRequest("Shared root must be a directory.", { rootPath });
    }
    return await fs.promises.realpath(absolute);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw notFound("Shared root does not exist.", { rootPath });
    }
    throw error;
  }
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function resolveInsideRoot(rootPath, requestPath = "/") {
  const root = await ensureRoot(rootPath);
  const safeRequestPath = normalizeRequestPath(requestPath);
  if (safeRequestPath === "/") {
    return { root, requestPath: safeRequestPath, absolutePath: root };
  }
  const joined = path.join(root, safeRequestPath.slice(1));
  const parent = await fs.promises.realpath(path.dirname(joined)).catch((error) => {
    if (error.code === "ENOENT") {
      throw notFound("Parent directory does not exist.", { requestPath });
    }
    throw error;
  });
  if (!isInside(root, parent)) {
    throw forbidden("Path escapes the shared root.");
  }
  const finalPath = path.join(parent, path.basename(joined));
  const finalReal = await fs.promises.realpath(finalPath).catch((error) => {
    if (error.code === "ENOENT") {
      throw notFound("Path does not exist.", { requestPath });
    }
    throw error;
  });
  if (!isInside(root, finalReal)) {
    throw forbidden("Path escapes the shared root.");
  }
  return { root, requestPath: safeRequestPath, absolutePath: finalReal };
}

async function resolveWritableInsideRoot(rootPath, requestPath = "/") {
  const root = await ensureRoot(rootPath);
  const safeRequestPath = normalizeRequestPath(requestPath);
  if (safeRequestPath === "/") {
    throw badRequest("Cannot write a file over the shared root.");
  }
  const absolutePath = path.resolve(root, safeRequestPath.slice(1));
  if (!isInside(root, absolutePath)) {
    throw forbidden("Path escapes the shared root.");
  }
  return { root, requestPath: safeRequestPath, absolutePath };
}

module.exports = {
  normalizeRequestPath,
  ensureRoot,
  isInside,
  resolveInsideRoot,
  resolveWritableInsideRoot
};
