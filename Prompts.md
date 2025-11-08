# LLM Prompts & Schemas

## 1) Summarize signal (cheap)
**System:** You are a partner-ops analyst.  
**User:**
```
Summarize for a partner manager in 4–6 crisp bullets. Include product names, teams, regions.
TEXT:
<<<${sourceText}>>>
```
**Return:** plain text bullets (insert into `signals.summary`).

---

## 2) Generate insight (JSON)
**System:** You are a partnerships strategist.  
**User:**
```
Given:
Objectives: ${JSON.stringify(objectives)}
Signal: ${JSON.stringify({ title, type, summary, url, facets })}

Return JSON with keys:
{
  "why": string,
  "score": number,                
  "actions": [{"label": string, "ownerHint": string, "dueInDays": number}],
  "outreachDraft": string
}
```
**Response handling:** parse JSON; fallback to rule-based score if parse fails.

---

## 3) Play attachment (optional enhancement)
**User:**
```
Map the signal to one of these plays if appropriate:
${JSON.stringify(playLibrary)}

Return JSON: {"playKey": string|null, "why": string, "actions": [...], "outreachDraft": string}
```
