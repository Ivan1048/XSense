# XSense — Park Safety Prototype

> Privacy-preserving smart park safety system · **Park safety without continuous video.**

A software proof of concept. All sensor readings, resident positions and lighting values are **simulated**. No real LiDAR, cameras, or hardware is connected.

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
| `/incidents` | **Incidents** — list, filter, workflow (Phase 2) |
| `/system` | **System** — sensor/lighting status, privacy info |
| `/sos` | **Resident SOS** — mobile-first help request page (QR access) |

---

## Implementation Phases

| Phase | Status | Description |
|---|---|---|
| 1a | ✅ Done | Project structure, design system, 3D park, navigation |
| 1b | — | Guard layout refinement |
| 2a | — | Lighting controls & dark-area warnings |
| 2b | — | All demo scenarios & alert rules |
| 2c | — | Incident workflow |
| 3a | — | Full Resident SOS page |
| 3b | — | FastAPI + SQLite backend |
| 3c | — | Frontend–backend integration + WebSocket |
| 4  | — | YAMNet audio (optional) |

---

## Honest Limitations

- All LiDAR, people positions and lighting values are **simulated**
- No real emergency services are connected
- A dot stopping does not prove a fall
- Sound confidence scores are model outputs, not verified accuracy
- No production deployment or 24/7 SLA
