import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ParkOverview from './pages/ParkOverview';
import Incidents from './pages/Incidents';
import System from './pages/System';
import ResidentSOS from './pages/ResidentSOS';
import HumanoidStage1Test from './pages/HumanoidStage1Test';
import { ParkProvider, usePark } from './context/ParkContext';
import BackendStatusBadge from './components/BackendStatusBadge';

function GuardLayout() {
  const { activeIncidentsCount } = usePark();

  return (
    <div className="guard-app">
      <header className="guard-header">
        <div className="header-brand">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <strong className="brand-name">XSense</strong>
          <span className="brand-sub">Park Safety</span>
        </div>

        <nav className="guard-nav" role="navigation" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Park Overview
          </NavLink>
          <NavLink
            to="/incidents"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Incidents
            {activeIncidentsCount > 0 && (
              <span className="nav-badge" aria-label={`${activeIncidentsCount} active incidents`}>
                {activeIncidentsCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/system"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            System
          </NavLink>
        </nav>

        <div className="header-right">
          <BackendStatusBadge />
          <span className="demo-badge" role="status" aria-label="Demo mode — all sensor data is simulated">
            DEMO MODE — Simulated sensor data
          </span>
        </div>
      </header>

      <main className="guard-main">
        <Routes>
          <Route path="/"          element={<ParkOverview />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/system"    element={<System />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ParkProvider>
        <Routes>
          {/* Isolated test harness for Stage 1 Humanoid verification */}
          <Route path="/humanoid-test" element={<HumanoidStage1Test />} />
          {/* Resident SOS — separate mobile-first page at /sos */}
          <Route path="/sos" element={<ResidentSOS />} />
          {/* Guard dashboard — all other routes */}
          <Route path="/*" element={<GuardLayout />} />
        </Routes>
      </ParkProvider>
    </BrowserRouter>
  );
}
