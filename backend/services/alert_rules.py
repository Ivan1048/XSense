"""
Spatio-Temporal Alert Fusion & Safety Lighting Rules for XSense.
Enforces that sound and movement only fuse into 'urgent' when they occur
within the same zone/coverage window and within 15 seconds.
Unrelated zones remain separate 'needs_review' cases.
"""
from typing import Any

FUSION_WINDOW_SECONDS = 15.0


def evaluate_spatio_temporal_fusion(
    audio_zone_id: str,
    audio_pole_id: str,
    lidar_zone_id: str,
    lidar_pole_id: str,
    time_delta_seconds: float = 4.0,
    route_blocked: bool = False,
) -> dict[str, Any]:
    """Compare acoustic distress and LiDAR fall observations in space and time."""
    same_zone = (audio_zone_id == lidar_zone_id) or (audio_pole_id == lidar_pole_id)
    within_time = abs(time_delta_seconds) <= FUSION_WINDOW_SECONDS

    lighting_note = (
        "Nearby lights on — route not verified."
        if route_blocked
        else f"Nearby Lights On — Local pole {lidar_pole_id} boosted to 100%."
    )

    if same_zone and within_time:
        return {
            "fused": True,
            "event_type": "combined_anomaly",
            "priority": "urgent",
            "source_mode": "simulated",
            "score": 0.94,
            "zone_id": lidar_zone_id,
            "pole_id": lidar_pole_id,
            "time_delta_seconds": time_delta_seconds,
            "plain_label": "Signals Agree (Sound + Movement)",
            "plain_reason": (
                f"Possible distress sound and 3D height collapse occurred in the same zone ({lidar_pole_id}) "
                f"within {time_delta_seconds:.0f}s (≤ 15s threshold). Escalated to Urgent human review."
            ),
            "sensor_basis": (
                f"Co-located at {lidar_pole_id}: Acoustic distress (0.88) + LiDAR height drop (1.72m → 0.34m) "
                f"Δt = {time_delta_seconds:.1f}s"
            ),
            "lighting_boost_pct": 100,
            "lighting_note": lighting_note,
            "camera_context": "No camera view available. On-site check required.",
        }

    return {
        "fused": False,
        "event_type": "separate_anomalies",
        "priority": "needs_review",
        "source_mode": "simulated",
        "audio_zone_id": audio_zone_id,
        "audio_pole_id": audio_pole_id,
        "lidar_zone_id": lidar_zone_id,
        "lidar_pole_id": lidar_pole_id,
        "time_delta_seconds": time_delta_seconds,
        "plain_label": "Unrelated Zones — Kept as 2 Separate Alerts",
        "plain_reason": (
            f"Sound detected at {audio_pole_id} ({audio_zone_id}) and fall detected at {lidar_pole_id} "
            f"({lidar_zone_id}). Different spatial zones are never automatically fused into a single Urgent alarm."
        ),
        "sensor_basis": (
            f"Spatial separation: {audio_pole_id} ≠ {lidar_pole_id}. Created 2 independent Needs Review cases."
        ),
        "lighting_boost_pct": 100,
        "lighting_note": lighting_note,
        "camera_context": "No camera view available. On-site check required.",
    }
