"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { normalizeRequestPath, resolveInsideRoot } = require("../core/safePath");

const TMP = path.join(__dirname, ".tmp-safe");

test.beforeEach(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
  await fs.promises.mkdir(path.join(TMP, "root", "nested"), { recursive: true });
  await fs.promises.writeFile(path.join(TMP, "root", "nested", "file.txt"), "hello");
});

test.after(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
});

test("normalizes safe request paths", () => {
  assert.equal(normalizeRequestPath("nested/file.txt"), "/nested/file.txt");
  assert.equal(normalizeRequestPath("/nested/./file.txt"), "/nested/file.txt");
});

test("rejects traversal paths", () => {
  assert.throws(() => normalizeRequestPath("../secret.txt"), /Path traversal/);
  assert.throws(() => normalizeRequestPath("nested\\..\\..\\secret.txt"), /Path traversal/);
});

test("resolves files inside the shared root", async () => {
  const result = await resolveInsideRoot(path.join(TMP, "root"), "/nested/file.txt");
  assert.equal(await fs.promises.readFile(result.absolutePath, "utf8"), "hello");
});

test("does not resolve paths outside the shared root", async () => {
  await assert.rejects(() => resolveInsideRoot(path.join(TMP, "root"), "/missing/../../secret.txt"), /Path traversal/);
});

