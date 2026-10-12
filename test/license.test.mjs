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
