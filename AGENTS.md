# XSense — Shared AI Agent Instructions

These rules apply to **Antigravity, Codex, and other AI coding agents** working on this repository. Human contributors follow the same engineering and review standards. Agent instructions are not a security boundary.

## Read the right context, not the whole repository
- Always confirm the current branch and read the files relevant to the task.
- `README.md`: existing setup and implementation status.
- `DESIGN.md`: current architecture.
- `XSense_Complete_Requirements_for_AI_Agent.md`: product and safety requirements.
- `docs/CODE_STANDARDS.md`: coding standards.
- `docs/UI_DESIGN.md`: UI changes.
- `docs/DEVELOPMENT_WORKFLOW.md`: collaboration, review, and permissions.
- `docs/DECISIONS.md`: agreed decisions.
- `docs/IMPLEMENTATION_ROADMAP.md`: current phase numbering, dependencies, and completion gates. Implement only the requested phase; do not automatically continue to the next.
- `XSense_Plan_Comparison.md`: initial plan versus current hybrid direction.

Do not read entire long documents unnecessarily; focus on the relevant sections. If the implementation conflicts with the requirements, report the conflict rather than silently changing the requirements.

## Roles and task risk
- **Small:** copy, styling, isolated fixes; Antigravity typically implements.
- **Moderate:** components and straightforward integrations; Antigravity typically implements, with focused review as needed.
- **Critical:** architecture, database/schema/migrations, SOS workflow, emergency state changes, authentication, security/privacy, concurrency, dispatch/assignment correctness, and real sensing/AI claims. Prepare an approval-ready plan first. Use Codex for consequential architecture/logic or a **focused diff review**. Humans remain responsible for approval.
- Reduce Codex Plus usage: supply a narrow question, exact affected paths, and diffs instead of requesting broad repository rewrites.

## Before changing code
1. State the goal, scope, relevant files, and acceptance criteria.
2. Check current code, types, and existing patterns.
3. For moderate or critical work, propose a concise plan with risks and verification.
4. **Wait for the task owner to approve critical plans and major changes.**

## While changing code
- Keep edits scoped, readable, and consistent with existing architecture.
- Reuse components; avoid unnecessary dependencies, APIs, and infrastructure.
- Separate 3D visualization, simulations, network state, and actual incident rules.
- Do not overwrite colleagues' work, discard uncommitted changes, or run destructive commands.
- Never commit secrets, tokens, real resident data, or `.env` files.
- Do not directly change `main`; work in a task branch based on the agreed branch.
- Agents must request explicit approval before commit/push, dependency changes with security implications, database migrations, or merges; human teammates may push their own feature branches under team policy. Only the designated project lead approves merges to `main`.

## Current product direction — 13 October 2026
- Build toward a **hybrid park safety system**: existing CCTV context, targeted LiDAR and sound detection, resident SOS, and coordinated guard response. Privacy is a supporting safeguard, not the primary selling point.
- The 3D map must show camera locations, viewing direction, and **estimated** coverage. Inventory markers do not imply working feeds, footage retrieval, or AI CCTV analytics.
- Prioritize LiDAR/audio placement in higher-risk areas with inadequate monitoring, based on site inspection, incident reports, and staff input. Streetlights remain valid mounts when suitable; their positions do not dictate placement.
- Separate device IDs, positions, and coverage from lamp/mount IDs. Preserve existing fixtures compatibly; do not silently relocate sensors without updating their zone/event references.
- Darkness alone does not justify LiDAR. Compare infrared CCTV and lighting improvements; sensors do not replace pedestrian lighting or see through opaque obstacles.
- Keep CCTV, LiDAR, audio, lighting, and coverage-gap layers distinct. Show estimated/verified coverage basis and degraded/unknown conditions; never equate a viewing cone with reliable identification or fall detection.
- Offer a camera view only when coverage and an authorized connection support it, not simply because it is nearest. Otherwise show **“No camera view available. On-site check required.”**
- Live feeds, evidence retrieval, PTZ control, and AI CCTV analytics are later integrations; do not invent streams, expose camera credentials, or add automatic cross-sensor identity matching.
- Relate sound and movement using justified time/location windows. Silent possible falls remain reviewable; SOS bypasses AI approval. Unreported incidents without distinctive signals may be missed.
- Prioritize persisted incident/SOS workflows and real acknowledgements, then independent device/coverage mapping, recorded-input evaluation, and a scoped pilot. Do not treat planned capabilities as implemented.
- Compare missed events, false alerts per monitored hour, location error, delivery/response delay, and installed cost before claiming superiority over CCTV. Simulation validates workflow, not field accuracy.

## Product safeguards
- LiDAR-style detections are **anonymous**, not identified residents or guards.
- Guards appear via **separate, labeled guard-location data**, simulated until integrated with a verified source; don't automatically merge guard markers and LiDAR dots.
- No default storage of raw recordings, point clouds, or continuous resident trajectories.
- Lighting, LiDAR, and physical responses remain **simulated** unless actually connected and verified.
- Do not present a sound score or stopped dot as proof of an emergency.
- SOS status must reflect persisted, real guard actions; **never use a timer to fake guard acknowledgement**.
- Do not claim a guard was assigned, arrived, or dispatched until confirmed by saved system state.
- No autonomous emergency-service dispatch or unverified safe-route assurances.

## Design
Follow `docs/UI_DESIGN.md`: simple, clean, spacious, large readable text, plain-language dashboard labels, clear source labels, and accessible mobile SOS.

## After every task — concise work report
- Files changed and why
- Commands **actually** executed
- Checks **passed, failed, or not run**
- Important decisions and risks
- Current branch, commit, and push status
- Known limitations and next steps

Never claim unexecuted checks succeeded. Small-task reports may stay in chat; significant changes belong in the pull request.
