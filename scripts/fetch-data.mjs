#!/usr/bin/env node
/**
 * Independently retrieve public ACS, WPRDC, and Census cartographic files.
 * Writes evidence/snapshot.json used by the app and Housing AI.
 */
import { mkdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCensus, num, burden, severeBurden } from "../server/formulas.mjs";

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, "scripts", ".cache");
const evidenceDir = path.join(root, "evidence");

await loadDotenv(path.join(root, ".env.local"));
const censusKey = process.env.CENSUS_API_KEY || "";

const RETRIEVED_AT = new Date().toISOString();
const STATE = "42";
const COUNTY = "003";
const PLACE = "61000";
const WPRDC_RESOURCE = "f4d1177a-f597-4c32-8cbf-7885f56253f6";
const FOCUS_PARCEL = "0025K00261000000";
const FOCUS_PERMITS = ["BDA-2024-00084", "BP-2023-12549", "DP-2024-08439"];

const ACS5_TABLES = {
  B25003: ["B25003_001E", "B25003_001M", "B25003_003E", "B25003_003M"],
  B25009: ["B25009_011E", "B25009_011M"],
  B25031: [
    "B25031_002E",
    "B25031_002M",
    "B25031_003E",
    "B25031_003M",
    "B25031_004E",
    "B25031_004M",
    "B25031_005E",
    "B25031_005M",
  ],
  B25070: [
    "B25070_001E",
    "B25070_001M",
    "B25070_007E",
    "B25070_007M",
    "B25070_008E",
    "B25070_008M",
    "B25070_009E",
    "B25070_009M",
    "B25070_010E",
    "B25070_010M",
    "B25070_011E",
    "B25070_011M",
  ],
  B25064: ["B25064_001E", "B25064_001M"],
};

async function loadDotenv(file) {
  try {
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": "housing-evidence-observatory/2026 (local research)" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${url}\n${body.slice(0, 400)}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from ${url}: ${text.slice(0, 180)}`);
  }
}

async function dataCensusTable(tableId, geo) {
  const url = `https://data.census.gov/api/access/data/table?id=${encodeURIComponent(tableId)}&g=${encodeURIComponent(geo)}`;
  const payload = await getJson(url);
  const grid = payload.response?.data;
  if (!Array.isArray(grid) || grid.length < 2) throw new Error(`Empty table ${tableId}`);
  return parseCensus(grid);
}

function normalizeCensusRows(rows) {
  return rows.map((row) => {
    const geoId = String(row.GEO_ID || row.GEOID || "");
    const geoid = geoId.replace(/^1400000US/, "").replace(/^1600000US/, "");
    const next = { ...row, geoid, NAME: row.NAME };
    if (geoid.length === 11) {
      next.state = geoid.slice(0, 2);
      next.county = geoid.slice(2, 5);
      next.tract = geoid.slice(5);
    } else if (geoid.length === 7) {
      next.state = geoid.slice(0, 2);
      next.place = geoid.slice(2);
    }
    return next;
  });
}

async function fetchAcsYear(year, product, geo) {
  const prefix = product === "acs5" ? `ACSDT5Y${year}` : `ACSDT1Y${year}`;
  const merged = new Map();
  for (const table of Object.keys(ACS5_TABLES)) {
    try {
      const rows = normalizeCensusRows(await dataCensusTable(`${prefix}.${table}`, geo));
      for (const row of rows) {
        const prev = merged.get(row.geoid) || {};
        merged.set(row.geoid, { ...prev, ...row });
      }
    } catch (err) {
      console.warn(`Skip ${prefix}.${table}: ${err.message.slice(0, 120)}`);
    }
  }
  return [...merged.values()];
}

async function fetchCityAnnual() {
  const years = [2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024];
  const series = [];
  for (const year of years) {
    try {
      const rows = normalizeCensusRows(await dataCensusTable(`ACSDT1Y${year}.B25064`, "1600000US4261000"));
      const row = rows[0];
      const rent = num(row?.B25064_001E);
      series.push({
        year,
        available: rent != null,
        medianGrossRent: rent,
        medianGrossRentMoe: num(row?.B25064_001M),
        dollars: "nominal",
        table: "B25064",
        product: "acs1",
        source: "data.census.gov ACS 1-year",
      });
    } catch (err) {
      series.push({ year, available: false, error: String(err.message).slice(0, 180) });
    }
  }
  return [
    ...series.filter((s) => s.year < 2020),
    {
      year: 2020,
      available: false,
      reason: "Standard ACS 1-year estimates for 2020 were not released; this gap is left blank and is not interpolated.",
    },
    ...series.filter((s) => s.year > 2020),
    {
      year: 2025,
      available: false,
      reason:
        "Census Bureau (August 2026): 2025 ACS 1-year release date is being determined under a Commerce disclosure-avoidance order. Not interpolated.",
    },
  ];
}

async function fetchMobility() {
  const rows = normalizeCensusRows(await dataCensusTable("ACSDT5Y2024.B07003", "1600000US4261000"));
  const row = rows[0] || {};
  return {
    geography: "Pittsburgh city",
    period: "2020–2024 ACS 5-year",
    table: "B07003",
    unit: "People age 1+, not households, not net migration, not tract-to-tract flows",
    total: num(row.B07003_001E),
    totalMoe: num(row.B07003_001M),
    sameHouse: num(row.B07003_004E),
    sameHouseMoe: num(row.B07003_004M),
    sameCounty: num(row.B07003_007E),
    sameCountyMoe: num(row.B07003_007M),
    differentCountySameState: num(row.B07003_010E),
    differentState: num(row.B07003_013E),
    abroad: num(row.B07003_016E),
  };
}

async function wprdcResource() {
  return getJson(`https://data.wprdc.org/api/3/action/resource_show?id=${WPRDC_RESOURCE}`);
}

async function wprdcSearch(payload) {
  const res = await fetch("https://data.wprdc.org/api/3/action/datastore_search", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "housing-evidence-observatory/2026" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`WPRDC ${res.status}`);
  return res.json();
}

function slimPermit(rec) {
  if (!rec) return null;
  return {
    permit_id: rec.permit_id || rec.PERMIT_ID || null,
    permit_type: rec.permit_type || rec.type || null,
    status: rec.status || rec.current_status || null,
    issue_date: rec.issue_date || rec.issued_date || rec.date_issued || null,
    address: rec.address || rec.street_address || rec.full_address || null,
    parcel_num: rec.parcel_num || rec.parcel || rec.pin || null,
    work_description: rec.work_description || rec.description || rec.work_type || null,
    neighborhood: rec.neighborhood || rec.neighborhood_name || null,
    commercial_or_residential: rec.commercial_or_residential || rec.occupancy_type || null,
    lat: num(rec.lat || rec.latitude || rec.y),
    lon: num(rec.lon || rec.longitude || rec.x),
  };
}

async function fetchPermits() {
  const meta = await wprdcResource();
  const result = meta.result || {};
  const fieldsHint = result.datastore_active;
  const sample = await wprdcSearch({ resource_id: WPRDC_RESOURCE, limit: 5 });
  const fieldNames = (sample.result?.fields || []).map((f) => f.id);

  const parcelHits = await wprdcSearch({
    resource_id: WPRDC_RESOURCE,
    limit: 100,
    q: FOCUS_PARCEL,
  });

  const byId = [];
  for (const id of FOCUS_PERMITS) {
    const found = await wprdcSearch({
      resource_id: WPRDC_RESOURCE,
      limit: 5,
      q: id,
    });
    byId.push(...(found.result?.records || []));
  }

  const housingQ = await wprdcSearch({
    resource_id: WPRDC_RESOURCE,
    limit: 80,
    q: "apartment dwelling townhouse residential",
  });

  const records = [...(parcelHits.result?.records || []), ...byId, ...(housingQ.result?.records || [])];
  const unique = new Map();
  for (const rec of records) {
    const slim = slimPermit(rec);
    if (slim?.permit_id) unique.set(slim.permit_id, slim);
  }

  return {
    resourceId: WPRDC_RESOURCE,
    sourceUrl: "https://data.wprdc.org/dataset/pli-permits",
    lastModified: result.last_modified || result.metadata_modified || null,
    dataLastUpdated: result.last_modified || null,
    datastoreActive: Boolean(fieldsHint),
    fieldNames,
    retrievedAt: RETRIEVED_AT,
    records: [...unique.values()],
  };
}

async function loadTractGeoFromWprdc() {
  const search = await getJson("https://data.wprdc.org/api/3/action/package_search?q=allegheny%20county%20census%20tracts");
  const pkgs = search.result?.results || [];
  const pkg = pkgs.find((p) => /tract/i.test(`${p.title} ${p.name}`));
  const resource = pkg?.resources?.find((r) => /geojson|json/i.test(`${r.format || ""} ${r.url || ""}`));
  if (!resource?.url) throw new Error("no WPRDC tract geojson");
  const geo = await getJson(resource.url);
  if (!geo?.features) throw new Error("WPRDC geojson missing features");
  const features = geo.features.filter((f) => {
    const p = f.properties || {};
    const geoid = String(p.GEOID || p.geoid || p.GEOID20 || p.TRACT || "");
    return geoid.startsWith("42003") || p.COUNTYFP === COUNTY || p.COUNTYFP20 === COUNTY;
  });
  return { year: 2020, url: resource.url, featureCount: features.length, features };
}

async function downloadZipToCache(url, name) {
  await mkdir(cacheDir, { recursive: true });
  const dest = path.join(cacheDir, name);
  const res = await fetch(url, { headers: { "user-agent": "housing-evidence-observatory/2026" } });
  if (!res.ok) throw new Error(`geo ${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function loadTractGeo(year) {
  const file = `cb_${year}_42_tract_500k.zip`;
  const url = `https://www2.census.gov/geo/tiger/GENZ${year}/geojson/${file}`;
  try {
    const dest = await downloadZipToCache(url, file);
    const tmp = await mkdtemp(path.join(os.tmpdir(), "tracts-"));
    await execFileAsync("unzip", ["-o", dest, "-d", tmp]);
    const { stdout } = await execFileAsync("bash", ["-lc", `ls "${tmp}"`]);
    const jsonName = stdout
      .split(/\s+/)
      .find((n) => /\.(geo)?json$/i.test(n));
    if (!jsonName) throw new Error(`no geojson in ${file}`);
    const geo = JSON.parse(await readFile(path.join(tmp, jsonName), "utf8"));
    if (!geo?.features) throw new Error("no features");
    const features = geo.features.filter((f) => {
      const p = f.properties || {};
      return p.COUNTYFP === COUNTY || p.COUNTYFP20 === COUNTY;
    });
    return { year, url, featureCount: features.length, features };
  } catch (err) {
    console.warn(`Cartographic ${year} download failed (${err.message}). Trying WPRDC tract boundaries.`);
    try {
      return await loadTractGeoFromWprdc();
    } catch (err2) {
      console.warn(`WPRDC tract geo failed (${err2.message}).`);
      return { year, url, featureCount: 0, features: [], error: String(err.message) };
    }
  }
}

function centroid(geometry) {
  if (!geometry) return null;
  const rings =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates.flat()
        : [];
  let x = 0;
  let y = 0;
  let n = 0;
  for (const ring of rings) {
    for (const pt of ring) {
      x += pt[0];
      y += pt[1];
      n += 1;
    }
  }
  if (!n) return null;
  return [x / n, y / n];
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

function geomArea(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return ringArea(geometry.coordinates[0] || []);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce((s, poly) => s + ringArea(poly[0] || []), 0);
  }
  return null;
}

function money(value) {
  const n = num(value);
  return n == null || n <= 0 ? null : n;
}

function tractLabel(name) {
  if (!name) return null;
  const m = name.match(/Census Tract ([0-9.]+)/i);
  return m ? m[1] : name;
}

function profileFromRow(row, period) {
  const hh = num(row.B25003_001E);
  const renters = num(row.B25003_003E);
  const burden30 = burden(row);
  const burden50 = severeBurden(row);
  return {
    geoid: row.geoid,
    name: row.NAME,
    tract: tractLabel(row.NAME),
    period,
    households: hh,
    householdsMoe: num(row.B25003_001M),
    renterHouseholds: renters,
    renterHouseholdsMoe: num(row.B25003_003M),
    onePersonRenters: num(row.B25009_011E),
    onePersonRentersMoe: num(row.B25009_011M),
    rentStudio: money(row.B25031_002E),
    rentStudioMoe: num(row.B25031_002M),
    rent1br: money(row.B25031_003E),
    rent1brMoe: num(row.B25031_003M),
    rent2br: money(row.B25031_004E),
    rent2brMoe: num(row.B25031_004M),
    rent3br: money(row.B25031_005E),
    rent3brMoe: num(row.B25031_005M),
    medianGrossRent: money(row.B25064_001E),
    medianGrossRentMoe: num(row.B25064_001M),
    burden30Pct: burden30.pct,
    burden30Numerator: burden30.numerator,
    burden30Denominator: burden30.denominator,
    severeBurdenPct: burden50.pct,
    severeBurdenNumerator: burden50.numerator,
    severeBurdenDenominator: burden50.denominator,
    severeBurdenMoeCount: num(row.B25070_010M),
    tables: ["B25003", "B25009", "B25031", "B25070", "B25064"],
  };
}

function historyStatus(p2019, p2024, f2019, f2024) {
  if (!p2019 || !p2024) return { comparable: false, reason: "Missing one of the two ACS 5-year vintages for this GEOID." };
  if (p2019.geoid !== p2024.geoid) return { comparable: false, reason: "GEOID changed between vintages." };
  const a19 = f2019 ? geomArea(f2019.geometry) : null;
  const a24 = f2024 ? geomArea(f2024.geometry) : null;
  if (a19 != null && a24 != null && a19 > 0) {
    const rel = Math.abs(a24 - a19) / a19;
    if (rel > 0.001) {
      return {
        comparable: false,
        reason: `Preliminary cartographic area differs by ${(rel * 100).toFixed(2)}% (>0.1%). Change is withheld.`,
      };
    }
  }
  return { comparable: true, reason: "Same GEOID; preliminary cartographic area within 0.1% (not an official Census crosswalk)." };
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const tractGeo = "0500000US42003$1400000";
  const cityGeo = "1600000US4261000";

  console.log("Fetching ACS 2024 5-year tracts…");
  const acs2024 = await fetchAcsYear(2024, "acs5", tractGeo);
  console.log("Fetching ACS 2019 5-year tracts…");
  const acs2019 = await fetchAcsYear(2019, "acs5", tractGeo);
  console.log("Fetching Pittsburgh city 5-year context…");
  const city2024 = await fetchAcsYear(2024, "acs5", cityGeo);
  console.log("Fetching Pittsburgh ACS 1-year rent series…");
  const annual = await fetchCityAnnual();
  console.log("Fetching B07003 mobility…");
  const mobility = await fetchMobility();
  console.log("Fetching WPRDC PLI permits…");
  const permits = await fetchPermits();
  console.log("Fetching tract cartography…");
  const geo2024 = await loadTractGeo(2024);
  let geo2019;
  try {
    geo2019 = await loadTractGeo(2019);
  } catch {
    geo2019 = { year: 2019, features: [] };
  }

  const geo24ById = new Map();
  for (const f of geo2024.features || []) {
    const p = f.properties || {};
    const id = p.GEOID || p.GEOID20 || `${p.STATEFP}${p.COUNTYFP}${p.TRACTCE}`;
    geo24ById.set(id, f);
  }
  const geo19ById = new Map();
  for (const f of geo2019.features || []) {
    const p = f.properties || {};
    const id = p.GEOID || p.GEOID10 || `${p.STATEFP}${p.COUNTYFP}${p.TRACTCE}`;
    geo19ById.set(id, f);
  }

  const by2019 = new Map(acs2019.map((r) => [r.geoid, r]));
  const tracts = acs2024.map((row) => {
    const p24 = profileFromRow(row, "2020–2024 ACS 5-year");
    const r19 = by2019.get(row.geoid);
    const p19 = r19 ? profileFromRow(r19, "2015–2019 ACS 5-year") : null;
    const f24 = geo24ById.get(row.geoid);
    const f19 = geo19ById.get(row.geoid);
    const hist = historyStatus(p19, p24, f19, f24);
    const c = centroid(f24?.geometry);
    return {
      ...p24,
      centroid: c,
      history: {
        ...hist,
        previous: hist.comparable ? p19 : null,
      },
    };
  });

  const mapFeatures = (geo2024.features || []).map((f) => {
    const p = f.properties || {};
    const geoid = p.GEOID || p.GEOID20;
    const profile = tracts.find((t) => t.geoid === geoid);
    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        geoid,
        tract: profile?.tract || p.NAME,
        rent2br: profile?.rent2br ?? null,
        severeBurdenPct: profile?.severeBurdenPct ?? null,
      },
    };
  });

  const parcelPermits = permits.records.filter((r) => r.parcel_num === FOCUS_PARCEL);
  const bda = permits.records.find((r) => r.permit_id === "BDA-2024-00084");
  const bp = permits.records.find((r) => r.permit_id === "BP-2023-12549");
  const dp = permits.records.find((r) => r.permit_id === "DP-2024-08439");

  const investigation = {
    id: "inv-parcel-0025K00261000000",
    title: "303 27th St / parcel 0025K00261000000 — related PLI records",
    retrievedAt: RETRIEVED_AT,
    source: "WPRDC PLI Permits",
    parcel_num: FOCUS_PARCEL,
    note: "Same parcel is not the same project. Issued is not completed. Description text is not a unit count you can add up.",
    before: dp || parcelPermits[0] || null,
    after: bda || parcelPermits[1] || bp || null,
    related: parcelPermits,
    extraPermit: bp || null,
    reviewMeaning: "Reviewed means a person looked at this workflow step. It is not independent verification of construction or occupancy.",
  };

  const snapshot = {
    generatedAt: RETRIEVED_AT,
    coverage: {
      county: "Allegheny County, Pennsylvania",
      city: "Pittsburgh city",
      tractCount: tracts.length,
      acs5Latest: "2024 (pooled 2020–2024)",
      acs5Earlier: "2019 (pooled 2015–2019)",
      permitsGeography: "City of Pittsburgh PLI permits, not countywide",
    },
    gaps: [
      {
        id: "acs-1yr-2020",
        label: "2020 ACS 1-year",
        detail: "Standard 2020 ACS 1-year estimates were not released. Left blank; not interpolated.",
      },
      {
        id: "acs-1yr-2025",
        label: "2025 ACS 1-year delayed",
        detail:
          "As of 26 Sep 2026 the Census Bureau had not set a 2025 ACS 1-year release date (Commerce disclosure-avoidance review).",
      },
    ],
    citations: [
      { id: "acs5-2024", label: "ACS 2024 5-year API", url: "https://api.census.gov/data/2024/acs/acs5.html" },
      { id: "acs5-2019", label: "ACS 2019 5-year API", url: "https://api.census.gov/data/2019/acs/acs5.html" },
      { id: "acs1-gap", label: "Comparing ACS data", url: "https://www.census.gov/programs-surveys/acs/guidance/comparing-acs-data.html" },
      { id: "b25031", label: "B25031 rent by bedrooms", url: "https://api.census.gov/data/2024/acs/acs5/groups/B25031.html" },
      { id: "b25070", label: "B25070 rent burden", url: "https://api.census.gov/data/2024/acs/acs5/groups/B25070.html" },
      { id: "b25003", label: "B25003 tenure", url: "https://api.census.gov/data/2024/acs/acs5/groups/B25003.html" },
      { id: "b25009", label: "B25009 household size by tenure", url: "https://api.census.gov/data/2024/acs/acs5/groups/B25009.html" },
      { id: "b07003", label: "B07003 geographic mobility", url: "https://data.census.gov/table/ACSDT5Y2024.B07003" },
      { id: "wprdc-pli", label: "WPRDC PLI permits", url: "https://data.wprdc.org/dataset/pli-permits" },
      { id: "census-2025-delay", label: "Census ACS 2026 updates", url: "https://www.census.gov/programs-surveys/acs/news/updates/2026.html" },
    ],
    city: city2024[0] ? profileFromRow(city2024[0], "2020–2024 ACS 5-year") : null,
    mobility,
    annual,
    tracts,
    map: { type: "FeatureCollection", features: mapFeatures },
    permits,
    investigation,
  };

  const slimTracts = tracts.map(({ centroid, ...rest }) => rest);
  await writeFile(path.join(evidenceDir, "snapshot.json"), JSON.stringify({ ...snapshot, tracts: slimTracts, map: undefined }));
  await writeFile(
    path.join(evidenceDir, "citations.json"),
    JSON.stringify({ allowlist: snapshot.citations.map((c) => c.id), citations: snapshot.citations }, null, 2),
  );
  await writeFile(
    path.join(evidenceDir, "README.txt"),
    "Read-only evidence pack for Housing AI. Do not edit files. Answer only from snapshot.json contents provided in the prompt.\n",
  );

  // Keep map in a separate public file so the browser can load geometry without the chat prompt.
  await mkdir(path.join(root, "public"), { recursive: true });
  await writeFile(path.join(root, "public", "tracts.json"), JSON.stringify(snapshot.map));
  await writeFile(
    path.join(root, "public", "app-data.json"),
    JSON.stringify({
      generatedAt: snapshot.generatedAt,
      coverage: snapshot.coverage,
      gaps: snapshot.gaps,
      citations: snapshot.citations,
      city: snapshot.city,
      mobility: snapshot.mobility,
      annual: snapshot.annual,
      tracts: slimTracts,
      permits: { ...snapshot.permits, records: snapshot.permits.records.slice(0, 60) },
      investigation: snapshot.investigation,
    }),
  );

  console.log(`Wrote ${tracts.length} tracts, ${permits.records.length} permits, ${mapFeatures.length} map features.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
