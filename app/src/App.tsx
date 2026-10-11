import { useState, useMemo } from 'react';
import type {
  TabKey,
  UserRole,
  Pole,
  Incident,
  Patrol,
  AuditEntry,
  EventCard,
  RuleSettings,
  RuleOutcome,
  IncidentStatus,
  ScenarioPreset,
} from './types';
import {
  initialPoles,
  initialIncidents,
  initialPatrols,
  initialAudit,
  initialEventFeed,
  defaultSettings,
  corridorMap,
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OverviewTab } from './components/OverviewTab';
import { MapTab } from './components/MapTab';
import { IncidentsTab } from './components/IncidentsTab';
import { PatrolsTab } from './components/PatrolsTab';
import { HealthTab } from './components/HealthTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { PrivacyTab } from './components/PrivacyTab';
import { SettingsTab } from './components/SettingsTab';
import { ScenarioDrawer } from './components/ScenarioDrawer';
import { ResidentModal } from './components/ResidentModal';
import { Sparkles } from 'lucide-react';
import './App.css';

export function App() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [userRole, setUserRole] = useState<UserRole>('operator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState<boolean>(false);
  const [residentModalOpen, setResidentModalOpen] = useState<boolean>(false);

  // Core Data State
  const [poles, setPoles] = useState<Pole[]>(initialPoles);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [patrols, setPatrols] = useState<Patrol[]>(initialPatrols);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialAudit);
  const [eventFeed, setEventFeed] = useState<EventCard[]>(initialEventFeed);

  // Dynamic Simulation State
  const [lightingCorridor, setLightingCorridor] = useState<string[]>(['AS-104', 'AS-103', 'AS-105']);
  const [selectedPoleId, setSelectedPoleId] = useState<string>('AS-104');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-DEMO-001');
  const [activeAlertPoleId, setActiveAlertPoleId] = useState<string | undefined>('AS-104');
  const [settings, setSettings] = useState<RuleSettings>(defaultSettings);

  // Active unacknowledged / open alerts count
  const activeAlertsCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'New').length;
  }, [incidents]);

  // Helper to append audit entry
  const addAuditEntry = (action: string, details: string, incidentId?: string) => {
    const entry: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      actorRole: userRole === 'admin' ? 'Township Administrator' : 'Security Operator',
      action,
      incidentId,
      details,
    };
    setAuditLog((prev) => [entry, ...prev]);
  };

  // Rule Evaluation Engine
  const evaluateRule = (type: string, confidence: number): RuleOutcome => {
    const { acousticThreshold, fallThreshold, combinedThreshold } = settings;

    if (type === 'Possible distress sound') {
      if (confidence >= acousticThreshold) {
        return {
          triggerIncident: true,
          priority: 'High',
          status: 'New',
          outcome: 'Needs Review',
          reason: `Simulated acoustic distress confidence (${confidence.toFixed(2)}) crossed configured threshold (${acousticThreshold.toFixed(2)}). Verification required.`,
          rule: `Acoustic distress confidence >= ${acousticThreshold.toFixed(2)}`,
        };
      }
      return {
        triggerIncident: false,
        priority: 'Informational',
        status: 'Logged',
        outcome: 'Informational only',
        reason: `Acoustic sound event (${confidence.toFixed(2)}) remained below review threshold (${acousticThreshold.toFixed(2)}).`,
        rule: 'Benign acoustic pattern filter',
      };
    }

    if (type === 'Possible human fall / prolonged stillness') {
      if (confidence >= fallThreshold) {
        return {
          triggerIncident: true,
          priority: 'High',
          status: 'New',
          outcome: 'Needs Review',
          reason: `Simulated LiDAR stillness confidence (${confidence.toFixed(2)}) crossed configured threshold (${fallThreshold.toFixed(2)}). Lighting corridor initiated.`,
          rule: `Fall confidence >= ${fallThreshold.toFixed(2)}`,
        };
      }
      return {
        triggerIncident: false,
        priority: 'Informational',
        status: 'Logged',
        outcome: 'Informational only',
        reason: `LiDAR motion anomaly (${confidence.toFixed(2)}) remained below stillness threshold (${fallThreshold.toFixed(2)}).`,
        rule: 'Movement anomaly fallback',
      };
    }

    if (type === 'Combined acoustic + movement anomaly') {
      if (confidence >= combinedThreshold) {
        return {
          triggerIncident: true,
          priority: 'High',
          status: 'New',
          outcome: 'Needs Review (High Priority)',
          reason: `Dual sensor corroboration: simultaneous acoustic & motion anomaly (${confidence.toFixed(2)}) met fusion threshold (${combinedThreshold.toFixed(2)}).`,
          rule: `Dual signal confidence >= ${combinedThreshold.toFixed(2)}`,
        };
      }
      return {
        triggerIncident: false,
        priority: 'Medium',
        status: 'Logged',
        outcome: 'Informational only',
        reason: `Combined anomaly did not exceed fusion threshold (${combinedThreshold.toFixed(2)}).`,
        rule: 'Dual signal fallback',
      };
    }

    if (type === 'Benign background event') {
      return {
        triggerIncident: false,
        priority: 'Informational',
        status: 'Logged',
        outcome: 'Informational only',
        reason: 'Classified as benign environmental noise (rain/wind/wildlife). Suppressed from alert escalation.',
        rule: 'Benign environmental pattern filter',
      };
    }

    if (type === 'Sensor offline / degraded') {
      return {
        triggerIncident: true,
        priority: 'Medium',
        status: 'New',
        outcome: 'Coverage degraded',
        reason: 'Coverage degraded — do not assume the area is monitored. Sensor heartbeat timeout detected.',
        rule: 'Hardware health failure override',
      };
    }

    return {
      triggerIncident: false,
      priority: 'Informational',
      status: 'Logged',
      outcome: 'Informational only',
      reason: 'No criteria met; logged for audit only.',
      rule: 'Default logging rule',
    };
  };

  // Create Incident from an Event
  const createIncidentFromEvent = (event: EventCard) => {
    const newIncident: Incident = {
      id: `INC-DEMO-${Date.now().toString().slice(-4)}`,
      createdAt: event.timestamp,
      poleId: event.poleId,
      zone: event.zone,
      eventType: event.type,
      confidence: event.confidence,
      priority: event.priority,
      ruleEvaluated: event.rule,
      reason: event.summary,
      status: 'New',
      timeline: [
        {
          time: event.timestamp,
          status: 'New',
          note: event.summary,
          actor: 'Simulated Edge Engine',
        },
      ],
      isSimulated: true,
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setSelectedIncidentId(newIncident.id);
    setSelectedPoleId(event.poleId);
    setActiveAlertPoleId(event.poleId);

    // Activate lighting corridor toward nearest exit
    const corridor = corridorMap[event.poleId] || ['AS-104', 'AS-103', 'AS-105'];
    setLightingCorridor(corridor);

    // Update pole status to Alert
    setPoles((prev) =>
      prev.map((p) =>
        p.id === event.poleId
          ? {
              ...p,
              status: 'Alert',
              lastHeartbeat: 'just now (simulated)',
              lightingStatus: 'High Illuminance Corridor (100%)',
            }
          : corridor.includes(p.id)
          ? {
              ...p,
              lightingStatus: 'Corridor Guide (80%)',
            }
          : p
      )
    );

    addAuditEntry(
      'Incident Created',
      `Alert generated for ${event.poleId} (${event.type}). Corridor activated: ${corridor.join(' → ')}.`,
      newIncident.id
    );
  };

  // Trigger Simulated Demo Event
  const triggerDemoEvent = (
    type: string,
    poleId: string,
    zone: string,
    confidence: number
  ) => {
    const event: EventCard = {
      id: `EVT-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      poleId,
      zone,
      type,
      confidence,
      rule: '',
      outcome: '',
      priority: 'Informational',
      summary: '',
    };

    if (type === 'Sensor offline / degraded') {
      event.rule = 'Hardware health failure override';
      event.outcome = 'Coverage degraded';
      event.priority = 'Medium';
      event.summary = 'Coverage degraded — do not assume the area is monitored. Sensor heartbeat timeout.';

      setPoles((prev) =>
        prev.map((p) =>
          p.id === poleId
            ? {
                ...p,
                status: 'Offline',
                lastHeartbeat: 'timeout (simulated)',
                connectivityStatus: 'Offline',
                acousticStatus: 'Offline',
                lidarStatus: 'Offline',
              }
            : p
        )
      );

      setEventFeed((prev) => [event, ...prev]);
      createIncidentFromEvent(event);
      return;
    }

    const evaluation = evaluateRule(type, confidence);
    event.rule = evaluation.rule;
    event.outcome = evaluation.outcome;
    event.priority = evaluation.priority;
    event.summary = evaluation.reason;

    setEventFeed((prev) => [event, ...prev]);

    if (evaluation.triggerIncident) {
      createIncidentFromEvent(event);
    } else {
      addAuditEntry(
        'Informational Event Logged',
        `Non-escalating event logged for ${poleId}: ${type} (${evaluation.outcome}).`
      );
    }
  };

  // Handle Scenario Presets
  const handleScenarioPreset = (preset: ScenarioPreset) => {
    const scenarioMap: Record<
      ScenarioPreset,
      { type: string; poleId: string; zone: string; confidence: number }
    > = {
      benign: {
        type: 'Benign background event',
        poleId: 'AS-102',
        zone: 'Waterfront',
        confidence: 0.67,
      },
      fall: {
        type: 'Possible human fall / prolonged stillness',
        poleId: 'AS-104',
        zone: 'West Loop',
        confidence: 0.88,
      },
      distress: {
        type: 'Possible distress sound',
        poleId: 'AS-103',
        zone: 'Family Zone',
        confidence: 0.93,
      },
      combined: {
        type: 'Combined acoustic + movement anomaly',
        poleId: 'AS-106',
        zone: 'Woodland',
        confidence: 0.81,
      },
      offline: {
        type: 'Sensor offline / degraded',
        poleId: 'AS-108',
        zone: 'South Route',
        confidence: 0.60,
      },
    };

    const s = scenarioMap[preset];
    triggerDemoEvent(s.type, s.poleId, s.zone, s.confidence);
  };

  // Trigger preset specifically for a selected pole
  const handleTriggerPresetForPole = (preset: ScenarioPreset, poleId: string) => {
    const pole = poles.find((p) => p.id === poleId) || poles[0];
    const typeMap: Record<ScenarioPreset, { type: string; confidence: number }> = {
      benign: { type: 'Benign background event', confidence: 0.65 },
      fall: { type: 'Possible human fall / prolonged stillness', confidence: 0.89 },
      distress: { type: 'Possible distress sound', confidence: 0.92 },
      combined: { type: 'Combined acoustic + movement anomaly', confidence: 0.84 },
      offline: { type: 'Sensor offline / degraded', confidence: 0.50 },
    };
    const s = typeMap[preset];
    triggerDemoEvent(s.type, pole.id, pole.zone, s.confidence);
  };

  // Run End-to-End Judge Demo Flow
  const handleRunDemoScenario = () => {
    // 1. Benign background noise
    handleScenarioPreset('benign');

    // 2. Fall event at AS-104 (West Loop) after short delay
    setTimeout(() => {
      handleScenarioPreset('fall');
      setActiveTab('map');
    }, 600);

    addAuditEntry(
      'Automated Demo Launched',
      'End-to-end presentation sequence executed: Benign noise → Fall event at AS-104 → Corridor lighting.'
    );
  };

  // Reset Full Simulation to Initial Baseline
  const handleResetSimulation = () => {
    setPoles(initialPoles);
    setIncidents(initialIncidents);
    setPatrols(initialPatrols);
    setAuditLog(initialAudit);
    setEventFeed(initialEventFeed);
    setLightingCorridor(corridorMap['AS-104'] || []);
    setSelectedPoleId('AS-104');
    setSelectedIncidentId('INC-DEMO-001');
    setActiveAlertPoleId('AS-104');
    setSettings(defaultSettings);

    addAuditEntry(
      'Simulation Reset',
      'Demo environment returned to baseline state.'
    );
  };

  // Reset lighting corridor only
  const handleResetCorridor = () => {
    setLightingCorridor([]);
    setActiveAlertPoleId(undefined);
    setPoles((prev) =>
      prev.map((p) =>
        p.status === 'Alert'
          ? {
              ...p,
              status: 'Normal',
              lightingStatus: 'Standby Dimmed (15%)',
            }
          : { ...p, lightingStatus: 'Standby Dimmed (15%)' }
      )
    );
    addAuditEntry(
      'Lighting Reset',
      'Safe corridor lighting cleared; restored to standby ambient.'
    );
  };

  // Case Actions
  const handleAcknowledgeIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'Acknowledged',
              timeline: [
                ...inc.timeline,
                {
                  time: new Date().toISOString(),
                  status: 'Acknowledged',
                  note: 'Security operator acknowledged simulated alert.',
                  actor: userRole === 'admin' ? 'Township Admin' : 'Security Operator',
                },
              ],
            }
          : inc
      )
    );
    addAuditEntry('Alert Acknowledged', `Operator acknowledged alert for ${incidentId}.`, incidentId);
  };

  const handleAssignPatrol = (incidentId: string, patrolId: string) => {
    setPatrols((prev) =>
      prev.map((p) =>
        p.id === patrolId
          ? {
              ...p,
              status: 'Assigned',
              currentIncidentId: incidentId,
              illustrativeEta: '2 min (illustrative)',
            }
          : p
      )
    );

    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'Patrol Assigned',
              assignedPatrolId: patrolId,
              timeline: [
                ...inc.timeline,
                {
                  time: new Date().toISOString(),
                  status: 'Patrol Assigned',
                  note: `Assigned unit ${patrolId} to respond.`,
                  actor: 'Security Operator',
                },
              ],
            }
          : inc
      )
    );

    addAuditEntry('Patrol Dispatched', `Unit ${patrolId} assigned to ${incidentId}.`, incidentId);
  };

  const handleUpdateStatus = (
    incidentId: string,
    nextStatus: IncidentStatus,
    note: string
  ) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: nextStatus,
              resolutionNote:
                nextStatus === 'Resolved' || nextStatus === 'False Alarm'
                  ? note
                  : inc.resolutionNote,
              timeline: [
                ...inc.timeline,
                {
                  time: new Date().toISOString(),
                  status: nextStatus,
                  note,
                  actor: userRole === 'admin' ? 'Township Admin' : 'Security Operator',
                },
              ],
            }
          : inc
      )
    );

    // If resolving or marking false alarm, free the assigned patrol
    if (nextStatus === 'Resolved' || nextStatus === 'False Alarm') {
      const assigned = incidents.find((i) => i.id === incidentId)?.assignedPatrolId;
      if (assigned) {
        setPatrols((prev) =>
          prev.map((p) =>
            p.id === assigned
              ? { ...p, status: 'Available', currentIncidentId: undefined }
              : p
          )
        );
      }
    }

    addAuditEntry(nextStatus, `Case updated to ${nextStatus}: ${note}`, incidentId);
  };

  const handleMarkArrived = (patrolId: string) => {
    setPatrols((prev) =>
      prev.map((p) =>
        p.id === patrolId
          ? { ...p, status: 'Investigating', illustrativeEta: 'Arrived (on scene)' }
          : p
      )
    );

    const patrol = patrols.find((p) => p.id === patrolId);
    if (patrol?.currentIncidentId) {
      handleUpdateStatus(
        patrol.currentIncidentId,
        'Investigating',
        `Unit ${patrol.callsign} arrived on scene and commenced visual investigation.`
      );
    }
  };

  const handleResetPatrol = (patrolId: string) => {
    setPatrols((prev) =>
      prev.map((p) =>
        p.id === patrolId
          ? { ...p, status: 'Available', currentIncidentId: undefined, illustrativeEta: '3 min (illustrative)' }
          : p
      )
    );
    addAuditEntry('Patrol Standby', `Unit ${patrolId} recalled to standby patrol.`);
  };

  return (
    <div className="aurasense-app-root">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onResetSimulation={handleResetSimulation}
        onRunDemoScenario={handleRunDemoScenario}
        onOpenResidentModal={() => setResidentModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenScenarioDrawer={() => setScenarioDrawerOpen(true)}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Tab View Canvas */}
      <main className="main-content-canvas">
        {activeTab === 'overview' && (
          <OverviewTab
            poles={poles}
            incidents={incidents}
            patrols={patrols}
            eventFeed={eventFeed}
            onSelectIncident={setSelectedIncidentId}
            onSelectPole={setSelectedPoleId}
            onAcknowledgeIncident={handleAcknowledgeIncident}
            onTriggerPreset={handleScenarioPreset}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'map' && (
          <MapTab
            poles={poles}
            selectedPoleId={selectedPoleId}
            onSelectPole={setSelectedPoleId}
            lightingCorridor={lightingCorridor}
            onResetCorridor={handleResetCorridor}
            onTriggerPresetForPole={handleTriggerPresetForPole}
            activeAlertPoleId={activeAlertPoleId}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsTab
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
            patrols={patrols}
            onAcknowledgeIncident={handleAcknowledgeIncident}
            onAssignPatrol={handleAssignPatrol}
            onUpdateStatus={handleUpdateStatus}
            onNavigateToMap={(poleId) => {
              setSelectedPoleId(poleId);
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'patrols' && (
          <PatrolsTab
            patrols={patrols}
            incidents={incidents}
            onAssignPatrol={handleAssignPatrol}
            onMarkArrived={handleMarkArrived}
            onResetPatrol={handleResetPatrol}
            onSelectIncident={setSelectedIncidentId}
            onNavigateToIncidents={() => setActiveTab('incidents')}
          />
        )}

        {activeTab === 'health' && (
          <HealthTab
            poles={poles}
            onSelectPole={setSelectedPoleId}
            onNavigateToMap={(poleId) => {
              setSelectedPoleId(poleId);
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            incidents={incidents}
            poles={poles}
            eventFeed={eventFeed}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyTab
            auditLog={auditLog}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('incidents');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            onResetSettings={() => setSettings(defaultSettings)}
            onResetSimulation={handleResetSimulation}
            onRunDemoScenario={handleRunDemoScenario}
            onOpenScenarioDrawer={() => setScenarioDrawerOpen(true)}
          />
        )}
      </main>

      {/* Mobile Floating Scenario Trigger Button */}
      <button
        type="button"
        className="mobile-fab-scenarios"
        onClick={() => setScenarioDrawerOpen(true)}
        aria-label="Open simulator event injector"
      >
        <Sparkles size={20} />
        <span>Scenarios</span>
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlertsCount={activeAlertsCount}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Scenario Injector Drawer */}
      <ScenarioDrawer
        isOpen={scenarioDrawerOpen}
        onClose={() => setScenarioDrawerOpen(false)}
        onTriggerPreset={(p) => {
          handleScenarioPreset(p);
          setScenarioDrawerOpen(false);
        }}
        onTriggerCustom={(type, poleId, zone, conf) => {
          triggerDemoEvent(type, poleId, zone, conf);
          setScenarioDrawerOpen(false);
        }}
        onRunDemoScenario={() => {
          handleRunDemoScenario();
          setScenarioDrawerOpen(false);
        }}
        poles={poles}
        settings={settings}
      />

      {/* Resident Concept Modal */}
      <ResidentModal
        isOpen={residentModalOpen}
        onClose={() => setResidentModalOpen(false)}
      />
    </div>
  );
}

export default App;
