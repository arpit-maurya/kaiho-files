"use strict";

const fs = require("fs");
const path = require("path");
const { createDeviceIdentity } = require("./deviceIdentity");

function defaultState(sharedRoot) {
  return {
    localDevice: createDeviceIdentity("windows"),
    sharedRoots: [sharedRoot],
    pairedDevices: []
  };
}

class JsonStore {
  constructor(filePath, sharedRoot) {
    this.filePath = filePath;
    this.sharedRoot = sharedRoot;
  }

  static defaultPath() {
    return path.join(process.cwd(), ".kaiho", "state.json");
  }

  async load() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const state = defaultState(this.sharedRoot);
      await this.save(state);
      return state;
    }
  }

  async save(state) {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.promises.writeFile(this.filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  async update(updater) {
    const state = await this.load();
    const next = await updater(state);
    await this.save(next || state);
    return next || state;
  }
}

module.exports = { JsonStore };
