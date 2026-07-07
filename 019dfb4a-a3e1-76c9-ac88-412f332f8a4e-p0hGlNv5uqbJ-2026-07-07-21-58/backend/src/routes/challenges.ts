import { Hono } from "hono";
import { z } from "zod";
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

const challengesRouter = new Hono();

type StoredChallenge = {
  payload: string;
  createdAt: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Cap stored payload size so a single request can't fill the disk. The payload
// is a JSON string holding a base64 image (~33% larger than the raw image), so
// ~12MB of text comfortably allows a high-quality photo while blocking abuse.
const MAX_PAYLOAD_CHARS = 12 * 1024 * 1024;

// Per-IP rate limiting for challenge creation (in-memory fixed window). Stops a
// single client from spamming the create endpoint and flooding storage.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 40; // max new challenges per IP per window
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(headerValue: string | undefined, realIp: string | undefined): string {
  const first = headerValue?.split(",")[0]?.trim();
  return first || realIp || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

// Persist challenges to disk so codes survive backend restarts / redeploys.
//
// IMPORTANT: in production the app directory is ephemeral and is wiped on every
// restart/redeploy — only the volume that holds the SQLite database (DATABASE_FILE,
// e.g. /data) is persistent and backed up. Store challenges there so shared codes
// don't vanish. In development DATABASE_FILE is unset, so fall back to a local folder.
const DATA_DIR = process.env.DATABASE_FILE
  ? join(dirname(process.env.DATABASE_FILE), "challenges")
  : join(process.cwd(), ".data");
const STORE_FILE = join(DATA_DIR, "challenges.json");

function loadStore(): Map<string, StoredChallenge> {
  try {
    if (existsSync(STORE_FILE)) {
      const raw = readFileSync(STORE_FILE, "utf8");
      const obj = JSON.parse(raw) as Record<string, StoredChallenge>;
      return new Map(Object.entries(obj));
    }
  } catch {
    // Corrupt or unreadable file — start fresh rather than crashing.
  }
  return new Map();
}

function saveStore(store: Map<string, StoredChallenge>) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    // Atomic write: serialize to a temp file, then rename over the real file.
    // rename() is atomic on the same filesystem, so a crash mid-write can never
    // leave a half-written (corrupt) store — readers see either the old file or
    // the fully-written new one.
    const tmpFile = `${STORE_FILE}.tmp`;
    writeFileSync(tmpFile, JSON.stringify(Object.fromEntries(store)));
    renameSync(tmpFile, STORE_FILE);
  } catch {
    // Best effort; in-memory copy still serves this process.
  }
}

const store = loadStore();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function cleanupExpired() {
  const now = Date.now();
  let changed = false;
  for (const [code, entry] of store.entries()) {
    if (now - entry.createdAt > SEVEN_DAYS_MS) {
      store.delete(code);
      changed = true;
    }
  }
  if (changed) saveStore(store);
  // Opportunistically drop stale rate-limit buckets so the map can't grow
  // unbounded as new IPs arrive.
  for (const [ip, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt) rateBuckets.delete(ip);
  }
}

const PostSchema = z.object({ payload: z.string().min(1).max(MAX_PAYLOAD_CHARS) });

// POST /api/challenges — store payload, return short code
challengesRouter.post("/", async (c) => {
  const ip = getClientIp(c.req.header("x-forwarded-for"), c.req.header("x-real-ip"));
  if (!checkRateLimit(ip)) {
    return c.json(
      { error: { message: "Too many challenges created. Please try again later." } },
      429
    );
  }

  cleanupExpired();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid request" } }, 400);
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: "Invalid request" } }, 400);
  }

  let code = generateCode();
  let attempts = 0;
  while (store.has(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }

  store.set(code, { payload: parsed.data.payload, createdAt: Date.now() });
  saveStore(store);
  return c.json({ data: { code } });
});

// GET /api/challenges/:code — retrieve payload by code
challengesRouter.get("/:code", (c) => {
  const code = c.req.param("code").toUpperCase();
  const entry = store.get(code);

  if (!entry || Date.now() - entry.createdAt > SEVEN_DAYS_MS) {
    if (entry) {
      store.delete(code);
      saveStore(store);
    }
    return c.json({ error: { message: "Challenge not found or expired" } }, 404);
  }

  return c.json({ data: { payload: entry.payload } });
});

export { challengesRouter };
