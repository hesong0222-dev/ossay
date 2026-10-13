# License changes in popular GitHub repos, 2025-10-13 → 2026-10-13

How often does a popular repo change what its license file grants? We read the default-branch history of the
license files of 351 popular repos for the last 12 months.

**31 of 351 repos changed what their license file grants.**
11 moved toward copyleft or added restrictions, 6 moved toward permissive, 12 switched between permissive licenses
(mostly MIT → Apache-2.0), 2 changed and changed back.

Files: [`license-changes-2026-10.json`](license-changes-2026-10.json) (every commit, with before/after reading),
[`license-changes-input.txt`](license-changes-input.txt) (the 351 repos). License of this data: CC BY 4.0.

## Method

- **Targets (351):** the 300 most-starred repos (≥ 17,240 stars) in a candidate pool collected on 2026-10-12 from
  github.com/trending (28 languages × daily/weekly/monthly) and from repos created in the previous 14–180 days with
  the most stars, plus the 100 repos of [`ossay-ai-100`](README.md), duplicates removed. Not a random sample:
  it leans to fast-rising and AI repos, and 103 of the 351 were created inside the window.
- **Period:** commits dated 2025-10-13 or later, on each repo's default branch.
- **Files:** every root file named `LICENSE*`, `LICENCE*` or `COPYING*` (`.md`, `.txt`, `.rst` or no extension,
  including `LICENSE-MIT`, `LICENSE_APACHE` etc.), plus `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `COPYING` even if gone today.
- **Reading:** for each commit that touched one of those files (`GET /repos/{repo}/commits?path=…&since=…`) the file
  before and after the commit is read with `ossay`'s license classifier, and the change is labelled
  `class-change`, `wording` (same reading, other text changed), `cosmetic` (only years, copyright lines or whitespace),
  `added`, `removed`.
- **Command:** `ossay ledger data/license-changes-input.txt --since 2025-10-13 --out data/license-changes-2026-10.json`
  (run 2026-10-13; 19 repos hit the API rate limit on the first pass and were re-run with the same command).
- **Manual check:** every `class-change` and `removed`, every `added` that was not plain MIT/Apache-2.0, and the
  `wording` diffs were read by hand. The checks found 8 classifier errors, which were fixed (with tests) before the
  final run; see "Corrections" below.

## Counts (all 351 repos measured)

| | Commits | Repos |
|---|---:|---:|
| touched a license file | 422 | 156 |
| `class-change` | 38 | 29 |
| `wording` | 198 | |
| `cosmetic` (years / copyright holder only) | 55 | |
| `added` | 124 | |
| `removed` | 7 | |

Most `added` are the first commit of a new repo. Most `wording` are third-party notice lists
(`LICENSE-binary`, `LICENSE_GEMS`, `COPYING.md` attribution tables) that change with dependencies.

## Repos whose license reading changed (31)

Dates are commit dates. Readings are heuristic; read the linked commit before relying on them.

### Toward copyleft or added restrictions (11)
| Repo | Date | Before → after | Commit |
|---|---|---|---|
| 666ghj/MiroFish | 2025-12-19 | Apache-2.0 → AGPL-3.0 (file removed, AGPL file added 6 min later) | [abd4656](https://github.com/666ghj/MiroFish/commit/abd4656914555e7271bca4084acfe02875e2e992), [e5dbeb2](https://github.com/666ghj/MiroFish/commit/e5dbeb2) |
| koala73/worldmonitor | 2026-02-19 | MIT → AGPL-3.0 | [be485ad](https://github.com/koala73/worldmonitor/commit/be485ad1c2746d6d074cebaabb49c8911d134311) |
| mksglu/context-mode | 2026-03-03 | MIT → Elastic License 2.0 | [a482980](https://github.com/mksglu/context-mode/commit/a48298080e90f2824dfb4e5c883085ea019fd255) |
| multica-ai/multica | 2026-04-08 | Apache-2.0 → Apache-2.0 with additional conditions | [f4ba27f](https://github.com/multica-ai/multica/commit/f4ba27f2f5ae3cac29a5876330c760f48734fc64) |
| Wei-Shaw/sub2api | 2026-04-19 | MIT → LGPL-3.0 | [23def40](https://github.com/Wei-Shaw/sub2api/commit/23def40bc5415c04ca3a05bb6d67a6ff1e4a3566) |
| debpalash/VoiceStudio | 2026-04-26 · 04-29 · 06-06 | Apache-2.0 → non-commercial / paid commercial → FSL-1.1 → AGPL-3.0 | [b36bb84](https://github.com/debpalash/VoiceStudio/commit/b36bb8495e65fcae36b4bc53061f32335f63c752), [c654cd9](https://github.com/debpalash/VoiceStudio/commit/c654cd9e4a561c44fa154dd80721b75f8d09b3d0), [abae6e2](https://github.com/debpalash/VoiceStudio/commit/abae6e290aa3b3eb281a6f2f1300c1be109335b9) |
| op7418/guizang-ppt-skill | 2026-05-28 | MIT → AGPL-3.0 | [014c572](https://github.com/op7418/guizang-ppt-skill/commit/014c572454065e905477a7432ae331dfc0fe6070) |
| odysseus-dev/odysseus | 2026-06-09 | MIT → AGPL-3.0 | [23f0d64](https://github.com/odysseus-dev/odysseus/commit/23f0d64edb7cb9ee2a6d0a6fddd72e50b726baf6) |
| Alishahryar1/free-claude-code | 2026-09-24 | MIT → AGPL-3.0 | [81cc4e0](https://github.com/Alishahryar1/free-claude-code/commit/81cc4e0d22cce4147f97700c732a2a8f5bd5712f) |
| ranxianglei/billion-context | 2026-09-27 | MIT → MIT plus an attribution term | [42202e0](https://github.com/ranxianglei/billion-context/commit/42202e0) |
| manaflow-ai/cmux | 2026-03-30 · 09-28 | AGPL-3.0 → GPL-3.0 (with a commercial option) → GPL-3.0 plus BUSL-1.1 for listed server directories | [9d9559f](https://github.com/manaflow-ai/cmux/commit/9d9559fb938971ee841d45af760ee200d92e7a08), [c74b646](https://github.com/manaflow-ai/cmux/commit/c74b64665f69f80443d94633b590cf5a8c4f49d6) |

### Toward permissive (6)
| Repo | Date | Before → after | Commit |
|---|---|---|---|
| spacedriveapp/spacedrive | 2026-03-24 · 08-21 | AGPL-3.0 → FSL-1.1 → Apache-2.0 | [53b030c](https://github.com/spacedriveapp/spacedrive/commit/53b030c492e05498dc0f7fd9cb4271a5edd0e449), [bcc1247](https://github.com/spacedriveapp/spacedrive/commit/bcc124765c809e115669e770b918625942621bce) |
| Robbyant/lingbot-map | 2026-04-17 | CC BY-NC 4.0 → Apache-2.0 (one day after the first license) | [ed0aee8](https://github.com/Robbyant/lingbot-map/commit/ed0aee8b71b049cc857582c829ac31ab48660121) |
| thedotmack/claude-mem | 2026-05-08 | AGPL-3.0 → Apache-2.0 | [36b0929](https://github.com/thedotmack/claude-mem/commit/36b0929faef129157723682bafa3ab9e17b0695d) |
| t8y2/dbx | 2026-06-07 | AGPL-3.0 → Apache-2.0 | [a473f4f](https://github.com/t8y2/dbx/commit/a473f4ff8f439436d9dc78de2fbc2d943329d23f) |
| vorssaint/vorssaint-utils | 2026-06-16 | PolyForm Noncommercial → GPL-3.0 | [f2b55b8](https://github.com/vorssaint/vorssaint-utils/commit/f2b55b8fc160c5a34de86297940de8a91af64621) |
| storytold/artcraft | 2026-10-10 | "ArtCraft License (WIP)", fair-source → MIT and Apache-2.0 files | [8abde75](https://github.com/storytold/artcraft/commit/8abde75) |

### Between permissive licenses (12)
| Repo | Date | Before → after | Commit |
|---|---|---|---|
| pbakaus/impeccable | 2026-01-07 | MIT → Apache-2.0 | [8186f2a](https://github.com/pbakaus/impeccable/commit/8186f2a2269c0fd9bfa581c97a8f31ea0eedc176) |
| rtk-ai/rtk | 2026-03-21 | MIT → Apache-2.0 | [4a79e48](https://github.com/rtk-ai/rtk/commit/4a79e48ee5b6f3aec8aa9391f21245a270ae11bf) |
| heygen-com/hyperframes | 2026-04-01 | MIT → Apache-2.0 | [eb94e6c](https://github.com/heygen-com/hyperframes/commit/eb94e6cf770a34dd647a52e83eb90225a2953e61) |
| EvoLinkAI/awesome-gpt-image-2-API-and-Prompts | 2026-04-23 · 05-02 | CC BY 4.0 → Apache-2.0 → CC0-1.0 | [e79a626](https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/commit/e79a62655c228809c872c692702d8add76758d36), [a3a4d34](https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/commit/a3a4d344a00b4f192b5760efe3f88cc8cdfd14ac) |
| Yuan1z0825/nature-skills | 2026-06-18 | MIT → Apache-2.0 | [54eadc6](https://github.com/Yuan1z0825/nature-skills/commit/54eadc65d1c0535e90d792a87ab718d848ccbb7a) |
| Graphify-Labs/graphify | 2026-07-22 | MIT → Apache-2.0 | [ba7f9ea](https://github.com/Graphify-Labs/graphify/commit/ba7f9ea9d8c2c7c7807957010bec34543c20e20a) |
| img2threejs/img2threejs | 2026-07-23 | MIT → Apache-2.0 | [7b1c62c](https://github.com/img2threejs/img2threejs/commit/7b1c62ccf34957ac5d68b7863718af9eab777c7e) |
| anywhere-labs/dsh-desktop | 2026-08-13 | BSD-3-Clause → MIT | [c905c46](https://github.com/anywhere-labs/dsh-desktop/commit/c905c4694e317eff1f529f0fed047c2ce202d11a) |
| deepseek-ai/deepseek-harness | 2026-08-13 | BSD-3-Clause → MIT (same commit as the row above) | [c905c46](https://github.com/deepseek-ai/deepseek-harness/commit/c905c4694e317eff1f529f0fed047c2ce202d11a) |
| JuliusBrussee/caveman | 2026-08-11 · 09-24 | MIT → MIT plus BUSL-1.1 for listed directories → Apache-2.0 for the whole repo | [82864c8](https://github.com/JuliusBrussee/caveman/commit/82864c8f4c9a5eb5551ab0cdd6da52014832e3c5), [921eab8](https://github.com/JuliusBrussee/caveman/commit/921eab8a80df67eae4b6b36fdf17563a42538751) |
| tester-army/e2e | 2026-09-21 | MIT → Apache-2.0 | [ca5e619](https://github.com/tester-army/e2e/commit/ca5e6196b620165dcabc383c1aaf35c44cf22690) |
| eternity4719/HowToLiveBetter | 2026-09-29 | Unlicense → CC BY 4.0 (code: MIT in `LICENSE-CODE`) | [95611f7](https://github.com/eternity4719/HowToLiveBetter/commit/95611f7013ae0338e32880f0f2aeea7b264e7457) |

### Changed and changed back (2)
| Repo | Date | Before → after | Commit |
|---|---|---|---|
| alchaincyf/huashu-design | 2026-04-20 · 05-04 · 05-14 | MIT → custom (Chinese) → personal-use license with paid commercial use → MIT | [1db8719](https://github.com/alchaincyf/huashu-design/commit/1db8719cf0d7d630c7bd179923b5fbd2255167f4), [764031a](https://github.com/alchaincyf/huashu-design/commit/764031ae4fa3379cc27b81c431093a3d5872c846), [74a3224](https://github.com/alchaincyf/huashu-design/commit/74a322464e04094cd312b123357120811b2b86c3) |
| PrimeIntellect-ai/prime-agent | 2026-09-30 | MIT → Apache-2.0 → MIT, 27 minutes apart | [39bc99a](https://github.com/PrimeIntellect-ai/prime-agent/commit/39bc99a91d102c46474c090fdc7ae7cd5037ffcf), [e75f59e](https://github.com/PrimeIntellect-ai/prime-agent/commit/e75f59efc6f74fcb23e45048f0f23b34490571d0) |

### Same reading, but the terms changed (`wording`, read by hand)
Not counted above, because the license family did not change:
spacedriveapp/spacedrive added hosting restrictions to its FSL text ([49353e9](https://github.com/spacedriveapp/spacedrive/commit/49353e9), 2026-03-26);
multica-ai/multica revised its additional conditions 5 times (2026-04-08 to 09-24);
manaflow-ai/cmux added a commercial license option ([142c62c](https://github.com/manaflow-ai/cmux/commit/142c62c), 2026-03-24);
jeecgboot/JeecgBoot removed a clause on competing software from its Apache-2.0 file ([22666ad](https://github.com/jeecgboot/JeecgBoot/commit/22666ad), 2026-01-30);
ankitects/anki put its docs-site folder under CC BY-SA 4.0 ([17357d0](https://github.com/ankitects/anki/commit/17357d0), 2026-08-07);
hashicorp/vagrant changed the BSL licensor to IBM ([bafec23](https://github.com/hashicorp/vagrant/commit/bafec23), 2026-03-11).

### Removed and put back (not counted)
deskflow/deskflow (GPL, 24 minutes), agalwood/Motrix (MIT, 8 days), obra/superpowers (MIT, same day) removed and re-added a license file with the same reading.
OpenHands/OpenHands removed its LICENSE in [cb9138c](https://github.com/OpenHands/OpenHands/commit/cb9138c) (2026-07-27) while the default branch today has an MIT LICENSE added in
[66542e4](https://github.com/OpenHands/OpenHands/commit/66542e4) (2026-04-24); the history is not linear, and the
removed file also said the `enterprise/` directory has its own license.

### A license added to a repo older than the window
byoungd/up (CC BY-NC 4.0 for content, MIT for code, 2026-08-17), liyupi/ai-guide (CC BY-NC-SA 4.0 for content and a
code license, 2026-09-01), NousResearch/hermes-agent ("restore missing MIT license file", 2026-03-07).
bytedance/deer-flow ("chore: init", 2026-01-13) and vxcontrol/pentagi ("repo final state", 2026-03-26) show the
license as added in a commit that looks like rewritten history; tauri-apps/tauri renamed `LICENSE_MIT` to `LICENSE-MIT`.

## Corrections made during this check

Reading the diffs found 8 ways the classifier misread a license file. Each was fixed with a test in
[`test/license.test.mjs`](../test/license.test.mjs) before the final run:

1. GPL text ("allowed only occasionally and noncommercially", "only for noncommercial distribution") was read as a non-commercial license.
2. The Unlicense and OpenSSL/SSLeay notices ("commercial or non-commercial", "commercial and non-commercial use") were read as non-commercial.
3. A file with the project's MIT license followed by third-party Apache/CC0 notices was read by the last license instead of the first (Tencent/WeKnora). Now the license named first wins.
4. GPL-3.0 text, which mentions the AGPL in section 13, was read as AGPL.
5. A license name split across a line break ("Business\nSource License") was missed, so a per-directory BUSL note was not seen.
6. An AGPL notice that mentions non-commercial *model* terms was read as non-commercial.
7. CC BY 4.0 was `custom`; the Unlicense was `custom`.
8. A permissive grant plus an overriding clause ("Notwithstanding any other provision of this License…", "Additional Term — …") was read as plain BSD/MIT. This also corrected 2 rows of `ossay-ai-100` (open-webui/open-webui, ranxianglei/billion-context).

## Limits

- **Default branch only.** Changes on other branches or in release tags are not seen.
- **Root files with license-like names only.** A license that moved into a subfolder (e.g. `docs/LICENSE`) shows as
  `removed`; per-folder `LICENSE` files (e.g. `enterprise/LICENSE`) are not read, only what the root file says about them.
- **Renamed files** to a name that is not in the list above are missed; a rename shows as `removed` + `added`.
- **Rewritten history** (force-push, squashed re-init) hides earlier license text; the commit dates are the committer dates GitHub reports.
- **The license file is not the whole story:** README notices, CLAs, `package.json` license fields and per-file headers are out of scope.
- **Sample:** stars-ranked and trending-heavy, with many young repos; the share (31 of 351) does not describe GitHub as a whole.
- **Heuristic, not legal advice.** The before/after labels come from pattern matching; the commit links are the evidence.
