import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { install, uninstall, setEnabled } from '../installer/install.js';
import { hosts } from '../adapters/hosts.js';
import { readJSON, write } from '../validation/io.js';
import { workspace } from './fixtures.js';

for (const host of Object.keys(hosts)) test(`selected adapter only, update and uninstall: ${host}`, t => {
  const root = workspace(t);
  write(path.join(root, 'AGENTS.md'), '# Team instructions\r\nPreserve me.\r\n');
  write(path.join(root, '.gitignore'), 'dist/\n');
  const original = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  install(root, host, { defaultWorkflow: true });
  const manifest = readJSON(path.join(root, '.agentic-workflow/installation.json'));
  for (const [other, adapter] of Object.entries(hosts)) if (other !== host && adapter.reviewer !== hosts[host].reviewer) assert.equal(fs.existsSync(path.join(root, adapter.reviewer)), false);
  assert.equal(manifest.host, host);
  install(root, host);
  setEnabled(root, false); assert.equal(readJSON(path.join(root, '.agentic-workflow/config.json')).enabled, false);
  setEnabled(root, true, true);
  write(path.join(root, 'specs/keep/spec.md'), 'user spec');
  write(path.join(root, '.agentic-workflow/runs/keep/state.json'), '{}');
  const result = uninstall(root);
  assert.deepEqual(result.preserved, []);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), original);
  assert.equal(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), 'dist/\n');
  assert.equal(fs.existsSync(path.join(root, 'specs/keep/spec.md')), true);
  assert.equal(fs.existsSync(path.join(root, '.agentic-workflow/runs/keep/state.json')), true);
});
test('conflicts preflight before modifying any files; edited skill preserved on uninstall', t => {
  const root = workspace(t); install(root, 'codex');
  const skill = path.join(root, hosts.codex.skill); fs.appendFileSync(skill, '\nUser additions');
  const before = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.throws(() => install(root, 'codex'), /conflict/);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), before);
  assert.ok(uninstall(root).preserved.includes(hosts.codex.skill));
  assert.match(fs.readFileSync(skill, 'utf8'), /User additions/);
});
test('unrelated instruction edits survive managed block removal', t => {
  const root = workspace(t); install(root, 'codex');
  fs.appendFileSync(path.join(root, 'AGENTS.md'), '\nExtra instruction\n');
  uninstall(root);
  assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Extra instruction/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /agentic-workflow:begin/);
});
test('unowned pre-existing adapter files are never overwritten', t => {
  const root = workspace(t); write(path.join(root, hosts.codex.reviewer), 'my agent');
  assert.throws(() => install(root, 'codex'), /conflict/);
  assert.equal(fs.existsSync(path.join(root, '.agentic-workflow/core')), false);
});
test('personal install targets only personal host locations', t => {
  const root = workspace(t); install(root, 'antigravity', { personal: true, defaultWorkflow: true });
  assert.ok(fs.existsSync(path.join(root, hosts.antigravity.personalReviewer)));
  assert.equal(fs.existsSync(path.join(root, hosts.antigravity.reviewer)), false);
  assert.deepEqual(uninstall(root).preserved, []);
});
test('RV-2 clean uninstall permits switching host without inheriting model', t => {
  const root = workspace(t); install(root, 'codex'); uninstall(root);
  install(root, 'claude-code');
  const manifest = readJSON(path.join(root, '.agentic-workflow/installation.json'));
  assert.equal(manifest.host, 'claude-code'); assert.equal(manifest.model, hosts['claude-code'].model);
});
