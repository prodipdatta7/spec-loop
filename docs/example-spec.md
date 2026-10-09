# Feature specification

## metadata

```yaml
schemaVersion: "1.0"
specId: greeting
revision: 1
status: ready
```

## purpose

```yaml
problem: A caller needs a greeting.
objective: Return the requested greeting.
users:
  - API caller
```

## scope

```yaml
included:
  - Greeting function
excluded:
  - Network service
```

## sources

```yaml
- id: SRC-1
  kind: chat
  origin: Fixture request, sentence 1
  artifact: specs/greeting/sources/request.txt
  sha256: 6a1793bcda5eb94de5a250984a419f6fa5cbbc8e4899955b4cb12102ede3465e
  limitations: []
  claims:
    - id: SRC-1-C1
      text: Return Hello.
      disposition: requirement
      rationale: Explicit user request
```

## requirements

```yaml
- id: REQ-1
  statement: The greeting function returns Hello.
  rationale: Caller request
  sourceRefs:
    - SRC-1-C1
  interpretation: explicit
  decisionRef: ""
```

## acceptanceCriteria

```yaml
- id: AC-1
  requirementIds:
    - REQ-1
  condition: Call greeting()
  method: test
  passCondition: Result strictly equals Hello.
  requiredChecks:
    - greeting-test
```

## constraints

```yaml
[]
```

## dependencies

```yaml
[]
```

## decisions

```yaml
[]
```

## assumptions

```yaml
[]
```

## questions

```yaml
[]
```

## applicability

```yaml
- area: api
  applicable: true
  rationale: Function API is in scope.
  requirementIds:
    - REQ-1
- area: ui
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: accessibility
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: permissions
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: data-integrity
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: migrations
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: performance
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: failure-handling
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
- area: compatibility
  applicable: false
  rationale: No requirement in supplied source.
  requirementIds: []
```

## history

```yaml
- revision: 1
  summary: Initial requirement
  evidence: SRC-1-C1
```
