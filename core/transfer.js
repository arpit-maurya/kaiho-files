"use strict";

const fs = require("fs");
const path = require("path");
const { resolveInsideRoot, resolveWritableInsideRoot } = require("./safePath");
const { badRequest } = require("./errors");

async function copyInsideRoot(rootPath, fromPath, toPath, onProgress = () => {}) {
  const source = await resolveInsideRoot(rootPath, fromPath);
  const target = await resolveWritableInsideRoot(rootPath, toPath);
  const stat = await fs.promises.stat(source.absolutePath);
  if (!stat.isFile()) {
    throw badRequest("Only file copy is supported by this endpoint.");
  }
  await fs.promises.mkdir(path.dirname(target.absolutePath), { recursive: true });
  return new Promise((resolve, reject) => {
    let copied = 0;
    const startedAt = Date.now();
    const read = fs.createReadStream(source.absolutePath);
    const write = fs.createWriteStream(target.absolutePath, { flags: "wx" });
    read.on("data", (chunk) => {
      copied += chunk.length;
      onProgress({
        filename: path.basename(source.absolutePath),
        transferred: copied,
        total: stat.size,
        speedBytesPerSecond: copied / Math.max((Date.now() - startedAt) / 1000, 0.001)
      });
    });
    read.on("error", reject);
    write.on("error", reject);
    write.on("finish", () => resolve({ from: fromPath, to: toPath, bytes: copied }));
    read.pipe(write);
  });
}

module.exports = { copyInsideRoot };

