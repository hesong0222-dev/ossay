<p align="center"><img src="docs/logo.svg" alt="ossay" width="420"></p>

<p align="center"><b>Assay an open-source repo before you adopt it.</b><br>
License reality, hosting rights and activity signals in one card. Zero dependencies.</p>

Stars tell you what is popular, not what you are allowed to do with it.
`ossay` reads the license file (not just the badge) and tells you in one screen whether you can use, host or resell a repo, and whether anything looks off.

```text
$ ossay check n8n-io/n8n

ossay · n8n-io/n8n
  Fair-code workflow automation platform with native AI capabilities. ...

  License      Sustainable Use License  [source-available]  (medium confidence)
  Commercial   conditional      Hosting as a service   restricted
  Note         Internal business use allowed; offering it as a hosted service to others is not.
  Evidence     License text matches "Sustainable Use License"

  Traction     ★ 207,048 · forks 61,094 · open issues 1,164 · watchers 1,179
  Activity     pushed today · created 2019-06-22
  Release      stable (today)

  ⚠ SOURCE_AVAILABLE       Source-available, not open source (Sustainable Use License): hosting/resale is restricted.
```

## Why

GitHub shows `NOASSERTION` for licenses it cannot match, and many popular AI repos use custom or modified terms:
source-available licenses, "Apache 2.0 with additional conditions", per-folder licenses, non-commercial clauses, or a visible repo with all rights reserved.

In a first scan of 100 widely used and fast-rising AI repos, **9 needed a closer read before commercial use or hosting**:
4 restrict commercial use or hosting, 3 add conditions or carve-outs to a permissive grant, 2 grant no open-source rights.
9 more are GPL/AGPL (fine, but with obligations). The rest are permissive.
Full table and the caveats: [`data/README.md`](data/README.md).

## Use

```bash
npx github:hesong0222-dev/ossay check owner/repo          # card in the terminal
npx github:hesong0222-dev/ossay check owner/repo --md     # markdown card (paste into an issue or PR)
npx github:hesong0222-dev/ossay check owner/repo --json   # machine readable
npx github:hesong0222-dev/ossay scan repos.txt --out results.json --csv results.csv
```

Or clone and run `node bin/ossay.mjs ...`. (An npm package is not published yet.)

Needs Node 18+. Auth uses `GITHUB_TOKEN` / `GH_TOKEN`, or your `gh` login if present (60 requests/hour without a token).

## What it reads

| Signal | Source |
|---|---|
| License class, commercial use, hosting as a service | SPDX id + the license **text** (including repo-root `LICENSE.*` when GitHub's endpoint misses it) |
| Archived, stale, young, no releases | repo metadata, releases |
| Stars vs forks, issues, watchers | repo metadata (a note, never a verdict) |

License classes: `permissive`, `weak-copyleft`, `strong-copyleft`, `network-copyleft` (AGPL), `source-available`, `modified-permissive`, `non-commercial`, `ai-model-license`, `proprietary`, `none`, `custom`, `unknown`.

## Limits (read this)

- **Heuristic, not legal advice.** Confidence is printed per result. `custom` and `low` mean: read the license yourself.
- Looks at the default branch's license file only. Dependencies and CLA terms are out of scope in v0. Per-folder licenses are detected only when one license file says so.
- Pattern list covers the common source-available and model licenses; new licenses will show up as `custom`. Add a case and a test in [`test/`](test/license.test.mjs).
- A snapshot of public data. Licenses change; re-run.

## Roadmap (not built yet)

- Dependency-tree scan (`package.json`, `requirements.txt`) for the same card per dependency.
- A GitHub Action that comments the card on PRs that add a new dependency.
- Reproducible token-cost measurement for agent plugins, published as open data.

## License

Code: Apache-2.0. Data in `data/`: CC BY 4.0.
