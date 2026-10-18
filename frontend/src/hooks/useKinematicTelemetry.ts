import { useMemo, useCallback } from 'react';
import type {
  AnonymousKinematicObservation,
  AudioObservationRequest,
  PersonaActionType,
} from '../types/persona';
import { POLES } from '../data/parkData';
import { OPERATIONAL_LIDAR_RADIUS_M } from '../data/personaData';

/**
 * useKinematicTelemetry Hook
 *
 * Implements:
 * 1. Operational sensor coverage gating (14m radius from online smart poles AS-101..AS-105).
 *    Planned sensors (PLAN-L01..16) are strictly blocked from generating operational observations.
 * 2. Anonymous movement observations (position, speed, height, vertical velocity, aspect ratio).
 * 3. Safe, non-fabricating audio observation requests for sound-producing actions.
 * 4. Zero identity leakage (strict guard privacy guarantee).
 */
export function useKinematicTelemetry() {
  /**
   * Evaluate whether a world coordinate [x, z] is covered by an active operational sensor.
   * Planned sensors never count as operational.
   */
  const evaluateSensorCoverage = useCallback((x: number, z: number, offlinePoleId: string | null = null) => {
    let nearestPoleId: string | null = null;
    let minDistance = Infinity;

    for (const pole of POLES) {
      if (pole.sensorStatus !== 'online' || pole.id === offlinePoleId) {
        continue;
      }
      const dx = x - pole.position[0];
      const dz = z - pole.position[1];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDistance) {
        minDistance = dist;
        nearestPoleId = pole.id;
      }
    }

    const isCovered = minDistance <= OPERATIONAL_LIDAR_RADIUS_M;
    return {
      isCovered,
      coveringPoleId: isCovered ? nearestPoleId : null,
      nearestPoleId,
      distanceToNearestPoleM: Number(minDistance.toFixed(2)),
    };
  }, []);

  /**
   * Classify 3D cluster posture strictly from geometry and kinematics.
   * Anti-false-alarm rules ensure normal crouching / shoelace tying does not trigger collapse alert.
   */
  const classifyPosture = useCallback(
    (heightM: number, speedMps: number, vyMps: number, isCollapsedAction: boolean) => {
      if (isCollapsedAction || heightM <= 0.40) {
        return 'prone_collapsed';
      }
      if (heightM <= 0.80) {
        return 'seated';
      }
      if (heightM <= 1.15) {
        return 'crouching';
      }
      if (speedMps > 0.15) {
        return 'upright_mobile';
      }
      return 'upright_stationary';
    },
    [],
  );

  /**
   * Generate an anonymous kinematic observation struct for guard feeds.
   * Guaranteed zero identity attributes.
   */
  const generateAnonymousObservation = useCallback(
    (
      personaIndex: number,
      worldPos: [number, number, number],
      speedMps: number,
      vyMps: number,
      heightM: number,
      stationarySec: number,
      isCollapsedAction: boolean,
      offlinePoleId: string | null = null,
    ): AnonymousKinematicObservation => {
      const { isCovered, coveringPoleId } = evaluateSensorCoverage(worldPos[0], worldPos[2], offlinePoleId);
      const posture = classifyPosture(heightM, speedMps, vyMps, isCollapsedAction);
      const widthM = isCollapsedAction ? 1.65 : 0.55;
      const aspectRatio = Number((widthM / Math.max(0.2, heightM)).toFixed(2));

      return {
        clusterId: `LIDAR-P-0${personaIndex + 1}`,
        timestamp: Date.now(),
        worldPosition: worldPos,
        horizontalSpeedMps: Number(speedMps.toFixed(2)),
        verticalVelocityMps: Number(vyMps.toFixed(2)),
        clusterHeightM: Number(heightM.toFixed(2)),
        aspectRatio,
        postureClassification: posture,
        stationaryDurationSec: stationarySec,
        isCoveredByOperationalSensor: isCovered,
        coveringPoleId,
      };
    },
    [evaluateSensorCoverage, classifyPosture],
  );

  /**
   * Safe Audio Observation Request Pipeline
   * Emits structured requests for sound cues without synthesizing false AI detection scores.
   */
  const createAudioRequest = useCallback(
    (personaIndex: number, action: PersonaActionType, worldPos: [number, number]): AudioObservationRequest | null => {
      const soundMap: Partial<Record<PersonaActionType, 'vocal_distress' | 'sudden_impact_thud' | 'rapid_footsteps' | 'child_crying' | 'whistling'>> = {
        call_help: 'vocal_distress',
        collapse: 'sudden_impact_thud',
        sprint: 'rapid_footsteps',
        child_crying: 'child_crying',
        whistling: 'whistling',
      };

      const hint = soundMap[action];
      if (!hint) return null;

      const { nearestPoleId } = evaluateSensorCoverage(worldPos[0], worldPos[1]);
      const pole = POLES.find((p) => p.id === nearestPoleId);

      return {
        requestId: `AOR-${Date.now()}-${personaIndex}`,
        sourcePersonaIndex: personaIndex,
        approxLocation: worldPos,
        nearestPoleId: nearestPoleId || 'AS-103',
        nearestZoneId: pole?.zone || 'central_path',
        acousticEventHint: hint,
        timestamp: Date.now(),
        verificationStatus: 'pending_acoustic_confirmation',
        sourceDisclaimer: 'SIMULATION_ACTION_TRIGGER · NO_SYNTHETIC_SENSOR_FABRICATION',
      };
    },
    [evaluateSensorCoverage],
  );

  return {
    evaluateSensorCoverage,
    classifyPosture,
    generateAnonymousObservation,
    createAudioRequest,
  };
}
