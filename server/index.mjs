import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { isConfigured, runHousingChat } from "./chat.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadDotenv(path.join(root, ".env.local"));

const snapshot = JSON.parse(fs.readFileSync(path.join(root, "evidence", "snapshot.json"), "utf8"));

const server = http.createServer();
const vite = await createViteServer({
  root,
  server: { middlewareMode: true, hmr: { server } },
  appType: "spa",
});

server.on("request", async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        generatedAt: snapshot.generatedAt,
        aiConfigured: isConfigured(),
      });
    }
    if (url.pathname === "/api/data") {
      return json(res, 200, JSON.parse(fs.readFileSync(path.join(root, "public", "app-data.json"), "utf8")));
    }
    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = await readBody(req);
      const result = await runHousingChat({
        question: body.question,
        ids: body.ids || {},
        snapshot,
        apiKey: process.env.CURSOR_API_KEY,
      });
      return json(res, result.ok ? 200 : result.code === "unconfigured" ? 503 : 400, result);
    }
    if (url.pathname.startsWith("/api/")) {
      return json(res, 404, { ok: false, message: "Unknown API route." });
    }
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end("Not found");
    });
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, message: err.message }));
  }
});

const port = Number(process.env.PORT || 5173);
server.listen(port, "127.0.0.1", () => {
  console.log(`Housing Evidence Observatory  http://127.0.0.1:${port}`);
  console.log(isConfigured() ? "Housing AI: Cursor SDK configured" : "Housing AI: not configured (data still works)");
});

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function loadDotenv(file) {
  try {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}
