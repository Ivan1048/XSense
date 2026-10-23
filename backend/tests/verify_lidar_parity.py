"""Cross-language coverage check. Run from repository root after frontend npm ci."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT / "frontend"
sys.path.insert(0, str(ROOT))
from backend.services.lidar_evaluator import evaluate_lidar_scenario

esbuild_bin = "esbuild.cmd" if os.name == "nt" else "esbuild"
esbuild_path = FRONTEND_DIR / "node_modules" / ".bin" / esbuild_bin

source = '''
import { OPERATIONAL_LIDARS, PARK_OBSTACLES } from SENSOR_DATA;
import { evaluateLidarCoverageForSensor } from GEOMETRY;
const cases = [];
for (const sensor of OPERATIONAL_LIDARS) for (const blocked of [false, true]) for (const offline of [false, true]) {
 for (let x=-24; x<=24; x+=.75) for(let z=-24; z<=24; z+=.75) {
  cases.push({id:sensor.id, pos:[x,z], blocked, offline, detected:evaluateLidarCoverageForSensor([x,z],sensor,PARK_OBSTACLES.filter(o=>!o.isDynamic || blocked),offline).detected});
 }
}
process.stdout.write(JSON.stringify(cases));
'''.replace('SENSOR_DATA', json.dumps(str(ROOT / 'frontend/src/data/lidarData.ts'))).replace('GEOMETRY', json.dumps(str(ROOT / 'frontend/src/utils/lidarGeometry.ts')))
with tempfile.TemporaryDirectory() as temp:
    entry = Path(temp) / 'parity.ts'
    bundle = Path(temp) / 'parity.mjs'
    entry.write_text(source)
    subprocess.run([str(esbuild_path), str(entry), '--bundle', '--platform=node', '--format=esm', f'--outfile={bundle}'], check=True)
    cases = json.loads(subprocess.check_output(['node', str(bundle)]))
for case in cases:
    result = evaluate_lidar_scenario('silent_fall', device_id=case['id'], person_position=case['pos'], route_blocked=case['blocked'], sensor_offline=case['offline'])
    assert result['detected'] == case['detected'], case
    if not result['detected']:
        assert result['trigger_incident'] is False and result['lighting_boost_pct'] is None, case
print(f"PASS: {len(cases)} frontend/backend coverage comparisons and miss responses")
