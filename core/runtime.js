import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { hash, inside, identifier, readJSON, writeJSON, write } from '../validation/io.js';
import { loadSpec, renderSpec, validate } from '../validation/spec.js';

export function config(root, personalRoot = os.homedir(), explicit = {}) {
  const read = base => {
    const file = inside(base, '.agentic-workflow/config.json');
    return fs.existsSync(file) ? readJSON(file) : {};
  };
  return { enabled: true, defaultWorkflow: false, maxRounds: 8, maxMinutes: 120, ...read(personalRoot), ...read(root), ...explicit };
}
export function route(intent, cfg, { optOut = false, explicit = false } = {}) {
  if (optOut || !cfg.enabled || (!explicit && !cfg.defaultWorkflow)) return 'off';
  return ({ explain: 'off', spec: 'prepare', implement: 'run', resume: 'resume' })[intent] ?? 'off';
}
const runFile = (root, id, name = 'state.json') => inside(root, `.agentic-workflow/runs/${identifier(id, 160)}/${name}`);
function save(root, state) { writeJSON(runFile(root, state.runId), state); return state; }
export const stateOf = (root, id) => readJSON(runFile(root, id));
export function withRun(root, id, operation) {
  const lock = runFile(root, id, 'lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const fd = fs.openSync(lock, 'wx');
  try { return operation(); } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
export function prepare(root, feature, mode = 'prepare', cfg = config(root)) {
  identifier(feature);
  if (!['prepare', 'run'].includes(mode)) throw Error('Invalid mode');
  if (!cfg.enabled) throw Error('Workflow disabled');
  const specFile = `specs/${feature}/spec.md`, file = inside(root, specFile);
  if (!fs.existsSync(file)) {
    const template = JSON.parse(fs.readFileSync(new URL('./templates/spec.json', import.meta.url), 'utf8'));
    template.metadata.specId = feature;
    write(file, renderSpec(template));
    write(inside(root, `specs/${feature}/plan.md`), '# Implementation plan\n\nAdd steps referencing REQ IDs after the ready baseline. Plan completion is not spec compliance.\n');
  }
  const id = `${feature}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const state = { version: 1, runId: id, mode, specFile, stage: 'draft', round: 0, createdAt: Date.now(), limits: { maxRounds: cfg.maxRounds, maxMinutes: cfg.maxMinutes }, baseline: null, pending: null, approval: null, findings: { spec: [], code: [] }, reviews: [] };
  if (!Number.isInteger(cfg.maxRounds) || cfg.maxRounds < 1 || !Number.isFinite(cfg.maxMinutes) || cfg.maxMinutes <= 0) throw Error('Invalid execution limits');
  return save(root, state);
}
export function intake(root, id, input, kind = 'file', origin = input) {
  const state = stateOf(root, id);
  if (state.pending) throw Error('Review in progress');
  if (!['file', 'link', 'screenshot', 'chat'].includes(kind)) throw Error('Unsupported input kind');
  const bytes = fs.readFileSync(input), digest = hash(bytes);
  const basename = path.basename(input).replace(/[^a-zA-Z0-9._-]/g, '-');
  const artifact = `${path.posix.dirname(state.specFile)}/sources/${digest.slice(0, 16)}-${basename}`;
  write(inside(root, artifact), bytes);
  const receiptId = hash(`${digest}:${kind}:${origin}`);
  const receipt = { id: `SRC-${receiptId.slice(0, 12)}`, kind, origin, artifact, sha256: digest, limitations: [], claims: [] };
  writeJSON(runFile(root, id, `inputs/${receiptId}.json`), receipt);
  state.baseline = null; state.approval = null; state.stage = 'draft';
  save(root, state);
  return receipt;
}
export function normalize(root, id) {
  const state = stateOf(root, id);
  let loaded;
  try { loaded = loadSpec(root, state.specFile); }
  catch (error) {
    writeJSON(runFile(root, id, 'normalization-report.json'), { errors: [error.message], questions: [], ready: false });
    throw error;
  }
  const inputs = path.dirname(runFile(root, id, 'inputs/__root__'));
  if (fs.existsSync(inputs)) for (const file of fs.readdirSync(inputs)) {
    const receipt = readJSON(path.join(inputs, file));
    const source = loaded.spec.sources.find(s => s.id === receipt.id);
    if (!source || ['kind', 'origin', 'artifact', 'sha256'].some(k => source[k] !== receipt[k])) loaded.report.errors.push(`Intake source missing or altered: ${receipt.id}`);
  }
  loaded.report.ready = loaded.report.errors.length === 0 && loaded.report.questions.length === 0;
  writeJSON(runFile(root, id, 'spec.parsed.json'), loaded.spec);
  writeJSON(runFile(root, id, 'normalization-report.json'), loaded.report);
  writeJSON(runFile(root, id, 'spec-reference.json'), { file: state.specFile, hash: loaded.hash, revision: loaded.spec.metadata.revision });
  return loaded;
}
export function snapshot(root) {
  const files = {};
  function visit(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['.git', 'node_modules', '.agentic-workflow'].includes(entry.name)) continue;
      const relative = prefix + entry.name, file = inside(root, relative);
      if (entry.isDirectory()) visit(file, relative + '/');
      else if (entry.isFile()) files[relative] = hash(fs.readFileSync(file));
      else throw Error(`Unsupported snapshot entry ${relative}`);
    }
  }
  visit(root);
  return { revision: hash(JSON.stringify(files)), files };
}
function limited(state) { return state.round >= state.limits.maxRounds || Date.now() - state.createdAt > state.limits.maxMinutes * 60000; }
export function resume(root, id) {
  const state = stateOf(root, id);
  let loaded;
  try { loaded = normalize(root, id); }
  catch (error) {
    state.baseline = null; state.approval = null; state.pending = null; state.stage = 'draft';
    save(root, state); throw error;
  }
  if (state.baseline && (state.baseline.hash !== loaded.hash || !loaded.report.ready)) { state.baseline = null; state.approval = null; state.pending = null; state.stage = 'draft'; }
  const revision = snapshot(root).revision;
  if (state.pending && (state.pending.revision !== revision || state.pending.specHash !== loaded.hash)) { state.pending = null; state.stage = state.baseline ? 'implement' : 'draft'; }
  if (state.approval && state.approval.reviewedRevision !== revision) { state.approval = null; state.stage = state.baseline ? 'implement' : 'draft'; }
  if (limited(state) && !['complete', 'ready'].includes(state.stage)) state.stage = 'incomplete';
  return save(root, state);
}
export function beginReview(root, id, kind, primaryAgentId, reviewerModel, reviewerReasoning) {
  if (!['spec', 'code'].includes(kind)) throw Error('Review kind must be spec or code');
  if (!primaryAgentId || !reviewerModel || !['high', 'xhigh', 'max', 'ultra', 'pro'].includes(reviewerReasoning)) throw Error('Explicit primary ID, reviewer model and high reasoning/tier required');
  const cfg = config(root);
  if ((cfg.reviewerModel && cfg.reviewerModel !== reviewerModel) || (cfg.reviewerReasoning && cfg.reviewerReasoning !== reviewerReasoning)) throw Error('Reviewer selection must match effective configuration; update configuration explicitly to change it');
  const state = resume(root, id);
  if (state.pending) throw Error('A review is already pending');
  if (limited(state)) { state.stage = 'incomplete'; save(root, state); throw Error('Execution limit reached; work is incomplete'); }
  const loaded = normalize(root, id);
  if (loaded.report.errors.length) throw Error(loaded.report.errors.join('\n'));
  if (kind === 'code' && (!state.baseline || state.mode === 'prepare' || state.findings.spec.some(f => f.severity !== 'preference'))) throw Error('Code review requires a ready baseline without actionable spec findings and run mode');
  const snap = snapshot(root), round = state.round + 1;
  const base = `rounds/${round}`;
  const previous = state.reviews.filter(r => r.kind === kind).at(-1);
  const prevFiles = previous ? readJSON(runFile(root, id, `rounds/${previous.round}/changes.json`)).files : {};
  const changedFiles = [...new Set([...Object.keys(prevFiles), ...Object.keys(snap.files)])].filter(f => prevFiles[f] !== snap.files[f]);
  writeJSON(runFile(root, id, `${base}/changes.json`), { ...snap, changedFiles });
  // Immutable-by-convention copy: acceptance re-hashes both live files and this copy.
  for (const file of Object.keys(snap.files)) write(runFile(root, id, `${base}/snapshot/${file}`), fs.readFileSync(inside(root, file)));
  const brief = { schemaVersion: '1.0', kind, runId: id, round, specFile: state.specFile, specHash: loaded.hash, specRevision: loaded.spec.metadata.revision, reviewedRevision: snap.revision, scope: 'full', primaryAgentId, reviewerModel, reviewerReasoning, sourceFiles: loaded.spec.sources.map(s => s.artifact), acceptanceCriteria: loaded.spec.acceptanceCriteria, changedFiles, snapshot: `${base}/snapshot`, previousFindings: state.findings[kind], previousReview: previous ?? null, instructions: 'Read original sources, canonical spec, snapshot files, verification.json and previous review. Return only schema-valid JSON. Do not edit files. Preserve finding IDs. Resolve disputes with evidence. Never assume checks passed.' };
  writeJSON(runFile(root, id, `${base}/brief.json`), brief);
  state.round = round; state.pending = { kind, round, revision: snap.revision, specHash: loaded.hash, primaryAgentId, reviewerModel, reviewerReasoning }; state.approval = null; state.stage = 'review';
  save(root, state);
  return { brief, briefFile: runFile(root, id, `${base}/brief.json`) };
}
export function recordVerification(root, id, verification) {
  validate('verification', verification);
  const state = stateOf(root, id);
  if (!state.pending || verification.revision !== state.pending.revision) throw Error('Verification revision mismatch');
  if (snapshot(root).revision !== state.pending.revision) throw Error('Files changed during review');
  if (new Set(verification.checks.map(c => c.id)).size !== verification.checks.length) throw Error('Duplicate check IDs');
  writeJSON(runFile(root, id, `rounds/${state.round}/verification.json`), verification);
  return verification;
}
export function acceptReview(root, id, review) {
  const state = stateOf(root, id), pending = state.pending;
  if (!pending) throw Error('No pending review');
  validate(`${pending.kind}-review`, review);
  const loaded = normalize(root, id), snap = snapshot(root);
  const frozen = snapshot(path.dirname(runFile(root, id, `rounds/${state.round}/snapshot/__root__`)));
  if (loaded.hash !== pending.specHash || snap.revision !== pending.revision || frozen.revision !== pending.revision) throw Error('Stale review: spec, implementation or snapshot changed');
  if (review.runId !== id || review.round !== pending.round || review.specHash !== loaded.hash || review.specRevision !== loaded.spec.metadata.revision || review.reviewedRevision !== pending.revision) throw Error('Review identity mismatch');
  if (review.reviewer.agentId === pending.primaryAgentId || review.reviewer.model !== pending.reviewerModel || review.reviewer.reasoning !== pending.reviewerReasoning) throw Error('Independent configured reviewer required');
  const ids = review.findings.map(f => f.id), previousIds = review.previousFindings.map(f => f.id);
  if (new Set(ids).size !== ids.length || new Set(previousIds).size !== previousIds.length) throw Error('Duplicate finding IDs');
  for (const finding of review.findings) for (const req of finding.requirementIds) if (!loaded.spec.requirements.some(r => r.id === req)) throw Error(`Unknown requirement ${req}`);
  for (const old of state.findings[pending.kind]) {
    const disposition = review.previousFindings.find(f => f.id === old.id);
    if (!disposition || (disposition.status === 'open' && !ids.includes(old.id)) || (disposition.status !== 'open' && ids.includes(old.id))) throw Error(`Missing or contradictory disposition for ${old.id}`);
  }
  for (const d of review.previousFindings) if (!state.findings[pending.kind].some(f => f.id === d.id)) throw Error(`Unknown previous finding ${d.id}`);
  const actionable = review.findings.some(f => f.severity !== 'preference');
  const success = review.verdict === (pending.kind === 'spec' ? 'READY' : 'APPROVED');
  if (success && (actionable || review.scope !== 'full' || review.limitations.length || review.previousFindings.some(f => f.status === 'open' && state.findings[pending.kind].some(old => old.id === f.id && old.severity !== 'preference')))) throw Error('Approval has unresolved findings, partial scope or limitations');
  if (pending.kind === 'spec' && success) {
    if (!loaded.report.ready || loaded.spec.metadata.status !== 'ready' || ['sourceCoverageGaps', 'unsupportedRequirements', 'contradictions', 'unresolvedQuestions'].some(k => review[k].length)) throw Error('Specification is not ready');
    if (state.lastBaseline && loaded.spec.metadata.revision <= state.lastBaseline.revision && loaded.hash !== state.lastBaseline.hash) throw Error('Increment spec revision for changes');
  }
  if (pending.kind === 'code') {
    const criteriaIds = review.criteria.map(c => c.id);
    if (new Set(criteriaIds).size !== criteriaIds.length || criteriaIds.length !== loaded.spec.acceptanceCriteria.length || loaded.spec.acceptanceCriteria.some(c => !criteriaIds.includes(c.id))) throw Error('Review must cover every criterion exactly once');
    if (success) {
      const verification = validate('verification', readJSON(runFile(root, id, `rounds/${state.round}/verification.json`)));
      const required = loaded.spec.acceptanceCriteria.flatMap(c => c.requiredChecks);
      if (!state.baseline || state.baseline.hash !== loaded.hash || state.findings.spec.some(f => f.severity !== 'preference') || review.criteria.some(c => c.status !== 'met') || review.verificationGaps.length || verification.revision !== pending.revision || verification.limitations.length || verification.checks.some(c => !c.passed) || required.some(req => !verification.checks.some(c => c.id === req && c.passed))) throw Error('Completion gate failed');
    }
  }
  if (success && limited({ ...state, round: state.round - 1 })) throw Error('Execution time limit reached; work is incomplete');
  writeJSON(runFile(root, id, `rounds/${state.round}/review.json`), review);
  state.findings[pending.kind] = review.findings;
  state.reviews.push({ kind: pending.kind, round: state.round, verdict: review.verdict });
  if (pending.kind === 'spec' && !success) { state.baseline = null; state.approval = null; }
  if (success && pending.kind === 'spec') { state.baseline = { hash: loaded.hash, revision: loaded.spec.metadata.revision, round: state.round }; state.lastBaseline = state.baseline; state.stage = state.mode === 'prepare' ? 'ready' : 'implement'; }
  else if (success) { state.approval = review; state.stage = 'complete'; }
  else state.stage = ['NEEDS_INPUT', 'BLOCKED'].includes(review.verdict) ? 'needs-input' : pending.kind === 'spec' ? 'draft' : 'implement';
  state.pending = null;
  if (!success && limited(state)) state.stage = 'incomplete';
  return save(root, state);
}
