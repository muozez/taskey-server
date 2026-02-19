/**
 * Request Validation Middleware
 *
 * Gelen isteklerin body, params, query gibi alanlarını
 * basit şema tanımlarıyla doğrular.
 *
 * Kullanım:
 *   const { validate, schemas } = require("../middleware/validate");
 *   // route handler içinde:
 *   const body = await validate(req, res, schemas.pushRequest);
 *   if (!body) return; // validation hata döndü
 */

const { sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");
const log = require("../utils/logger");

/**
 * Body'yi parse edip şemaya göre doğrular.
 * Geçerliyse parsed body döner, değilse null (ve otomatik 400 yanıtı).
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Object} schema — { required: [...], optional: [...], rules: { field: fn } }
 * @returns {Object|null}
 */
async function validate(req, res, schema) {
  let body;
  try {
    body = await parseBody(req);
  } catch (err) {
    log.warn("Geçersiz JSON body", { url: req.url, err });
    sendError(res, 400, "Geçersiz JSON formatı");
    return null;
  }

  if (!body || typeof body !== "object") {
    sendError(res, 400, "İstek gövdesi JSON nesnesi olmalı");
    return null;
  }

  // Required alan kontrolü
  if (schema.required) {
    for (const field of schema.required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        sendError(res, 400, `'${field}' alanı zorunludur`);
        return null;
      }
    }
  }

  // Kural bazlı doğrulama
  if (schema.rules) {
    for (const [field, rule] of Object.entries(schema.rules)) {
      if (body[field] === undefined) continue; // sadece varsa kontrol et
      const result = rule(body[field], body);
      if (result !== true) {
        sendError(res, 400, typeof result === "string" ? result : `'${field}' geçersiz`);
        return null;
      }
    }
  }

  return body;
}

// =========== Ortak Doğrulama Kuralları ===========

const isUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    ? true
    : "Geçerli bir UUID olmalı";

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : "Geçerli bir e-posta adresi olmalı";

const minLength = (min) => (v) =>
  typeof v === "string" && v.length >= min ? true : `En az ${min} karakter olmalı`;

const isString = (v) => (typeof v === "string" ? true : "Metin olmalı");

const isArray = (v) => (Array.isArray(v) ? true : "Dizi olmalı");

const nonEmptyArray = (v) =>
  Array.isArray(v) && v.length > 0 ? true : "Boş olmayan bir dizi olmalı";

const isIn = (values) => (v) =>
  values.includes(v) ? true : `Geçerli değerler: ${values.join(", ")}`;

// =========== Endpoint Şemaları ===========

const schemas = {
  // POST /api/setup
  setup: {
    required: ["name", "email", "password"],
    rules: {
      email: isEmail,
      password: minLength(6),
      name: minLength(1),
    },
  },

  // POST /api/login
  login: {
    required: ["email", "password"],
    rules: {
      email: isEmail,
    },
  },

  // POST /api/workspaces
  createWorkspace: {
    required: ["name"],
    rules: {
      name: minLength(1),
    },
  },

  // POST /api/join
  joinWorkspace: {
    required: ["joinKey"],
    rules: {
      joinKey: (v) =>
        /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/i.test(v) ? true : "Anahtar formatı XXXX-YYYY olmalı",
    },
  },

  // POST /api/validate-key
  validateKey: {
    required: ["joinKey"],
  },

  // POST /api/sync/push
  pushRequest: {
    required: ["clientId", "diffs"],
    rules: {
      clientId: isUUID,
      diffs: nonEmptyArray,
    },
  },

  // POST /api/sync/full
  fullSync: {
    required: ["clientId"],
    rules: {
      clientId: isUUID,
    },
  },

  // POST /api/sync/heartbeat
  heartbeat: {
    required: ["clientId"],
    rules: {
      clientId: isUUID,
    },
  },

  // POST /api/sync/resolve
  resolve: {
    required: ["diffId", "resolution"],
    rules: {
      diffId: isUUID,
      resolution: isIn(["accept", "reject"]),
    },
  },

  // POST /api/sync/resolve-batch
  resolveBatch: {
    required: ["resolutions"],
    rules: {
      resolutions: nonEmptyArray,
    },
  },

  // PATCH /api/sync/strategy
  updateStrategy: {
    required: ["workspaceId", "strategy"],
    rules: {
      workspaceId: isUUID,
      strategy: isIn(["auto-merge", "last-writer-wins", "server-wins", "manual"]),
    },
  },

  // POST /api/users
  createUser: {
    required: ["name", "email", "password"],
    rules: {
      email: isEmail,
      password: minLength(6),
      name: minLength(1),
    },
  },
};

module.exports = { validate, schemas, isUUID, isEmail, minLength, isString, isArray, isIn };
