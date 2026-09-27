# Housing Evidence Observatory

AI Horizons 2026, Track 2: Housing Production, Rents & Household Flow Observatory — Pittsburgh and Allegheny County.

This repository is a **ground-up build** started 26 September 2026. Pre-event research informed the problem and public sources. Implementation, snapshots, and documentation in this folder were written during the official window and are not a copy of the earlier research prototype.

**Build tools:** Cursor. **Runtime Housing AI:** OpenAI Chat Completions (`gpt-4o-mini` by default) with a server-selected evidence pack. **Not used at runtime:** Azure OpenAI, Cursor SDK.

## Problem

A permit is not a completed home. An ACS rent estimate is not a current listing. Household counts are not migration flows. This app connects a housing question to dated public evidence, uncertainty, an AI explanation that can only cite that evidence, and a next check a person can actually do.

## Local setup (teammates)

Node.js 22+. No database. No cloud deploy step — run it on your laptop.

```sh
git clone https://github.com/teddy0-0y/aihorizon-Housing-Evidence-Observatory.git
cd aihorizon-Housing-Evidence-Observatory
npm install
cp .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:5173**.

**You do not need an OpenAI key** to browse maps, compare tracts, search the permit extract, use the watchlist, or export a brief. Those features read the committed snapshots in `evidence/` and `public/`.

**You only need an OpenAI key to use Ask / Housing AI.** Create your own secret at [platform.openai.com/api-keys](https://platform.openai.com/api-keys), paste it into `.env.local` as `OPENAI_API_KEY=sk-...`, save, then restart `npm run dev`. The server still chooses which snapshot fields the model sees. Default model is `gpt-4o-mini` (`OPENAI_MODEL` in `.env.example`).

The real key is **not in GitHub**. Repo files only have an empty `OPENAI_API_KEY=` in `.env.example`. `.env.local` is gitignored — never commit it, and do not reuse someone else’s key.

`CENSUS_API_KEY` is optional and only used if you run `npm run fetch-data` to refresh Census downloads. The committed snapshot is enough for the demo. Restart the development server after changing server modules or `.env.local`.

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

Housing AI checks the local snapshot before answering location/availability searches. It preserves explicit permit, address, neighborhood, and tract matches as partial evidence, but does not treat a text match as verified proximity or a listing. The assistant provides curated external housing/permit links when the snapshot cannot establish availability or distance. These links are research suggestions, not live search results. General questions no longer receive the prepared parcel case automatically. Matching currently uses English phrases and exact normalized record names/IDs; it is not semantic or geographic search. Restart the development server after changing server modules.

```sh
npm test
```

## Permit Explorer search

Search the local permit extract by address, permit ID, parcel number, neighborhood, or work-description keywords. Select a result to inspect its records and prepare an AI question. Results group by parcel where available; this is not verified project identity. Completion is labeled unverified because the extract has no verified completion or occupancy evidence. Empty results provide the broader WPRDC source link, not a substituted sample. Notes are stored separately for each selected group in this browser. The current snapshot contains 25 permits across 2 parcel groups, not a citywide search.

## Personal permit watchlist

Select a Permit Explorer result and choose **Track this property**. Watchlist shows only addresses saved in this browser, with a link back to their records and an option to remove tracking. The badge counts saved properties, not alerts. Tracking does not run refresh jobs, detect changes, or send notifications. Removing tracking leaves permit data and reviewer notes intact.
