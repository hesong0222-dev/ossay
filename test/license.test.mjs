import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/license.mjs';

test('MIT is permissive and hostable', () => {
  const r = classify('MIT', '');
  assert.equal(r.class, 'permissive');
  assert.equal(r.hosting_as_service, 'yes');
});

test('AGPL is network copyleft with conditional hosting', () => {
  const r = classify('AGPL-3.0', '');
  assert.equal(r.class, 'network-copyleft');
  assert.equal(r.hosting_as_service, 'conditional');
});

test('no license file means no grant', () => {
  const r = classify(null, '');
  assert.equal(r.class, 'none');
  assert.equal(r.commercial_use, 'no');
});

test('NOASSERTION with Elastic text is source-available and restricts hosting', () => {
  const r = classify('NOASSERTION', 'Elastic License 2.0 ... You may not provide the software to third parties as a hosted or managed service');
  assert.equal(r.class, 'source-available');
  assert.equal(r.hosting_as_service, 'restricted');
});

test('NOASSERTION with non-commercial text is flagged', () => {
  const r = classify('NOASSERTION', 'This model is released for research purposes only.');
  assert.equal(r.class, 'non-commercial');
  assert.equal(r.commercial_use, 'no');
});

test('NOASSERTION whose text is plain MIT is recognised, with a check-for-changes note', () => {
  const r = classify('NOASSERTION', 'MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy');
  assert.equal(r.class, 'permissive');
  assert.match(r.evidence[0], /resembles MIT/);
});

test('Apache base with additional conditions is not plain permissive', () => {
  const r = classify('NOASSERTION', 'Dify is licensed under a modified version of the Apache License 2.0, with the following additional conditions: 1. ...');
  assert.equal(r.class, 'modified-permissive');
  assert.equal(r.hosting_as_service, 'conditional');
});

test('public domain mark is treated as permissive', () => {
  const r = classify('NOASSERTION', '# Public Domain Mark 1.0 ## No Copyright');
  assert.equal(r.class, 'permissive');
});

test('All rights reserved with no grant is proprietary', () => {
  const r = classify(null, '(c) Vendor PBC. All rights reserved. Use is subject to the Commercial Terms of Service.');
  assert.equal(r.class, 'proprietary');
  assert.equal(r.hosting_as_service, 'no');
});

test('different licenses per folder is reported as mixed, not source-available', () => {
  const r = classify('NOASSERTION', 'Everything inside the autogpt_platform folder is under the Polyform Shield License. Everything outside the folder is under the MIT License.');
  assert.equal(r.class, 'mixed');
});

test('MIT grant with third-party non-commercial carve-outs is not a non-commercial license', () => {
  const r = classify('NOASSERTION', 'MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\n\nThird-party data: CC BY-NC-SA 3.0 NonCommercial. NOT for commercial use.');
  assert.equal(r.class, 'modified-permissive');
});

test('GPL text ("occasionally and noncommercially") is not read as a non-commercial license', () => {
  const r = classify(null, 'GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3\n... c) Convey individual copies of the object code ... This alternative is allowed only occasionally and noncommercially ...');
  assert.equal(r.class, 'network-copyleft');
});

test('GPLv2 "only for noncommercial distribution" and the Unlicense "commercial or non-commercial" are not restrictions', () => {
  assert.equal(classify(null, 'GNU GENERAL PUBLIC LICENSE Version 2 ... (This alternative is allowed only for noncommercial distribution and only if you received the program in object code)').class, 'strong-copyleft');
  assert.equal(classify(null, 'Apache License\nVersion 2.0, January 2004 ... vendored: This library is free for commercial and non-commercial use as long as the following conditions are adhered to.').class, 'permissive');
  assert.equal(classify(null, 'This is free and unencumbered software released into the public domain. Anyone is free to copy ... for any purpose, commercial or non-commercial').class, 'permissive');
});

test('the license named first wins over third-party notices further down', () => {
  const r = classify(null, 'This project is licensed under the MIT License except for the third-party components listed below.\nPermission is hereby granted, free of charge, to any person\n...\nApache License\nVersion 2.0, January 2004\n... CC0 1.0 Universal');
  assert.equal(r.label, 'MIT');
});

test('CC BY 4.0 text is permissive', () => {
  assert.equal(classify(null, 'Attribution 4.0 International (CC BY 4.0)\n\nThis work is licensed under the Creative Commons Attribution 4.0 International License.').class, 'permissive');
});

test('AGPL with per-directory BSL is mixed, also when the phrase wraps lines', () => {
  assert.equal(classify(null, 'GNU AFFERO GENERAL PUBLIC LICENSE ... The following directories each contain their own LICENSE file with the Business\nSource License 1.1: web/').class, 'mixed');
});

test('AGPL notice that mentions non-commercial model terms stays AGPL', () => {
  assert.equal(classify(null, 'GNU AFFERO GENERAL PUBLIC LICENSE\nThe model licence records distinguish inspected non-commercial terms from unreviewed upstream metadata.').class, 'network-copyleft');
});

test('full Apache text "subject to the additional conditions" is modified-permissive', () => {
  assert.equal(classify(null, 'Multica is provided under the terms of the Apache License, Version 2.0 — the complete, unmodified text of which is reproduced in Part II — subject to the additional conditions in Part I.\n\nApache License\nVersion 2.0, January 2004').class, 'modified-permissive');
});

test('BSD text with a "Notwithstanding any other provision" branding clause is modified-permissive', () => {
  const r = classify(null, 'Redistribution and use in source and binary forms, with or without modification, are permitted ... 4. Notwithstanding any other provision of this License, licensees are strictly prohibited from altering or removing any branding.');
  assert.equal(r.class, 'modified-permissive');
});
