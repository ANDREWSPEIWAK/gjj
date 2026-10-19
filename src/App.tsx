import { Routes, Route } from 'react-router-dom'
import Dashboard from './routes/Dashboard'
import OpeningChecklist from './routes/OpeningChecklist'
import ClosingChecklist from './routes/ClosingChecklist'
import ShiftHandover from './routes/ShiftHandover'
import Sanitation from './routes/Sanitation'
import WeeklyMaintenance from './routes/WeeklyMaintenance'
import HeadBaristaAudit from './routes/HeadBaristaAudit'
import Reports from './routes/Reports'
import Settings from './routes/Settings'

function Layout() {
  return (
    <div className="min-h-screen p-4">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/opening" element={<OpeningChecklist />} />
        <Route path="/closing" element={<ClosingChecklist />} />
        <Route path="/handover" element={<ShiftHandover />} />
        <Route path="/sanitation" element={<Sanitation />} />
        <Route path="/weekly-maintenance" element={<WeeklyMaintenance />} />
        <Route path="/head-barista-audit" element={<HeadBaristaAudit />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

export default Layout
