import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { beginReview, acceptReview, recordVerification, resume, snapshot, stateOf, config, route } from '../core/runtime.js';
import { write, writeJSON } from '../validation/io.js';
import { workspace, setup, baseline, feedback, specFixture } from './fixtures.js';
import { renderSpec } from '../validation/spec.js';

function codeRound(root, state) { return beginReview(root, state.runId, 'code', 'primary', 'test-model', 'high').brief; }
function verify(root, state, brief, passed = true) { recordVerification(root, state.runId, { schemaVersion: '1.0', revision: brief.reviewedRevision, checks: [{ id: 'greeting-test', passed, command: 'node --test', evidence: passed ? '1 pass' : '1 fail' }], limitations: [] }); }
test('fixture defect, automatic feedback transfer, fix and re-review complete', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  write(path.join(root, 'greeting.js'), 'export const greeting = () => "Bye";\n');
  const first = codeRound(root, state); verify(root, state, first, false);
  const rejected = feedback(first, 'CHANGES_REQUESTED');
  rejected.criteria[0].status = 'unmet';
  rejected.findings = [{ id: 'F-1', severity: 'high', requirementIds: ['REQ-1'], locations: [{ file: 'greeting.js', line: 1 }], problem: 'Returns Bye', impact: 'Wrong greeting', requiredOutcome: 'Return Hello' }];
  assert.equal(acceptReview(root, state.runId, rejected).stage, 'implement');
  write(path.join(root, 'greeting.js'), 'export const greeting = () => "Hello";\n');
  const next = codeRound(root, state); verify(root, state, next);
  const approved = feedback(next, 'APPROVED');
  approved.previousFindings = [{ id: 'F-1', status: 'resolved', evidence: 'greeting.js:1 now returns Hello; check passes' }];
  assert.equal(acceptReview(root, state.runId, approved).stage, 'complete');
  assert.equal(resume(root, state.runId).stage, 'complete');
  write(path.join(root, 'greeting.js'), 'regression');
  assert.equal(resume(root, state.runId).stage, 'implement');
  assert.equal(stateOf(root, state.runId).approval, null);
});
test('rejects malformed, partial, stale, contradictory, missing-criterion and self approvals', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  const brief = codeRound(root, state); verify(root, state, brief);
  for (const mutate of [r => { r.scope = 'partial'; }, r => { r.criteria = []; }, r => { r.reviewer.agentId = 'primary'; }, r => { r.reviewedRevision = 'old'; }, r => { r.criteria[0].status = 'unmet'; }, r => { r.verificationGaps = ['missing test']; }, r => { r.extra = 'invalid'; }]) {
    const result = feedback(brief, 'APPROVED'); mutate(result);
    assert.throws(() => acceptReview(root, state.runId, result));
    assert.equal(stateOf(root, state.runId).approval, null);
  }
  write(path.join(root, 'new-file.txt'), 'not reviewed');
  assert.throws(() => acceptReview(root, state.runId, feedback(brief, 'APPROVED')), /Stale/);
});
test('failed or missing required checks block even reviewer approval', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  const brief = codeRound(root, state);
  assert.throws(() => acceptReview(root, state.runId, feedback(brief, 'APPROVED')));
  verify(root, state, brief, false);
  assert.throws(() => acceptReview(root, state.runId, feedback(brief, 'APPROVED')), /Completion/);
});
test('snapshot tampering invalidates feedback', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  const brief = codeRound(root, state); verify(root, state, brief);
  write(path.join(root, `.agentic-workflow/runs/${state.runId}/rounds/${brief.round}/snapshot/specs/greeting/plan.md`), 'tampered');
  assert.throws(() => acceptReview(root, state.runId, feedback(brief, 'APPROVED')), /Stale/);
});
test('interruption preserves pending review; spec changes invalidate baseline and pending review', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  const brief = codeRound(root, state);
  assert.equal(resume(root, state.runId).pending.round, brief.round);
  const spec = specFixture(); spec.requirements[0].statement = 'A changed requirement';
  write(path.join(root, state.specFile), renderSpec(spec));
  const resumed = resume(root, state.runId);
  assert.equal(resumed.stage, 'draft'); assert.equal(resumed.baseline, null); assert.equal(resumed.pending, null);
  const specBrief = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high').brief;
  assert.throws(() => acceptReview(root, state.runId, feedback(specBrief, 'READY')), /Increment/);
});
test('prepare stops at ready and exhausted budget never starts more review', t => {
  const root = workspace(t), state = setup(root, 'prepare', { maxRounds: 1 });
  assert.equal(baseline(root, state).stage, 'ready');
  assert.throws(() => codeRound(root, state));
  assert.equal(stateOf(root, state.runId).approval, null);
});
test('personal, project and explicit configuration precedence respects intent and opt-out', t => {
  const root = workspace(t), personal = workspace(t);
  writeJSON(path.join(personal, '.agentic-workflow/config.json'), { defaultWorkflow: true, maxRounds: 4 });
  writeJSON(path.join(root, '.agentic-workflow/config.json'), { enabled: false, maxRounds: 6 });
  assert.equal(route('implement', config(root, personal)), 'off');
  const cfg = config(root, personal, { enabled: true });
  assert.equal(cfg.maxRounds, 6);
  assert.equal(route('spec', cfg), 'prepare'); assert.equal(route('explain', cfg), 'off');
  assert.equal(route('implement', cfg, { optOut: true }), 'off');
});
test('source bytes changed on resume invalidate ready baseline', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  write(path.join(root, 'specs/greeting/sources/request.txt'), 'Changed source');
  assert.equal(resume(root, state.runId).baseline, null);
});
test('RV-1 rejected spec re-review revokes baseline until independent resolution', t => {
  const root = workspace(t), state = setup(root); baseline(root, state);
  const brief = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high').brief;
  const rejected = feedback(brief, 'CHANGES_REQUESTED');
  rejected.findings = [{ id: 'SPEC-1', severity: 'high', requirementIds: ['REQ-1'], locations: [], problem: 'Missing case', impact: 'Unclear behavior', requiredOutcome: 'Clarify case' }];
  assert.equal(acceptReview(root, state.runId, rejected).baseline, null);
  assert.throws(() => codeRound(root, state), /ready baseline/);
  const next = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high').brief;
  const approved = feedback(next, 'READY');
  approved.previousFindings = [{ id: 'SPEC-1', status: 'rejected', evidence: 'Original source and existing AC explicitly cover the case.' }];
  assert.equal(acceptReview(root, state.runId, approved).stage, 'implement');
});
test('RV-3 reviewer selection must match effective installed model and tier', t => {
  const root = workspace(t), state = setup(root);
  writeJSON(path.join(root, '.agentic-workflow/config.json'), { reviewerModel: 'configured-model', reviewerReasoning: 'high' });
  assert.throws(() => beginReview(root, state.runId, 'spec', 'primary', 'unconfigured-model', 'pro'), /effective configuration/);
  assert.throws(() => beginReview(root, state.runId, 'spec', 'primary', 'configured-model', 'pro'), /effective configuration/);
  assert.equal(beginReview(root, state.runId, 'spec', 'primary', 'configured-model', 'high').brief.reviewerModel, 'configured-model');
});
test('optional preferences remain nonblocking across review rounds', t => {
  const root = workspace(t), state = setup(root);
  const brief = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high').brief;
  const first = feedback(brief, 'READY');
  first.findings = [{ id: 'P-1', severity: 'preference', requirementIds: [], locations: [], problem: 'Optional wording preference', impact: 'None', requiredOutcome: 'Optional rewording' }];
  acceptReview(root, state.runId, first);
  const next = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high').brief;
  const second = feedback(next, 'READY'); second.findings = first.findings;
  second.previousFindings = [{ id: 'P-1', status: 'open', evidence: 'Still optional, no compliance impact' }];
  assert.equal(acceptReview(root, state.runId, second).stage, 'implement');
});
