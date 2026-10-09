# Installation guide

These instructions install **SpecLoop**. Its npm package is `@prodipdatta7/specloop`; its terminal command is `specloop`.

Install the command-line package once, then add the adapter for your coding assistant to each project where you want to use it.

## Requirements

- Node.js **22 or newer**, with npm.
- One supported coding assistant: Claude Code, Codex, Cursor, OpenCode, or Google Antigravity.
- Access to a model that supports the adapter's configured reviewer settings. See [adapter details](adapters.md).

You do not need all five coding assistants installed.

## 1. Install the command-line package

Open a terminal and run:

```sh
npm install -g @prodipdatta7/specloop
specloop --help
```

The package is named `@prodipdatta7/specloop` on npm. The command remains `specloop`. You do not need to download this repository for a normal installation.

## 2. Install your project's adapter

Open a terminal in **the project you want your assistant to work on**. This is usually a different folder from this package's repository.

For Codex, run:

```sh
specloop install codex --default
```

Choose the adapter name for your assistant:

| Coding assistant | Adapter name |
| --- | --- |
| Claude Code | `claude-code` |
| Codex | `codex` |
| Cursor | `cursor` |
| OpenCode | `opencode` |
| Google Antigravity | `antigravity` |

Install only your chosen adapter. For example, a Claude Code user runs:

```sh
specloop install claude-code --default
```

`--default` enables workflow activation for ordinary implementation requests. Omit it if you prefer to request the workflow explicitly:

```sh
specloop install codex
```

The adapter adds a skill, an independent reviewer definition, shared workflow files, and activation instructions. Existing unrelated project instructions are preserved; conflicting managed files are reported instead of overwritten.

## 3. Restart your assistant and try it

Restart or reload your coding assistant so it discovers the installed files. Confirm that its configured reviewer model is available in your account.

Place your requirements in a file such as `otg-card.md`, then ask:

```text
Use specloop to implement the requirements in otg-card.md.
```

To prepare and review a specification without implementing it, ask:

```text
Use specloop to prepare a spec from otg-card.md. Stop before implementation.
```

The assistant handles the workflow. Running the installation commands alone does not start an implementation. See the [user guide](user-guide.md) for the review process and saved files.

## Updating or removing the installation

Update the global package, then refresh the adapter in each target project:

```sh
npm install -g @prodipdatta7/specloop@latest
specloop update
```

To disable the workflow or remove its project integration:

```sh
specloop disable
specloop uninstall
```

Specs, sources, and run history are preserved. User edits to managed files are also preserved. To remove the global command afterward, run:

```sh
npm uninstall -g @prodipdatta7/specloop
```

## Optional personal defaults

For a personal installation across projects, use:

```sh
specloop install codex --personal --default
```

Project configuration takes precedence over personal settings. Personal Cursor installation requires a User Rule in its settings; Antigravity has differing global paths across interfaces. Start with project installation unless you need personal defaults, and read [adapter details](adapters.md) first.

## If something does not work

- **Command not found:** Reopen your terminal and check that npm's global commands are on your PATH.
- **Workflow not discovered:** Restart the assistant and confirm you installed the adapter in the intended project folder.
- **Reviewer unavailable:** Check model access and native subagent support. Use the adapter's documented model configuration; an unavailable independent reviewer leaves work incomplete.
- **Install or update conflict:** Review the reported file and preserve your changes before resolving the conflict. There is no force-overwrite option.

This is an initial implementation. Automated package tests pass, but end-to-end operation through all five generated adapters remains unverified. See [validation status](integration-status.md).

## Install from source instead

For development or local modifications, clone [the repository](https://github.com/prodipdatta7/spec-loop):

```sh
git clone https://github.com/prodipdatta7/spec-loop.git
cd spec-loop
npm ci
npm install -g .
```

Keep the local repository folder in place because a global installation from a local directory can link to it. Then install the adapter from your target project using step 2 above.
