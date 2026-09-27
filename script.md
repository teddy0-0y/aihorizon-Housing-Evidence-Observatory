# Housing Evidence Observatory — Problem-led Demo Script

**Target: 4:45; final video under 5 minutes.** English narration, with recording directions below. Start with the problem, explain the approach and key features on one slide, then demonstrate how each tab helps a person answer a housing question.

**展示原則：** 每個 tab 都說明「使用者的問題 → 功能如何幫忙 → 下一個行動」，不要只列頁面元素。共用功能完整展示一次；另外三個 workspace 用不同使用者的問題快速帶過，不再重複每個共用頁面。所有 tab 的對照放在文末。

**主線：** Housing data → evidence worth investigating → a human next step.

## Preparation — not spoken

- Run `npm run dev`, open http://127.0.0.1:5173, and prepare **Start here**. Put your OpenAI key in `.env.local` and restart first. No cloud deployment or scheduler is required.
- Use the editable opening slide in [demo/Housing-Evidence-Observatory.pptx](demo/Housing-Evidence-Observatory.pptx), or its PNG for recording. The slide includes both presenters and Carnegie Mellon University.
- Prepare tracts **203** and **605**. Save area stores this selected pair, not an unlimited list of individual areas.
- Have permit **BDA-2024-00084** ready to paste. Use an untracked example if possible; if already saved, say “This property is already on our watchlist.”
- Record a genuine manual AI scan and its actual findings. Unchanged evidence reuses prior analysis, so a rehearsed scan may finish quickly. Do not present cached results as a fresh model call. Allow five minutes between scan requests.
- AI scanning and chatbot Q&A are separate actions. Show one scan and one chatbot exchange. A scan can make several API calls; do not claim the whole demo uses only one AI request.
- If necessary, shorten recorded waiting time with an **“AI processing wait shortened”** caption. Never fabricate a result or stage an artificial scanning animation.
- Choose a genuine finding for the final chatbot example after inspecting its source evidence. Do not promise a particular finding before the model returns it.
- Keep keys and administrator tokens out of the recording. Use the real public repository URL in the closing caption.

## 0:00–0:15 | Team and track

**Screen:** Opening slide. Optionally show the presenters in a small camera overlay.

**Say:**

“Hi, I’m Susana Peng, with my teammate Yen-Chu Chen, from Carnegie Mellon University. We built Housing Evidence Observatory for Track 2 at AI Horizons 2026.”

## 0:15–1:00 | One slide: problem → approach → key features

**投影片用途：** 先讓評審理解為什麼需要這個產品，再讓後面的操作成為解決方法的證據。畫面文字保持短句，不放整段旁白。

**Slide title:**

> Housing data is available. What deserves attention?

**Left — THE PROBLEM**

- Evidence is scattered across sources.
- Dates and definitions do not always align.
- Users must decide what to investigate next.

**Right — OUR APPROACH**

> Connect the evidence. Surface research leads. Support the next check.

**Bottom — THREE CORE FEATURES**

| Understand conditions | Find what needs attention | Explain and follow up |
| --- | --- | --- |
| Maps, comparisons & permit records | Manually triggered AI scan with source evidence | Evidence-based chatbot, saved areas & watchlist |

**Small footer:** Pittsburgh & Allegheny County · Public-data research prototype

**Say:**

“The problem is not just finding housing data. It is knowing what that data supports—and what deserves a closer look.

“Census estimates and permit records come from different sources and periods. A lower rent estimate does not necessarily mean less housing pressure, and an issued permit does not mean a completed home.

“Our approach connects those records, uses AI to surface research leads, and helps users decide what to verify next.

“Three features support that workflow: area and permit exploration, AI scanning, and an evidence-based research assistant. Let’s see how they work together.”

**Transition:** Switch directly from the slide to **Start here**. Do not read the feature names again on the website.

## 1:00–1:10 | Start here — choose the question

**Screen/action:** Show **Start here** and its four audience cards. Select **Find a Place**.

**Say:**

“Different users start with different questions. We organize the same evidence into four workspaces. Let’s begin with a resident researching rental conditions.”

## 1:10–2:20 | Explore and compare — what do the records support?

Visit these tabs in order. Scroll to the evidence while speaking; do not narrate every click.

| Tab and time | User problem / purpose | Screen action | Say |
| --- | --- | --- | --- |
| **Budget & Areas** · 1:10–1:23 | Users need context before interpreting a rent figure. | Show the research question, then **Pittsburgh over time** and the visible data gaps. | “A single rent figure gives limited context. This overview shows the longer trend and missing periods, so residents can see what the evidence covers.” |
| **Explore Areas** · 1:23–1:40 | A citywide figure can hide differences between areas and home sizes. | Select **203**. Show its area card and **Rent by home size**; click **Save area** with 203 and 605 selected as the pair. | “Citywide figures can hide local differences. We can inspect a small Census area, compare rents by home size, and save the selected areas for further research. These are historical estimates.” |
| **Compare Areas** · 1:40–1:58 | Lower rent alone does not establish lower housing pressure. | Show **203** and **605**, rent and severe-burden estimates, then the historical-comparison note. Point to **Download comparison**. | “Does lower rent mean less pressure? Side-by-side rent and burden estimates help us investigate that question. We show uncertainty and supported historical comparisons, and users can download the values.” |
| **Permit Explorer** · 1:58–2:20 | A permit can be mistaken for housing already delivered. | Search **BDA-2024-00084**, select **319 27TH ST**, and show the work description and completion assessment. Click **Track this property**. | “Development records need interpretation too. This permit describes five houses, but does not verify five completed homes. We preserve the source description and identify what still needs checking. I’ll track this property for follow-up.” |

**Operator notes:** Budget & Areas does not calculate a personal budget. Permit Explorer searches the included extract, not a live citywide inventory. Use the clearly labeled cards for numbers; do not make unsupported claims from map colors or boundaries.

## 2:20–2:55 | AI Findings — help users notice what to investigate

**Screen/action:** Open **AI Findings → Run AI scan**. Show the real running state, then completed results. Open one genuine finding’s source records. Point to **Uncertainty**, **Next check**, and the findings badge/banner. Do not send a chatbot question yet.

**Say before the scan:**

“Exploring records helps when we already know what to ask. But users may not know which records deserve attention.

“Here, we manually trigger an AI scan of the stored evidence.”

**Say after real findings appear:**

“The scan surfaces research leads with source records, uncertainty, and a next check. New findings appear in the review panel and badge, so users can decide what to investigate.”

**Optional finding-specific sentence:** Replace part of the preceding line with “This lead flags [the actual issue] for verification.” Only say what the displayed finding and its evidence support.

**If there are no findings:** Say “This scan returned no research leads. That does not mean there are no housing problems; the evidence and coverage are limited.” Do not substitute an invented finding.

**If the scan fails:** Say “The scan did not complete. The app shows the failure and retains any previous results.” Do not describe previous findings as new output from this attempt.

**Recording note:** This is a manually triggered review, not a running daily service or an email/push notification system. AI leads are unverified. The scope shown on screen matters: dated ACS profiles and a limited permit extract.

## 2:55–3:25 | Follow through — keep and verify the evidence

| Tab and time | User problem / purpose | Screen action | Say |
| --- | --- | --- | --- |
| **Watchlist** · 2:55–3:05 | A record of interest is easy to lose between research steps. | Show the address just tracked and **View permit records**. | “Finding a record is only the start. The Watchlist keeps the property available so we can return to its evidence and continue checking.” |
| **Saved Areas** · 3:05–3:14 | Users need to revisit an area comparison. | Show the saved pair and **Compare areas**. | “Saved Areas keeps our comparison ready to revisit. Both saved areas and tracked properties stay in this browser.” |
| **Sources** · 3:14–3:25 | Users need to judge whether a claim is supported. | Show original source links and data-gap notes. | “To judge a claim, users need its origin and limits. Sources makes those links and missing data visible for independent checking.” |

## 3:25–3:50 | Other workspaces — same evidence, different questions

**展示重點：** 切換三個 workspace，各展示一個能代表其目的的頁面。其他 tab 已在前面的共用流程展示，不需要再逐一重播。這一段是用途差異，不是另一輪功能清單。

| Workspace | Screen action | Say |
| --- | --- | --- |
| **Understand Housing Change** | Switch workspace, then show the selected **Permit Explorer** record and reviewer-note field. | “Policymakers can investigate recorded development and document what still needs verification.” |
| **Check the Evidence** | Switch workspace, open **Trends & Compare**, and point to the historical-comparison limitation. | “Researchers can check uncertainty and whether historical comparisons are supported.” |
| **Explore Housing Needs** | Switch workspace, open **Explore Needs**, and show household structure and severe rent burden. | “Developers and nonprofits can use household and burden estimates to frame further local research. These are starting points, not a measured housing shortage.” |

## 3:50–4:25 | Chatbot — turn a finding into a clearer next step

**Screen/action:** Return to **AI Findings** and the real finding shown earlier. Click **Ask AI about this**, then send the prepared question. Show **Answer → Evidence → Limits → Next step**. One chatbot exchange only.

**Say before sending:**

“Scanning helps us notice a possible issue. The chatbot helps us understand it. I can ask what this finding actually establishes and what evidence we still need.”

**Use the question prepared by the app, or paste:**

> Explain this finding in simple language. What do its source records establish, what remains uncertain, and what should a person verify next?

**Say after the genuine response, only if supported:**

“The assistant explains the source evidence, separates interpretation from established facts, and suggests a next check. The person still makes the judgment.”

**Fallback if the scan returned no findings:** Open **Find a Place → Compare Areas**, confirm **203** and **605**, and use the comparison question below instead. Say “We can still ask the assistant to explain the comparison.” Do not imply a finding was generated.

> Compare census tract 203 with census tract 605. Does lower rent mean less housing pressure? Explain the rent and severe rent-burden estimates, mention the period and uncertainty, and suggest one next check. Do not assume statistical significance.

**Rehearsal reference only:** Tract 203: 2BR rent $2,761, published rent MOE ±$233, severe burden about 9.7%. Tract 605: $1,583, MOE ±$294, severe burden about 31.7%. Period: pooled 2020–2024 ACS. Verify against the displayed values. These figures do not establish causality or statistical significance.

## 4:25–4:45 | Close — return to the problem

**Screen/action:** Close the assistant. Return to **Start here** or the opening slide. Add the actual public repository URL as a caption.

**Say:**

“Our goal is to help people move from scattered housing data to a clearer question and a verifiable next step.

“This prototype combines exploration, AI discovery, and explanation. Next, we would test its usefulness with a local housing organization.

“We used Cursor and Codex during development, and OpenAI powers the AI features. Thank you.”

**Operator note:** Confirm the team’s actual tool disclosure. The proposed pilot is a next step, not an existing partnership.

## Tab coverage — reference, not spoken

Every distinct tab/function is covered in the main walkthrough. Other workspaces reuse these views with audience-specific names.

| Shared function | Residents | Policymakers | Researchers | Developers / nonprofits |
| --- | --- | --- | --- | --- |
| Entry | Start here | Start here | Start here | Start here |
| Context | Budget & Areas | Overview | Research Desk | Area Profiles |
| Area evidence | Explore Areas | Area Trends | Area Evidence | Explore Needs |
| Comparison | Compare Areas | Trends & Compare | Trends & Compare | Compare Areas |
| Permit evidence | Permit Explorer | Permit Explorer | Project Evidence | Proposed Supply |
| AI review | AI Findings | AI Findings | AI Findings | AI Findings |
| Property follow-up | Watchlist | Watchlist | Watchlist | Watchlist |
| Saved comparison | Saved Areas | — | — | Saved Research Areas |
| Verification | Sources | Sources | Sources | Sources |

## Timing and accuracy — not spoken

- Rehearse with a timer. The time boxes are an editing target, not a guaranteed duration. Reserve the final 15 seconds before the five-minute cap for transitions.
- If over time, shorten the three secondary-workspace visits and repeated scrolling first. Protect the problem statement, genuine scan, one evidence inspection, and chatbot exchange.
- Display each shared feature once in detail. Do not repeat the same comparison or Watchlist explanation for all four audiences.
- Keep processing cuts labeled. If a response fails, show the failure or use a clearly identified successful take; never narrate an anticipated response as though it appeared.
- Scans are manual. Status polling does not start another analysis. No daily schedule, email, SMS, or OS push is implemented.
- Watchlist bookmarks do not expand the shared scan scope. Permit Explorer has its committed 25-record extract across two parcel groups; optional source refresh may add records for those same parcels to the scan. Use the scan count actually displayed.
- ACS estimates are historical. Permit records do not independently prove completion or occupancy. No current housing availability, verified citywide completions, or household origin-to-destination flows are provided.
- AI output is an interpretation requiring verification; source-ID validation does not prove every sentence correct.
