import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { hash, write } from '../validation/io.js';
import { renderSpec } from '../validation/spec.js';
import { prepare, beginReview, acceptReview } from '../core/runtime.js';

export function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
export function specFixture() {
  return {
    metadata: { schemaVersion: '1.0', specId: 'greeting', revision: 1, status: 'ready' },
    purpose: { problem: 'A caller needs a greeting.', objective: 'Return the requested greeting.', users: ['API caller'] },
    scope: { included: ['Greeting function'], excluded: ['Network service'] },
    sources: [{ id: 'SRC-1', kind: 'chat', origin: 'Fixture request, sentence 1', artifact: 'specs/greeting/sources/request.txt', sha256: hash('Return Hello.'), limitations: [], claims: [{ id: 'SRC-1-C1', text: 'Return Hello.', disposition: 'requirement', rationale: 'Explicit user request' }] }],
    requirements: [{ id: 'REQ-1', statement: 'The greeting function returns Hello.', rationale: 'Caller request', sourceRefs: ['SRC-1-C1'], interpretation: 'explicit', decisionRef: '' }],
    acceptanceCriteria: [{ id: 'AC-1', requirementIds: ['REQ-1'], condition: 'Call greeting()', method: 'test', passCondition: 'Result strictly equals Hello.', requiredChecks: ['greeting-test'] }],
    constraints: [], dependencies: [], decisions: [], assumptions: [], questions: [],
    applicability: ['api', 'ui', 'accessibility', 'permissions', 'data-integrity', 'migrations', 'performance', 'failure-handling', 'compatibility'].map(area => ({ area, applicable: area === 'api', rationale: area === 'api' ? 'Function API is in scope.' : 'No requirement in supplied source.', requirementIds: area === 'api' ? ['REQ-1'] : [] })),
    history: [{ revision: 1, summary: 'Initial requirement', evidence: 'SRC-1-C1' }]
  };
}
export function setup(root, mode = 'run', limits = {}) {
  const state = prepare(root, 'greeting', mode, { enabled: true, maxRounds: 8, maxMinutes: 60, ...limits });
  write(path.join(root, state.specFile), renderSpec(specFixture()));
  write(path.join(root, 'specs/greeting/sources/request.txt'), 'Return Hello.');
  return state;
}
export function feedback(brief, verdict) {
  const base = { schemaVersion: '1.0', runId: brief.runId, round: brief.round, specRevision: brief.specRevision, specHash: brief.specHash, reviewedRevision: brief.reviewedRevision, scope: 'full', reviewer: { agentId: 'independent', model: 'test-model', reasoning: 'high' }, verdict, findings: [], previousFindings: [], limitations: [] };
  return brief.kind === 'spec' ? { ...base, sourceCoverageGaps: [], unsupportedRequirements: [], contradictions: [], unresolvedQuestions: [] } : { ...base, criteria: [{ id: 'AC-1', status: 'met', evidence: ['greeting-test returned success'], implementation: ['greeting.js:1'] }], verificationGaps: [] };
}
export function baseline(root, state) {
  const { brief } = beginReview(root, state.runId, 'spec', 'primary', 'test-model', 'high');
  return acceptReview(root, state.runId, feedback(brief, 'READY'));
}
