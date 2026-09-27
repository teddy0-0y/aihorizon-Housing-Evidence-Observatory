# Housing Evidence Observatory

AI Horizons 2026, Track 2: Housing Production, Rents & Household Flow Observatory — Pittsburgh and Allegheny County.

This repository is a **ground-up build** started 26 September 2026. Pre-event research informed the problem and public sources. Implementation, snapshots, and documentation in this folder were written during the official window and are not a copy of the earlier research prototype.

**Build tools:** Cursor. **Runtime Housing AI:** Cursor SDK (`Agent.prompt`) with a server-selected evidence pack. **Not used at runtime:** Azure OpenAI.

## Problem

A permit is not a completed home. An ACS rent estimate is not a current listing. Household counts are not migration flows. This app connects a housing question to dated public evidence, uncertainty, an AI explanation that can only cite that evidence, and a next check a person can actually do.

## Run locally

Node.js 22+. No database.

```sh
cp .env.example .env.local
# optional: paste CURSOR_API_KEY from https://cursor.com/dashboard/integrations
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Maps, comparisons, investigations, and brief export work without a key. Ask Housing AI needs `CURSOR_API_KEY`; the first reply can take tens of seconds because it starts a local Cursor agent.

## Four tasks, one evidence layer

| Workspace | User | Task in this build |
| --- | --- | --- |
| Find a Place | Residents | Compare two-bedroom ACS rent estimates, save areas, export context that is **not** a live listing. |
| Housing Change | Policymakers | Open a permit investigation (before/after source fields), note, mark reviewed (workflow only), export. |
| Check Evidence | Researchers | See periods, table IDs, MOEs, the 2020 ACS 1-year gap, and the delayed 2025 ACS 1-year release. |
| Housing Needs | Developers / nonprofits | Compare household structure and rent burden, then inspect related permits **without** a shortage score. |

Saved areas and notes stay in this browser. “Reviewed” is not proof the claim is true.

## What this build does not do

Current rental listings, landlord reviews, household origin–destination maps, HUD CHAS, verified citywide completions, causal policy evaluation, cloud daily scheduling, or shared team storage.

## Data

See [DATA.md](DATA.md). Figures are dated public snapshots. Missing values are null, never filled with zero.

## Tests

```sh
npm test
```
