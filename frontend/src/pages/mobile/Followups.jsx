import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Repeat, TrendingUp, TrendingDown, Minus, Info, ChevronRight, X, BarChart3,
} from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import DoctorProfile from "../../components/shared/DoctorProfile.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { salesperson } from "../../data/neData.js";
import { followupTrend, MONTH_SHORT } from "../../lib/performance.js";

function TrendPill({ trend }) {
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const tone =
    trend.direction === "up" ? "bg-success-bg text-success-fg"
    : trend.direction === "down" ? "bg-danger-bg text-danger-fg"
    : "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tone}`}>
      <Icon size={11} />
      {trend.direction === "unknown" ? "no data yet" : `${trend.changePct > 0 ? "+" : ""}${trend.changePct}%`}
    </span>
  );
}

/**
 * The rep's own follow up accounts.
 *
 * These are surgeons already using one of our products alongside a competitor's.
 * They sit outside the three visit cycle, so without a screen of their own they
 * simply vanish from a rep's day: the doctor list does not distinguish them and
 * nothing prompts the revisit. That was the gap this fills.
 */
export default function MobileFollowups() {
  const navigate = useNavigate();
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;
  const { followupsForRep, salesForDoctor, doctors, visits } = useData();

  const [filter, setFilter] = useState("All");
  const [viewing, setViewing] = useState(null);

  const rows = useMemo(() => {
    return followupsForRep(me.name)
      .map((f) => {
        // Trend for this product only. The doctor's whole order book would
        // hide a product losing ground behind another that is growing.
        const sales = salesForDoctor(f.doctorId)
          .map((p) => ({
            year: p.year, month: p.month,
            qty: p.lines.filter((l) => l.productId === f.productId).reduce((n, l) => n + l.qty, 0),
            competitorQty: p.lines.filter((l) => l.productId === f.productId)
              .reduce((n, l) => n + l.competitorQty, 0),
            has: p.lines.some((l) => l.productId === f.productId),
          }))
          .filter((p) => p.has);
        const doctor = doctors.find((d) => d.id === f.doctorId);
        const done = visits.filter(
          (v) => v.doctorId === f.doctorId && v.product === f.product && v.isFollowup
        ).length;
        return { ...f, doctorRecord: doctor, sales, trend: followupTrend(sales), visitCount: done };
      })
      .sort((a, b) => {
        // Declining accounts first. They are the ones losing ground, and a rep
        // scrolling a long list should meet the problems before the wins.
        const rank = { down: 0, unknown: 1, flat: 2, up: 3 };
        return rank[a.trend.direction] - rank[b.trend.direction];
      });
  }, [followupsForRep, me.name, salesForDoctor, doctors, visits]);

  const visible = useMemo(() => {
    if (filter === "All") return rows;
    if (filter === "Losing ground") return rows.filter((r) => r.trend.direction === "down");
    if (filter === "Growing") return rows.filter((r) => r.trend.direction === "up");
    return rows.filter((r) => r.trend.direction === "unknown");
  }, [rows, filter]);

  const counts = {
    growing: rows.filter((r) => r.trend.direction === "up").length,
    declining: rows.filter((r) => r.trend.direction === "down").length,
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="My Follow ups" />

      <div className="px-4 pt-3 pb-2 shrink-0 border-b border-slate-100">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["All", "Losing ground", "Growing", "No data"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border whitespace-nowrap transition ${
                filter === t
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        <div className="flex gap-2 text-[11.5px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 leading-relaxed">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            These surgeons already use one of our products beside a competitor's. You can visit them
            as often as needed, the three visit limit does not apply. What counts is whether their
            monthly volume grows.
          </span>
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <Card padding="p-2.5" className="flex items-center gap-2">
              <TrendingUp size={16} className="text-success-fg shrink-0" />
              <div>
                <div className="text-[16px] font-extrabold text-success-fg leading-none">{counts.growing}</div>
                <div className="text-[10px] text-slate-400">growing</div>
              </div>
            </Card>
            <Card padding="p-2.5" className="flex items-center gap-2">
              <TrendingDown size={16} className="text-danger-fg shrink-0" />
              <div>
                <div className="text-[16px] font-extrabold text-danger-fg leading-none">{counts.declining}</div>
                <div className="text-[10px] text-slate-400">losing ground</div>
              </div>
            </Card>
          </div>
        )}

        {visible.map((f) => {
          const max = Math.max(1, ...f.sales.map((s) => s.qty + s.competitorQty));
          return (
            <Card key={f.id} padding="p-3" className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 truncate">{f.doctor}</div>
                  <div className="text-[11.5px] text-slate-500 truncate">
                    {f.product} · vs {f.competitor || "a competitor"}
                  </div>
                </div>
                <TrendPill trend={f.trend} />
              </div>

              {f.sales.length > 0 ? (
                <>
                  <div className="flex items-end gap-1 h-12">
                    {f.sales.slice(-6).map((s) => (
                      <div key={`${s.year}-${s.month}`} className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                        <div className="w-full flex-1 flex flex-col justify-end gap-px">
                          {s.competitorQty > 0 && (
                            <div className="w-full bg-slate-300 rounded-t"
                              style={{ height: `${(s.competitorQty / max) * 100}%` }} />
                          )}
                          <div className="w-full bg-brand-600 rounded-t"
                            style={{ height: `${(s.qty / max) * 100}%` }} />
                        </div>
                        <div className="text-[8px] text-slate-400">{MONTH_SHORT[s.month - 1]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {f.trend.share > 0 && <>We hold <b>{f.trend.share}%</b> here. </>}
                    {f.trend.note}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-2.5 py-2 flex gap-1.5">
                  <BarChart3 size={12} className="shrink-0 mt-0.5" />
                  No purchase figures recorded yet, so there is no trend to show. The office enters
                  these each month.
                </div>
              )}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => setViewing(f.doctorRecord)}
                  className="flex-1 flex items-center justify-center gap-1 text-[12px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg py-2 transition"
                >
                  Profile <ChevronRight size={13} />
                </button>
                {/* Goes to the follow up screen, not the standard visit flow.
                    That one asks for brochure and demonstration, which makes no
                    sense for a surgeon already using the product. */}
                <Button size="sm" className="flex-1"
                  onClick={() => navigate(`/mobile/followup/${f.id}`)}>
                  Log follow up {f.visitCount > 0 ? `(${f.visitCount})` : ""}
                </Button>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card className="text-center text-slate-400 py-10 text-[13px] px-5">
            <Repeat size={24} className="mx-auto mb-2 text-slate-300" />
            {rows.length === 0
              ? "You have no follow up accounts. The office assigns these when a surgeon is found using one of our products alongside a competitor's."
              : "Nothing in this filter."}
          </Card>
        )}
      </div>

      {viewing && (
        <div className="absolute inset-0 z-40 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="font-bold text-slate-800 text-[14px]">Doctor profile</div>
            <button onClick={() => setViewing(null)} className="text-slate-400 p-1"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DoctorProfile doctor={viewing} mode="view" />
          </div>
        </div>
      )}
    </div>
  );
}
