const RESOURCE = "f4d1177a-f597-4c32-8cbf-7885f56253f6";
const FIELDS = ["permit_id", "permit_type", "status", "issue_date", "address", "parcel_num", "work_description", "neighborhood", "commercial_or_residential", "lat", "lon"];

// Refresh only the server's seeded parcel scope, never browser-submitted queries.
// Reject incomplete responses and disappearing baseline records; retain the last good source.
export async function refreshPermits(snapshot, fetchImpl = fetch) {
  const prior = snapshot.permits?.records || [];
  const parcels = [...new Set(prior.map((r) => r.parcel_num).filter(Boolean))].sort();
  if (!parcels.length || parcels.length > 20) throw new Error("source_scope_invalid");
  const records = new Map();
  for (const parcel of parcels) {
    const url = new URL("https://data.wprdc.org/api/3/action/datastore_search");
    url.searchParams.set("resource_id", RESOURCE);
    url.searchParams.set("filters", JSON.stringify({ parcel_num: parcel }));
    url.searchParams.set("limit", "1000");
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("source_unavailable");
    const body = await response.json();
    const rows = body.result?.records;
    if (!body.success || !Array.isArray(rows) || !rows.length || rows.length >= 1000 || body.result.total !== rows.length) throw new Error("source_incomplete");
    for (const row of rows) {
      if (!row.permit_id || row.parcel_num !== parcel || records.has(row.permit_id)) throw new Error("source_invalid_records");
      records.set(row.permit_id, Object.fromEntries(FIELDS.map((key) => [key, row[key] ?? null])));
    }
  }
  if (prior.some((r) => !records.has(r.permit_id))) throw new Error("source_missing_baseline_records");
  const checkedAt = new Date().toISOString();
  const changes = { ...(snapshot.monitorChanges || {}) };
  const previous = new Map(prior.map((record) => [record.permit_id, record]));
  for (const record of records.values()) {
    const old = previous.get(record.permit_id);
    const changedFields = FIELDS.filter((field) => !["lat", "lon"].includes(field) && (old?.[field] ?? null) !== record[field]);
    if (!old || changedFields.length) changes[record.permit_id] = {
      observedAt: checkedAt, kind: old ? "record_changed" : "first_observed_in_parcel_scope",
      previous: old ? Object.fromEntries(changedFields.map((field) => [field, old[field] ?? null])) : null,
      note: "A source-record observation, not proof of a new physical housing event.",
    };
  }
  return { ...snapshot, monitorChanges: changes, permits: { ...snapshot.permits, records: [...records.values()], retrievedAt: checkedAt } };
}
