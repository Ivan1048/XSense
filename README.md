# XSense — Park Safety Prototype

> **Hybrid Park Safety System** · Understand coverage. Identify possible distress. Coordinate response.

A software proof of concept. All sensor readings, resident positions and lighting values are **simulated**. No real LiDAR, cameras, or hardware is connected.

## Latest direction — 13 October 2026

XSense combines existing CCTV, targeted LiDAR and sound sensing, resident SOS, and guard response in one 3D park interface. Privacy remains a supporting safeguard; the main value is improved monitoring awareness and coordinated assistance.

- **CCTV:** show camera locations, viewing direction, and estimated coverage. Markers do not imply connected feeds or recorded evidence. Authorized video integration is a later stage.
- **LiDAR + sound:** prioritize higher-risk locations with inadequate monitoring, identified through site inspection, incident reports, and security staff input. Streetlights may still provide suitable mounts; they no longer dictate placement.
- **Coverage:** distinguish estimated, verified, degraded, and unknown areas. Darkness alone does not justify LiDAR: compare lighting improvements or infrared cameras. LiDAR cannot see through obstructions, and sensing does not replace lighting.
- **Response:** locate possible distress, offer a relevant camera view only when available, and record actual acknowledgement, assignment, arrival, and outcome. Otherwise show “No camera view available. On-site check required.”

See [requirements](XSense_Complete_Requirements_for_AI_Agent.md), [architecture](DESIGN.md), and [plan comparison](XSense_Plan_Comparison.md). These describe the target plan, not completed integration.

---

## Project Structure

```
XSense/
├── frontend/          # React + TypeScript + Vite + React Three Fiber
│   └── src/
│       ├── pages/     # ParkOverview · Incidents · System · ResidentSOS
│       ├── components/
│       │   ├── Park3D/   # 3D scene, poles, anonymous dots
│       │   ├── StatusLabel.tsx
│       │   └── AlertCard.tsx
│       ├── data/      # parkData.ts, mockData.ts
│       ├── services/  # api.ts (FastAPI client)
│       └── types/     # Shared TypeScript types
├── backend/           # Python + FastAPI + SQLite (Phase 3)
│   ├── main.py
│   ├── routes/        # park · incidents · sos · demo
│   ├── models/        # SQLAlchemy models (Phase 3)
│   └── services/      # alert rules, audio inference (later phases)
└── README.md
```

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Backend (optional for Phase 1 & 2 — frontend is self-contained)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Pages

| Route | Description |
|---|---|
| `/` | **Park Overview** — 3D park, sensor poles, anonymous dots, demo controls |
| `/incidents` | **Incidents** — list, filters, browser-local workflow |
| `/system` | **System** — sensor/lighting status, privacy info |
| `/sos` | **Resident SOS** — mobile-first help request page (QR access) |

---

## Implementation status and priorities

Follow [the seven-phase implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md) one phase at a time; it defines scope, dependencies, and completion gates.

| Area | Current status | Next step |
|---|---|---|
| 3D park, scenarios, lighting, guard markers | Browser simulation implemented | Preserve existing behaviour while separating sensors from lamp mounts |
| Incidents and SOS | Local UI exists; SOS acknowledgement is timer-driven | Replace timer with actual saved guard actions |
| FastAPI | Route skeletons with in-memory records | SQLite persistence, validation, shared incident/SOS records |
| Cross-device updates | Client helpers exist; end-to-end integration pending | API integration, WebSockets, polling and reconnection recovery |
| CCTV and independent sensor placement | Planned | Camera inventory, estimated view cones, separate LiDAR/audio positions and coverage layers |
| YAMNet and real sensors | Not integrated | Recorded-input evaluation first; hardware pilot depends on access and budget |
| Video feeds and evidence | Not connected | Authorized integration after coverage mapping and core response work |

First milestone: one small mapped zone, one CCTV-covered area, one targeted LiDAR/audio area, an overlap example, and a clearly marked coverage gap. Compare adding LiDAR with adding an infrared camera; do not claim superiority without measurements.

## Development baseline

Use `elson` as the development baseline. Changes to `main` require the user's final approval. This documentation update is on `elson`; it does not implement the planned capabilities.

---

## Honest Limitations

- All LiDAR, people positions and lighting values are **simulated**
- No real emergency services are connected
- A dot stopping does not prove a fall
- Sound confidence scores are model outputs, not verified accuracy
- No production deployment or 24/7 SLA

- Silent incidents with no distinctive signal and no report may be missed; no alert does not mean no incident.
- Camera cones and LiDAR circles are estimates until tested for the relevant detection task.
- Sound and movement must be associated in time and space; a model score is not an emergency probability.
- Do not claim live feeds, field accuracy, guaranteed safe routes, or faster response without evidence.
