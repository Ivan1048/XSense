import { runSectorAudit } from '../coverageAudit';
import { OPERATIONAL_LIDARS } from '../../data/lidarData';
import { AUDIO_COVERAGE } from '../../components/Park3D/AudioCoverage';
import { POLES } from '../../data/parkData';

console.log('=== SECTOR COVERAGE AUDIT BEFORE EXPANSION ===');
const before = runSectorAudit();
console.table(before);

const expandedLidars = [
  ...OPERATIONAL_LIDARS,
  {
    id: 'LID-005',
    name: 'Residential Promenade LiDAR Node',
    zoneId: 'east_exit',
    zoneName: 'Residential Promenade',
    mountPoleId: 'AS-106',
    position: [18.0, 12.0] as [number, number],
    mountHeightM: 3.55,
    nominalRangeM: 13.5,
    minRangeM: 0.5,
    fovDeg: 210,
    headingDeg: 280,
    description: 'Monitors Sector D residential promenade and pedestrian access connector.',
  },
];

const expandedAudio = [
  ...AUDIO_COVERAGE,
  { id: 'AUD-005', poleId: 'AS-106', radius: 12 },
];

const expandedPoles = [
  ...POLES,
  {
    id: 'AS-106',
    name: 'Residential Promenade',
    position: [18, 12] as [number, number],
    zone: 'east_exit',
    sensorStatus: 'online' as const,
    lightSetting: 70,
  },
];

console.log('\n=== SECTOR COVERAGE AUDIT AFTER SECTOR D EXPANSION (AS-106 / LID-005 / AUD-005) ===');
const after = runSectorAudit(expandedLidars, expandedAudio, expandedPoles);
console.table(after);
