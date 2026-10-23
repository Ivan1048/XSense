# System Detection Inspector — Stage 2

Implemented on `elson2`. Calibration settings and evaluation reports remain later stages.

## Use

- Open **System → Detection Inspector** to analyze one of the existing recorded audio samples. The existing analysis flow may create a demo incident for a distress result. Classification bars show uncalibrated scores, not emergency probabilities.
- Choose a simulated visitor and **Start capture in park**. Use that visitor's controls to stop, crouch, collapse, or recover. **Inspect captured samples** returns to System and ends the capture.
- Inspect height and horizontal speed, action-change markers, numeric samples, and per-sensor geometric checks. The coverage device selector evaluates a possible low-height target at 0.34 m; geometry alone is not a fall decision.
- Existing LiDAR scenario results appear as summaries. Start/end heights and scenario immobility durations are not expanded into invented timelines.
- The selected result survives route navigation. Clear evidence removes inspector results only. Reset All also clears the existing demo session and its cases.

## Data boundaries

- Captures are explicit, temporary simulator ground truth, not physical LiDAR measurements. Up to one sample every 200 ms, for at most 30 seconds and 151 samples.
- At most 12 result entries are kept in page memory. Refresh, Clear evidence, and Reset All clear them. Nothing is added to local/session storage or the backend by the evidence recorder.
- Capture values include height, horizontal speed, simulated action, and derived coverage checks. The capture buffer does not store world coordinates, resident identities, raw point clouds, or recordings. Existing simulator coordinates are used transiently to calculate speed and coverage.
- Leaving Park Overview stops capture. No graph samples are produced while the map is unmounted. Initial speed, long frame gaps, and large scripted relocations are represented as unavailable speed values.
- Action markers identify simulator action changes, not confirmed emergencies. Sampling cannot establish real-world detection accuracy or field false-alert rates.
- Short captures can omit a transition between samples. Graphs connect sampled values only. A numeric sample table is available; narrow screens can scroll the graphs horizontally.

## Verification

- Frontend build: `npm --prefix frontend run build`.
- Recorder regression checks (tested with Node 26): `node --test frontend/src/utils/__tests__/detectionEvidence.test.ts`.
- Browser checks should cover audio results, capture start/stop, action changes, page navigation, sensor selection, empty states, clearing results, and reset. No changes to thresholds, fusion, incident lifecycle, dispatch, or operational settings are part of this stage.
