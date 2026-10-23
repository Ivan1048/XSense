"""
LiDAR Kinematic Evaluation & Spatio-Temporal Fusion Routes for XSense.
"""
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from services.lidar_evaluator import evaluate_lidar_scenario
    from services.alert_rules import evaluate_spatio_temporal_fusion
except ImportError:
    from backend.services.lidar_evaluator import evaluate_lidar_scenario
    from backend.services.alert_rules import evaluate_spatio_temporal_fusion

router = APIRouter()


from typing import Optional

class LidarEvalPayload(BaseModel):
    scenario_kind: str = "silent_fall"  # standing_stop | bench_sit | silent_fall | occluded_fall
    device_id: str = "LID-002"
    zone_id: str = "west_path"
    pole_id: str = "AS-104"
    sensor_offline: bool = False
    route_blocked: bool = False
    person_position: Optional[list[float]] = None


class FusionEvalPayload(BaseModel):
    audio_zone_id: str = "west_path"
    audio_pole_id: str = "AS-104"
    lidar_zone_id: str = "west_path"
    lidar_pole_id: str = "AS-104"
    time_delta_seconds: float = 4.0
    route_blocked: bool = False


@router.post("/evaluate")
def run_lidar_evaluation(payload: LidarEvalPayload):
    """Evaluate a 3D kinematic LiDAR posture sequence."""
    evaluation = evaluate_lidar_scenario(
        scenario_kind=payload.scenario_kind,
        device_id=payload.device_id,
        zone_id=payload.zone_id,
        pole_id=payload.pole_id,
        sensor_offline=payload.sensor_offline,
        route_blocked=payload.route_blocked,
        person_position=payload.person_position,
    )
    return {"ok": True, "evaluation": evaluation}


@router.post("/fusion")
def run_fusion_evaluation(payload: FusionEvalPayload):
    """Evaluate spatio-temporal corroboration between audio and LiDAR anomalies."""
    fusion = evaluate_spatio_temporal_fusion(
        audio_zone_id=payload.audio_zone_id,
        audio_pole_id=payload.audio_pole_id,
        lidar_zone_id=payload.lidar_zone_id,
        lidar_pole_id=payload.lidar_pole_id,
        time_delta_seconds=payload.time_delta_seconds,
        route_blocked=payload.route_blocked,
    )
    return {"ok": True, "fusion": fusion}
