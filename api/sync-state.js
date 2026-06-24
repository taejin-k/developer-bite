import { createHash } from "node:crypto";

const MAX_SYNC_ID_LENGTH = 80;
const MAX_BODY_SIZE = 256_000;
const COLLECTIONS = ["completed", "bookmarks", "wrong"];

function getRedisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token:
      process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  };
}

function normalizeSyncId(value) {
  return String(value || "").trim().slice(0, MAX_SYNC_ID_LENGTH);
}

function syncKey(syncId) {
  const hash = createHash("sha256").update(syncId).digest("hex");
  return `developer-bite:sync:${hash}`;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      throw Object.assign(new Error("요청이 너무 큽니다."), { status: 413 });
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function redisCommand(command, ...args) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    throw Object.assign(new Error("동기화 저장소가 아직 연결되지 않았습니다."), {
      status: 503,
      code: "SYNC_STORAGE_NOT_CONFIGURED",
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw Object.assign(
      new Error(data.error || "동기화 저장소 요청에 실패했습니다."),
      { status: response.status || 502 },
    );
  }
  return data.result;
}

function sanitizeRecord(record) {
  if (!record || typeof record !== "object") return null;
  return {
    value: Boolean(record.value),
    updatedAt: Number(record.updatedAt) || 0,
    clientId: String(record.clientId || ""),
  };
}

function sanitizeState(input) {
  const source = input && typeof input === "object" ? input : {};
  const records = source.records && typeof source.records === "object"
    ? source.records
    : source;
  const state = {
    version: 2,
    updatedAt: Number(source.updatedAt) || Date.now(),
    clientId: String(source.clientId || ""),
    records: {
      completed: {},
      bookmarks: {},
      wrong: {},
    },
  };

  for (const collection of COLLECTIONS) {
    const entries =
      records[collection] && typeof records[collection] === "object"
        ? records[collection]
        : {};
    for (const [id, record] of Object.entries(entries)) {
      const clean = sanitizeRecord(record);
      if (clean) state.records[collection][id] = clean;
    }
  }

  return state;
}

function mergeStates(left, right) {
  const merged = sanitizeState(left);
  const incoming = sanitizeState(right);

  for (const collection of COLLECTIONS) {
    for (const [id, nextRecord] of Object.entries(
      incoming.records[collection],
    )) {
      const currentRecord = merged.records[collection][id];
      if (!currentRecord || nextRecord.updatedAt >= currentRecord.updatedAt) {
        merged.records[collection][id] = nextRecord;
      }
    }
  }

  merged.updatedAt = Math.max(merged.updatedAt, incoming.updatedAt, Date.now());
  merged.clientId = incoming.clientId || merged.clientId;
  return merged;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const syncId = normalizeSyncId(req.query?.id);
  if (!syncId) {
    sendJson(res, 400, { error: "동기화 ID가 필요합니다." });
    return;
  }

  const key = syncKey(syncId);

  try {
    if (req.method === "GET") {
      const stored = await redisCommand("GET", key);
      sendJson(res, 200, {
        state: stored ? sanitizeState(JSON.parse(stored)) : null,
      });
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const incoming = sanitizeState(body.state);
      const stored = await redisCommand("GET", key);
      const current = stored ? JSON.parse(stored) : null;
      const merged = mergeStates(current, incoming);
      await redisCommand("SET", key, JSON.stringify(merged));
      sendJson(res, 200, { state: merged });
      return;
    }

    res.setHeader("Allow", "GET, PUT");
    sendJson(res, 405, { error: "지원하지 않는 메서드입니다." });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "동기화 처리 중 오류가 발생했습니다.",
      code: error.code,
    });
  }
}
