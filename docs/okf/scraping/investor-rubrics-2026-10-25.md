---
type: Reference
title: "Investor rubric coverage — October 25, 2026"
description: "Researched and saved Jim Simons (#1309), Ken Griffin (#1311), Ray Dalio (#1315) and Peter Thiel (#1317), locally and in production, through authenticated PUT /api/people/:id/wiki."
tags: [scraping]
---

# Investor rubric coverage — October 25, 2026

Researched and saved Jim Simons (#1309), Ken Griffin (#1311), Ray Dalio (#1315) and Peter Thiel (#1317), locally and in production, through authenticated `PUT /api/people/:id/wiki`. Each compiled wiki was checked after saving. Existing earnings, contributions, matters, property, trips and scored wealth axes were preserved. Each profile now has three documented axes.

| Person | Education | Wealth | Position | Public standing |
| --- | --- | --- | --- | --- |
| Jim Simons | 5 | 4 retained | 5 added | Unscored |
| Ken Griffin | 3 | 4 retained | 5 added | Unscored |
| Ray Dalio | 4 | 4 retained | 5 added | Unscored |
| Peter Thiel | 4 | Unscored | 5 added | 1 added |

Position uses the displayed rubric's top role at a major institution anchor. These are scope scores, not measures of skill, ethics or social benefit. Simons and Dalio's historical roles are expressly identified, including their retirement/transition dates; their former leadership is not represented as current executive authority. Thiel's evidence includes PayPal CEO and Palantir chairman roles. Griffin's source documents Citadel's scale as well as his CEO role; client capital is not recorded as personal wealth.

Education scores are unchanged, with primary institutional citations and higher confidence. No honorary degree is treated as an earned research doctorate.

## Opened evidence

- [Simons Foundation: Remembering the Life and Careers of Jim Simons](https://www.simonsfoundation.org/news/remembering-the-life-and-careers-of-jim-simons/): completed MIT/Berkeley degrees, founding Renaissance and retiring as CEO in 2010.
- [Citadel: Kenneth C. Griffin](https://www.citadel.com/who-we-are/leadership/kenneth-c-griffin/): executive authority, institutional scale and Harvard AB with honors, 1989.
- [Bridgewater: Our Founder](https://www.bridgewater.com/our-founder): MBA in 1973 and historical CEO/CIO/chairmanship; transition dates 2017, 2020 and 2021.
- [Founders Fund: Peter Thiel](https://foundersfund.com/team/peter-thiel/): PayPal CEO and Palantir chairman.
- [Stanford Law: Peter Thiel’s Quest for One-of-a-Kind Ideas](https://law.stanford.edu/press/peter-thiels-quest-for-one-of-a-kind-ideas/): JD, class of 1992. The separate Stanford Lawyer Q&A returned 403 and was not used.
- [Navigator/Global Strategy Group: June 2026 toplines](https://navigatorresearch.org/wp-content/uploads/2026/06/Navigator-Toplines-06.08.2026.pdf): page 6/45 reports Thiel at 8% favorable, 23% unfavorable, 22% don't know and 46% never heard, with rounded percentages. Page 1 gives June 4–8 field dates, a 1,000-interview base with oversamples (1,383 total interviews), and ±3.1 percentage-point base margin of error. Overall favorability below 20% maps to standing 1 under the displayed rubric, with medium confidence. This is one dated favorability survey, not job approval, and includes unfamiliar respondents.
- [Navigator report linking that national poll](https://navigatorresearch.org/americans-are-concerned-by-ai-but-still-use-it/): the August report also discusses battleground polling; its battleground methodology is not assigned to the June national poll. Its reported net figure is not used because rounded favorability percentages do not reproduce it exactly.

## Remaining gaps

No current functional-health assessment or comprehensive personal legal review was established. Corporate enforcement actions are not personal findings. No official-statistics or peer-reviewed assessment sufficient for causal social/economic scoring was established; philanthropy totals and biographies do not meet that standard.

Targeted standing searches found self-selected website polls and a public-relations reputation index for Griffin/Dalio, neither of which was converted into approval/favorability. The YouGov Thiel tracker opened, but its rendered text exposed no dated numeric observation, so the original Navigator toplines were used instead. No eligible dated survey was verified for Simons. Thiel still has no new dated personal wealth assessment; no fund assets or multi-year profits were converted into annual income.

## Replay and verification

The research catalog is `scripts/people/data/investor-rubrics-2026-10-25.json`. Its entries contain additions, not replacement profiles: merge axes into the current overview, preserve all existing research, append the review note, then save through the wiki API. Refresh generated income axes when later earnings arrive; these researched overviews no longer regenerate automatically.

Ignored receipts under `.scrape/investor-rubrics-2026-10-25/` contain environment-specific before/after profiles, merged patches, compiled wikis and verification results. The first verification compared serialized object key order and stopped after the local Simons save; semantic comparison verified that save and the remaining updates. An unrelated concurrent local holdings edit briefly caused HTTP 500; it resolved before the remaining local saves. No unrelated source files were changed for this task.

These runtime content changes required no application deployment.
