"use strict";

const state = {
  device: null,
  baseUrl: "",
  currentPath: "/",
  history: [],
  files: [],
  viewMode: "list",
  activeView: "home"
};

const $ = (id) => document.getElementById(id);

function api(path, options = {}, base = state.baseUrl) {
  return fetch(`${base}${path}`, options).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(body.error?.message || "Request failed.");
    }
    return response.json();
  });
}

function humanSize(size) {
  if (size == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function showView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach((element) => element.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  if (view === "home") {
    $("homeView").classList.add("active");
    $("viewTitle").textContent = "Nearby Devices";
    $("viewSubtitle").textContent = "Browse and transfer files over your local network.";
  } else if (view === "this-device") {
    openBrowser("", "/", "This Device");
  } else if (view === "transfers") {
    $("transfersView").classList.add("active");
    $("viewTitle").textContent = "Transfers";
    $("viewSubtitle").textContent = "Watch copy, upload, and download activity.";
  } else if (view === "settings") {
    $("settingsView").classList.add("active");
    $("viewTitle").textContent = "Settings";
    $("viewSubtitle").textContent = "Shared folders, pairing, and LAN visibility.";
  }
}

function renderDeviceList(target, devices, paired = false) {
  target.innerHTML = "";
  if (!devices.length) {
    target.innerHTML = `<p class="muted">${paired ? "No paired devices yet." : "No nearby devices found yet."}</p>`;
    return;
  }
  for (const item of devices) {
    const device = item.device || item;
    const endpoint = item.endpoints?.[0] || item.lastKnownEndpoints?.[0];
    const name = device.name || item.userAlias || item.displayName || "Kaiho Device";
    const card = document.createElement("article");
    card.className = "device-card";
    card.innerHTML = `
      <div class="device-title">
        <strong>${escapeHtml(item.userAlias || name)}</strong>
        <span class="status">${paired ? item.trustState : "Online"}</span>
      </div>
      <p class="muted">${escapeHtml(device.platform || item.platform || "Unknown platform")}</p>
      <div class="top-actions">
        <button class="primary connect">Browse</button>
        ${paired ? `<button class="secondary rename">Rename</button><button class="secondary remove">Remove</button>` : ""}
      </div>
    `;
    card.querySelector(".connect").addEventListener("click", () => {
      if (!endpoint) return alert("No reachable endpoint is known for this device.");
      openBrowser(`http://${endpoint.host}:${endpoint.port}`, "/", name);
    });
    const rename = card.querySelector(".rename");
    if (rename) {
      rename.addEventListener("click", async () => {
        const newName = prompt("Rename paired device", item.userAlias || item.displayName || name);
        if (newName == null) return;
        await api("/api/devices/paired/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: item.deviceId, name: newName })
        }, "");
        refreshHome();
      });
    }
    const remove = card.querySelector(".remove");
    if (remove) {
      remove.addEventListener("click", async () => {
        if (!confirm("Remove pairing and revoke trust for this device?")) return;
        await api("/api/devices/paired/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: item.deviceId })
        }, "");
        refreshHome();
      });
    }
    target.appendChild(card);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

async function refreshHome() {
  const [device, nearby, paired] = await Promise.all([
    api("/api/device", {}, ""),
    api("/api/devices/nearby", {}, ""),
    api("/api/devices/paired", {}, "")
  ]);
  state.device = device.device;
  $("deviceName").textContent = device.device.name;
  $("sharedRoots").textContent = device.sharedRoots.map((root) => root.path).join(", ");
  renderDeviceList($("nearbyDevices"), nearby.devices);
  renderDeviceList($("pairedDevices"), paired.devices, true);
}

async function openBrowser(baseUrl, path, title) {
  state.baseUrl = baseUrl;
  state.currentPath = path;
  state.history = [];
  $("browserView").classList.add("active");
  $("homeView").classList.remove("active");
  $("settingsView").classList.remove("active");
  $("transfersView").classList.remove("active");
  $("viewTitle").textContent = title;
  $("viewSubtitle").textContent = baseUrl ? baseUrl : "Local shared folder";
  await loadFiles(path);
}

async function loadFiles(path) {
  const data = await api(`/api/files?path=${encodeURIComponent(path)}&limit=300`);
  state.currentPath = data.path;
  state.files = data.entries;
  $("breadcrumbs").textContent = data.path;
  renderFiles();
}

function renderFiles() {
  const filter = $("searchInput").value.trim().toLowerCase();
  const fileList = $("fileList");
  fileList.className = `file-list ${state.viewMode}`;
  fileList.innerHTML = "";
  for (const file of state.files.filter((entry) => entry.name.toLowerCase().includes(filter))) {
    const row = document.createElement("article");
    row.className = "file-row";
    row.innerHTML = `
      <div>
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-meta">${file.type}${file.size != null ? ` · ${humanSize(file.size)}` : ""} · ${new Date(file.modifiedAt).toLocaleString()}</div>
      </div>
      <button class="secondary">${file.type === "directory" ? "Open" : "Preview"}</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (file.type === "directory") {
        state.history.push(state.currentPath);
        loadFiles(file.path);
      } else {
        previewFile(file);
      }
    });
    fileList.appendChild(row);
  }
}

async function previewFile(file) {
  $("previewEmpty").style.display = "none";
  const container = $("previewContent");
  const encoded = encodeURIComponent(file.path);
  const src = `${state.baseUrl}/api/file/preview?path=${encoded}`;
  const download = `${state.baseUrl}/api/file/download?path=${encoded}`;
  const actions = `<div class="top-actions"><a class="primary" href="${download}" download>Download</a></div>`;
  if (file.preview === "image") {
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><p class="muted">${humanSize(file.size)}</p><img alt="${escapeHtml(file.name)}" src="${src}">${actions}`;
  } else if (file.preview === "video") {
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><video controls src="${src}"></video>${actions}`;
  } else if (file.preview === "audio") {
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><audio controls src="${src}"></audio>${actions}`;
  } else if (file.preview === "pdf") {
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><iframe title="${escapeHtml(file.name)}" src="${src}"></iframe>${actions}`;
  } else if (file.preview === "text") {
    const text = await fetch(src).then((response) => response.text());
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><pre>${escapeHtml(text.slice(0, 200000))}</pre>${actions}`;
  } else {
    container.innerHTML = `<h2>${escapeHtml(file.name)}</h2><p class="muted">Preview is not available for this file type.</p>${actions}`;
  }
}

async function openPairDialog() {
  $("qrBox").innerHTML = "Generating...";
  $("qrPayloadText").value = "";
  $("pairDialog").showModal();
  try {
    const session = await api("/api/pairing/session", { method: "POST" }, "");
    $("qrPayloadText").value = session.qrText;
    if (session.qr) {
      $("qrBox").innerHTML = `<img alt="Kaiho Files pairing QR code" src="${session.qr}">`;
    } else {
      $("qrBox").innerHTML = `<p class="muted">Install dependencies with npm install to render the QR image. The payload is shown below for development builds.</p>`;
    }
  } catch (error) {
    $("qrBox").innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function uploadFiles(files) {
  for (const file of files) {
    const target = `${state.currentPath.replace(/\/$/, "")}/${file.name}`;
    const startedAt = Date.now();
    const item = document.createElement("div");
    item.className = "file-row";
    item.innerHTML = `<div><div class="file-name">${escapeHtml(file.name)}</div><div class="file-meta">Uploading...</div></div>`;
    $("transferList").appendChild(item);
    await fetch(`/api/file/upload?path=${encodeURIComponent(target)}`, { method: "POST", body: file });
    item.querySelector(".file-meta").textContent = `Uploaded ${humanSize(file.size)} in ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))}s`;
  }
  await loadFiles(state.currentPath);
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  $("refreshBtn").addEventListener("click", () => state.activeView === "home" ? refreshHome() : loadFiles(state.currentPath));
  $("pairBtn").addEventListener("click", openPairDialog);
  $("newPairFromSettings").addEventListener("click", openPairDialog);
  $("manualConnectBtn").addEventListener("click", () => $("manualDialog").showModal());
  $("connectManualBtn").addEventListener("click", (event) => {
    event.preventDefault();
    const url = $("manualUrl").value.trim().replace(/\/$/, "");
    if (url) {
      $("manualDialog").close();
      openBrowser(url, "/", url);
    }
  });
  $("backBtn").addEventListener("click", () => {
    const previous = state.history.pop();
    if (previous) loadFiles(previous);
  });
  $("searchInput").addEventListener("input", renderFiles);
  $("viewToggleBtn").addEventListener("click", () => {
    state.viewMode = state.viewMode === "list" ? "grid" : "list";
    $("viewToggleBtn").textContent = state.viewMode === "list" ? "Grid" : "List";
    renderFiles();
  });
  $("uploadInput").addEventListener("change", (event) => uploadFiles(event.target.files));
}

bindEvents();
refreshHome().catch((error) => {
  $("nearbyDevices").innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
});

