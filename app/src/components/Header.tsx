import React from 'react';
import {
  Siren,
  Play,
  RotateCcw,
  Menu,
  X,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import type { TabKey, UserRole } from '../types';

interface HeaderProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  onResetSimulation: () => void;
  onRunDemoScenario: () => void;
  onOpenResidentModal: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenScenarioDrawer: () => void;
  activeAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onResetSimulation,
  onRunDemoScenario,
  onOpenResidentModal,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenScenarioDrawer,
  activeAlertsCount,
}) => {
  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'map', label: 'Live Map' },
    { key: 'incidents', label: 'Incidents', badge: activeAlertsCount },
    { key: 'patrols', label: 'Patrols' },
    { key: 'health', label: 'Sensor Health' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'privacy', label: 'Privacy & Audit' },
    { key: 'settings', label: 'Rule Engine' },
  ];

  return (
    <header className="site-header">
      {/* Top Banner Disclaimer */}
      <div className="demo-disclaimer-bar">
        <span className="disclaimer-chip">SIMULATION MODE</span>
        <span className="disclaimer-text">
          Prototype simulation only — not connected to real sensors, microphones, or emergency dispatch services.
        </span>
        <button
          type="button"
          className="disclaimer-btn"
          onClick={onOpenResidentModal}
        >
          <BookOpen size={13} />
          <span>Resident Guide</span>
        </button>
      </div>

      {/* Main Bar */}
      <div className="header-main">
        <div className="header-brand-group">
          <div className="brand-icon-wrapper">
            <Siren size={22} className="brand-icon" />
            <span className="pulse-indicator" />
          </div>
          <div>
            <div className="brand-badge-row">
              <span className="brand-chip">TOWNSHIP OF TOMORROW</span>
              <span className="brand-dot">•</span>
              <span className="brand-sub">Sime Darby Hackathon 2026</span>
            </div>
            <h1 className="brand-title">AuraSense</h1>
          </div>
        </div>

        {/* Desktop Quick Scenario & Controls */}
        <div className="header-right-controls">
          <div className="role-switcher" role="group" aria-label="Role Switcher">
            <button
              type="button"
              className={`role-btn ${userRole === 'operator' ? 'active' : ''}`}
              onClick={() => setUserRole('operator')}
              title="View as Security Operator"
            >
              Operator
            </button>
            <button
              type="button"
              className={`role-btn ${userRole === 'admin' ? 'active' : ''}`}
              onClick={() => setUserRole('admin')}
              title="View as Township Operations Admin"
            >
              Admin
            </button>
          </div>

          <button
            type="button"
            className="btn-trigger-scenarios"
            onClick={onOpenScenarioDrawer}
            title="Open Simulator Scenarios Drawer"
          >
            <Sparkles size={16} />
            <span>Scenarios</span>
          </button>

          <button
            type="button"
            className="btn-scenario"
            onClick={onRunDemoScenario}
            title="Execute End-to-End Judge Demo Flow"
          >
            <Play size={15} />
            <span>Run Demo Flow</span>
          </button>

          <button
            type="button"
            className="btn-reset"
            onClick={onResetSimulation}
            title="Reset Simulation State to Baseline"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="btn-mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Desktop Main Navigation Tabs */}
      <nav className="desktop-tab-nav" aria-label="Dashboard navigation">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="brand-group-mini">
                <Siren size={18} className="brand-icon-mini" />
                <strong>AuraSense Navigation</strong>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-role-selector">
              <span className="drawer-label">Active Role View:</span>
              <div className="role-switcher full-width">
                <button
                  type="button"
                  className={`role-btn ${userRole === 'operator' ? 'active' : ''}`}
                  onClick={() => setUserRole('operator')}
                >
                  Security Operator
                </button>
                <button
                  type="button"
                  className={`role-btn ${userRole === 'admin' ? 'active' : ''}`}
                  onClick={() => setUserRole('admin')}
                >
                  Township Admin
                </button>
              </div>
            </div>

            <div className="mobile-drawer-tabs">
              <span className="drawer-label">Modules</span>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`mobile-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="tab-badge">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mobile-drawer-actions">
              <span className="drawer-label">Simulation Controls</span>
              <button
                type="button"
                className="btn-scenario full-width"
                onClick={() => {
                  onRunDemoScenario();
                  setMobileMenuOpen(false);
                }}
              >
                <Play size={16} />
                <span>Run Demo Flow (Multi-Step)</span>
              </button>
              <button
                type="button"
                className="btn-trigger-scenarios full-width"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenScenarioDrawer();
                }}
              >
                <Sparkles size={16} />
                <span>Simulate Event Triggers</span>
              </button>
              <button
                type="button"
                className="btn-reset full-width"
                onClick={() => {
                  onResetSimulation();
                  setMobileMenuOpen(false);
                }}
              >
                <RotateCcw size={16} />
                <span>Reset Simulation</span>
              </button>
              <button
                type="button"
                className="disclaimer-btn full-width"
                onClick={() => {
                  onOpenResidentModal();
                  setMobileMenuOpen(false);
                }}
              >
                <BookOpen size={16} />
                <span>Resident Privacy & Safety Concept</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
