# ADR 001: Structured Skill Folder and Routing Protocol

## Status
Accepted

## Context
AI coding agents (such as Claude Code, Hermes, and other agentic workflows) perform best when given targeted, structured context. 
Dumping dozens of community-shared repositories containing hundreds of skill markdown files directly into a flat folder would cause:
1. **Context Bloat**: Agents loading too many irrelevant files, wasting input token limits and slowing down responses.
2. **Path Resolution Confusion**: Agents failing to find or distinguish between similarly named skills across different projects.
3. **Upstream Maintenance Pain**: Difficulty pulling updates or bugfixes from original source repositories.

We need a design that separates the actual upstream repository contents from the active agent routing and discovery system.

## Decision
We establish a two-tiered skill system consisting of **Sources** and **Wrappers/Registry**:

1. **Upstream Source Repositories (`sources/github/`)**:
   Original community-shared repositories are cloned as clean, unmodified directories. This allows pulling updates directly via git without breaking references.

2. **Categorized Skill Wrappers (`skills/`)**:
   Instead of copying all markdown files, we create thin wrapper markdown files in clean category folders.
   - Each wrapper defines what the skill does, when to load it, and provides a direct markdown link (`file:///...`) to the full documentation in `sources/github/`.
   - Category folders: `frontend/`, `backend/`, `security/`, `devops/`, `ai-agents/`, `workflow/`, `shared/`, `coding/`, and `game-dev/`.

3. **Routing Registry (`skills/REGISTRY.md` and `CLAUDE.md`)**:
   - `CLAUDE.md` serves as the entry startup procedure, instructing any agent to immediately read `skills/REGISTRY.md`.
   - `skills/REGISTRY.md` maintains a structured, prioritized index of all wrapper paths, their sources, use cases, and load priorities (High/Medium/Low).

## Consequences

### Positive
- **High Efficiency**: Agents only load the small wrapper file to decide if they need the full skill, minimizing token overhead.
- **Easy Upstream Updates**: We can easily update, pull, or reinstall repositories in `sources/github/` without affecting the wrapper paths.
- **Clean Structure**: The codebase is neat, structured, and self-documenting.

### Negative
- **Path Dependencies**: Wrapper files rely on exact relative file paths to the cloned repos. If upstream repository structures change significantly, the links in the wrappers and registry must be updated.
