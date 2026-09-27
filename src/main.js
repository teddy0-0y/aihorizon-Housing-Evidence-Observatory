import "./styles.css";
import { formatAssistantText } from "./assistant-format.mjs";
import { groupPermits, searchPermits, completionAssessment } from "./permit-search.mjs";
import { readWatchlist, trackProperty, untrackProperty } from "./permit-watchlist.mjs";

const WORKSPACES = {
  resident: {
    name: "Find a Place",
    audience: "For residents",
    views: { overview: "Budget & Areas", explore: "Explore Areas", compare: "Compare Areas", projects: "Permit Explorer", watchlist: "Watchlist", saved: "Saved Areas", sources: "Sources" },
  },
  policy: {
    name: "Understand Housing Change",
    audience: "For policymakers",
    views: { overview: "Overview", explore: "Area Trends", compare: "Trends & Compare", projects: "Permit Explorer", watchlist: "Watchlist", sources: "Sources" },
  },
  research: {
    name: "Check the Evidence",
    audience: "For researchers & advocates",
    views: { overview: "Research Desk", explore: "Area Evidence", compare: "Trends & Compare", projects: "Project Evidence", watchlist: "Watchlist", sources: "Sources" },
  },
  provider: {
    name: "Explore Housing Needs",
    audience: "For developers & nonprofits",
    views: { overview: "Area Profiles", explore: "Explore Needs", compare: "Compare Areas", projects: "Proposed Supply", watchlist: "Watchlist", saved: "Saved Research Areas", sources: "Sources" },
  },
};

const PAGE_TITLES = {
  home: ["Housing questions. A place to start.", "Explore public evidence for Pittsburgh and Allegheny County."],
  overview: ["Housing, in context.", "Follow change. Investigate the evidence."],
  explore: ["See the place. Follow the evidence.", "Housing conditions and development records, connected."],
  compare: ["Two places. A clearer perspective.", "Compare like-for-like estimates, with uncertainty in view."],
  projects: ["Explore building permit records.", "Trace what the records say—and what they do not."],
  watchlist: ["Your tracked properties.", "Return to the permit records you want to follow up on."],
  saved: ["Your area shortlist.", "Saved locally, ready to compare."],
  sources: ["Know what is behind the number.", "Source coverage, assumptions and the limits of this research preview."],
};

const DEFAULT_A = "42003020300";
const DEFAULT_B = "42003060500";
const RAMP = ["#f5e9bd", "#eac964", "#d5a33b", "#a4782c", "#5b5140", "#292e31"];

const state = {
  workspace: "policy",
  view: "home",
  tractA: DEFAULT_A,
  tractB: DEFAULT_B,
  metric: "rent",
  mapBounds: [0, 0, 710, 550],
  geo: null,
  project: null,
  permitQuery: "",
  permitSearched: false,
  data: null,
  assistantOpen: false,
  ai: { loading: false, result: null, question: "" },
};

const el = document.getElementById("app");

init();

async function init() {
  const [data, geo] = await Promise.all([fetch("/api/data").then((r) => r.json()), fetch("/tracts.json").then((r) => r.json())]);
  state.data = data;
  state.geo = geo;
  try {
    const ws = localStorage.getItem("housing-workspace");
    if (WORKSPACES[ws]) state.workspace = ws;
    const saved = JSON.parse(localStorage.getItem("heo-areas") || "null");
    if (saved?.tractA) state.tractA = saved.tractA;
    if (saved?.tractB) state.tractB = saved.tractB;
  } catch {
    /* ignore */
  }
  render();
}

function tract(id) {
  return state.data.tracts.find((t) => t.geoid === id);
}
function money(v) {
  return v == null ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function num(v) {
  return v == null ? "Not available" : Math.round(v).toLocaleString("en-US");
}
function percent(v) {
  return v == null ? "Not available" : `${(v * 100).toFixed(1)}%`;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function options() {
  return state.data.tracts
    .slice()
    .sort((a, b) => String(a.tract).localeCompare(String(b.tract), undefined, { numeric: true }))
    .map((t) => `<option value="${t.geoid}">${esc(t.tract)} — ${esc(t.name.replace(/,.*/, ""))}</option>`)
    .join("");
}

function render() {
  const w = WORKSPACES[state.workspace];
  const [title, sub] = PAGE_TITLES[state.view];
  const navIds = ["home", "overview", "explore", "compare", "projects", "watchlist", "saved", "sources"];
  el.innerHTML = `
    <a href="#main" class="skip">Skip to content</a>
    <header>
      <a class="brand" href="#home" aria-label="Housing Evidence — Start here"><span class="brandmark" aria-hidden="true">HE</span><span>Housing Evidence<small>PITTSBURGH OBSERVATORY</small></span></a>
      <div class="workspace-switcher">
        <label for="workspace-select">YOUR WORKSPACE</label>
        <select id="workspace-select">${Object.entries(WORKSPACES).map(([id, ws]) => `<option value="${id}" ${id === state.workspace ? "selected" : ""}>${ws.name}</option>`).join("")}</select>
        <p id="workspace-audience">${esc(w.audience)}</p>
      </div>
      <nav aria-label="Main navigation">
        ${navIds.map((id) => {
          const label = id === "home" ? "Start here" : w.views[id];
          if (!label) return "";
          return `<button type="button" data-view="${id}" class="${id === state.view ? "active" : ""}" ${id === state.view ? 'aria-current="page"' : ""} ${id === "watchlist" ? `id="watch-nav"` : ""}>${label}${id === "watchlist" && watchlistItems().length ? ` <span id="alert-count" aria-label="${watchlistItems().length} tracked properties">${watchlistItems().length}</span>` : ""}</button>`;
        }).join("")}
      </nav>
      <div class="sidebar-place"><strong>PITTSBURGH / PA</strong>Independent housing research</div>
    </header>
    <main id="main">
      <div class="page-heading">
        <div>
          <div class="eyebrow">ALLEGHENY COUNTY, PENNSYLVANIA</div>
          <h1 id="page-title">${esc(title)}</h1>
          <p id="page-subtitle">${esc(sub)}</p>
        </div>
        <button class="assistant-toggle" id="open-assistant" type="button">✧ Research assistant <span>↗</span></button>
      </div>
      <div class="period" ${state.view === "home" ? "hidden" : ""}>
        <span>Community data <strong>2020–2024 ACS</strong></span>
        <span>Explorer permit snapshot <strong>${esc(state.data.permits?.lastModified?.slice(0, 10) || "dated")}</strong></span>
        <span class="period-note">Historical estimates · not live listings</span>
      </div>
      ${viewHtml()}
      <footer>
        <span>Housing Evidence / Research preview</span>
        <span>Public data. Traceable claims. Explicit unknowns.</span>
        <button type="button" data-view="sources">Data & limitations ↗</button>
      </footer>
    </main>
    <aside id="assistant" class="assistant" aria-label="Research assistant" ${state.assistantOpen ? "" : "hidden"}>
      <div class="assistant-head">
        <div><span class="eyebrow">RESEARCH WORKSPACE</span><h2>Ask about the evidence</h2></div>
        <button id="close-assistant" type="button" aria-label="Close research assistant">×</button>
      </div>
      <div class="assistant-mode"><strong>OpenAI Housing AI</strong><span>Uses OPENAI_API_KEY on this computer. The server picks the evidence pack; the model cannot browse or edit files.</span></div>
      <div class="context" id="assistant-context">${state.view === "projects" ? `Permit context: ${esc(selectedPermitGroup()?.address || "No result selected")}` : `Context: Tract ${esc(tract(state.tractA)?.tract)} + Tract ${esc(tract(state.tractB)?.tract)}`}</div>
      <div id="chat" class="chat">${chatHtml()}</div>
      <div class="suggestions">
        <button type="button" data-question="Can we count five completed homes at 2700 Penn?">Can we count five completed homes?</button>
        <button type="button" data-question="Did Pittsburgh rents rise by 32%?">Did rents rise by 32%?</button>
        <button type="button" data-question="Compare two-bedroom rents">Compare two-bedroom rents</button>
        <button type="button" data-question="Does vacancy mean homes are available?">Does vacancy mean availability?</button>
      </div>
      <form id="ask-form">
        <label class="sr-only" for="question">Ask a question</label>
        <textarea id="question" rows="2" placeholder="Ask about rent, vacancy, households or 2700 Penn…">${esc(state.ai.question)}</textarea>
        <button type="submit" aria-label="Send question">↑</button>
      </form>
    </aside>
    <div id="toast" role="status"></div>
  `;
  bind();
  if (state.view === "explore") renderMap();
}

function viewHtml() {
  const a = tract(state.tractA);
  const b = tract(state.tractB);
  const inv = state.data.investigation;
  if (state.view === "home") return startHereHtml();
  if (state.view === "overview") return overviewHtml();
  if (state.view === "explore") {
    return `
      <section id="explore" class="view">
        <div class="workspace">
          <div class="map-panel">
            <div class="map-toolbar">
              <label>Map layer<select id="metric">
                <option value="rent" ${state.metric === "rent" ? "selected" : ""}>Median gross rent</option>
                <option value="burden" ${state.metric === "burden" ? "selected" : ""}>Rent burden ≥30%</option>
              </select></label>
              <span class="map-caption">Census tracts · 2024 boundaries</span>
            </div>
            <div class="map-wrap">
              <svg id="map" viewBox="${state.mapBounds.join(" ")}" role="img" aria-label="Interactive census tract map of the Pittsburgh area"></svg>
              <div class="map-compass">N<br>↑</div>
              <div class="map-controls">
                <button id="zoom-in" type="button" aria-label="Zoom in">+</button>
                <button id="zoom-out" type="button" aria-label="Zoom out">−</button>
                <button id="reset-map" type="button" aria-label="Reset map">⌂</button>
              </div>
              <div id="map-tooltip" role="status"></div>
              <div class="map-legend">
                <span id="legend-title">${state.metric === "rent" ? "Median monthly gross rent" : "Severe rent burden · point estimates"}</span>
                <div class="ramp"></div>
                <div class="legend-values"><span>${state.metric === "rent" ? "$600" : "0%"}</span><span>${state.metric === "rent" ? "$3,000+" : "50%+"}</span><span class="no-data">■ No estimate</span></div>
              </div>
            </div>
            <div class="map-foot">Boundary source: county tract cartography. Map colors show estimates, not rankings.<button id="county-map" type="button">Show entire county</button></div>
          </div>
          <aside class="tract-panel">
            <label class="field-label" for="tract-picker">CHOOSE AN AREA (CENSUS TRACT)</label>
            <select id="tract-picker" aria-describedby="tract-help">${options()}</select>
            <p id="tract-help" class="fine">A census tract is a small area used to report population and housing data. Numbers such as 203 identify areas, not individual homes.</p>
            <div class="area-actions"><button id="save-area" class="secondary" type="button">Save area</button> <button id="explain-area" class="secondary" type="button">✦ Explain this area</button></div>
            <div id="tract-details">${tractDetails(a)}</div>
          </aside>
        </div>
        <div class="lower-grid">
          <section class="surface">
            <div class="section-head"><div class="eyebrow">LOOK BEYOND THE AVERAGE</div><h2>Rent by home size</h2><p>Monthly gross rent · selected tract</p></div>
            ${bedroomChart(a)}
            <p class="fine">Published margins of error are shown beside estimates. Missing values are not zero. These are occupied-housing estimates, not current asking rents.</p>
          </section>
          <section class="surface">
            <div class="section-head"><div class="eyebrow">EXAMPLE: CHECK A BUILDING PERMIT</div><h2>Five planned houses—but are they completed?</h2><p>Explore a sample permit case to see what is confirmed and what still needs checking.</p></div>
            <button class="case-item" type="button" data-view="projects" data-permit-focus="BDA-2024-00084"><span><strong>View permit records</strong><small>Permit BDA-2024-00084 · Issued does not mean completed</small></span><span aria-hidden="true">↗</span></button>
            <p class="fine">This example stays the same when you select a different area.</p>
          </section>
        </div>
      </section>`;
  }
  if (state.view === "compare") {
    return `
      <section id="compare" class="view">
        <p class="area-comparison-help">Compare housing conditions across two small Census areas. Each area is called a <strong>census tract</strong>; its number identifies an area, not a property. These boundaries may differ from familiar neighborhoods.</p>
        <div class="surface compare-controls">
          <label>First area (census tract)<select id="compare-a">${options()}</select></label>
          <span>vs.</span>
          <label>Second area (census tract)<select id="compare-b">${options()}</select></label>
          <button id="download-comparison" class="secondary" type="button">Download comparison</button>
        </div>
        <div id="comparison" class="comparison-grid">${compCard(a)}${compCard(b)}</div>
        <p class="fine">These estimates describe areas, not individual households or properties. Differences have not been tested for statistical significance.</p>
        ${historyPanel(a)}
      </section>`;
  }
  if (state.view === "projects") return permitExplorerHtml();
  if (state.view === "watchlist") return watchlistHtml();
  if (state.view === "saved") {
    const saved = JSON.parse(localStorage.getItem("heo-areas") || "null");
    return `<section class="surface saved-areas"><h2>Your saved areas</h2><p>Return to rental context for your shortlist. Saved in this browser only.</p>${saved ? `<article><h3>Tract ${esc(tract(saved.tractA)?.tract)} and tract ${esc(tract(saved.tractB)?.tract)}</h3><button class="primary" type="button" data-view="compare">Compare areas</button></article>` : "<p>No saved areas yet. Open Explore Areas and select Save area.</p>"}</section>`;
  }
  return `<div class="source-grid">${(state.data.citations || []).map((c, i) => `<article class="surface"><div class="eyebrow">0${i + 1}</div><h2>${esc(c.label)}</h2><a href="${esc(c.url)}" target="_blank" rel="noreferrer">Open source ↗</a></article>`).join("")}</div>${(state.data.gaps || []).map((g) => `<div class="missing-year-note"><strong>${esc(g.label)}</strong><p>${esc(g.detail)}</p></div>`).join("")}`;
}

function watchlistItems() {
  try { return readWatchlist(localStorage); } catch { return []; }
}

function watchlistHtml() {
  const items = watchlistItems();
  const groups = groupPermits(state.data.permits?.records || []);
  return `<section class="view"><section class="surface"><div class="eyebrow">YOUR WATCHLIST</div><h2>${items.length ? `${items.length} tracked ${items.length === 1 ? "property" : "properties"}` : "No properties tracked yet."}</h2><p>Save an address from Permit Explorer, then return here to review its records. This list is saved in this browser.</p><p class="fine">Records come from the loaded snapshot. Tracking does not automatically refresh data, detect changes, or send notifications.</p><button class="secondary" type="button" data-view="projects">${items.length ? "Find another property" : "Find a property to track"} ↗</button></section>
  <div class="watchlist-grid">${items.map((item) => {
    const group = groups.find((g) => g.key === item.key);
    return `<article class="surface"><div class="eyebrow">${esc(item.neighborhood || "TRACKED PROPERTY")}</div><h2>${esc(group?.address || item.address)}</h2><p>Parcel ${esc(item.parcel || "unavailable")}</p><p class="fine">Saved ${esc(item.addedAt?.slice(0, 10) || "date unavailable")} · ${group ? `${group.records.length} permit records in the loaded snapshot` : "Not present in the loaded snapshot"}</p><div class="evidence-callout"><strong>${group ? "Completion not verified" : "Records currently unavailable"}</strong>${group ? "The permit records do not establish whether the development is complete or occupancy is approved." : "The saved address is retained, but this snapshot does not contain its permit records. This does not establish that the property no longer exists."}</div><div class="watchlist-actions">${group ? `<button class="primary" type="button" data-open-tracked="${esc(item.key)}">View permit records ↗</button>` : `<a href="https://data.wprdc.org/dataset/pli-permits" target="_blank" rel="noopener noreferrer">Check the source dataset ↗</a>`}<button class="secondary" type="button" data-untrack="${esc(item.key)}" aria-label="Remove ${esc(item.address)} from watchlist">Remove from watchlist</button></div></article>`;
  }).join("")}</div></section>`;
}

function selectedPermitGroup() {
  return groupPermits(state.data.permits?.records || []).find((g) => g.key === state.project);
}

function permitExplorerHtml() {
  const records = state.data.permits?.records || [];
  const groups = groupPermits(records);
  const results = state.permitSearched ? searchPermits(records, state.permitQuery) : [];
  const selected = results.find((g) => g.key === state.project);
  const status = completionAssessment();
  const matchedIds = new Set(selected?.matches.map((r) => r.permit_id));
  const detailRows = selected ? [...selected.records].sort((a, b) => Number(matchedIds.has(b.permit_id)) - Number(matchedIds.has(a.permit_id)) || String(b.issue_date).localeCompare(String(a.issue_date))) : [];
  return `<section class="view permit-explorer">
    <section class="surface permit-search-panel">
      <div class="eyebrow">SEARCH THE LOCAL PERMIT DATASET</div>
      <h2>Look up an address or permit.</h2>
      <p>Find recorded work, read the permit status, and check what remains unknown about completion.</p>
      <form id="permit-search-form"><label for="permit-search">Address, permit ID, parcel number, or neighborhood</label><div class="permit-search-controls"><input id="permit-search" type="search" value="${esc(state.permitQuery)}" placeholder="e.g. 319 27th St or BDA-2024-00084" aria-describedby="permit-coverage"><button class="primary" type="submit">Search records</button><button class="secondary" id="permit-browse" type="button">Browse all</button></div></form>
      <p id="permit-coverage" class="fine">Local snapshot: ${records.length} permit records across ${groups.length} parcels / address groups · retrieved ${esc(state.data.permits?.retrievedAt?.slice(0, 10) || state.data.generatedAt?.slice(0, 10))}. This is a limited extract, not a citywide search. Several permits may concern the same development.</p>
      <div class="permit-examples"><span>Try an included address:</span>${groups.map((g) => `<button class="text-link" type="button" data-permit-example="${esc(g.address.split(",")[0])}">${esc(g.address.split(",")[0])} ↗</button>`).join("")}</div>
    </section>
    ${!state.permitSearched ? `<section class="surface permit-empty"><h3>Start with an address or permit ID.</h3><p>Search above or browse the included records. Then select a result to inspect its evidence and ask the assistant.</p></section>` : !results.length ? `<section class="surface permit-empty" role="status"><h3>No matching records in this snapshot.</h3><p>We have not established whether this project exists or is complete. The address may be outside this small extract, or recorded differently.</p><p><a href="https://data.wprdc.org/dataset/pli-permits" target="_blank" rel="noopener noreferrer">Search the broader Pittsburgh PLI dataset ↗</a></p><p class="fine">External source; your search has not been submitted there.</p></section>` : `<div class="permit-results"><aside class="surface"><h3>${results.length} matching parcel / address group${results.length === 1 ? "" : "s"}</h3><p class="fine">Select a result. Records are grouped by parcel where available, not verified project identity.</p>${results.map((g) => `<button class="project-choice ${g.key === state.project ? "active" : ""}" type="button" data-permit-group="${esc(g.key)}" aria-pressed="${g.key === state.project}"><strong>${esc(g.address)}</strong><small>${g.matches.length} matching record${g.matches.length === 1 ? "" : "s"} · ${g.records.length} total permit records</small><small>${esc(g.neighborhood || "Neighborhood unavailable")}</small></button>`).join("")}</aside>
    ${selected ? `<article class="surface"><div class="project-heading"><span class="eyebrow">SELECTED PERMIT RECORDS</span><h2>${esc(selected.address)}</h2><p>${esc(selected.neighborhood || "")} · parcel ${esc(selected.parcel || "unavailable")}</p></div>
      <div class="evidence-callout"><strong>Is this development finished? ${status.label}.</strong>${status.detail}</div>
      <p class="fine">Permit records are not housing-unit counts. Same parcel does not establish the same project. Verify completion and occupancy with PLI before reporting delivered housing.</p>
      <div class="watchlist-actions"><button class="primary" id="explain-permit" type="button">Ask AI about these records ↗</button><button class="secondary" id="track-property" type="button" ${watchlistItems().some((item) => item.key === selected.key) ? "disabled" : ""}>${watchlistItems().some((item) => item.key === selected.key) ? "Tracked in your watchlist ✓" : "Track this property"}</button><button class="text-link" type="button" data-view="watchlist">View watchlist →</button></div>
      <p class="fine">The assistant uses selected records, not a live construction inspection. Up to 8 permits are included per answer; name a permit ID to focus on it.</p>
      <div class="timeline">${detailRows.map((r, i) => `<details ${i === 0 ? "open" : ""}><summary><small>${esc(r.issue_date || "Date unavailable")} · ${esc(r.permit_type)}</small><strong>${esc(r.permit_id)}</strong><span class="pill">${esc(r.status || "Status unavailable")}</span></summary><p>${esc(r.work_description || "No work description recorded.")}</p></details>`).join("")}</div>
      <label class="permit-note-label" for="inv-note">Reviewer note (saved in this browser)</label><textarea id="inv-note">${esc(localStorage.getItem(`heo-note:${selected.key}`) || "")}</textarea><div class="alert-actions"><button type="button" id="mark-reviewed">Mark reviewed</button></div>
      <p class="fine"><a href="https://data.wprdc.org/dataset/pli-permits" target="_blank" rel="noopener noreferrer">Check the source dataset ↗</a></p>
    </article>` : `<article class="surface permit-empty"><h3>Select a result to see its records.</h3><p>The completion assessment and AI question will refer to the group you select.</p></article>`}</div>`}
  </section>`;
}

function startHereHtml() {
  const roles = [
    ["resident", "Residents", "Understand rental costs", "Compare historical rents by home size and save areas to research further.", "Explore rental context", "explore"],
    ["policy", "Policymakers", "Investigate housing change", "Follow rent trends and check what development records actually establish.", "Open the planner overview", "overview"],
    ["research", "Researchers & advocates", "Compare housing conditions", "Compare rents, rent burden, and household makeup across small Census areas. Then check the sources and uncertainty behind the differences.", "Compare two areas", "compare"],
    ["provider", "Developers & nonprofits", "Explore housing needs", "Read household structure and rent burden as starting points for local research.", "Explore area profiles", "explore"],
  ];
  return `<div class="start-page">
    <section class="start-hero" aria-labelledby="start-headline">
      <div class="start-intro">
        <div class="eyebrow">HOUSING EVIDENCE OBSERVATORY</div>
        <h2 id="start-headline">Understand the pressure.<br>Check the progress.</h2>
        <p>Housing data comes in separate pieces. Bring Census estimates and permit records into one view, ask better questions, and identify what to check next.</p>
        <div class="start-actions"><button class="primary" type="button" data-example="compare">Try an area comparison <span aria-hidden="true">↗</span></button><a href="#choose-workspace">Find your workspace ↓</a></div>
        <p class="start-caption">Public snapshots · historical estimates · sources you can inspect</p>
      </div>
      <aside class="start-example" aria-label="Example investigation">
        <div class="eyebrow">A QUESTION WORTH ASKING</div>
        <h3>Does lower rent mean less housing pressure?</h3>
        <p>Compare two areas, look beyond the rent figure, and ask the research assistant to explain the evidence.</p>
        <ol><li>Explore the estimates</li><li>Ask what they support</li><li>Choose your next check</li></ol>
        <small>No live listings. No automatic neighborhood rankings.</small>
      </aside>
    </section>

    <section id="choose-workspace" class="start-workspaces" aria-labelledby="start-roles-title">
      <div class="start-section-heading"><div><div class="eyebrow">FOUR WAYS IN</div><h2 id="start-roles-title">What brings you here?</h2></div><p>The same evidence, organized around your questions.</p></div>
      <div class="start-role-grid">${roles.map(([ws, audience, title, description, action, view], i) => `<article class="surface start-role"><span class="start-role-number">0${i + 1}</span><div class="eyebrow">${audience}</div><h3>${title}</h3><p>${description}</p><button type="button" class="secondary" data-start-workspace="${ws}" data-start-view="${view}">${action} ↗</button></article>`).join("")}</div>
    </section>

    <section class="start-guide" aria-labelledby="start-guide-title">
      <div class="start-section-heading"><div><div class="eyebrow">YOUR FIRST VISIT</div><h2 id="start-guide-title">From a question to a next step.</h2></div></div>
      <div class="start-steps">
        <article><span>01 / EXPLORE</span><h3>Choose an area</h3><p>Use the map or area selector. A census tract is a small area used to report population and housing data. Numbers such as 203 and 605 identify areas, not homes.</p></article>
        <article><span>02 / UNDERSTAND</span><h3>Compare and ask</h3><p>Read rents and household conditions together. Ask the AI research assistant to explain the selected evidence and its limits.</p></article>
        <article><span>03 / FOLLOW THROUGH</span><h3>Check the source</h3><p>Inspect the original source. In a permit investigation, save a reviewer note describing what still needs verification.</p></article>
      </div>
    </section>

    <section class="start-trails" aria-labelledby="start-trails-title">
      <div class="start-section-heading"><div><div class="eyebrow">TRY A REAL EXAMPLE</div><h2 id="start-trails-title">Start with a question we can investigate.</h2></div></div>
      <div class="start-trail-grid">
        <article class="surface"><span class="eyebrow">01 / RENT & BURDEN</span><h3>Lower rent. Less pressure?</h3><p>Open tracts 203 and 605 side by side, with a question ready for the assistant.</p><button type="button" class="primary" data-example="compare">Compare housing pressure ↗</button></article>
        <article class="surface"><span class="eyebrow">02 / PERMIT & COMPLETION</span><h3>Five houses on a permit. Five completed homes?</h3><p>Inspect permit BDA-2024-00084 and ask what must be verified before counting completed homes.</p><button type="button" class="secondary" data-example="projects">Investigate the five houses ↗</button></article>
      </div>
    </section>
    <div class="start-scope"><strong>Know what this preview can answer.</strong><p>Historical Census estimates and a limited permit extract support research. They do not establish current availability, verified completions, or household origin-to-destination flows. When the evidence is insufficient, the assistant explains the gap and can suggest external resources.</p><button type="button" class="text-link" data-view="sources">Explore sources & limitations ↗</button></div>
  </div>`;
}

function overviewHtml() {
  const roleCopy = {
    resident: { q: "Which areas fit my housing budget?", d: "Compare rental context by home size, then check current listings and utilities.", a: "Explore rental context", t: "explore", g: "Live listings, landlord experiences and verified resident reviews are not yet connected." },
    policy: { q: "Where should we investigate housing pressure?", d: "Follow affordability and permit activity. Separate recorded progress from verified homes.", a: "Explore permit records", t: "projects", g: "Citywide verified starts, completions and occupancy are not yet available." },
    research: { q: "How do housing conditions differ between areas?", d: "Compare rents, rent burden, and household makeup across small Census areas. Then check the sources, dates, and uncertainty behind those differences.", a: "Compare two areas", t: "compare", g: "A difference between areas does not explain its cause. A trend alone cannot establish policy impact." },
    provider: { q: "Where should we investigate unmet need?", d: "Read household structure, affordability and proposed supply together. Treat mismatches as research leads.", a: "Explore an area", t: "explore", g: "Household size is not bedroom preference. We do not yet measure unmet demand." },
  }[state.workspace];
  const annual = state.data.annual || [];
  const vals = annual.map((r) => (r.available ? r.medianGrossRent : null));
  return `
    <div class="role-tabs" aria-label="Choose your research focus">
      ${Object.entries({ policy: "Policymakers", research: "Researchers & advocates", resident: "Residents", provider: "Developers & nonprofits" }).map(([id, name]) => `<button type="button" data-ws="${id}" class="${id === state.workspace ? "active" : ""}">${name}</button>`).join("")}
    </div>
    <div class="overview-top">
      <section class="surface focus-panel">
        <div class="eyebrow">YOUR RESEARCH FOCUS</div>
        <h2>${esc(roleCopy.q)}</h2>
        <p>${esc(roleCopy.d)}</p>
        <button class="primary" type="button" data-view="${roleCopy.t}">${esc(roleCopy.a)} ↗</button>
        <div class="coverage-gap"><strong>Still missing</strong><span>${esc(roleCopy.g)}</span></div>
      </section>
      <section class="surface scan-panel">
        <div class="eyebrow">SNAPSHOT STATUS</div>
        <h2>Source check completed</h2>
        <p>Retrieved ${esc(state.data.generatedAt?.slice(0, 10) || "")}</p>
        <div class="scan-stats">
          <div><strong>${state.data.coverage.tractCount}</strong><span>county tracts</span></div>
          <div><strong>${watchlistItems().length}</strong><span>tracked properties</span></div>
        </div>
        <button class="text-link" type="button" data-view="watchlist">Open your watchlist →</button>
        <p class="fine">OpenAI Housing AI is used for questions. It is not a daily monitoring job.</p>
      </section>
    </div>
    <section class="surface annual-panel">
      <div class="panel-title"><div><div class="eyebrow">THE LONGER VIEW</div><h2>Pittsburgh over time</h2></div></div>
      ${sparkline(vals, annual.map((r) => String(r.year)))}
      ${(state.data.gaps || []).map((g) => `<div class="missing-year-note"><strong>${esc(g.label)}</strong><p>${esc(g.detail)}</p></div>`).join("")}
    </section>
    <div class="overview-bottom">
      <section class="surface"><h2>What needs a closer look</h2><div class="finding-preview"><span class="pill">permit trail</span><h3>303 27th St / 2700 Penn</h3><p>Warehouse demolition, then a master permit describing five houses. Completion is unverified.</p></div></section>
      <section class="surface"><div class="eyebrow">FROM SIGNAL TO EVIDENCE</div><h2>What does a permit actually prove?</h2><p class="spaced">Follow 2700 Penn from a demolition record to residential scope.</p><button class="secondary" type="button" data-view="projects" data-permit-focus="BDA-2024-00084">Open the sample permit records ↗</button></section>
    </div>`;
}

function sparkline(values, labels) {
  const nums = values.filter((v) => v != null);
  if (!nums.length) return "";
  const W = 760, H = 245, L = 68, R = 24, T = 24, B = 46;
  const max = Math.max(...nums) * 1.16;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, labels.length - 1);
  const y = (v) => T + ((max - v) / max) * (H - T - B);
  let d = "";
  values.forEach((v, i) => {
    if (v == null) return;
    d += `${d && values[i - 1] != null ? "L" : "M"}${x(i)},${y(v)} `;
  });
  const gap = labels.indexOf("2020");
  return `<div class="chart-scroll"><svg class="trend-chart" viewBox="0 0 ${W} ${H}">${gap >= 0 ? `<rect x="${x(gap) - 25}" y="${T}" width="50" height="${H - T - B}" fill="#fff1c8"/><text x="${x(gap)}" y="14" text-anchor="middle" style="fill:#70500e;font-size:12px">2020 unavailable</text>` : ""}<path d="${d}" fill="none" stroke="#a87510" stroke-width="2.5"/>${values.map((v, i) => (v == null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#a87510"><title>${labels[i]}: ${money(v)}</title></circle>`)).join("")}${labels.map((l, i) => (i % 2 === 0 || i === labels.length - 1 ? `<text x="${x(i)}" y="${H - 18}" text-anchor="middle">${esc(l)}</text>` : "")).join("")}</svg></div><div class="chart-key"><span><i style="background:#a87510"></i>Pittsburgh · ACS 1-year median gross rent (nominal)</span></div>`;
}

function tractDetails(t) {
  if (!t) return "";
  return `<h2 class="tract-title">${esc(t.name.replace(/,.*/, ""))}</h2>
    <div class="area-name">Tract ${esc(t.tract)}<br><span class="subtle">Tract boundary, not a neighborhood total</span></div>
    <div class="primary-stat"><div class="stat-label">Median monthly two-bedroom rent</div><div class="value">${money(t.rent2br)}</div><div class="error">${t.rent2brMoe == null ? "Margin of error unavailable" : "Published margin of error ±" + money(t.rent2brMoe)}</div></div>
    <div class="mini-stats">
      <div><span class="stat-label">Severe rent burden</span><strong>${percent(t.severeBurdenPct)}</strong></div>
      <div><span class="stat-label">Households</span><strong>${num(t.households)}</strong></div>
      <div><span class="stat-label">Renter households</span><strong>${num(t.renterHouseholds)}</strong></div>
      <div><span class="stat-label">One-person renters</span><strong>${num(t.onePersonRenters)}</strong></div>
    </div>
    <button class="compare-link" id="compare-selected" type="button">Compare this tract ↗</button>
    <p class="fine">Permit records are not housing units. Burden excludes cases where the ratio could not be computed.</p>`;
}

function bedroomChart(t) {
  if (!t) return "";
  const rows = [["Studio", t.rentStudio, t.rentStudioMoe], ["1 bed", t.rent1br, t.rent1brMoe], ["2 beds", t.rent2br, t.rent2brMoe], ["3 beds", t.rent3br, t.rent3brMoe]];
  return rows.map(([label, value, moe]) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar" style="width:${value == null ? 0 : Math.min(100, (value / 4000) * 100)}%"></div></div><span class="bar-value">${value == null ? "Not available" : money(value) + (moe == null ? "" : " ±" + num(moe))}</span></div>`).join("");
}

function compCard(t) {
  if (!t) return "";
  return `<article class="surface comparison-card"><div class="eyebrow">CENSUS TRACT ${esc(t.tract)}</div><h2>${esc(t.name.replace(/,.*/, ""))}</h2><p class="subtle">2020–2024 ACS · ${esc(t.geoid)}</p>
    <dl>
      <div><dt>Two-bedroom rent</dt><dd>${money(t.rent2br)}<small>MOE ${t.rent2brMoe == null ? "unavailable" : "±" + money(t.rent2brMoe)}</small></dd></div>
      <div><dt>Households</dt><dd>${num(t.households)}<small>MOE ±${num(t.householdsMoe)}</small></dd></div>
      <div><dt>Severe rent burden</dt><dd>${percent(t.severeBurdenPct)}<small>${num(t.severeBurdenNumerator)} / ${num(t.severeBurdenDenominator)}</small></dd></div>
      <div><dt>One-person renter households</dt><dd>${num(t.onePersonRenters)}</dd></div>
    </dl></article>`;
}

function historyPanel(t) {
  const hist = t?.history;
  if (!hist?.comparable) return `<div class="boundary-notice"><strong>Historical comparison withheld</strong><p>${esc(hist?.reason || "")}</p></div>`;
  return `<section class="surface history"><div><div class="eyebrow">A SECOND LOOK AT CHANGE</div><h2>Non-overlapping five-year estimates</h2><p>Prior 2BR rent ${money(hist.previous?.rent2br)} (${esc(hist.previous?.period)}). ${esc(hist.reason)}</p></div></section>`;
}

function chatHtml() {
  if (state.ai.loading) return `<div class="message">Asking OpenAI against the selected evidence pack…</div>`;
  if (state.ai.result && !state.ai.result.ok) return `<div class="message"><h3>${esc(state.ai.result.code)}</h3><p>${esc(state.ai.result.message)}</p></div>`;
  if (state.ai.result?.ok) {
    const r = state.ai.result;
    const resources = (r.resources || []).filter((link) => {
      try { return new URL(link.url).protocol === "https:"; } catch { return false; }
    });
    const sections = [["Answer", r.answer], ["Evidence", r.evidence], ["Limits", r.limits], ["Next step", r.next]];
    return `<div class="message">${sections.map(([title, content]) => `<section class="assistant-section"><h3>${title}</h3><div class="assistant-prose">${formatAssistantText(content)}</div></section>`).join("")}${resources.length ? `<h3>Continue your research</h3><p class="fine">External resources · not verified property matches</p><ul>${resources.map((link) => `<li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a><p>${esc(link.description)}</p></li>`).join("")}</ul>` : ""}<small>${esc((r.citations || []).join(", "))}</small>${r.latencyNote ? `<details class="assistant-response-details"><summary>About this response</summary><p class="fine">${esc(r.latencyNote)}</p></details>` : ""}</div>`;
  }
  return `<div class="message"><h3>Start with a question.</h3><p>Explore a tract or open a project, then ask about the evidence.</p><small>OpenAI Housing AI. Responses cite only the selected public snapshot.</small></div>`;
}

function bind() {
  el.querySelector("#workspace-select").onchange = (e) => {
    state.workspace = e.target.value;
    try { localStorage.setItem("housing-workspace", state.workspace); } catch {}
    state.view = "overview";
    render();
  };
  el.querySelectorAll("[data-ws]").forEach((b) => {
    b.onclick = () => {
      state.workspace = b.dataset.ws;
      try { localStorage.setItem("housing-workspace", state.workspace); } catch {}
      render();
    };
  });
  const runPermitSearch = (query) => {
    state.permitQuery = query.trim();
    state.permitSearched = true;
    state.project = null;
    state.assistantOpen = false;
    state.ai.result = null;
    state.ai.question = "";
    render();
  };
  el.querySelector("#permit-search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    runPermitSearch(el.querySelector("#permit-search").value);
  });
  el.querySelector("#permit-browse")?.addEventListener("click", () => runPermitSearch(""));
  el.querySelectorAll("[data-permit-example]").forEach((b) => { b.onclick = () => runPermitSearch(b.dataset.permitExample); });
  el.querySelectorAll("[data-permit-group]").forEach((b) => { b.onclick = () => {
    state.project = b.dataset.permitGroup;
    state.ai.result = null;
    state.ai.question = "";
    state.assistantOpen = false;
    render();
  }; });
  el.querySelector("#track-property")?.addEventListener("click", () => {
    const group = selectedPermitGroup();
    if (!group) return;
    try {
      trackProperty(localStorage, group);
      render();
      toast("Property added to your watchlist in this browser.");
    } catch { toast("Could not save the watchlist. Browser storage may be unavailable or full."); }
  });
  el.querySelectorAll("[data-untrack]").forEach((b) => { b.onclick = () => {
    try {
      untrackProperty(localStorage, b.dataset.untrack);
      render();
      toast("Removed from watchlist. Permit records and reviewer notes are unchanged.");
    } catch { toast("Could not update the watchlist. Please try again."); }
  }; });
  el.querySelectorAll("[data-open-tracked]").forEach((b) => { b.onclick = () => {
    const group = groupPermits(state.data.permits?.records || []).find((g) => g.key === b.dataset.openTracked);
    if (!group) return;
    state.view = "projects";
    state.permitQuery = group.parcel || group.address;
    state.permitSearched = true;
    state.project = group.key;
    state.ai.result = null;
    state.ai.question = "";
    state.assistantOpen = false;
    render();
    window.scrollTo({ top: 0 });
  }; });
  el.querySelector("#explain-permit")?.addEventListener("click", () => {
    const group = selectedPermitGroup();
    if (!group) return;
    const matches = searchPermits(state.data.permits?.records || [], state.permitQuery).find((g) => g.key === group.key);
    const focus = matches?.matches[0]?.permit_id;
    state.ai.result = null;
    state.ai.question = `Review the selected permit records for parcel ${group.parcel || group.key}, including permit ${focus}. What work is described, is completion established, and what should I verify next? Do not equate issued permits with completed homes.`;
    state.assistantOpen = true;
    render();
    el.querySelector("#question")?.focus({ preventScroll: true });
  });
  el.querySelectorAll("[data-view]").forEach((b) => {
    b.onclick = () => {
      state.view = b.dataset.view;
      if (state.view === "home") state.assistantOpen = false;
      if (state.view === "projects" && b.dataset.permitFocus) {
        state.permitQuery = b.dataset.permitFocus;
        state.permitSearched = true;
        state.project = searchPermits(state.data.permits?.records || [], state.permitQuery)[0]?.key || null;
        state.assistantOpen = false;
      }
      render();
      window.scrollTo({ top: 0 });
    };
  });
  el.querySelectorAll("[data-start-workspace]").forEach((b) => {
    b.onclick = () => {
      state.workspace = b.dataset.startWorkspace;
      state.view = b.dataset.startView;
      state.assistantOpen = false;
      try { localStorage.setItem("housing-workspace", state.workspace); } catch {}
      render();
      window.scrollTo({ top: 0 });
    };
  });
  el.querySelectorAll("[data-example]").forEach((b) => {
    b.onclick = () => {
      state.workspace = "policy";
      state.view = b.dataset.example;
      if (state.view === "projects") {
        state.permitQuery = "BDA-2024-00084";
        state.permitSearched = true;
        state.project = searchPermits(state.data.permits?.records || [], state.permitQuery)[0]?.key || null;
      }
      state.tractA = DEFAULT_A;
      state.tractB = DEFAULT_B;
      state.ai.result = null;
      state.ai.question = state.view === "compare"
        ? "Compare census tract 203 with census tract 605. Does lower rent necessarily mean less housing pressure? Include the data period, published rent margins of error, and one next step. Do not assume statistical significance."
        : "Can we count the five houses described in permit BDA-2024-00084 as completed homes? What does the evidence establish, and what should a planner verify next?";
      state.assistantOpen = true;
      try { localStorage.setItem("housing-workspace", state.workspace); } catch {}
      render();
      window.scrollTo({ top: 0 });
      el.querySelector("#question")?.focus({ preventScroll: true });
    };
  });
  el.querySelector(".brand").onclick = (e) => {
    e.preventDefault();
    state.view = "home";
    state.assistantOpen = false;
    render();
    window.scrollTo({ top: 0 });
  };
  const picker = el.querySelector("#tract-picker");
  if (picker) {
    picker.value = state.tractA;
    picker.onchange = (e) => {
      state.tractA = e.target.value;
      render();
    };
  }
  const ca = el.querySelector("#compare-a");
  const cb = el.querySelector("#compare-b");
  if (ca) { ca.value = state.tractA; ca.onchange = (e) => { state.tractA = e.target.value; render(); }; }
  if (cb) { cb.value = state.tractB; cb.onchange = (e) => { state.tractB = e.target.value; render(); }; }
  el.querySelector("#metric")?.addEventListener("change", (e) => { state.metric = e.target.value; render(); });
  el.querySelector("#compare-selected")?.addEventListener("click", () => { state.tractB = state.tractA === DEFAULT_B ? DEFAULT_A : DEFAULT_B; state.view = "compare"; render(); });
  el.querySelector("#save-area")?.addEventListener("click", () => {
    localStorage.setItem("heo-areas", JSON.stringify({ tractA: state.tractA, tractB: state.tractB }));
    toast("Area saved in this browser.");
  });
  el.querySelector("#explain-area")?.addEventListener("click", () => ask(`Explain the ACS rental context for tract ${tract(state.tractA)?.tract}.`));
  el.querySelector("#open-assistant").onclick = () => { state.assistantOpen = true; render(); };
  el.querySelector("#close-assistant")?.addEventListener("click", () => { state.assistantOpen = false; render(); });
  el.querySelector("#ask-form")?.addEventListener("submit", (e) => { e.preventDefault(); ask(el.querySelector("#question").value); });
  el.querySelectorAll("[data-question]").forEach((b) => { b.onclick = () => ask(b.dataset.question); });
  el.querySelector("#download-comparison")?.addEventListener("click", exportBrief);
  el.querySelector("#inv-note")?.addEventListener("change", (e) => localStorage.setItem(`heo-note:${state.project}`, e.target.value));
  el.querySelector("#mark-reviewed")?.addEventListener("click", () => { localStorage.setItem(`heo-reviewed:${state.project}`, "1"); toast("Marked reviewed (workflow only)."); });
  el.querySelector("#zoom-in")?.addEventListener("click", () => zoom(0.72));
  el.querySelector("#zoom-out")?.addEventListener("click", () => zoom(1.4));
  el.querySelector("#reset-map")?.addEventListener("click", () => { state.mapBounds = [0, 0, 710, 550]; render(); });
  el.querySelector("#county-map")?.addEventListener("click", () => { state.mapBounds = [0, 0, 710, 550]; render(); });
}

function zoom(f) {
  const [x, y, w, h] = state.mapBounds;
  state.mapBounds = [x + (w * (1 - f)) / 2, y + (h * (1 - f)) / 2, w * f, h * f];
  render();
}

function toast(s) {
  const n = el.querySelector("#toast");
  if (!n) return;
  n.textContent = s;
  n.style.display = "block";
  setTimeout(() => { n.style.display = "none"; }, 2800);
}

function geoBounds(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  };
  features.forEach((f) => walk(f.geometry.coordinates));
  return { minX, minY, maxX, maxY };
}

function projectPt(b, [lon, lat]) {
  const x = ((lon - b.minX) / (b.maxX - b.minX)) * 710;
  const y = ((b.maxY - lat) / (b.maxY - b.minY)) * 550;
  return [x, y];
}

function pathFor(feature, b) {
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polys.map((rings) => rings.map((ring) => ring.map((pt, i) => { const [x, y] = projectPt(b, pt); return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`; }).join(" ") + " Z").join(" ")).join(" ");
}

function fillFor(t) {
  if (!t) return "#cbd3d7";
  if (state.metric === "rent") {
    const v = t.rent2br ?? t.medianGrossRent;
    if (v == null) return "#cbd3d7";
    const f = (v - 600) / 2400;
    return RAMP[Math.min(5, Math.max(0, Math.floor(f * 6)))];
  }
  if (t.severeBurdenPct == null) return "#cbd3d7";
  return RAMP[Math.min(5, Math.max(0, Math.floor(t.severeBurdenPct / 0.5 * 6)))];
}

function renderMap() {
  const svg = document.getElementById("map");
  if (!svg || !state.geo?.features?.length) return;
  const b = geoBounds(state.geo.features);
  svg.innerHTML = state.geo.features.map((f) => {
    const id = f.properties.geoid;
    const t = tract(id);
    const selected = id === state.tractA ? " selected" : "";
    return `<path d="${pathFor(f, b)}" fill="${fillFor(t)}" data-id="${id}" class="${selected.trim()}"><title>${esc(t?.name || id)}</title></path>`;
  }).join("");
  const selectedPath = svg.querySelector(`[data-id="${state.tractA}"]`);
  if (selectedPath) svg.append(selectedPath);
  svg.querySelectorAll("path").forEach((p) => {
    p.onclick = () => { state.tractA = p.dataset.id; render(); };
    p.onmouseenter = () => {
      const t = tract(p.dataset.id);
      const tip = document.getElementById("map-tooltip");
      tip.textContent = t ? `Tract ${t.tract} · ${state.metric === "rent" ? money(t.rent2br) : percent(t.severeBurdenPct)}` : p.dataset.id;
      tip.style.display = "block";
    };
    p.onmouseleave = () => { document.getElementById("map-tooltip").style.display = "none"; };
  });
}

async function ask(question) {
  const q = String(question || "").trim();
  if (!q) return;
  state.assistantOpen = true;
  state.ai.question = q;
  state.ai.loading = true;
  state.ai.result = null;
  render();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: q,
        ids: {
          tracts: [state.tractA, state.tractB],
          permits: state.view === "projects" ? (selectedPermitGroup()?.records || []).map((p) => p.permit_id).filter(Boolean) : [],
          includeInvestigation: state.view === "projects" && Boolean(state.project) && state.project === state.data.investigation?.parcel_num,
        },
      }),
    });
    state.ai.result = await res.json();
  } catch (err) {
    state.ai.result = { ok: false, code: "network", message: err.message };
  }
  state.ai.loading = false;
  render();
}

function exportBrief() {
  const a = tract(state.tractA);
  const b = tract(state.tractB);
  const rows = [["tract", "two_bedroom_rent", "households", "severe_burden"], [a.geoid, a.rent2br, a.households, a.severeBurdenPct], [b.geoid, b.rent2br, b.households, b.severeBurdenPct]];
  const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "housing-tract-comparison.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
