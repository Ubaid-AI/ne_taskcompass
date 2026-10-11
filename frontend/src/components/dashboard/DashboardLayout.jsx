import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import Avatar from "../ui/Avatar.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { useData } from "../../context/DataContext.jsx";

export default function DashboardLayout({ title, subtitle, children }) {
  const { dashboardUser } = useSession();
  const { source } = useData();
  const user = dashboardUser || { name: "LiveTrack", role: "management", initials: "LT" };
  const live = source === "frappe";
  const connecting = source === "connecting";

  return (
    <div className="h-screen w-full flex bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-7 py-4 border-b border-slate-200 bg-white print:hidden">
          <div className="min-w-0">
            <Link to="/dashboard/home" className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-brand-700 font-medium mb-1 transition">
              <ArrowLeft size={12} /> Home
            </Link>
            <h1 className="text-lg font-bold text-slate-800 truncate">{title}</h1>
            {subtitle && <p className="text-[12.5px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              title={
                live
                  ? "Connected to NE-ERP"
                  : connecting
                  ? "Contacting the database"
                  : "Could not load live data"
              }
              className={`hidden md:inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                live ? "bg-success-bg text-success-fg" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-success-solid pulse-dot" : "bg-slate-400"}`} />
              {live ? "Live database" : connecting ? "Connecting…" : "Data unavailable"}
            </span>
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-semibold text-slate-700">{user.name}</div>
              <div className="text-[11px] text-slate-400">{user.role}</div>
            </div>
            <Avatar initials={user.initials || (user.name || "?").slice(0, 2).toUpperCase()} size={38} />
          </div>
        </div>
        {!live && !connecting && (
          <div className="shrink-0 bg-warning-bg border-b border-warning-fg/25 px-7 py-2.5 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-warning-fg shrink-0 mt-0.5" />
            <div className="text-[12.5px] text-warning-fg">
              <b>Could not load live TaskCompass data.</b> Check that this user has a TaskCompass management role
              and reload. Master records are still available under the NE TaskCompass workspace.
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-7 print:p-0 print:overflow-visible">{children}</div>
      </div>
    </div>
  );
}
