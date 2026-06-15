# Agent Skill Usage

This document explains how different agent roles should use the skill system.

---

## General Rules (All Agents)

1. **Always start by reading `CLAUDE.md`** — it's the startup router.
2. **Then read `skills/REGISTRY.md`** — it's the skill index.
3. **Load only relevant skills** — don't load everything.
4. **Report which skills you loaded** in your plan or output.
5. **Skill wrappers point to source files** — follow the path to `sources/github/.../SKILL.md` for full instructions.
6. **Reporting Output**: When generating interactive reports, agents must use the Interactive HTML Reporting workflow. **Agents must NEVER read HTML files directly** to save tokens. Agents should only read internal Markdown (`.md`) files.

---

## Hermes / Orchestrator Agent

- Use `CLAUDE.md` as startup policy.
- Use `skills/REGISTRY.md` before routing tasks to sub-agents.
- When assigning work, specify which skills the sub-agent should load.
- Load `skills/workflow/` skills for planning and task decomposition.
- Load `skills/ai-agents/superpowers-using-skills.md` for skill composition strategy.
- Load `skills/ai-agents/manage-skills.md` when adding, configuring, or removing agent skills.

**Typical skill chain**: `workflow/superpowers-brainstorming.md` → `workflow/superpowers-writing-plans.md` → `workflow/superpowers-executing-plans.md`

---

## Coder Agent

- Load `skills/shared/karpathy-coding-principles.md` as baseline (always).
- Load domain-specific skills based on the task:
  - Frontend work → `skills/frontend/`
  - Backend work → `skills/backend/`
  - DevOps work → `skills/devops/`
  - Game dev → `skills/game-dev/`
- Load `skills/workflow/mattpocock-tdd.md` when writing tests.
- Do NOT load security skills unless the task involves security.
- Do NOT load all skills in a domain — pick the relevant ones.

---

## Security Agent

- Load `skills/security/anthropic-cybersecurity-index.md` to discover available security skills.
- Use the `index.json` in `sources/github/anthropic-cybersecurity-skills/` for programmatic skill discovery.
- Load specific security sub-skills based on task:
  - Threat modeling → `skills/security/threat-modeling.md`
  - Web security → `skills/security/web-security.md`
  - Cloud security → `skills/security/cloud-security.md`
  - Incident response → `skills/security/incident-response.md`
  - Secrets management → `skills/security/secrets-management.md`
- Also load relevant `skills/backend/` or `skills/devops/` skills when reviewing implementation.

---

## Reviewer Agent

- Load `skills/shared/karpathy-coding-principles.md` (always).
- Load `skills/workflow/superpowers-code-review.md` for review process.
- Load `skills/shared/mattpocock-diagnose.md` for diagnostic methodology.
- Load `skills/shared/mattpocock-architecture.md` for architecture review.
- Load domain-specific skills relevant to the code being reviewed.

---

## Planner Agent

- Load `skills/workflow/superpowers-brainstorming.md` for requirements.
- Load `skills/workflow/superpowers-writing-plans.md` for plan creation.
- Load `skills/workflow/mattpocock-grill-me.md` to interview the user.
- Load `skills/workflow/mattpocock-to-prd.md` for PRD generation.
- Load `skills/workflow/mattpocock-to-issues.md` for issue creation.
- Load `skills/workflow/mattpocock-triage.md` for backlog organization.
- Load `skills/ai-agents/manage-skills.md` for planning skill setup changes.

---

## Teaching Agent

- Load `skills/shared/mattpocock-teach.md` for teaching methodology.
- Load domain-specific skills relevant to the topic being taught.

## Troubleshooting: Source Fallback Protocol

If a skill wrapper's code example or API documentation fails to run in your workspace:
1. **Double Check Versions**: Verify the installed package version against the `verified_version` in the wrapper or registry.
2. **Escalate to Source**: Do not attempt to patch wrapper code from memory or guess API signatures. Navigate directly to the library's local upstream clone in `sources/github/`.
3. **Locate Ground Truth**: Inspect `AGENTS.md`, `CLAUDE.md`, or the `examples/` and `tests/` directories in the upstream repo to find the correct, updated API usage.
4. **Update the Wrapper**: Once you find the correct pattern and verify it works, update the skill wrapper file with the new pattern and the newly verified package version so future agents do not repeat the failure.

---

## Handoff Between Sessions

When ending a session:
- Load `skills/workflow/mattpocock-handoff.md` to serialize context.
- Save the handoff document in `memory/`.

When starting a new session:
- Check `memory/` for handoff documents from previous sessions.
- Load them to restore context before starting new work.
