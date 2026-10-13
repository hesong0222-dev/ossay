#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseRepo, fetchRepo, folderLicense, rootLicenseTexts } from '../src/github.mjs';
import { classify } from '../src/license.mjs';
import { buildFlags } from '../src/flags.mjs';
import { buildCard, renderText, renderMarkdown } from '../src/card.mjs';
import { history, renderHistory } from '../src/history.mjs';
import { readManifests, resolve, depResult, licenseMismatch, summarize, renderDeps, renderDepsMarkdown } from '../src/deps.mjs';

const HELP = `ossay — assay an open-source repo before you adopt it

Usage:
  ossay check <owner/repo | github url> [--json | --md]
  ossay scan <file> [--out results.json] [--csv results.csv]   (file: one repo per line, or a JSON array of "owner/repo")
  ossay history <owner/repo> [--since YYYY-MM-DD] [--json]   (commits that touched LICENSE/COPYING on the default branch; default: last 12 months)
  ossay ledger <file> [--since YYYY-MM-DD] [--out changes.json]   (history for every repo in the file)
  ossay deps [path] [--json | --md] [--fail-on risk|maintenance] [--all]   (direct deps in package.json, requirements.txt, pyproject.toml, go.mod)

Auth: uses GITHUB_TOKEN / GH_TOKEN, or \`gh auth token\` if available (60 req/h without).
Heuristic output from public GitHub data. Not legal advice.`;

// dir: a monorepo subfolder whose own license file, when present, replaces the root one.
export async function check(input, dir) {
  const full = parseRepo(input);
  const data = await fetchRepo(full);
  const sub = dir ? await folderLicense(full, dir) : null;
  const lic = sub ? classify(null, sub.text) : classify(data.repo.license ? data.repo.license.spdx_id : null, data.licenseText);
  if (sub) lic.evidence.unshift(`Read ${sub.path} (package folder), not the repo root.`);
  const flags = buildFlags({ repo: data.repo, lic, latestRelease: data.latestRelease });
  return buildCard({ repo: data.repo, lic, flags, latestRelease: data.latestRelease });
}

function readList(path) {
  const raw = readFileSync(path, 'utf8').trim();
  return raw.startsWith('[') ? JSON.parse(raw).map((x) => (typeof x === 'string' ? x : x.full)) : raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function pool(list, n, fn) {
  const queue = [...list];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

function csvEscape(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

async function main() {
  const [cmd, arg, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  if (!cmd || cmd === '-h' || cmd === '--help') return console.log(HELP);
  if (cmd === 'check' && arg) {
    const c = await check(arg);
    console.log(rest.includes('--json') ? JSON.stringify(c, null, 2) : rest.includes('--md') ? renderMarkdown(c) : renderText(c));
    return;
  }
  if (cmd === 'scan' && arg) {
    const list = readList(arg);
    const out = [];
    await pool(list, 4, async (r) => {
      try { out.push(await check(r)); } catch (e) { out.push({ repo: r, error: e.message }); console.error(`! ${r}: ${e.message}`); }
    });
    out.sort((a, b) => (b.metrics?.stars ?? -1) - (a.metrics?.stars ?? -1));
    const jsonPath = opt('--out') || 'ossay-results.json';
    writeFileSync(jsonPath, JSON.stringify(out, null, 1));
    const csvPath = opt('--csv');
    if (csvPath) {
      const head = ['repo', 'stars', 'forks', 'license_spdx', 'license_class', 'commercial_use', 'hosting_as_service', 'confidence', 'archived', 'pushed', 'latest_release', 'flags'];
      const rows = out.filter((c) => !c.error).map((c) => [c.repo, c.metrics.stars, c.metrics.forks, c.license.spdx || c.license.label || '', c.license.class, c.license.commercial_use, c.license.hosting_as_service, c.license.confidence, c.metrics.archived, c.metrics.pushed, c.metrics.latest_release?.tag || '', c.flags.map((f) => f.id).join(';')]);
      writeFileSync(csvPath, [head, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n');
    }
    console.log(`scanned ${out.filter((c) => !c.error).length}/${list.length} → ${jsonPath}${csvPath ? ` , ${csvPath}` : ''}`);
    return;
  }
  if (cmd === 'deps') {
    const dir = arg && !arg.startsWith('--') ? arg : '.';
    const flagsArg = arg && arg.startsWith('--') ? [arg, ...rest] : rest;
    const { manifests, deps } = readManifests(dir);
    const cards = new Map();
    const results = [];
    await pool(deps, 2, async (d) => {
      let res;
      try { res = await resolve(d); } catch (e) { res = { repo: null, registry_license: null, reason: e.message }; }
      let card = null;
      if (res.repo) {
        const k = `${res.repo}/${res.directory || ''}`;
        if (!cards.has(k)) cards.set(k, check(res.repo, res.directory).catch((e) => ({ error: e.message })));
        card = await cards.get(k);
      }
      // Before reporting a mismatch, read the repo's other root license files (dual licensing).
      let others = [];
      if (card && !card.error && !res.directory && licenseMismatch(res.registry_license, card.license.class)?.level === 'risk') {
        others = (await rootLicenseTexts(res.repo).catch(() => [])).map((t) => classify(null, t).class);
      }
      results.push(depResult(d, res, card, others));
    });
    results.sort((a, b) => a.name.localeCompare(b.name));
    const out = { path: dir, manifests, summary: summarize(results), deps: results };
    console.log(flagsArg.includes('--json') ? JSON.stringify(out, null, 2) : flagsArg.includes('--md') ? renderDepsMarkdown(out, flagsArg.includes('--all')) : renderDeps(out, flagsArg.includes('--all')));
    const i = flagsArg.indexOf('--fail-on');
    const on = i >= 0 && flagsArg[i + 1];
    if ((on === 'risk' && out.summary.risk) || (on === 'maintenance' && (out.summary.risk || out.summary.maintenance))) process.exitCode = 1;
    return;
  }
  const since = opt('--since') || new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  if (cmd === 'history' && arg) {
    const h = await history(parseRepo(arg), since);
    console.log(rest.includes('--json') ? JSON.stringify(h, null, 2) : renderHistory(h));
    return;
  }
  if (cmd === 'ledger' && arg) {
    const list = [...new Set(readList(arg).map(parseRepo))];
    const results = [];
    await pool(list, 3, async (r) => {
      try { results.push(await history(r, since)); } catch (e) { results.push({ repo: r, error: e.message }); console.error(`! ${r}: ${e.message}`); }
    });
    results.sort((a, b) => a.repo.localeCompare(b.repo));
    const outPath = opt('--out') || 'ossay-ledger.json';
    writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), since, repos: list.length, results }, null, 1));
    const changes = results.flatMap((r) => r.changes || []);
    const count = (k) => changes.filter((c) => c.kind === k).length;
    console.log(`${results.filter((r) => !r.error).length}/${list.length} repos · ${['class-change', 'wording', 'cosmetic', 'added', 'removed', 'moved'].map((k) => `${count(k)} ${k}`).join(', ')} → ${outPath}`);
    return;
  }
  console.log(HELP);
  process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
