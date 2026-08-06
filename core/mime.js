"use strict";

const path = require("path");

const TYPES = new Map(Object.entries({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ts": "text/typescript; charset=utf-8",
  ".kt": "text/plain; charset=utf-8",
  ".java": "text/x-java-source; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8"
}));

function contentTypeFor(filePath) {
  return TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function previewKind(filePath) {
  const type = contentTypeFor(filePath);
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || type.includes("json")) return "text";
  return "unknown";
}

module.exports = { contentTypeFor, previewKind };

