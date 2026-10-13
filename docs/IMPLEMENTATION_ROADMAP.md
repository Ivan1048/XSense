# XSense — Sequential Implementation Roadmap

**Date:** 13 October 2026  
**Baseline:** `elson`  
**Status:** Planning only; no phase marked complete by this document.

Implement one phase at a time. Inspect current code before starting; existing 3D geometry, simulations, lighting, SOS UI, and guard animations should be reused. This roadmap replaces the earlier foundation/demo phase numbering. Product requirements remain in `XSense_Complete_Requirements_for_AI_Agent.md`.

For each phase: agree its scoped implementation plan, implement, verify the completion gate, report results, and review before proceeding. Critical schema, SOS, assignment, and security work follows `AGENTS.md`; this roadmap does not authorize migrations, hardware purchases, commits, pushes, or live camera access. Use the user-specified branch; the current task is documentation on `elson`. Future feature branches normally start from `elson` under team policy.

## Phase 1 — Persistent backend and incident rules

**Outcome:** one authoritative, persistent incident and guard state.

**Work:**
- Define typed API contracts and SQLite/SQLAlchemy records for incidents, SOS, guards, observations, and activity history.
- Establish stable zone/device IDs and optional lamp/mount references now, so the schema does not require every sensor or incident to belong to a streetlight. Full camera inventory comes in Phase 3.
- Save an SOS and its linked urgent incident atomically. Store coordinates only when shared; accept requests without GPS.
- Enforce allowed status transitions, required closure notes, and guard availability on the server. Handle concurrent assignment, reassignments, releases, and retries without duplicate cases.
- Keep demo injections explicitly simulated; prepare a safe development database setup with documented migration/reset boundaries.

**Completion gate:** API checks prove restart persistence, linked SOS creation, repeat-request handling, rejected invalid transitions, and no double assignment. Existing frontend simulation still runs; cross-device UI is the next phase.

## Phase 2 — Complete SOS-to-guard workflow

**Depends on:** Phase 1.

**Outcome:** a resident and guard use separate browsers/devices against the same saved records.

**Work:**
- Connect the existing frontend to the API and normalize frontend/backend types.
- Remove timer-driven acknowledgement. Show received only after save, acknowledged only after a saved guard action, and assigned/arrived/resolved from actual state.
- Connect demo scenarios to the same incident source of truth. Avoid a second browser-local incident store silently diverging from the backend.
- Implement WebSocket notifications, polling fallback, resync on reconnect, safe retries, and honest offline/error states.
- Keep guard animations consistent with saved assignments while labeling locations simulated.

**Completion gate:** resident SOS → dashboard → acknowledgement → assignment → arrival → resolution works across two clients. Refresh and backend restart retain records; network interruption recovers without duplicate cases or fabricated status. Location permission denial remains usable.

**Milestone A:** working emergency-response software with simulated sensors.

## Phase 3 — Hybrid 3D inventory and coverage

**Depends on:** Phases 1–2.

**Outcome:** the map explains where cameras, sensors, lights, and monitoring gaps are.

**Work:**
- Add persistent camera, LiDAR, and audio inventory with positions, orientation, zone, optional mount, source, and health/integration status.
- Retain lighting poles independently; migrate existing fixture references compatibly.
- Show selectable CCTV markers, viewing direction, and estimated viewing volumes; independent LiDAR/audio positions; separate lighting and gap layers.
- Label coverage basis (estimated/verified), observation task, freshness, and degraded/unknown conditions. Demo cones are not measured detection guarantees.
- Prepare one CCTV-covered entrance, targeted LiDAR/audio path, overlap example, and explicit coverage gap.

**Completion gate:** a sensor can exist away from a lamp without breaking events; each layer/legend is understandable; inventory-only cameras never imply a live feed. Existing lighting and guard scenarios still work.

## Phase 4 — Explainable alerts and camera context

**Depends on:** Phase 3.

**Outcome:** guards see why an alert appeared and what evidence is available.

**Work:**
- Show source observations separately from the possible-event interpretation.
- Apply configurable time/zone association for movement and sound; unrelated observations must not automatically become an urgent combined event.
- Preserve independent silent-fall, audio-only, SOS, and manual guard-report paths. Group repeated observations without hiding a new SOS.
- Associate incidents with cameras by view coverage and availability; initial manually configured zone mappings are acceptable.
- For inventory-only or unavailable views, display “No camera view available. On-site check required.”
- Show unassigned cases and delayed response. Add supervisor escalation only with a designated recipient and agreed timing; demonstrate delivery locally first.

**Completion gate:** silent fall, audio-only, related/unrelated combined signals, manual report, no-camera, and offline-sensor scenarios produce appropriate, explainable outcomes. No crime-confirmation or unverified safe-route claims.

**Milestone B:** complete hybrid software demonstration; no physical sensing accuracy implied.

## Phase 5 — Real recorded-audio inference and evaluation

**Depends on:** Phase 4.

**Outcome:** sound scores come from actual inference rather than hard-coded demo values.

**Work:**
- Integrate YAMNet for selected permission-cleared recorded clips. Label these Recorded Sample, while keeping simulated inputs separate.
- Evaluate distress examples and ordinary sounds: rain, play, traffic, animals, conversation, and dropped objects.
- Separate tuning recordings/sessions from evaluation. Record misses, false alerts per monitored hour where continuous recordings permit it, and processing delay; short clips alone cannot establish field false-alert rates.
- Demonstrate real recorded audio alongside simulated movement with per-observation provenance; do not call the combined incident wholly live.

**Completion gate:** reproducible inference and an evaluation report with failures and dataset limits. Sound scores are not displayed as emergency probabilities. Live microphones remain optional and require a suitable test arrangement.

## Phase 6 — Authorized CCTV viewing (conditional)

**Depends on:** Phase 4; scheduled after Phase 5 for sequential delivery.

**Outcome:** a relevant camera view can actually be opened from an incident.

**Work:**
- Confirm access, compatible camera/video system, and viewing permissions before integration.
- Integrate one feed through an appropriate protected service; keep credentials out of frontend code and fixtures.
- Handle unavailable streams and distinguish live, recorded, and illustrative media. Test access restrictions.
- Recorded evidence retrieval needs separate access and retention decisions; PTZ control, AI CCTV analytics, and new recording are not required here.

**Completion gate:** one authorized view works from a relevant incident, fails honestly when disconnected, and is inaccessible to unauthorized users. If no camera access exists, mark this phase blocked/optional and retain inventory-only functionality; do not fabricate integration.

## Phase 7 — Small LiDAR/audio field pilot and comparison

**Depends on:** Phases 1–5; Phase 6 only if evaluating linked video.

**Outcome:** evidence about real sensing feasibility and installed value.

**Work:**
- Confirm hardware or suitable real recordings, site permission, mounting, power/networking, operator staffing, and budget. Acquire access information early, but do not purchase hardware from this roadmap alone.
- Survey higher-risk coverage gaps with staff. Compare a LiDAR/audio installation against adding infrared CCTV or improving lighting.
- Calibrate map coordinates and clocks; test distances, postures, occlusion, background noise, and relevant weather conditions using safe staged activities.
- Compare LiDAR-only, audio-only, combined sensing, and a defined camera baseline where available. Measure missed events, false alerts, location error, delay, and total installed/operating cost.
- Record detection boundaries, maintenance needs, and a go/no-go recommendation before expansion.

**Completion gate:** publish results and limitations based on real data. If results do not support reliable target-event detection or additional value, revise placement, scope, or technology. Do not translate simulation success into field accuracy.

**Milestone C:** evaluated pilot, not a production safety certification.

## Phase-close report

Record scope, files changed, commands actually executed, checks passed/failed/not run, demonstration steps, remaining risks, and branch/commit/push status. Update README status only after evidence supports completion. Leave later phases planned; do not start them automatically after a single-phase request.
