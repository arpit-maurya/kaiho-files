"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { copyInsideRoot } = require("../core/transfer");

const TMP = path.join(__dirname, ".tmp-transfer");

test.beforeEach(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
  await fs.promises.mkdir(path.join(TMP, "root"), { recursive: true });
  await fs.promises.writeFile(path.join(TMP, "root", "source.txt"), "copy me");
});

test.after(async () => {
  await fs.promises.rm(TMP, { recursive: true, force: true });
});

test("copies a file inside the shared root using streaming IO", async () => {
  const progress = [];
  const result = await copyInsideRoot(path.join(TMP, "root"), "/source.txt", "/copies/target.txt", (event) => progress.push(event));
  assert.equal(result.bytes, 7);
  assert.equal(await fs.promises.readFile(path.join(TMP, "root", "copies", "target.txt"), "utf8"), "copy me");
  assert.ok(progress.length >= 1);
});

