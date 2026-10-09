const reviewerName = 'specloop-reviewer';
export const hosts = {
  'claude-code': { skill: '.claude/skills/specloop/SKILL.md', reviewer: '.claude/agents/specloop-reviewer.md', activation: 'CLAUDE.md', personalSkill: '.claude/skills/specloop/SKILL.md', personalReviewer: '.claude/agents/specloop-reviewer.md', personalActivation: '.claude/CLAUDE.md', model: 'opus', reasoning: 'high', docs: 'https://code.claude.com/docs/en/sub-agents' },
  codex: { skill: '.agents/skills/specloop/SKILL.md', reviewer: '.codex/agents/specloop-reviewer.toml', activation: 'AGENTS.md', personalSkill: '.agents/skills/specloop/SKILL.md', personalReviewer: '.codex/agents/specloop-reviewer.toml', personalActivation: '.codex/AGENTS.md', model: 'gpt-6.1-sol', reasoning: 'high', docs: 'https://developers.openai.com/codex/subagents' },
  cursor: { skill: '.cursor/skills/specloop/SKILL.md', reviewer: '.cursor/agents/specloop-reviewer.md', activation: '.cursor/rules/specloop.mdc', personalSkill: '.cursor/skills/specloop/SKILL.md', personalReviewer: '.cursor/agents/specloop-reviewer.md', personalActivation: null, model: 'claude-opus-5[effort=high]', reasoning: 'high', docs: 'https://cursor.com/docs/subagents' },
  opencode: { skill: '.opencode/skills/specloop/SKILL.md', reviewer: '.opencode/agents/specloop-reviewer.md', activation: 'AGENTS.md', personalSkill: '.config/opencode/skills/specloop/SKILL.md', personalReviewer: '.config/opencode/agents/specloop-reviewer.md', personalActivation: '.config/opencode/AGENTS.md', model: 'openai/gpt-5', reasoning: 'high', docs: 'https://opencode.ai/docs/agents/' },
  antigravity: { skill: '.agents/skills/specloop/SKILL.md', reviewer: '.agents/agents/specloop-reviewer.md', activation: '.agents/rules/specloop.md', personalSkill: '.gemini/config/skills/specloop/SKILL.md', personalReviewer: '.gemini/config/agents/specloop-reviewer.md', personalActivation: '.gemini/config/rules/specloop.md', model: 'pro', reasoning: 'pro', docs: 'https://antigravity.google/docs/subagents' }
};
export function reviewerDefinition(host, model, prompt) {
  const name = JSON.stringify(reviewerName), description = JSON.stringify('Independent spec and implementation reviewer; use for specloop review rounds.');
  if (host === 'codex') return `name = ${name}\ndescription = ${description}\nmodel = ${JSON.stringify(model)}\nmodel_reasoning_effort = "high"\nsandbox_mode = "read-only"\ndeveloper_instructions = ${JSON.stringify(prompt)}\n`;
  let front = `name: ${name}\ndescription: ${description}\nmodel: ${JSON.stringify(model)}\n`;
  if (host === 'claude-code') front += 'effort: high\ntools: Read, Glob, Grep\n';
  if (host === 'cursor') front += 'readonly: true\nis_background: false\n';
  if (host === 'opencode') front += 'mode: subagent\nreasoningEffort: high\ntools:\n  write: false\n  edit: false\n  bash: false\n';
  if (host === 'antigravity') front += 'mainAgent: false\nsubagent: true\ntools:\n  - view_file\n  - grep_search\ncommandExecutionPolicy: off\n';
  return `---\n${front}---\n\n${prompt}`;
}
