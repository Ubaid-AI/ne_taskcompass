import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, XCircle, CalendarCheck2, ChevronRight } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import WorkerDetail from "../../components/dashboard/WorkerDetail.jsx";
import { TeamMap } from "../../components/ui/RouteMap.jsx";
import { useData } from "../../context/DataContext.jsx";
import { bandFor } from "../../lib/performance.js";
import { api } from "../../lib/frappe.js";

const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <Card className="flex items-center gap-3.5">
      <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tone}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-extrabold text-slate-800">{value}</div>
      </div>
    </Card>
  );
}

export default function Overview() {
  const [selected, setSelected] = useState(null);
  const [livePins, setLivePins] = useState([]);
  const { teamPerformance, kpis } = useData();

  useEffect(() => {
    let cancelled = false;
    async function loadPins() {
      try {
        const rows = await api.call("ne_taskcompass.api.tracker.latest_locations");
        if (!cancelled) setLivePins(rows || []);
      } catch {
        if (!cancelled) setLivePins([]);
      }
    }
    loadPins();
    const id = setInterval(loadPins, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const teamReps = useMemo(() => {
    const bySp = {};
    (livePins || []).forEach((p) => {
      bySp[p.salesperson] = p;
    });
    return teamPerformance().map((t) => {
      const pin = bySp[t.id] || bySp[t.name];
      const base = {
        ...t,
        visitsLabel: `${t.visits.done}/${t.visits.planned}`,
      };
      if (pin && pin.latitude != null && pin.longitude != null) {
        return {
          ...base,
          lat: Number(pin.latitude),
          lng: Number(pin.longitude),
          trackedAt: pin.tracked_at,
          status: "Active",
        };
      }
      return { ...base, status: "GPS Disabled" };
    });
  }, [teamPerformance, livePins]);

  const liveCount = teamReps.filter((r) => r.status === "Active").length;

  return (
    <DashboardLayout title="Live Team Dashboard" subtitle={`${today} · ${teamReps.length} salespersons · ${liveCount} on the map today`}>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile icon={CalendarCheck2} label="Planned Visits" value={kpis.planned} tone="bg-brand-50 text-brand-700" />
        <StatTile icon={CheckCircle2} label="Completed" value={kpis.completed} tone="bg-success-bg text-success-fg" />
        <StatTile icon={XCircle} label="Missed" value={kpis.missed} tone="bg-danger-bg text-danger-fg" />
        <StatTile icon={Users} label="Active Reps" value={kpis.activeReps} tone="bg-info-bg text-info-fg" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 flex flex-col" padding="p-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">Live Team Map</div>
              <div className="text-[12px] text-slate-400">Last location today from Sales Person Tracker · refreshes every 5 seconds</div>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-success-fg bg-success-bg px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success-solid pulse-dot" /> Live
            </span>
          </div>
          <TeamMap people={teamReps} onSelect={setSelected} height={320} />
        </Card>

        <Card className="lg:col-span-2" padding="p-0">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="font-bold text-slate-800">Field Representatives</div>
            <div className="text-[11.5px] text-slate-400">Click anyone to open their full performance</div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {teamReps.length === 0 ? (
              <div className="px-5 py-8 text-[13px] text-slate-400">No sales persons in TaskCompass yet.</div>
            ) : teamReps.map((r) => {
              const band = bandFor(r.score);
              return (
                <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                  <Avatar initials={r.initials} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-700 truncate">{r.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{r.region} · {r.visitsLabel} visits · {r.achievement}% target</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-extrabold px-2 py-1 rounded-lg ${band.bg} ${band.tone}`}>{r.score}</span>
                    <StatusPill status={r.status}>{r.status}</StatusPill>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <WorkerDetail rep={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}
