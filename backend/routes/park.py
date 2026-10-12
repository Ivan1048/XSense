"""Park data endpoint — zones, poles, sensor status, virtual lighting."""
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Static park data — matches frontend parkData.ts
_POLES = [
    {"id": "AS-101", "name": "North Entrance", "x": -15, "z": -13, "zone_id": "north_entrance", "sensor_status": "online", "light_setting": 70, "last_seen_at": None},
    {"id": "AS-102", "name": "Lakeside Path",  "x": -4,  "z": -9,  "zone_id": "lakeside_path",  "sensor_status": "online", "light_setting": 70, "last_seen_at": None},
    {"id": "AS-103", "name": "Central Path",   "x": 1,   "z": 1,   "zone_id": "central_path",   "sensor_status": "online", "light_setting": 70, "last_seen_at": None},
    {"id": "AS-104", "name": "West Loop",      "x": -12, "z": 10,  "zone_id": "west_path",      "sensor_status": "online", "light_setting": 70, "last_seen_at": None},
    {"id": "AS-105", "name": "East Exit",      "x": 14,  "z": 11,  "zone_id": "east_exit",      "sensor_status": "online", "light_setting": 70, "last_seen_at": None},
]

_ZONES = [
    {"id": "north_entrance", "name": "North Entrance", "is_route_open": True, "light_threshold_demo": 30},
    {"id": "lakeside_path",  "name": "Lakeside Path",  "is_route_open": True, "light_threshold_demo": 30},
    {"id": "central_path",   "name": "Central Path",   "is_route_open": True, "light_threshold_demo": 30},
    {"id": "west_path",      "name": "West Loop",      "is_route_open": True, "light_threshold_demo": 30},
    {"id": "east_exit",      "name": "East Exit",      "is_route_open": True, "light_threshold_demo": 30},
]


@router.get("")
def get_park():
    """Return all zones, poles, sensor status and virtual lighting.
    All data is simulated — no real hardware connected."""
    return {"zones": _ZONES, "poles": _POLES}


@router.get("/poles")
def get_poles():
    return {"poles": _POLES}


@router.get("/poles/{pole_id}")
def get_pole(pole_id: str):
    pole = next((p for p in _POLES if p["id"] == pole_id), None)
    if not pole:
        raise HTTPException(status_code=404, detail=f"Pole '{pole_id}' not found")
    return pole
