# LiDAR geometry verification

Base: `main` at `75b321528696518f6671e3b9abac6cd699574061`.
Task branch: `fix/lidar-geometry-verification`. Commit and task-branch push authorized by the task owner after verification. Integration into main remains subject to project-lead review.

The person-down gate now intersects the full cylinder/box volume, including target-inside and descending-through-top cases. Both languages use unrounded bearings and the same obstacle inventory. The coverage overlay uses small sampled cells (up to 0.25 m radially and 2 degrees angularly), preserves the minimum-range hole, and can show visible regions beyond low obstacles. It is an approximate visualization of simulated geometry, not field-verified sensing.

Manual and scheduled collapse commands emit one observation through the shared persona store. ParkProvider owns one scheduler; timers are shared with HUD commands. Repeated collapse commands do not emit another fall. Demo controls stage the visitor at the same fixed position evaluated by the gate, including missed falls; incident pole IDs no longer collapse unrelated visitors. Reset All also resets personas. Miss diagnostics show the nearest sensor's checks. Unknown backend sensor IDs and malformed/nonfinite positions fail closed.

## Checks executed

From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
node --test frontend/src/utils/alertFocus.test.mjs
python3 -m unittest discover -s backend/tests
python3 backend/tests/verify_lidar_parity.py
frontend/node_modules/.bin/esbuild frontend/src/utils/__tests__/runLidarTests.ts --bundle --platform=node --format=esm --outfile=/tmp/xsense-lidar-tests.mjs
node /tmp/xsense-lidar-tests.mjs
git diff --check
```

React integration test dependency is isolated outside the repository; no package manifest/lock changes:

```sh
npm install --prefix ../test-runtime --cache ../npm-cache --no-save react@18.3.1 react-test-renderer@18.3.1
frontend/node_modules/.bin/esbuild frontend/src/utils/__tests__/runPersonaTests.tsx --bundle --platform=node --format=esm --define:import.meta.env='{}' --alias:react=./frontend/node_modules/react --alias:react-test-renderer=../test-runtime/node_modules/react-test-renderer --outfile=/tmp/xsense-persona-tests.mjs
node /tmp/xsense-persona-tests.mjs
```

During this run test bundles were written under task scratch `work/` rather than `/tmp`; the above commands reproduce the same checks.

Passed: production build; 33 geometry assertions; 5 alert-focus tests; 3 backend test methods (including seven missed-input subcases); 33,800 frontend/backend position/status/barrier comparisons. React integration covers manual/autonomous success and misses, no added incident/alert/light change for misses, repeated-collapse suppression, actual scheduler-triggered collapse, offline nearest-sensor diagnostics, backend-unavailable demo fallback, matching demo pose, and one scheduler with cleanup across multiple consumers.

Browser smoke check: loaded local dashboard and inspected coverage in GIS and physical park modes in top-down view. This is visual inspection, not an automated browser scenario suite. API HTTP routes and a running FastAPI server were not exercised; backend service functions and frontend React state transitions were tested directly. Normal autonomous activities still exclude random emergencies; the scheduler regression injects a collapse activity only inside the test.

Build retains its existing large-bundle warning. Dependency installation reported two moderate advisories and a deprecated transitive three-mesh-bvh version; dependency upgrades were outside this task. No hardware, real sensor accuracy, deployed integration, or human response claims were verified.
