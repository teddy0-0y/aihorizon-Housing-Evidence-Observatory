// Capability checks run before generation: this snapshot has neither a live
// listing index nor a geocoder/routing service. Never substitute a sample case.
const RESOURCES = {
  cmu: { label: "CMU Off-Campus Housing Marketplace", url: "https://offcampus.housing.cmu.edu/", description: "Search rental listings serving the CMU community; confirm availability with the advertiser." },
  listings: { label: "Pittsburgh homes on Zillow", url: "https://www.zillow.com/pittsburgh-pa/", description: "Search homes for sale and set location filters. This is an external search, not a verified match." },
  rentals: { label: "Pittsburgh rentals on Zillow", url: "https://www.zillow.com/pittsburgh-pa/rentals/", description: "Search rental listings and filter by price and location; confirm current terms and availability." },
  permits: { label: "WPRDC Pittsburgh PLI permits", url: "https://data.wprdc.org/dataset/pli-permits", description: "Explore the broader permit dataset and its source documentation; permits do not establish availability." },
};

export function recommendedResources(question) {
  const q = String(question || "").toLowerCase();
  const links = [];
  if (/\b(cmu|carnegie mellon)\b/.test(q)) links.push(RESOURCES.cmu);
  if (/\b(rent|rentals?|apartments?|listings?)\b/.test(q)) links.push(RESOURCES.rentals);
  if (/\b(buy|sale)\b/.test(q) || (!/\b(rent|rental)\b/.test(q) && /\b(houses?|homes?)\b/.test(q))) links.push(RESOURCES.listings);
  if (/\b(new|construction|permits?|complet\w*|development)\b/.test(q)) links.push(RESOURCES.permits);
  return links;
}

function recordsIn(snapshot) {
  const inv = snapshot.investigation;
  return [...new Map([...(snapshot.permits?.records || []), inv?.before, inv?.after, ...(inv?.related || [])]
    .filter((p) => p?.permit_id).map((p) => [p.permit_id, p])).values()];
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsPhrase(question, value) {
  const phrase = normalize(value);
  return Boolean(phrase && (` ${normalize(question)} `).includes(` ${phrase} `));
}

function matchedRecords(question, snapshot) {
  return recordsIn(snapshot).filter((p) =>
    containsPhrase(question, p.permit_id)
    || containsPhrase(question, p.parcel_num)
    || containsPhrase(question, p.neighborhood)
    || containsPhrase(question, p.address?.split(",")[0]));
}

function namedTracts(question, snapshot) {
  return (snapshot.tracts || []).filter((t) => containsPhrase(question, t.geoid)
    || containsPhrase(question, `tract ${t.tract}`));
}

export function unsupportedSearchReply(question, snapshot) {
  const q = String(question || "").toLowerCase();
  const housing = /\b(hous(?:e|es|ing)|homes?|apartments?|condos?|townhouses?|rentals?|listings?|places?|units?|construction|developments?|permits?)\b/.test(q);
  const location = /\b(near(?:by)?|around|close to|within|walking|walkable|commut\w*|distance|minutes? (?:from|to)|cmu|carnegie mellon)\b/.test(q);
  const availability = /\b(for (?:sale|rent)|available (?:now|homes?|houses?|apartments?|units?)|(?:homes?|houses?|apartments?|units?) available|(?:current|live|latest) listings?|move[ -]?in|buy (?:a |an )?(?:house|home|apartment)|rent (?:a |an )?(?:house|home|apartment))\b/.test(q);
  if (!(housing && location) && !availability) return null;

  const records = recordsIn(snapshot);
  const matches = matchedRecords(q, snapshot);
  const tracts = namedTracts(q, snapshot);
  const evidence = [
    `I checked the local snapshot (${snapshot.generatedAt || "retrieval date unavailable"}): ${(snapshot.tracts || []).length} census tracts and ${records.length} distinct permit records. This is a limited extract, not a complete inventory of homes.`,
  ];
  if (matches.length) {
    evidence.push(`${matches.length} permit records match an explicitly named ID, parcel, street address, or neighborhood in your question. This is a text match, not a proximity or availability match. Showing ${Math.min(3, matches.length)}:`);
    for (const p of matches.slice(0, 3)) evidence.push(`${p.permit_id}: ${p.address || "address unavailable"}; recorded status ${p.status || "unavailable"}; scope: ${p.work_description || "unavailable"}.`);
  } else {
    evidence.push("No permit ID, parcel, street address, or neighborhood in this extract matched the names in your question. Landmark distances cannot be checked here. This does not establish that no homes exist in the requested area.");
  }
  for (const t of tracts) evidence.push(`Explicitly requested tract ${t.tract}: two-bedroom gross rent estimate ${t.rent2br == null ? "unavailable" : `$${t.rent2br}`}, published margin of error ${t.rent2brMoe == null ? "unavailable" : `$${t.rent2brMoe}`}, ${t.period || "period unavailable"}. This is area context, not a current property offer or a verified match to a landmark.`);

  return {
    ok: true,
    code: "unsupported_search",
    answer: location
      ? "I can’t confirm matching homes or construction projects near your requested location from this snapshot. No distance or travel-time match has been verified."
      : "I can’t confirm homes currently available to rent or buy from this snapshot.",
    evidence: evidence.join("\n\n"),
    limits: "There is no live listing search, geocoding, or travel-time lookup in this prototype. An issued permit does not verify that construction has started, is underway, is complete, or that a home is available. Missing coverage does not mean no homes exist.",
    next: "Do you mean newly built housing, or an available place to rent or buy? For current availability, use the external resources below and filter by budget and distance from your destination. For construction research, use the broader PLI dataset. I can explain an included permit or compare historical rents for a specified tract; neither establishes a current home match.",
    citations: [...(matches.length ? ["wprdc-pli"] : []), ...(tracts.length ? ["b25031"] : [])],
    resources: recommendedResources(question),
    latencyNote: "Dataset coverage check · external resources are suggestions, not searched results.",
  };
}

export function relevantEvidenceIds(question, ids, snapshot) {
  const q = String(question || "").toLowerCase();
  const inv = snapshot.investigation;
  const mentioned = matchedRecords(q, snapshot);
  const caseMention = /\b2700\s+penn\b|\b(?:303|319)\s+27(?:th)?\s+(?:st\b|street\b)/.test(q)
    || Boolean(inv?.parcel_num && q.includes(inv.parcel_num.toLowerCase()));
  const permitQuestion = /\b(permits?|issued|occupancy|complet\w*|construction|project|parcel|demolition)\b/.test(q);
  const selectedCase = Boolean(ids.includeInvestigation || ids.investigationId === inv?.id);
  const caseIds = new Set([inv?.before, inv?.after, ...(inv?.related || [])].filter(Boolean).map((p) => p.permit_id));
  return {
    tracts: namedTracts(q, snapshot).length ? namedTracts(q, snapshot).map((t) => t.geoid) : ids.tracts || ids.tractIds,
    permits: mentioned.length ? mentioned.map((p) => p.permit_id) : permitQuestion ? ids.permits || ids.permitIds : [],
    includeInvestigation: caseMention || mentioned.some((p) => caseIds.has(p.permit_id)) || (permitQuestion && selectedCase),
  };
}
