"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { makeAnnouncement } = require("../core/discovery");

test("creates a LAN discovery announcement", () => {
  const announcement = makeAnnouncement({
    deviceId: "dev_test",
    displayName: "Doremon-PC",
    platform: "windows"
  }, 38471);
  assert.equal(announcement.app, "kaiho.files");
  assert.equal(announcement.v, 1);
  assert.equal(announcement.type, "announce");
  assert.equal(announcement.device.name, "Doremon-PC");
  assert.ok(Array.isArray(announcement.endpoints));
});

