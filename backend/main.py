"""
XSense Backend — FastAPI Application
Phase 1: Skeleton structure with stub endpoints.
Full implementation in Phase 3 (database + WebSockets).

Run:  python main.py   (or: uvicorn main:app --reload --port 8000)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import park, incidents, sos, demo, audio, lidar

app = FastAPI(
    title="XSense API",
    description=(
        "Privacy-preserving smart park safety system — proof of concept. "
        "All sensor data is simulated. No real hardware connected."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(park.router,      prefix="/api/park",      tags=["Park"])
app.include_router(incidents.router, prefix="/api/incidents",  tags=["Incidents"])
app.include_router(sos.router,       prefix="/api/sos",        tags=["SOS"])
app.include_router(demo.router,      prefix="/api/demo",       tags=["Demo"])
app.include_router(audio.router,     prefix="/api/audio",      tags=["Audio"])
app.include_router(lidar.router,     prefix="/api/lidar",      tags=["LiDAR"])


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "XSense API",
        "status":  "running",
        "mode":    "demo",
        "note":    "All sensor data is simulated. No real hardware connected.",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import os
    import uvicorn

    # Change CWD to this file's directory so that WatchFiles reload workers
    # can always find 'main.py' and the 'routes/' package, regardless of where
    # the user ran `python main.py` from.
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )

