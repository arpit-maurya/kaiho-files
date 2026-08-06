"use strict";

const fs = require("fs");
const path = require("path");
const { contentTypeFor, previewKind } = require("./mime");
const { badRequest } = require("./errors");
const { resolveInsideRoot, resolveWritableInsideRoot } = require("./safePath");

function toApiPath(parent, name) {
  return path.posix.join(parent.replace(/\\/g, "/"), name).replace(/^\/?/, "/");
}

function fileMetadataFromStat(apiPath, name, stat) {
  const isDirectory = stat.isDirectory();
  return {
    name,
    path: apiPath,
    type: isDirectory ? "directory" : "file",
    size: isDirectory ? null : stat.size,
    modifiedAt: stat.mtime.toISOString(),
    contentType: isDirectory ? null : contentTypeFor(name),
    preview: isDirectory ? "none" : previewKind(name)
  };
}

async function listDirectory(rootPath, requestPath = "/", options = {}) {
  const { absolutePath, requestPath: safePath } = await resolveInsideRoot(rootPath, requestPath);
  const stat = await fs.promises.stat(absolutePath);
  if (!stat.isDirectory()) {
    throw badRequest("Requested path is not a directory.");
  }
  const limit = Math.min(Number(options.limit || 200), 500);
  const offset = Math.max(Number(options.offset || 0), 0);
  const dirents = await fs.promises.readdir(absolutePath, { withFileTypes: true });
  const sorted = dirents.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const page = sorted.slice(offset, offset + limit);
  const entries = await Promise.all(page.map(async (entry) => {
    const entryPath = path.join(absolutePath, entry.name);
    const entryStat = await fs.promises.stat(entryPath);
    return fileMetadataFromStat(toApiPath(safePath, entry.name), entry.name, entryStat);
  }));
  return {
    path: safePath,
    total: sorted.length,
    offset,
    limit,
    entries
  };
}

async function getInfo(rootPath, requestPath) {
  const { absolutePath, requestPath: safePath } = await resolveInsideRoot(rootPath, requestPath);
  const stat = await fs.promises.stat(absolutePath);
  return fileMetadataFromStat(safePath, path.basename(absolutePath), stat);
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader) {
    return { start: 0, end: size - 1, partial: false };
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    throw badRequest("Invalid Range header.");
  }
  let start = match[1] === "" ? null : Number(match[1]);
  let end = match[2] === "" ? null : Number(match[2]);
  if (start === null && end === null) {
    throw badRequest("Invalid Range header.");
  }
  if (start === null) {
    const suffixLength = end;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else if (end === null) {
    end = size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) {
    throw badRequest("Invalid Range header.");
  }
  return { start, end: Math.min(end, size - 1), partial: true };
}

async function createReadStream(rootPath, requestPath, rangeHeader) {
  const { absolutePath } = await resolveInsideRoot(rootPath, requestPath);
  const stat = await fs.promises.stat(absolutePath);
  if (!stat.isFile()) {
    throw badRequest("Requested path is not a file.");
  }
  const range = parseRange(rangeHeader, stat.size);
  const stream = fs.createReadStream(absolutePath, { start: range.start, end: range.end });
  return {
    stream,
    size: stat.size,
    contentType: contentTypeFor(absolutePath),
    range,
    contentLength: range.end - range.start + 1
  };
}

async function writeUpload(rootPath, requestPath, readable) {
  const { absolutePath } = await resolveWritableInsideRoot(rootPath, requestPath);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  const writable = fs.createWriteStream(absolutePath, { flags: "wx" });
  return new Promise((resolve, reject) => {
    let bytes = 0;
    readable.on("data", (chunk) => {
      bytes += chunk.length;
    });
    readable.pipe(writable);
    readable.on("error", reject);
    writable.on("error", reject);
    writable.on("finish", () => resolve({ path: requestPath, bytes }));
  });
}

module.exports = {
  listDirectory,
  getInfo,
  parseRange,
  createReadStream,
  writeUpload
};

