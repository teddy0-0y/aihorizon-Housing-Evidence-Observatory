import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isConfigured, runHousingChat } from "./chat.mjs";
import { loadEnv } from "./env.mjs";
import { createMonitorStore } from "./monitor-store.mjs";
import { publicMonitor, runMonitor } from "./monitor.mjs";

loadEnv();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(root, "evidence/snapshot.json"), "utf8"));
const store = await createMonitorStore(snapshot);
const production = process.env.NODE_ENV === "production";
const server = http.createServer();
const vite = production ? null : await (await import("vite")).createServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: "spa" });
const monitorOptions = () => ({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini", refresh: process.env.MONITOR_REFRESH_PERMITS === "true" });
let scanTask = null;

server.on("request", async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) res.setHeader("cache-control", "no-store");
    if (url.pathname === "/api/health") {
      await store.read();
      return json(res, 200, { ok: true, generatedAt: snapshot.generatedAt, aiConfigured: isConfigured(), storage: store.kind });
    }
    if (url.pathname === "/api/data") return json(res, 200, JSON.parse(fs.readFileSync(path.join(root, "public/app-data.json"), "utf8")));
    if (url.pathname === "/api/findings" && req.method === "GET") {
      return json(res, 200, publicMonitor(await store.read(), { kind: store.kind, configured: isConfigured(), refreshEnabled: monitorOptions().refresh, requiresAdminToken: production || Boolean(process.env.MONITOR_ADMIN_TOKEN) }));
    }
    if (url.pathname === "/api/monitor/run" && req.method === "POST") {
      if (!authorized(req)) return json(res, 401, { ok: false, message: "Enter the deployment's scan administrator token. This is not your OpenAI key." });
      if (!isConfigured()) return json(res, 503, { ok: false, message: "Configure OPENAI_API_KEY on the server before scanning." });
      if (scanTask) return json(res, 409, { ok: false, message: "A scan is already running." });
      const state = await store.read();
      if (state.lastRun?.startedAt && Date.now() - Date.parse(state.lastRun.startedAt) < 300000) return json(res, 429, { ok: false, message: "Scans are limited to once every five minutes. Results refresh automatically." });
      scanTask = runMonitor(store, monitorOptions()).catch(() => console.error("Monitor storage unavailable")).finally(() => { scanTask = null; });
      return json(res, 202, { ok: true, message: "Scan requested. The findings panel updates automatically." });
    }
    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = await readBody(req);
      if (typeof body?.question !== "string" || body.question.length > 4000) return json(res, 400, { ok: false, message: "Enter a question of up to 4,000 characters." });
      // Shared daily cap across web instances. Never trust an IP supplied by a browser.
      if (!await store.reserveChat()) return json(res, 429, { ok: false, message: "The demo's daily question limit has been reached." });
      const state = await store.read();
      const finding = state.findings.find((f) => f.id === body.findingId);
      if (body.findingId && !finding) return json(res, 404, { ok: false, message: "This finding is no longer in the latest scan. Refresh AI Findings." });
      const ids = finding ? {
        tracts: finding.recordIds.filter((id) => id.startsWith("tract:")).map((id) => id.slice(6)),
        permits: finding.recordIds.filter((id) => id.startsWith("permit:")).map((id) => id.slice(7)),
      } : body.ids || {};
      const result = await runHousingChat({ question: body.question, ids, snapshot: finding ? state.snapshot : snapshot, finding, apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
      return json(res, result.ok ? 200 : result.code === "unconfigured" ? 503 : 400, result);
    }
    if (url.pathname.startsWith("/api/")) return json(res, 404, { ok: false, message: "Unknown API route." });
    if (vite) return vite.middlewares(req, res, () => { res.statusCode = 404; res.end("Not found"); });
    serveStatic(url, req, res);
  } catch (error) {
    json(res, error.status || 500, { ok: false, message: error.status === 413 ? "Request too large." : error.status === 400 ? "Invalid request." : "Service unavailable. Please try again." });
  }
});

const port = Number(process.env.PORT || 5173);
server.listen(port, production ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(`Housing Evidence Observatory listening on port ${port} (${store.kind})`);
  console.log(isConfigured() ? "Housing AI: OpenAI configured" : "Housing AI: not configured (data still works)");
});

function authorized(req) {
  const token = process.env.MONITOR_ADMIN_TOKEN;
  if (!token && !production) return [`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin);
  if (!token) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(req.headers.authorization || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw Object.assign(new Error("invalid JSON"), { status: 400 }); }
}
function serveStatic(url, req, res) {
  const base = path.join(root, "dist");
  let file = path.resolve(base, `.${decodeURIComponent(url.pathname)}`);
  if (!file.startsWith(`${base}${path.sep}`) && file !== base) { res.statusCode = 404; return res.end(); }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(file)) { res.statusCode = 404; return res.end(); }
    file = path.join(base, "index.html");
  }
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
  res.setHeader("content-type", mime[path.extname(file)] || "application/octet-stream");
  res.setHeader("x-content-type-options", "nosniff");
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}
