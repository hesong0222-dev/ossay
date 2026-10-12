import { execFileSync } from 'node:child_process';

let cachedToken;
function token() {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  if (!cachedToken) {
    try {
      cachedToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    } catch { cachedToken = null; }
  }
  return cachedToken;
}

export async function api(path) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'ossay', 'x-github-api-version': '2022-11-28' };
  const t = token();
  if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} for ${path}${res.status === 403 ? ' (rate limit? set GITHUB_TOKEN)' : ''}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function parseRepo(input) {
  const m = input.trim().replace(/\.git$/, '').match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+)/);
  if (!m) throw new Error(`Cannot parse repo: ${input}`);
  return `${m[1]}/${m[2]}`;
}

export async function fetchRepo(full) {
  const repo = await api(`/repos/${full}`);
  if (!repo) throw new Error(`Repo not found: ${full}`);
  const [lic, rels] = await Promise.all([
    api(`/repos/${full}/license`),
    api(`/repos/${full}/releases?per_page=1`),
  ]);
  let licenseText = '';
  let licenseFile = lic ? lic.path : null;
  if (lic && lic.content) licenseText = Buffer.from(lic.content, 'base64').toString('utf8');
  if (!lic) {
    // GitHub's license endpoint 404s for some proprietary or unrecognised files; look at the repo root.
    const root = await api(`/repos/${full}/contents`);
    const f = Array.isArray(root) ? root.find((x) => x.type === 'file' && /^(licen[sc]e|copying|unlicense)/i.test(x.name)) : null;
    if (f) {
      const file = await api(`/repos/${full}/contents/${encodeURIComponent(f.name)}`);
      if (file && file.content) { licenseText = Buffer.from(file.content, 'base64').toString('utf8'); licenseFile = f.name; }
    }
  }
  return { repo, licenseText, licenseFile, latestRelease: Array.isArray(rels) && rels[0] ? rels[0] : null };
}
