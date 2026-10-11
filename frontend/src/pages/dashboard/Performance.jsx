import { useState, useMemo, useEffect } from "react";
import { Users, Info, ExternalLink } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import PerformancePanel from "../../components/shared/PerformancePanel.jsx";
import WorkerDetail from "../../components/dashboard/WorkerDetail.jsx";
import { useData } from "../../context/DataContext.jsx";
import { bandFor } from "../../lib/performance.js";

export default function Performance() {
  const { users, performanceForMonth, overallPerformance } = useData();
  const now = new Date();
  const [rep, setRep] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!rep && users[0]?.name) setRep(users[0].name);
  }, [users, rep]);

  // Team roll up, so a manager sees who needs attention before drilling in.
  const team = useMemo(
    () =>
      users
        .map((u) => {
          const current = performanceForMonth(u.id || u.name, now.getFullYear(), now.getMonth() + 1);
          const overall = overallPerformance(u.id || u.name, 12);
          return {
            ...u,
            current: current.score,
            overall: overall.score,
            achievedPct: current.achievedPct,
            trend: overall.trend || 0,
          };
        })
        .sort((a, b) => b.current - a.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, performanceForMonth, overallPerformance]
  );

  const selected = users.find((u) => u.name === rep);

  return (
    <DashboardLayout
      title="Performance"
      subtitle="Current month, any of the last twelve, and the overall picture"
    >
      <div className="flex gap-2 text-[12px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-4">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          A score blends target achievement with conduct and follow up movement. Targets are set on
          the <b>Targets</b> page. A month with no targets assigned cannot be scored, so it shows as
          empty rather than as a zero the rep did not earn.
        </span>
      </div>

      <div className="grid lg:grid-cols-[290px_1fr] gap-4 items-start">
        {/* Team */}
        <Card padding="p-0" className="overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
            <Users size={15} className="text-brand-700" /> Field team
          </div>
          <div className="divide-y divide-slate-100 max-h-[68vh] overflow-y-auto">
            {team.map((u) => {
              const band = bandFor(u.current);
              const active = rep === u.name;
              return (
                <button
                  key={u.id || u.name}
                  onClick={() => setRep(u.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                    active ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
            <Avatar initials={u.initials || u.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12.5px] font-semibold truncate ${active ? "text-brand-800" : "text-slate-800"}`}>
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{u.region}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[14px] font-extrabold ${band.tone}`}>{u.current}</div>
                    <div className="text-[9.5px] text-slate-400">
                      {u.trend > 0 ? `+${u.trend}` : u.trend < 0 ? u.trend : "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Detail */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
			<div className="text-[15px] font-bold text-slate-800">{rep || "Select a salesperson"}</div>
            {selected && (
              <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => setDetail(selected)}>
                Route and activity
              </Button>
            )}
          </div>
          {rep ? <PerformancePanel userName={selected?.id || rep} /> : (
            <Card className="text-center text-slate-400 py-8 text-[13px]">No sales persons loaded yet.</Card>
          )}
        </div>
      </div>

      {detail && <WorkerDetail rep={detail} onClose={() => setDetail(null)} />}
    </DashboardLayout>
  );
}
