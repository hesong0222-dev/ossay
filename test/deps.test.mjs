import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePackageJson, parseRequirements, parsePyproject, parseGoMod, githubRepo, licenseMismatch, depResult } from '../src/deps.mjs';

test('package.json: dependencies and devDependencies are both read and told apart', () => {
  const d = parsePackageJson('{"dependencies":{"express":"^4"},"devDependencies":{"@types/node":"20"}}');
  assert.deepEqual(d.map((x) => [x.name, x.type]), [['express', 'prod'], ['@types/node', 'dev']]);
});

test('requirements.txt: names without versions, extras or markers; options and URLs skipped', () => {
  const d = parseRequirements('# c\nrequests>=2.0\nuvicorn[standard]==0.30 ; python_version>"3.8"\n-r other.txt\ngit+https://github.com/a/b\nnumpy  # pinned\n');
  assert.deepEqual(d.map((x) => x.name), ['requests', 'uvicorn', 'numpy']);
});

test('pyproject.toml: [project].dependencies only, extras brackets do not end the list', () => {
  const t = '[project]\nname = "x"\ndependencies = [\n  "uvicorn[standard]==0.51.0",\n  # comment\n  "fastapi>=0.1",\n]\n[project.optional-dependencies]\ndev = ["pytest"]\n';
  assert.deepEqual(parsePyproject(t).map((x) => x.name), ['uvicorn', 'fastapi']);
});

test('go.mod: require lines and blocks, indirect entries skipped', () => {
  const t = 'module m\n\nrequire github.com/a/b v1.0.0\n\nrequire (\n\tgithub.com/c/d/v2 v2.1.0\n\tgolang.org/x/net v0.1.0 // indirect\n)\n';
  assert.deepEqual(parseGoMod(t).map((x) => x.name).sort(), ['github.com/a/b', 'github.com/c/d/v2']);
});

test('github repo from registry URLs; non-GitHub hosts stay unresolved', () => {
  assert.equal(githubRepo('git+https://github.com/expressjs/express.git'), 'expressjs/express');
  assert.equal(githubRepo('git+ssh://git@github.com/a/b.git'), 'a/b');
  assert.equal(githubRepo('github:a/b'), 'a/b');
  assert.equal(githubRepo('https://github.com/psf/requests/issues'), 'psf/requests');
  assert.equal(githubRepo('https://gitlab.com/a/b'), null);
  assert.equal(githubRepo('https://github.com/sponsors/someone'), null);
});

test('registry MIT but repo license file is source-available: risk', () => {
  const m = licenseMismatch('MIT', 'source-available');
  assert.equal(m.level, 'risk');
  assert.equal(m.registry_class, 'permissive');
});

test('same family, dual license, or registry pointing at the file: no mismatch', () => {
  assert.equal(licenseMismatch('Apache-2.0', 'permissive'), null);
  assert.equal(licenseMismatch('(MIT OR GPL-3.0)', 'permissive'), null);
  assert.equal(licenseMismatch('SEE LICENSE IN LICENSE', 'proprietary'), null);
  assert.equal(licenseMismatch('Apache Software License', 'permissive'), null);
  assert.equal(licenseMismatch('(MPL-2.0 AND MIT)', 'weak-copyleft'), null);
});

test('registry more restrictive than the repo file is a note, not a risk', () => {
  assert.equal(licenseMismatch('AGPL-3.0', 'permissive').level, 'note');
});

test('no license file in the repo but a license in the registry: a note, not NO_LICENSE risk', () => {
  const card = { license: { class: 'none', spdx: null }, flags: [{ id: 'NO_LICENSE', level: 'risk' }] };
  const r = depResult({ name: 'x', ecosystem: 'npm', type: 'prod' }, { repo: 'a/b', registry_license: 'MIT' }, card);
  assert.equal(r.status, 'note');
  assert.deepEqual(r.flags.map((f) => f.id), ['LICENSE_ONLY_IN_REGISTRY']);
});

test('a second root license file that matches the registry turns the mismatch into a note (favico.js: MIT + GPL files)', () => {
  const card = { license: { class: 'strong-copyleft', spdx: 'GPL-2.0' }, flags: [] };
  const r = depResult({ name: 'favico.js', ecosystem: 'npm', type: 'dev' }, { repo: 'ejci/favico.js', registry_license: 'MIT' }, card, ['strong-copyleft', 'permissive']);
  assert.equal(r.mismatch, null);
  assert.equal(r.status, 'note');
});
