"use strict";

class KaihoError extends Error {
  constructor(code, message, status = 500, details = undefined) {
    super(message);
    this.name = "KaihoError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new KaihoError("bad_request", message, 400, details);
}

function forbidden(message, details) {
  return new KaihoError("forbidden", message, 403, details);
}

function notFound(message, details) {
  return new KaihoError("not_found", message, 404, details);
}

function conflict(message, details) {
  return new KaihoError("conflict", message, 409, details);
}

module.exports = {
  KaihoError,
  badRequest,
  forbidden,
  notFound,
  conflict
};

