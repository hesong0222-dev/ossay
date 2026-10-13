import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CACHE_TTL_MS = 24 * 3600 * 1000;
let useCache = true;
export const setCache = (on) => { useCache = on; };
export const stats = { network: 0, notModified: 0, cached: 0 };

export const cacheKey = (path) => createHash('sha1').update(path).digest('hex');
export const isFresh = (entry, now = Date.now(), ttl = CACHE_TTL_MS) => !!entry && now - entry.at < ttl;
const cacheDir = () => process.env.OSSAY_CACHE_DIR || join(homedir(), '.cache', 'ossay');
const readCache = (path) => { try { return JSON.parse(readFileSync(join(cacheDir(), cacheKey(path)), 'utf8')); } catch { return null; } };
const writeCache = (path, entry) => { try { mkdirSync(cacheDir(), { recursive: true }); writeFileSync(join(cacheDir(), cacheKey(path)), JSON.stringify(entry)); } catch { /* cache is optional */ } };

// Message for a 403/429 that is a rate limit (primary: remaining 0; secondary: retry-after), else null.
export function rateLimitMessage(status, headers, now = Date.now(), hasToken = false) {
  const h = (k) => (typeof headers.get === 'function' ? headers.get(k) : headers[k]);
  if (status !== 403 && status !== 429) return null;
  const retry = Number(h('retry-after'));
  const reset = Number(h('x-ratelimit-reset'));
  let secs;
  if (retry > 0) secs = retry;
  else if (h('x-ratelimit-remaining') === '0' && reset > 0) secs = Math.max(reset - now / 1000, 0);
  else return null;
  const mins = Math.max(Math.ceil(secs / 60), 1);
  return `GitHub API rate limit reached. Try again in about ${mins} min${hasToken ? '' : ', or set GITHUB_TOKEN (5000 requests/hour instead of 60)'}. Responses already fetched are cached, so re-running continues where this stopped.`;
}

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
  const entry = useCache ? readCache(path) : null;
  if (isFresh(entry)) { stats.cached++; return entry.status === 404 ? null : entry.body; }
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'ossay', 'x-github-api-version': '2022-11-28' };
  const t = token();
  if (t) headers.authorization = `Bearer ${t}`;
  // A 304 answer to a conditional request does not count against the primary rate limit (GitHub REST docs).
  if (entry && entry.etag) headers['if-none-match'] = entry.etag;
  stats.network++;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (res.status === 304 && entry) {
    stats.notModified++;
    if (useCache) writeCache(path, { ...entry, at: Date.now() });
    return entry.body;
  }
  if (res.status === 404) {
    if (useCache) writeCache(path, { at: Date.now(), status: 404 });
    return null;
  }
  if (!res.ok) {
    const limit = rateLimitMessage(res.status, res.headers, Date.now(), !!t);
    const err = new Error(limit || `GitHub API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  if (useCache) writeCache(path, { at: Date.now(), etag: res.headers.get('etag'), body });
  return body;
}

export function parseRepo(input) {
  const m = input.trim().replace(/\.git$/, '').match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+)/);
  if (!m) throw new Error(`Cannot parse repo: ${input}`);
  return `${m[1]}/${m[2]}`;
}

// The license file in a monorepo subfolder (e.g. packages/foo/LICENSE), or null.
export async function folderLicense(full, dir) {
  const list = await api(`/repos/${full}/contents/${dir.split('/').map(encodeURIComponent).join('/')}`);
  const f = Array.isArray(list) ? list.find((x) => x.type === 'file' && /^(licen[sc]e|copying)/i.test(x.name)) : null;
  const file = f && await api(`/repos/${full}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`);
  return file && file.content ? { path: f.path, text: Buffer.from(file.content, 'base64').toString('utf8') } : null;
}

// Every license-like file in the repo root except third-party notices (e.g. MIT-LICENSE.txt next to GPL-LICENSE.txt).
export async function rootLicenseTexts(full) {
  const root = await api(`/repos/${full}/contents`);
  const names = Array.isArray(root) ? root.filter((x) => x.type === 'file' && /licen[sc]e|copying/i.test(x.name) && !/third|notice|vendor|bundled|binary|gems/i.test(x.name)).map((x) => x.name) : [];
  const files = await Promise.all(names.map((n) => api(`/repos/${full}/contents/${encodeURIComponent(n)}`)));
  return files.filter((f) => f && f.content).map((f) => Buffer.from(f.content, 'base64').toString('utf8'));
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
