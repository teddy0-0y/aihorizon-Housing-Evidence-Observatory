# Housing Evidence Observatory — Problem-led Demo Script

**Target: 4:45; final video under 5 minutes.** English narration, with recording directions below. Start with the problem, explain the approach and key features on one slide, then demonstrate how each tab helps a person answer a housing question.

**展示原則：** 每個 tab 都說明「使用者的問題 → 功能如何幫忙 → 下一個行動」，不要只列頁面元素。四類使用者各有一段明確示範，說出他們的問題、使用的功能與下一步。共用功能完整展示一次，AI scanning 和 chatbot 放在四組示範後，說明它們如何支援所有人。所有 tab 的對照放在文末。

**主線：** 四類使用者、四個問題：居民理解租屋成本 → 政策制定者查住宅開發進度 → 研究者與倡議者驗證比較 → 開發商與非營利組織探索需求。最後用共用 AI scanning 和 chatbot 串起「發現線索 → 理解證據 → 下一步查證」。

**怎麼讀這份稿：** 只念 **Narration** 下的英文段落；**操作提示**、備用說法和文末參考都不念。每段最後一句會帶到下一個畫面，換 tab 時不需要另外說「Next, this is the… tab」。時間包含操作與轉場，是剪輯目標；AI 等待時間另依下方規則處理。

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

## 0:00–0:15 | Opening — introduce the team

**操作提示｜開場投影片：** 保持同一張 slide，接著直接講下一段，不用重新介紹標題。

**Narration**

Hi, I’m Susana Peng, with my teammate Yen-Chu Chen, from Carnegie Mellon University. We built Housing Evidence Observatory for Track 2 at AI Horizons 2026.

## 0:15–0:50 | Problem → approach → three features

**操作提示｜同一張 slide：** 隨著旁白依序指向 Problem、Approach 和三個 feature。講到最後一句時切到 app 的 **Start here**。

**Narration**

Housing data is available, but making sense of it takes work. Census estimates and permit records have different dates and definitions. Lower rent may still come with greater housing pressure, and an issued permit does not mean a finished home.

Our approach combines area and permit exploration, AI scanning for research leads, and an assistant that explains the evidence. We designed four workspaces because different people need to ask different questions.

## 0:50–1:10 | Start here — introduce all four audiences

**操作提示｜Start here：** 四張 audience cards 都要入鏡。隨旁白依序指向 Residents、Policymakers、Researchers & advocates、Developers & nonprofits；不要先切走。最後才選 **Find a Place**。

**Narration**

Residents want to understand rental costs. Policymakers need to investigate housing change. Researchers and advocates need to check the evidence behind claims. And developers and nonprofits need to explore housing needs. Let’s show how each group uses the app, starting with residents.

## 1:10–1:45 | Residents — understand rental costs and pressure

**操作提示｜Find a Place：** 先展示 **Budget & Areas** 的城市趨勢，再開 **Explore Areas**，選 203，帶到 **Rent by home size**。最後開 **Compare Areas**，展示 203 與 605 的 rent、severe rent burden、誤差資訊；在 Explore Areas 點 **Save area**，用 **Saved Areas** 展示配對確實儲存。不要逐項念 tab 名稱。

**Narration**

For residents, the question is: which areas should I research further? Budget & Areas gives the citywide context, and Explore Areas lets us examine historical rents by home size.

Comparing two areas adds another dimension: rent burden. A lower rent figure alone does not establish less pressure. Residents can save the comparison and return to it as they research current options. These estimates provide context; they are not live listings.

## 1:45–2:15 | Policymakers — check recorded development progress

**操作提示｜Understand Housing Change：** 先讓 workspace 名稱與 Overview 的研究問題入鏡，再開 **Permit Explorer**。搜尋 **BDA-2024-00084**，選 **319 27TH ST**，展示工作描述、completion assessment 與 reviewer-note 欄位。點 **Track this property**，切 **Watchlist** 展示地址與 **View permit records**。

**Narration**

For policymakers, the question shifts from rental conditions to housing delivery: what progress do the records actually establish?

In Understand Housing Change, this permit describes five houses, but does not verify five completed homes. A reviewer can inspect the records, document what still needs checking, and track the property in the Watchlist. That keeps follow-up tied to the evidence.

**備註，不念：** 如果已追蹤，就直接展示 Watchlist，不必重新加入。Permit Explorer 搜尋有限的內建 extract，不是即時全市清單；不要暗示這個 permit 能解釋前面兩區的租金差異。Reviewer notes、Watchlist 和 Saved Areas 存在此瀏覽器，不是跨團隊共用工作紀錄。

## 2:15–2:40 | Researchers & advocates — test a housing claim

**操作提示｜Check the Evidence：** 展示 **Research Desk** 的研究問題，再開 **Trends & Compare**，指向誤差資訊、歷史比較限制和 **Download comparison**。接著切 **Sources** 展示原始資料連結，不需要真的下載或離開 app。

**Narration**

Those records also raise a question for researchers and advocates: how strong is the evidence behind a claim?

Check the Evidence supports side-by-side comparisons, shows uncertainty and historical-comparison limits, and lets users download the values. Sources links back to the original datasets, so a finding can be checked before it informs a report or advocacy work.

## 2:40–3:05 | Developers & nonprofits — frame a needs investigation

**操作提示｜Explore Housing Needs：** 展示 **Area Profiles** 的研究問題，再開 **Explore Needs**，帶到 household structure 和 severe rent burden。短暫展示 **Compare Areas** 或已儲存的 **Saved Research Areas**，讓觀眾看到可以延續區域研究；提到 proposed supply 時切 **Proposed Supply**。

**Narration**

Developers and nonprofits have another question: where should we investigate unmet housing needs?

Explore Housing Needs brings household structure and rent burden into view. Users can compare areas, save a research pair, and inspect proposed supply through permit records. These features help frame further local research; they do not measure a housing shortage or tell us exactly what to build.

## 3:05–3:40 | Shared AI scanning — help all four groups notice research leads

**操作提示｜AI Findings：** 點 **Run AI scan**，展示真實 scanning 狀態。完成後選一個實際 finding，展示 source records、uncertainty 與 next check；指向新 findings 的 badge 或提示。此時先不要送 chatbot 問題。

**Narration — while starting the scan**

Across all four workspaces, users may not know which records deserve attention. Our shared AI scan reviews the stored evidence for research leads. In a future deployment, we plan to run scans on a schedule. For this demo, each click starts a single scan.

**Narration — after genuine findings appear**

Each lead includes source records, uncertainty, and a next check. Findings appear in the review panel and badge, giving all four groups a starting point for investigation.

**錄影前準備，不念：** 選定一個真實 finding，檢查其來源，最後 chatbot 段會回到同一個 finding。可以用 “Here, it flags [actual issue] for verification.” 取代上段其中一句；不要增加一整段而超時。

**備用說法，僅在對應情況使用：**

- **No findings:** “This scan returned no research leads. The evidence and coverage are limited, so that does not mean there are no housing problems. We can still follow up on the records we explored.”
- **Scan failed:** “This scan did not complete. The app shows the failure and retains any previous results. We can still follow up on the records we explored.”
- **Cached analysis:** “The evidence has not changed since the earlier scan, so the app is reusing that analysis.” 不要把快取說成剛完成的新模型分析。

**備註，不念：** 這是手動觸發、在 app 內提示 findings 的流程。沒有每日排程或 email／手機推播。若剪掉等待時間，加上 **AI processing wait shortened** 字幕。

## 3:40–4:20 | Shared chatbot — understand a lead and choose the next check

**操作提示｜回到 AI Findings：** 找到前面同一個真實 finding，點 **Ask AI about this**。送出下方問題，展示實際回答的 **Answer → Evidence → Limits → Next step**。只示範一次對話。

**Narration — before sending**

The AI Assistant is also available in every workspace. Let’s open the lead from our scan and ask what its records establish, what remains uncertain, and what we should verify next. Scanning helps users notice a question; the conversation helps them explore it.

**Question to send — 不必逐字念出**

> Explain this finding in simple language. What do its source records establish, what remains uncertain, and what should a person verify next?

**Narration — after the actual response, if supported**

Here, the response connects its explanation to the source evidence, describes the limits, and suggests a next check. That helps the user move forward while keeping the final judgment with the person reviewing the evidence.

**若沒有可用 finding：** 開 **Find a Place → Compare Areas**，確認 **203** 和 **605**，再開 assistant。將送出前整段旁白替換成：

Across these questions, people still need help interpreting what they find. Let’s return to our area comparison and ask the assistant whether lower rent means less housing pressure, and what we should check next.

**Fallback question — 不必逐字念出**

> Compare census tract 203 with census tract 605. Does lower rent mean less housing pressure? Explain the rent and severe rent-burden estimates, mention the period and uncertainty, and suggest one next check. Do not assume statistical significance.

**備註，不念：** 回答出現後才講結果，並確認上述描述符合實際內容。若 chatbot 失敗，不念成功旁白；改說 “The assistant could not complete this response. The source records remain available for us to inspect directly.” 接著進結尾。

**排練參考，不念：** Tract 203：2BR rent $2,761，rent MOE ±$233，severe burden 約 9.7%；Tract 605：$1,583，MOE ±$294，severe burden 約 31.7%。期間為 pooled 2020–2024 ACS；以畫面數字為準。這些數值不建立因果關係或統計顯著性。

## 4:20–4:45 | Close — four audiences, one evidence workflow

**操作提示｜資料來源 slide：** 關閉 assistant，切到 [Data Sources PNG](demo/Housing-Evidence-Data-Sources.png)。保持 slide 到結尾，不必逐項念表格名稱。畫面加上實際公開 repo URL。

**Narration**

Four audiences, four starting questions, connected through one evidence workflow. Built on public Census data, Pittsburgh permit records, and tract boundaries, Housing Evidence Observatory helps people understand what the evidence supports and decide what to verify next.

We used Cursor and Codex during development, and OpenAI powers the AI features. Thank you.

**備註，不念：** 確認工具揭露符合團隊實際使用情況。資料來源在 slide 上供評審查看；OpenAI 是分析工具，不是住宅資料來源。

## Tab coverage — reference, not spoken

Every distinct tab/function is covered in the main walkthrough. Each audience gets a dedicated demonstration; shared views have audience-specific names.

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
- If over time, shorten repeated scrolling and tab transitions first. Keep all four audience demonstrations: each must retain its user question, a relevant feature, and the next step it supports. Also protect the genuine scan and one chatbot exchange.
- Display each shared feature once in detail. Do not repeat the same comparison or Watchlist explanation for all four audiences.
- Keep processing cuts labeled. If a response fails, show the failure or use a clearly identified successful take; never narrate an anticipated response as though it appeared.
- Scans are manual. Status polling does not start another analysis. No daily schedule, email, SMS, or OS push is implemented.
- Watchlist bookmarks do not expand the shared scan scope. Permit Explorer has its committed 25-record extract across two parcel groups; optional source refresh may add records for those same parcels to the scan. Use the scan count actually displayed.
- ACS estimates are historical. Permit records do not independently prove completion or occupancy. No current housing availability, verified citywide completions, or household origin-to-destination flows are provided.
- AI output is an interpretation requiring verification; source-ID validation does not prove every sentence correct.
