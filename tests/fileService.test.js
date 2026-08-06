"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { listDirectory, getInfo, parseRange, createReadStream } = require("../core/fileService");

const TMP = path.join(__dirname, ".tmp-files");

test.beforeEach(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
  await fs.promises.mkdir(path.join(TMP, "root", "Images"), { recursive: true });
  await fs.promises.writeFile(path.join(TMP, "root", "a file.txt"), "hello world");
  await fs.promises.writeFile(path.join(TMP, "root", "Images", "photo.jpg"), Buffer.alloc(100));
});

test.after(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
});

test("lists directories with metadata", async () => {
  const result = await listDirectory(path.join(TMP, "root"), "/");
  assert.equal(result.total, 2);
  assert.equal(result.entries[0].type, "directory");
  assert.equal(result.entries[1].name, "a file.txt");
});

test("returns file info and preview kind", async () => {
  const info = await getInfo(path.join(TMP, "root"), "/Images/photo.jpg");
  assert.equal(info.contentType, "image/jpeg");
  assert.equal(info.preview, "image");
});

test("parses range headers", () => {
  assert.deepEqual(parseRange("bytes=0-4", 11), { start: 0, end: 4, partial: true });
  assert.deepEqual(parseRange("bytes=6-", 11), { start: 6, end: 10, partial: true });
  assert.deepEqual(parseRange("bytes=-5", 11), { start: 6, end: 10, partial: true });
  assert.throws(() => parseRange("items=0-2", 11), /Invalid Range/);
});

test("streams requested byte range", async () => {
  const file = await createReadStream(path.join(TMP, "root"), "/a file.txt", "bytes=0-4");
  const chunks = [];
  for await (const chunk of file.stream) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString("utf8"), "hello");
  assert.equal(file.contentLength, 5);
});

