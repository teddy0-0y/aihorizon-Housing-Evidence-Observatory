import { Agent, CursorAgentError } from "@cursor/sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAssistantText, selectEvidence } from "./evidence.mjs";

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "evidence");

export function isConfigured(env = process.env) {
  return Boolean(env.CURSOR_API_KEY && env.CURSOR_API_KEY.trim());
}

export function buildPrompt(question, pack) {
  return `You are Housing AI for a public-data observatory. You are not a coding assistant for this turn.

Rules:
- Use ONLY the JSON evidence pack below. If a number is not in the pack, say it is not in the selected evidence.
- Do not edit files, do not run tools, do not browse the web, do not invent listings, completions, occupancy, or causal policy effects.
- Household counts are households. B07003 counts are people age 1+, not household flows.
- Permits are records, not completed homes. ACS rents are period estimates, not current asking rents.
- Cite sources only with these IDs: acs5-2024, acs5-2019, acs1-gap, b25031, b25070, b25003, b25009, b07003, wprdc-pli, census-2025-delay.

Reply in exactly these markdown headings:
## Answer
## Evidence
## Limits
## Next step

User question:
${question}

Evidence pack:
${JSON.stringify(pack)}
`;
}

export async function runHousingChat({ question, ids, snapshot, apiKey }) {
  if (!apiKey) {
    return {
      ok: false,
      code: "unconfigured",
      message: "CURSOR_API_KEY is not set. Maps and evidence still work. Add a key from https://cursor.com/dashboard/integrations to .env.local and restart.",
    };
  }
  const q = String(question || "").trim();
  if (!q) {
    return { ok: false, code: "bad_request", message: "Ask a question about the selected evidence." };
  }
  const pack = selectEvidence(snapshot, ids || {});
  const prompt = buildPrompt(q, pack);
  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: "composer-2.5" },
      tools: [],
      local: { cwd: evidenceDir, settingSources: [] },
    });
    if (result.status === "error") {
      return {
        ok: false,
        code: "run_failed",
        message: "The Cursor agent started but failed. The evidence view is unchanged; try again or read the source records directly.",
        runId: result.id || null,
      };
    }
    const text = result.result || result.text || "";
    const parsed = parseAssistantText(typeof text === "string" ? text : JSON.stringify(text));
    return {
      ok: true,
      code: "ok",
      latencyNote: "This reply used the Cursor SDK local agent, not a chat-completions API.",
      ...parsed,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        code: "startup_failed",
        message: `Cursor agent did not start: ${err.message}`,
        retryable: Boolean(err.isRetryable),
      };
    }
    return { ok: false, code: "error", message: err.message || "Unknown Housing AI error." };
  }
}
