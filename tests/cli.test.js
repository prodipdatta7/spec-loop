import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { workspace } from './fixtures.js';
import { schemas } from '../core/schemas/build.js';
import { inside, readJSON } from '../validation/io.js';

const cli = fileURLToPath(new URL('../installer/cli.js', import.meta.url));
function run(root, ...args) { return spawnSync(process.execPath, [cli, ...args, '--root', root], { encoding: 'utf8' }); }
test('CLI prepare, intake, malformed normalize and resume retain useful state', t => {
  const root = workspace(t);
  assert.equal(run(root, 'install', 'codex', '--default').status, 0);
  const started = run(root, 'prepare', 'export'); assert.equal(started.status, 0);
  const state = JSON.parse(started.stdout);
  const card = path.join(root, 'otg-card.md'); fs.writeFileSync(card, 'Export must be fast.');
  const captured = run(root, 'intake', state.runId, card); assert.equal(captured.status, 0);
  const normalized = run(root, 'normalize', state.runId); assert.equal(normalized.status, 1);
  const report = readJSON(path.join(root, `.agentic-workflow/runs/${state.runId}/normalization-report.json`));
  assert.equal(report.ready, false); assert.ok(report.errors.length);
  assert.equal(run(root, 'resume', state.runId).status, 1);
  assert.equal(readJSON(path.join(root, `.agentic-workflow/runs/${state.runId}/state.json`)).stage, 'draft');
});
test('shipped JSON schemas match runtime definitions', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    const shipped = readJSON(new URL(`../core/schemas/${name}.schema.json`, import.meta.url));
    delete shipped.$schema;
    assert.deepEqual(shipped, schema);
  }
});
test('filesystem paths cannot escape the target', t => {
  const root = workspace(t);
  for (const value of ['../escape', 'nested/../../escape', 'C:/escape', '/escape', 'folder\\escape']) assert.throws(() => inside(root, value));
});
test('maximum-length feature identifier produces a resumable run ID', t => {
  const root = workspace(t);
  const started = run(root, 'prepare', 'f'.repeat(80));
  assert.equal(started.status, 0, started.stderr);
  const state = JSON.parse(started.stdout);
  assert.ok(fs.existsSync(path.join(root, `.agentic-workflow/runs/${state.runId}/state.json`)));
});
