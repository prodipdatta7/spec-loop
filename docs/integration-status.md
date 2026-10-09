# Validation status

## Automated fixture coverage

`npm test` exercises canonical parsing and traceability, ambiguity detection, raw source retention, structured feedback, completion gates, content hashes, interrupted/resumed state, configuration precedence, all five generated adapters, install/update/uninstall, and preservation of user edits. The defect/fix/re-review unit test uses **simulated reviewer responses**. It proves state transitions, not model quality or native delegation.

## Real host coverage

| Host | Generated installation tested | End-to-end native adapter exercised |
| --- | --- | --- |
| Claude Code | Yes, fixtures | No |
| Codex | Yes, fixtures | No |
| Cursor | Yes, fixtures | No |
| OpenCode | Yes, fixtures | No |
| Antigravity | Yes, fixtures | No |

On 2026-10-09, a real independent subagent reviewed the implementation and forward-tested the shared workflow in isolated workspaces. It identified RV-1 (rejected spec re-review retained a baseline), RV-2 (clean uninstall prevented host switching) and RV-3 (reviewer selection did not match installed config). The primary fixed each issue and transferred results back to the reviewer without user intervention. The reviewer independently reproduced the fixes and resolved all three findings. This exercises actual development-session review/fix/re-review, but does not certify discovery or end-to-end orchestration through any generated adapter.

The independent agent also confirmed that an accessible card fallback containing “Export must be fast” and a proposed two-second interpretation stay blocked before implementation. At its final recheck, all 29 tests passed. A subsequent identifier-boundary regression brings the final automated suite to 30 tests. All five generated skills passed the skill validator; their reviewer definitions parsed as YAML/TOML and shared-workflow links resolved. Package dry-run excluded the original session record and local test data.

## Repeatable host exercise

In an isolated project, install only the host adapter with default mode. Supply an accessible card fallback requiring a function to return `Hello`, with a corresponding test. Ask the primary to prepare the spec; verify real independent spec review and that prepare stops before coding. Start a run from that spec. Introduce an implementation returning `Bye` as the initial candidate, and require the reviewer to read its actual source. Observe the primary process the finding, fix to `Hello`, run the check and obtain a new full approval without copying feedback manually. Interrupt and resume once; modify code after approval and confirm invalidation. Record host version, actual model/tier, invocation metadata, run ID and results without credentials. Do not mark a host exercised until these observations exist.
