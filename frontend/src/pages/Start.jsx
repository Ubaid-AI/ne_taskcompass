import { Link } from "react-router-dom";
import { Smartphone, MonitorSmartphone, ArrowRight } from "lucide-react";
import LogoMark from "../components/ui/LogoMark.jsx";

export default function Start() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white grid place-items-center shadow-lg">
            <LogoMark size={34} variant="color" />
          </div>
          <div>
            <div className="font-extrabold text-xl leading-tight">NE TaskCompass</div>
            <div className="text-[11px] text-brand-300 tracking-wide uppercase">National Enterprises</div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-center max-w-2xl leading-tight">
          Field Force Automation &amp; CRM — Interactive Demo
        </h1>
        <p className="text-brand-200 text-center max-w-xl mt-4 text-[15px] leading-relaxed">
          A preview of the complete NE TaskCompass (field salesperson app) and NE LiveTrack
          (management portal) experience for the Neurosurgery Equipment &amp; Disposables sales team.
          Choose an interface below to explore.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mt-12 w-full max-w-3xl">
          <Link
            to="/mobile/login"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-400/50 rounded-2xl p-7 text-left transition flex flex-col gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 grid place-items-center text-brand-200 group-hover:bg-brand-500/30 transition">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="font-bold text-lg">Salesperson App</div>
              <div className="text-[13px] text-brand-300 mt-1">NE TaskCompass · Mobile</div>
            </div>
            <p className="text-[13px] text-brand-200/90 leading-relaxed">
              Daily planning, doctor &amp; hospital visits, GPS-verified check-ins, call reports,
              sample requests and end-of-day close.
            </p>
            <span className="mt-auto flex items-center gap-1.5 text-brand-300 group-hover:text-white text-[13px] font-semibold transition">
              Open mobile demo <ArrowRight size={15} className="group-hover:translate-x-1 transition" />
            </span>
          </Link>

          <Link
            to="/dashboard/login"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-400/50 rounded-2xl p-7 text-left transition flex flex-col gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 grid place-items-center text-brand-200 group-hover:bg-brand-500/30 transition">
              <MonitorSmartphone size={24} />
            </div>
            <div>
              <div className="font-bold text-lg">Management Portal</div>
              <div className="text-[13px] text-brand-300 mt-1">NE LiveTrack · Web Dashboard</div>
            </div>
            <p className="text-[13px] text-brand-200/90 leading-relaxed">
              Live team monitoring, scheduling, approvals, sales pipeline (CRM), reporting and
              an AI business assistant.
            </p>
            <span className="mt-auto flex items-center gap-1.5 text-brand-300 group-hover:text-white text-[13px] font-semibold transition">
              Open dashboard demo <ArrowRight size={15} className="group-hover:translate-x-1 transition" />
            </span>
          </Link>
        </div>
      </div>
      <div className="text-center text-[11.5px] text-brand-300/70 pb-6 px-6">
        Demo build for client review — every record shown (names, visits, figures) is illustrative sample data.
      </div>
    </div>
  );
}
