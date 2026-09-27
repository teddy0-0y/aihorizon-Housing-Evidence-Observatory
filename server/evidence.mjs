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
  const wantInvestigation = Boolean(ids.includeInvestigation)
    || Boolean(snapshot.investigation?.id && ids.investigationId === snapshot.investigation.id);

  const tracts = tractIds
    .map((id) => snapshot.tracts.find((t) => t.geoid === id || t.tract === String(id)))
    .filter(Boolean)
    .map(stripTract);

  const permits = permitIds
    .map((id) => (snapshot.permits?.records || []).find((p) => p.permit_id === id))
    .filter(Boolean);

  const investigation =
    wantInvestigation
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

export function recapFromPack(question, pack) {
  const q = String(question || "").toLowerCase();
  const tracts = pack.tracts || [];
  const inv = pack.investigation;
  const city = pack.city;
  const money = (n) => (n == null ? "not in this pack" : `$${Number(n).toLocaleString("en-US")}`);
  const pct = (n) => (n == null ? "not in this pack" : `${(Number(n) * 100).toFixed(1)}%`);

  let answer;
  let citations = ["acs5-2024"];

  if (/complet|2700|penn|permit|dwell|issued/.test(q) && inv) {
    const after = inv.after || {};
    const before = inv.before || {};
    answer = `${inv.note || "Issued is not completed."} ${after.permit_id || "A later permit"} is ${after.status || "a permit record"} (${after.work_description || "description in WPRDC"}). ${before.permit_id || "An earlier permit"} is ${before.status || "a permit record"} (${before.work_description || ""}). The pack does not contain a completion, occupancy, or unit-delivery count.`;
    citations = ["wprdc-pli"];
  } else if (/32%|percent|rise|change|compar/.test(q) && tracts.length) {
    const bits = tracts.map((t) => {
      const prev = t.history?.comparable ? t.history.previous?.rent2br : null;
      const change =
        prev && t.rent2br
          ? `${(((t.rent2br - prev) / prev) * 100).toFixed(0)}% between non-overlapping ACS 5-year 2BR estimates`
          : t.history?.comparable
            ? "no prior 2BR in this pack"
            : t.history?.reason || "historical comparison withheld";
      return `Tract ${t.tract} 2BR ${money(t.rent2br)} (MOE ${t.rent2brMoe == null ? "unavailable" : "±" + money(t.rent2brMoe)}); ${change}.`;
    });
    answer = `${bits.join(" ")} That is not a citywide 32% listing-price change. ACS period estimates are not current asking rents.`;
    citations = ["b25031", "acs5-2024", "acs5-2019"];
  } else if (/vacanc|available|listing/.test(q)) {
    answer = "This snapshot does not include vacancy, listings, or units available to rent. ACS household and rent tables are not a vacancy survey. Do not treat a missing vacancy number as zero, and do not treat permits as vacant homes.";
    citations = ["acs5-2024", "wprdc-pli"];
  } else if (tracts.length) {
    answer = tracts
      .map((t) => `Tract ${t.tract}: 2BR rent ${money(t.rent2br)}, households ${t.households ?? "n/a"}, severe rent burden ${pct(t.severeBurdenPct)} (${t.period || "ACS 5-year"}).`)
      .join(" ");
    if (city?.medianGrossRent) answer += ` Pittsburgh city median gross rent in the same ACS 5-year is ${money(city.medianGrossRent)}.`;
    answer += " Numbers not in this pack are not inferred.";
    citations = ["b25031", "b25070", "b25003", "acs5-2024"];
  } else {
    answer = "No tract or permit IDs were selected. Open a comparison or investigation, then ask again. Nothing outside this pack is used.";
    citations = ["acs5-2024"];
  }

  const evidenceBits = [];
  if (city) evidenceBits.push(`City pack: ${city.name}, ${city.period}, median gross rent ${money(city.medianGrossRent)}.`);
  for (const t of tracts) evidenceBits.push(`Tract ${t.tract} GEOID ${t.geoid}: 2BR ${money(t.rent2br)}, households ${t.households ?? "n/a"}.`);
  if (inv) evidenceBits.push(`Investigation ${inv.id || ""} parcel ${inv.parcel_num || ""} retrieved ${inv.retrievedAt || pack.generatedAt}.`);

  return {
    answer,
    evidence: evidenceBits.join(" ") || "Server-selected snapshot fields only.",
    limits:
      "Hobby Cursor accounts cannot start the SDK agent: GET /v1/models is gated as Cloud Agent. This recap is the selected JSON pack, not a Cursor model. Permits ≠ completions. ACS ≠ listings. Households ≠ people-flows. 2020 ACS 1-year was not released; 2025 ACS 1-year was delayed as of this snapshot.",
    next: "Read the WPRDC row and ACS table cells in Sources. Do not add a listing or occupancy number that is not here.",
    citations,
    droppedCitations: [],
    allowlist: [...ALLOWLIST],
  };
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
