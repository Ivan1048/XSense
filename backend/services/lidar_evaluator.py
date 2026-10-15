"""
LiDAR 3D Point-Cluster Kinematic Evaluator for XSense.
Distinguishes normal upright stops and bench sitting from a rapid height drop
and sustained ground immobility (Silent Possible Fall).
Also enforces honest sensor offline / coverage-gap boundaries.
"""
from typing import Any


def evaluate_lidar_scenario(
    scenario_kind: str,
    device_id: str = "LID-002",
    zone_id: str = "west_path",
    pole_id: str = "AS-104",
    sensor_offline: bool = False,
    route_blocked: bool = False,
) -> dict[str, Any]:
    """Evaluate a 3D bounding-box kinematic sequence from a simulated LiDAR node."""
    if sensor_offline or scenario_kind == "occluded_fall":
        return {
            "scenario_kind": scenario_kind,
            "device_id": device_id,
            "zone_id": zone_id,
            "pole_id": pole_id,
            "source_mode": "simulated",
            "detected": False,
            "trigger_incident": False,
            "event_type": "coverage_gap_missed",
            "priority": "coverage_warning",
            "plain_label": "Unmonitored / Sensor Offline — Event Missed",
            "plain_reason": (
                "LiDAR sensor is offline or obstructed in a coverage gap. "
                "Silent events in unmonitored areas cannot be detected without a direct SOS report."
            ),
            "kinematics": {
                "initial_height_m": 1.72,
                "final_height_m": 0.34,
                "drop_speed_mps": -1.42,
                "horizontal_speed_mps": 0.0,
                "aspect_ratio": 0.21,
                "stationary_seconds": 45,
                "box_dimensions_m": [1.65, 0.34, 0.60],
            },
            "lighting_boost_pct": None,
            "lighting_note": "No automatic light boost (sensor offline / unmonitored).",
            "camera_context": "No camera view available. On-site check required.",
        }

    if scenario_kind == "standing_stop":
        return {
            "scenario_kind": "standing_stop",
            "device_id": device_id,
            "zone_id": zone_id,
            "pole_id": pole_id,
            "source_mode": "simulated",
            "detected": True,
            "trigger_incident": False,
            "event_type": "benign_stop",
            "priority": "normal",
            "plain_label": "Standing Stationary (No Alert)",
            "plain_reason": (
                "Person stopped walking (speed 0.03 m/s) while remaining upright (height 1.72m, aspect ratio 3.13). "
                "A stopped dot without height collapse does not trigger a fall alert."
            ),
            "kinematics": {
                "initial_height_m": 1.72,
                "final_height_m": 1.72,
                "drop_speed_mps": 0.0,
                "horizontal_speed_mps": 0.03,
                "aspect_ratio": 3.13,
                "stationary_seconds": 18,
                "box_dimensions_m": [0.55, 1.72, 0.55],
            },
            "lighting_boost_pct": 70,
            "lighting_note": "Normal pathway lighting maintained (70%).",
            "camera_context": "No camera view available. On-site check required.",
        }

    if scenario_kind == "bench_sit":
        return {
            "scenario_kind": "bench_sit",
            "device_id": device_id,
            "zone_id": zone_id,
            "pole_id": pole_id,
            "source_mode": "simulated",
            "detected": True,
            "trigger_incident": False,
            "event_type": "benign_sit",
            "priority": "normal",
            "plain_label": "Seated on Park Bench (No Alert)",
            "plain_reason": (
                "Controlled vertical descent (-0.35 m/s) to seated height (1.05m) near bench geometry. "
                "Classified as normal park rest activity."
            ),
            "kinematics": {
                "initial_height_m": 1.72,
                "final_height_m": 1.05,
                "drop_speed_mps": -0.35,
                "horizontal_speed_mps": 0.02,
                "aspect_ratio": 1.75,
                "stationary_seconds": 30,
                "box_dimensions_m": [0.60, 1.05, 0.60],
            },
            "lighting_boost_pct": 70,
            "lighting_note": "Normal pathway lighting maintained (70%).",
            "camera_context": "No camera view available. On-site check required.",
        }

    # Default / 'silent_fall': Rapid height drop + horizontal aspect collapse + 45s immobility
    lighting_note = (
        "Nearby lights on — route not verified."
        if route_blocked
        else f"Nearby Lights On — Local pole {pole_id} automatically raised to 100%."
    )
    return {
        "scenario_kind": "silent_fall",
        "device_id": device_id,
        "zone_id": zone_id,
        "pole_id": pole_id,
        "source_mode": "simulated",
        "detected": True,
        "trigger_incident": True,
        "event_type": "silent_fall",
        "priority": "needs_review",
        "score": 0.86,
        "plain_label": "Unusual Movement (Possible Fall)",
        "plain_reason": (
            "Possible fall followed by prolonged low movement: 3D cluster height dropped from 1.72m to 0.34m "
            "(-1.42 m/s) and remained motionless on the ground for 45s. Reviewable without requiring sound."
        ),
        "kinematics": {
            "initial_height_m": 1.72,
            "final_height_m": 0.34,
            "drop_speed_mps": -1.42,
            "horizontal_speed_mps": 0.01,
            "aspect_ratio": 0.21,
            "stationary_seconds": 45,
            "box_dimensions_m": [1.65, 0.34, 0.60],
        },
        "lighting_boost_pct": 100,
        "lighting_note": lighting_note,
        "camera_context": "No camera view available. On-site check required.",
    }
