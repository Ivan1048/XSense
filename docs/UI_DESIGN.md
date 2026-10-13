# XSense — Shared UI Design Standard

Use this standard for **both** the Guard Dashboard and the Resident SOS page. The existing requirements document is the detailed product specification.

## Overall appearance
- **Clean, calm, modern, spacious, accessible.** Readability over decoration.
- A small, consistent palette: neutral surfaces, restrained teal/blue accents, amber for caution, red for urgent warnings.
- No intense glow effects, flashing backgrounds, crowded cards, or oversized collections of metrics.
- Share tokens/components for colors, type, buttons, borders, spacing, and feedback states.
- Preserve the interactive 3D park as the guard dashboard's main feature.

## Type and spacing
| Element | Recommended size |
| --- | --- |
| Page title | 28–34 px desktop; 26–30 px mobile |
| Section heading | 22–26 px desktop; 20–24 px mobile |
| Card heading | 18–22 px |
| Normal body and buttons | **17–18 px** |
| Secondary explanations | **15–16 px** |
| Form labels | 16–18 px |
| Primary button height | 48–56 px (44 px minimum) |

- Use approx. 1.5 line height, clear contrast, 8 px spacing increments, generous whitespace.
- Text should scale without clipping. Avoid 12–14 px text for normal reading.
- Desktop guard view: 3D map ~65–70%, information panel ~30–35%; collapse to a single column on mobile.
- Resident SOS: mobile-first, one obvious **Request Help** button; `Call 999` always visible.

## Simple wording
| Avoid | Show instead |
| --- | --- |
| Command Centre / Monitoring Console | Park Overview |
| Acoustic Distress Confidence | Possible Distress Sound |
| LiDAR Temporal Anomaly | Unusual Movement |
| Sensor Fusion | Signals Agree |
| Point Cloud | 3D Sensor View |
| Telemetry | Sensor Updates |
| Operator Verification Pending | Needs Review |
| Low-Lux Threshold Breach | Low Lighting Warning |
| Node Degraded | Sensor Needs Attention |
| Incident Termination | Request Closed |

Technical names such as `AS-104`, or **LiDAR** in an optional explanation, may appear in details; keep primary labels plain-language.

## 3D map markers and sources
- Cyan dot: **Person Detected (Simulated)** — anonymous and unclassified.
- Blue shield: **Guard Location (Simulated)** — position supplied by a *separate guard tracking simulation*, **not LiDAR identification**.
- Orange marker: **Possible Emergency**.
- Red sensor marker: **Sensor Offline**.
- Include a clear legend. Use icon + wording as well as color.
- A blue shield can overlap a cyan dot: do not silently infer that the LiDAR track has been identified.
- Label demo, recorded sample, and live input honestly. No fabricated “Live Input.”

## Hybrid coverage presentation
- Show selectable CCTV markers with viewing direction and estimated coverage; separate LiDAR/audio devices from lighting poles.
- Provide distinct camera, LiDAR, audio, lighting, and gap layers with a readable legend.
- Label coverage as estimated or verified for a specific task, and show degraded/unknown conditions. Unknown is not safe; a view cone is not an identification guarantee.
- Show camera integration availability separately from its map position. Only offer a usable authorized view; otherwise show **“No camera view available. On-site check required.”**
- Explain placement through risk and monitoring gaps rather than darkness alone. Do not automatically place every sensor on a streetlight.

## Resident SOS language
- Initial: **Need Help?** / **Request Help**
- Submission: **Sending request…**
- After confirmed save: **Request received**
- Only after a guard clicks acknowledge and that action is saved: **Guard acknowledged**
- Only after assignment recorded: **Help is being arranged**
- Arrival/resolution: accurate separate statuses
- Failure: **Unable to send. Call 999 or seek nearby help.**

Never advance request status using an arbitrary timer.

## Accessibility
- Keyboard usable forms and controls; focus rings; sufficient contrast.
- No reliance on color alone; respect reduced-motion settings.
- Clear, understandable empty/loading/offline/error states.
- Make mobile controls comfortable for touch and outdoor use.
