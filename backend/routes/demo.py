"""Demo event injection — clearly labeled simulated events only.
These endpoints are for demonstration purposes and must never be used
to inject events labeled as 'live' sensor data."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

_demo_events:    list[dict] = []
_lighting_state: dict[str, int] = {
    "AS-101": 70, "AS-102": 70, "AS-103": 70, "AS-104": 70, "AS-105": 70,
}


class DemoEventPayload(BaseModel):
    event_type:  str
    pole_id:     str
    source_mode: str = "simulated"
    zone_id:     Optional[str] = None


class DemoLightingPayload(BaseModel):
    pole_id:    str
    brightness: int  # 0-100


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/events")
def inject_demo_event(payload: DemoEventPayload):
    """Inject a clearly labeled simulated event. Demo mode only.
    source_mode must be 'simulated' or 'recorded' — never 'live'."""
    if payload.source_mode != "simulated":
        raise HTTPException(
            status_code=400,
            detail="Demo events endpoint only accepts source_mode='simulated'.",
        )
    event = {
        "event_id":    f"EVT-{str(uuid.uuid4())[:6].upper()}",
        "event_type":  payload.event_type,
        "pole_id":     payload.pole_id,
        "zone_id":     payload.zone_id,
        "source_mode": payload.source_mode,
        "timestamp":   _now(),
        "note":        "SIMULATED EVENT — not real sensor data",
    }
    _demo_events.append(event)
    return {"ok": True, "event": event}


@router.post("/lighting")
def set_demo_lighting(payload: DemoLightingPayload):
    """Set virtual pole lamp brightness. Demo only — not real hardware control."""
    if not (0 <= payload.brightness <= 100):
        raise HTTPException(status_code=400, detail="Brightness must be 0–100")
    _lighting_state[payload.pole_id] = payload.brightness
    return {
        "ok":         True,
        "pole_id":    payload.pole_id,
        "brightness": payload.brightness,
        "note":       "Virtual lamp setting only — not real hardware control",
    }


@router.get("/events")
def list_demo_events():
    return {"events": _demo_events[-50:]}


@router.post("/reset")
def reset_demo():
    """Reset all demo state."""
    _demo_events.clear()
    for k in _lighting_state:
        _lighting_state[k] = 70
    return {"ok": True, "message": "Demo state reset"}
