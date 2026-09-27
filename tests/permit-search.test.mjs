import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { groupPermits, searchPermits, completionAssessment } from "../src/permit-search.mjs";
import { relevantEvidenceIds } from "../server/question-scope.mjs";
import { selectEvidence } from "../server/evidence.mjs";

const snapshot = JSON.parse(fs.readFileSync(new URL("../evidence/snapshot.json", import.meta.url)));
const records = snapshot.permits.records;

test("a permit ID locates its parcel and retains related records without counting homes", () => {
  const results = searchPermits(records, "BDA-2024-00084");
  assert.equal(results.length, 1);
  assert.equal(results[0].matches.length, 1);
  assert.ok(results[0].records.length > 1);
  assert.equal(results[0].parcel, "0025K00261000000");
});

test("address search handles case and Street abbreviation", () => {
  assert.equal(searchPermits(records, "319 27th Street")[0].parcel, "0025K00261000000");
});

test("second address retrieves a different parcel, not the sample", () => {
  const result = searchPermits(records, "3129 Liberty Avenue");
  assert.equal(result.length, 1);
  assert.equal(result[0].parcel, "0025H00007000000");
  assert.ok(result[0].records.every((r) => r.parcel_num === result[0].parcel));
});

test("unknown addresses have no fallback case; browse all is explicit", () => {
  assert.deepEqual(searchPermits(records, "999999 Unknown Street"), []);
  assert.equal(searchPermits(records, "").length, groupPermits(records).length);
});

test("issued and completed permit statuses cannot verify the whole development", () => {
  assert.equal(completionAssessment([{ status: "Issued" }]).label, "Completion not verified");
  assert.equal(completionAssessment([{ status: "Completed" }]).label, "Completion not verified");
});

test("AI selection for the second address does not inject the five-house investigation", () => {
  const group = searchPermits(records, "3129 Liberty")[0];
  const ids = relevantEvidenceIds("Is construction complete for these selected permits?", { permits: group.records.map((r) => r.permit_id), includeInvestigation: false }, snapshot);
  const pack = selectEvidence(snapshot, ids);
  assert.equal(pack.investigation, null);
  assert.ok(pack.permits.length > 0);
  assert.ok(pack.permits.every((r) => r.parcel_num === group.parcel));
});
