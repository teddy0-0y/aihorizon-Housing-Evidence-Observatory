import assert from "node:assert/strict";
import test from "node:test";
import { formatAssistantText } from "../src/assistant-format.mjs";

test("renders comparison labels, bullets, and separate paragraphs", () => {
  const html = formatAssistantText("Lower rent does not mean less pressure.\n\n- **Tract 203:** $2,761\n- **Tract 605:** $1,583\n\nEstimates have uncertainty.");
  assert.match(html, /<strong>Tract 203:<\/strong>/);
  assert.match(html, /<ul><li>.*Tract 203.*<\/li><li>.*Tract 605.*<\/li><\/ul>/);
  assert.equal((html.match(/<p>/g) || []).length, 2);
  assert.ok(!html.includes("**"));
});

test("keeps numbered next steps and continuation text readable", () => {
  assert.equal(formatAssistantText("1. Check the permit\n   and occupancy record.\n2. Record the findings"), "<ol><li>Check the permit<br>and occupancy record.</li><li>Record the findings</li></ol>");
});

test("model HTML, event handlers, and unsafe links stay inert", () => {
  const html = formatAssistantText('**<img src=x onerror=alert(1)>**\n\n<script>alert(1)</script>\n[click](javascript:alert(1))');
  assert.ok(!/<(?:img|script|a)\b/.test(html));
  assert.match(html, /<strong>&lt;img/);
  assert.match(html, /&lt;script&gt;/);
});

test("preserves plain values, nulls, CRLF paragraphs, and non-list hyphens", () => {
  assert.equal(formatAssistantText(null), "");
  assert.equal(formatAssistantText("2020–2024 estimates\r\n\r\nTwo-bedroom rent & MOE"), "<p>2020–2024 estimates</p>\n<p>Two-bedroom rent &amp; MOE</p>");
});
