import assert from "node:assert/strict";
import test from "node:test";
import { burden, severeBurden, num, historyComparable } from "../server/formulas.mjs";

test("num treats ACS missing MOE sentinels as null", () => {
  assert.equal(num(-222222222), null);
  assert.equal(num("-888888888"), null);
});

test("burden does not treat missing cells as zero", () => {
  const missing = burden({ B25070_007E: null, B25070_008E: "1", B25070_009E: "1", B25070_010E: "1", B25070_001E: "10", B25070_011E: "1" });
  assert.equal(missing.pct, null);
  const ok = burden({ B25070_007E: "1", B25070_008E: "1", B25070_009E: "1", B25070_010E: "2", B25070_001E: "12", B25070_011E: "2" });
  assert.equal(ok.numerator, 5);
  assert.equal(ok.denominator, 10);
  assert.equal(ok.pct, 0.5);
});

test("severe burden uses published denominator", () => {
  const s = severeBurden({ B25070_010E: "4", B25070_001E: "20", B25070_011E: "4" });
  assert.equal(s.denominator, 16);
  assert.equal(s.pct, 0.25);
});

test("history is withheld when area changes more than 0.1%", () => {
  const withheld = historyComparable({ geoid: "1" }, { geoid: "1" }, 0.02);
  assert.equal(withheld.comparable, false);
  const ok = historyComparable({ geoid: "1" }, { geoid: "1" }, 0.0001);
  assert.equal(ok.comparable, true);
});
