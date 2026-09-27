# Data inventory

Retrieved independently on **2026-09-26/27** (timestamps are in each snapshot file). Missing or suppressed ACS values are stored as null. ACS annotation sentinels such as `-222222222` are treated as missing, never as real numbers.

## Sources

| Source | What we use | Coverage and limits |
| --- | --- | --- |
| [ACS 5-year 2024](https://data.census.gov/table?tid=ACSDT5Y2024.B25003) via data.census.gov | Allegheny County tracts (394): tenure, household size by tenure, rent by bedrooms, rent burden | Pooled **2020–2024** estimates. Not 2024-only observations and not current asking rents. |
| [ACS 5-year 2019](https://data.census.gov/table?tid=ACSDT5Y2019.B25003) via data.census.gov | Same tables for GEOIDs that still exist | Pooled **2015–2019**. Change is shown only when the 2024 GEOID also exists in 2019. Split/merged tracts (28 in this snapshot) are withheld. This is not an official Census crosswalk. Cartography is a 2020 tract layer, so area screening cannot detect every 2019–2024 boundary change. |
| ACS 1-year, Pittsburgh city (B25064) | Nominal median gross rent 2015–2019 and 2021–2024 | **2020** standard 1-year estimates were not released (blank, not interpolated). **2025** 1-year tables were still delayed as of 26 Sep 2026 ([Census ACS 2026 updates](https://www.census.gov/programs-surveys/acs/news/updates/2026.html)). |
| ACS 5-year 2024 B07003 | Pittsburgh city mobility | Counts **people age 1+** by residence one year before the survey. Not household flows, not net migration, not a tract-to-tract matrix. |
| [WPRDC PLI permits](https://data.wprdc.org/dataset/pli-permits) resource `f4d1177a-f597-4c32-8cbf-7885f56253f6` | Current permit extract plus parcel `0025K00261000000` investigation | City of Pittsburgh only. Permits are not housing units or completions. Commercial occupancy can include apartment buildings. `last_modified` is stored on the snapshot. |
| WPRDC Allegheny County census tracts | Map polygons | 2020 tract vintage used for display. |

The Census **API key endpoint** (`api.census.gov`) redirected to `missing_key.html` during this build. Tables were retrieved from **data.census.gov’s public table API** instead, which returns the same published ACS estimates.

## Formulas

- Two-bedroom rent: `B25031_004E` with published MOE `B25031_004M` (dollars, not unit counts).
- Severe rent burden: `B25070_010E / (B25070_001E − B25070_011E)`. Households whose burden cannot be computed are excluded. Missing cells are not filled with zero.
- ≥30% burden: `(B25070_007E + 008E + 009E + 010E) / (B25070_001E − B25070_011E)`.

## Files in this repo

| File | Role |
| --- | --- |
| `evidence/snapshot.json` | Server-side evidence pack for Housing AI (no map geometry) |
| `evidence/citations.json` | Citation allowlist |
| `public/app-data.json` | Browser snapshot |
| `public/tracts.json` | Tract polygons for the map |
| `scripts/fetch-data.mjs` | Re-run retrieval |

Refresh:

```sh
npm run fetch-data
```

No Census key is required for this method. `CENSUS_API_KEY` remains optional if you later switch the script back to `api.census.gov`.

## Not included

HUD CHAS, live listings, landlord reviews, occupancy certificates, household origin–destination flows, full countywide assessments, or a private monitoring database.
