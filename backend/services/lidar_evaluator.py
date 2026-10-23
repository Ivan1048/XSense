"""
LiDAR 3D Point-Cluster Kinematic Evaluator for XSense.
Distinguishes normal upright stops and bench sitting from a rapid height drop
and sustained ground immobility (Silent Possible Fall).
Also enforces authoritative sensor offline, FOV, and obstacle coverage-gap boundaries.
"""
from typing import Any, Optional
import math

# Authoritative Operational Sensors (mirrors frontend/src/data/lidarData.ts)
OPERATIONAL_LIDARS = {
    "LID-001": {
        "id": "LID-001",
        "name": "Central Path LiDAR Node",
        "zone_id": "central_path",
        "pole_id": "AS-103",
        "position": (1.0, 1.0),
        "mount_height_m": 3.55,
        "nominal_range_m": 13.5,
        "min_range_m": 0.5,
        "fov_deg": 240.0,
        "heading_deg": 315.0,
    },
    "LID-002": {
        "id": "LID-002",
        "name": "West Loop Targeted LiDAR Node",
        "zone_id": "west_path",
        "pole_id": "AS-104",
        "position": (-12.0, 10.0),
        "mount_height_m": 3.55,
        "nominal_range_m": 13.0,
        "min_range_m": 0.5,
        "fov_deg": 210.0,
        "heading_deg": 55.0,
    },
}

# Authoritative Obstacles for Line-of-Sight Check
PARK_OBSTACLES = [
    {'id': 'tree_rt_0', 'name': 'Rain Tree (North Entrance)', 'type': 'cylinder', 'pos': (-16, -17), 'h': 3.5, 'r': 0.75},
    {'id': 'tree_rt_1', 'name': 'Rain Tree (West Perimeter A)', 'type': 'cylinder', 'pos': (-20, -6), 'h': 3.2, 'r': 0.65},
    {'id': 'tree_rt_2', 'name': 'Rain Tree (West Loop Garden)', 'type': 'cylinder', 'pos': (-17, 14), 'h': 3.4, 'r': 0.72},
    {'id': 'tree_rt_3', 'name': 'Rain Tree (East Gate Lawn)', 'type': 'cylinder', 'pos': (17, 15), 'h': 3.6, 'r': 0.78},
    {'id': 'tree_rt_4', 'name': 'Rain Tree (East Perimeter)', 'type': 'cylinder', 'pos': (20, -5), 'h': 3.3, 'r': 0.68},
    {'id': 'tree_rt_5', 'name': 'Rain Tree (North-East Lawn)', 'type': 'cylinder', 'pos': (16, -15), 'h': 3.4, 'r': 0.72},
    {'id': 'tree_rt_6', 'name': 'Rain Tree (South Loop A)', 'type': 'cylinder', 'pos': (-8, 19), 'h': 3.3, 'r': 0.68},
    {'id': 'tree_rt_7', 'name': 'Rain Tree (South Loop B)', 'type': 'cylinder', 'pos': (8, 19), 'h': 3.5, 'r': 0.75},
    {'id': 'tree_rt_8', 'name': 'Rain Tree (Central West Spur A)', 'type': 'cylinder', 'pos': (-12, -4), 'h': 2.8, 'r': 0.55},
    {'id': 'tree_rt_9', 'name': 'Rain Tree (Central West Spur B)', 'type': 'cylinder', 'pos': (-15, -2), 'h': 3, 'r': 0.62},
    {'id': 'tree_rt_10', 'name': 'Rain Tree (Central West Spur C)', 'type': 'cylinder', 'pos': (-11, -1), 'h': 2.6, 'r': 0.5},
    {'id': 'tree_rt_11', 'name': 'Rain Tree (West Loop Connector A)', 'type': 'cylinder', 'pos': (-7, 8), 'h': 2.5, 'r': 0.48},
    {'id': 'tree_rt_12', 'name': 'Rain Tree (West Loop Connector B)', 'type': 'cylinder', 'pos': (-5, 9), 'h': 2.7, 'r': 0.52},
    {'id': 'tree_rt_13', 'name': 'Rain Tree (East Lake Bank A)', 'type': 'cylinder', 'pos': (15, -6), 'h': 2.8, 'r': 0.55},
    {'id': 'tree_rt_14', 'name': 'Rain Tree (East Lake Bank B)', 'type': 'cylinder', 'pos': (17, -3), 'h': 3, 'r': 0.6},
    {'id': 'tree_pt_0', 'name': 'Palm Tree (North Lawn A)', 'type': 'cylinder', 'pos': (-12, -17), 'h': 4.2, 'r': 0.38},
    {'id': 'tree_pt_1', 'name': 'Palm Tree (North Lawn B)', 'type': 'cylinder', 'pos': (-6, -16), 'h': 4, 'r': 0.35},
    {'id': 'tree_pt_2', 'name': 'Palm Tree (North-East Perimeter)', 'type': 'cylinder', 'pos': (13, -16), 'h': 4.4, 'r': 0.42},
    {'id': 'tree_pt_3', 'name': 'Palm Tree (East Lake Lawn)', 'type': 'cylinder', 'pos': (16, -9), 'h': 4, 'r': 0.35},
    {'id': 'tree_pt_4', 'name': 'Palm Tree (South-West Lawn)', 'type': 'cylinder', 'pos': (-10, 17), 'h': 4.2, 'r': 0.38},
    {'id': 'tree_pt_5', 'name': 'Palm Tree (East Promenade)', 'type': 'cylinder', 'pos': (18, 10), 'h': 4.3, 'r': 0.4},
    {'id': 'tree_pt_6', 'name': 'Palm Tree (West Garden)', 'type': 'cylinder', 'pos': (-15, 4), 'h': 3.8, 'r': 0.32},
    {'id': 'bridge_pier_west', 'name': 'Footbridge West Pier', 'type': 'cylinder', 'pos': (2.3, -4.8), 'h': 2.2, 'r': 0.35},
    {'id': 'bridge_pier_east', 'name': 'Footbridge East Pier', 'type': 'cylinder', 'pos': (4.9, -4.8), 'h': 2.2, 'r': 0.35},
    {'id': 'gateway_building', 'name': 'North Entrance Guard Building', 'type': 'box', 'pos': (-17.1, -17), 'h': 3, 'size': [2.4, 2.4]},
    {'id': 'dynamic_route_barrier', 'name': 'Central Path Closed Barrier', 'type': 'box', 'pos': (1.1, -0.6), 'h': 0.9, 'size': [3, 0.35], 'dynamic': True},
]


def _normalize_angle(deg: float) -> float:
    a = deg % 360.0
    return a if a >= 0 else a + 360.0


def _angular_distance(a1: float, a2: float) -> float:
    diff = abs(_normalize_angle(a1) - _normalize_angle(a2))
    return 360.0 - diff if diff > 180.0 else diff


def _calculate_bearing(from_pt: tuple[float, float], to_pt: tuple[float, float]) -> float:
    dx = to_pt[0] - from_pt[0]
    dz = to_pt[1] - from_pt[1]
    rad = math.atan2(dx, -dz)
    deg = math.degrees(rad)
    return _normalize_angle(deg)


def _check_ray_obstacle(
    ray_start: tuple[float, float],
    ray_end: tuple[float, float],
    obs: dict[str, Any],
    start_h: float = 3.55,
    end_h: float = 0.34,
) -> tuple[bool, str]:
    dx = ray_end[0] - ray_start[0]
    dz = ray_end[1] - ray_start[1]
    ray_len = math.hypot(dx, dz)
    if ray_len < 0.001:
        return False, ""

    entry, exit = 0.0, 1.0
    if obs["type"] == "cylinder":
        ox, oz = ray_start[0] - obs["pos"][0], ray_start[1] - obs["pos"][1]
        proj = -(ox * dx + oz * dz) / (ray_len * ray_len)
        discriminant = proj * proj - (ox * ox + oz * oz - obs["r"] ** 2) / (ray_len * ray_len)
        if discriminant < 0:
            return False, ""
        entry = max(entry, proj - math.sqrt(discriminant))
        exit = min(exit, proj + math.sqrt(discriminant))
    else:
        c, sn = math.cos(obs.get("rotation", 0)), math.sin(obs.get("rotation", 0))
        ox, oz = ray_start[0] - obs["pos"][0], ray_start[1] - obs["pos"][1]
        starts = [c * ox - sn * oz, sn * ox + c * oz]
        deltas = [c * dx - sn * dz, sn * dx + c * dz]
        for axis in range(2):
            half = obs["size"][axis] / 2
            if abs(deltas[axis]) < 1e-9:
                if abs(starts[axis]) > half:
                    return False, ""
            else:
                ta = (-half - starts[axis]) / deltas[axis]
                tb = (half - starts[axis]) / deltas[axis]
                entry, exit = max(entry, min(ta, tb)), min(exit, max(ta, tb))
    dh = end_h - start_h
    if abs(dh) < 1e-9:
        if start_h < 0 or start_h > obs["h"]:
            return False, ""
    else:
        ta, tb = -start_h / dh, (obs["h"] - start_h) / dh
        entry, exit = max(entry, min(ta, tb)), min(exit, max(ta, tb))
    if entry <= exit and exit >= 0 and entry <= 1:
        return True, obs["name"]

    return False, ""


def evaluate_lidar_scenario(
    scenario_kind: str,
    device_id: str = "LID-002",
    zone_id: str = "west_path",
    pole_id: str = "AS-104",
    sensor_offline: bool = False,
    route_blocked: bool = False,
    person_position: Optional[list[float]] = None,
) -> dict[str, Any]:
    """Evaluate a 3D bounding-box kinematic sequence from a simulated LiDAR node with geometric gating."""
    sensor_cfg = OPERATIONAL_LIDARS.get(device_id)
    unknown_sensor = sensor_cfg is None
    sensor_cfg = sensor_cfg or OPERATIONAL_LIDARS["LID-002"]
    invalid_position = person_position is not None and (
        len(person_position) not in (2, 3) or not all(math.isfinite(v) for v in person_position)
    )

    # Geometric Gating if position is provided
    is_occluded = False
    occluding_obj = ""
    is_out_of_range = False
    is_out_of_fov = False
    dist_m = 0.0

    if person_position and not invalid_position:
        px = person_position[0]
        pz = person_position[1] if len(person_position) == 2 else person_position[2]
        sx, sz = sensor_cfg["position"]

        dist_m = math.hypot(px - sx, pz - sz)
        if dist_m > sensor_cfg["nominal_range_m"] + 1e-9 or dist_m < sensor_cfg["min_range_m"] - 1e-9:
            is_out_of_range = True

        bearing = _calculate_bearing((sx, sz), (px, pz))
        if _angular_distance(bearing, sensor_cfg["heading_deg"]) > (sensor_cfg["fov_deg"] / 2.0) + 1e-9:
            is_out_of_fov = True

        if not is_out_of_range and not is_out_of_fov:
            for obs in PARK_OBSTACLES:
                if obs.get("dynamic") and not route_blocked:
                    continue
                hit, name = _check_ray_obstacle((sx, sz), (px, pz), obs, sensor_cfg["mount_height_m"], 0.34)
                if hit:
                    is_occluded = True
                    occluding_obj = name
                    break

    # Sensor failure or coverage gap checks
    if unknown_sensor or invalid_position or sensor_offline or scenario_kind == "occluded_fall" or is_occluded or is_out_of_range or is_out_of_fov:
        failure_reason = "LiDAR sensor is offline or unmonitored."
        if unknown_sensor:
            failure_reason = f"Unknown LiDAR sensor {device_id}."
        elif invalid_position:
            failure_reason = "Invalid person position; coverage cannot be verified."
        elif sensor_offline:
            failure_reason = f"Sensor {device_id} on pole {pole_id} is offline (missed heartbeats)."
        elif is_occluded:
            failure_reason = f"Line of sight from {device_id} blocked by {occluding_obj}."
        elif is_out_of_range:
            failure_reason = f"Distance {dist_m:.1f}m exceeds {sensor_cfg['nominal_range_m']}m detection envelope."
        elif is_out_of_fov:
            failure_reason = f"Target bearing is outside {device_id}'s {sensor_cfg['fov_deg']}° field of view."

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
            "plain_label": "Coverage Gap — Fall Not Detected by LiDAR",
            "plain_reason": failure_reason,
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
            "lighting_note": "No automatic light boost (sensor offline / coverage gap).",
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
