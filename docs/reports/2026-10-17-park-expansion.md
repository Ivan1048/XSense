# Simulated park expansion — 17 October 2026

Branch: `elson`. Visual planning layer only; no backend, incident transitions, live sensing or device identities changed.

## Layout

Expanded the irregular ground from roughly 44 × 40 to 87 × 86 scene units, with a 2.4-unit solid base. Added wooded hills, rocks, a western playground with slide and swing, an outer walking promenade, additional pathway lamps, and six residences beside an eastern street. Existing pole, camera, event and pedestrian coordinates remain intact. New scenery lives in `ParkSurroundings.tsx`; the central park remains in `ParkGeometry.tsx`. `Scene.tsx` frames the larger scene. Device labels are optional; selected/alert pole labels remain visible.

Inspiration: Sime Darby Property's [City of Elmina](https://www.simedarbyproperty.com/city-of-elmina/) and [Elmina Green Seven brochure](https://simedarbyproperty.com/city-of-elmina/elmina-green-seven/Brochure.pdf), which describe forest, community/play areas and residential context. This is a stylized interpretation, not an accurate surveyed map. Hills are scenery, not a geographic claim.

## Proposed LiDAR layer

`data/lidarPlan.ts` defines 16 independent proposed posts, PLAN-L01–PLAN-L16, with a hypothetical 13 m radial range. `LidarPlan.tsx` renders the posts and optional range outlines. Park Overview offers selection and range toggles; System identifies the layer as a proposal, separate from operational/demo device inventory.

A 0.5-unit sampling check across the public-park study rectangle x=[-39,22], z=[-25,27] checked 12,915 points: zero outside nominal radial range; greatest nearest-post distance 11.716 units. This is only a two-dimensional distance calculation, not a line-of-sight, hardware, field-of-view, detection or safety test. The visual rings can extend outside the study area. The hills, surrounding streets, residence interiors and obstructed spaces are not verified coverage. Follow-up: removed the fixed purple blind-spot rectangle, its toggle and legend because it conflicted with the proposed range layer. No automatic gap calculation is implemented.

## Verification

- `npm --prefix frontend run build`: passed after fixing a JSX closing-brace typo; existing large bundle warning remains.
- `git diff --check`: passed.
- Browser: day/night views, proposed sensor selection, nominal range rendering, device-label toggle and reset-view checked.
- No hardware accuracy evaluation or end-to-end incident/SOS regression test performed.
- No dependencies added; no commit or push performed. Existing unrelated local edits preserved.

## CCTV follow-up

Added CAM-03 playground entrance, CAM-04 west loop, CAM-05 lakeside and CAM-06 residential approach. All six camera markers remain inventory-only with estimated viewing geometry. System inventory now reads the same camera list as the map. Updated pole context wording to avoid equating proximity with verified coverage. Browser confirmed all six selector options and selection of CAM-03; build and whitespace checks passed. No backend or detection logic changed; no commit/push.
