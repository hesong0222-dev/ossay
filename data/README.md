# ossay-ai-100 (snapshot 2026-10-12)

100 widely used or fast-rising AI / developer-tool repos on GitHub, scanned with `ossay scan`.
Selection: 50 from all-time top stars in AI-related topics (awesome-lists, courses and roadmaps excluded)
and 50 from github.com/trending (daily/weekly/monthly) plus repos created in the last 60 days with the most stars.
The selection is not random and not exhaustive.

Files: `ossay-ai-100.json` (full cards), `ossay-ai-100.csv` (one row per repo), `repos-input.txt` (the list).
License of this data: CC BY 4.0 (see `LICENSE` in this folder). Code in the repo root: Apache-2.0.

## What is in it
Facts GitHub exposes plus a heuristic reading of the license file: SPDX id, license class, commercial-use and
hosting-as-a-service reading, stars, forks, issues, watchers, created/pushed dates, latest release, and flags.
No judgement about maintainers or intent.

## Read this before quoting it
- The license reading is **heuristic**, from the SPDX id GitHub reports and the text of the license file. Confidence is stated per row. It is **not legal advice**.
- A snapshot: licenses and activity change. Re-run `ossay scan` for current data.
- `NO_RELEASES`, `VERY_YOUNG`, `LOW_FORK_RATIO` are notes, not accusations. Stars are not adoption.
- Mixed and per-file licenses are the hard case. Several rows below were wrong in earlier versions of the classifier and were corrected after reading the full license text. If you find another, please open an issue.

## Headline
**9 of 100** repos need a closer read before commercial use or hosting:

### Restrict commercial use or hosting (4)
| Repo | Stars | Reading |
|---|---:|---|
| n8n-io/n8n | 207,087 | Sustainable Use License — Internal business use allowed; offering it as a hosted service to others is not. |
| Significant-Gravitas/AutoGPT | 187,528 | mixed — Part of the repo is permissive, part is source-available. Check which folder you depend on. |
| datawhalechina/hello-agents | 82,724 | non-commercial terms — Text restricts commercial use. |
| mksglu/context-mode | 26,902 | Elastic License — Providing it to third parties as a managed service is prohibited. |

### Add conditions or carve-outs to a permissive grant (3)
| Repo | Stars | Reading |
|---|---:|---|
| langgenius/dify | 158,238 | modified permissive — Permissive base with extra conditions (often multi-tenant hosting or branding). Read the added terms. |
| lobehub/lobehub | 83,166 | modified permissive — Permissive base with extra conditions (often multi-tenant hosting or branding). Read the added terms. |
| bilawalsidhu/gods-eye-view | 52,831 | modified-permissive — Likely carve-outs for third-party material; check which files they cover. |

### Grant no open-source rights (2)
| Repo | Stars | Reading |
|---|---:|---|
| anthropics/claude-code | 150,349 | proprietary — Source is visible but use is governed by the vendor's own terms. |
| cursor/plugins | 11,001 | none — No license file found: default copyright applies, no permission is granted. |

## All license classes
| Class | Repos |
|---|---:|
| permissive | 82 |
| network-copyleft | 5 |
| strong-copyleft | 4 |
| modified-permissive | 3 |
| source-available | 2 |
| mixed | 1 |
| proprietary | 1 |
| non-commercial | 1 |
| none | 1 |

## Permissive-looking, but the text is not an exact match (7)
GitHub's matcher could not match these files exactly (extra notices, multiple copyright holders, added terms). Usually benign, but read them: f/prompts.chat, open-webui/open-webui, rasbt/LLMs-from-scratch, pytorch/pytorch, chrislgarry/Apollo-11, Tencent/WeKnora, ranxianglei/billion-context.
