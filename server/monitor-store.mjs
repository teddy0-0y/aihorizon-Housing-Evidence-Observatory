import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export function initialMonitorState(snapshot) {
  return { snapshot, findings: [], runs: [], batches: {}, lastRun: null, dailyCalls: {}, chatUsage: {} };
}

// A single shared document keeps source snapshots, AI results and run metadata atomic.
// PostgreSQL's advisory lock also excludes overlapping manual scans across web instances.
export async function createMonitorStore(snapshot, env = process.env) {
  if (env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 4, connectionTimeoutMillis: 10000 });
    await pool.query("CREATE TABLE IF NOT EXISTS housing_monitor (id integer PRIMARY KEY CHECK (id = 1), body jsonb NOT NULL)");
    await pool.query("CREATE TABLE IF NOT EXISTS housing_chat_budget (day date PRIMARY KEY, used integer NOT NULL)");
    await pool.query("INSERT INTO housing_monitor (id, body) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(initialMonitorState(snapshot))]);
    return {
      kind: "postgres",
      async reserveChat() {
        const result = await pool.query("INSERT INTO housing_chat_budget (day, used) VALUES (CURRENT_DATE, 1) ON CONFLICT (day) DO UPDATE SET used = housing_chat_budget.used + 1 WHERE housing_chat_budget.used < 100 RETURNING used");
        return result.rowCount > 0;
      },
      async read() { return (await pool.query("SELECT body FROM housing_monitor WHERE id = 1")).rows[0].body; },
      async exclusive(work) {
        const client = await pool.connect();
        try {
          const { rows } = await client.query("SELECT pg_try_advisory_lock(734291) AS locked");
          if (!rows[0].locked) return { busy: true };
          const state = (await client.query("SELECT body FROM housing_monitor WHERE id = 1")).rows[0].body;
          const save = () => client.query("UPDATE housing_monitor SET body = $1 WHERE id = 1", [JSON.stringify(state)]);
          return await work(state, save);
        } finally {
          await client.query("SELECT pg_advisory_unlock(734291)").catch(() => {});
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production; cloud monitoring must use persistent storage.");
  const file = path.resolve(env.MONITOR_STATE_PATH || ".data/monitor.json");
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, JSON.stringify(initialMonitorState(snapshot)), { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  let busy = false;
  let chatDay = "", chatCount = 0;
  const read = async () => JSON.parse(await readFile(file, "utf8"));
  return {
    kind: "local-preview", read,
    async reserveChat() {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== chatDay) { chatDay = today; chatCount = 0; }
      return ++chatCount <= 100;
    },
    async exclusive(work) {
      if (busy) return { busy: true };
      busy = true;
      try {
        const state = await read();
        return await work(state, async () => {
          await writeFile(`${file}.tmp`, JSON.stringify(state));
          await rename(`${file}.tmp`, file);
        });
      } finally { busy = false; }
    },
    async close() {},
  };
}
