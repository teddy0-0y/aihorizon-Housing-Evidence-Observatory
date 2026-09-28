# Housing Evidence Observatory
Team: Cina & Chiffon

A public-data research prototype for Pittsburgh and Allegheny County, built for **AI for Housing Hackathon, part of AI Horizons 2026**.

**Track 2:** Housing Production, Rents & Household Flow Observatory

**Contributors:** Susana (Yu Hua) Peng and Yen-Chu Chen, Carnegie Mellon University

## The problem

Housing evidence comes from sources with different dates, geographies, and definitions. A lower rent estimate does not establish less housing pressure, and an issued permit does not establish a completed home. This app helps users inspect the records behind a question and decide what to verify next.

## Four workspaces

| Workspace | Audience | Supported workflow |
| --- | --- | --- |
| Find a Place | Residents | Explore historical rent by home size, compare rent burden, and save an area pair for further research. |
| Understand Housing Change | Policymakers | Inspect permit records, document unresolved questions, and track properties for follow-up. |
| Check the Evidence | Researchers and advocates | Compare estimates, inspect periods and uncertainty, download comparisons, and check original sources. |
| Explore Housing Needs | Developers and nonprofits | Compare household structure and rent burden, save research areas, and inspect proposed supply records. |

**AI Findings** reviews stored evidence when a user clicks **Run AI scan**. It publishes research leads with source records, uncertainty, and a suggested next check. An in-app badge and banner identify unreviewed findings. **AI Assistant** explains selected areas, permit records, or a finding's evidence in an Answer / Evidence / Limits / Next step format.

Users make the final judgment. This is decision support, not binding legal, financial, or zoning advice.

## Run locally

Requires **Node.js 22 or later** and npm.

```sh
git clone https://github.com/teddy0-0y/aihorizon-Housing-Evidence-Observatory.git
cd aihorizon-Housing-Evidence-Observatory
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Maps, comparisons, permit search, saved areas, and the Watchlist work with the included snapshots and do not require an API key.

To enable AI features, copy `.env.example` to `.env.local` if it does not already exist, set your own `OPENAI_API_KEY`, and restart the server. The default model is `gpt-4o-mini`. Keys stay on the server. Never put them in browser code, screenshots, or committed files. `.env.local` and generated scan state are ignored by Git.

No database service is required locally. See [DEPLOY.md](DEPLOY.md) for environment settings, persistence, and optional hosting.

## Suggested walkthrough

1. Open **Find a Place**, explore tract **203**, and compare it with **605**. Read rent and severe rent burden together, including the published uncertainty.
2. In **Permit Explorer**, search **BDA-2024-00084**, select the result at **319 27TH ST**, and inspect its description and unverified completion assessment.
3. Track the property and return to its records through **Watchlist**. Area pairs, notes, bookmarks, and review preferences are stored in the current browser.
4. With your API key configured, open **AI Findings** and click **Run AI scan**. Inspect a returned lead's sources, then select **Ask AI about this** and submit the question.

AI calls incur charges on the API account you configure. Scans have a five-minute cooldown and reuse unchanged evidence. A run can return no findings or fail; the interface reports that state and retains previous successful findings. Results from the developers' local AI runs are not bundled as precomputed demo output.

## Data and source attribution

| Source | Included use | Coverage |
| --- | --- | --- |
| U.S. Census Bureau [ACS tables](https://data.census.gov/) | B25031 rent by bedrooms, B25070 rent burden, B25003 tenure, B25009 household size by tenure | 394 Allegheny County tract profiles; pooled 2020–2024 and 2015–2019 estimates |
| U.S. Census Bureau ACS B25064 | Pittsburgh annual median gross rent | 2015–2019 and 2021–2024; missing years remain explicit |
| U.S. Census Bureau ACS B07003 | Pittsburgh geographic mobility | 2020–2024 estimates for people age 1+, not household origin–destination flows |
| [Pittsburgh PLI permits via WPRDC](https://data.wprdc.org/dataset/pli-permits) | Permit dates, status, addresses, and work descriptions | Included extract: 25 permit records across two parcel groups |
| [WPRDC](https://data.wprdc.org/) Allegheny County census tracts | Map polygons | 2020 tract boundaries |

The committed snapshots were retrieved September 26–27, 2026. [DATA.md](DATA.md) documents provenance, formulas, periods, missing values, and comparison restrictions. The app's **Sources** tab and [citation index](evidence/citations.json) provide source and methodology links. Public records retain their original providers' applicable terms and attribution requirements.

## Architecture and third-party tools

- **Frontend:** JavaScript, HTML, CSS, and Vite. The map uses SVG polygons from the included tract geometry.
- **Backend:** Node.js HTTP server. It selects bounded evidence for OpenAI requests; the browser never receives the API key.
- **Storage:** local JSON state for development; PostgreSQL through `pg` for optional hosted operation. Browser local storage holds personal bookmarks and notes.
- **Libraries and tooling:** Vite, `pg`, and Leaflet are declared in [package.json](package.json), with pinned dependency resolution in [package-lock.json](package-lock.json). Leaflet is included as a dependency; the current map renderer uses SVG.
- **Fonts:** IBM Plex Sans, IBM Plex Mono, and Barlow Condensed through Google Fonts. Legacy styles also reference DM Sans and Manrope.
- **External services:** OpenAI Chat Completions, Census public table access, and WPRDC data services. Optional Render configuration is included in [render.yaml](render.yaml); this file does not indicate an active deployment.

## AI use disclosure

**During development:** Cursor and OpenAI Codex assisted with implementation, debugging, tests, documentation, and demo preparation. OpenAI image generation produced presentation visuals for the demo video; those recording assets are not included in this repository.

**At runtime:** OpenAI Chat Completions powers AI Assistant and the manual AI Findings scan. The server supplies public snapshot records. The model has no browsing or file-editing tools. Scan outputs must cite valid IDs from the current batch and pass server validation before publication. This validates structure and references, not the truth of every interpretation.


## Limitations and responsible use

- Historical ACS estimates are not current asking rents or property availability. Missing and suppressed values remain unknown, not zero.
- Census tracts are statistical areas. Their profiles do not establish conditions for an individual household, causality, neighborhood rankings, or statistical significance.
- Historical comparisons use the implemented GEOID and boundary screening, not an official tract crosswalk. Unsupported comparisons are withheld.
- Permit search covers the included extract, not a complete citywide inventory. Multiple permits may concern one development. Permit status does not verify construction, completed units, or occupancy.
- AI scans review batches of records, not every possible relationship across the database. Leads can be inaccurate, incomplete, or repetitive. Inspect sources and seek appropriate professional or community review before consequential decisions.
- No live listings, verified citywide completions, household origin–destination flows, housing-shortage score, or causal policy evaluation is provided.
- Scans are manually triggered. Scheduled scanning is a future deployment proposal, not an implemented service. Notifications are in-app only; there is no email or OS push.
- The prototype has no user accounts or shared personal bookmarks. Public hosting does not provide per-user authorization for chat or scan results. Do not submit private household information to AI Assistant.

A possible next step is practitioner testing of the existing workflows, followed by broader validated source coverage and scheduled reviews. No pilot partnership or deployment is claimed.

## Verification

```sh
npm test
npm run build
```

Tests cover data formulas and missing values, evidence selection, permit search and tracking, safe response rendering, and scan validation, caching, budgets, and failure preservation. Automated tests use mocked model responses. Live AI verification requires your own key and does not establish that every future response will be correct.
