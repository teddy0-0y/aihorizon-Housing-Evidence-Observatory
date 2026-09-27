import { burden, severeBurden } from "./formulas.mjs";

const ALLOWLIST = new Set([
  "acs5-2024",
  "acs5-2019",
  "acs1-gap",
  "b25031",
  "b25070",
  "b25003",
  "b25009",
  "b07003",
  "wprdc-pli",
  "census-2025-delay",
]);

export function citationAllowlist() {
  return [...ALLOWLIST];
}

export function selectEvidence(snapshot, ids = {}) {
  const tractIds = unique(asArray(ids.tracts || ids.tractIds)).slice(0, 4);
  const permitIds = unique(asArray(ids.permits || ids.permitIds)).slice(0, 8);
  const wantInvestigation = Boolean(ids.investigationId) || Boolean(ids.includeInvestigation);

  const tracts = tractIds
    .map((id) => snapshot.tracts.find((t) => t.geoid === id || t.tract === String(id)))
    .filter(Boolean)
    .map(stripTract);

  const permits = permitIds
    .map((id) => (snapshot.permits?.records || []).find((p) => p.permit_id === id))
    .filter(Boolean);

  const investigation =
    wantInvestigation || permitIds.length
      ? snapshot.investigation
      : null;

  return {
    generatedAt: snapshot.generatedAt,
    coverage: snapshot.coverage,
    gaps: snapshot.gaps,
    citations: snapshot.citations,
    city: snapshot.city
      ? {
          name: snapshot.city.name,
          period: snapshot.city.period,
          households: snapshot.city.households,
          medianGrossRent: snapshot.city.medianGrossRent,
          medianGrossRentMoe: snapshot.city.medianGrossRentMoe,
        }
      : null,
    mobility: snapshot.mobility,
    annual: snapshot.annual,
    tracts,
    permits,
    investigation: investigation
      ? {
          id: investigation.id,
          title: investigation.title,
          retrievedAt: investigation.retrievedAt,
          source: investigation.source,
          parcel_num: investigation.parcel_num,
          note: investigation.note,
          before: investigation.before,
          after: investigation.after,
          related: (investigation.related || []).slice(0, 8),
        }
      : null,
  };
}

function stripTract(t) {
  return {
    geoid: t.geoid,
    tract: t.tract,
    name: t.name,
    period: t.period,
    households: t.households,
    householdsMoe: t.householdsMoe,
    renterHouseholds: t.renterHouseholds,
    onePersonRenters: t.onePersonRenters,
    rent2br: t.rent2br,
    rent2brMoe: t.rent2brMoe,
    burden30Pct: t.burden30Pct,
    burden30Denominator: t.burden30Denominator,
    severeBurdenPct: t.severeBurdenPct,
    severeBurdenNumerator: t.severeBurdenNumerator,
    severeBurdenDenominator: t.severeBurdenDenominator,
    history: t.history
      ? {
          comparable: t.history.comparable,
          reason: t.history.reason,
          previous: t.history.previous
            ? {
                period: t.history.previous.period,
                rent2br: t.history.previous.rent2br,
                households: t.history.previous.households,
              }
            : null,
        }
      : null,
  };
}

export function validateCitations(ids) {
  const requested = unique(asArray(ids));
  const valid = requested.filter((id) => ALLOWLIST.has(id));
  const dropped = requested.filter((id) => !ALLOWLIST.has(id));
  return { valid, dropped };
}

export function parseAssistantText(text, allowlist = ALLOWLIST) {
  const sections = { answer: "", evidence: "", limits: "", next: "" };
  const chunks = String(text || "").split(/^##\s+/m);
  for (const chunk of chunks) {
    const [head, ...rest] = chunk.split(/\n/);
    const body = rest.join("\n").trim();
    const key = (head || "").trim().toLowerCase();
    if (key.startsWith("answer")) sections.answer = body;
    else if (key.startsWith("evidence")) sections.evidence = body;
    else if (key.startsWith("limit")) sections.limits = body;
    else if (key.startsWith("next")) sections.next = body;
  }
  if (!sections.answer && !sections.evidence) {
    sections.answer = String(text || "").trim();
  }
  const mentioned = [...String(text || "").matchAll(/\b(acs5-2024|acs5-2019|acs1-gap|b25031|b25070|b25003|b25009|b07003|wprdc-pli|census-2025-delay)\b/g)].map(
    (m) => m[1],
  );
  const { valid, dropped } = validateCitations(mentioned);
  return { ...sections, citations: valid, droppedCitations: dropped, allowlist: [...allowlist] };
}

export function computeBurdenFromRaw(row) {
  return { burden: burden(row), severe: severeBurden(row) };
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function unique(arr) {
  return [...new Set(arr.map((v) => String(v)))];
}
