// Security guard marker — low-poly humanoid figure following real park pathways.
// Guards are rendered as a simple person shape (head, torso, arms, legs) in the
// existing guard blue/cyan palette. Walking animation plays while traveling.
// All positions are Guard Location (Simulated); no real hardware tracking.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { findGuardPath } from '../../data/guardPaths';

interface GuardMarkerProps {
  guardId?: string;
  guardName: string;
  targetPos: [number, number];
  targetPoleId?: string;
  status: 'traveling' | 'arrived' | 'returning';
  onSelect?: () => void;
  onFinishedReturn?: () => void;
}

// Per-guard tactical offset on the final waypoint so guards don't stack
const GUARD_OFFSET: Record<string, [number, number]> = {
  G01: [-2.2, -1.5],
  G02: [ 2.2, -1.5],
  G03: [-2.2,  1.9],
};

// HTML badge stagger heights
const GUARD_HTML_Y: Record<string, number> = {
  G01: 2.35,
  G02: 2.50,
  G03: 2.65,
};

/** World-units per second along the waypoint chain */
const TRAVEL_SPEED = 5.5;

/** Snap to next waypoint if within this distance */
const REACH_DIST = 0.4;

/** Guard spawn base (off-screen south) */
const SPAWN: [number, number] = [0, -22];

// ── Body part colours ────────────────────────────────────────────────────────
const CLR_BODY   = '#0369a1'; // deep blue uniform
const CLR_ACCENT = '#0284c7'; // mid-blue highlight
const CLR_SKIN   = '#fcd5a2'; // neutral skin tone
const CLR_BOOT   = '#1e293b'; // dark boot
const CLR_CAP    = '#1d4ed8'; // navy cap

// Shared materials created once per module (not per-instance)
const matBody   = new THREE.MeshStandardMaterial({ color: CLR_BODY,   roughness: 0.65, metalness: 0.08 });
const matAccent = new THREE.MeshStandardMaterial({ color: CLR_ACCENT, roughness: 0.65, metalness: 0.08 });
const matSkin   = new THREE.MeshStandardMaterial({ color: CLR_SKIN,   roughness: 0.80 });
const matBoot   = new THREE.MeshStandardMaterial({ color: CLR_BOOT,   roughness: 0.75 });
const matCap    = new THREE.MeshStandardMaterial({ color: CLR_CAP,    roughness: 0.60, metalness: 0.1 });

/**
 * Low-poly humanoid guard body as a composited mesh group.
 * Limb refs are exposed for the walking animation loop.
 */
interface BodyRefs {
  leftLeg:  React.RefObject<THREE.Group>;
  rightLeg: React.RefObject<THREE.Group>;
  leftArm:  React.RefObject<THREE.Group>;
  rightArm: React.RefObject<THREE.Group>;
  body:     React.RefObject<THREE.Group>;
}

function GuardBody({ refs }: { refs: BodyRefs }) {
  return (
    <group>
      {/* ── Head ────────────────────────────────── */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.175, 10, 8]} />
        <primitive object={matSkin} attach="material" />
      </mesh>

      {/* ── Cap brim + crown ────────────────────── */}
      {/* crown */}
      <mesh position={[0, 1.86, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.18, 8]} />
        <primitive object={matCap} attach="material" />
      </mesh>
      {/* brim */}
      <mesh position={[0, 1.77, 0.04]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 10]} />
        <primitive object={matCap} attach="material" />
      </mesh>

      {/* ── Torso ───────────────────────────────── */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.36, 0.50, 0.22]} />
        <primitive object={matBody} attach="material" />
      </mesh>

      {/* Chest badge strip */}
      <mesh position={[0, 1.22, 0.12]}>
        <boxGeometry args={[0.08, 0.06, 0.01]} />
        <primitive object={matAccent} attach="material" />
      </mesh>

      {/* ── Left arm (pivot at shoulder: y=1.35) ─ */}
      <group ref={refs.leftArm} position={[-0.25, 1.35, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.44, 7]} />
          <primitive object={matBody} attach="material" />
        </mesh>
        {/* hand */}
        <mesh position={[0, -0.46, 0]}>
          <sphereGeometry args={[0.065, 6, 5]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
      </group>

      {/* ── Right arm ──────────────────────────── */}
      <group ref={refs.rightArm} position={[0.25, 1.35, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.44, 7]} />
          <primitive object={matBody} attach="material" />
        </mesh>
        <mesh position={[0, -0.46, 0]}>
          <sphereGeometry args={[0.065, 6, 5]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
      </group>

      {/* ── Waist/belt ──────────────────────────── */}
      <mesh position={[0, 0.89, 0]}>
        <boxGeometry args={[0.37, 0.08, 0.22]} />
        <primitive object={matBoot} attach="material" />
      </mesh>

      {/* ── Left leg (pivot at hip: y=0.85) ──── */}
      <group ref={refs.leftLeg} position={[-0.10, 0.85, 0]}>
        {/* thigh */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.44, 7]} />
          <primitive object={matAccent} attach="material" />
        </mesh>
        {/* shin */}
        <mesh position={[0, -0.60, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.38, 7]} />
          <primitive object={matBody} attach="material" />
        </mesh>
        {/* boot */}
        <mesh position={[0.02, -0.84, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.12, 0.22]} />
          <primitive object={matBoot} attach="material" />
        </mesh>
      </group>

      {/* ── Right leg ───────────────────────────── */}
      <group ref={refs.rightLeg} position={[0.10, 0.85, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.44, 7]} />
          <primitive object={matAccent} attach="material" />
        </mesh>
        <mesh position={[0, -0.60, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.38, 7]} />
          <primitive object={matBody} attach="material" />
        </mesh>
        <mesh position={[0.02, -0.84, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.12, 0.22]} />
          <primitive object={matBoot} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

export default function GuardMarker({
  guardId = 'G01',
  guardName,
  targetPos,
  targetPoleId,
  status,
  onSelect,
  onFinishedReturn,
}: GuardMarkerProps) {
  // ── Refs ─────────────────────────────────────────────────────────────────
  const rootRef    = useRef<THREE.Group>(null);
  const bodyRef    = useRef<THREE.Group>(null);
  const leftLegRef  = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef  = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const etaBadgeRef = useRef<HTMLDivElement>(null);
  const facingRef   = useRef<number>(0); // current Y-rotation of the figure

  const offset = GUARD_OFFSET[guardId]  ?? GUARD_OFFSET.G01;
  const htmlY  = GUARD_HTML_Y[guardId]  ?? 3.2;

  // ── Waypoint path ────────────────────────────────────────────────────────
  const forwardWaypoints = useMemo<[number, number][]>(() => {
    if (targetPoleId) return findGuardPath(targetPoleId, offset);
    return [SPAWN, [targetPos[0] + offset[0], targetPos[1] + offset[1]]];
  }, [targetPoleId, targetPos, offset]);

  const returnWaypoints = useMemo(
    () => [...forwardWaypoints].reverse(),
    [forwardWaypoints],
  );

  const totalPathLength = useMemo(() => {
    let len = 0;
    for (let i = 1; i < forwardWaypoints.length; i++) {
      const [ax, az] = forwardWaypoints[i - 1];
      const [bx, bz] = forwardWaypoints[i];
      len += Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
    }
    return len;
  }, [forwardWaypoints]);

  // ── Mutable animation state ───────────────────────────────────────────────
  const wpIdxRef     = useRef<number>(status === 'arrived' ? forwardWaypoints.length - 1 : 0);
  const currentPosRef = useRef(new THREE.Vector3(forwardWaypoints[0][0], 0, forwardWaypoints[0][1]));
  const distRemRef   = useRef<number>(totalPathLength);
  const speedRef     = useRef<number>(0); // current speed for animation

  // ── Main animation loop ───────────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const waypoints = status === 'returning' ? returnWaypoints : forwardWaypoints;
    const pos = currentPosRef.current;

    // ── 1. Move along waypoint chain ────────────────────────────────────────
    if (status === 'arrived') {
      const last = waypoints[waypoints.length - 1];
      pos.set(last[0], 0, last[1]);
      distRemRef.current = 0;
      speedRef.current   = 0;
    } else {
      let budget = TRAVEL_SPEED * delta;
      speedRef.current = TRAVEL_SPEED;
      let moved = false;

      while (budget > 0 && wpIdxRef.current < waypoints.length - 1) {
        const nextIdx = wpIdxRef.current + 1;
        const [nx, nz] = waypoints[nextIdx];
        const target   = new THREE.Vector3(nx, 0, nz);
        const toNext   = target.clone().sub(pos);
        const dist     = toNext.length();

        if (dist <= REACH_DIST || dist <= budget) {
          budget -= dist;
          pos.copy(target);
          wpIdxRef.current = nextIdx;
          if (status === 'returning' && wpIdxRef.current >= waypoints.length - 1) {
            onFinishedReturn?.();
          }
        } else {
          // Face the direction of travel
          facingRef.current = Math.atan2(toNext.x, toNext.z);
          toNext.normalize().multiplyScalar(budget);
          pos.add(toNext);
          budget = 0;
          moved = true;
        }
      }
      if (!moved && speedRef.current > 0) speedRef.current = 0;

      // Recompute remaining path distance for ETA
      let rem = 0;
      for (let i = wpIdxRef.current + 1; i < forwardWaypoints.length; i++) {
        if (i === wpIdxRef.current + 1) {
          const [nx, nz] = forwardWaypoints[i];
          rem += Math.sqrt((nx - pos.x) ** 2 + (nz - pos.z) ** 2);
        } else {
          const [ax, az] = forwardWaypoints[i - 1];
          const [bx, bz] = forwardWaypoints[i];
          rem += Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
        }
      }
      distRemRef.current = rem;
    }

    // ── 2. Apply position & facing ───────────────────────────────────────────
    if (rootRef.current) {
      rootRef.current.position.copy(pos);
      // Smooth rotation toward facing direction
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        facingRef.current,
        Math.min(1, delta * 8),
      );
    }

    // ── 3. Walking / idle animation ──────────────────────────────────────────
    const t   = clock.getElapsedTime();
    const isWalking = status === 'traveling' || status === 'returning';
    const swingFreq = 4.5;   // strides per second
    const swingAmp  = 0.55;  // max leg rotation (radians)
    const armAmp    = 0.35;

    if (isWalking) {
      const swing = Math.sin(t * swingFreq);
      if (leftLegRef.current)  leftLegRef.current.rotation.x  =  swing * swingAmp;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * swingAmp;
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -swing * armAmp;
      if (rightArmRef.current) rightArmRef.current.rotation.x  =  swing * armAmp;
      // Subtle body bob
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.abs(Math.sin(t * swingFreq * 2)) * 0.03;
      }
    } else {
      // Idle — reset limbs, gentle breathing bob
      const idleBob = Math.sin(t * 1.4) * 0.015;
      if (leftLegRef.current)  leftLegRef.current.rotation.x  = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = 0.06;  // slight rest angle
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0.06;
      if (bodyRef.current)     bodyRef.current.position.y      = idleBob;
    }

    // ── 4. ETA badge (imperative DOM update) ─────────────────────────────────
    if (etaBadgeRef.current) {
      if (status === 'traveling' && distRemRef.current > 1.5) {
        const dist   = distRemRef.current;
        const eta    = Math.max(1, Math.ceil(dist / TRAVEL_SPEED));
        const distM  = Math.round(dist);
        etaBadgeRef.current.style.display = 'block';
        etaBadgeRef.current.textContent   = `${guardName} \u00b7 ${distM}m \u00b7 ETA ~${eta}s`;
      } else {
        etaBadgeRef.current.style.display = 'none';
      }
    }
  });

  const statusLabel =
    status === 'arrived'   ? 'On Scene' :
    status === 'returning' ? 'Returning to Post' :
                             'En Route';

  const [startX, startZ] = forwardWaypoints[0];

  const bodyRefs: BodyRefs = {
    leftLeg:  leftLegRef,
    rightLeg: rightLegRef,
    leftArm:  leftArmRef,
    rightArm: rightArmRef,
    body:     bodyRef,
  };

  return (
    <group
      ref={rootRef}
      position={[startX, 0, startZ]}
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
    >
      {/* ── Ground glow ring ───────────────────────────────────────────── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.44, 24]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={status === 'arrived' ? 0.5 : 0.28}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Low-poly humanoid body ─────────────────────────────────────── */}
      <group ref={bodyRef}>
        <GuardBody refs={bodyRefs} />
      </group>

      {/* ── Floating shield badge (HTML) ────────────────────────────────── */}
      <Html position={[0, htmlY, 0]} center>
        <button
          className="guard-shield-btn"
          onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
          title={`${guardName} — Guard Location (Simulated)`}
        >
          <div className="guard-shield-icon-wrap" aria-hidden="true">
            <svg width="13" height="15" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 1L3 5V13C3 19.5 7.5 25.5 12 27C16.5 25.5 21 19.5 21 13V5L12 1Z"
                fill="#0284c7" stroke="#38bdf8" strokeWidth="2.2" strokeLinejoin="round"
              />
              <path d="M12 7V17M7 12H17" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="guard-shield-text">
            <span className="guard-shield-name">
              {guardName}
            </span>
            <span className="guard-shield-badge">
              GUARD · {statusLabel}
            </span>
          </div>
        </button>
      </Html>

      {/* ── ETA / Distance telemetry badge ──────────────────────────────── */}
      <Html position={[0, htmlY + 0.55, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          ref={etaBadgeRef}
          style={{
            display: 'none',
            background: 'rgba(2, 14, 28, 0.90)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(56, 189, 248, 0.40)',
            borderRadius: '3px',
            padding: '1.5px 6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '10px',
            fontWeight: 600,
            color: '#67e8f9',
            whiteSpace: 'nowrap',
            letterSpacing: '0.03em',
            userSelect: 'none',
            boxShadow: '0 0 6px rgba(56, 189, 248, 0.18)',
          }}
          aria-label="Guard ETA readout (Simulated — Guard Location)"
        />
      </Html>
    </group>
  );
}


