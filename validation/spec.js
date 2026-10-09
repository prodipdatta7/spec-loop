import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
import { schemas } from '../core/schemas/build.js';
import { hash, inside } from './io.js';

const ajv = new Ajv({ allErrors: true });
const validators = Object.fromEntries(Object.entries(schemas).map(([key, value]) => [key, ajv.compile(value)]));
export function validate(name, data) {
  const validator = validators[name];
  if (!validator || !validator(data)) throw Error(`${name}: ${ajv.errorsText(validator?.errors)}`);
  return data;
}
export function renderSpec(spec) {
  return '# Feature specification\n\n' + Object.entries(spec).map(([key, value]) => `## ${key}\n\n\`\`\`yaml\n${YAML.stringify(value)}\`\`\`\n`).join('\n');
}
export function parseSpec(markdown) {
  const spec = {};
  const header = '# Feature specification';
  if (!markdown.startsWith(header)) throw Error('Expected canonical specification heading');
  let rest = markdown.slice(header.length).trim();
  while (rest) {
    const match = /^## ([A-Za-z]+)\r?\n\s*```yaml\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/.exec(rest);
    if (!match) throw Error('Use named sections with exactly one YAML block; put normative text inside fields');
    if (Object.hasOwn(spec, match[1])) throw Error(`Duplicate section ${match[1]}`);
    spec[match[1]] = YAML.parse(match[2], { uniqueKeys: true });
    rest = rest.slice(match[0].length).trim();
  }
  return validate('spec', spec);
}
function unique(values, errors, label) {
  if (new Set(values).size !== values.length) errors.push(`Duplicate ${label}`);
}
export function inspectSpec(spec, root) {
  validate('spec', spec);
  const errors = [], questions = [], claims = new Map();
  unique(spec.sources.map(s => s.id), errors, 'source IDs');
  for (const source of spec.sources) {
    if (root) {
      const artifact = inside(root, source.artifact);
      if (!fs.existsSync(artifact) || hash(fs.readFileSync(artifact)) !== source.sha256) errors.push(`Missing or changed source ${source.id}`);
    }
    for (const claim of source.claims) {
      if (claims.has(claim.id)) errors.push(`Duplicate claim ${claim.id}`);
      claims.set(claim.id, claim);
      if (claim.disposition === 'question') questions.push(`${claim.id}: ${claim.text}`);
    }
    questions.push(...source.limitations.map(x => `${source.id}: ${x}`));
  }
  const reqs = new Set(spec.requirements.map(r => r.id));
  unique([...spec.requirements.map(r => r.id)], errors, 'requirement IDs');
  unique(spec.acceptanceCriteria.map(a => a.id), errors, 'criterion IDs');
  unique(spec.decisions.map(d => d.id), errors, 'decision IDs');
  for (const req of spec.requirements) {
    for (const ref of req.sourceRefs) if (!claims.has(ref) || claims.get(ref).disposition !== 'requirement') errors.push(`${req.id}: unsupported source reference ${ref}`);
    if (req.interpretation === 'proposed') questions.push(`${req.id}: interpretation needs confirmation`);
    if (req.interpretation === 'confirmed' && !spec.decisions.some(d => d.id === req.decisionRef)) errors.push(`${req.id}: missing confirmation decision`);
    if (!spec.acceptanceCriteria.some(a => a.requirementIds.includes(req.id))) errors.push(`${req.id}: no acceptance criterion`);
    if (/\b(fast|quickly|user.friendly|as appropriate|etc\.?|TBD|TODO)\b/i.test(req.statement)) questions.push(`${req.id}: potentially unverifiable wording`);
  }
  for (const [id, claim] of claims) if (claim.disposition === 'requirement' && !spec.requirements.some(r => r.sourceRefs.includes(id))) errors.push(`${id}: omitted source requirement`);
  for (const ac of spec.acceptanceCriteria) for (const id of ac.requirementIds) if (!reqs.has(id)) errors.push(`${ac.id}: unknown requirement ${id}`);
  for (const q of spec.questions) if (q.blocking && !q.answer.trim()) questions.push(`${q.id}: ${q.question}`);
  for (const a of spec.assumptions) if (a.status === 'proposed') questions.push(`${a.id}: unconfirmed assumption`);
  const areas = schemas.spec.properties.applicability.items.properties.area.enum;
  unique(spec.applicability.map(a => a.area), errors, 'applicability areas');
  for (const area of areas) if (!spec.applicability.some(a => a.area === area)) errors.push(`Assess applicability: ${area}`);
  for (const a of spec.applicability) {
    if (a.applicable && !a.requirementIds.length) errors.push(`${a.area}: applicable but untraced`);
    for (const id of a.requirementIds) if (!reqs.has(id)) errors.push(`${a.area}: unknown requirement ${id}`);
  }
  if (spec.history.at(-1).revision !== spec.metadata.revision) errors.push('History must end at current revision');
  return { errors, questions, ready: errors.length === 0 && questions.length === 0 };
}
export function loadSpec(root, file) {
  const raw = fs.readFileSync(inside(root, file), 'utf8');
  const spec = parseSpec(raw), report = inspectSpec(spec, root);
  return { spec, report, hash: hash(raw), file, directory: path.posix.dirname(file) };
}
