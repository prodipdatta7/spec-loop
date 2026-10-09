# CLI and evidence operations

The installed host skill owns these operations during normal use. The CLI itself does not call any LLM or connector. For development without global installation use `node <package-path>/installer/cli.js` in place of `specloop`.

## Start and intake

```sh
specloop prepare export-orders
specloop intake <run-id> otg-card.md --kind file
specloop intake <run-id> captured-card.md --kind link --origin https://example.org/card/123
specloop intake <run-id> screenshot.png --kind screenshot
specloop intake <run-id> chat-requirements.txt --kind chat --origin current-chat
```

`run` starts the same spec preparation with implementation enabled after readiness. The run ID is in the returned JSON. Intake copies bytes to permanent sources and returns a receipt. The host agent inserts receipts and extracted claims in the canonical spec, preserving kind, origin, path and hash. URLs are references: fetching them requires a host connector or authorized tool. The CLI does not fetch them. Binary images remain binary images; the host inspects them.

After authoring the spec, `normalize <run-id>` validates and generates derived JSON and a normalization report. Exit 2 means semantic questions or trace errors; exit 1 indicates invalid structure or an operational error; exit 0 means no deterministic issue was detected, not independent approval.

## Review

```sh
specloop review <run-id> spec --primary <actual-agent-id> --model <configured-model> --reasoning high
specloop feedback <run-id> <returned-review.json>
```

The brief includes snapshot location, authoritative sources/spec, revisions, changed files, criteria and previous findings. Send its absolute path and the run directory to the native reviewer so relative paths resolve there. Spec review does not need a verification file. Code review does:

```json
{
  "schemaVersion": "1.0",
  "revision": "<reviewedRevision from brief>",
  "checks": [{
    "id": "orders-export-test",
    "passed": true,
    "command": "npm test -- export",
    "evidence": "Captured output at rounds/2/check-output.txt: 4 passed, 0 failed"
  }],
  "limitations": []
}
```

```sh
specloop review <run-id> code --primary <actual-agent-id> --model <configured-model> --reasoning high
specloop verify <run-id> <verification.json>
specloop feedback <run-id> <returned-review.json>
specloop resume <run-id>
```

Use `pro` for Antigravity's reasoning/tier label. JSON responses must match [spec review](../core/schemas/spec-review.schema.json) or [code review](../core/schemas/code-review.schema.json). Store feedback and command output inside the run directory, outside the implementation snapshot. Do not edit the snapshot. All project files except directories named `.git`, `node_modules`, and `.agentic-workflow` are included, including untracked files and deletions between review rounds. Symlinks are rejected; use ordinary files in this release. The first review covers all project files; subsequent change manifests compare against the previous review of the same kind. Full snapshot evidence is always available.

Pending reviews survive interruption. `cancel-review <run-id>` releases a failed pending delegation without erasing its round artifacts or resetting budgets. `resume` rechecks spec/source integrity and the entire live snapshot, invalidating affected approvals. `extend <run-id> --rounds 12 --minutes 240` increases total limits explicitly; minutes are measured from original creation, including interruptions. A time extension must cover the elapsed interval to permit more work.

## Concurrency and failure

CLI run mutations take an exclusive run lock and state writes use temporary-file rename. Do not run concurrent installers against one target. Multi-file installation rolls back recoverable write failures; a process or machine crash during installation can still require conflict recovery. A stale run lock after process termination is never silently removed: first verify no writer is active, then remove that single lock file. Keep reviewed files frozen; mismatched live or snapshot hashes reject feedback even if another process edited them.

Recorded agent identities and check evidence are assertions validated for consistency, not cryptographic attestation. A dishonest primary agent or manually altered local state can bypass provenance; use trusted host execution and review real tool output. Snapshot copying may be expensive on large repositories, and build artifacts inside the source tree can invalidate approval. This initial version deliberately has no arbitrary exclusion option that could hide implementation files.
