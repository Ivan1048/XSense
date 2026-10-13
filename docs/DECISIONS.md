# XSense — Architectural Decision Log

Record **approved, consequential choices** here so teammates and AI agents can reuse the same reasoning. This is not a general task diary. For a new decision, add date, context, choice, trade-offs, approver, and superseded decision if any.

## ADR-001 — Privacy-first 3D park view
**Status:** Partially superseded by ADR-006 on 13 October 2026 (privacy-first positioning and no-camera scope). Anonymous visualization and data minimization remain applicable.

**Historical decision:** The guard dashboard prominently displays a low-poly 3D park, simulated LiDAR-style anonymous person dots, virtual sensor poles, lighting state, and incident markers. No camera/facial recognition. Avoid routine storage of individual resident trails.
**Why:** Demonstrate spatial awareness while minimizing unnecessary identifying information.
**Limitation:** Prototype positions are simulated, not a validated live digital twin.

## ADR-002 — Guard position is not LiDAR identity
**Status:** Agreed project direction  
**Decision:** Cyan anonymous dots represent LiDAR-style detections; separate blue shield markers represent reported guard position from an independent **simulated** guard-location source. No automatic identity linkage to LiDAR dots.
**Why:** LiDAR geometry alone cannot reliably distinguish a guard from a resident.
**Future option:** Authorized BLE/UWB tracking only after privacy and field validation.

## ADR-003 — Human-controlled emergency response
**Status:** Agreed project direction  
**Decision:** SOS requests are urgent immediately. Possible silent falls must be reviewable. Guards acknowledge, assign, arrive, and resolve through explicitly recorded actions. No timed fake acknowledgment or automatic emergency-service dispatch.
**Why:** Prevent misleading safety claims and status messages.

## ADR-004 — Backend as shared source of truth (target)
**Status:** Approved target; implementation may be incomplete  
**Decision:** FastAPI and SQLite should persist SOS, incidents, assignments and review history; frontend displays confirmed states with WebSockets/polling for cross-device updates.
**Why:** React component memory alone does not support reliable multi-device workflows.
**Note:** Confirm the current implementation before marking this complete; the existing code may still use mock/in-memory state.

## ADR-005 — Collaboration and agent usage
**Status:** Team working agreement  
**Decision:** Use feature branches, scoped PRs, shared `AGENTS.md`, and human merge approval. Antigravity handles most routine code; Codex prioritizes important decisions, critical logic, and focused reviews, reducing Plus-plan usage.
**Why:** Consistency, transparent reviews, and manageable AI usage.

## ADR-006 — Hybrid coverage and targeted sensor placement
**Date:** 2026-10-13

**Status:** Approved planning direction; implementation pending.

**Context:** The team retained LiDAR, sound detection, and the 3D park but shifted the main focus to possible-distress awareness and response. Existing CCTV can provide useful context where coverage exists.

**Decision:** Map camera locations, viewing direction, and estimated coverage. Locate LiDAR/audio according to higher-risk monitoring gaps established through inspection, incident history, and staff input. Streetlights are optional suitable mounts, not mandatory sensor sites. Separate device, lighting, and coverage records. Preserve SOS, anonymous detections, and independently sourced guard markers.

**Alternatives considered:** Additional infrared cameras, lighting improvements, and retaining the earlier camera-free scope. Evaluate alternatives at the proposed site rather than assuming LiDAR is superior in darkness.

**Trade-offs:** LiDAR cannot see through obstacles or detect every silent incident. New mounts require power, networking, maintenance, and cost assessment. Camera markers do not provide footage; feeds, evidence retrieval, PTZ, and AI CCTV analytics remain separate later integrations. Unknown coverage must remain visible. No-camera incidents require an on-site check where appropriate.

**Approved by:** Task owner through the planning discussion and instruction to update the project documentation; no hardware purchase or live integration authorized.

**Supersedes:** ADR-001's privacy-first positioning and prohibition on camera context only. Other safeguards and human approval policies remain.

## New decision template
```markdown
## ADR-00X — Short title
**Date:** YYYY-MM-DD
**Status:** Proposed / Approved / Superseded
**Context:** What problem are we solving?
**Decision:** What was approved?
**Alternatives considered:** What else could work?
**Trade-offs:** Costs and limitations.
**Approved by:** Role or reviewer
```
