# XSense — Complete Product, Engineering & Design Requirements

**Version:** 1.0 · **Status:** Implementation specification for an AI coding agent  
**Project:** Privacy-preserving smart park safety system  
**Tagline:** **Park safety without continuous video.**

> **How to use this file:** Build the **Must** requirements first. Preserve a clear distinction between **working software**, **simulated sensor readings**, and **future physical capabilities**. Do not add features outside the agreed scope without approval. This specification is based on the finalized XSense concept and our agreed 3D dashboard decisions; it is not a claim that sensors or emergency infrastructure have been validated.

---

## 1. Product goal

XSense helps park security teams notice possible emergencies, understand **where** help may be needed, and manage their response—without relying on continuous camera footage.

Build **two clean, simple, responsive interfaces**:

1. **Guard Dashboard** — staff view an interactive 3D park, anonymous moving dots, lighting warnings, possible emergencies and guard response actions.
2. **Resident SOS Page** — residents scan a QR code and request help through a simple mobile webpage, without installing an app.

**System inputs:** simulated LiDAR position/fall data, simulated light readings, real or recorded audio run through a sound model, and manual resident SOS. **Outputs:** human-readable alerts, 3D highlighting, lighting demonstrations and incident records.

### Primary user journeys

- **Guard:** Open park overview → notice incident or dark area → inspect location → acknowledge → assign/respond → record outcome.
- **Resident:** Scan park QR → open SOS page → press Request Help → optionally share location or select park zone/pole → see accurate request status.
- **Team demonstration:** Trigger normal activity, benign noise, possible scream, possible silent fall, combined signals, SOS, dark pathway and sensor failure; see appropriate outcomes.

---

## 2. Scope and priorities

### Must — complete software prototype

| ID | Requirement | Expected result |
|---|---|---|
| M01 | Simple Guard Dashboard | One clear overview of park status and incidents. |
| M02 | Interactive 3D park | Pre-built low-poly park; drag/zoom/select; five named poles. |
| M03 | Anonymous moving dots | Dot positions update from **simulated** LiDAR-style readings; no identity or face. |
| M04 | Emergency scenarios | Normal, benign noise, possible scream, possible fall, combined event, SOS and sensor failure. |
| M05 | Explainable alert levels | **Normal / Low / Needs Review / Urgent / Coverage Warning** with a short reason. |
| M06 | Incident workflow | Create, acknowledge, assign, investigate, resolve or mark false alarm. |
| M07 | Lighting status | View lights and highlight virtual dark areas; notify guards for low lighting. |
| M08 | Safety-aware light response | Illuminate an incident area; only display route guidance when a route has been validated in the simulation. |
| M09 | Resident Web SOS | QR entry, prominent request button, optional location, zone fallback, real request status. |
| M10 | Database | Save sensors, incidents, SOS, feedback and audit events. |
| M11 | Feedback records | Guard can mark true incident / false alarm / uncertain and add a short note. |
| M12 | Live updates | New alerts and status changes appear without manual page refresh. |
| M13 | Privacy | No camera views; no unnecessary raw audio, identity or travel-history storage. |
| M14 | Provenance labels | Every incident says **Simulated**, **Recorded Sample** or **Live Audio** as appropriate. |
| M15 | Accessible, plain-language UI | Large readable text, clear actions and simple names for all features. |

### Should — after the core journey works

- Run **YAMNet** on recorded audio clips and, if permissions allow, a user-selected microphone source. Display *possible sound*, not a confirmed emergency.
- Show a simple graph of incidents by type and time. Avoid making analytics the main screen.
- Show a list of approved exits and first-aid locations **only if verified**; optional AED information may be added later.
- Save and reload a small set of demonstration scenarios.
- Offer a clearly labeled **Demo Reset** control.

### Later / not part of this software prototype

- Real LiDAR hardware or real-world LiDAR fall accuracy claims.
- Physical streetlight control, brightness sensors, LoRaWAN gateway or cellular integration.
- Automatic AI retraining from guard feedback.
- Continuous Safe Run tracking, social matching, drones, facial recognition, personal profiles or camera feeds.
- Autonomous emergency-service dispatch or promises of guaranteed protection.
- Public production deployment or 24/7 service-level commitments.

---

## 3. Guard Dashboard — pages and behavior

**Preferred navigation:** **Park Overview · Incidents · System**. The 3D park is the **main feature**, not a hidden secondary page. Avoid a large collection of separate admin pages.

### 3.1 Park Overview (default page)

**Desktop layout:** wide 3D park panel on the left (about 65–70%); compact information panel on the right (about 30–35%). One simple top bar with logo, park name, active alert count and obvious **Demo Mode** label.

**Above the fold, show:**

- Large heading: **Park Overview**.
- One short sentence: **“See park activity, lighting and alerts.”**
- Three compact summary values: **Needs Attention**, **Dark Areas**, **Sensors Offline**.
- Main 3D park with selectable poles, resident dots and issue markers.
- Right panel: **Selected Area**, **Recent Alerts**, and clearly named scenario controls (demo only).

**3D viewer requirements**

- Render a low-poly park with paths, grass, trees, benches, entrance/exit, and **five poles: AS-101 through AS-105**.
- Use a **hybrid design**: static/pre-built park geometry plus live-updating *simulated* dots, markers and lights.
- Orbit, zoom, pan/reset-view controls. Add an easy **Reset View** button.
- Pole click/tap selects it and opens a clear summary: ID, area name, **Sensor Status**, **Lighting**, and current alerts.
- Dots represent temporary anonymous detections. No names, faces, gender, exact identity or permanent tracking IDs displayed.
- Optional **Show Sensor Coverage** overlay, clearly marked **Illustrative**; do not claim the coverage radius is measured.
- Use clear marker differences: normal, needs review, urgent, light problem, sensor offline; include a visible legend and text labels, not color alone.
- Virtual brightness values and 3D visuals are separate: a nice-looking rendered scene is **not** evidence that a real path is safe or bright enough.
- Keep camera movement smooth and restrained; offer **Pause Motion** and respect reduced-motion preferences.
- Prefer simple geometry/performance over detailed realistic terrain. Keep initial asset count low.

**Dark area behavior**

- A simulated light/pole can be set to low or off. Calculate a simple **virtual path brightness status** using predefined path zones and nearby light settings.
- When a path falls below the **demo threshold**, highlight that zone and create a **Lighting Warning** for guard review.
- Do **not** automatically call it physically unsafe or show actual lux measurements.
- Acknowledge and resolve lighting warnings separately from emergency incidents.
- Guard can inspect the affected area and see which virtual poles contribute to it.

**Emergency lighting behavior**

- A possible emergency can brighten nearby **virtual** lights as a simulation.
- Lighting should focus first on the local incident area.
- A simulated guidance corridor may appear only when its route is marked open/approved and does not pass through a known hazard.
- If a safe route cannot be determined, display **“Nearby lights on — route not verified.”** Never direct people into an uncertain area.

### 3.2 Incidents

- Show a simple list: **Location · What happened · Priority · Time · Status · Source**.
- Allow filters: **All**, **Needs Review**, **Urgent**, **In Progress**, **Closed**.
- Incident detail shows a short plain-English reason, map location, source type, event time, and actions.
- Primary actions: **Acknowledge**, **Assign Guard**, **Mark Arrived**, **Resolve**, **False Alarm**.
- Require a short outcome note when closing or marking false alarm; prevent contradictory transitions.
- Show a short activity trail with timestamps (created, received, acknowledged, assigned, resolved).
- If no incident exists, show friendly empty state: **“No active alerts.”**
- Prevent assigning one guard to multiple active incidents unless explicitly allowed and clearly shown.

### 3.3 System

Put supporting details here, without crowding the main view:

- **Sensor Status:** Online / Needs Attention / Offline; last update; affected area.
- **Lighting Status:** Normal / Low / Offline by path or pole.
- **Incident History:** recent closed cases and guard feedback.
- **Simple Insights (optional):** incident counts and false-alarm counts.
- **About & Privacy:** short explanation of what is and isn't collected.
- **Demo Controls:** reset, sample scenarios, simulation settings behind an expandable section.

---

## 4. Resident SOS Page — simple mobile-first design

**Access:** scan QR at park entrance or selected pole → open a mobile-friendly URL. No resident account and no installation required for basic SOS.

### 4.1 Default screen

- XSense name and clear heading **“Need Help?”**.
- One reassuring description: **“Send a request to park security.”**
- One large, highly visible **“Request Help”** button (not buried in a menu).
- Show **Park / Entrance / Pole ID** if provided by QR code.
- Secondary options: **“Use My Location”** (asks permission) and **“Choose My Area”** (manual fallback).
- Direct **“Call 999”** link using `tel:999`, clearly explaining this contacts public emergency services.
- Small, readable privacy note: **“Your location is shared only if you choose to.”**

### 4.2 SOS flow

1. Resident opens QR URL; prefill verified park/pole ID if encoded in the QR.
2. Resident chooses location source: phone location **with permission**, QR's fixed pole location, or manual zone choice. No silent location collection.
3. Press **Request Help**. Avoid slow multi-step forms; if a confirmation step is used, it must not create unnecessary emergency delay.
4. Submit to backend and show **“Sending request…”**. Handle timeout and errors honestly.
5. After server/database accepts: **“Request received by XSense.”** Do *not* claim a guard saw it yet.
6. After guard action: **“Guard acknowledged your request.”** Add **“Help is being arranged”** only when a dispatch/assignment is actually recorded.
7. Show a request reference and a prominent **Call 999** option throughout.

**No internet:** explain **“Unable to send your request. Call 999 or seek nearby assistance.”** QR codes do not transmit messages by themselves.

**Duplicate requests / misuse:** add server-side rate limits, request reference IDs, repeat-click prevention and an operator review process. Do not prevent legitimate SOS solely because a user lacks location permission.

---

## 5. Alert and incident rules

| Alert type | When | Dashboard action |
|---|---|---|
| **Normal** | Typical activity or benign rain/wildlife | No emergency case; optional demo log. |
| **Low** | Weak, uncertain signal | Briefly log / local assist where appropriate; no automatic dispatch. |
| **Needs Review** | Credible possible scream OR a persistent possible fall without sound | Notify guard; show evidence and uncertainty. |
| **Urgent** | Resident SOS or corroborating serious signals | Prominent guard alert; prompt human response. |
| **Coverage Warning** | Pole offline, stale readings or lost communication | Warn monitoring may be unavailable; never show “all clear.” |
| **Lighting Warning** | Simulated path below demo light threshold | Highlight path and request inspection; separate from emergency priority. |

**Non-negotiable rules**

- **A silent possible fall must be reviewable**; do not require a scream for every fall alert.
- **SOS is urgent immediately** and never waits for AI approval.
- Detection confidence is a *model score*, not proof of an emergency or certified accuracy.
- Do not auto-call 999, automatically dispatch emergency responders, or imply a guard was dispatched until that happened.
- Suppress repeated duplicate sensor alerts within a short configurable window; never hide a new SOS because of deduplication.
- If sensors fail, show reduced coverage clearly rather than silently clearing warnings.
- Distinguish **event received by server**, **shown on dashboard**, **acknowledged by guard**, and **guard assigned**.

---

## 6. Simulation requirements and sample scenarios

Everything below is simulated unless explicitly connected to an actual input.

| Scenario | Input | Required visible result |
|---|---|---|
| Normal walk | Dots move along paths | Normal overview; no incident. |
| Benign rain | Simulated benign audio event | No urgent alert. |
| Possible scream | Recorded audio through YAMNet **or** labeled simulated score | Needs Review; reason and source visible. |
| Silent possible fall | Simulated depth/position change + duration, not merely a stopped dot | Needs Review without an audio signal. |
| Combined anomaly | Possible distress sound plus fall near same pole/time | Urgent alert. |
| Resident SOS | Web SOS submission | Urgent incident and accurate status updates. |
| Dark pathway | Turn a virtual light off / lower area brightness | Highlight area and show Lighting Warning. |
| Sensor offline | Simulate missed heartbeat | Coverage Warning; uncertain monitoring status. |
| Unsafe route | Block a path in simulation | No unsafe guidance; local lights only or approved alternative. |

**Data provenance:** attach `source_mode = simulated | recorded | live` to every event. Visible display labels: **Simulated**, **Recorded Sample**, **Live Input**. “Live Input” must never be used for fabricated values.

---

## 7. Suggested free-first technical stack

**Build scope only. Do not add hosting/deployment services, production infrastructure, hardware purchases or test-tool stacks to the main implementation plan.**

| Area | Recommended tool | Official source / purpose |
|---|---|---|
| Guard and resident web interfaces | **React + TypeScript + Vite** | [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Vite](https://vite.dev/) |
| Styling | **Tailwind CSS** or plain CSS | [Tailwind](https://tailwindcss.com/). Pick one consistent design approach. |
| Browser 3D rendering | **Three.js + React Three Fiber + Drei** | [Three.js](https://threejs.org/) · [R3F](https://r3f.docs.pmnd.rs/) · [Drei](https://github.com/pmndrs/drei) |
| Optional 3D modeling | **Blender** (export `.glb`) | [Blender](https://www.blender.org/). Primitive shapes are acceptable initially. |
| Backend and API | **Python + FastAPI + Pydantic** | [Python](https://www.python.org/) · [FastAPI](https://fastapi.tiangolo.com/) |
| Real-time updates | **WebSockets** | [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/) |
| Sound recognition | **YAMNet + TensorFlow** | [YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet) · [TensorFlow](https://www.tensorflow.org/) |
| Audio preparation | **Librosa / SoundFile** (if needed) | [Librosa](https://librosa.org/) · [SoundFile](https://pysoundfile.readthedocs.io/) |
| Simulated position/depth | **TypeScript**; **NumPy/Open3D** only if working with actual point-cloud datasets | [NumPy](https://numpy.org/) · [Open3D](https://www.open3d.org/) |
| Local database | **SQLite + SQLAlchemy** initially; PostgreSQL later if needed | [SQLite](https://sqlite.org/) · [SQLAlchemy](https://www.sqlalchemy.org/) |
| QR generation | **qrcode.react** | [Source](https://github.com/zpao/qrcode.react) |
| Optional simple charts | **Recharts** | [Source](https://recharts.org/) |

**Keep dependencies minimal.** Do not introduce paid AI APIs. For this prototype, browser-based 3D models and simulated LiDAR readings are sufficient; real 3D scanning is not a dependency.

### Simple architecture

```text
         SOUND INPUT                   3D PARK SIMULATION
      Recorded/live clips             Dots / falls / lighting
              |                                  |
        YAMNet classifier                 Virtual sensor events
              |                                  |
              +------------------+---------------+
                                 |
                        FastAPI event rules <----- Resident SOS page
                                 |
                    SQLite incident database
                                 |
                    Live WebSocket updates
                                 |
                         GUARD DASHBOARD
                   3D Park / Alerts / Response
```

**Important:** 3D scene positions and backend events should share stable pole IDs and path-zone IDs. Visual appearance must never be treated as sensor proof.

---

## 8. Minimal data model

Keep one database. Suggested tables and fields (adapt names to the codebase but preserve the meaning):

| Table | Required fields | Purpose |
|---|---|---|
| `park_zones` | `id`, `name`, `is_route_open`, `light_threshold_demo` | Named park paths and route safety flags. |
| `poles` | `id`, `zone_id`, `x`, `z`, `sensor_status`, `light_setting`, `last_seen_at` | Virtual poles and lighting. |
| `detections` | `id`, `time`, `pole_id`, `event_type`, `score`, `source_mode`, `summary` | Source events without raw recordings. |
| `incidents` | `id`, `created_at`, `zone_id`, `pole_id`, `type`, `priority`, `status`, `reason`, `source_mode`, `assigned_guard_id` | Guard response cases. |
| `guards` | `id`, `display_name`, `role`, `availability` | Demo guard roster; no real personnel data required. |
| `incident_feedback` | `id`, `incident_id`, `outcome`, `note`, `reviewed_by`, `reviewed_at` | Human-confirmed outcomes. |
| `sos_requests` | `id`, `created_at`, `zone_id`, `pole_id`, `location_shared`, `approx_lat`, `approx_lng`, `status`, `linked_incident_id` | Manual help requests. |
| `audit_events` | `id`, `time`, `actor_role`, `action`, `incident_id`, `details` | Track important actions. |

- Store only location needed for response; SOS location is potentially identifying data, even without a resident name.
- Use role-based controls for guard views and SOS records. For a local demo, use **clearly labeled demo roles**, not pretend production authentication.
- Do not retain raw audio or raw point clouds by default. If labeled audio examples are needed for research, keep them in a separate permission-controlled dataset, not automatically in incident history.
- Define configurable deletion/retention rules before any real deployment. Do **not** invent a legally mandated retention period.
- Guard feedback supports later manual review of false alarms; **it must not retrain models automatically**.

---

## 9. Data flow / API contract (suggested)

Create stable request/response types. Exact paths may vary as long as functionality remains.

| Method | Example endpoint | Description |
|---|---|---|
| `GET` | `/api/park` | Zones, pole positions, status and virtual lighting. |
| `GET` | `/api/incidents` | List/filter incidents. |
| `GET` | `/api/incidents/{id}` | Incident detail and activity trail. |
| `POST` | `/api/incidents/{id}/acknowledge` | Guard confirms alert received. |
| `POST` | `/api/incidents/{id}/assign` | Assign available guard. |
| `POST` | `/api/incidents/{id}/status` | Investigating / Resolved / False Alarm, with notes. |
| `POST` | `/api/sos` | Send resident SOS (no account required). |
| `GET` | `/api/sos/{request_id}` | Poll request status if WebSocket unavailable. |
| `POST` | `/api/demo/events` | Inject a **clearly labeled simulated** event; restricted to demo mode. |
| `POST` | `/api/demo/lighting` | Set virtual pole light value; demo only. |
| `WS` | `/ws/updates` | Send incident, SOS, lighting and sensor-status changes. |

**Example event**

```json
{
  "event_id": "EVT-0001",
  "event_type": "possible_fall",
  "pole_id": "AS-104",
  "zone_id": "west_path",
  "source_mode": "simulated",
  "priority": "needs_review",
  "score": 0.87,
  "reason": "Possible fall followed by prolonged low movement; not confirmed",
  "timestamp": "2026-10-12T10:00:00+08:00"
}
```

The sample score is illustrative; it is **not** evidence of model accuracy.

**Updates and safety:** Return clear HTTP errors, use unique incident IDs, validate inputs, protect guard-only actions, rate-limit public SOS, make repeated status updates idempotent where practical, and never report an acknowledgement that has not occurred.

---

## 10. Design system — REQUIRED for both interfaces

### 10.1 Overall direction

**Visual style:** modern, calm, clean, simple, spacious and trustworthy. Design for **readability before decoration**. Use normal human language, not engineering jargon, in visible UI text.

- Consistent typography, spacing, buttons, card radius and status colors across both interfaces.
- Prefer neutral backgrounds, a restrained teal/blue brand accent and high-contrast text; use red only for urgent danger and amber for caution.
- Avoid neon effects, excessive glows, large gradients, flashing alerts, dense tables and tiny dashboard text.
- Use short headers and familiar terms. Put details in expandable sections such as **“More Details”**.
- All major actions must be understandable without reading a manual.
- Include a visible **“Demo Mode — simulated sensor data”** notice on the guard UI.

### 10.2 Typography — larger than typical admin dashboards

| Element | Desktop | Mobile | Notes |
|---|---:|---:|---|
| Page title | **28–34 px** | **26–30 px** | Weight 650–750. |
| Section heading | **22–26 px** | **20–24 px** | Clear structure. |
| Card title | **18–22 px** | **18–20 px** | Avoid compressed cards. |
| Main body and buttons | **17–18 px** | **17–18 px** | **Never make normal reading text 12–14 px.** |
| Secondary/help text | **15–16 px** | **15–16 px** | Readable contrast. |
| Status and numeric highlights | **22–30 px** | **20–26 px** | Pair color with text. |
| Form labels | **16–18 px** | **16–18 px** | Always visible. |

- Use a freely available system font stack (`Inter` optional; system UI acceptable). Do not require downloading paid fonts.
- Body line-height approximately **1.5**. Buttons at least **44 px high**, preferably **48–56 px** for core actions.
- Allow text scaling to 200% without losing primary actions. Do not clip long translated words or labels.

### 10.3 Layout rules

- Use **8 px spacing scale**; typical page padding 24–32 px desktop, 16–20 px mobile.
- Keep major content inside clear sections with ample whitespace.
- Prefer 3 status summaries rather than 8–12 metrics on the home screen.
- Do not use more than 3 main navigation items for guards initially: **Park Overview / Incidents / System**.
- Desktop: wide 3D viewer + right-side details; side panel can scroll independently if necessary.
- Tablet: 3D viewer above collapsible details.
- Mobile: single-column; simple controls, visible incident details, no horizontal page scrolling.
- The SOS page should work especially well on a small phone, with **one obvious primary action**.

### 10.4 Plain-language UI dictionary

| Avoid displaying | Use instead |
|---|---|
| Command Centre / Monitoring Console | **Park Overview** |
| Acoustic Distress Confidence | **Possible Distress Sound** |
| LiDAR Temporal Anomaly | **Unusual Movement** |
| Sensor Fusion / Corroboration | **Signals Agree** |
| High Illuminance Corridor | **Nearby Lights On** |
| Point Cloud | **3D Sensor View** |
| Telemetry | **Sensor Updates** |
| Detection Threshold | **Sensitivity** |
| Operator Verification Pending | **Needs Review** |
| Acknowledgement Received | **Guard Acknowledged** |
| Node Degraded | **Sensor Needs Attention** |
| Ingress / Egress | **Entrance / Exit** |
| Risk-Adaptive Escalation | **Alert Priority** |
| Immutable Audit Log | **Activity History** |
| Low-Lux Threshold Breach | **Low Lighting Warning** |

**Good incident card example**

> **Possible Fall**  
> **West Path · Pole AS-104**  
> **Needs Review · Simulated**  
> “Unusual movement was detected. This may not be an emergency.”  
> **[View Location] [Acknowledge]**

**Good lighting card example**

> **Low Lighting Warning**  
> **Lakeside Path**  
> “This area may be too dark in the simulation.”  
> **[View Area]**

**Good resident states:** **“Request Help”**, **“Sending request…”**, **“Request received”**, **“Guard acknowledged”**, **“Unable to send — Call 999”**.

### 10.5 Accessibility and safety presentation

- Meet WCAG-style contrast and keyboard interaction expectations; visible focus indicator on controls.
- Do not communicate urgency through color alone: include text, icon and priority word.
- No strobing, rapid pulsing, alarming animations or automatic camera jumps.
- Honor `prefers-reduced-motion`; allow pause of animated residents.
- Keep emergency status easy to read on mobile and bright outdoor screens.
- Never hide **Call 999** behind an icon-only menu.
- Provide loading, empty, offline and error states with plain-language next steps.

---

## 11. Proposed folder structure

The AI agent can adapt this to an existing project, but preserve separation of responsibilities.

```text
xsense/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ParkOverview.tsx
│   │   │   ├── Incidents.tsx
│   │   │   ├── System.tsx
│   │   │   └── ResidentSOS.tsx
│   │   ├── components/
│   │   │   ├── Park3D/
│   │   │   │   ├── Scene.tsx
│   │   │   │   ├── Pole.tsx
│   │   │   │   ├── AnonymousDot.tsx
│   │   │   │   ├── LightingOverlay.tsx
│   │   │   │   └── AreaHighlight.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   ├── IncidentDetails.tsx
│   │   │   └── StatusLabel.tsx
│   │   ├── services/api.ts
│   │   ├── styles/
│   │   └── types/
│   └── public/models/  # optional Blender .glb assets
├── backend/
│   ├── main.py
│   ├── routes/        # incidents, SOS, park, demo
│   ├── services/      # alert rules, lighting, audio inference
│   ├── models/        # database and request schemas
│   └── data/          # SQLite database and demo fixtures
└── README.md
```

Keep simulation logic independent of the 3D renderer so future inputs can replace virtual sensor values without a redesign.

---

## 12. Implementation order for the AI agent

**Phase 1 — Foundation**

1. Set up frontend/backend structure and simple shared types.
2. Establish large-font design system, navigation and guard layout.
3. Build low-poly 3D park and five selectable poles.
4. Animate anonymous dots with generated simulated readings and a Pause option.

**Phase 2 — Safety demonstration**

5. Add virtual lighting settings and highlight dark path zones.
6. Add separate simulated fall, scream, rain, combined, unsafe-route and sensor-offline events.
7. Implement alert-priority rules and plain-language explanations.
8. Add incident list, detail, acknowledgement, guard assignment, status and resolution.

**Phase 3 — Resident & records**

9. Build QR-linked resident SOS page with location permission and manual-zone fallback.
10. Connect SOS to urgent incident creation and true acknowledgement statuses.
11. Add local database and guard feedback records; connect live WebSocket updates.

**Phase 4 — Actual audio evidence (if feasible)**

12. Integrate YAMNet using selected recorded clips; report it as **Recorded Sample**.
13. Add local microphone input only if permitted; explicitly label it **Live Input**.
14. Review negative examples (rain, children, animals, traffic); make no accuracy claims without measured evidence.

**Working rule:** Finish each phase with a usable end-to-end flow before adding another feature. Do not redesign finished pages unnecessarily.

---

## 13. Acceptance checklist / definition of done

### Interface and design

- [ ] Guard dashboard first screen clearly explains the park status without technical jargon.
- [ ] Resident SOS opens from a URL/QR and works on a phone-sized viewport.
- [ ] Both interfaces use **17–18 px body text**, large headings and spacious buttons.
- [ ] Main actions are never hidden by excessive cards or data tables.
- [ ] Labels accurately distinguish demo events from real/recorded inputs.
- [ ] Color, icons and words all communicate alerts; reduced motion works.

### 3D park and lighting

- [ ] Park can rotate, zoom, reset view and select five poles.
- [ ] Anonymous dots move only as a **simulation** and don't expose identities/history.
- [ ] Changing virtual lamp settings visibly updates the 3D scene.
- [ ] Turning off a light triggers a clear **Low Lighting Warning** and highlights a path.
- [ ] Simulated incident can activate local lights without guaranteeing a safe route.
- [ ] Blocked/unknown routes **never** produce misleading evacuation guidance.

### Emergency workflow

- [ ] Benign rain does not generate an urgent alert.
- [ ] A credible simulated silent fall creates **Needs Review** without requiring a scream.
- [ ] A combined event can escalate to **Urgent**.
- [ ] An offline pole creates **Coverage Warning**.
- [ ] A guard can acknowledge, assign, investigate and close an incident.
- [ ] Every important action has timestamp and feedback entry.
- [ ] Duplicate alerts do not overwhelm the dashboard.

### Resident SOS and privacy

- [ ] Resident can request help **without creating an account**.
- [ ] SOS still works without geolocation permission if a zone/pole is chosen.
- [ ] SOS becomes an urgent case without AI approval.
- [ ] “Received” and “Guard acknowledged” are distinct and accurate.
- [ ] Network failure has an honest fallback message and **Call 999** option.
- [ ] No default raw audio storage, camera feed or person travel history.
- [ ] Guard incident records can be reviewed without revealing unnecessary personal data.

### Technical and practical

- [ ] All primary functionality can be demonstrated with free software and **no hardware**.
- [ ] The prototype runs as one coherent system, not unrelated screens.
- [ ] Static models, simulated inputs and database records use consistent pole/zone IDs.
- [ ] Project README includes run instructions, feature list and honest limitations.
- [ ] No production safety assurance, LoRaWAN functionality or field-detection accuracy is implied.

---

## 14. Constraints, boundaries and decision rules

| Constraint | Requirement |
|---|---|
| **Budget** | Prefer free/open-source libraries; avoid paid APIs and unnecessary services. |
| **Team experience** | Low-poly scenes and simple code modules; no sophisticated model-training requirement for MVP. |
| **Development effort** | Prioritize complete user journeys over extra dashboards, realism or animation. |
| **No physical hardware yet** | All LiDAR, environment brightness, movement and light control must be labeled simulated. |
| **Safety** | Assist guards; never promise detection of every incident or autonomously call emergency services. |
| **Privacy** | Minimal operational data, human access restrictions, limited retention and opt-in SOS location. |
| **Connectivity** | Phone SOS requires internet; LoRaWAN is a future pole-to-gateway option, not required for the initial build. |
| **Lighting** | LiDAR does **not** measure darkness; simulate lighting separately or use separate sensors in future field work. |
| **AI model** | YAMNet can classify sound categories but cannot confirm danger by itself. |
| **Learning database** | Store reviewed outcomes; never automatically retrain from unverified labels. |
| **Demo integrity** | Never present simulated virtual people or LiDAR readings as real surveillance. |

### Final build instruction to AI agent

> Build XSense as a **clean, readable, privacy-conscious park safety prototype** centered on a 3D Guard Dashboard and an extremely simple Resident SOS page. **Both interfaces must have large text, simple wording and obvious actions.** Complete the flows for **possible emergency → clear alert → human response → recorded outcome**, and **dark area → visible warning → guard inspection**. Use free software. Treat LiDAR, people positions and lighting as simulations; integrate actual sound recognition separately if feasible. Preserve safety warnings, source labels and privacy boundaries. Do not introduce unnecessary features, complicated interface terminology or unsupported real-world performance claims.

---

## 15. Source documents and official tools

**Requirements basis:** XSense Final Project Concept, XSense Tech Stack, and confirmed choices for the hybrid 3D guard view: **moving anonymous dots**, **simulated lighting**, **guard warnings and highlighted dark areas**, **software-only prototype**, **3D view as a core feature**, **limited budget/time/experience**.

**Official free-tool documentation:** [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Vite](https://vite.dev/) · [React Three Fiber](https://r3f.docs.pmnd.rs/) · [Three.js](https://threejs.org/) · [Blender](https://www.blender.org/) · [FastAPI](https://fastapi.tiangolo.com/) · [YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet) · [SQLite](https://sqlite.org/).
