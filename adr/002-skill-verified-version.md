# ADR 002: Skill Verified Version Pinning Protocol

## Status
Accepted

## Context
During initial real-world testing of our AgentOS skill stack, 4 out of 7 encountered issues were caused by library version mismatches and API surface changes (e.g., CocoIndex v0 vs v1, Mem0 v1 vs v2 search API). 
Without explicit version information inside the skill wrapper files:
1. **API Mismatch**: Agents attempt to use deprecated or incorrect function call signatures documented in outdated skills, leading to immediate code crashes.
2. **Maintenance Blindspots**: Maintainers have no clear way to know which major or minor versions a skill was written and tested against, making re-verification and upgrades error-prone.
3. **No Warning Systems**: There is no metadata available for agents to check the local environment (`pip show`, `npm list`, etc.) and warn the user before running code.

We need a standardized protocol to record the tested library version on every skill wrapper and register.

## Decision
We require all skill wrappers for runtime libraries/SDKs to include verified version pinning metadata at the top of the file:

1. **Header Metadata**:
   Each skill wrapper must include a blockquote line indicating the verified package version(s).
   - Format: `> **Verified:** package_name>=x.y.z (API version vN)`
   - Multiple packages should be separated by commas, or listed on consecutive blockquote lines.

2. **Registry Inclusion**:
   The `skills/REGISTRY.md` must display the verified version in its registry table or list so agents can check versions at discovery time.

3. **Agent Warning Duty**:
   When loading a skill wrapper, agents should check the installed packages in the current environment. If the installed version has a major version mismatch or is lower than the verified version, the agent must warn the user of potential compatibility issues before running task code.

## Consequences

### Positive
- **API Stability**: Agents are aware of the version compatibility bounds and can proactively flag deprecations or differences.
- **Improved Maintainability**: Clear, explicit baseline for which version needs re-verification during library updates.
- **Better Debugging**: Speeds up root cause analysis when a script fails.

### Negative
- **Minor Overhead**: Creating or importing a skill wrapper now requires confirming the tested library version.
- **Doc Updates**: When upgrading packages in a project, the wrapper files might need metadata updates after testing.
