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

In a first scan of 100 widely used and fast-rising AI repos, **11 needed a closer read before commercial use or hosting**:
4 restrict commercial use or hosting, 5 add conditions or carve-outs to a permissive grant, 2 grant no open-source rights.
9 more are GPL/AGPL (fine, but with obligations). The rest are permissive.
Full table and the caveats: [`data/README.md`](data/README.md).

Licenses also move: in the 12 months to 2026-10-13, **31 of 351 popular repos changed what their license file grants**
(11 toward copyleft or added restrictions, 6 toward permissive). Every commit and the method: [`data/license-changes-2026-10.md`](data/license-changes-2026-10.md).

## Use

```bash
npx github:hesong0222-dev/ossay check owner/repo          # card in the terminal
npx github:hesong0222-dev/ossay check owner/repo --md     # markdown card (paste into an issue or PR)
npx github:hesong0222-dev/ossay check owner/repo --json   # machine readable
npx github:hesong0222-dev/ossay scan repos.txt --out results.json --csv results.csv
npx github:hesong0222-dev/ossay history owner/repo        # license-file commits in the last 12 months, before → after
npx github:hesong0222-dev/ossay ledger repos.txt --since 2025-10-13 --out changes.json
npx github:hesong0222-dev/ossay deps [path] [--json | --md] [--fail-on risk|maintenance] [--all]   # direct dependencies of a project
```

`history` lists every commit on the default branch that touched `LICENSE*`, `LICENCE*` or `COPYING*`, reads the file before and after,
and labels the change: `class-change` (the reading changed), `wording`, `cosmetic` (only years / copyright lines), `added`, `removed`, `moved`.

`deps` reads the **direct** dependencies in `package.json` (dependencies and devDependencies), `requirements.txt`, `pyproject.toml` (`[project].dependencies`) `go.mod` (`require`, without `// indirect`) and `Cargo.toml` (`[dependencies]`, without path/git entries).
It finds each GitHub repo from the registry (npm `repository`, PyPI `project_urls`, crates.io `repository`, Go module paths on `github.com`; anything else stays `unresolved`, never guessed),
runs the same card, and compares the **registry's license field with the repo's license file**: `REGISTRY_LICENSE_MISMATCH` is a risk when the file is more restrictive than what npm/PyPI says.
For monorepo packages it reads the package folder's own license file. Results are split in two: **License** (no license, non-commercial, source-available, proprietary, mixed, modified-permissive, custom, registry mismatch) and **Maintenance** (archived, stale, quiet, no releases), which says nothing about your right to use the code. License comes first; Maintenance shows the count and the first 5, `--all` lists every one. `--md` prints a table for a PR; `--fail-on risk` exits 1 only on a License risk, `--fail-on maintenance` also on any Maintenance note (for CI).

Run on three popular apps on 2026-10-13 (manifests at the default branch):

```text
$ ossay deps open-webui        # open-webui/open-webui pyproject.toml
ossay deps · open-webui  (pyproject.toml; 90 direct dependencies)
  License: 0 need a read · Maintenance: 20 notes
  other notes 11 · no flags 74 · unresolved 5

  Notes
  · starlette-compress: no license file in Zaczero/pkgs; "0BSD" is declared only in registry metadata

  Maintenance (20 dependencies; not about license rights)
  · fake-useragent               fake-useragent/fake-useragent    ARCHIVED
  · docx2txt                     ankushshah89/python-docx2txt     STALE
  · ftfy                         rspeer/python-ftfy               STALE
  · itsdangerous                 pallets/itsdangerous             STALE
  · python-pptx                  scanny/python-pptx               STALE, NO_RELEASES
  … and 15 more (--all)

  Unresolved (not checked): beautifulsoup4, openpyxl, pydub, python-socketio, xlrd
```

- `louislam/uptime-kuma` package.json, 155 deps: License 0 need a read · Maintenance 48 notes · other notes 40 · no flags 113 · unresolved 2. Four repos ship no license file (the license is only in npm metadata); `favico.js` has MIT and GPL files side by side (dual licensed).
- `gohugoio/hugo` go.mod, 80 deps: License 0 need a read · Maintenance 20 notes · other notes 5 · no flags 65 · unresolved 10 (`golang.org/x/*` and other non-GitHub module paths). Go has no registry license field, so no mismatch check.
- No registry-vs-repo license conflict in these three; every flagged license was read by hand. Full results: [`data/deps-2026-10/`](data/deps-2026-10/).

Or clone and run `node bin/ossay.mjs ...`. (An npm package is not published yet.)

Needs Node 18+. Auth uses `GITHUB_TOKEN` / `GH_TOKEN`, or your `gh` login if present (60 requests/hour without a token).

**Used by** [ossay-guard](https://github.com/hesong0222-dev/ossay-guard), a Claude Code plugin that runs `ossay deps` on the packages your agent is about to install and asks you first when the license is restricted.

## What it reads

| Signal | Source |
|---|---|
| License class, commercial use, hosting as a service | SPDX id + the license **text** (including repo-root `LICENSE.*` when GitHub's endpoint misses it) |
| Archived, stale, young, no releases | repo metadata, releases |
| Stars vs forks, issues, watchers | repo metadata (a note, never a verdict) |

License classes: `permissive`, `weak-copyleft`, `strong-copyleft`, `network-copyleft` (AGPL), `source-available`, `modified-permissive`, `non-commercial`, `ai-model-license`, `proprietary`, `none`, `custom`, `unknown`.

## Limits (read this)

- **Heuristic, not legal advice.** Confidence is printed per result. `custom` and `low` mean: read the license yourself.
- Looks at the default branch's license file only (a dependency's pinned version may be older). `deps` covers direct dependencies only: transitive dependencies (lockfiles) and CLA terms are out of scope in v0. The registry license is the latest published version's. Per-folder licenses are detected only when one license file says so.
- Pattern list covers the common source-available and model licenses; new licenses will show up as `custom`. Add a case and a test in [`test/`](test/license.test.mjs).
- A snapshot of public data. Licenses change; re-run.
- **GitHub API budget.** Measured with `OSSAY_DEBUG=1`: one repo costs 3 REST calls (repo, license, latest release; 5 when GitHub reports no license file), so without a token (60 requests/hour) about 20 repos per hour, and a 155-dependency `deps` run is roughly 450 calls. Responses are cached for 24 hours in `~/.cache/ossay` (`--no-cache` to skip): a repeat `check` or `deps` makes 0 requests (measured: 9 of 9 from cache on a 3-dependency project), and after 24 hours entries are revalidated with `ETag`, which GitHub documents as not counting against the primary rate limit when it answers 304 (measured: 9 of 9 answered 304). When the limit is hit, ossay prints how many minutes until it resets; calls already made stay cached, so re-running continues. Set `GITHUB_TOKEN` (or log in with `gh`) for 5,000 requests/hour.

## Roadmap

Built: direct-dependency scan (`ossay deps`: npm, PyPI, Go) with a registry-vs-repo license check.

Not built yet:

- Transitive dependencies (lockfiles: `package-lock.json`, `poetry.lock`, `go.sum`).
- A GitHub Action that comments the card on PRs that add a new dependency.
- Reproducible token-cost measurement for agent plugins, published as open data.

## License

Code: Apache-2.0. Data in `data/`: CC BY 4.0.
