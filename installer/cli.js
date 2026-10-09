#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { install, uninstall, setEnabled } from './install.js';
import { config, prepare, intake, normalize, resume, beginReview, recordVerification, acceptReview, withRun, stateOf } from '../core/runtime.js';
import { readJSON, writeJSON, inside } from '../validation/io.js';

const help = `specloop <command> [arguments] [--root directory]
  install <claude-code|codex|cursor|opencode|antigravity> [--personal] [--default] [--model ID]
  update [--personal] [--model ID]    Preserve edited files; stop on conflicts
  enable [--default] | disable | uninstall [--personal]
  config                           Print effective configuration
  prepare <feature> | run <feature> Start a saved workflow; host agent carries it out
  intake <run> <file> [--kind file|link|screenshot|chat] [--origin reference]
  normalize <run>                   Validate canonical spec and emit JSON/report
  review <run> <spec|code> --primary ID --model ID --reasoning high|pro
  verify <run> <json-file>           Record check evidence for pending snapshot
  feedback <run> <json-file>         Validate independent review and advance state
  resume <run> | cancel-review <run>
  extend <run> --rounds N --minutes N  Increase total budgets explicitly
The CLI does not run an LLM. Invoke the installed host skill for end-to-end work.`;
try {
  const { positionals: args, values: flags } = parseArgs({ allowPositionals: true, options: {
    root: { type: 'string' }, personal: { type: 'boolean' }, default: { type: 'boolean' }, model: { type: 'string' }, primary: { type: 'string' }, reasoning: { type: 'string' }, kind: { type: 'string' }, origin: { type: 'string' }, rounds: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' }
  } });
  const [command, first, second] = args;
  const root = path.resolve(flags.root ?? (flags.personal ? os.homedir() : process.cwd()));
  let result;
  if (!command || flags.help || command === 'help') result = help;
  else if (command === 'install') result = install(root, first, { personal: flags.personal ?? false, model: flags.model, defaultWorkflow: flags.default });
  else if (command === 'update') { const old = readJSON(inside(root, '.agentic-workflow/installation.json')); result = install(root, old.host, { personal: old.personal, model: flags.model, defaultWorkflow: flags.default }); }
  else if (command === 'uninstall') result = uninstall(root);
  else if (command === 'enable' || command === 'disable') result = setEnabled(root, command === 'enable', flags.default);
  else if (command === 'config') result = config(root);
  else if (command === 'prepare' || command === 'run') result = prepare(root, first, command);
  else result = withRun(root, first, () => {
    if (command === 'intake') return intake(root, first, second, flags.kind, flags.origin);
    if (command === 'normalize') {
      const loaded = normalize(root, first);
      if (!loaded.report.ready) process.exitCode = 2;
      return loaded.report;
    }
    if (command === 'review') return beginReview(root, first, second, flags.primary, flags.model, flags.reasoning);
    if (command === 'verify') return recordVerification(root, first, readJSON(second));
    if (command === 'feedback') return acceptReview(root, first, readJSON(second));
    if (command === 'resume') return resume(root, first);
    if (command === 'cancel-review' || command === 'extend') {
      const state = stateOf(root, first);
      if (command === 'cancel-review') { state.pending = null; state.approval = null; state.stage = state.baseline ? 'implement' : 'draft'; }
      else {
        for (const [flag, key] of [['rounds', 'maxRounds'], ['minutes', 'maxMinutes']]) if (flags[flag]) {
          const value = Number(flags[flag]);
          if (!Number.isInteger(value) || value <= state.limits[key]) throw Error('Budget extensions must increase positive integer limits');
          state.limits[key] = value;
        }
      }
      writeJSON(inside(root, `.agentic-workflow/runs/${state.runId}/state.json`), state);
      return resume(root, first);
    }
    throw Error(`Unknown command: ${command}`);
  });
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
