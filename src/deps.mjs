// Direct dependencies of a project folder → GitHub repo → ossay card.
// The registry's license field is compared with the reading of the repo's license file.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (dir, f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null);
// PEP 508: the name is everything before extras, version, markers or a URL.
const pyName = (s) => s.trim().split(/[\s\[<>=!~;@(]/)[0];

export function parsePackageJson(text) {
  const p = JSON.parse(text);
  return ['dependencies', 'devDependencies'].flatMap((type) => Object.entries(p[type] || {}).map(([name, spec]) => ({ ecosystem: 'npm', type: type === 'dependencies' ? 'prod' : 'dev', name, spec })));
}

export function parseRequirements(text) {
  return text.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '').trim())
    .filter((l) => l && !l.startsWith('-') && !/:\/\//.test(l))
    .map((l) => ({ ecosystem: 'pypi', type: 'prod', name: pyName(l), spec: l }));
}

// [project].dependencies only (PEP 621). Optional and tool-specific groups are not read.
export function parsePyproject(text) {
  const section = text.split(/^\[/m).find((s) => /^project\]/.test(s));
  const m = section && section.match(/^dependencies\s*=\s*\[/m);
  if (!m) return [];
  // Read quoted strings up to the first unquoted "]" (extras like "uvicorn[standard]" contain brackets).
  const specs = [];
  for (const t of section.slice(m.index + m[0].length).matchAll(/"([^"]*)"|'([^']*)'|#[^\n]*|\]/g)) {
    if (t[0] === ']') break;
    if (!t[0].startsWith('#')) specs.push(t[1] ?? t[2]);
  }
  return specs.map((spec) => ({ ecosystem: 'pypi', type: 'prod', name: pyName(spec), spec }));
}

// `require` lines and blocks; `// indirect` entries are transitive and skipped.
export function parseGoMod(text) {
  const lines = [];
  for (const b of text.matchAll(/^require\s*\(([\s\S]*?)^\)/gm)) lines.push(...b[1].split('\n'));
  for (const s of text.matchAll(/^require\s+([^(\s].*)$/gm)) lines.push(s[1]);
  return lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !/\/\/\s*indirect/.test(l))
    .map((l) => { const [name, spec] = l.split(/\s+/); return { ecosystem: 'go', type: 'prod', name, spec }; });
}

export function readManifests(dir) {
  const found = [];
  const deps = [];
  const use = (file, parse) => { const t = read(dir, file); if (t != null) { found.push(file); deps.push(...parse(t)); } };
  use('package.json', parsePackageJson);
  use('requirements.txt', parseRequirements);
  use('pyproject.toml', parsePyproject);
  use('go.mod', parseGoMod);
  const seen = new Set();
  return { manifests: found, deps: deps.filter((d) => { const k = `${d.ecosystem}:${d.name.toLowerCase()}`; return seen.has(k) ? false : seen.add(k); }) };
}

// owner/repo from a github.com URL or npm shorthand; null for anything else (no guessing).
export function githubRepo(url) {
  if (!url) return null;
  const s = url.trim();
  const short = s.match(/^(?:github:)?([\w.-]+)\/([\w.-]+)$/);
  if (short) return `${short[1]}/${short[2].replace(/\.git$/, '')}`;
  const m = s.match(/^(?:git\+)?(?:https?|git|ssh):\/\/(?:[^@/]+@)?(?:www\.)?github\.com[/:]([\w.-]+)\/([\w.-]+)/i) || s.match(/^git@github\.com:([\w.-]+)\/([\w.-]+)/i);
  if (!m || /^(sponsors|orgs|apps|marketplace)$/i.test(m[1])) return null;
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ossay' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

const PYPI_KEYS = /^(source|source code|repository|code|github|homepage|home)$/i;

// → { repo, registry_license, directory? } — repo is null when the registry gives no GitHub link.
export async function resolve(dep) {
  if (dep.ecosystem === 'npm') {
    if (/^(file|link|workspace|portal):/.test(dep.spec)) return { repo: null, registry_license: null, reason: 'local package' };
    const name = dep.spec.startsWith('npm:') ? dep.spec.slice(4).replace(/(.)@[^@]*$/, '$1') : dep.name;
    const meta = await getJson(`https://registry.npmjs.org/${name.replace('/', '%2f')}/latest`);
    if (!meta) return { repo: null, registry_license: null, reason: 'not on npm' };
    const r = meta.repository;
    const lic = typeof meta.license === 'string' ? meta.license : meta.license?.type || (Array.isArray(meta.licenses) ? meta.licenses.map((l) => l.type || l).join(' OR ') : null);
    return { repo: githubRepo(typeof r === 'string' ? r : r?.url), registry_license: lic || null, directory: r?.directory || null };
  }
  if (dep.ecosystem === 'pypi') {
    const meta = await getJson(`https://pypi.org/pypi/${encodeURIComponent(dep.name)}/json`);
    if (!meta) return { repo: null, registry_license: null, reason: 'not on PyPI' };
    const i = meta.info;
    const urls = Object.entries(i.project_urls || {});
    const repo = [...urls.filter(([k]) => PYPI_KEYS.test(k)), ...urls, ['home_page', i.home_page]].map(([, u]) => githubRepo(u)).find(Boolean) || null;
    const classifier = (i.classifiers || []).filter((c) => c.startsWith('License ::')).map((c) => c.split(' :: ').pop()).join(' OR ');
    // `license` is sometimes the full license text; keep only short identifiers.
    const lic = i.license_expression || (i.license && i.license.length <= 80 ? i.license : null) || classifier || null;
    // A link into a subfolder (".../tree/main/starlette-compress") names the package folder of a monorepo.
    const sub = urls.map(([, u]) => githubRepo(u) === repo && String(u).match(/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/([^?#]+)/)).find(Boolean);
    return { repo, registry_license: lic, directory: sub ? sub[1].replace(/\/$/, '') : null };
  }
  if (dep.ecosystem === 'go') {
    const m = dep.name.match(/^github\.com\/([\w.-]+)\/([\w.-]+)/);
    return { repo: m ? `${m[1]}/${m[2]}` : null, registry_license: null, reason: m ? null : 'module path is not on github.com' };
  }
  return { repo: null, registry_license: null };
}

// Class of a registry license string, in ossay's vocabulary; null when it says nothing comparable.
export function registryClass(lic) {
  if (!lic || /SEE LICEN[SC]E IN/i.test(lic)) return null;
  // Nested SPDX expressions like "MPL-2.0 AND (Apache-2.0 OR MIT)" are not compared.
  if (/\(/.test(lic) && /\sAND\s/i.test(lic) && /\sOR\s/i.test(lic)) return null;
  const parts = lic.replace(/[()]/g, ' ').split(/\s+OR\s+/i).map((p) => p.trim()).filter(Boolean);
  const one = (p) => {
    if (/^UNLICENSED$|Proprietary/i.test(p)) return 'proprietary';
    if (/Elastic|SSPL|Server Side|BUSL|Business Source|Commons Clause|PolyForm|FSL|Functional Source|Sustainable Use/i.test(p)) return 'source-available';
    if (/-NC|non-?commercial/i.test(p)) return 'non-commercial';
    if (/AGPL|Affero/i.test(p)) return 'network-copyleft';
    if (/LGPL|Lesser|MPL|Mozilla|EPL|Eclipse|CDDL/i.test(p)) return 'weak-copyleft';
    if (/GPL|General Public/i.test(p)) return 'strong-copyleft';
    if (/MIT|Apache|BSD|ISC|Unlicense|CC0|Zlib|BSL-1\.0|Boost|Python|PSF|WTFPL|BlueOak|0BSD|Public Domain|CC-BY-4\.0|Artistic/i.test(p)) return 'permissive';
    return null;
  };
  // "A AND B": both apply, so the more restrictive one counts.
  const cls = parts.map((p) => {
    const all = p.split(/\s+AND\s+/i).map(one);
    return all.includes(null) ? null : all.sort((a, b) => RANK[b] - RANK[a])[0];
  });
  if (cls.includes(null)) return null;
  // Dual licensing: you may pick the most permissive option.
  return cls.sort((a, b) => RANK[a] - RANK[b])[0];
}

const RANK = { permissive: 0, 'weak-copyleft': 1, 'strong-copyleft': 2, 'network-copyleft': 3, 'modified-permissive': 3, 'ai-model-license': 4, mixed: 4, 'source-available': 5, 'non-commercial': 6, proprietary: 6, none: 6 };

// Registry says one thing, the repo's license file another. 'risk' when the repo is more restrictive.
export function licenseMismatch(registryLicense, repoClass) {
  const reg = registryClass(registryLicense);
  if (!reg || !(repoClass in RANK) || reg === repoClass) return null;
  return { registry: registryLicense, registry_class: reg, repo_class: repoClass, level: RANK[repoClass] > RANK[reg] ? 'risk' : 'note' };
}

// otherClasses: readings of the repo's other root license files (dual licensing such as MIT-LICENSE.txt + GPL-LICENSE.txt).
export function depResult(dep, res, card, otherClasses = []) {
  const out = { ...dep, repo: res.repo, registry_license: res.registry_license };
  if (res.directory) out.directory = res.directory;
  if (!card) return { ...out, status: 'unresolved', reason: res.reason || 'no GitHub repo in registry metadata' };
  if (card.error) return { ...out, status: /^Repo not found/.test(card.error) ? 'unresolved' : 'error', reason: card.error };
  let flags = card.flags.map((f) => ({ id: f.id, level: f.level }));
  // No license file in the repo, but the published package declares one: the grant lives in the metadata only.
  const metadataOnly = card.license.class === 'none' && registryClass(res.registry_license);
  if (metadataOnly) flags = [{ id: 'LICENSE_ONLY_IN_REGISTRY', level: 'note' }, ...flags.filter((f) => f.id !== 'NO_LICENSE')];
  let mm = metadataOnly ? null : licenseMismatch(res.registry_license, card.license.class);
  if (mm && otherClasses.includes(mm.registry_class)) { mm = null; flags.unshift({ id: 'SEVERAL_LICENSE_FILES', level: 'note' }); }
  if (mm) flags.unshift({ id: 'REGISTRY_LICENSE_MISMATCH', level: mm.level });
  // Upkeep signals are kept apart: they say nothing about the right to use the code.
  const maintenance = flags.filter((f) => MAINTENANCE.includes(f.id)).map((f) => f.id);
  flags = flags.filter((f) => !MAINTENANCE.includes(f.id));
  const status = flags.some((f) => f.level === 'risk') ? 'risk' : flags.length ? 'note' : 'ok';
  return { ...out, repo_license: { class: card.license.class, label: card.license.spdx || card.license.label || null }, mismatch: mm, flags, maintenance, status };
}

// Order = severity; the first id of a dependency decides where it sorts in the maintenance list.
const MAINTENANCE = ['ARCHIVED', 'STALE', 'QUIET', 'NO_RELEASES'];
const STATUSES = ['risk', 'note', 'ok', 'unresolved', 'error'];
export const summarize = (results) => ({ ...Object.fromEntries(STATUSES.map((s) => [s, results.filter((r) => r.status === s).length])), maintenance: results.filter((r) => r.maintenance?.length).length });
const TOP = 5;
const riskIds = (r) => r.flags.filter((f) => f.level === 'risk').map((f) => f.id).join(', ');
const lic = (r) => r.repo_license ? `${r.repo_license.label || r.repo_license.class} [${r.repo_license.class}]` : '';
const tag = (r) => `${r.name}${r.type === 'dev' ? ' (dev)' : ''}`;
const maintList = (d, all) => {
  const list = d.deps.filter((r) => r.maintenance?.length).sort((a, b) => MAINTENANCE.indexOf(a.maintenance[0]) - MAINTENANCE.indexOf(b.maintenance[0]));
  return { list: all ? list : list.slice(0, TOP), more: all ? 0 : Math.max(list.length - TOP, 0) };
};
const summaryLine = (s) => `License: ${s.risk} need a read · Maintenance: ${s.maintenance} notes`;

export function renderDeps(d, all = false) {
  const s = d.summary;
  const lines = [`ossay deps · ${d.path}  (${d.manifests.join(', ') || 'no manifest found'}; ${d.deps.length} direct dependencies)`, `  ${summaryLine(s)}`, `  other notes ${s.note} · no flags ${s.ok} · unresolved ${s.unresolved}${s.error ? ` · error ${s.error}` : ''}`];
  const licenseRisk = d.deps.filter((r) => r.status === 'risk').sort((a, b) => (b.mismatch?.level === 'risk') - (a.mismatch?.level === 'risk'));
  if (licenseRisk.length) lines.push('', '  License');
  for (const r of licenseRisk) {
    lines.push(`  ⚠ ${tag(r).padEnd(28)} ${r.repo.padEnd(32)} ${lic(r)}`);
    if (r.mismatch) lines.push(`      registry says "${r.mismatch.registry}" (${r.mismatch.registry_class}); repo license file reads ${r.mismatch.repo_class}`);
    lines.push(`      ${riskIds(r)}`);
  }
  const has = (r, id) => r.flags?.some((f) => f.id === id);
  const notes = d.deps.filter((r) => r.mismatch?.level === 'note' || has(r, 'LICENSE_ONLY_IN_REGISTRY') || has(r, 'SEVERAL_LICENSE_FILES'));
  if (notes.length) lines.push('', '  Notes');
  for (const r of notes) {
    lines.push(r.mismatch ? `  · ${tag(r)}: registry "${r.mismatch.registry}" vs repo ${r.mismatch.repo_class}`
      : has(r, 'SEVERAL_LICENSE_FILES') ? `  · ${tag(r)}: ${r.repo} has several license files; one matches the registry's "${r.registry_license}" (dual licensing?)`
        : `  · ${tag(r)}: no license file in ${r.repo}; "${r.registry_license}" is declared only in registry metadata`);
  }
  const m = maintList(d, all);
  if (m.list.length) lines.push('', `  Maintenance (${s.maintenance} dependencies; not about license rights)`);
  for (const r of m.list) lines.push(`  · ${tag(r).padEnd(28)} ${r.repo.padEnd(32)} ${r.maintenance.join(', ')}`);
  if (m.more) lines.push(`  … and ${m.more} more (--all)`);
  const un = d.deps.filter((r) => r.status === 'unresolved' || r.status === 'error');
  if (un.length) lines.push('', `  Unresolved (not checked): ${un.map((r) => `${r.name}${r.status === 'error' ? ' [error]' : ''}`).join(', ')}`);
  lines.push('', '  Direct dependencies only. Heuristic summary from public data. Not legal advice.');
  return lines.join('\n');
}

export function renderDepsMarkdown(d, all = false) {
  const s = d.summary;
  const row = (r) => `| ${r.name} | ${r.ecosystem}${r.type === 'dev' ? ' dev' : ''} | ${r.repo ? `[${r.repo}](https://github.com/${r.repo})` : '—'} | ${r.registry_license || '—'} | ${lic(r) || '—'} | ${r.status === 'unresolved' || r.status === 'error' ? r.status : r.flags.filter((f) => f.level === 'risk').map((f) => `**${f.id}**`).join(', ') || (r.maintenance.length ? r.maintenance.join(', ') : 'ok')} |`;
  const head = '| Dependency | Type | Repo | Registry license | Repo license file | Flags |\n|---|---|---|---|---|---|';
  const risky = d.deps.filter((r) => r.status === 'risk');
  const m = maintList(d, all);
  const maint = m.list.length ? `\n**Maintenance** (${s.maintenance} dependencies; not about license rights)\n\n${head}\n${m.list.map(row).join('\n')}\n${m.more ? `\n… and ${m.more} more (\`--all\`)\n` : ''}` : '';
  return `### ossay deps\n\n${d.deps.length} direct dependencies (${d.manifests.join(', ')}): **${summaryLine(s)}** · ${s.note} other notes · ${s.ok} no flags · ${s.unresolved} unresolved\n\n${risky.length ? `**License**\n\n${head}\n${risky.map(row).join('\n')}\n` : 'No dependency needs a license read.\n'}${maint}\n<details><summary>All dependencies</summary>\n\n${head}\n${d.deps.map(row).join('\n')}\n\n</details>\n\n<sub>Direct dependencies only. Heuristic, from public data. Not legal advice.</sub>\n`;
}
