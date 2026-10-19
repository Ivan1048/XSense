# Auto-Focus on Alert

Park Overview's sector bar includes an optional **Auto-Focus on Alert** checkbox, off by default. Enabling it focuses an existing active SOS, fall or distress incident; subsequent new incidents and changes to severity or location trigger the existing smooth sector camera transition. Urgent incidents take precedence when several arrive in the same update. Both Radar and 3D projections keep their existing behavior.

The incident's pole determines the sector using configured operational-device assignments, then sector bounds for poles without an explicit assignment (including Central Path AS-103). Unknown locations are skipped. This is a sector overview based on the current incident location reference, not tracking an individual's exact coordinates.

Acknowledgement, dispatch, repeated observations, closure, benign results and infrastructure warnings do not trigger another flight. Manual camera control remains available. Turning the option off stops future automatic flights; it does not undo a flight already requested. The preference resets when leaving Park Overview.

## Verification

From `frontend/`, with Node 22.18+ (native TypeScript stripping):

```sh
node --test src/utils/alertFocus.test.mjs
npx tsc --noEmit
npm run build
```

Manual check: enable the checkbox, trigger Silent Fall (Sector C), then Scream (Sector A), and check both Radar and 3D. Acknowledge/dispatch and confirm the camera is not recentered. Disable the checkbox and trigger another alert; the camera should stay under manual control. Test SOS from Central Path (Sector B), closure, reset, and simultaneous alerts. Check that the sector strip scrolls while the toggle and projection controls remain accessible.
