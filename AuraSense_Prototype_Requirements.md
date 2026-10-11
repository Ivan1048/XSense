# AuraSense — Prototype Requirements & Agent Build Brief

> **Project:** AuraSense — Privacy-First Ambient Acoustic & LiDAR Park Safety Network  
> **Competition:** Sime Darby Property University Hackathon 2026 — Township of Tomorrow  
> **Primary purpose of this document:** Give a coding agent a precise, buildable specification for an interactive hackathon prototype.  
> **Prototype status:** Simulation/demo only. It must not be represented as deployed, validated, certified, or suitable for real emergency dispatch.

---

## 1. Product vision

AuraSense is a proposed park-safety network for large residential-township parks. It aims to help authorised township security teams respond to possible incidents such as a person falling or an audible distress event, while avoiding continuous video surveillance.

The concept combines:
1. **Simulated edge sensing:** acoustic event classification and LiDAR-style human-motion events.
2. **Incident verification logic:** configurable rules that combine sensor signals and confidence values.
3. **Responsive lighting simulation:** a trigger can brighten the incident pole and a sequence of nearby poles to illustrate a route toward an exit.
4. **Security command dashboard:** a map, incident queue, event details, status updates, and patrol assignment.
5. **Privacy-first design:** the UI clearly communicates that the demo stores/transmits event metadata only, not raw audio, recordings, or identifiable point-cloud data.

### One-sentence value proposition

**AuraSense detects possible park-safety incidents locally, activates nearby lighting, and sends minimal incident metadata to an authorised response team—without relying on continuous video recording.**

---

## 2. Non-negotiable prototype constraints

The agent must follow these requirements:

- Build a **working web prototype**, not just a static landing page or mockup screenshot.
- Use **simulated sensor events**. Do not imply real microphones, LiDAR, LoRaWAN, solar power, physical lights, or security dispatch are connected.
- Do not implement actual emergency calls, messages to real guards, or external dispatch integrations.
- Do not claim the system is production-ready or that it guarantees safety.
- Do not invent test results, detection accuracy, false-alarm rates, response times, battery life, or hardware costs.
- Label sample locations, coordinates, sensor readings, confidence values, and incident records as **demo/simulated data**.
- Use a configurable rule engine so the demo can show how an alert is or is not triggered.
- The default UI must not display or store raw audio, voice transcripts, camera feeds, photos of people, or raw point-cloud tracks.
- Avoid the phrase **“zero privacy risk.”** Use “privacy-preserving by design” and explain the remaining risks.
- Make uncertainty visible: “possible incident,” “simulated confidence,” “requires human verification.”
- Include a visible demo disclaimer: **“Simulation only — not connected to real sensors or emergency services.”**

---

## 3. Users and roles

### A. Security operator
Needs to:
- View active and historical alerts.
- Identify the affected pole/zone and event type.
- See why an alert was triggered.
- Assign an incident to a patrol.
- Update status: New → Acknowledged → Patrol Assigned → Investigating → Resolved / False Alarm.
- Record a resolution note.

### B. Township operations / administrator
Needs to:
- View pole and zone status.
- Review incident frequency and false-alarm examples.
- See sensor health and last simulated heartbeat.
- Adjust demo alert thresholds and rule settings.
- Review an audit trail of operator actions.

### C. Resident-facing concept (optional, low priority)
A simple information panel can explain the system, privacy principles, and how to contact official security. Do not add a public panic button unless it is clearly marked as a simulated concept and cannot contact real services.

---

## 4. Core modules

### Module 1 — Command centre overview
Display:
- Active incidents count.
- Alerts awaiting acknowledgement.
- Patrols assigned / available (simulated).
- Online / degraded / offline sensor poles (simulated).
- Recent event timeline.
- Clear visual status indicators that do not rely on colour alone (include text and icons).

### Module 2 — Interactive township map
Display a fictional/demo park map with:
- Park paths and key landmarks.
- Main exits and safe assembly/meeting points.
- Sensor/light poles with IDs (e.g., AS-101 to AS-110).
- Each pole's status: Normal, Alert, Degraded, Offline.
- Active incident markers.
- A highlighted “lighting corridor” when an alert is triggered.
- A side panel for the selected pole with coordinates, simulated sensor health, last heartbeat, and recent events.

Use a reliable map library if available. If no map token is available, use a self-contained SVG/canvas schematic map; do not require a paid API key for the demo. Make it clear that map geometry and coordinates are illustrative.

### Module 3 — Incident detection simulator
Provide a “Run demo scenario” control and individual event triggers:
- **Possible distress sound** (simulated acoustic event).
- **Possible human fall / prolonged stillness** (simulated LiDAR-style event).
- **Combined acoustic + movement anomaly**.
- **Benign background event** (e.g., rain/wildlife) that should not automatically become a critical alert.
- **Sensor offline / degraded** event.

For each simulated event, show:
- Event timestamp.
- Pole and zone.
- Event category.
- Simulated confidence (clearly labelled).
- Which rule was evaluated.
- Why it triggered, was downgraded, or was ignored.
- Recommended operator action.

### Module 4 — Configurable event-fusion rules
Implement a simple, testable rule engine. Default example rules:
- Acoustic distress confidence at or above a configurable threshold can create a **“Needs Review”** alert, not a guaranteed emergency.
- LiDAR-style fall/stillness confidence at or above a configurable threshold can create a **“Needs Review”** alert.
- A combined acoustic anomaly plus fall/movement anomaly can raise priority.
- Benign background events should normally be logged as informational unless corroborated.
- Missing/degraded sensors must lower confidence and be shown explicitly.

Thresholds such as 0.90 or 0.85 are **demo configuration values, not measured model performance**. Do not hard-code marketing claims like “95% accurate.”

Every alert should include a plain-language explanation, for example:
> “Review recommended: simulated fall event exceeded the configured threshold. No real sensor was used.”

Do not use “verified emergency” unless a human operator has confirmed the incident.

### Module 5 — Lighting response simulation
When a qualifying demo alert occurs:
- Change the incident pole from Normal to Alert.
- Illuminate a configurable sequence of nearby poles toward the nearest main exit or meeting point.
- Draw a clear path/corridor on the map.
- Show which poles were activated and the reason.
- Provide a **Reset simulation** action.
- Show a note: “Lighting response is simulated; no physical lights were controlled.”

Do not use strobe effects by default. If shown as a future possibility, flag it as requiring accessibility, photosensitivity, wildlife, and operational review. Prefer a steady brighter-light simulation.

### Module 6 — Incident queue and case management
Each incident record should contain:
- Unique incident ID.
- Time created.
- Pole ID and demo zone.
- Event category.
- Priority: Informational / Low / Medium / High.
- Confidence value and “simulated” label.
- Trigger explanation.
- Status.
- Assigned patrol (simulated).
- Timeline of status changes.
- Resolution notes.

Actions:
- Acknowledge.
- Assign patrol.
- Mark investigating.
- Resolve.
- Mark false alarm.
- Add a note.

All actions must work locally in the prototype and update the UI immediately. Persist demo state in local storage only if appropriate; never store real sensor data.

### Module 7 — Patrol view (simulated)
Show a small list of fictional patrol units:
- Patrol ID.
- Availability.
- Current assignment.
- Simulated ETA, explicitly labelled as illustrative.
- “Assign patrol” and “Mark arrived” actions.

No real GPS tracking, guard identities, or external notifications are required.

### Module 8 — Sensor and pole health
For each demo pole, show:
- Online / degraded / offline state.
- Last heartbeat (simulated).
- Acoustic module state (simulated).
- LiDAR module state (simulated).
- Lighting module state (simulated).
- Connectivity state (simulated).
- A diagnostic message and recommended maintenance action.

A sensor-health failure must not silently appear as “all clear.” Display **“Coverage degraded — do not assume the area is monitored.”**

### Module 9 — Privacy, governance, and audit
Include a dedicated privacy panel describing:
- Event classification is intended to happen on-device/at the edge in the proposed real architecture.
- The proposed system sends only minimal event metadata to the command centre.
- Raw audio, transcripts, video, and identifiable point-cloud data are not included in this prototype's event records.
- The demo is simulated and does not prove that real hardware can meet these guarantees.
- Public deployment would require a privacy impact assessment, legal review, security review, signage, retention rules, access control, and community consultation.
- Metadata can still be sensitive and needs access control and retention limits.
- Avoid collecting resident identities unless strictly necessary.
- Human review is required before an alert is treated as a confirmed incident.

Include an audit log for alert creation, assignment, status changes, false-alarm marking, and resolution.

### Module 10 — Analytics and evidence
Show only metrics calculated from the demo records, such as:
- Number of simulated events.
- Alerts by type and zone.
- Number of alerts acknowledged.
- Number resolved / marked false alarm.
- Simulated average acknowledgement time, if derived from timestamps generated by the demo.
- Sensor availability in the simulated dataset.

Label all charts **“Demo data — not field performance.”** Do not show unsupported claims such as “95% noise filtered,” “45 ms real inference,” “guaranteed delivery,” or “reduces crime by X%.”

---

## 5. Recommended UI / pages

Create a polished, responsive operations dashboard with these routes or equivalent navigation tabs:

1. **Overview** — KPIs, live simulated event stream, active alerts, sensor health.
2. **Live Map** — park schematic/map, poles, exits, active incident and lighting corridor.
3. **Incidents** — searchable/filterable queue and detailed incident drawer/page.
4. **Patrols** — simulated units and assignment workflow.
5. **Sensor Health** — pole diagnostics and degraded/offline states.
6. **Analytics** — charts from generated demo data.
7. **Privacy & Audit** — privacy explanation, audit log, operational caveats.
8. **Settings** — configurable thresholds and demo scenario controls.

The interface should look like a credible civic-safety operations product, not a generic admin template.

### Visual direction
- Clean, modern township command centre.
- Dark navy/charcoal base with high-contrast readable text; restrained teal/green for normal states and amber/red for attention states.
- Avoid relying on colour alone: include labels/icons.
- Clear hierarchy, spacious panels, readable charts, responsive layout.
- Use accessible keyboard navigation, focus states, semantic labels, and sufficient contrast.
- Respect reduced-motion preferences; no flashing/strobing animations.
- Use realistic but explicitly fictional demo data.

---

## 6. End-to-end demo scenario

The prototype must support this presentation flow without requiring external APIs:

1. Open Overview and show that all sensor data is simulated.
2. Open Live Map and identify poles, paths, exits, and meeting point.
3. Trigger **Benign background event**. It appears as informational and does not dispatch a patrol.
4. Trigger **Possible human fall / prolonged stillness** at pole AS-104.
5. Show the rule evaluation, confidence (simulated), and “Needs Review” incident.
6. Show the incident pole and a corridor of nearby lights illuminating toward the nearest exit/meeting point.
7. Open the incident and acknowledge it.
8. Assign fictional Patrol P-02.
9. Mark patrol as investigating/arrived.
10. Resolve the incident with a note, or mark a separate benign incident as a false alarm.
11. Open Analytics and show that counters/charts update from the demo actions.
12. Open Privacy & Audit and explain what metadata is included and what is intentionally excluded.
13. Trigger a sensor-offline scenario and show a degraded-coverage warning.

All demo actions must be deterministic enough for a presentation and resettable with one button.

---

## 7. Example demo data

Use fictional data only. Example records:

### Poles
- AS-101 — North Path Junction — Online
- AS-102 — Lakeside Walk — Online
- AS-103 — Playground Approach — Online
- AS-104 — West Loop — Online
- AS-105 — Main Exit — Online
- AS-106 — Woodland Path — Degraded
- AS-107 — Community Plaza — Online
- AS-108 — South Path — Offline

### Example event
- Event ID: EVT-DEMO-004
- Pole: AS-104
- Zone: West Loop
- Type: Simulated fall / prolonged stillness
- Confidence: 0.88 (simulated)
- Rule: Fall confidence >= configured demo threshold
- Outcome: Needs Review
- Priority: High
- Status: New

### Example benign event
- Event ID: EVT-DEMO-005
- Pole: AS-102
- Type: Simulated rain/wildlife acoustic anomaly
- Confidence: 0.67 (simulated)
- Outcome: Informational only
- Priority: Informational
- Status: Logged

Coordinates, ETAs, confidence values, and times must be labelled illustrative. If a map uses latitude/longitude, use a clearly fictional demo location or a non-geographic schematic.

---

## 8. Data model

A simple local data model is sufficient.

### Pole
- `id`
- `name`
- `zone`
- `position` (schematic x/y or illustrative coordinates)
- `status`
- `lastHeartbeat`
- `acousticStatus`
- `lidarStatus`
- `lightingStatus`
- `connectivityStatus`

### Incident
- `id`
- `createdAt`
- `poleId`
- `zone`
- `eventType`
- `confidence`
- `priority`
- `ruleEvaluated`
- `reason`
- `status`
- `assignedPatrolId`
- `timeline[]`
- `resolutionNote`
- `isSimulated: true`

### Patrol
- `id`
- `status`
- `currentIncidentId`
- `illustrativeEta`

### Audit event
- `id`
- `timestamp`
- `actorRole`
- `action`
- `incidentId`
- `details`

No real personal data is needed.

---

## 9. Technical implementation guidance

The coding agent may adapt the stack to its environment, but should prefer a simple stack that can run locally with minimal setup.

Suggested approach:
- **Frontend:** React + TypeScript + Vite or Next.js.
- **Styling:** Tailwind CSS or an existing project design system.
- **Charts:** Recharts or equivalent.
- **Map:** Leaflet if a map token is available; otherwise an SVG/canvas schematic.
- **State:** React state/context or a small store; local storage for demo persistence if useful.
- **Backend:** Optional. A frontend-only prototype is acceptable if all demo interactions work. If a backend is used, keep it local/simple and never integrate with real dispatch services.
- **AI:** Do not require a live model/API for the demo. Simulate confidence and explainable rule outcomes. Keep interfaces modular so a future edge model could replace the simulator.
- **No secrets:** Do not commit API keys or credentials.
- **No paid dependency:** The core demo must work without paid API keys or external hardware.

### Code quality requirements
- Reusable components and typed data structures.
- Clear separation between demo data, rule evaluation, UI, and incident actions.
- Useful empty, loading, and error states.
- Input validation for settings.
- No dead buttons or controls that look interactive but do nothing.
- No fake live connection indicator; show “Simulation mode.”
- Provide a README with install/run instructions and a list of simulated features.
- Provide a concise architecture explanation and known limitations.

---

## 10. Explicitly out of scope for the hackathon MVP

Do **not** attempt to build these as real integrations:
- Physical MEMS microphone array.
- Real 3D LiDAR hardware integration.
- Hailo-8 / Raspberry Pi CM4 edge deployment.
- Real LoRaWAN gateway or guaranteed message delivery.
- DALI-2 lighting hardware control.
- Solar sizing, battery management, or off-grid certification.
- Real-time guard tracking or dispatch.
- Drone launch/autonomous flight.
- Flood-warning hardware.
- Formal biodiversity monitoring claims.
- Production-grade biometric/person identification.
- Any system that records or transmits raw conversations, audio, video, or identifiable point-cloud trails.

These can be listed as future research, not implemented prototype capabilities.

---

## 11. Risks and honest limitations to display

1. **False positives:** Rain, wildlife, sports, children playing, and other sounds/movements can resemble incidents. Thresholds need field validation.
2. **False negatives:** The system may miss quiet distress, occluded falls, or events outside sensor coverage.
3. **LiDAR occlusion:** Foliage, benches, rain, and geometry can create blind spots.
4. **Privacy:** Acoustic sensing in public spaces can raise concerns even without recording. A real deployment needs legal/privacy review and community consultation.
5. **Network reliability:** LoRaWAN delivery is not inherently guaranteed; real performance depends on radio coverage, gateway availability, interference, and configuration.
6. **Lighting safety:** Abrupt brightness changes can affect wildlife, nearby homes, and users with sensory sensitivities. Use gradual steady illumination in the demo.
7. **Liability and response policy:** An alert is not proof of assault or a medical emergency. Human operators must assess it under an approved response protocol.
8. **Equity and accessibility:** Ensure the interface is accessible and alerts are not solely auditory or visual.
9. **Security:** Role-based access, authentication, audit trails, and protection against spoofed reports are required before real deployment.
10. **Environmental constraints:** Heat, rain, humidity, insects, corrosion, power and maintenance affect outdoor hardware reliability.

Do not claim to eliminate these risks. Show how the prototype acknowledges them and what validation would be required.

---

## 12. Testing and acceptance checklist

The build is acceptable only when all applicable checks pass:

### Core functionality
- [ ] Dashboard loads without external credentials.
- [ ] Demo mode disclaimer is visible.
- [ ] Map/schematic displays poles, paths, exits, and selected pole details.
- [ ] Each demo event trigger creates the expected rule evaluation.
- [ ] Benign event does not create a critical dispatch by default.
- [ ] Fall/distress event creates a reviewable incident when the configured rule is met.
- [ ] Combined event can raise priority.
- [ ] Lighting corridor is displayed for a qualifying event.
- [ ] Reset action returns map, lights, incident state, and counters to baseline.
- [ ] Operator can acknowledge, assign, investigate, resolve, and mark false alarms.
- [ ] Patrol assignment updates both incident and patrol state.
- [ ] Sensor offline event displays a coverage-degraded warning.
- [ ] Analytics update from the underlying demo records.
- [ ] Audit log records important operator actions.
- [ ] Threshold settings affect rule evaluation.
- [ ] No visible action is a dead button.

### Privacy and truthfulness
- [ ] No real microphone, LiDAR, LoRaWAN, lighting, or dispatch connection is claimed.
- [ ] No raw audio/video or identifiable point-cloud data is stored in demo incidents.
- [ ] All confidence values and metrics are labelled simulated/demo.
- [ ] No unsupported accuracy, response-time, crime-reduction, or delivery guarantee appears.
- [ ] UI states that the system requires human verification.
- [ ] Limitations and privacy caveats are accessible from the interface.

### Usability
- [ ] Responsive desktop and tablet layouts.
- [ ] Keyboard-accessible navigation and actions.
- [ ] Visible focus states and readable contrast.
- [ ] Status is conveyed by text/icon as well as colour.
- [ ] Reduced-motion support; no flashing/strobing by default.
- [ ] README documents setup, features, demo workflow, and limitations.

---

## 13. Deliverables

The agent should return:
1. Complete runnable source code.
2. A `README.md` with setup and run instructions.
3. A working demo scenario and reset control.
4. A brief architecture overview.
5. A list of features implemented versus simulated.
6. Known limitations and next-step recommendations.
7. No claims that simulated features are real hardware integrations.

### Definition of done

A judge should be able to run the app locally, trigger a simulated incident, see the rule evaluation, observe the lighting corridor, assign a fictional patrol, resolve the incident, and see the analytics/audit log update—all without paid APIs, external hardware, or real-world dispatch.

---

## 14. Final instruction to the coding agent

Build **AuraSense as a polished, interactive, privacy-first park-safety command-centre prototype**. Prioritise a complete and credible end-to-end demonstration over pretending to implement complex hardware or machine-learning systems in a short hackathon. Keep every simulated capability explicitly labelled, make all core controls functional, and never imply the prototype is a real emergency system.
