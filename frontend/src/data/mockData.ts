import type { AlertEvent } from '../types';

export function createInitialEvent(): AlertEvent {
  return {
    id: 1,
    title: 'Simulation ready',
    message:
      'Virtual park initialized. All readings are simulated. No real sensors or hardware connected.',
    at: new Date().toLocaleTimeString(),
    kind: 'info',
  };
}

export const DEMO_SCENARIOS = [
  {
    id: 'fall',
    label: 'Possible Fall',
    description: 'Simulates unusual movement near West Loop (AS-104).',
  },
  {
    id: 'dark_pathway',
    label: 'Dark Pathway',
    description: 'Sets Lakeside Path (AS-102) lamp off — triggers Low Lighting Warning.',
  },
  {
    id: 'sensor_offline',
    label: 'Sensor Offline',
    description: 'Marks Central Path (AS-103) offline — triggers Coverage Warning.',
  },
  {
    id: 'reset',
    label: 'Demo Reset',
    description: 'Clears all active simulation events and restores defaults.',
  },
];
