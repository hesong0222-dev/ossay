#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseRepo, fetchRepo } from '../src/github.mjs';
import { classify } from '../src/license.mjs';
import { buildFlags } from '../src/flags.mjs';
import { buildCard, renderText, renderMarkdown } from '../src/card.mjs';

const HELP = `ossay — assay an open-source repo before you adopt it

Usage:
  ossay check <owner/repo | github url> [--json | --md]
  ossay scan <file> [--out results.json] [--csv results.csv]   (file: one repo per line, or a JSON array of "owner/repo")

Auth: uses GITHUB_TOKEN / GH_TOKEN, or \`gh auth token\` if available (60 req/h without).
Heuristic output from public GitHub data. Not legal advice.`;

export async function check(input) {
  const full = parseRepo(input);
  const data = await fetchRepo(full);
  const lic = classify(data.repo.license ? data.repo.license.spdx_id : null, data.licenseText);
  const flags = buildFlags({ repo: data.repo, lic, latestRelease: data.latestRelease });
  return buildCard({ repo: data.repo, lic, flags, latestRelease: data.latestRelease });
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
    const raw = readFileSync(arg, 'utf8').trim();
    const list = raw.startsWith('[') ? JSON.parse(raw).map((x) => (typeof x === 'string' ? x : x.full)) : raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const out = [], queue = [...list];
    const worker = async () => {
      while (queue.length) {
        const r = queue.shift();
        try { out.push(await check(r)); } catch (e) { out.push({ repo: r, error: e.message }); console.error(`! ${r}: ${e.message}`); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
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
  console.log(HELP);
  process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
