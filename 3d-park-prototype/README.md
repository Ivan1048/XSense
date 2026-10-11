# XSense — 3D Park Monitoring Prototype

An interactive **software-only** prototype of the XSense guard dashboard. It includes a low-poly park (built with code, so no Blender model is required), five clickable sensor poles, anonymous moving dots, simulated LiDAR coverage, adjustable virtual lighting, a possible fall scenario, and an event feed.

> **Simulation only.** Does not process real LiDAR, measure physical brightness, classify audio, or contact security/emergency services. A stopped dot is not evidence of a fall. No personal or location data is collected.

## Requirements
- Node.js 18+ (Node 20+ recommended)
- npm
- Internet connection for the first package installation

## Run

```bash
cd 3d-park-prototype
npm install
npm run dev
```

Open the localhost URL printed by Vite (usually http://localhost:5173).

For a static production build:

```bash
npm run build
npm run preview
```

## Controls
- Drag the 3D view to orbit; scroll/pinch to zoom.
- Click a pole label or select it in the right-hand panel.
- **Night mode** changes the scene lighting.
- **LiDAR coverage** displays an *illustrative* sensing area around each pole.
- **Pause dots** freezes simulated residents.
- **Simulate possible fall** freezes one dot and creates a **review event**. This is not a LiDAR inference.
- **Simulate dark pathway** turns AS-102 off and logs a warning.
- **Virtual lamp setting** changes the selected pole's light intensity.
- **Reset demo** restores the lighting and fall simulation.

## Stack (free open-source packages)
- React — https://react.dev/
- Three.js — https://threejs.org/
- React Three Fiber — https://r3f.docs.pmnd.rs/
- Drei — https://github.com/pmndrs/drei
- Vite — https://vite.dev/

## Next improvements
1. Split this single demo file into `components/`, `simulation/` and `features/`.
2. Replace generated virtual events with a documented event API; show event provenance clearly (`simulated`, `recorded`, `live`).
3. Add actual 3D park GLB assets exported from Blender as needed, keeping pole IDs stable.
4. Connect a separate audio-recognition pipeline and provide human-review controls.
5. Before physical use: field-test LiDAR detection, lighting levels, coverage and privacy safeguards.

## 3D asset workflow (optional)
Create scenery in **Blender**, export a `.glb` file, and load it using Drei `useGLTF`. Keep moving dots, warning overlays and dynamic lights as React components rather than baking them into the mesh.
