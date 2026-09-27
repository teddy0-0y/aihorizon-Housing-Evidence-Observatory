import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runMonitor, monitorRecords, validateFindings, publicMonitor } from "../server/monitor.mjs";
import { createMonitorStore, initialMonitorState } from "../server/monitor-store.mjs";
import { refreshPermits } from "../server/monitor-source.mjs";
import { runHousingChat } from "../server/chat.mjs";

const snapshot = { generatedAt: "2026-09-01", tracts: [{ geoid: "A", tract: "1", period: "2020–2024", rent2br: null, severeBurdenPct: 0.5, severeBurdenDenominator: 100 }], permits: { records: [{ permit_id: "P1", parcel_num: "parcel1", status: "Issued", work_description: "Five houses" }] } };
function memoryStore(seed = snapshot) {
  const state = initialMonitorState(structuredClone(seed));
  return { state, kind: "test", exclusive: (fn) => fn(state, async () => {}) };
}
const draft = (ids) => ({ title: "Housing evidence to verify", reason: "Investigate the source scope.", uncertainty: "Completion is not verified.", nextCheck: "Check approved plans.", category: "permit-follow-up", recordIds: ids });
const response = (findings, finish_reason = "stop") => ({ ok: true, json: async () => ({ choices: [{ finish_reason, message: { content: JSON.stringify({ findings }) } }] }) });
const day1 = "2026-09-27T12:00:00.000Z", day2 = "2026-09-28T12:00:00.000Z";

test("scan sends every record, persists genuine model output, and reuses unchanged evidence", async () => {
  const store = memoryStore();
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    const data = JSON.parse(body.messages[1].content);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(data.records.length, 2);
    assert.equal(data.records.find((r) => r.id === "tract:A").rent2br, null);
    return response([draft(["permit:P1"])]);
  };
  const first = await runMonitor(store, { apiKey: "test", now: day1, fetchImpl });
  assert.equal(first.status, "completed");
  assert.equal(first.recordsReviewed, 2);
  assert.equal(first.newFindings, 1);
  const id = store.state.findings[0].id;
  const second = await runMonitor(store, { apiKey: "test", now: day2, fetchImpl });
  assert.equal(second.aiCalls, 0);
  assert.equal(second.newFindings, 0);
  assert.equal(store.state.findings[0].id, id);
  assert.equal(calls, 1);
});

test("unknown source IDs and malformed output cannot become findings", () => {
  const batch = monitorRecords(snapshot);
  assert.throws(() => validateFindings({ findings: [draft(["permit:made-up"])] }, batch, day1, "test"), /invalid_ai_evidence/);
  assert.throws(() => validateFindings({ findings: [{ ...draft(["permit:P1"]), title: "" }] }, batch, day1, "test"), /invalid_ai_text/);
  assert.throws(() => validateFindings({ findings: Array(4).fill(draft(["permit:P1"])) }, batch, day1, "test"), /invalid_ai_findings/);
});

test("truncated responses retain the prior published findings", async () => {
  const store = memoryStore();
  store.state.findings = [{ id: "prior" }];
  const run = await runMonitor(store, { apiKey: "test", now: day1, fetchImpl: async () => response([draft(["permit:P1"])], "length") });
  assert.equal(run.status, "failed");
  assert.equal(run.error, "ai_incomplete_or_refused");
  assert.equal(store.state.findings[0].id, "prior");
});

test("partial scans are not published and successful batches resume from cache", async () => {
  const large = { ...snapshot, tracts: Array.from({ length: 65 }, (_, i) => ({ geoid: String(i), period: "2020–2024" })) };
  const store = memoryStore(large);
  store.state.findings = [{ id: "prior" }];
  let calls = 0;
  const first = await runMonitor(store, { apiKey: "test", now: day1, fetchImpl: async () => ++calls === 1 ? response([]) : { ok: false, status: 429 } });
  assert.equal(first.status, "failed");
  assert.deepEqual(store.state.findings, [{ id: "prior" }]);
  let resumed = 0;
  const second = await runMonitor(store, { apiKey: "test", now: day2, fetchImpl: async () => { resumed++; return response([]); } });
  assert.equal(second.status, "completed");
  assert.equal(second.cachedBatches, 1);
  assert.equal(resumed, 1);
  assert.equal(second.recordsReviewed, 66);
});

test("missing key, cooldown and daily budget never generate fake findings", async () => {
  const store = memoryStore();
  const first = await runMonitor(store, { now: day1 });
  assert.equal(first.error, "ai_not_configured");
  assert.equal(store.state.findings.length, 0);
  assert.equal((await runMonitor(store, { apiKey: "test", now: day1 })).cooldown, true);
  store.state.dailyCalls = { "2026-09-28": 24 };
  const second = await runMonitor(store, { apiKey: "test", now: day2, fetchImpl: () => { throw new Error("Must not call"); } });
  assert.equal(second.error, "daily_ai_limit");
});

test("source failure retains baseline and last successful check timestamp", async () => {
  const store = memoryStore();
  const before = structuredClone(store.state.snapshot);
  const result = await runMonitor(store, { apiKey: "test", refresh: true, now: day1, fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(result.error, "source_unavailable");
  assert.deepEqual(store.state.snapshot, before);
  assert.equal(store.state.permitCheckedAt, undefined);
});

test("source refresh rejects incomplete, missing and out-of-scope records", async () => {
  const body = (records, total = records.length) => async () => ({ ok: true, json: async () => ({ success: true, result: { records, total } }) });
  await assert.rejects(refreshPermits(snapshot, body([], 0)), /source_incomplete/);
  await assert.rejects(refreshPermits(snapshot, body(snapshot.permits.records, 2)), /source_incomplete/);
  await assert.rejects(refreshPermits(snapshot, body([{ permit_id: "P2", parcel_num: "parcel1" }])) , /source_missing_baseline_records/);
  await assert.rejects(refreshPermits(snapshot, body([{ permit_id: "P1", parcel_num: "wrong" }])) , /source_invalid_records/);
  const updated = await refreshPermits(snapshot, body([{ ...snapshot.permits.records[0], status: "Completed" }]));
  assert.equal(updated.monitorChanges.P1.previous.status, "Issued");
  assert.equal(updated.permits.records[0].status, "Completed");
});

test("production refuses ephemeral storage; preview persists and excludes overlapping scans", async () => {
  await assert.rejects(createMonitorStore(snapshot, { NODE_ENV: "production" }), /DATABASE_URL/);
  const folder = await mkdtemp(path.join(os.tmpdir(), "housing-monitor-"));
  try {
    const env = { MONITOR_STATE_PATH: path.join(folder, "state.json") };
    const store = await createMonitorStore(snapshot, env);
    let release;
    let entered;
    const ready = new Promise((r) => { entered = r; });
    const pending = store.exclusive(async (state, save) => { state.findings = [{ id: "persisted" }]; await save(); entered(); await new Promise((r) => { release = r; }); });
    await ready;
    assert.equal((await store.exclusive(async () => {})).busy, true);
    assert.equal(await store.reserveChat(), true, "chat remains available during a scan");
    release();
    await pending;
    const reopened = await createMonitorStore(snapshot, env);
    assert.equal((await reopened.read()).findings[0].id, "persisted");
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test("stale running state is surfaced as interrupted without hiding prior findings", () => {
  const state = initialMonitorState(snapshot);
  state.lastRun = { status: "running", startedAt: "2000-01-01" };
  const result = publicMonitor(state, { kind: "postgres", configured: true });
  assert.equal(result.lastRun.status, "interrupted");
  assert.equal(result.snapshot, undefined, "public status does not dump the database");
});

test("finding chat includes server-owned evidence even for a generic follow-up", async () => {
  const finding = { ...draft(["permit:P1"]), evidence: snapshot.permits.records };
  const result = await runHousingChat({ question: "Why does this matter?", ids: { permits: ["P1"] }, snapshot, finding, apiKey: "test", fetchImpl: async (_url, options) => {
    const pack = JSON.parse(JSON.parse(options.body).messages[1].content.split("Evidence pack:\n")[1]);
    assert.equal(pack.finding.title, finding.title);
    assert.equal(pack.permits[0].permit_id, "P1");
    return response([]);
  } });
  assert.equal(result.ok, true);
});
