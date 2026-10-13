// License-file history on the default branch: which commits touched LICENSE/COPYING/LICENCE files,
// and what the license reading was before and after each one.
import { api } from './github.mjs';
import { classify } from './license.mjs';

const LICENSE_NAME = /^(licen[sc]e|copying)([-_][\w-]+)?(\.(md|txt|rst|markdown))?$/i;
const COMMON_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];

export const reading = (text) => {
  const r = classify(null, text);
  return { class: r.class, label: r.label || null };
};
const key = (r) => `${r.class}/${r.label || ''}`;

// Text with copyright-holder lines dropped, years masked and whitespace collapsed.
const core = (text) => text.split('\n')
  .filter((l) => !/copyright|\(c\)|©/i.test(l))
  .join(' ')
  .replace(/\b(19|20)\d\d\b/g, 'YYYY')
  .replace(/\s+/g, ' ')
  .trim();

// 'added' / 'removed': the file did not exist before / after; 'class-change': the license reading differs; 'cosmetic': only years / copyright lines / whitespace differ;
// 'wording': same reading, other text changed.
export function changeKind(before, after) {
  if (!before.trim() && after.trim()) return 'added';
  if (before.trim() && !after.trim()) return 'removed';
  if (key(reading(before)) !== key(reading(after))) return 'class-change';
  return core(before) === core(after) ? 'cosmetic' : 'wording';
}

async function textAt(full, path, ref) {
  const f = await api(`/repos/${full}/contents/${encodeURIComponent(path)}?ref=${ref}`);
  return f && f.content ? Buffer.from(f.content, 'base64').toString('utf8') : '';
}

export async function history(full, since) {
  const root = await api(`/repos/${full}/contents`);
  if (!root) throw new Error(`Repo not found: ${full}`);
  const present = Array.isArray(root) ? root.filter((x) => x.type === 'file' && LICENSE_NAME.test(x.name)).map((x) => x.name) : [];
  const paths = [...new Set([...present, ...COMMON_NAMES])];
  const changes = [];
  for (const path of paths) {
    const commits = await api(`/repos/${full}/commits?path=${encodeURIComponent(path)}&since=${since}T00:00:00Z&per_page=100`);
    for (const c of commits || []) {
      const after = await textAt(full, path, c.sha);
      const before = c.parents[0] ? await textAt(full, path, c.parents[0].sha) : '';
      changes.push({
        date: c.commit.committer.date.slice(0, 10), at: c.commit.committer.date, sha: c.sha, url: c.html_url, path,
        before: reading(before), after: reading(after), kind: changeKind(before, after),
      });
    }
  }
  // One commit that removes one license file and adds another with the same reading is a rename.
  const pairOf = (c) => changes.some((o) => o.sha === c.sha && (
    (c.kind === 'added' && o.kind === 'removed' && key(o.before) === key(c.after))
    || (c.kind === 'removed' && o.kind === 'added' && key(o.after) === key(c.before))));
  for (const c of changes.filter(pairOf)) c.kind = 'moved';
  changes.sort((a, b) => a.at.localeCompare(b.at));
  return { repo: full, since, paths: present, changes };
}

const show = (r) => r.label || r.class;
export function renderHistory(h) {
  const lines = [`ossay history · ${h.repo}  (default branch, since ${h.since})`];
  if (!h.changes.length) lines.push('  No commits touched a license file in this period.');
  for (const c of h.changes) {
    lines.push(`  ${c.date}  ${c.sha.slice(0, 7)}  ${c.path.padEnd(12)} ${show(c.before)} → ${show(c.after)}  [${c.kind}]`);
    lines.push(`             ${c.url}`);
  }
  return lines.join('\n');
}
