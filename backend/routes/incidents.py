"""Incident management endpoints.
Phase 1: in-memory store. Phase 3 will replace with SQLite via SQLAlchemy."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

# In-memory store for Phase 1
_incidents: dict[str, dict] = {}


class AssignPayload(BaseModel):
    guard_id: str


class StatusPayload(BaseModel):
    status: str  # investigating | resolved | false_alarm
    note:   str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
def list_incidents(status: Optional[str] = None):
    """List incidents, optionally filtered by status."""
    result = list(_incidents.values())
    if status:
        result = [i for i in result if i["status"] == status]
    return {"incidents": sorted(result, key=lambda i: i["created_at"], reverse=True)}


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    inc = _incidents.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.post("/{incident_id}/acknowledge")
def acknowledge_incident(incident_id: str):
    """Guard confirms alert received."""
    inc = _incidents.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if inc["status"] not in ("open",):
        raise HTTPException(status_code=400, detail="Incident is not in an open state")
    inc["status"] = "acknowledged"
    inc["activity_trail"].append({"time": _now(), "action": "Guard acknowledged", "actor": "guard"})
    return inc


@router.post("/{incident_id}/assign")
def assign_incident(incident_id: str, payload: AssignPayload):
    """Assign an available guard to the incident."""
    inc = _incidents.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc["assigned_guard_id"] = payload.guard_id
    inc["status"] = "assigned"
    inc["activity_trail"].append({
        "time": _now(),
        "action": f"Assigned to {payload.guard_id}",
        "actor": "guard",
    })
    return inc


@router.post("/{incident_id}/status")
def update_status(incident_id: str, payload: StatusPayload):
    """Update incident to investigating / resolved / false_alarm.
    A note is required when closing or marking false alarm."""
    inc = _incidents.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    allowed = {"investigating", "resolved", "false_alarm"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")
    if not payload.note.strip():
        raise HTTPException(status_code=400, detail="A note is required when closing or marking false alarm")
    inc["status"] = payload.status
    inc["activity_trail"].append({
        "time":   _now(),
        "action": f"Status → {payload.status}: {payload.note}",
        "actor":  "guard",
    })
    return inc


# Internal helper for demo event injection
def create_incident(
    zone_id: str,
    zone_name: str,
    pole_id: str,
    incident_type: str,
    display_type: str,
    priority: str,
    reason: str,
    source_mode: str = "simulated",
    score: Optional[float] = None,
) -> dict:
    iid = f"INC-{str(uuid.uuid4())[:6].upper()}"
    now = _now()
    inc = {
        "id":              iid,
        "created_at":      now,
        "zone_id":         zone_id,
        "zone_name":       zone_name,
        "pole_id":         pole_id,
        "type":            incident_type,
        "display_type":    display_type,
        "priority":        priority,
        "status":          "open",
        "reason":          reason,
        "source_mode":     source_mode,
        "assigned_guard_id": None,
        "score":           score,
        "activity_trail":  [{"time": now, "action": "Incident created", "actor": "system"}],
    }
    _incidents[iid] = inc
    return inc
