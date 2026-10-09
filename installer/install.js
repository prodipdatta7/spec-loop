import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hosts, reviewerDefinition } from '../adapters/hosts.js';
import { hash, inside, readJSON, write, writeJSON, walk } from '../validation/io.js';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = '.agentic-workflow/installation.json';
const configPath = '.agentic-workflow/config.json';
const begin = '<!-- agentic-workflow:begin -->', end = '<!-- agentic-workflow:end -->';
function blockRange(text) {
  const start = text.indexOf(begin), finish = text.indexOf(end);
  if (start === -1 && finish === -1) return null;
  if (start === -1 || finish < start || text.indexOf(begin, start + 1) !== -1 || text.indexOf(end, finish + 1) !== -1) throw Error('Malformed or duplicate managed markers');
  return { start, end: finish + end.length, text: text.slice(start, finish + end.length) };
}
function existing(root, rel) { const file = inside(root, rel); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; }
function transaction(root, entries) {
  const originals = entries.map(([rel]) => [rel, existing(root, rel)]);
  try { for (const [rel, value] of entries) value === null ? fs.unlinkSync(inside(root, rel)) : write(inside(root, rel), value); }
  catch (error) {
    for (const [rel, value] of originals.reverse()) {
      if (value !== null) write(inside(root, rel), value);
      else if (fs.existsSync(inside(root, rel))) fs.unlinkSync(inside(root, rel));
    }
    throw error;
  }
}
export function install(root, host, { personal = false, model, defaultWorkflow } = {}) {
  const adapter = hosts[host];
  if (!adapter) throw Error(`Unknown host: ${host}`);
  root = path.resolve(root);
  const priorRaw = existing(root, manifestPath), prior = priorRaw ? JSON.parse(priorRaw) : { files: {} };
  if (prior.host && (prior.host !== host || prior.personal !== personal)) throw Error('Uninstall the previous adapter before switching host or scope');
  const selectedModel = model || prior.model || adapter.model;
  if (host === 'antigravity' && selectedModel !== 'pro') throw Error('Antigravity reviewer requires pro tier');
  if (host === 'cursor' && !/\[.*effort=(high|xhigh|max|ultra).*\]/.test(selectedModel)) throw Error('Cursor reviewer model must explicitly configure a supported high effort parameter');
  if (selectedModel === 'inherit' || /[\r\n]/.test(selectedModel)) throw Error('Explicit reviewer model required');
  const configRaw = existing(root, configPath), cfg = configRaw ? JSON.parse(configRaw) : { enabled: true, defaultWorkflow: false, maxRounds: 8, maxMinutes: 120 };
  cfg.host = host; cfg.reviewerModel = selectedModel; cfg.reviewerReasoning = adapter.reasoning;
  if (defaultWorkflow !== undefined) cfg.defaultWorkflow = defaultWorkflow;
  const runtime = personal ? path.join(root, '.agentic-workflow').replaceAll('\\', '/') : '.agentic-workflow';
  const workflow = `${runtime}/core/workflows/workflow.md`;
  const prompt = fs.readFileSync(path.join(packageRoot, 'core/prompts/reviewer.md'), 'utf8') + `\nSchemas: ${runtime}/core/schemas/spec-review.schema.json and ${runtime}/core/schemas/code-review.schema.json.\n`;
  const files = {};
  for (const folder of ['workflows', 'prompts', 'schemas', 'templates']) for (const file of walk(path.join(packageRoot, 'core', folder))) {
    if (file.endsWith('.js')) continue;
    files[`.agentic-workflow/core/${folder}/${file}`] = fs.readFileSync(path.join(packageRoot, 'core', folder, file), 'utf8');
  }
  const skillPath = personal ? adapter.personalSkill : adapter.skill;
  files[skillPath] = `---\nname: specloop\ndescription: Prepare a traceable feature spec or implement requirements with independent review when requested or enabled as the default workflow. Also resume saved workflow runs. Explanation-only requests do not implement.\n---\n\nRead [the shared workflow](${workflow.startsWith('.') ? path.posix.relative(path.posix.dirname(skillPath), workflow) : workflow}) and use its Prepare, Run or Resume mode. Check effective project and personal config before activating. Honor explicit opt-outs. Reviewer: specloop-reviewer, model ${selectedModel}, reasoning/tier ${adapter.reasoning}. Delegate natively and process returned JSON without user handoff.\n`;
  files[personal ? adapter.personalReviewer : adapter.reviewer] = reviewerDefinition(host, selectedModel, prompt);
  const activation = personal ? adapter.personalActivation : adapter.activation;
  const activationBody = `When asked to implement requirements (for example, implement this card), inspect effective specloop config. If enabled and defaultWorkflow is true, use the specloop skill and its shared contract at ${workflow}. A spec-only request uses Prepare; explanation-only requests do not implement. Explicit opt-outs win. Use the independent specloop-reviewer subagent for required review and process feedback automatically. Project config overrides personal config. Never claim completion without the CLI completion gate. If disabled, do not auto-activate.\n`;
  const managedBlocks = {};
  if (activation) {
    if (activation.endsWith('.mdc')) files[activation] = `---\ndescription: Spec-first default workflow\nalwaysApply: true\n---\n\n${activationBody}`;
    else if (activation.includes('/rules/')) files[activation] = `---\ntrigger: always_on\ndescription: Spec-first default workflow\n---\n\n${activationBody}`;
    else managedBlocks[activation] = `${begin}\n${activationBody}${end}`;
  }
  if (!personal) managedBlocks['.gitignore'] = `${begin}\n.agentic-workflow/runs/\n.agentic-workflow/installation.json\n${end}`;
  const changes = [], records = {};
  for (const [rel, value] of Object.entries(files)) {
    const current = existing(root, rel), old = prior.files[rel];
    if (current !== null && (!old || old.kind !== 'file' || hash(current) !== old.hash)) throw Error(`Install conflict; preserved ${rel}`);
    changes.push([rel, value]); records[rel] = { kind: 'file', hash: hash(value) };
  }
  for (const [rel, value] of Object.entries(managedBlocks)) {
    const current = existing(root, rel) ?? '', range = blockRange(current), old = prior.files[rel];
    if (range && (!old || old.kind !== 'block' || hash(range.text) !== old.hash)) throw Error(`Managed block modified; preserved ${rel}`);
    if (old && !range) throw Error(`Managed block removed; preserved ${rel}`);
    const prefix = range ? '' : current && !current.endsWith('\n') ? '\n\n' : current ? '\n' : '';
    const newValue = range ? current.slice(0, range.start) + value + current.slice(range.end) : current + prefix + value + '\n';
    changes.push([rel, newValue]); records[rel] = { kind: 'block', hash: hash(value), original: old?.original ?? current, installed: newValue };
  }
  // Remove obsolete owned files only if untouched; otherwise require explicit conflict resolution.
  for (const [rel, old] of Object.entries(prior.files)) if (!records[rel]) {
    const current = existing(root, rel);
    if (current === null) continue;
    if (old.kind !== 'file' || hash(current) !== old.hash) throw Error(`Obsolete file modified; preserved ${rel}`);
    changes.push([rel, null]);
  }
  const manifest = { version: '0.1.0', host, personal, model: selectedModel, files: records };
  changes.push([configPath, JSON.stringify(cfg, null, 2) + '\n'], [manifestPath, JSON.stringify(manifest, null, 2) + '\n']);
  transaction(root, changes);
  return { host, personal, files: Object.keys(records), warning: personal && host === 'cursor' ? `Cursor global automatic activation needs a User Rule in Cursor settings: ${activationBody}` : null };
}
export function setEnabled(root, enabled, defaultWorkflow) {
  const file = inside(root, configPath), cfg = fs.existsSync(file) ? readJSON(file) : {};
  cfg.enabled = enabled;
  if (defaultWorkflow !== undefined) cfg.defaultWorkflow = defaultWorkflow;
  writeJSON(file, cfg); return cfg;
}
export function uninstall(root) {
  const raw = existing(root, manifestPath);
  if (!raw) return { removed: [], preserved: [] };
  const manifest = JSON.parse(raw), changes = [], preserved = [], removed = [];
  for (const [rel, record] of Object.entries(manifest.files)) {
    const current = existing(root, rel);
    if (current === null) continue;
    if (record.kind === 'file') {
      if (hash(current) !== record.hash) { preserved.push(rel); continue; }
      changes.push([rel, null]);
    } else {
      let range;
      try { range = blockRange(current); } catch { preserved.push(rel); continue; }
      if (!range || hash(range.text) !== record.hash) { preserved.push(rel); continue; }
      const value = current === record.installed ? record.original : current.slice(0, range.start) + current.slice(range.end);
      changes.push([rel, value]);
    }
    removed.push(rel);
  }
  const cfg = JSON.parse(existing(root, configPath) ?? '{}'); cfg.enabled = false;
  changes.push([configPath, JSON.stringify(cfg, null, 2) + '\n']);
  // Keep ownership of preserved files for a later explicit cleanup, without deleting user changes.
  manifest.files = Object.fromEntries(Object.entries(manifest.files).filter(([rel]) => preserved.includes(rel)));
  if (!preserved.length) { delete manifest.host; delete manifest.personal; delete manifest.model; }
  changes.push([manifestPath, JSON.stringify(manifest, null, 2) + '\n']);
  transaction(root, changes);
  return { removed, preserved, note: 'Specs, sources, run history and disabled configuration preserved.' };
}
