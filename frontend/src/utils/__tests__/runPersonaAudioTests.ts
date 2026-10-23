// Stage G1 verification — centralized persona audio playback.
// Run with: esbuild --bundle --platform=node --format=esm, then node <out>.mjs
//
// These are behavioural checks against the real service module. Node has no
// HTMLAudioElement, so browser playback itself must be confirmed manually; what
// is asserted here is the action map, asset provenance, volume/mute policy,
// failure reporting, and that no component owns its own audio element.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_PERSONA_AUDIO_VOLUME,
  PERSONA_ACTION_SOUND,
  PERSONA_SOUND_DEFINITIONS,
  RECORDED_PERSONA_ASSET_IDS,
  clampVolume,
  personaAudioService,
  resolvePersonaSound,
  type PersonaSoundType,
} from '../../services/personaAudioService';
import { PERSONA_DEFINITIONS } from '../../data/personaData';
import type { PersonaActionType } from '../../types/persona';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ ${name}`);
      passed++;
    })
    .catch((error: unknown) => {
      console.error(`  ✗ FAIL: ${name} — ${(error as Error).message}`);
      failed++;
    });
}

/** Resolve a repo-relative path whether the runner starts in /frontend or the repo root. */
function resolveRepoPath(relative: string): string | null {
  const candidates = [
    join(process.cwd(), relative),
    join(process.cwd(), '..', relative),
    join(process.cwd(), '..', '..', relative),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

console.log('\n=== PERSONA AUDIO SERVICE TESTS (STAGE G1) ===\n');

console.log('[1. Action → sound mapping]');

await check('every mapped action resolves to a defined sound definition', () => {
  const actions = Object.keys(PERSONA_ACTION_SOUND);
  assert.ok(actions.length >= 5, `expected at least 5 audible actions, found ${actions.length}`);
  for (const action of actions) {
    const soundType = resolvePersonaSound(action as PersonaActionType);
    assert.ok(soundType, `action ${action} resolved to no sound type`);
    assert.ok(
      PERSONA_SOUND_DEFINITIONS[soundType as PersonaSoundType],
      `sound type ${soundType} has no definition`,
    );
  }
});

await check('all six documented sound types have definitions', () => {
  const required: PersonaSoundType[] = [
    'call_for_help',
    'whistle',
    'child_cry',
    'distress_scream',
    'laughter',
    'conversation',
  ];
  for (const soundType of required) {
    assert.ok(PERSONA_SOUND_DEFINITIONS[soundType], `missing definition for ${soundType}`);
  }
});

await check('every sound-emitting persona action is wired to a cue', () => {
  const soundBearing: PersonaActionType[] = ['call_help', 'whistling', 'child_crying', 'laughing', 'talking'];
  for (const definition of PERSONA_DEFINITIONS) {
    for (const action of definition.supportedActions) {
      if (!soundBearing.includes(action)) continue;
      assert.ok(
        resolvePersonaSound(action),
        `persona ${definition.id} supports ${action} but it plays no cue`,
      );
    }
  }
});

await check('silent actions resolve to null rather than a placeholder sound', () => {
  for (const action of ['walk', 'jog', 'collapse', 'bench_rest'] as const) {
    assert.equal(resolvePersonaSound(action), null, `${action} should stay silent`);
  }
});

console.log('\n[2. Asset provenance]');

await check('recorded sounds point at catalogued assets', () => {
  for (const definition of Object.values(PERSONA_SOUND_DEFINITIONS)) {
    if (definition.source !== 'recorded_sample') continue;
    assert.ok(definition.assetId, `${definition.soundType} has no asset id`);
    assert.ok(
      (RECORDED_PERSONA_ASSET_IDS as readonly string[]).includes(definition.assetId as string),
      `${definition.soundType} uses uncatalogued asset ${definition.assetId}`,
    );
  }
});

await check('the whistle is synthesized and claims no recording', () => {
  const whistle = PERSONA_SOUND_DEFINITIONS.whistle;
  assert.equal(whistle.source, 'synthesized');
  assert.equal(whistle.assetId, undefined);
  assert.match(whistle.provenance, /[Ss]ynthesized/);
});

await check('recorded assets exist on disk', () => {
  for (const assetId of RECORDED_PERSONA_ASSET_IDS) {
    const path = resolveRepoPath(join('backend', 'data', 'audio_samples', assetId));
    assert.ok(path, `missing backend sample file ${assetId}`);
    assert.ok(statSync(path).size > 1000, `${assetId} looks empty`);
  }
});

console.log('\n[3. Volume and mute policy]');

await check('volume is clamped into 0..1', () => {
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume(4), 1);
  assert.equal(clampVolume(0.35), 0.35);
  assert.equal(clampVolume(Number.NaN), DEFAULT_PERSONA_AUDIO_VOLUME);
  personaAudioService.setVolume(3);
  assert.equal(personaAudioService.getState().volume, 1);
  personaAudioService.setVolume(-1);
  assert.equal(personaAudioService.getState().volume, 0);
  personaAudioService.setVolume(DEFAULT_PERSONA_AUDIO_VOLUME);
});

await check('muted playback is reported instead of silently skipped', async () => {
  personaAudioService.setMuted(true);
  const result = await personaAudioService.play('laughter');
  assert.equal(result.success, false);
  assert.equal(result.reason, 'muted');
  assert.ok(result.error, 'muted playback should explain itself');
  personaAudioService.setMuted(false);
});

console.log('\n[4. Failure reporting and lifecycle]');

await check('playback reports unsupported when the browser has no audio element', async () => {
  const result = await personaAudioService.playForAction('call_help');
  assert.ok(result, 'call_help should attempt playback');
  assert.equal(result?.success, false);
  assert.equal(result?.reason, 'unsupported');
  assert.ok(result?.error);
});

await check('non-audible actions do not attempt playback', async () => {
  assert.equal(await personaAudioService.playForAction('jog'), null);
});

await check('stop() is idempotent', () => {
  personaAudioService.stop();
  personaAudioService.stop();
  assert.equal(personaAudioService.getState().playing, null);
});

console.log('\n[5. Single audio owner]');

await check('no component creates its own audio element', () => {
  const srcRoot = resolveRepoPath('src');
  assert.ok(srcRoot, 'could not locate frontend/src');

  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      const text = readFileSync(full, 'utf8');
      if (!/new\s+Audio\s*\(/.test(text)) continue;
      const relative = full.slice(srcRoot.length + 1).replace(/\\/g, '/');
      // The service is the single owner; the Sound AI tab keeps its benchmark player.
      if (relative === 'services/personaAudioService.ts') continue;
      if (relative === 'pages/ParkOverview.tsx') continue;
      offenders.push(relative);
    }
  };
  walk(srcRoot);

  assert.deepEqual(offenders, [], `audio elements created outside the service: ${offenders.join(', ')}`);
});

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
