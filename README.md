# SpecLoop

Spec-driven development with independent agent review.

New here? Start with the [brief user guide](docs/user-guide.md) for setup, everyday requests, and what to expect.

A portable, spec-first workflow for Claude Code, Codex, Cursor, OpenCode and Google Antigravity. Install one adapter. Your primary agent prepares a canonical spec, delegates independent review, implements the baseline, and handles review/fix rounds without manual feedback transfer.

The host agent performs interpretation, implementation and delegation. A Node.js CLI validates structured artifacts, tracks revisions, saves progress and rejects invalid completion. Instruction files cannot guarantee uninterrupted execution or prove that a model actually ran. Version 0.1.0 is an initial implementation; adapter generation is tested, and real-host validation is tracked separately in [integration status](docs/integration-status.md).

## Install

See the [step-by-step installation guide](docs/installation.md) for downloading the repository, choosing an adapter, updating, and uninstalling.

Requires Node.js 22 or newer and your selected host. No other coding host is required.

From this package directory:

```sh
npm ci
npm test
npm install -g .
```

From the target project:

```sh
specloop install codex --default
```

Choose `claude-code`, `codex`, `cursor`, `opencode`, or `antigravity`. `--default` enables automatic activation for implementation requests; omit it for on-demand use. Restart/reload the host so it discovers the installed skill and reviewer. Confirm that the configured reviewer model is available in your account; use `--model` to select a supported alternative with high reasoning. Antigravity uses its explicit `pro` tier. Cursor model strings must include a supported high effort option. See [adapter details](docs/adapters.md).

For personal defaults, run `specloop install codex --personal --default`. Project config overrides personal config. Personal Cursor activation needs a User Rule configured in Cursor settings; the installer returns the exact rule text. Personal Antigravity targets its documented IDE/config locations; CLI global skill paths vary, so use a project installation for CLI portability.

## Use through your host agent

Invoke the installed `specloop` skill with one of:

```text
Prepare a spec for this card using otg-card.md and the attached screenshot.
Run the workflow to implement this card: <authorized card link>.
Resume specloop run <run-id>.
```

With default mode enabled, “implement this card” activates the same workflow. “Explain this code” does not implement, and “prepare a spec” stops after independent spec approval. Explicit requests to skip the workflow take precedence over automatic activation.

The agent obtains sources using authorized connectors or supplied fallback material, preserves provenance and images, extracts requirements, asks bundled questions for unresolved product decisions, then uses an independent native reviewer. Routine formatting and fixes need no approval. There is no built-in Jira/GitHub credential store or OCR service: the host's authorized tools provide those capabilities.

## Canonical files

```text
specs/<feature-id>/
  spec.md                   Human-readable canonical Markdown with YAML sections
  plan.md                   Separate implementation plan referencing REQ IDs
  sources/                  Preserved originals and screenshots
.agentic-workflow/
  config.json               Project overrides
  installation.json         Ownership hashes; local, ignored
  core/                     Installed shared instructions, schemas and templates
  runs/<run-id>/             Local, ignored; created on demand
    inputs/                 Provenance receipts
    spec-reference.json
    spec.parsed.json         Generated projection, never edit as authority
    normalization-report.json
    state.json
    rounds/<round>/
      brief.json
      changes.json
      snapshot/             Frozen files used for independent review
      verification.json
      review.json
```

Use the [spec contract](docs/spec-contract.md) and [CLI guide](docs/cli.md) for direct operations. Specs and source evidence belong in version control when appropriate; inspect them for private material first. Disabling and uninstalling preserve them and all run history.

SpecLoop retains the internal `.agentic-workflow/` directory and installation markers from its original name so existing configuration, run history, and file ownership remain readable. The command and installed skill are now named `specloop`. For an existing installation, install the renamed package and run `specloop update` in the target project to replace its managed entry points; modified files are preserved through the usual conflict checks.

## Configuration and maintenance

```sh
specloop config
specloop disable
specloop enable --default
specloop update
specloop uninstall
```

Add `--personal` to operate on the personal installation. Use `--root <directory>` for an explicit target. Configuration precedence is explicit runtime overrides, project, personal, then built-in defaults. Explicit opt-out always wins intent routing. Defaults are `enabled: true`, `defaultWorkflow: false`, `maxRounds: 8`, `maxMinutes: 120`. Both review loops share these limits.

The installer preserves unrelated instructions and config, preflights all conflicts, and tracks generated files by hash. Modified managed files block updates and are preserved on uninstall. Edit your changes back into the shared package or manually resolve a reported conflict before retrying; there is no force-overwrite flag. Uninstall leaves a disabled config and a residual ownership manifest for preserved user edits. Directory shells may remain empty.

## Development

```sh
npm ci
node validation/build-schemas.js
npm run check
npm run release:check
npm pack --dry-run
```

Shared schema definitions live in `core/schemas/build.js`; regenerate their shipped JSON after edits. Tests use Node's built-in runner and temporary workspaces. They distinguish deterministic simulated feedback from actual independent host review. Original session records stay local and are excluded from Git and npm distribution.

Maintainers: follow the [publishing guide](docs/publishing.md). A normal `npm publish` runs tests and a clean tarball installation check before uploading.

## License

Copyright 2026 prodipdatta7. Licensed under [Apache-2.0](LICENSE); see [NOTICE](NOTICE).
