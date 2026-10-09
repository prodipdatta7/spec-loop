// This module is the schema source; build-schemas.js emits distributable JSON Schema.
const text = { type: 'string', minLength: 1, pattern: '\\S' };
const integer = { type: 'integer', minimum: 1 };
const strings = { type: 'array', items: text, uniqueItems: true };
const list = items => ({ type: 'array', items });
const object = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const choice = (...values) => ({ enum: values });
const refs = { ...strings, minItems: 1 };
const finding = object({ id: text, severity: choice('critical', 'high', 'medium', 'low', 'preference'), requirementIds: strings, locations: list(object({ file: text, line: integer })), problem: text, impact: text, requiredOutcome: text });
const disposition = object({ id: text, status: choice('open', 'resolved', 'rejected'), evidence: text });
const reviewer = object({ agentId: text, model: text, reasoning: text });
const common = { schemaVersion: { const: '1.0' }, runId: text, round: integer, specRevision: integer, specHash: text, reviewedRevision: text, scope: choice('partial', 'full'), reviewer, findings: list(finding), previousFindings: list(disposition), limitations: strings };
export const schemas = {
  spec: object({
    metadata: object({ schemaVersion: { const: '1.0' }, specId: text, revision: integer, status: choice('draft', 'ready') }),
    purpose: object({ problem: text, objective: text, users: refs }),
    scope: object({ included: refs, excluded: strings }),
    sources: { ...list(object({ id: text, kind: choice('file', 'link', 'screenshot', 'chat'), origin: text, artifact: text, sha256: text, limitations: strings, claims: list(object({ id: text, text, disposition: choice('requirement', 'context', 'excluded', 'question'), rationale: text })) })), minItems: 1 },
    requirements: { ...list(object({ id: { ...text, pattern: '^REQ-[A-Z0-9-]+$' }, statement: text, rationale: text, sourceRefs: refs, interpretation: choice('explicit', 'proposed', 'confirmed'), decisionRef: { type: 'string' } })), minItems: 1 },
    acceptanceCriteria: { ...list(object({ id: { ...text, pattern: '^AC-[A-Z0-9-]+$' }, requirementIds: refs, condition: text, method: choice('test', 'inspection', 'analysis', 'demonstration'), passCondition: text, requiredChecks: strings })), minItems: 1 },
    constraints: strings, dependencies: strings,
    decisions: list(object({ id: text, decision: text, evidence: text })),
    assumptions: list(object({ id: text, statement: text, status: choice('proposed', 'confirmed'), evidence: text })),
    questions: list(object({ id: text, question: text, blocking: { type: 'boolean' }, answer: { type: 'string' } })),
    applicability: list(object({ area: choice('api', 'ui', 'accessibility', 'permissions', 'data-integrity', 'migrations', 'performance', 'failure-handling', 'compatibility'), applicable: { type: 'boolean' }, rationale: text, requirementIds: strings })),
    history: { ...list(object({ revision: integer, summary: text, evidence: text })), minItems: 1 }
  }),
  'spec-review': object({ ...common, verdict: choice('READY', 'CHANGES_REQUESTED', 'NEEDS_INPUT'), sourceCoverageGaps: strings, unsupportedRequirements: strings, contradictions: strings, unresolvedQuestions: strings }),
  'code-review': object({ ...common, verdict: choice('APPROVED', 'CHANGES_REQUESTED', 'BLOCKED'), criteria: list(object({ id: text, status: choice('met', 'unmet', 'not-verified'), evidence: refs, implementation: refs })), verificationGaps: strings }),
  verification: object({ schemaVersion: { const: '1.0' }, revision: text, checks: list(object({ id: text, passed: { type: 'boolean' }, command: text, evidence: text })), limitations: strings })
};
