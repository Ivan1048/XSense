import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Activity,
} from 'lucide-react';
import type { Incident, Pole, EventCard } from '../types';

interface AnalyticsTabProps {
  incidents: Incident[];
  poles: Pole[];
  eventFeed: EventCard[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  incidents,
  poles,
  eventFeed,
}) => {
  // Calculated stats from current state
  const totalEvents = eventFeed.length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;
  const falseAlarmCount = incidents.filter((i) => i.status === 'False Alarm').length;
  const acknowledgedCount = incidents.filter(
    (i) => i.status !== 'New'
  ).length;
  const normalPolesCount = poles.filter((p) => p.status === 'Normal').length;
  const networkAvailability = Math.round((normalPolesCount / (poles.length || 1)) * 100);

  // Status breakdown data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      New: 0,
      Acknowledged: 0,
      'Patrol Assigned': 0,
      Investigating: 0,
      Resolved: 0,
      'False Alarm': 0,
    };
    incidents.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // Priority distribution data
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
      Informational: 0,
    };
    incidents.forEach((i) => {
      counts[i.priority] = (counts[i.priority] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // Zone distribution data
  const zoneData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      counts[i.zone] = (counts[i.zone] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const priorityColors = {
    High: '#f43f5e',
    Medium: '#f59e0b',
    Low: '#38bdf8',
    Informational: '#94a3b8',
  };

  return (
    <div className="analytics-page-wrapper">
      {/* Required Disclaimer Banner */}
      <div className="analytics-disclaimer-strip">
        <Activity size={18} className="text-teal" />
        <div>
          <strong>Demo data — not field performance.</strong>
          <span>
            All metrics and charts below are computed strictly in real-time from active prototype session events. No live field sensor data or commercial accuracy guarantees are implied.
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="analytics-kpi-grid">
        <div className="a-kpi-card">
          <div className="a-kpi-icon teal">
            <Gauge size={20} />
          </div>
          <div>
            <span className="a-kpi-label">Simulated Events Logged</span>
            <strong className="a-kpi-val">{totalEvents}</strong>
            <span className="a-kpi-sub">Total edge signals received</span>
          </div>
        </div>

        <div className="a-kpi-card">
          <div className="a-kpi-icon emerald">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="a-kpi-label">Incidents Resolved</span>
            <strong className="a-kpi-val">{resolvedCount}</strong>
            <span className="a-kpi-sub">With operator resolution notes</span>
          </div>
        </div>

        <div className="a-kpi-card">
          <div className="a-kpi-icon amber">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="a-kpi-label">Marked False Alarms</span>
            <strong className="a-kpi-val">{falseAlarmCount}</strong>
            <span className="a-kpi-sub">Disproved by human verification</span>
          </div>
        </div>

        <div className="a-kpi-card">
          <div className="a-kpi-icon sky">
            <Clock size={20} />
          </div>
          <div>
            <span className="a-kpi-label">Alerts Acknowledged</span>
            <strong className="a-kpi-val">
              {acknowledgedCount} / {incidents.length}
            </strong>
            <span className="a-kpi-sub">
              {networkAvailability}% Sensor availability ({normalPolesCount}/{poles.length} online)
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Status Mix Bar Chart */}
        <div className="chart-panel-card">
          <div className="chart-header">
            <div>
              <h3>Incident Status Distribution</h3>
              <p className="chart-sub">Active workflow state counts across simulated cases</p>
            </div>
            <span className="chart-tag">Real-Time Session</span>
          </div>
          <div className="chart-svg-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f2438',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Pie Chart */}
        <div className="chart-panel-card">
          <div className="chart-header">
            <div>
              <h3>Incident Priority Breakdown</h3>
              <p className="chart-sub">Severity classification proportion based on rule evaluation</p>
            </div>
            <span className="chart-tag">Calculated</span>
          </div>
          <div className="chart-svg-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={5}
                >
                  {priorityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={priorityColors[entry.name as keyof typeof priorityColors] || '#14b8a6'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f2438',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#cbd5e1', fontSize: '12px' }}>{value} Priority</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Incident Frequency */}
        <div className="chart-panel-card full-width">
          <div className="chart-header">
            <div>
              <h3>Incident Frequency by Township Park Zone</h3>
              <p className="chart-sub">Geographic distribution of simulated events to guide township patrol allocation</p>
            </div>
            <span className="chart-tag">Illustrative Zones</span>
          </div>
          <div className="chart-svg-wrap wide">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f2438',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
