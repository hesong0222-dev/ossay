const n = (x) => x.toLocaleString('en-US');
const ago = (iso, now = Date.now()) => {
  const d = Math.floor((now - Date.parse(iso)) / 86400000);
  return d < 1 ? 'today' : d < 60 ? `${d}d ago` : d < 730 ? `${Math.round(d / 30)}mo ago` : `${Math.round(d / 365)}y ago`;
};

export function buildCard({ repo, lic, flags, latestRelease }, now = Date.now()) {
  return {
    repo: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    checked_at: new Date(now).toISOString().slice(0, 10),
    license: { ...lic, github_license_file_spdx: repo.license ? repo.license.spdx_id : null },
    metrics: {
      stars: repo.stargazers_count, forks: repo.forks_count, open_issues: repo.open_issues_count,
      watchers: repo.subscribers_count ?? null, created: repo.created_at.slice(0, 10), pushed: repo.pushed_at.slice(0, 10),
      archived: repo.archived, language: repo.language, owner_type: repo.owner.type,
      latest_release: latestRelease ? { tag: latestRelease.tag_name, date: latestRelease.published_at.slice(0, 10) } : null,
    },
    flags,
  };
}

export function renderText(c, now = Date.now()) {
  const m = c.metrics, l = c.license;
  const lines = [];
  lines.push(`ossay · ${c.repo}`);
  if (c.description) lines.push(`  ${c.description}`);
  lines.push('');
  lines.push(`  License      ${l.spdx || l.label || l.class}  [${l.class}]  (${l.confidence} confidence)`);
  lines.push(`  Commercial   ${l.commercial_use}      Hosting as a service   ${l.hosting_as_service}`);
  if (l.note) lines.push(`  Note         ${l.note}`);
  for (const e of l.evidence) lines.push(`  Evidence     ${e}`);
  lines.push('');
  lines.push(`  Traction     ★ ${n(m.stars)} · forks ${n(m.forks)} · open issues ${n(m.open_issues)}${m.watchers != null ? ` · watchers ${n(m.watchers)}` : ''}`);
  lines.push(`  Activity     pushed ${ago(m.pushed + 'T00:00:00Z', now)} · created ${m.created}${m.archived ? ' · ARCHIVED' : ''}`);
  lines.push(`  Release      ${m.latest_release ? `${m.latest_release.tag} (${ago(m.latest_release.date + 'T00:00:00Z', now)})` : 'none'}`);
  lines.push('');
  if (!c.flags.length) lines.push('  Flags        none');
  for (const f of c.flags) lines.push(`  ${f.level === 'risk' ? '⚠' : '·'} ${f.id.padEnd(22)} ${f.text}`);
  lines.push('');
  lines.push('  Heuristic summary from public GitHub data. Not legal advice.');
  return lines.join('\n');
}

export function renderMarkdown(c) {
  const m = c.metrics, l = c.license;
  const flag = c.flags.length ? c.flags.map((f) => `- ${f.level === 'risk' ? '⚠️' : 'ℹ️'} **${f.id}** — ${f.text}`).join('\n') : '- none';
  return `### [${c.repo}](${c.url})\n${c.description ? `_${c.description}_\n` : ''}\n| | |\n|---|---|\n| License | ${l.spdx || l.label || l.class} (${l.class}, ${l.confidence} confidence) |\n| Commercial use | ${l.commercial_use} |\n| Hosting as a service | ${l.hosting_as_service} |\n| Stars / forks | ${m.stars.toLocaleString('en-US')} / ${m.forks.toLocaleString('en-US')} |\n| Last push | ${m.pushed}${m.archived ? ' (archived)' : ''} |\n| Latest release | ${m.latest_release ? `${m.latest_release.tag} (${m.latest_release.date})` : 'none'} |\n\n${flag}\n\n<sub>Checked ${c.checked_at}. Heuristic, from public GitHub data. Not legal advice.</sub>\n`;
}
