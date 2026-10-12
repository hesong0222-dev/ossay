const DAY = 86400000;
const daysAgo = (iso, now) => Math.floor((now - Date.parse(iso)) / DAY);

// Factual signals only. Each flag: {id, level: 'risk'|'note', text}
export function buildFlags({ repo, lic, latestRelease }, now = Date.now()) {
  const f = [];
  const add = (id, level, text) => f.push({ id, level, text });
  if (lic.class === 'none') add('NO_LICENSE', 'risk', 'No license file: you have no right to use, modify or redistribute it.');
  if (lic.class === 'non-commercial') add('NON_COMMERCIAL', 'risk', 'License text restricts commercial use.');
  if (lic.class === 'source-available') add('SOURCE_AVAILABLE', 'risk', `Source-available, not open source${lic.label ? ` (${lic.label})` : ''}: hosting/resale is restricted.`);
  if (lic.class === 'ai-model-license') add('MODEL_LICENSE', 'note', 'Model-style license with use-based restrictions or thresholds.');
  if (lic.class === 'network-copyleft') add('NETWORK_COPYLEFT', 'note', 'AGPL: offering a modified version as a service obliges you to share the source.');
  if (lic.class === 'modified-permissive') add('MODIFIED_PERMISSIVE', 'risk', 'Apache/MIT base with additional conditions (check hosting and branding terms).');
  if (lic.class === 'mixed') add('MIXED_LICENSE', 'risk', 'Different folders carry different licenses; part of the repo is source-available.');
  if (lic.class === 'proprietary') add('PROPRIETARY', 'risk', 'All rights reserved: visible source, but no open-source rights. Use is governed by the vendor\'s terms.');
  if (lic.class === 'custom') add('CUSTOM_LICENSE', 'risk', 'Custom license text: read it before adopting.');
  if (lic.class === 'unknown') add('LICENSE_UNKNOWN', 'note', 'License could not be determined automatically.');
  if (lic.resembles) add('LICENSE_TEXT_MODIFIED', 'note', 'GitHub could not match the license exactly; the text may contain extra terms.');
  if (repo.archived) add('ARCHIVED', 'risk', 'Repository is archived (read-only, no further maintenance).');
  const pushed = daysAgo(repo.pushed_at, now);
  if (!repo.archived && pushed > 365) add('STALE', 'risk', `No push for ${pushed} days.`);
  else if (!repo.archived && pushed > 180) add('QUIET', 'note', `No push for ${pushed} days.`);
  if (!latestRelease) add('NO_RELEASES', 'note', 'No tagged releases: pin a commit hash, not a version.');
  const age = Math.max(daysAgo(repo.created_at, now), 1);
  if (age < 90) add('VERY_YOUNG', 'note', `Created ${age} days ago: APIs and ownership may still move.`);
  if (repo.stargazers_count >= 1000 && repo.forks_count / repo.stargazers_count < 0.03)
    add('LOW_FORK_RATIO', 'note', `Forks are ${(100 * repo.forks_count / repo.stargazers_count).toFixed(1)}% of stars. Common for lists and demos; stars alone are not adoption.`);
  return f;
}
