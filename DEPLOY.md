# Running and hosting

Scans start only when a user clicks **Run AI scan**. Status polling reads results and does not trigger analysis. Scheduled scanning is not implemented.

## Local development

Use Node.js 22 or later, run `npm ci`, then `npm run dev`. Open http://127.0.0.1:5173. To enable AI features, copy `.env.example` to `.env.local` if it does not exist and configure `OPENAI_API_KEY`. Restart after environment or server-code changes.

Without `DATABASE_URL`, development stores scan results in ignored `.data/monitor.json`. Leave `MONITOR_ADMIN_TOKEN` empty for a local-only preview. Source data and non-AI views work without OpenAI credentials.

## Optional hosted website

Only use this if you also want a shareable live URL. The `render.yaml` blueprint contains a web service and PostgreSQL, with **no cron service or schedule**. These resources have not been created by editing the repository.

1. Push this version to your repository and create a Render Blueprint from `render.yaml`. Review the displayed cost for its paid web/database resources before deployment.
2. Enter `OPENAI_API_KEY` in the web service's secret environment settings. The blueprint supplies a private `DATABASE_URL` and generates a separate `MONITOR_ADMIN_TOKEN` for manual scans.
3. Verify `/api/health` returns `ok: true` and `storage: "postgres"`. Open the hosted URL and enter the administrator token in **AI Findings → Run a scan for this demo**. Never put your OpenAI key in that browser input.
4. Click **Run AI scan** and verify real results and the finding-to-chat flow. Each subsequent scan requires another manual trigger. Keeping the site online does not start scans automatically.

Use a direct PostgreSQL connection because concurrency control uses session advisory locks. Other Node hosts can build with `npm ci --include=dev && npm run build` and run `npm start`, with the same web-service environment variables.

## Scan coverage and validation

- First startup seeds the database from `evidence/snapshot.json`: 394 dated ACS tract profiles and the included permit extract.
- With `MONITOR_REFRESH_PERMITS=true`, a manually triggered scan refreshes WPRDC records for the **two seeded parcel groups**, including newly observed permits on those parcels. This is not all-city permit monitoring and does not follow arbitrary addresses added to personal Watchlists.
- ACS profiles retain their published historical period. They are not downloaded daily. Replacing the repository snapshot does not automatically migrate an existing database; a future data-import workflow is needed to publish new ACS vintages.
- AI reviews all stored tract/permit profiles in batches of 60 (maximum 720 records), with up to three findings per batch. Interpretation and comparisons are bounded to each batch; it is not an exhaustive cross-record anomaly detector. Source fields, uncertainty, and next checks accompany each finding. Withheld historical comparisons are excluded from model evidence.
- Source observations retain changed field values and first-observed context. New records are not proof of new construction; issued or completed permit status does not independently verify completed housing units.
- Source fetches reject missing baseline IDs, duplicate IDs, unexpected parcels, empty or truncated responses. Failed runs keep the last completed findings. Missing source records require investigation rather than automatic deletion.
- Unchanged evidence reuses cached model results. No repeated notifications for the same finding ID in a browser after review/dismiss. Changed source evidence can create a new finding. AI text and citations are validated structurally; this is not a guarantee of factual correctness.
- Only a fully successful scan replaces the published findings. The current view shows the latest successful scan, not a permanent archive of all prior findings. Twenty run summaries are retained.

## Notifications and review

New/unreviewed findings appear in the **AI Findings badge and page banner**, with updates polled every 15 seconds while the page is open. Findings remain available after closing/reopening the site. Reviewed/dismissed preferences are browser-local; scan results are shared. There is no email, SMS, OS push, per-user account, or personalized alert subscription in this demo.

The scan button requires an admin token in production. There is no scheduled scan. OpenAI credentials stay on the server. Scans are limited to 24 model-call attempts per UTC day, with a five-minute minimum between runs and shared concurrency exclusion. Each scan call allows at most 2,200 completion tokens; public chat has a shared 100-request daily cap and 1,800 completion-token bound. These are demo application limits, not a guaranteed monetary spending cap. Chat remains available while scans run.

## Local preview and verification

`npm run dev` uses `.env.local` and persists preview scan results in ignored `.data/monitor.json` when `DATABASE_URL` is absent. Start a preview scan through the UI; no scheduler is installed. `npm start` requires PostgreSQL for persistent hosted storage; local development does not.

Run `npm test` and `npm run build`. Tests cover unknown evidence IDs, malformed/truncated AI responses, caching, partial-run failure and resume, source validation, failure preservation, cooldown/budget checks, persistence, and finding-to-chat context. Live OpenAI verification requires a real API key. Optional hosted deployment requires its own acceptance check before sharing a URL.

Official references: [Render Blueprints](https://render.com/docs/blueprint-spec), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
