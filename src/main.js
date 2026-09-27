import "./styles.css";

const WORKSPACES = {
  resident: {
    name: "Find a Place",
    audience: "For residents",
    views: { overview: "Budget & Areas", explore: "Explore Areas", compare: "Compare Areas", projects: "Housing Pipeline", watchlist: "Watchlist", saved: "Saved Areas", sources: "Sources" },
  },
  policy: {
    name: "Understand Housing Change",
    audience: "For policymakers",
    views: { overview: "Overview", explore: "Area Trends", compare: "Trends & Compare", projects: "Housing Pipeline", watchlist: "Investigations", sources: "Sources" },
  },
  research: {
    name: "Check the Evidence",
    audience: "For researchers & advocates",
    views: { overview: "Research Desk", explore: "Area Evidence", compare: "Trends & Compare", projects: "Project Evidence", watchlist: "Investigations", sources: "Sources" },
  },
  provider: {
    name: "Explore Housing Needs",
    audience: "For developers & nonprofits",
    views: { overview: "Area Profiles", explore: "Explore Needs", compare: "Compare Areas", projects: "Proposed Supply", watchlist: "Investigations", saved: "Saved Research Areas", sources: "Sources" },
  },
};

const PAGE_TITLES = {
  overview: ["Housing, in context.", "Follow change. Investigate the evidence."],
  explore: ["See the place. Follow the evidence.", "Housing conditions and development records, connected."],
  compare: ["Two places. A clearer perspective.", "Compare like-for-like estimates, with uncertainty in view."],
  projects: ["From permit to project.", "Trace what the records say—and what they do not."],
  watchlist: ["Signals worth investigating.", "New observations, explicit uncertainty and a clear next check."],
  saved: ["Your area shortlist.", "Saved locally, ready to compare."],
  sources: ["Know what is behind the number.", "Source coverage, assumptions and the limits of this research preview."],
};

const DEFAULT_A = "42003020300";
const DEFAULT_B = "42003060500";
const RAMP = ["#f5e9bd", "#eac964", "#d5a33b", "#a4782c", "#5b5140", "#292e31"];

const state = {
  workspace: "policy",
  view: "explore",
  tractA: DEFAULT_A,
  tractB: DEFAULT_B,
  metric: "rent",
  mapBounds: [0, 0, 710, 550],
  geo: null,
  project: null,
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
  const navIds = ["overview", "explore", "compare", "projects", "watchlist", "saved", "sources"];
  el.innerHTML = `
    <a href="#main" class="skip">Skip to content</a>
    <header>
      <a class="brand" href="#explore"><span class="brandmark" aria-hidden="true">HE</span><span>Housing Evidence<small>PITTSBURGH OBSERVATORY</small></span></a>
      <div class="workspace-switcher">
        <label for="workspace-select">YOUR WORKSPACE</label>
        <select id="workspace-select">${Object.entries(WORKSPACES).map(([id, ws]) => `<option value="${id}" ${id === state.workspace ? "selected" : ""}>${ws.name}</option>`).join("")}</select>
        <p id="workspace-audience">${esc(w.audience)}</p>
      </div>
      <nav aria-label="Main navigation">
        ${navIds.map((id) => {
          const label = w.views[id];
          if (!label) return "";
          return `<button type="button" data-view="${id}" class="${id === state.view ? "active" : ""}" ${id === "watchlist" ? `id="watch-nav"` : ""}>${label}${id === "watchlist" ? ' <span id="alert-count">1</span>' : ""}</button>`;
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
      <div class="period">
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
      <div class="assistant-mode"><strong>Cursor Housing AI</strong><span>Uses your CURSOR_API_KEY on this computer. The server picks the evidence; a reply can take tens of seconds.</span></div>
      <div class="context" id="assistant-context">Context: Tract ${esc(tract(state.tractA)?.tract)} + Tract ${esc(tract(state.tractB)?.tract)}</div>
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
            <label class="field-label" for="tract-picker">EXPLORE A CENSUS TRACT</label>
            <select id="tract-picker">${options()}</select>
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
            <div class="section-head"><div class="eyebrow">FROM AREA TO ADDRESS</div><h2>Explore a real evidence trail</h2><p>Reviewed parcel records, not a citywide inventory</p></div>
            <button class="case-item" type="button" data-view="projects"><span><strong>303 27th St / 2700 Penn</strong><small>Master permit describes five houses · Issued is not completed</small></span><span>↗</span></button>
          </section>
        </div>
      </section>`;
  }
  if (state.view === "compare") {
    return `
      <section id="compare" class="view">
        <div class="surface compare-controls">
          <label>First census tract<select id="compare-a">${options()}</select></label>
          <span>vs.</span>
          <label>Second census tract<select id="compare-b">${options()}</select></label>
          <button id="download-comparison" class="secondary" type="button">Download comparison</button>
        </div>
        <div id="comparison" class="comparison-grid">${compCard(a)}${compCard(b)}</div>
        <p class="fine">These estimates describe areas, not individual households or properties. Differences have not been tested for statistical significance.</p>
        ${historyPanel(a)}
      </section>`;
  }
  if (state.view === "projects") {
    return `
      <section id="projects" class="view">
        <section class="surface pipeline-explainer">
          <div class="eyebrow">HOUSING PIPELINE / REVIEWED SAMPLE</div>
          <h2>What is proposed, and what is actually verified?</h2>
          <p>A demolition record and a master permit on the same parcel. Same parcel is not the same project. Issued is not occupancy.</p>
          <div class="stage-strip">
            <div class="known"><span>01</span><strong>Scope recorded</strong><small>Read the application</small></div>
            <div class="known"><span>02</span><strong>Permit issued</strong><small>Permission, not completion</small></div>
            <div><span>03</span><strong>Construction</strong><small>Not independently verified</small></div>
            <div><span>04</span><strong>Occupancy</strong><small>Certificate not verified</small></div>
          </div>
        </section>
        <div class="project-layout">
          <aside class="surface project-menu">
            <div class="eyebrow">REVIEWED PROJECTS</div>
            <button class="project-choice active" type="button"><strong>2700 Penn / 303 27th St</strong><small>${esc(inv?.parcel_num || "")}</small></button>
          </aside>
          <article class="surface">
            <div class="project-heading"><span class="pill warn">Reviewed records</span><h2>303 27th St</h2><p>Strip District · parcel ${esc(inv?.parcel_num || "")}</p></div>
            <div class="project-summary">
              <div><span class="stat-label">Earlier record</span><strong>${esc(inv?.before?.permit_id || "n/a")}</strong></div>
              <div><span class="stat-label">Later record</span><strong>${esc(inv?.after?.permit_id || "n/a")}</strong></div>
            </div>
            <div class="evidence-callout"><strong>What remains unverified</strong> Occupancy approval, actual completion, and whether master and townhouse permits can be added together. ${esc(inv?.note || "")}</div>
            <div class="timeline">
              ${[inv?.before, inv?.after].filter(Boolean).map((r, i) => `<details ${i === 0 ? "open" : ""}><summary><small>${esc(r.issue_date)} · ${esc(r.permit_type)}</small><strong>${esc(r.permit_id)}</strong><span class="pill">${esc(r.status)}</span></summary><p>${esc(r.work_description)}</p></details>`).join("")}
            </div>
            <label>Reviewer note<textarea id="inv-note">${esc(localStorage.getItem("heo-note") || "")}</textarea></label>
            <div class="alert-actions"><button type="button" id="mark-reviewed">Mark reviewed</button></div>
          </article>
        </div>
      </section>`;
  }
  if (state.view === "watchlist") {
    return `<section class="view"><section class="surface monitor-summary"><div><div class="eyebrow">EVIDENCE MONITOR</div><h2>Source snapshot labeled ${esc(state.data.permits?.lastModified?.slice(0, 10) || "")}</h2><p>This rebuild stores a current WPRDC extract and one parcel investigation. It does not run a daily cloud job.</p></div><span class="pill">Cursor AI for Q&amp;A · not Azure</span></section>
      <article class="surface alert-card"><div class="alert-meta"><span class="pill">record trail</span><span>Observed related permits</span></div><h3>303 27th St description trail</h3><p>Demolition of a warehouse, then a master permit describing five houses. These records do not prove five completed homes.</p><div class="alert-actions"><button type="button" data-view="projects">View project evidence ↗</button></div></article></section>`;
  }
  if (state.view === "saved") {
    const saved = JSON.parse(localStorage.getItem("heo-areas") || "null");
    return `<section class="surface saved-areas"><h2>Your saved areas</h2><p>Return to rental context for your shortlist. Saved in this browser only.</p>${saved ? `<article><h3>Tract ${esc(tract(saved.tractA)?.tract)} and tract ${esc(tract(saved.tractB)?.tract)}</h3><button class="primary" type="button" data-view="compare">Compare areas</button></article>` : "<p>No saved areas yet. Open Explore Areas and select Save area.</p>"}</section>`;
  }
  return `<div class="source-grid">${(state.data.citations || []).map((c, i) => `<article class="surface"><div class="eyebrow">0${i + 1}</div><h2>${esc(c.label)}</h2><a href="${esc(c.url)}" target="_blank" rel="noreferrer">Open source ↗</a></article>`).join("")}</div>${(state.data.gaps || []).map((g) => `<div class="missing-year-note"><strong>${esc(g.label)}</strong><p>${esc(g.detail)}</p></div>`).join("")}`;
}

function overviewHtml() {
  const roleCopy = {
    resident: { q: "Which areas fit my housing budget?", d: "Compare rental context by home size, then check current listings and utilities.", a: "Explore rental context", t: "explore", g: "Live listings, landlord experiences and verified resident reviews are not yet connected." },
    policy: { q: "Where should we investigate housing pressure?", d: "Follow affordability and permit activity. Separate recorded progress from verified homes.", a: "Review the pipeline", t: "projects", g: "Citywide verified starts, completions and occupancy are not yet available." },
    research: { q: "What changed, and how strong is the evidence?", d: "Inspect historical estimates, source coverage and comparable geography before drawing conclusions.", a: "Compare areas", t: "compare", g: "A trend alone cannot establish policy impact." },
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
          <div><strong>1</strong><span>open investigation</span></div>
        </div>
        <button class="text-link" type="button" data-view="watchlist">Review findings →</button>
        <p class="fine">Cursor Housing AI is used for questions. It is not a daily monitoring job.</p>
      </section>
    </div>
    <section class="surface annual-panel">
      <div class="panel-title"><div><div class="eyebrow">THE LONGER VIEW</div><h2>Pittsburgh over time</h2></div></div>
      ${sparkline(vals, annual.map((r) => String(r.year)))}
      ${(state.data.gaps || []).map((g) => `<div class="missing-year-note"><strong>${esc(g.label)}</strong><p>${esc(g.detail)}</p></div>`).join("")}
    </section>
    <div class="overview-bottom">
      <section class="surface"><h2>What needs a closer look</h2><div class="finding-preview"><span class="pill">permit trail</span><h3>303 27th St / 2700 Penn</h3><p>Warehouse demolition, then a master permit describing five houses. Completion is unverified.</p></div></section>
      <section class="surface"><div class="eyebrow">FROM SIGNAL TO EVIDENCE</div><h2>What does a permit actually prove?</h2><p class="spaced">Follow 2700 Penn from a demolition record to residential scope.</p><button class="secondary" type="button" data-view="projects">Open the 2700 Penn evidence trail ↗</button></section>
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
  if (state.ai.loading) return `<div class="message">Starting a Cursor agent against the evidence pack…</div>`;
  if (state.ai.result && !state.ai.result.ok) return `<div class="message"><h3>${esc(state.ai.result.code)}</h3><p>${esc(state.ai.result.message)}</p></div>`;
  if (state.ai.result?.ok) {
    const r = state.ai.result;
    return `<div class="message"><h3>Answer</h3><p>${esc(r.answer)}</p><h3>Evidence</h3><p>${esc(r.evidence)}</p><h3>Limits</h3><p>${esc(r.limits)}</p><h3>Next step</h3><p>${esc(r.next)}</p><small>${esc((r.citations || []).join(", "))}</small></div>`;
  }
  return `<div class="message"><h3>Start with a question.</h3><p>Explore a tract or open a project, then ask about the evidence.</p><small>Cursor SDK Housing AI. Responses cite only the selected public snapshot.</small></div>`;
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
  el.querySelectorAll("[data-view]").forEach((b) => {
    b.onclick = () => {
      state.view = b.dataset.view;
      render();
    };
  });
  el.querySelector(".brand").onclick = (e) => {
    e.preventDefault();
    state.view = "explore";
    render();
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
  el.querySelector("#inv-note")?.addEventListener("change", (e) => localStorage.setItem("heo-note", e.target.value));
  el.querySelector("#mark-reviewed")?.addEventListener("click", () => { localStorage.setItem("heo-reviewed", "1"); toast("Marked reviewed (workflow only)."); });
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
          permits: (state.data.investigation?.related || []).map((p) => p.permit_id).filter(Boolean),
          includeInvestigation: true,
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
