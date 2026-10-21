# Feature Specification: Guard ETA & Distance Readout on Dispatch

## 1. Overview & Objective
When a security officer (`G01` – `G03`) is dispatched to an active sector along the Elmina pathway, display a real-time floating telemetry badge attached to their 3D shield/marker. 

* **Pitch Value:** Reinforces the "tactical command center" feel and makes guard movement across the larger Elmina map easy to track during live demonstrations.

---

## 2. Target Format & Visual Spec
* **Badge Text Format:** `{Officer Name} · {Distance}m · ETA ~{Time}s`
* **Example Readout:** `Officer Chen · 42m · ETA ~4s`
* **Placement:** Floating 3D HTML/Canvas label anchored directly above the dispatched guard's 3D shield mesh.
* **Visibility State:**
  * `IDLE` / `PATROLLING`: Hide the ETA/Distance readout (or show standard guard ID only).
  * `DISPATCHED` / `EN_ROUTE`: Show the full live distance and ETA badge.
  * `ARRIVED` (Distance $\le 1.5\text{m}$): Transition badge text to `{Officer Name} · On Scene` or hide the ETA segment.

---

## 3. Technical Implementation Steps for Agent

### Step 1: Identify Guard & Target Entities
1. Locate the state management or 3D component governing security officers (`G01`, `G02`, `G03`).
2. Ensure each officer object has:
   * `id` (`G01` – `G03`)
   * `name` (e.g., `"Officer Chen"`)
   * `status` (e.g., `"IDLE"`, `"DISPATCHED"`, `"ON_SCENE"`)
   * `position`: Current 3D coordinates $(x, y, z)$
   * `targetPosition`: Dispatched sector/incident 3D coordinates $(x_{target}, y_{target}, z_{target})$
   * `speed`: Movement speed in meters per second ($v$, e.g., $10\text{ m/s}$ for simulation scale)

### Step 2: Real-Time Distance & ETA Calculation
Inside the animation loop (`useFrame` in React Three Fiber or the main update tick):
1. Calculate the 2D/3D Euclidean distance ($d$) on the $(x, z)$ plane between the guard's current position and the target dispatch coordinates:
   $$d = \sqrt{(x_{target} - x_{guard})^2 + (z_{target} - z_{guard})^2}$$
2. Format distance as a rounded integer: `Math.round(d)` (or `d.toFixed(0)`).
3. Calculate the Estimated Time of Arrival ($ETA$) based on the guard's movement velocity ($v$):
   $$ETA = \max\left(1, \text{Math.ceil}\left(\frac{d}{v}\right)\right)$$
   *(Note: Ensure division by zero is prevented if $v = 0$, and align $v$ with the actual interpolation/lerp speed used to move the guard across the Elmina pathway).*

### Step 3: Render Floating 3D Badge
1. Attach a floating UI element (e.g., `@react-three/drei` `<Html>` component or sprite label) to the guard's 3D group/shield mesh.
2. Apply tactical HUD styling:
   * Semi-transparent dark backdrop (`bg-slate-900/85`, `backdrop-blur-sm`)
   * Monospace or clean sans-serif font (`font-mono`, `text-xs`, `text-cyan-400` or `text-emerald-400`)
   * Subtle border (`border border-cyan-500/40`, `rounded px-2 py-0.5`, `whitespace-nowrap`)
3. Bind the dynamic string:
   ```tsx
   `${officer.name} · ${Math.round(distance)}m · ETA ~${eta}s`
   ```

---

## 4. Acceptance Criteria
- [ ] Triggering a dispatch for `G01`–`G03` immediately reveals the floating badge on the dispatched officer's 3D shield.
- [ ] The distance (`m`) and ETA (`~s`) decrement smoothly in real time as the officer traverses the Elmina pathway toward the incident sector.
- [ ] Once the officer reaches the target coordinates, the badge updates to reflect arrival or clears the ETA countdown cleanly.
- [ ] Camera rotation/zoom does not break badge readability (`whitespace-nowrap` and proper 3D occlusion/scaling applied).