import React from 'react';
import {
  Gauge,
  MapPinned,
  BellRing,
  Users,
  Sliders,
} from 'lucide-react';
import type { TabKey } from '../types';

interface BottomNavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  activeAlertsCount: number;
  onOpenMobileMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  activeAlertsCount,
  onOpenMobileMenu,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        <Gauge size={20} />
        <span>Overview</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => setActiveTab('map')}
      >
        <MapPinned size={20} />
        <span>Map</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'incidents' ? 'active' : ''}`}
        onClick={() => setActiveTab('incidents')}
      >
        <div className="icon-with-badge">
          <BellRing size={20} />
          {activeAlertsCount > 0 && (
            <span className="bottom-nav-badge">{activeAlertsCount}</span>
          )}
        </div>
        <span>Incidents</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'patrols' ? 'active' : ''}`}
        onClick={() => setActiveTab('patrols')}
      >
        <Users size={20} />
        <span>Patrols</span>
      </button>

      <button
        type="button"
        className="bottom-nav-item"
        onClick={onOpenMobileMenu}
      >
        <Sliders size={20} />
        <span>More</span>
      </button>
    </nav>
  );
};
