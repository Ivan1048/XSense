// ── Centralized Persona Audio Playback (Package G · Stage G1) ────────────────
// Single source of truth for operator-triggered persona sound cues.
//
// Playback policy:
//  · One voice at a time — a new cue stops the previous one (last action wins).
//  · Only explicit operator actions play sound; the autonomous scheduler is silent.
//  · Volume is clamped to 0..1 and mute/volume persist in localStorage.
//  · Recorded assets are served by the FastAPI sample route; the whistle is a
//    synthesized tone and is labelled as such.
//
// Boundaries: this module is presentation only. It never creates incidents,
// never calls YAMNet, and never marks an acoustic sensor as having heard
// anything. Playing a cue is not a detection.

import type { PersonaActionType } from '../types/persona';
import { getAudioSampleFileUrl } from './api';

export type PersonaSoundType =
  | 'call_for_help'
  | 'whistle'
  | 'child_cry'
  | 'distress_scream'
  | 'laughter'
  | 'conversation';

export type PersonaAudioSource = 'recorded_sample' | 'synthesized';

export type PersonaAudioFailureReason =
  | 'muted'
  | 'unsupported'
  | 'network'
  | 'playback_blocked'
  | 'no_asset';

export interface AudioPlaybackResult {
  success: boolean;
  soundType: PersonaSoundType;
  source?: PersonaAudioSource;
  assetId?: string;
  error?: string;
  reason?: PersonaAudioFailureReason;
}

export interface PersonaAudioState {
  volume: number;
  muted: boolean;
  playing: PersonaSoundType | null;
}

export interface PersonaAudioService {
  play(soundType: PersonaSoundType): Promise<AudioPlaybackResult>;
  playForAction(action: PersonaActionType): Promise<AudioPlaybackResult | null>;
  stop(): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  getState(): PersonaAudioState;
}

export interface PersonaSoundDefinition {
  soundType: PersonaSoundType;
  label: string;
  source: PersonaAudioSource;
  /** Catalogued backend sample id; present only for recorded assets. */
  assetId?: string;
  /** Plain-language provenance shown next to the playback feedback. */
  provenance: string;
}

// Backend benchmark clips that exist on disk (backend/data/audio_samples).
const DISTRESS_CLIP = 'distress_scream_sample.wav';
const CHATTER_CLIP = 'park_laughter_chatter.wav';

/** Recorded assets this service is allowed to play. */
export const RECORDED_PERSONA_ASSET_IDS = [DISTRESS_CLIP, CHATTER_CLIP] as const;

export const PERSONA_SOUND_DEFINITIONS: Record<PersonaSoundType, PersonaSoundDefinition> = {
  call_for_help: {
    soundType: 'call_for_help',
    label: 'Call for help',
    source: 'recorded_sample',
    assetId: DISTRESS_CLIP,
    provenance: 'Recorded vocal distress/crying sample (ESC-50, CC0)',
  },
  distress_scream: {
    soundType: 'distress_scream',
    label: 'Distress scream',
    source: 'recorded_sample',
    assetId: DISTRESS_CLIP,
    provenance: 'Recorded vocal distress/crying sample (ESC-50, CC0)',
  },
  child_cry: {
    soundType: 'child_cry',
    label: 'Child crying',
    source: 'recorded_sample',
    assetId: DISTRESS_CLIP,
    provenance: 'Recorded crying sample (ESC-50, CC0) · shared distress recording',
  },
  laughter: {
    soundType: 'laughter',
    label: 'Laughter',
    source: 'recorded_sample',
    assetId: CHATTER_CLIP,
    provenance: 'Recorded laughter and voices sample (ESC-50, CC0)',
  },
  conversation: {
    soundType: 'conversation',
    label: 'Conversation',
    source: 'recorded_sample',
    assetId: CHATTER_CLIP,
    provenance: 'Recorded laughter and voices sample (ESC-50, CC0)',
  },
  whistle: {
    soundType: 'whistle',
    label: 'Whistle',
    source: 'synthesized',
    provenance: 'Synthesized two-tone whistle · not a microphone recording',
  },
};

/**
 * Persona actions that produce an operator-audible cue.
 * Actions absent from this map (walk, jog, collapse, …) stay silent:
 * there is no recorded asset for an impact thud and we do not invent one.
 */
export const PERSONA_ACTION_SOUND: Partial<Record<PersonaActionType, PersonaSoundType>> = {
  call_help: 'call_for_help',
  whistling: 'whistle',
  child_crying: 'child_cry',
  laughing: 'laughter',
  talking: 'conversation',
};

export const DEFAULT_PERSONA_AUDIO_VOLUME = 0.7;

const STORAGE_MUTED = 'xsense_persona_audio_muted';
const STORAGE_VOLUME = 'xsense_persona_audio_volume';

export function resolvePersonaSound(action: PersonaActionType): PersonaSoundType | null {
  return PERSONA_ACTION_SOUND[action] ?? null;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PERSONA_AUDIO_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredState(): { volume: number; muted: boolean } {
  let volume = DEFAULT_PERSONA_AUDIO_VOLUME;
  let muted = false;
  const storage = getStorage();
  if (!storage) return { volume, muted };
  try {
    const storedVolume = storage.getItem(STORAGE_VOLUME);
    if (storedVolume !== null) volume = clampVolume(Number(storedVolume));
    muted = storage.getItem(STORAGE_MUTED) === 'true';
  } catch {
    /* storage can be unavailable in private modes; defaults remain */
  }
  return { volume, muted };
}

const stored = readStoredState();
let volume = stored.volume;
let muted = stored.muted;
let playing: PersonaSoundType | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentOscillator: OscillatorNode | null = null;
let audioContext: AudioContext | null = null;

const audioCache = new Map<string, HTMLAudioElement>();

function persistState() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_VOLUME, String(volume));
    storage.setItem(STORAGE_MUTED, String(muted));
  } catch {
    /* persistence is best-effort; playback still works */
  }
}

function getCachedAudio(assetId: string): HTMLAudioElement {
  const cached = audioCache.get(assetId);
  if (cached) return cached;

  const audio = new Audio(getAudioSampleFileUrl(assetId));
  audio.preload = 'auto';
  audio.addEventListener('ended', () => {
    if (currentAudio === audio) {
      currentAudio = null;
      playing = null;
    }
  });
  audio.addEventListener('error', () => {
    if (currentAudio === audio) {
      currentAudio = null;
      playing = null;
    }
  });
  audioCache.set(assetId, audio);
  return audio;
}

async function closeAudioContext() {
  const context = audioContext;
  audioContext = null;
  if (!context) return;
  try {
    await context.close();
  } catch {
    /* already closed */
  }
}

function stopInternal() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* element may not be decodable yet */
    }
    currentAudio = null;
  }
  if (currentOscillator) {
    try {
      currentOscillator.stop();
    } catch {
      /* already stopped */
    }
    currentOscillator = null;
  }
  void closeAudioContext();
  playing = null;
}

function unsupported(soundType: PersonaSoundType, message: string): AudioPlaybackResult {
  return { success: false, soundType, error: message, reason: 'unsupported' };
}

async function playRecorded(definition: PersonaSoundDefinition): Promise<AudioPlaybackResult> {
  if (!definition.assetId) {
    return { success: false, soundType: definition.soundType, error: 'No audio asset is configured for this action.', reason: 'no_asset' };
  }
  if (typeof Audio !== 'function') {
    return unsupported(definition.soundType, 'Audio playback is not available in this environment.');
  }

  try {
    const audio = getCachedAudio(definition.assetId);
    audio.volume = volume;
    audio.currentTime = 0;
    currentAudio = audio;
    playing = definition.soundType;
    await audio.play();
    return {
      success: true,
      soundType: definition.soundType,
      source: 'recorded_sample',
      assetId: definition.assetId,
    };
  } catch (error) {
    stopInternal();
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError') {
      return {
        success: false,
        soundType: definition.soundType,
        error: 'The browser blocked playback until you interact with the page.',
        reason: 'playback_blocked',
      };
    }
    if (name === 'NotSupportedError') {
      return unsupported(definition.soundType, 'This browser cannot play the sample format.');
    }
    return {
      success: false,
      soundType: definition.soundType,
      error: 'Audio file unavailable. Check that the FastAPI backend is running on port 8000.',
      reason: 'network',
    };
  }
}

function playSynthesizedWhistle(definition: PersonaSoundDefinition): AudioPlaybackResult {
  const Context = typeof window !== 'undefined'
    ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;

  if (!Context) {
    return unsupported(definition.soundType, 'Web Audio synthesis is not available in this browser.');
  }

  try {
    const context = new Context();
    audioContext = context;
    const now = context.currentTime;
    const peak = Math.max(0.0002, volume * 0.22);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1750, now);
    oscillator.frequency.setValueAtTime(1750, now + 0.18);
    oscillator.frequency.linearRampToValueAtTime(2350, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.03);
    gain.gain.setValueAtTime(peak, now + 0.36);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
    oscillator.connect(gain).connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.6);
    currentOscillator = oscillator;
    playing = definition.soundType;
    oscillator.onended = () => {
      if (currentOscillator === oscillator) {
        currentOscillator = null;
        playing = null;
      }
      void closeAudioContext();
    };

    return { success: true, soundType: definition.soundType, source: 'synthesized' };
  } catch {
    void closeAudioContext();
    stopInternal();
    return unsupported(definition.soundType, 'Could not start the synthesized whistle.');
  }
}

async function play(soundType: PersonaSoundType): Promise<AudioPlaybackResult> {
  // Last action wins: never layer or queue cues.
  stopInternal();

  if (muted) {
    return { success: false, soundType, error: 'Persona sound is muted.', reason: 'muted' };
  }

  const definition = PERSONA_SOUND_DEFINITIONS[soundType];
  if (!definition) {
    return { success: false, soundType, error: 'No sound is configured for this action.', reason: 'no_asset' };
  }

  if (definition.source === 'synthesized') {
    return playSynthesizedWhistle(definition);
  }
  return playRecorded(definition);
}

async function playForAction(action: PersonaActionType): Promise<AudioPlaybackResult | null> {
  const soundType = resolvePersonaSound(action);
  if (!soundType) return null;
  return play(soundType);
}

function setVolume(nextVolume: number) {
  volume = clampVolume(nextVolume);
  if (currentAudio) currentAudio.volume = volume;
  persistState();
}

function setMuted(nextMuted: boolean) {
  muted = Boolean(nextMuted);
  if (muted) stopInternal();
  persistState();
}

function getState(): PersonaAudioState {
  return { volume, muted, playing };
}

export const personaAudioService: PersonaAudioService = {
  play,
  playForAction,
  stop: stopInternal,
  setVolume,
  setMuted,
  getState,
};
