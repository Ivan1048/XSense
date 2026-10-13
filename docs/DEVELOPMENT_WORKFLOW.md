# XSense — Development and Review Workflow

## Team model
- **2–3 active coders** and **2–3 occasional contributors**.
- All contributors may create and push their own **feature branches**.
- **Project lead is the sole approver for merges into `main`**. Use repository permissions/branch protection when available; written rules alone cannot enforce permissions.
- Most contributors use **Antigravity**. The lead uses **Antigravity for routine work** and **Codex Desktop for consequential architecture, sensitive code, and focused reviews**.
- No one, including agents, should push directly to `main`.

## Current branch transition
- As of this policy's creation, **`main` is an old prototype**, while **`elson` is the current new application baseline**.
- Until the lead declares migration complete, create new feature branches **from `elson`** and propose integration into **`elson`**.
- When the lead approves replacing the old prototype, migrate to `main` through a separately reviewed PR. **Do not automatically delete, reset, or force-push `main`.**
- After that migration, the lead may explicitly change the integration base to `main`; update this document then.

## Branches and task ownership
- One primary owner per task. Use GitHub Issues for scope, assignee, and acceptance criteria.
- Branch examples: `feature/sos-persistence`, `fix/guard-double-assignment`, `docs/team-standards`.
- Keep changes isolated; share work via pushes/PRs, not simultaneous edits to a single working tree.
- Prefer **draft PRs** for unfinished collaboration.

## Risk-based development
**Small:** UI copy, style, small bug — Antigravity or developer implements with normal PR.
**Moderate:** feature components and integrations — concise implementation plan; peer review based on impact.
**Critical:** schema/migrations, SOS states, incident/guard assignment rules, permissions, privacy/security, real detection — approval-ready plan before editing; Codex for key decisions/logic or focused review, and human review before merging.

To minimize Codex Plus consumption, review changed paths/diffs and unresolved questions rather than the whole repository repeatedly.

## Approval points
- Developers can make ordinary edits and push their **own feature branches**.
- AI agents require explicit operator approval before commits/pushes, destructive operations, migrations, major refactors, or architectural deviations.
- PR authors cannot self-approve changes to `main`. Only lead approves final merge.
- Reject PRs that lack scope clarity, source labeling, or truthful verification.

## Typical task flow
1. Create/assign issue with acceptance criteria.
2. Branch from the agreed base.
3. Read relevant standards; submit critical design proposal if needed.
4. Implement focused changes.
5. Run suitable checks; inspect diff and secrets.
6. Open PR with the shared template and concise agent/developer work report.
7. Review, address feedback, and merge only after lead approval.

## Review checklist
- Does the change implement exactly the scoped behavior?
- Does it preserve 3D UI, incident/SOS correctness, privacy, source provenance and large-font usability?
- Are backend-owned states enforced by backend logic?
- Are commands, checks, and known limitations reported honestly?
- For critical changes: are concurrent or duplicate requests handled?
- Is documentation updated when required?

## MCP and agent transparency
- MCP enables tools; it does not enforce review policy or reveal an agent's private reasoning.
- Use native local file/terminal/Git capabilities first. GitHub MCP is optional for PR/issue actions.
- Do **not** introduce a custom MCP server/payload just for collaboration.
- Require visible plans before critical tasks; inspect diffs, commands and verification artifacts. Never represent agent explanations as a record of internal reasoning.

## Work report format
- Task / issue:
- Branch:
- Files changed and why:
- Commands run:
- Checks passed / failed / not run:
- Important decisions:
- Risks / limitations:
- Commit / push / PR status:
