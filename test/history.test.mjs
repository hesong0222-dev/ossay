import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeKind } from '../src/history.mjs';

const MIT = (who) => `MIT License\n\nCopyright (c) ${who}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy`;

test('year or copyright-holder change only is cosmetic', () => {
  assert.equal(changeKind(MIT('2024 Alice'), MIT('2024-2026 Alice and contributors')), 'cosmetic');
});

test('switching license family is a class change', () => {
  assert.equal(changeKind(MIT('2024 Alice'), 'Elastic License 2.0 ... You may not provide the software to third parties as a hosted or managed service'), 'class-change');
});

test('adding or removing the license file is reported as such, not as a class change', () => {
  assert.equal(changeKind('', MIT('2026 Alice')), 'added');
  assert.equal(changeKind(MIT('2026 Alice'), ''), 'removed');
});

test('same reading with other text changed is wording', () => {
  assert.equal(changeKind(MIT('2024 Alice'), MIT('2024 Alice') + '\n\nThe logo is not covered by this license.'), 'wording');
});
