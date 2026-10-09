# SpecLoop: user guide

SpecLoop helps your coding assistant turn a request into a reviewed implementation. You provide the requirements; the assistant writes a specification, gets an independent agent to review it, implements the agreed behavior, and handles review feedback and fixes.

Use it for feature requests, bug fixes, or work described in a project card. You only need your chosen coding assistant, not all five supported tools.

## Get started

For the full setup process, see the [installation guide](installation.md).

You need **Node.js 22 or newer**, your coding assistant, and access to a model that supports the configured reviewer settings.

Open a terminal and install the package:

```sh
npm install -g @prodipdatta7/specloop
```

Then open a terminal in **the project you want the assistant to work on** and run:

```sh
specloop install codex --default
```

Replace `codex` with `claude-code`, `cursor`, `opencode`, or `antigravity` as needed. Restart or reload your coding assistant to discover the installed skill and reviewer.

`--default` asks the assistant to use this workflow for ordinary implementation requests. Leave it out if you prefer to request the workflow explicitly. Installation adds instructions and a reviewer definition; your assistant still performs the work.

## What to ask

| Your goal | Example message to your assistant |
| --- | --- |
| Prepare requirements without coding | “Use specloop to prepare a spec from otg-card.md. Stop before implementation.” |
| Complete a feature | “Use specloop to implement this card: [link].” |
| Continue interrupted work | “Resume specloop run [run-id].” |
| Skip the workflow for one task | “Skip specloop for this request.” |

You can supply Jira or GitHub card links, existing specs or plans, screenshots, pasted requirements, or a combination. If a card is inaccessible, provide its relevant content in a file such as `otg-card.md`. Link access and screenshot reading depend on your assistant's available tools.

## What happens during a run

1. **Understand the request.** The assistant collects source material and checks the project context.
2. **Prepare the spec.** It records requirements and observable acceptance criteria. It asks about missing product decisions rather than inventing answers.
3. **Review the spec.** An independent reviewer checks completeness and clarity. The assistant fixes findings before establishing the approved baseline.
4. **Implement and check.** The assistant writes the code and runs the required checks.
5. **Review and fix.** The independent reviewer checks the actual implementation. The assistant processes findings and repeats as needed.

Prepare mode stops after step 3. Run mode continues through implementation. You should not need to open another review conversation or copy feedback between agents.

Work is complete only when the current implementation has full approval, its acceptance criteria are met, required checks pass, and no actionable findings remain. Finishing a plan or reaching a time limit does not count as completion.

## Where your work is saved

| Location in your project | What it contains |
| --- | --- |
| `specs/<feature-id>/spec.md` | The authoritative specification |
| `specs/<feature-id>/plan.md` | Implementation steps |
| `specs/<feature-id>/sources/` | Supporting requirements and images |
| `.agentic-workflow/runs/` | Saved progress, checks and review rounds |
| `.agentic-workflow/config.json` | Project settings |

Ask your assistant to update the spec when requirements change. Generated JSON is not a second spec to maintain. On resume, changed specifications or implementation files invalidate affected approvals.

## Controls and things to know

Run these commands from your target project:

```sh
specloop config
specloop disable
specloop enable --default
specloop update
specloop uninstall
```

- **Limits:** Defaults are eight review rounds and 120 minutes across both review loops. Reaching a limit saves incomplete work. Ask the assistant to resume with explicitly increased limits if needed.
- **Your files:** Disabling or uninstalling preserves specs and run history. Updates stop on conflicts with edited managed files; uninstall preserves those edits.
- **Team settings:** Project configuration overrides personal defaults. Start with project installation; personal setup has some host-specific steps described in the [README](../README.md).
- **Privacy and cost:** Source copies and review snapshots may contain private project material. Check what you share or commit. Model usage runs through your assistant and may consume its allowance or incur charges.
- **Current maturity:** This is an initial implementation. Automated checks cover the package, but end-to-end operation through all five generated host adapters remains unverified. An unavailable reviewer or interrupted host cannot count as approval.

For troubleshooting and advanced commands, see the [CLI guide](cli.md). For host setup details and testing limits, see [adapters](adapters.md) and [validation status](integration-status.md).
