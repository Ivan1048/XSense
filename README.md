# XSense — Hybrid Park Safety & Tactical Digital Twin (City of Elmina)

XSense is a privacy-preserving park safety prototype combining **anonymous 3D LiDAR point-cluster analysis**, **YAMNet 16kHz audio classification**, **smart pathway lighting response**, and **human-in-the-loop guard dispatch** on a dual-mode **GIS Tactical Blueprint / 3D Park Digital Twin** of Sime Darby's City of Elmina Central Park.

---

## Quick Start (Option A: One-Command Docker Compose — Recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). No local Python, TensorFlow, or Node.js installation needed.

```bash
docker compose up --build
```

- **Guard Console & 3D Digital Twin**: [http://localhost:5173](http://localhost:5173)
- **Resident Mobile SOS Portal**: [http://localhost:5173/sos?pole=AS-104&zone=west_path](http://localhost:5173/sos?pole=AS-104&zone=west_path)
- **FastAPI + YAMNet Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Hot-Reloading**: Both `./frontend` and `./backend` are bind-mounted into the containers. Any code edits you save in VS Code / Antigravity automatically hot-reload in the browser without rebuilding Docker.

To stop containers:
```bash
docker compose down
```

---

## Quick Start (Option B: Local Native Development)

### 1. Backend (FastAPI + YAMNet)
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 2. Frontend (React 19 + Three.js + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Verification & CI Checks

GitHub Actions automatically runs `.github/workflows/ci.yml` on every push and pull request:
- **Frontend**: `npx tsc --noEmit` & `npm run build`
- **Backend**: `py_compile` & FastAPI module import verification
- **Docker**: `docker compose config -q`

---

## Project Structure

```
XSense/
├── frontend/          # React 19 + TypeScript + Vite + React Three Fiber + Three.js
│   └── src/
│       ├── pages/     # ParkOverview (Tactical Twin) · Incidents · System · ResidentSOS
│       ├── components/
│       │   ├── Park3D/   # 3D Scene, OrbitControls, 2D Radar Camera, Poles, Guards, CCTV
│       │   └── ...
│       ├── context/   # ParkContext (State, Incident Engine, Multi-Tab BroadcastChannel)
│       ├── data/      # parkData.ts, lidarPlan.ts, sectors.ts
│       └── types/     # TypeScript definitions
├── backend/           # Python 3.11 + FastAPI + SQLite
│   ├── main.py
│   ├── routes/        # park · incidents · sos · demo · audio · lidar
│   └── services/      # audio_inference (DSP + YAMNet) · alert_rules · lidar_evaluator
├── docker-compose.yml # Containerized full-stack deployment
└── README.md
```

---

## Honest Limitations & Safeguards

- All LiDAR point clusters, resident tracking, and smart lighting responses are **simulated software demonstrations**.
- No real emergency services (999/911) are dispatched automatically.
- CCTV markers represent inventory locations and estimated visual coverage; no unauthorized video feeds are connected.
- Sound confidence scores are acoustic DSP/YAMNet model estimates, not verified human determinations.
