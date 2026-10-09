# Canonical specification contract 1.0

`specs/<feature-id>/spec.md` is authoritative. Each `##` section contains exactly one YAML block. `# Feature specification` is the document heading. The parser rejects duplicate sections, unknown fields, duplicate YAML keys and free-standing normative text. This constrained Markdown remains readable in an editor and renders normally without requiring a special editor. Put prose, multiline API contracts and examples inside YAML string fields. Do not maintain a second authoritative JSON spec.

See [the example](example-spec.md) for a complete parseable spec and [JSON Schema](../core/schemas/spec.schema.json) for types. `core/templates/spec.json` is a starter with intentionally empty mandatory collections, not a valid or approved requirement set.

## Sections

| Section | Purpose |
| --- | --- |
| metadata | Schema version, stable spec ID, increasing integer revision, draft/ready candidate status |
| purpose | Evidenced problem, outcome and users |
| scope | Included work and explicit exclusions |
| sources | Origin, artifact path, SHA-256, limitations and individually identified source claims |
| requirements | Stable REQ IDs, statement, rationale, claim references and interpretation status |
| acceptanceCriteria | Stable AC IDs, REQ references, observable condition, verification method, pass condition and required check IDs |
| constraints / dependencies | Contextual constraints and external prerequisites |
| decisions / assumptions / questions | Evidence-backed decisions, visible assumptions and unresolved product input |
| applicability | API, UI, accessibility, permissions, integrity, migrations, performance, failure handling and compatibility |
| history | Revision changes and their source evidence |

Source references are **claim IDs**, not file IDs. Claims classified as requirements must map to REQs; REQs may cite only requirement claims. Every REQ must map to at least one AC; every AC must reference existing REQs. Independent review compares the original sources with claims to detect omissions that a reference graph alone cannot expose. Source claims should include locators or exact excerpts. Context/exclusion classification needs a rationale and is reviewable.

An interpretation is `explicit`, `proposed`, or `confirmed`. A confirmed interpretation references an existing decision. Proposed interpretations, unconfirmed assumptions, source limitations, blocking unanswered questions and obvious vague wording prevent readiness. This conservative rule requires resolving screenshot gaps or replacing them with accessible evidence before baseline. Preserve the limitation's history and resolution evidence in decisions/history when resolving it. Automated wording checks are only heuristics: the independent reviewer checks feasibility, consistency and verifiability.

## Revisions and evidence

Setting metadata status to ready proposes a baseline; it does not approve it. A full valid READY response must reference the current revision and content hash. The state records the resulting baseline. Any spec or registered source change invalidates readiness. Changes after an earlier baseline require an incremented revision. Never weaken a requirement to make implementation pass.

A full implementation approval must match the current spec hash and complete implementation snapshot. Every criterion must be met with implementation references and evidence. Required check IDs must be present and passing. Findings retain IDs across rounds, with explicit reviewer dispositions for previous findings. Partial reviews, unresolved actionable defects, verification gaps, limitations and exhausted execution time cannot approve completion.

## Standards basis

The contract uses requirements-quality and traceability practices informed by [ISO/IEC/IEEE 29148](https://standards.ieee.org/ieee/29148/6937/), [NASA's requirements checklist](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/) and [NASA's verification matrix guidance](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/). No formal compliance assessment has been performed; the IEEE reference is the public standard description, not a reproduction of its full text.
