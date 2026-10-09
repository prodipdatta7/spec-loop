import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run through npm so its own CLI path is available on Windows as well as Unix.
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run this check with npm run release:check');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'specloop-release-'));
function execute(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr + result.stdout);
  return result.stdout;
}
try {
  // A parent `npm publish --dry-run` exports npm_config_dry_run. These local
  // smoke-test operations must still create and install their temporary archive.
  const [packed] = JSON.parse(execute([npm, 'pack', '--json', '--ignore-scripts', '--dry-run=false', '--pack-destination', temp]));
  const names = packed.files.map(file => file.path);
  const required = ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'installer/cli.js', 'installer/install.js', 'adapters/hosts.js', 'core/runtime.js', 'core/templates/spec.json', 'core/workflows/workflow.md', 'core/prompts/reviewer.md', 'core/schemas/build.js', 'validation/io.js', 'validation/spec.js'];
  for (const name of required) assert.ok(names.includes(name), `Missing required package file: ${name}`);
  for (const name of names) {
    assert.ok(/^(package\.json$|README\.md$|LICENSE$|NOTICE$|core\/|adapters\/|installer\/|validation\/|docs\/)/.test(name), `Unexpected published file: ${name}`);
    assert.ok(!/(^|\/)(\.env(?:\.|$)|\.npmrc$|session-|node_modules\/|\.agentic-workflow\/)/.test(name), `Private/local artifact in package: ${name}`);
  }
  const consumer = path.join(temp, 'consumer');
  fs.mkdirSync(consumer);
  execute([npm, 'install', '--prefix', consumer, '--ignore-scripts', '--dry-run=false', '--no-audit', '--no-fund', path.join(temp, packed.filename)]);
  const installed = path.join(consumer, 'node_modules', 'specloop');
  const cli = path.join(installed, 'installer', 'cli.js');
  const pkg = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
  assert.equal(pkg.bin.specloop, 'installer/cli.js');
  assert.equal(pkg.license, 'Apache-2.0');
  assert.ok(fs.existsSync(path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'specloop.cmd' : 'specloop')));
  assert.ok(fs.readFileSync(cli, 'utf8').startsWith('#!/usr/bin/env node\n'), 'CLI needs a Unix-compatible shebang');
  assert.match(execute([cli, '--help'], consumer), /specloop <command>/);
  for (const host of ['claude-code', 'codex', 'cursor', 'opencode', 'antigravity']) {
    const target = path.join(temp, host); fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing project instructions\n');
    const result = JSON.parse(execute([cli, 'install', host, '--default', '--root', target], consumer));
    assert.equal(result.host, host);
    for (const file of result.files) assert.ok(fs.existsSync(path.join(target, file)), `Missing installed file ${file}`);
    const state = JSON.parse(execute([cli, 'prepare', 'release-smoke', '--root', target], consumer));
    assert.equal(state.stage, 'draft');
    execute([cli, 'update', '--root', target], consumer);
    const removed = JSON.parse(execute([cli, 'uninstall', '--root', target], consumer));
    assert.deepEqual(removed.preserved, []);
    assert.equal(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8'), '# Existing project instructions\n');
    assert.ok(fs.existsSync(path.join(target, 'specs', 'release-smoke', 'spec.md')));
  }
  console.log(`Release check passed: ${packed.name}@${packed.version}; ${names.length} packaged files; clean tarball install and all five adapter lifecycles.`);
} finally {
  // Only remove the unique temporary directory created by this invocation.
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('specloop-release-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
