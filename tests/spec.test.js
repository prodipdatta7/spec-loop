import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpec, renderSpec, inspectSpec, validate } from '../validation/spec.js';
import { specFixture, workspace, setup } from './fixtures.js';
import { normalize, intake } from '../core/runtime.js';
import { write } from '../validation/io.js';
import path from 'node:path';

test('canonical Markdown roundtrip preserves all requirements and provenance', () => {
  const spec = specFixture();
  assert.deepEqual(parseSpec(renderSpec(spec)), spec);
  assert.equal(inspectSpec(spec).ready, true);
  assert.throws(() => parseSpec(renderSpec(spec) + 'Unparsed normative text'), /named sections/);
  assert.throws(() => parseSpec(renderSpec(spec) + '\n## metadata\n\n```yaml\na: b\n```\n'), /Duplicate/);
});
test('traceability detects omitted source claims, unsupported requirements and missing criteria', () => {
  const spec = specFixture();
  spec.sources[0].claims.push({ id: 'C2', text: 'Another requirement', disposition: 'requirement', rationale: 'Source' });
  spec.requirements[0].sourceRefs = ['invented'];
  spec.acceptanceCriteria[0].requirementIds = ['REQ-404'];
  const { errors } = inspectSpec(spec);
  assert.ok(errors.some(e => e.includes('unsupported')));
  assert.ok(errors.some(e => e.includes('omitted')));
  assert.ok(errors.some(e => e.includes('no acceptance')));
});
test('ambiguous quality and proposed interpretations cannot become ready', () => {
  const spec = specFixture();
  spec.requirements[0].statement = 'Export must be fast';
  spec.requirements[0].interpretation = 'proposed';
  const report = inspectSpec(spec);
  assert.equal(report.ready, false);
  assert.equal(report.questions.length, 2);
});
test('schema rejects malformed reviewer and unknown fields', () => {
  assert.throws(() => validate('code-review', { verdict: 'APPROVED' }));
  const spec = specFixture(); spec.requirements[0].invented = true;
  assert.throws(() => validate('spec', spec));
});
test('intake retains screenshot bytes and detects omitted registered sources', t => {
  const root = workspace(t), state = setup(root);
  const image = path.join(root, 'screen.png'); write(image, Buffer.from([137,80,78,71]));
  const receipt = intake(root, state.runId, image, 'screenshot', 'User screenshot');
  assert.equal(receipt.kind, 'screenshot');
  assert.match(receipt.artifact, /sources/);
  assert.equal(normalize(root, state.runId).report.ready, false);
});
