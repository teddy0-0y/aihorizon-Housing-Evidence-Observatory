export function findingPreferences() {
  try { return JSON.parse(localStorage.getItem("heo-finding-review-v1") || "{}") || {}; } catch { return {}; }
}
export function unreadFindings(monitor) {
  const preferences = findingPreferences();
  return (monitor?.findings || []).filter((finding) => !preferences[finding.id]);
}
export function reviewFinding(id, status) {
  const preferences = findingPreferences();
  if (status === "open") delete preferences[id];
  else preferences[id] = status;
  localStorage.setItem("heo-finding-review-v1", JSON.stringify(preferences));
}
export function findingsHtml(monitor, esc, filter = "open") {
  if (!monitor) return '<section class="surface"><h2>AI Findings</h2><p>Loading scan status…</p></section>';
  const run = monitor.lastRun;
  const prefs = findingPreferences();
  const all = monitor.findings || [];
  const findings = filter === "all" ? all : unreadFindings(monitor);
  const status = monitor.unavailable ? "Scan status unavailable" : !monitor.configured ? "AI scanning needs configuration" : !run ? "Ready for the first scan" : run.status === "running" ? "AI is reviewing the database" : run.status === "completed" ? "Latest scan completed" : "The latest scan needs attention";
  return `<section class="view findings-view">
    <section class="surface monitor-summary"><div><div class="eyebrow">PROACTIVE AI REVIEW</div><h2>${esc(status)}</h2><p>Start a scan to let Housing AI find evidence worth a closer look, then ask about its findings.</p></div>
      <div class="scan-stats"><div><strong>${unreadFindings(monitor).length}</strong><span>findings to review</span></div><div><strong>${monitor.scope?.tracts ?? "—"}</strong><span>tract profiles</span></div><div><strong>${monitor.scope?.permits ?? "—"}</strong><span>permit records</span></div></div>
      <p class="wide">${run ? `Last attempt: ${esc(new Date(run.startedAt).toLocaleString())} · ${esc(run.status)}${run.status === "completed" ? ` · ${run.recordsReviewed} records considered · ${run.newFindings} new findings` : ""}` : "No completed AI scan yet. No findings does not mean no housing problems."}</p>
      ${run?.error ? `<p class="monitor-error" role="status">The scan did not complete (${esc(run.error)}). Previous successful findings are retained.</p>` : ""}
      <p class="wide">ACS profiles describe dated estimates. ${monitor.refreshEnabled ? `Source checks cover ${monitor.scope?.parcels || 0} seeded parcels only; this is not a citywide permit search.` : "Permit records come from the stored snapshot; live source refresh is off."} ${monitor.scope?.permitCheckedAt ? `Last successful permit check: ${esc(new Date(monitor.scope.permitCheckedAt).toLocaleString())}.` : ""}</p>
      <details class="scan-controls" open><summary>Run a scan for this demo</summary><p>Completed results are shared with everyone. Unchanged evidence reuses its previous analysis.</p><form id="scan-form">${monitor.requiresAdminToken ? '<label>Scan administrator token<input type="password" id="scan-token" autocomplete="off" placeholder="Deployment admin token, not OpenAI key" required></label>' : ""}<button type="submit" class="primary" ${!monitor.configured || run?.status === "running" ? "disabled" : ""}>Run AI scan</button></form><p class="fine">Scans start only when you click Run AI scan. There is no automatic schedule.</p></details>
    </section>
    <section class="surface findings-list"><div class="panel-title"><h2>What needs attention</h2><div class="segmented"><button data-finding-filter="open" class="${filter === "open" ? "active" : ""}">To review</button><button data-finding-filter="all" class="${filter === "all" ? "active" : ""}">All findings</button></div></div><p class="fine">AI interpretations are unverified research leads. Reviewed / dismissed status belongs to this browser. Alerts are delivered here, not by email.</p>
      ${findings.length ? `<div class="alert-grid">${findings.map((finding) => `<article class="alert-card surface"><div class="alert-meta"><span class="pill">${esc(finding.category.replaceAll("-", " "))}</span><span>${esc(prefs[finding.id] || "To review")}</span></div><h3>${esc(finding.title)}</h3><p>${esc(finding.reason)}</p><dl class="alert-explanation"><div><dt>Uncertainty</dt><dd>${esc(finding.uncertainty)}</dd></div><div><dt>Next check</dt><dd>${esc(finding.nextCheck)}</dd></div></dl><details class="evidence-details"><summary>Inspect source records (${finding.evidence.length})</summary>${finding.evidence.map((record) => `<p><strong>${esc(record.id)}</strong> · <a href="${record.id.startsWith("permit:") ? "https://data.wprdc.org/dataset/pli-permits" : "https://data.census.gov/"}" target="_blank" rel="noopener noreferrer">Source ↗</a></p><pre>${esc(JSON.stringify(record, null, 2))}</pre>`).join("")}</details><div class="alert-actions"><button type="button" data-ask-finding="${esc(finding.id)}">Ask AI about this ↗</button>${prefs[finding.id] ? `<button type="button" data-review-finding="${esc(finding.id)}" data-status="open">Reopen</button>` : `<button type="button" data-review-finding="${esc(finding.id)}" data-status="reviewed">Mark reviewed</button><button type="button" data-review-finding="${esc(finding.id)}" data-status="dismissed">Dismiss</button>`}</div><p class="fine">${esc(finding.model)} · Identified ${esc(new Date(finding.createdAt).toLocaleString())} · Not a verified new event</p></article>`).join("")}</div>` : `<p class="empty-state">${run?.status !== "completed" && !all.length ? "No published findings yet. Complete an AI scan to populate this panel." : filter === "open" && all.length ? "All current findings have been reviewed or dismissed in this browser." : "The completed scan returned no findings. Coverage is limited; this is not an all-clear."}</p>`}
    </section><details class="surface monitor-history"><summary>Recent scan history</summary><div class="table-scroll"><table><thead><tr><th>Started</th><th>Status</th><th>AI calls</th><th>Cached batches</th><th>New findings</th></tr></thead><tbody>${(monitor.runs || []).map((item) => `<tr><td>${esc(new Date(item.startedAt).toLocaleString())}</td><td>${esc(item.status)}</td><td>${item.aiCalls}</td><td>${item.cachedBatches}</td><td>${item.newFindings}</td></tr>`).join("")}</tbody></table></div></details>
  </section>`;
}
