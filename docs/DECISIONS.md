# XSense — Architectural Decision Log

Record **approved, consequential choices** here so teammates and AI agents can reuse the same reasoning. This is not a general task diary. For a new decision, add date, context, choice, trade-offs, approver, and superseded decision if any.

## ADR-001 — Privacy-first 3D park view
**Status:** Agreed project direction  
**Decision:** The guard dashboard prominently displays a low-poly 3D park, simulated LiDAR-style anonymous person dots, virtual sensor poles, lighting state, and incident markers. No camera/facial recognition. Avoid routine storage of individual resident trails.
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
