# XSense: Initial Plan vs Current Direction

**Planning report · 13 October 2026**

**Team decision:** retain the original LiDAR, sound detection, and 3D park concept, while moving privacy away from the main selling point. Latest agreed addition: map existing CCTV locations and viewing coverage, and place LiDAR/audio according to risk and monitoring gaps rather than streetlight positions. Live video integration and physical pilot details remain pending.

## 1. What changes?

| Area | Initial plan | Current direction |
|---|---|---|
| Main purpose | Privacy-preserving smart park safety without continuous video | Earlier awareness of possible distress and coordinated security response |
| Main value | Anonymous sensing and reduced reliance on CCTV | Help staff notice, locate, review, and respond to potential incidents |
| Core technology | LiDAR-style movement monitoring, sound recognition, 3D dashboard | Retained; prove whether combining movement and sound improves detection |
| Privacy | Primary differentiator | Supporting design principle; removing it from the pitch does not remove safeguards |
| CCTV | Camera-free concept raised questions about investigation evidence | Camera inventory, viewing direction, and estimated coverage included in plan; feeds/evidence remain later integrations |
| Detection promise | Broad park-safety scenarios, including possible falls and distress | Recommended scope: selected observable distress events, not guaranteed crime detection |
| Deployment | Park-wide vision with multiple sensor poles | Target higher-risk monitoring gaps; streetlights remain optional mounts. Start with one small zone |
| Proof of value | Software demonstration of sensing and response scenarios | Working response flow plus measured detection, false-alert, and delivery performance |

## 2. What stays?

- LiDAR movement sensing and sound recognition remain the technical core.
- The interactive 3D park remains central; add distinct CCTV, LiDAR, audio, lighting, and coverage-gap layers.
- Resident SOS, acknowledgement, guard assignment, arrival, resolution, and incident history remain central.
- Lighting demonstrations and coverage warnings remain supporting features.
- Silent possible falls must remain reviewable; SOS must not require AI confirmation.
- Simulated, recorded, and live inputs must be clearly distinguished. Guard markers remain separate from anonymous detections.

## 3. Constraints and practical responses

| Constraint | Response and remaining boundary |
|---|---|
| Silent robbery or another event with no distinctive signal | Provide SOS and manual reporting alongside sensors. An unreported, unobservable event may still be missed. |
| Movement does not establish a fall or criminal intent | Analyze movement sequences and relevant geometry; label alerts as possible events requiring review. |
| Screams and impacts can be harmless | Test normal park sounds and behaviour; sound-class scores are not emergency probabilities. |
| Sound and movement may be unrelated | Align time and observation zones; retain uncertainty instead of automatically combining events. |
| Obstructions, weather, and unequal sensor coverage | Survey and test the site; show degraded or unknown coverage. Advertised range is not verified detection coverage. |
| False alerts and missed events | Compare LiDAR alone, audio alone, and combined sensing; measure misses, false alerts per hour, and alert delay. |
| Alerts may not receive a response | Save real guard actions, prevent double assignment, and escalate to a designated responder. Staffing remains essential. |
| Network, power, or backend failure | Use persistence, safe retries, heartbeat checks, and reconnection recovery. A queued request is not a delivered request. |
| Visual evidence may be unavailable | Show relevant camera availability, not just the nearest camera. Inventory markers do not supply footage; otherwise require an on-site check. |
| Darkness is not a sensor selection rule | Compare infrared CCTV and lighting improvements. LiDAR cannot see through obstacles and does not replace pathway lighting. |
| Independent mounts need infrastructure | Verify viewpoint, power, network, weather protection, maintenance access, and tamper protection. |
| Hardware cost and prototype credibility | Verify hardware access and installation costs. Simulations prove workflow, not real sensor accuracy. |

## 4. Recommended next milestone

**One monitored zone → possible distress or SOS → saved incident → actual guard acknowledgement → response → recorded outcome.**

1. Map camera viewing direction/estimated coverage and independently placed LiDAR/audio nodes, with explicit gaps. Survey risk and available infrastructure; confirm data/hardware access.
2. Complete FastAPI + SQLite integration and cross-device updates.
3. Replace the automatic SOS acknowledgement with a saved guard action; validate assignment and status transitions.
4. Test silent events, combined signals, harmless lookalikes, outages, and reconnection.
5. Demonstrate CCTV-covered, LiDAR/audio, overlap, and unknown areas. Compare LiDAR with another infrared camera before claiming deployment value.

At the earlier code inspection, movement and sound scenarios were simulated, frontend state was local, and backend records were in memory. This report does not constitute a fresh implementation audit.

## 5. Decisions still pending

Pilot location; available sensor hardware and budget; exact detection scope; live CCTV integration permissions and compatibility; optional physical help buttons; response owner; and acceptable detection/false-alert targets.

**Suggested positioning:** “XSense brings existing CCTV context, targeted LiDAR and sound sensing, and resident help requests into a 3D park map to understand coverage and coordinate response to possible distress.”

Research basis: [LiDAR occlusion limits](https://docs.ouster.com/sdk-docs/features/zone_monitor/using-the-api.html), [YAMNet sound classification](https://www.tensorflow.org/tutorials/audio/transfer_learning_audio), and [audio analytics limitations](https://whitepapers.axis.com/en-us/audio-analytics-for-security-and-safety). Recommendations are planning proposals, not validated performance claims.
