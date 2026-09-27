function normalize(value) {
  return String(value || "").toLowerCase().replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function groupPermits(records) {
  const groups = new Map();
  for (const row of records) {
    const key = row.parcel_num || row.address || row.permit_id;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { key, address: row.address || "Address unavailable", parcel: row.parcel_num, neighborhood: row.neighborhood, records: [] });
    const group = groups.get(key);
    if (!group.records.some((r) => r.permit_id === row.permit_id)) group.records.push(row);
  }
  return [...groups.values()];
}

export function searchPermits(records, query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return groupPermits(records).map((group) => ({
    ...group,
    matches: group.records.filter((r) => {
      const haystack = normalize([r.address, r.permit_id, r.parcel_num, r.neighborhood, r.work_description, r.permit_type].join(" "));
      return tokens.every((token) => haystack.includes(token));
    }),
  })).filter((group) => group.matches.length);
}

// This extract has no independently verified completion/occupancy fields.
// Neither permit status nor description text is a substitute for that evidence.
export function completionAssessment() {
  return { label: "Completion not verified", detail: "This dataset does not establish whether construction is finished or occupancy is approved. A permit status describes the permit, not the completion of the whole development." };
}
