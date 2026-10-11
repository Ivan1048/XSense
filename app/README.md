# AuraSense — Privacy-First Ambient Acoustic & LiDAR Park Safety Network

> **Competition:** Sime Darby Property University Hackathon 2026 — Township of Tomorrow  
> **Prototype Status:** Simulation / Concept Demonstration Only. Not connected to physical sensors, real emergency services, or live lighting infrastructure.

---

## 1. Product Vision & Value Proposition

**AuraSense detects possible park-safety incidents locally, activates nearby lighting corridors, and sends minimal incident metadata to an authorised township response team — without relying on continuous video surveillance or voice recording.**

Residential township parks should feel safe at all hours, but continuous CCTV cameras create privacy anxiety, blind spots in dense foliage, and severe regulatory hurdles. AuraSense proves that privacy-preserving ambient sensors (edge acoustic classification and volumetric 3D LiDAR motion analytics) can trigger rapid, explainable civic-safety responses while protecting citizen anonymity by design.

---

## 2. Desktop & Mobile Compatibility

The AuraSense prototype was engineered from the ground up for high-fidelity responsive performance across both command centre desktop workstations and field mobile devices:

| Feature | Desktop Workstation | Mobile Phone & Tablet (<768px) |
|---|---|---|
| **Navigation** | Sticky top bar with module tabs & role switch | Native bottom navigation bar (Overview, Map, Incidents, Patrols, More) + Slide-over Drawer |
| **Park Schematic Map** | Expansive interactive SVG canvas with zoom & side panel | Responsive SVG with touch hit targets (28px touch radius), zoom controls, & quick pole dropdown selector |
| **Incident Queue** | High-density split pane (Queue list + Detail dossier) | Adaptive view switch (`Queue List` ↔ `Case Detail`) with sticky back button |
| **Sensor Diagnostics** | Multi-column hardware telemetry table | Collapsible diagnostic cards with module status chips & inspection triggers |
| **Quick Simulator** | Header action buttons & quick scenario strip | Floating Action Button (FAB `⚡ Scenarios`) for 1-tap trigger injection from any view |
| **Accessibility** | High contrast dark mode, keyboard navigation, focus states | 44px+ touch targets, no strobing/flashing effects, reduced-motion compliance |

---

## 3. Core Modules Implemented

1. **Module 1 — Command Centre Overview:** Real-time KPI summary cards, active review queue preview, live simulated telemetry stream, and privacy trust bar.
2. **Module 2 — Interactive Township Map:** Vector schematic of the park (North Lake, West Loop, Playground, Central Plaza, Main Gate Exit, Safe Assembly Point), pole nodes AS-101 to AS-110, interactive pole inspector, and animated glowing lighting corridors.
3. **Module 3 & 4 — Detection Simulator & Configurable Event-Fusion Rules:** Interactive threshold sliders for Acoustic Distress, LiDAR Fall/Stillness, Combined Dual-Anomaly, and Benign noise cutoffs, with live deterministic rule feedback.
4. **Module 5 — Responsive Lighting Simulation:** Steady high-illuminance corridor routing toward the nearest exit or assembly point, with accessible gradual illumination and instant simulation reset.
5. **Module 6 — Incident Queue & Case Management:** Search and filter by status and priority, complete status transition pipeline (`New` → `Acknowledged` → `Patrol Assigned` → `Investigating` → `Resolved` / `False Alarm`), custom resolution notes modal, false alarm disproval logger, and sequential audit timeline.
6. **Module 7 — Simulated Patrol Fleet:** Roster of township auxiliary units (P-01 Alpha, P-02 Bravo, P-03 Charlie, P-04 Delta), illustrative ETAs, dispatch workflow, and scene arrival tracking.
7. **Module 8 — Sensor & Pole Health:** Comprehensive telemetry diagnostics for all 10 nodes (Acoustic, LiDAR, Luminaire, LoRa link), last heartbeat, maintenance recommendations, and prominent **"Coverage degraded — do not assume the area is monitored"** warning notices.
8. **Module 9 — Privacy, Governance & Audit:** Deep-dive edge privacy architecture comparison matrix (transferred metadata vs excluded raw data), honest limitations discussion, and downloadable JSON audit log export.
9. **Module 10 — Analytics & Performance Evidence:** Live reactive Recharts visualizations (Incident Status Distribution, Priority Breakdown, Incident Frequency by Zone) computed strictly in real-time from demo session records.
10. **Resident-Facing Concept Guide:** Transparent community explainer dialog addressing public surveillance concerns and providing simulated township emergency hotline contacts.

---

## 4. Features Implemented vs. Simulated

| Feature | Implementation Status | Technical Detail |
|---|---|---|
| **Command Centre UI & Logic** | **Implemented (100% Functional)** | React 19, TypeScript, Vite, Responsive CSS, Recharts, Lucide |
| **Case Management & Workflow** | **Implemented (100% Functional)** | In-memory reactive state machine with local audit logging |
| **Event-Fusion Rule Engine** | **Implemented (100% Functional)** | Real-time threshold evaluation with explainable reasoning |
| **Lighting Corridor Routing** | **Implemented (100% Functional)** | Path graph computation from incident pole to nearest exit |
| **Physical Microphone Arrays** | *Simulated* | No live audio hardware connected; mathematical confidence scores |
| **Physical 3D LiDAR Sensors** | *Simulated* | Point-cloud collapse inferred via mathematical thresholds |
| **LoRaWAN Radio Frequency** | *Simulated* | Telemetry simulated in browser memory; no gateway hardware |
| **Physical Luminaire Hardware** | *Simulated* | Rendered via SVG glow filters; no DALI-2 hardware controller |
| **Guard GPS Tracking** | *Simulated* | Fictional patrol identifiers with illustrative ETAs |

---

## 5. Local Setup & Running Instructions

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or pnpm

### Quick Start
```bash
# Navigate to the app directory
cd app

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser to:
```text
http://127.0.0.1:5173/
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 6. End-to-End Judge Presentation Walkthrough

Follow this 2-minute demonstration flow to showcase the complete system to hackathon judges:

1. **Step 1: Introduction & Privacy Rationale (Overview Tab)**
   - Highlight the top disclaimer: *"Simulation only — not connected to real sensors or emergency services."*
   - Point out the Privacy Trust Bar explaining 100% on-device edge processing and zero video cameras.
2. **Step 2: Township Park Schematic (Live Map Tab)**
   - Open **Live Map** to view the schematic layout: North Lake, Central Plaza, Main Gatehouse Exit, and Safe Assembly Point.
   - Click pole **AS-104** (West Loop) or **AS-102** to demonstrate real-time telemetry inspection and edge module health.
3. **Step 3: Benign Noise Filtering**
   - Click the **"4. Benign Rain (AS-102)"** button in the quick scenario strip.
   - Observe that rain/wildlife noise is classified as informational metadata and does **not** trigger a panic dispatch.
4. **Step 4: Simulated Human Fall & Safe Lighting Corridor**
   - Click **"1. Fall Event (AS-104)"** (or click *"Run Demo Flow"* in the header).
   - Watch pole AS-104 turn to `ALERT` and illuminate the golden lighting corridor: `AS-104 → AS-103 → AS-105 (Main Exit)`.
5. **Step 5: Incident Queue & Case Management (Incidents Tab)**
   - Switch to **Incidents**. Open the high-priority case for AS-104.
   - Click **Acknowledge Alert**.
   - Select **Patrol Unit P-01 Alpha** from the dropdown to dispatch.
   - Click **Resolve Case**, type an operational note (e.g. *"Resident tripped over root, uninjured"*), and submit.
6. **Step 6: Live Analytics & Audit Export (Analytics & Privacy Tabs)**
   - Open **Analytics** to see live status and zone charts update from your actions.
   - Open **Privacy & Audit** to review the immutable audit trail and click **"Export Audit Trail (JSON)"**.
7. **Step 7: Coverage Degraded Scenario (Sensor Health Tab)**
   - Trigger **"5. Sensor Outage (AS-108)"**.
   - Switch to **Sensor Health** to see the prominent warning: *"Coverage degraded — do not assume the area is monitored."*
8. **Step 8: Reset**
   - Click the **Reset** button in the top bar to restore the entire simulation to the pristine baseline.

---

## 7. Honest Limitations & Governance Notice

1. **Simulation Status:** This prototype is built for concept validation and hackathon judging only. It must not be deployed or certified for real-world emergency dispatch.
2. **No Guarantee of Safety:** In any real-world emergency, citizens must dial national emergency services (999).
3. **Environmental Occlusion:** In physical deployments, tropical canopy foliage, heavy monsoon downpours, and park benches can occlude acoustic propagation and LiDAR line-of-sight.
4. **Community Engagement:** Even privacy-preserving sensors require township signage, community consultation, and clear retention policies before physical installation.

---

## 8. License & Attribution

Built for the **Sime Darby Property University Hackathon 2026 — Township of Tomorrow**.  
© 2026 AuraSense Concept Team. All demo datasets, coordinates, and personnel names are fictional.
