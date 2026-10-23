import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import type { AnonymousHumanoidProps, PersonaActionType } from '../../types/persona';
import { PERSONA_DEFINITIONS } from '../../data/personaData';
import { usePersonaStateMachine } from '../../hooks/usePersonaStateMachine';
import { usePark } from '../../context/ParkContext';
import { ChildCompanion, CanineCompanion } from './CompanionPrimitives';

// ── Shared Static Geometries ────────────────────────────────────────────────
const SHARED_GEOMETRIES = {
  head: new THREE.SphereGeometry(0.16, 12, 10),
  torso: new THREE.CylinderGeometry(0.16, 0.14, 0.48, 10),
  pelvis: new THREE.CylinderGeometry(0.14, 0.12, 0.14, 10),
  upperArm: new THREE.CylinderGeometry(0.048, 0.042, 0.30, 8),
  forearm: new THREE.CylinderGeometry(0.042, 0.036, 0.26, 8),
  thigh: new THREE.CylinderGeometry(0.065, 0.055, 0.38, 8),
  shin: new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8),
  haloRing: new THREE.RingGeometry(0.95, 1.35, 32),
  sosRing: new THREE.RingGeometry(0.7, 1.1, 32),
  cane: new THREE.CylinderGeometry(0.015, 0.012, 0.88, 6),
  visor: new THREE.TorusGeometry(0.17, 0.02, 6, 12, Math.PI * 0.75),
  wristband: new THREE.TorusGeometry(0.045, 0.012, 6, 12),
  phone: new THREE.BoxGeometry(0.045, 0.088, 0.008),
  phoneScreen: new THREE.PlaneGeometry(0.038, 0.078),
};

/**
 * AnonymousHumanoid — Stage 2 Autonomous Persona System
 *
 * Implements canonical joint damping across all rotational axes to eliminate
 * animation overlapping, conflicting transforms, and posture retention bugs.
 * When switching actions, all joints smoothly blend to the new action's target pose.
 */
export default function AnonymousHumanoid({
  path,
  paused,
  highlight,
  stationary,
  isLookalikeStop = false,
  isCollapsed = false,
  isSOS = false,
  sosTargetPos = null,
  onSelect,
  personaIndex,
}: AnonymousHumanoidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const sosRingRef = useRef<THREE.Mesh>(null);

  // Joint hierarchy references
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  // Smooth rotational state trackers for all joints
  const bodyPitchRef = useRef(0);
  const bodyRollRef = useRef(0);
  const headPitchRef = useRef(0);
  const leftArmXRef = useRef(0);
  const leftArmZRef = useRef(0);
  const rightArmXRef = useRef(0);
  const rightArmZRef = useRef(0);
  const leftElbowXRef = useRef(0.20);
  const rightElbowXRef = useRef(0.20);
  const leftLegXRef = useRef(0);
  const leftLegZRef = useRef(0);
  const rightLegXRef = useRef(0);
  const rightLegZRef = useRef(0);
  const leftKneeXRef = useRef(0);
  const rightKneeXRef = useRef(0);

  const [hovered, setHovered] = useState(false);

  // Derive persona definition from pathIndex or passed prop
  const resolvedIndex = personaIndex !== undefined ? personaIndex : (path as any)._index ?? 0;
  const personaDef = PERSONA_DEFINITIONS[resolvedIndex] || PERSONA_DEFINITIONS[0];

  const { states } = usePersonaStateMachine();
  const runtimeState = states[resolvedIndex] || states[0];

  // Effective action combines external scene demonstration props with internal persona FSM
  const effectiveAction: PersonaActionType = useMemo(() => {
    if (!runtimeState && isCollapsed) return 'collapse';
    if (isSOS) return 'call_help';
    if (isLookalikeStop || stationary) return 'walk';
    return runtimeState?.currentAction || 'walk';
  }, [isCollapsed, isSOS, isLookalikeStop, stationary, runtimeState?.currentAction]);

  // Is the character currently in a collapsed ground state?
  // Persona recovery owns the body pose; incident/legacy props cannot pin it down.
  const isProne = runtimeState
    ? runtimeState.fsmState === 'collapsed'
    : isCollapsed || effectiveAction === 'collapse';
  const isSignalingHelp = isSOS || effectiveAction === 'call_help';

  const { incidents, fallPoleId, acousticPoleId } = usePark();
  const caseIsActive = (id: string | undefined, fallbackActive: boolean) => {
    const incident = id ? incidents.find((item) => item.id === id) : undefined;
    return incident
      ? incident.status !== 'resolved' && incident.status !== 'false_alarm'
      : fallbackActive;
  };
  const showFallAlert = isProne && caseIsActive(runtimeState?.fallIncidentId, Boolean(fallPoleId));
  const showHelpAlert = isSignalingHelp && (isSOS || caseIsActive(runtimeState?.helpIncidentId, Boolean(acousticPoleId)));
  const isEmergency = highlight || showFallAlert || showHelpAlert;
  const showPostureBox = hovered || isLookalikeStop || isEmergency;

  // Root vertical height tracker (0.86m nominal waist height)
  const currentY = useRef(runtimeState?.hasWorldPosition ? runtimeState.worldPosition[1] : 0.86);
  const progressRef = useRef(runtimeState?.pathProgress ?? path.offset);
  const gaitPhaseRef = useRef(0);
  const currentYawRef = useRef(runtimeState?.headingAngleRad ?? 0);
  const jumpingJackPhaseRef = useRef(0);

  // Smooth CatmullRom spline
  const curve = useMemo(() => {
    if (!path.waypoints || path.waypoints.length < 3) return null;
    const pts = path.waypoints.map(([wx, wz]) => new THREE.Vector3(wx, 0.86, wz));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.25);
  }, [path.waypoints]);

  const initialPos = useMemo<[number, number, number]>(() => {
    if (curve) {
      const pt = curve.getPointAt(path.offset % 1);
      return [pt.x, 0.86, pt.z];
    }
    const angle = (path.offset * Math.PI * 2) % (Math.PI * 2);
    return [
      path.x + Math.cos(angle) * path.radius,
      0.86,
      path.z + Math.sin(angle) * path.radius * 0.65,
    ];
  }, [curve, path.x, path.z, path.radius, path.offset]);

  const mountPosition = useRef<[number, number, number]>(
    runtimeState?.hasWorldPosition ? [...runtimeState.worldPosition] : initialPos,
  );

  // Color tokens
  const color = isEmergency ? (showHelpAlert ? '#ef4444' : '#ffb759') : '#5ee6da';
  const emissive = isEmergency ? (showHelpAlert ? '#dc2626' : '#ea580c') : '#0e7490';
  const wireColor = isEmergency ? (showHelpAlert ? '#ef4444' : '#f59e0b') : '#38bdf8';

  const humanoidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: isEmergency ? 0.85 : 0.42,
        roughness: 0.35,
        metalness: 0.15,
      }),
    [color, emissive, isEmergency],
  );

  const accessoryMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.5,
        metalness: 0.3,
      }),
    [],
  );

  const phoneCaseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.25,
        metalness: 0.85,
      }),
    [],
  );

  const phoneScreenMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
      }),
    [],
  );

  const isCrouched = !isProne && (effectiveAction === 'crouch' || effectiveAction === 'tie_shoelaces');
  const isSeated = !isProne && (effectiveAction === 'sit' || effectiveAction === 'bench_rest');

  const boxDim: [number, number, number] = useMemo(() => {
    if (isProne) return [1.65, 0.34, 0.60];
    if (isSeated) return [0.65, 0.72, 0.65];
    if (isCrouched) return [0.65, 0.90, 0.65];
    return [0.55, 1.72, 0.55];
  }, [isProne, isSeated, isCrouched]);

  const htmlYOffset = boxDim[1] / 2 + 0.45;

  useFrame(({ clock }, rawDelta) => {
    if (!groupRef.current) return;

    const delta = Math.min(rawDelta, 0.1);
    // Collapsed runtime position is the ground truth used by the detection gate.
    if (runtimeState?.fsmState === 'collapsed') {
      const collapsePosition = runtimeState.collapsePosition ?? runtimeState.worldPosition;
      groupRef.current.position.x = collapsePosition[0];
      groupRef.current.position.z = collapsePosition[2];
    }
    const curX = groupRef.current.position.x;
    const curZ = groupRef.current.position.z;

    // ── 1. Footbridge Elevation Curve ───────────────────────────────────────
    const isOnBridge = curX >= 1.3 && curX <= 5.9 && Math.abs(curZ - -4.8) < 1.3;
    const bridgeElev = isOnBridge ? Math.sin(((curX - 1.3) / 4.6) * Math.PI) * 0.24 : 0;

    let targetY = 0.86 + bridgeElev;
    if (isProne) {
      targetY = 0.20;
    } else if (effectiveAction === 'bench_rest') {
      targetY = 0.48; // Bench seat height
    } else if (effectiveAction === 'sit') {
      targetY = 0.38;
    } else if (effectiveAction === 'tie_shoelaces') {
      targetY = 0.40; // Grounded kneeling height: rear knee and front foot both touch ground
    } else if (isCrouched) {
      targetY = 0.45;
    }

    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 6.0, delta);
    groupRef.current.position.y = currentY.current;


    // ── 2. SOS Pulse Ring ───────────────────────────────────────────────────
    if (isSignalingHelp && sosRingRef.current) {
      const pulse = 1 + ((clock.getElapsedTime() * 2.4) % 2.2);
      sosRingRef.current.scale.set(pulse, pulse, 1);
      const mat = sosRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.75 - (pulse - 1) / 2.2);
    }

    // ── 3. Locomotion Movement ──────────────────────────────────────────────
    const isMobileAction = (effectiveAction === 'walk' || effectiveAction === 'jog' || effectiveAction === 'sprint') && !isProne;
    const isMovementActive = !paused && !stationary && !isLookalikeStop && isMobileAction;

    if (isMovementActive) {
      const speedMultiplier = effectiveAction === 'sprint' ? 2.2 : effectiveAction === 'jog' ? 1.25 : 1.0;
      const effectiveSpeed = (personaDef.baseSpeed || path.speed) * speedMultiplier;
      const speedFactor = 0.08 * effectiveSpeed;

      progressRef.current = (progressRef.current + delta * speedFactor) % 1;
      const t = progressRef.current < 0 ? progressRef.current + 1 : progressRef.current;

      if (curve) {
        const pt = curve.getPointAt(t);
        const ptNext = curve.getPointAt((t + 0.003) % 1);
        groupRef.current.position.x = pt.x;
        groupRef.current.position.z = pt.z;

        const dx = ptNext.x - pt.x;
        const dz = ptNext.z - pt.z;
        if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - currentYawRef.current;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          currentYawRef.current += diff * Math.min(1, delta * 8.0);
          groupRef.current.rotation.y = currentYawRef.current;
        }
      } else {
        const angle = (progressRef.current * Math.PI * 2) % (Math.PI * 2);
        groupRef.current.position.x = path.x + Math.cos(angle) * path.radius;
        groupRef.current.position.z = path.z + Math.sin(angle) * path.radius * 0.65;
      }

      gaitPhaseRef.current += delta * effectiveSpeed * 8.5;
    }

    // Save the rendered position AFTER movement so route navigation restores
    // the same location and progress instead of the path's starting waypoint.
    if (runtimeState) {
      runtimeState.worldPosition = [groupRef.current.position.x, currentY.current, groupRef.current.position.z];
      runtimeState.hasWorldPosition = true;
      runtimeState.pathProgress = progressRef.current;
      runtimeState.headingAngleRad = currentYawRef.current;
    }

    // ── 4. Canonical Target Pose Calculation (Zero Overlapping Poses) ────────
    // Every single rotational angle starts at a clean neutral target (0)
    let tgtBodyPitch = 0;
    let tgtBodyRoll = 0;
    let tgtHeadPitch = 0;
    let tgtLeftArmX = 0;
    let tgtLeftArmZ = 0;
    let tgtLeftElbowX = 0.20;
    let tgtRightArmX = 0;
    let tgtRightArmZ = 0;
    let tgtRightElbowX = 0.20;
    let tgtLeftLegX = 0;
    let tgtLeftLegZ = 0;
    let tgtLeftKneeX = 0;
    let tgtRightLegX = 0;
    let tgtRightLegZ = 0;
    let tgtRightKneeX = 0;

    // Senior natural stoop trait
    if (personaDef.category === 'senior' && !isProne) {
      tgtBodyPitch = 0.16;
    }

    if (isProne) {
      // ── Prone / Collapsed on Ground ────────────────────────────────────────
      tgtBodyPitch = -Math.PI / 2;
      tgtBodyRoll = 0.28;
      tgtLeftLegX = 0.20;
      tgtRightLegX = -0.30;
      tgtLeftArmX = 0.60;

      if (isSignalingHelp) {
        // Calling for help WHILE COLLAPSED: Upper body propped, right arm raised waving
        tgtBodyPitch = -1.25; // Slightly propped off ground
        const wave = Math.sin(clock.getElapsedTime() * 10.0) * 0.35;
        tgtRightArmX = -1.6;
        tgtRightArmZ = -0.6 + wave;
        tgtRightElbowX = 0.6;
        tgtHeadPitch = -0.4;
      } else {
        tgtRightArmX = -0.50;
      }
    } else if (isSignalingHelp) {
      // ── Calling for Help while Upright ─────────────────────────────────────
      const wave = Math.sin(clock.getElapsedTime() * 12.0) * 0.40;
      tgtLeftArmZ = 2.4 + wave;
      tgtRightArmZ = -2.4 - wave;
    } else if (effectiveAction === 'jumping_jacks') {
      // ── Jumping Jacks Aerobic Cycle ───────────────────────────────────────
      jumpingJackPhaseRef.current += delta * 8.8;
      const jackSpread = Math.sin(jumpingJackPhaseRef.current);
      const isSpread = jackSpread > 0;
      tgtLeftLegZ = isSpread ? 0.40 : 0.05;
      tgtRightLegZ = isSpread ? -0.40 : -0.05;
      tgtLeftArmZ = isSpread ? 2.6 : 0.15;
      tgtRightArmZ = isSpread ? -2.6 : -0.15;
      tgtLeftElbowX = 0;
      tgtRightElbowX = 0;
    } else if (effectiveAction === 'yoga') {
      // ── Yoga Tree Pose (Vrikshasana) ──────────────────────────────────────
      const sway = Math.sin(clock.getElapsedTime() * 1.5) * 0.02;
      tgtRightLegZ = -0.75;
      tgtRightLegX = 0.35;
      tgtRightKneeX = 2.0;
      tgtLeftArmZ = 2.75 + sway;
      tgtRightArmZ = -2.75 - sway;
      tgtLeftElbowX = 0;
      tgtRightElbowX = 0;
    } else if (effectiveAction === 'check_phone') {
      // ── Checking Phone: Natural upright stance with arm articulated close to chest ──
      tgtBodyPitch = 0.04; // Slight natural stance pitch
      tgtHeadPitch = 0.42; // Tilted downward directly facing the phone screen

      // Right Arm: Upper arm hangs comfortably against ribcage, forearm flexed across chest
      tgtRightArmX = -0.48;  // Upper arm angled forward ~27°
      tgtRightArmZ = 0.28;   // Upper arm adducted inward towards sternum
      tgtRightElbowX = 1.78; // Forearm flexed up holding phone close in front of chest

      // Left Arm: Relaxed beside the body
      tgtLeftArmX = -0.06;
      tgtLeftArmZ = -0.06;
      tgtLeftElbowX = 0.22;

      // Relaxed feet posture
      tgtLeftLegX = 0.03;
      tgtRightLegX = -0.03;
    } else if (effectiveAction === 'tie_shoelaces') {
      // ── Tying Shoelaces: Realistic One-Knee Grounded Kneeling Pose ────────
      tgtBodyPitch = 0.44; // Natural forward torso lean over front thigh
      tgtBodyRoll = 0.04;  // Subtle weight shift over planted front foot
      tgtHeadPitch = 0.68; // Head tilted downward looking directly at the shoe

      // Front Left Leg (supporting foot planted flat on ground)
      tgtLeftLegX = -1.25; // Hip flexed forward
      tgtLeftLegZ = 0.05;
      tgtLeftKneeX = 1.62; // Knee flexed ~93°, lower shin vertical to ground

      // Rear Right Leg (kneeling knee resting on ground)
      tgtRightLegX = 0.28; // Hip extended back
      tgtRightLegZ = -0.06;
      tgtRightKneeX = 1.58; // Knee bent ~90°, shin resting back along ground

      // Both Arms reaching down toward the front left shoe
      const laceFidget = Math.sin(clock.getElapsedTime() * 4.5) * 0.035;
      tgtLeftArmX = -0.88 + laceFidget;
      tgtLeftArmZ = -0.12;
      tgtLeftElbowX = 1.05 + laceFidget;

      tgtRightArmX = -1.02 - laceFidget;
      tgtRightArmZ = 0.34; // Reaching across torso toward the left shoe
      tgtRightElbowX = 1.20 - laceFidget;
    } else if (isSeated) {
      // ── Seated / Bench Resting ────────────────────────────────────────────
      tgtLeftLegX = -Math.PI / 2;
      tgtRightLegX = -Math.PI / 2;
      tgtLeftKneeX = Math.PI / 2;
      tgtRightKneeX = Math.PI / 2;
      tgtLeftArmX = -0.2;
      tgtRightArmX = -0.2;
    } else if (effectiveAction === 'crouch') {
      // ── Crouching ─────────────────────────────────────────────────────────
      tgtBodyPitch = 0.35;
      tgtLeftLegX = -1.2;
      tgtRightLegX = -1.2;
      tgtLeftKneeX = 1.4;
      tgtRightKneeX = 1.4;
      tgtLeftArmX = -0.4;
      tgtRightArmX = -0.4;
    } else if (effectiveAction === 'talking') {
      // ── Talking: Expressive hand gestures & subtle head nod ─────────────
      const talkCadence = Math.sin(clock.getElapsedTime() * 5.0);
      tgtHeadPitch = talkCadence * 0.08;
      tgtRightArmX = -0.45 + talkCadence * 0.15;
      tgtRightElbowX = 0.85;
      tgtLeftArmX = -0.25;
      tgtLeftElbowX = 0.40;
    } else if (effectiveAction === 'laughing') {
      // ── Laughing: Torso bobbing & head tilted back ──────────────────────
      const laughShake = Math.sin(clock.getElapsedTime() * 12.0);
      tgtHeadPitch = -0.18 + laughShake * 0.06;
      tgtBodyPitch = (personaDef.category === 'senior' ? 0.16 : 0) + laughShake * 0.04;
      tgtRightArmX = -0.3;
      tgtLeftArmX = -0.3;
      tgtRightElbowX = 0.7;
      tgtLeftElbowX = 0.7;
    } else if (effectiveAction === 'whistling') {
      // ── Whistling: Head tilted up, hands relaxed ────────────────────────
      tgtHeadPitch = -0.14;
      tgtLeftArmX = -0.15;
      tgtRightArmX = -0.15;
      tgtLeftElbowX = 0.35;
      tgtRightElbowX = 0.35;
    } else if (effectiveAction === 'pause_tree') {
      // ── Paused near Tree: Relaxed observation stance looking around ─────
      tgtHeadPitch = -0.12 + Math.sin(clock.getElapsedTime() * 1.2) * 0.08;
      tgtLeftArmX = -0.1;
      tgtRightArmX = -0.1;
      tgtLeftElbowX = 0.3;
      tgtRightElbowX = 0.3;
    } else if (effectiveAction === 'child_crying') {
      // ── Child Crying: Hands up to face sobbing ──────────────────────────
      const crySob = Math.sin(clock.getElapsedTime() * 10.0);
      tgtHeadPitch = 0.35 + crySob * 0.05;
      tgtLeftArmX = -1.25;
      tgtRightArmX = -1.25;
      tgtLeftElbowX = 1.6;
      tgtRightElbowX = 1.6;
    } else if (isMovementActive) {
      // ── Walking / Jogging / Sprinting Locomotion ───────────────────────────
      if (effectiveAction === 'jog') tgtBodyPitch = 0.12;
      if (effectiveAction === 'sprint') tgtBodyPitch = 0.28;

      const phase = gaitPhaseRef.current;
      const legAmplitude = effectiveAction === 'sprint' ? 0.95 : effectiveAction === 'jog' ? 0.65 : 0.52;
      const armAmplitude = effectiveAction === 'sprint' ? 0.85 : 0.45;

      const legSwing = Math.sin(phase) * legAmplitude;
      const armSwing = Math.sin(phase) * armAmplitude;

      tgtLeftLegX = legSwing;
      tgtRightLegX = -legSwing;
      tgtLeftKneeX = Math.max(0, -legSwing * 0.85);
      tgtRightKneeX = Math.max(0, legSwing * 0.85);
      tgtLeftArmX = -armSwing;
      tgtRightArmX = armSwing;
      tgtLeftElbowX = 0.25;
      tgtRightElbowX = 0.25;
    }

    // ── 5. Apply Smooth Damping to ALL Joint Rotations ───────────────────────
    // Damping lambda = 9.0 guarantees fast, buttery smooth transitions without snapping
    const DAMP_RATE = 9.0;

    bodyPitchRef.current = THREE.MathUtils.damp(bodyPitchRef.current, tgtBodyPitch, DAMP_RATE, delta);
    bodyRollRef.current = THREE.MathUtils.damp(bodyRollRef.current, tgtBodyRoll, DAMP_RATE, delta);
    headPitchRef.current = THREE.MathUtils.damp(headPitchRef.current, tgtHeadPitch, DAMP_RATE, delta);

    leftArmXRef.current = THREE.MathUtils.damp(leftArmXRef.current, tgtLeftArmX, DAMP_RATE, delta);
    leftArmZRef.current = THREE.MathUtils.damp(leftArmZRef.current, tgtLeftArmZ, DAMP_RATE, delta);
    leftElbowXRef.current = THREE.MathUtils.damp(leftElbowXRef.current, tgtLeftElbowX, DAMP_RATE, delta);

    rightArmXRef.current = THREE.MathUtils.damp(rightArmXRef.current, tgtRightArmX, DAMP_RATE, delta);
    rightArmZRef.current = THREE.MathUtils.damp(rightArmZRef.current, tgtRightArmZ, DAMP_RATE, delta);
    rightElbowXRef.current = THREE.MathUtils.damp(rightElbowXRef.current, tgtRightElbowX, DAMP_RATE, delta);

    leftLegXRef.current = THREE.MathUtils.damp(leftLegXRef.current, tgtLeftLegX, DAMP_RATE, delta);
    leftLegZRef.current = THREE.MathUtils.damp(leftLegZRef.current, tgtLeftLegZ, DAMP_RATE, delta);
    leftKneeXRef.current = THREE.MathUtils.damp(leftKneeXRef.current, tgtLeftKneeX, DAMP_RATE, delta);

    rightLegXRef.current = THREE.MathUtils.damp(rightLegXRef.current, tgtRightLegX, DAMP_RATE, delta);
    rightLegZRef.current = THREE.MathUtils.damp(rightLegZRef.current, tgtRightLegZ, DAMP_RATE, delta);
    rightKneeXRef.current = THREE.MathUtils.damp(rightKneeXRef.current, tgtRightKneeX, DAMP_RATE, delta);

    // Apply values to Three.js scene graph
    if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.x = bodyPitchRef.current;
      bodyGroupRef.current.rotation.z = bodyRollRef.current;
    }
    if (headRef.current) {
      headRef.current.rotation.x = headPitchRef.current;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = leftArmXRef.current;
      leftArmRef.current.rotation.z = leftArmZRef.current;
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = leftElbowXRef.current;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = rightArmXRef.current;
      rightArmRef.current.rotation.z = rightArmZRef.current;
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = rightElbowXRef.current;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = leftLegXRef.current;
      leftLegRef.current.rotation.z = leftLegZRef.current;
    }
    if (leftKneeRef.current) {
      leftKneeRef.current.rotation.x = leftKneeXRef.current;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = rightLegXRef.current;
      rightLegRef.current.rotation.z = rightLegZRef.current;
    }
    if (rightKneeRef.current) {
      rightKneeRef.current.rotation.x = rightKneeXRef.current;
    }
  });

  return (
    <>
      <group
        ref={groupRef}
        position={mountPosition.current}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* ── 10-Mesh Primitive Humanoid Body ──────────────────────────────── */}
        <group ref={bodyGroupRef}>
          {/* Head */}
          <mesh ref={headRef} position={[0, 0.68, 0]} geometry={SHARED_GEOMETRIES.head} material={humanoidMaterial} castShadow>
            {personaDef.accessoryType === 'visor' && (
              <mesh position={[0, 0.04, 0.08]} rotation={[0.4, 0, 0]} geometry={SHARED_GEOMETRIES.visor} material={accessoryMaterial} />
            )}
          </mesh>

          {/* Torso */}
          <mesh position={[0, 0.28, 0]} geometry={SHARED_GEOMETRIES.torso} material={humanoidMaterial} castShadow />

          {/* Pelvis */}
          <mesh position={[0, -0.04, 0]} geometry={SHARED_GEOMETRIES.pelvis} material={humanoidMaterial} castShadow />

          {/* Left Arm */}
          <group ref={leftArmRef} position={[0.22, 0.46, 0]}>
            <mesh position={[0, -0.15, 0]} geometry={SHARED_GEOMETRIES.upperArm} material={humanoidMaterial} />
            <group ref={leftElbowRef} position={[0, -0.30, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={SHARED_GEOMETRIES.forearm} material={humanoidMaterial} />
              {personaDef.accessoryType === 'wristband' && (
                <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={SHARED_GEOMETRIES.wristband} material={accessoryMaterial} />
              )}
            </group>
          </group>

          {/* Right Arm */}
          <group ref={rightArmRef} position={[-0.22, 0.46, 0]}>
            <mesh position={[0, -0.15, 0]} geometry={SHARED_GEOMETRIES.upperArm} material={humanoidMaterial} />
            <group ref={rightElbowRef} position={[0, -0.30, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={SHARED_GEOMETRIES.forearm} material={humanoidMaterial} />
              {personaDef.accessoryType === 'cane' && (
                <mesh position={[-0.04, -0.35, 0.15]} rotation={[0.2, 0, 0]} geometry={SHARED_GEOMETRIES.cane} material={accessoryMaterial} />
              )}
              {personaDef.accessoryType === 'wristband' && (
                <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={SHARED_GEOMETRIES.wristband} material={accessoryMaterial} />
              )}
              {/* Smartphone Object: Held in right hand when checking phone */}
              {effectiveAction === 'check_phone' && (
                <group position={[0, -0.26, 0.04]} rotation={[0.42, -0.20, 0.12]}>
                  {/* Phone chassis */}
                  <mesh geometry={SHARED_GEOMETRIES.phone} material={phoneCaseMaterial} castShadow />
                  {/* Glowing OLED screen facing upward toward head */}
                  <mesh position={[0, 0, 0.005]} geometry={SHARED_GEOMETRIES.phoneScreen} material={phoneScreenMaterial} />
                </group>
              )}
            </group>
          </group>

          {/* Left Leg */}
          <group ref={leftLegRef} position={[0.11, -0.11, 0]}>
            <mesh position={[0, -0.19, 0]} geometry={SHARED_GEOMETRIES.thigh} material={humanoidMaterial} />
            <group ref={leftKneeRef} position={[0, -0.38, 0]}>
              <mesh position={[0, -0.18, 0]} geometry={SHARED_GEOMETRIES.shin} material={humanoidMaterial} />
            </group>
          </group>

          {/* Right Leg */}
          <group ref={rightLegRef} position={[-0.11, -0.11, 0]}>
            <mesh position={[0, -0.19, 0]} geometry={SHARED_GEOMETRIES.thigh} material={humanoidMaterial} />
            <group ref={rightKneeRef} position={[0, -0.38, 0]}>
              <mesh position={[0, -0.18, 0]} geometry={SHARED_GEOMETRIES.shin} material={humanoidMaterial} />
            </group>
          </group>
        </group>

        {/* Bounding Box Wireframe */}
        {showPostureBox && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={boxDim} />
            <meshBasicMaterial transparent opacity={0.12} color={wireColor} />
            <Edges threshold={15} color={wireColor} lineWidth={2} />
          </mesh>
        )}

        {/* Collapsed Amber Halo Ground Ring */}
        {isProne && (
          <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHARED_GEOMETRIES.haloRing}>
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Resident SOS Ground Pulse Ring */}
        {showHelpAlert && (
          <mesh ref={sosRingRef} position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHARED_GEOMETRIES.sosRing}>
            <meshBasicMaterial color="#ef4444" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Tooltip Badge */}
        {showPostureBox && (
          <Html position={isProne ? [0, -0.35, 1.35] : [0, htmlYOffset, 0]} center>
            <div
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                background: showHelpAlert
                  ? 'rgba(185, 28, 28, 0.95)'
                  : isProne
                  ? 'rgba(180, 83, 9, 0.94)'
                  : isLookalikeStop
                  ? 'rgba(15, 23, 42, 0.92)'
                  : 'rgba(14, 116, 144, 0.90)',
                color: '#ffffff',
                border: `1px solid ${wireColor}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              {showHelpAlert
                ? '🆘 Resident SOS · Help Requested Here'
                : isProne
                ? 'Simulated visitor · Collapsed pose (ground truth)'
                : isLookalikeStop
                ? 'Standing Upright (1.72m) · Stopped Dot = No Alert'
                : `Anonymous Person · ${effectiveAction.replace('_', ' ')} (${boxDim[1].toFixed(2)}m)`}
            </div>
          </Html>
        )}
      </group>

      {/* Companion Models */}
      {personaDef.accessoryType === 'child_companion' && (
        <ChildCompanion
          parentGroupRef={groupRef}
          currentAction={effectiveAction}
          isCollapsed={isProne}
          paused={paused}
        />
      )}

      {personaDef.accessoryType === 'dog_companion' && (
        <CanineCompanion
          walkerGroupRef={groupRef}
          currentAction={effectiveAction}
          isCollapsed={isProne}
          paused={paused}
        />
      )}
    </>
  );
}
