# Host adapters

Native formats were checked against official documentation on 2026-10-09. The generator in `adapters/hosts.js` supplies one selected reviewer, entry-point skill and persistent activation integration. All use the same installed workflow and schemas. No adapter installs another coding host or edits its unrelated configuration.

| Host | Project entry points | Reviewer configuration | Official reference |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/specloop/`, managed block in `CLAUDE.md` | `.claude/agents/specloop-reviewer.md`, explicit `opus` and high effort, read/search tools | [Subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills) |
| Codex | `.agents/skills/specloop/`, managed block in `AGENTS.md` | `.codex/agents/specloop-reviewer.toml`, explicit model/high reasoning, read-only sandbox | [Subagents](https://developers.openai.com/codex/subagents), [skills](https://developers.openai.com/codex/skills) |
| Cursor | `.cursor/skills/specloop/`, `.cursor/rules/specloop.mdc` | `.cursor/agents/specloop-reviewer.md`, explicit model with high effort, readonly | [Subagents](https://cursor.com/docs/subagents), [rules](https://cursor.com/docs/rules), [skills](https://cursor.com/docs/skills) |
| OpenCode | `.opencode/skills/specloop/`, managed block in `AGENTS.md` | `.opencode/agents/specloop-reviewer.md`, provider/model and high reasoning, edit/write/bash disabled | [Agents](https://opencode.ai/docs/agents/), [skills](https://opencode.ai/docs/skills/) |
| Antigravity | `.agents/skills/specloop/`, `.agents/rules/specloop.md` | `.agents/agents/specloop-reviewer.md`, `pro`, read/search tools | [Subagents](https://antigravity.google/docs/subagents), [skills](https://antigravity.google/docs/skills), [rules](https://antigravity.google/docs/rules) |

Account model availability and provider-specific reasoning support must be confirmed in the host. Defaults are explicit documented examples, not automatic availability checks. Environment overrides, host permissions, disabled delegation, model changes or older host versions may prevent the intended reviewer configuration. The primary must inspect actual invocation metadata and stop incomplete if independent high-reasoning review is unavailable.

Personal installation uses the hosts' documented user skill and reviewer paths. Cursor's global automatic activation uses a User Rule in settings and requires that manual host-side step; the installer emits the rule. Antigravity has differing CLI and IDE global skill paths; this version's personal adapter targets its IDE/config layout. Project installation is the portable default for all five.

Codex and Antigravity share the `.agents/skills` convention; this package deliberately tracks one adapter per install root and rejects host switching until uninstall. Some hosts discover compatibility directories, so installing one adapter does not guarantee that a different host already installed by the user will ignore those files. Persistent instructions provide activation guidance, not a scheduler or an execution guarantee.
