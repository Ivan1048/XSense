"""
XSense Backend — FastAPI Application
Phase 1: Skeleton structure with stub endpoints.
Full implementation in Phase 3 (database + WebSockets).

Run:  uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import park, incidents, sos, demo

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
