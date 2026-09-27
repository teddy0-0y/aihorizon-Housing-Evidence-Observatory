import assert from "node:assert/strict";
import test from "node:test";
import { parseAssistantText, selectEvidence, validateCitations } from "../server/evidence.mjs";

const snapshot = {
  generatedAt: "2026-09-26T00:00:00.000Z",
  coverage: { county: "Allegheny" },
  gaps: [],
  citations: [{ id: "b25070", label: "burden" }],
  city: { name: "Pittsburgh", period: "2020–2024", households: 1, medianGrossRent: 1, medianGrossRentMoe: 1 },
  mobility: { unit: "people" },
  annual: [],
  tracts: [
    {
      geoid: "42003020300",
      tract: "203",
      name: "Census Tract 203",
      period: "2020–2024 ACS 5-year",
      rent2br: 2000,
      history: { comparable: false, reason: "area screen failed", previous: null },
    },
    {
      geoid: "42003060500",
      tract: "605",
      name: "Census Tract 605",
      rent2br: 1000,
      history: { comparable: true, reason: "ok", previous: { period: "2015–2019 ACS 5-year", rent2br: 900, households: 10 } },
    },
  ],
  permits: { records: [{ permit_id: "BDA-2024-00084", work_description: "five dwellings" }] },
  investigation: { id: "inv-1", title: "parcel", related: [] },
};

test("selectEvidence uses server snapshot IDs, not browser-supplied numbers", () => {
  const pack = selectEvidence(snapshot, { tracts: ["42003020300"], permits: ["BDA-2024-00084"] });
  assert.equal(pack.tracts[0].rent2br, 2000);
  assert.equal(pack.permits[0].permit_id, "BDA-2024-00084");
  assert.equal(pack.tracts[0].history.comparable, false);
});

test("withheld history does not include previous estimates", () => {
  const pack = selectEvidence(snapshot, { tracts: ["42003020300"] });
  assert.equal(pack.tracts[0].history.previous, null);
});

test("citation allowlist drops unknown IDs", () => {
  const { valid, dropped } = validateCitations(["b25070", "secret-file", "wprdc-pli"]);
  assert.deepEqual(valid, ["b25070", "wprdc-pli"]);
  assert.deepEqual(dropped, ["secret-file"]);
});

test("parser keeps section heads and strips bad citations", () => {
  const parsed = parseAssistantText(`## Answer\nHello\n## Evidence\nSee b25070 and not-a-source\n## Limits\nACS\n## Next step\nCheck the permit`);
  assert.match(parsed.answer, /Hello/);
  assert.deepEqual(parsed.citations, ["b25070"]);
});
