// Heuristic license classification. Not legal advice. Evidence strings say what matched.

const PERMISSIVE = new Set(['MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', '0BSD', 'CC0-1.0', 'Zlib', 'BSL-1.0', 'WTFPL', 'CC-BY-4.0']);
const WEAK = /^(MPL-2\.0|EPL-|CDDL-|LGPL-)/;

// Ordered: most specific first. Each rule: [regex on license text, label, class, commercial, hosting, note]
const TEXT_RULES = [
  [/Server Side Public License/i, 'SSPL', 'source-available', 'conditional', 'restricted', 'Offering it as a service requires releasing the whole service stack under SSPL.'],
  [/Elastic License/i, 'Elastic License', 'source-available', 'conditional', 'restricted', 'Providing it to third parties as a managed service is prohibited.'],
  [/Business Source License|BUSL/i, 'BSL', 'source-available', 'conditional', 'restricted', 'Production use limited by the Additional Use Grant until the change date.'],
  [/Functional Source License/i, 'FSL', 'source-available', 'conditional', 'restricted', 'Competing use is restricted for a period, then converts to Apache/MIT.'],
  [/Sustainable Use License/i, 'Sustainable Use License', 'source-available', 'conditional', 'restricted', 'Internal business use allowed; offering it as a hosted service to others is not.'],
  [/Commons Clause/i, 'Commons Clause', 'source-available', 'conditional', 'restricted', 'Selling the software (including paid hosting/support of it) is not allowed.'],
  [/PolyForm\s+(Noncommercial|Non-commercial)/i, 'PolyForm Noncommercial', 'non-commercial', 'no', 'no', 'Noncommercial use only.'],
  [/PolyForm|Fair Source|Fair-code/i, 'PolyForm/Fair-code style', 'source-available', 'conditional', 'restricted', 'Source-available with usage limits; read the terms.'],
  [/Llama\s+\d*(\.\d+)?\s*Community License|LLAMA COMMUNITY LICENSE/i, 'Llama Community License', 'ai-model-license', 'conditional', 'conditional', 'Commercial use allowed with user-count threshold, attribution and acceptable-use terms.'],
  [/OpenRAIL|Responsible AI License|RAIL License/i, 'OpenRAIL-style', 'ai-model-license', 'conditional', 'conditional', 'Use-based restrictions are passed to downstream users.'],
  [/(modified version of|based on) (the )?(Apache License|MIT License)[^\n]{0,40}(additional|following)/i, 'modified permissive', 'modified-permissive', 'conditional', 'conditional', 'Permissive base with extra conditions (often multi-tenant hosting or branding). Read the added terms.'],
  [/non-?\s?commercial|not for commercial|research (purposes )?only|academic use only|research use only/i, 'non-commercial terms', 'non-commercial', 'no', 'no', 'Text restricts commercial use.'],
];
const BASE_TEXT = [
  [/Public Domain Mark|dedicated to the public domain|CC0 1\.0 Universal/i, 'PublicDomain'],
  [/GNU AFFERO GENERAL PUBLIC LICENSE/i, 'AGPL-3.0'],
  [/GNU LESSER GENERAL PUBLIC LICENSE/i, 'LGPL'],
  [/GNU GENERAL PUBLIC LICENSE/i, 'GPL'],
  [/Mozilla Public License/i, 'MPL-2.0'],
  [/Apache License\s+Version 2\.0/i, 'Apache-2.0'],
  [/Permission is hereby granted, free of charge/i, 'MIT'],
  [/Redistribution and use in source and binary forms/i, 'BSD'],
];

const BASE_TO_SPDX = { PublicDomain: 'CC0-1.0', 'AGPL-3.0': 'AGPL-3.0', LGPL: 'LGPL-3.0', GPL: 'GPL-3.0', 'MPL-2.0': 'MPL-2.0', 'Apache-2.0': 'Apache-2.0', MIT: 'MIT', BSD: 'BSD-3-Clause' };

export function classify(spdx, text = '') {
  const out = { spdx: spdx && spdx !== 'NOASSERTION' ? spdx : null, class: 'unknown', commercial_use: 'unknown', hosting_as_service: 'unknown', evidence: [], confidence: 'low' };
  const s = spdx && spdx !== 'NOASSERTION' ? spdx : null;

  if (s) {
    out.confidence = 'high';
    if (PERMISSIVE.has(s)) return set(out, 'permissive', 'yes', 'yes', `SPDX ${s}`);
    if (/^AGPL-/.test(s)) return set(out, 'network-copyleft', 'yes', 'conditional', `SPDX ${s}`, 'Users of a modified hosted version must be offered the source.');
    if (WEAK.test(s)) return set(out, 'weak-copyleft', 'yes', 'yes', `SPDX ${s}`, 'File-level copyleft; modifications to covered files must be shared.');
    if (/^GPL-/.test(s)) return set(out, 'strong-copyleft', 'yes', 'yes', `SPDX ${s}`, 'Distributing a combined work requires GPL-compatible release; plain hosting does not.');
    // other SPDX id (CC-BY-NC etc.)
    if (/-NC/.test(s)) return set(out, 'non-commercial', 'no', 'no', `SPDX ${s}`);
    out.evidence.push(`SPDX ${s} (not in ossay's table)`);
    out.confidence = 'medium';
    return out;
  }

  if (!text.trim()) {
    out.class = spdx === 'NOASSERTION' ? 'unknown' : 'none';
    if (out.class === 'none') { out.commercial_use = 'no'; out.hosting_as_service = 'no'; out.evidence.push('No license file found: default copyright applies, no permission is granted.'); out.confidence = 'high'; }
    else out.evidence.push('License file present but empty or unreadable.');
    return out;
  }

  // Different licenses for different folders (e.g. MIT outside /platform, PolyForm inside it).
  const mixedByFolder = /\b(folder|director(y|ies))\b/i.test(text)
    && /MIT License|Apache License/i.test(text)
    && /Polyform|Elastic License|Business Source License|Sustainable Use|Commons Clause|Functional Source/i.test(text);
  if (mixedByFolder) {
    out.confidence = 'medium';
    return set(out, 'mixed', 'conditional', 'conditional', 'License file assigns different licenses to different folders.', 'Part of the repo is permissive, part is source-available. Check which folder you depend on.');
  }
  // A permissive grant with carve-outs (e.g. third-party data under NC terms) is not a non-commercial license.
  const hasPermissiveGrant = /Permission is hereby granted, free of charge|Apache License\s+Version 2\.0|Redistribution and use in source and binary forms/i.test(text);
  for (const [re, label, cls, com, host, note] of TEXT_RULES) {
    if (re.test(text)) {
      if (cls === 'non-commercial' && label === 'non-commercial terms' && hasPermissiveGrant) {
        out.confidence = 'medium';
        return set(out, 'modified-permissive', 'conditional', 'conditional', 'Permissive grant, but the text also contains non-commercial terms.', 'Likely carve-outs for third-party material; check which files they cover.');
      }
      out.confidence = 'medium';
      out.label = label;
      return set(out, cls, com, host, `License text matches "${label}"`, note);
    }
  }
  for (const [re, label] of BASE_TEXT) {
    if (re.test(text)) {
      const r = classify(BASE_TO_SPDX[label], '');
      r.spdx = null;
      r.label = label;
      r.resembles = true;
      r.confidence = 'medium';
      r.evidence = [`GitHub reported NOASSERTION, but the text resembles ${label}. Check for added terms (exceptions, extra restrictions).`];
      return r;
    }
  }
  if (/all rights reserved/i.test(text) && !/permission is hereby granted|redistribution and use|you may (use|copy|modify|distribute)|licensed under/i.test(text)) {
    out.confidence = 'medium';
    return set(out, 'proprietary', 'conditional', 'no', 'License file says "All rights reserved" and grants no open-source rights.', 'Source is visible but use is governed by the vendor\'s own terms.');
  }
  out.class = 'custom';
  out.evidence.push('Custom license text that matches none of the known patterns. Read it.');
  out.confidence = 'low';
  return out;
}

function set(o, cls, com, host, ev, note) {
  o.class = cls; o.commercial_use = com; o.hosting_as_service = host;
  o.evidence.push(ev);
  if (note) o.note = note;
  return o;
}
