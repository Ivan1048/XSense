"""Resident SOS endpoint — no account required.
Rate limited per IP. Location is stored only if explicitly shared."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

_sos_requests: dict[str, dict] = {}
_rate_limit:   dict[str, list[float]] = {}  # ip -> timestamps

SOS_RATE_LIMIT_PER_MINUTE = 3


class SOSPayload(BaseModel):
    zone_id:          Optional[str]   = None
    pole_id:          Optional[str]   = None
    location_shared:  bool             = False
    approx_lat:       Optional[float] = None
    approx_lng:       Optional[float] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("")
async def submit_sos(payload: SOSPayload, request: Request):
    """Submit a resident SOS. No account required.
    Duplicate requests are rate-limited but a new SOS is never blocked by AI deduplication."""
    # Rate limiting
    ip  = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc).timestamp()
    recent = [t for t in _rate_limit.get(ip, []) if now - t < 60]
    if len(recent) >= SOS_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. If this is a real emergency, please call 999 immediately.",
        )
    _rate_limit[ip] = recent + [now]

    rid = f"SOS-{str(uuid.uuid4())[:8].upper()}"
    sos = {
        "id":               rid,
        "created_at":       _now(),
        "zone_id":          payload.zone_id,
        "pole_id":          payload.pole_id,
        "location_shared":  payload.location_shared,
        # Only store location if resident explicitly shared it
        "approx_lat":       payload.approx_lat if payload.location_shared else None,
        "approx_lng":       payload.approx_lng if payload.location_shared else None,
        "status":           "received",
        "linked_incident_id": None,
    }
    _sos_requests[rid] = sos
    return {
        "request_id": rid,
        "status":     "received",
        "message":    "Request received by XSense.",
        "note":       "A guard will be notified. This does not guarantee an immediate response.",
    }


@router.get("/{request_id}")
def get_sos_status(request_id: str):
    """Poll SOS request status — fallback when WebSocket is unavailable."""
    sos = _sos_requests.get(request_id)
    if not sos:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"request_id": request_id, "status": sos["status"]}
