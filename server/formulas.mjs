/** Shared ACS parsing and burden formulas. Missing/suppressed values stay null. */

export function num(value) {
  if (value == null || value === "" || value === "." || value === "-") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // ACS annotation sentinels for missing/suppressed estimates and MOEs.
  if ([-222222222, -333333333, -555555555, -666666666, -888888888, -999999999].includes(n)) return null;
  return n;
}

export function parseCensus(json) {
  if (!Array.isArray(json) || json.length < 1) return [];
  const [headers, ...rows] = json;
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function addNullable(values) {
  const nums = values.map(num);
  if (nums.some((v) => v == null)) return null;
  return nums.reduce((a, b) => a + b, 0);
}

/** Rent ≥30% of income among cash-rent households with computable burden. */
export function burden(row) {
  const numerator = addNullable([row.B25070_007E, row.B25070_008E, row.B25070_009E, row.B25070_010E]);
  const total = num(row.B25070_001E);
  const notComputed = num(row.B25070_011E);
  const denominator = total == null || notComputed == null ? null : total - notComputed;
  if (numerator == null || denominator == null || denominator <= 0) {
    return { pct: null, numerator, denominator };
  }
  return { pct: numerator / denominator, numerator, denominator };
}

/** Rent ≥50% of income (B25070_010E) / (B25070_001E − B25070_011E). */
export function severeBurden(row) {
  const numerator = num(row.B25070_010E);
  const total = num(row.B25070_001E);
  const notComputed = num(row.B25070_011E);
  const denominator = total == null || notComputed == null ? null : total - notComputed;
  if (numerator == null || denominator == null || denominator <= 0) {
    return { pct: null, numerator, denominator };
  }
  return { pct: numerator / denominator, numerator, denominator };
}

export function historyComparable(current, previous, relAreaDelta) {
  if (!current || !previous) {
    return { comparable: false, reason: "Missing one of the two ACS 5-year vintages for this GEOID." };
  }
  if (current.geoid !== previous.geoid) {
    return { comparable: false, reason: "GEOID changed between vintages." };
  }
  if (relAreaDelta != null && relAreaDelta > 0.001) {
    return {
      comparable: false,
      reason: `Preliminary cartographic area differs by ${(relAreaDelta * 100).toFixed(2)}% (>0.1%). Change is withheld.`,
    };
  }
  return {
    comparable: true,
    reason: "Same GEOID; preliminary cartographic area within 0.1% (not an official Census crosswalk).",
  };
}
