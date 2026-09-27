import assert from "node:assert/strict";
import test from "node:test";
import { isConfigured, runHousingChat } from "../server/chat.mjs";

test("AI is unconfigured without CURSOR_API_KEY", () => {
  assert.equal(isConfigured({}), false);
  assert.equal(isConfigured({ CURSOR_API_KEY: "   " }), false);
  assert.equal(isConfigured({ CURSOR_API_KEY: "cursor_test" }), true);
});

test("chat refuses to call the agent when no key is set", async () => {
  const result = await runHousingChat({
    question: "What is the rent?",
    ids: { tracts: ["42003020300"] },
    snapshot: { tracts: [], permits: { records: [] }, citations: [] },
    apiKey: "",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "unconfigured");
});
