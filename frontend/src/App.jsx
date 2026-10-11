import { Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider, useSession } from "./context/SessionContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";

import DashboardLogin from "./pages/dashboard/Login.jsx";
import Overview from "./pages/dashboard/Overview.jsx";
import Directory from "./pages/dashboard/Directory.jsx";
import DayPlan from "./pages/dashboard/DayPlan.jsx";
import DoctorSchedule from "./pages/dashboard/DoctorSchedule.jsx";
import Approvals from "./pages/dashboard/Approvals.jsx";
import Pipeline from "./pages/dashboard/Pipeline.jsx";
import Performance from "./pages/dashboard/Performance.jsx";
import DashboardTargets from "./pages/dashboard/Targets.jsx";
import Followups from "./pages/dashboard/Followups.jsx";
import Notifications from "./pages/dashboard/Notifications.jsx";
import Reports from "./pages/dashboard/Reports.jsx";
import UserGuide from "./pages/dashboard/UserGuide.jsx";
import Products from "./pages/dashboard/Products.jsx";
import Visits from "./pages/dashboard/Visits.jsx";
import Tenders from "./pages/dashboard/Tenders.jsx";
import Setup from "./pages/dashboard/Setup.jsx";
import Users from "./pages/dashboard/Users.jsx";

function RequireDashboard({ children }) {
  const { dashboardUser, ready } = useSession();
  if (!ready) {
    const logo = typeof window !== "undefined" && window.tc_brand && window.tc_brand.splash;
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex flex-col items-center">
          {logo ? <img src={logo} alt="" className="w-14 h-14 object-contain mb-3" /> : null}
          Loading NE LiveTrack…
        </div>
      </div>
    );
  }
  return dashboardUser ? children : <Navigate to="/dashboard/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard/login" element={<DashboardLogin />} />
      <Route path="/dashboard/home" element={<RequireDashboard><Overview /></RequireDashboard>} />
      <Route path="/dashboard/directory" element={<RequireDashboard><Directory /></RequireDashboard>} />
      <Route path="/dashboard/products" element={<RequireDashboard><Products /></RequireDashboard>} />
      <Route path="/dashboard/visits" element={<RequireDashboard><Visits /></RequireDashboard>} />
      <Route path="/dashboard/tenders" element={<RequireDashboard><Tenders /></RequireDashboard>} />
      <Route path="/dashboard/setup" element={<RequireDashboard><Setup /></RequireDashboard>} />
      <Route path="/dashboard/users" element={<RequireDashboard><Users /></RequireDashboard>} />
      <Route path="/dashboard/schedules/day-plan" element={<RequireDashboard><DayPlan /></RequireDashboard>} />
      <Route path="/dashboard/schedules/doctor-schedule" element={<RequireDashboard><DoctorSchedule /></RequireDashboard>} />
      <Route path="/dashboard/schedules" element={<Navigate to="/dashboard/schedules/day-plan" replace />} />
      <Route path="/dashboard/approvals" element={<RequireDashboard><Approvals /></RequireDashboard>} />
      <Route path="/dashboard/pipeline" element={<RequireDashboard><Pipeline /></RequireDashboard>} />
      <Route path="/dashboard/targets" element={<RequireDashboard><DashboardTargets /></RequireDashboard>} />
      <Route path="/dashboard/followups" element={<RequireDashboard><Followups /></RequireDashboard>} />
      <Route path="/dashboard/performance" element={<RequireDashboard><Performance /></RequireDashboard>} />
      <Route path="/dashboard/notifications" element={<RequireDashboard><Notifications /></RequireDashboard>} />
      <Route path="/dashboard/reports" element={<RequireDashboard><Reports /></RequireDashboard>} />
      <Route path="/dashboard/guide" element={<RequireDashboard><UserGuide /></RequireDashboard>} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/home" replace />} />
      <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
