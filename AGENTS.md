# Repository Guidelines

## Project Structure & Files

This repository contains a portable Node.js workflow package and a root-level Markdown session record (session-<id>.md). Keep session records at the repository root and preserve their session ID in the filename. Shared workflows, prompts, schemas and templates live in `core/`; host definitions in `adapters/`; CLI and reversible installation in `installer/`; deterministic validators in `validation/`; tests in `tests/`; and usage/reference material in `docs/`. Add folders only when a distinct, maintained collection of files requires them.

## Editing Markdown

Use clear headings, concise paragraphs, and fenced code blocks for commands or examples. Preserve the record’s existing structure and metadata when editing a session file. Keep generated or quoted conversation content clearly separated from editorial additions; do not silently rewrite user or assistant entries. Use UTF-8 text and descriptive filenames.

## Build, Test & Development

Use Node.js 22 or newer. Run `npm ci` to install dependencies, `node validation/build-schemas.js` after schema changes, `npm run check` for syntax and behavior checks, `npm run release:check` for a clean tarball install and adapter lifecycle check, and `npm pack --dry-run` to inspect package contents. Normal publication runs both checks via `prepublishOnly`. For a Markdown-only change, review the rendered document and check links, heading order, and code fences before submitting. Document changes to these canonical commands here.

## Testing Guidelines

Tests use Node's built-in runner and isolated temporary workspaces. Cover meaningful gates and preservation behavior; distinguish simulated reviewer fixtures from actual native host integration. For edits, inspect the diff and confirm that only intended files and passages changed. Do not add a test framework solely for session-record maintenance.

## Commits & Pull Requests

Use a short imperative commit subject that describes the change, such as “Add contributor guide”. Pull requests should explain the purpose and scope, identify changed records, and include rendered screenshots only when visual formatting is relevant. Link a related issue when one exists. Keep original session transcripts local: they are excluded from Git because they may contain unrelated private context.

## Configuration & Sensitive Data

Before adding session records, check for credentials, access tokens, private URLs, and personal information. Remove secrets and obtain appropriate authorization before including private content. Keep repository-specific guidance in this file concise and update it when project structure or tooling changes.
