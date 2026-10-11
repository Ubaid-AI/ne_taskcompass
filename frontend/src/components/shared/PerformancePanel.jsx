import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Award, Target, Repeat } from "lucide-react";
import Card from "../ui/Card.jsx";
import { useData } from "../../context/DataContext.jsx";
import { bandFor } from "../../lib/performance.js";

function Ring({ score, size = 76 }) {
  const band = bandFor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8eef0" strokeWidth="3.4" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={band.ring} strokeWidth="3.4"
          strokeDasharray={`${score} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={`font-extrabold leading-none ${band.tone}`} style={{ fontSize: size / 4 }}>{score}</div>
          <div className="text-[9px] text-slate-400">/ 100</div>
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ direction }) {
  if (direction === "up") return <TrendingUp size={13} className="text-success-fg" />;
  if (direction === "down") return <TrendingDown size={13} className="text-danger-fg" />;
  return <Minus size={13} className="text-slate-400" />;
}

/**
 * One person's performance. Table and chart both use calendar months.
 * A single period control (this month / 3 / 6 / 12) so the current month is never hidden behind a second tab row.
 */
export default function PerformancePanel({ userName, compact = false }) {
  const { performanceHistory, overallPerformance } = useData();
  const [range, setRange] = useState(12);
  const [monthKey, setMonthKey] = useState(null);

  const history = useMemo(
    () => performanceHistory(userName, range),
    [performanceHistory, userName, range]
  );
  const overall = useMemo(
    () => overallPerformance(userName, range),
    [overallPerformance, userName, range]
  );
  const current = history[0];
  const shown = history.find((h) => h.key === monthKey) || current;
  const maxScore = Math.max(...history.map((h) => h.score), 1);
  const pad = compact ? "p-3" : "p-4";

  const followupRows = Array.isArray(shown?.followupTrends)
    ? shown.followupTrends
    : Array.isArray(current?.followupTrends)
    ? current.followupTrends
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Calendar months</span>
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {[[1, "This month"], [3, "3 months"], [6, "6 months"], [12, "12 months"]].map(([n, label]) => (
            <button key={n} type="button" onClick={() => { setRange(n); setMonthKey(null); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition whitespace-nowrap ${
                range === n ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown && (
        <Card className={`${pad} flex items-center gap-4`}>
          <Ring score={shown.score} size={compact ? 68 : 84} />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-800">
              {shown.longLabel}{shown.isCurrent ? " · in progress" : ""}
            </div>
            <div className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${bandFor(shown.score).bg} ${bandFor(shown.score).tone}`}>
              {bandFor(shown.score).label}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1.5 leading-relaxed">
              {shown.hasData
                ? <>{shown.achievedTotal.toLocaleString()} of {shown.targetTotal.toLocaleString()} units, {shown.achievedPct}% of target.</>
                : "No targets were assigned for this month, so there is nothing to score against."}
              {range > 1 && overall.months > 0 && (
                <> Across {overall.months} calendar months: {overall.achievedPct}% of target, score {overall.score}.</>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className={pad}>
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <div className="text-[12px] font-bold text-slate-700">
            {range === 1 ? "This calendar month" : `Last ${range} calendar months`}
          </div>
          {overall.months > 0 && (
            <div className="text-[11px] text-slate-400">
              {overall.achievedTotal.toLocaleString()} / {overall.targetTotal.toLocaleString()} units · {overall.achievedPct}%
            </div>
          )}
        </div>
        <div className="flex items-end gap-1 h-28">
          {[...history].reverse().map((m) => {
            const active = (monthKey || current?.key) === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMonthKey(m.key)}
                className="flex-1 min-w-0 flex flex-col items-center gap-1 group"
                title={`${m.longLabel}: ${m.hasData ? m.score : "no targets"}`}
              >
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition ${
                      !m.hasData ? "bg-slate-100"
                      : m.isCurrent ? "bg-brand-600"
                      : m.score >= 70 ? "bg-success-solid/70" : m.score >= 50 ? "bg-warning-solid/70" : "bg-danger-fg/50"} ${
                      active ? "ring-2 ring-brand-400" : ""}`}
                    style={{ height: `${m.hasData ? Math.max(10, (m.score / maxScore) * 100) : 6}%` }}
                  />
                </div>
                <div className={`text-[8.5px] truncate w-full text-center ${m.isCurrent ? "font-bold text-brand-700" : "text-slate-400"}`}>
                  {m.isCurrent ? "Now" : String(m.label || m.key || "").slice(0, 3)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-400 mt-2">Click a bar to open that calendar month. Scores match the team matrix — calendar month, not a rolling 30 days.</div>
      </Card>

      {shown?.hasData && (
        <Card className={pad}>
          <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Target size={13} className="text-slate-400" /> Product targets, {shown.label}
          </div>
          <div className="flex flex-col gap-2">
            {shown.lines.map((l) => {
              const pct = l.target ? Math.min(100, Math.round((l.achieved / l.target) * 100)) : 0;
              return (
                <div key={l.productId || l.product}>
                  <div className="flex items-center justify-between text-[11.5px] mb-0.5 gap-2">
                    <span className="text-slate-700 truncate">{l.product}</span>
                    <span className="text-slate-400 shrink-0 tabular-nums">{l.achieved} / {l.target}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-success-solid" : pct >= 50 ? "bg-brand-600" : "bg-warning-solid"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {followupRows.length > 0 && (
        <Card className={pad}>
          <div className="text-[12px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Repeat size={13} className="text-slate-400" /> Follow up accounts
          </div>
          <div className="flex flex-col gap-1.5">
            {followupRows.slice(0, 10).map((t) => (
              <div key={t.assignment?.id || `${t.assignment?.doctor}-${t.assignment?.product}`} className="flex items-center justify-between gap-2 text-[11.5px] py-1 border-b border-slate-50 last:border-0">
                <span className="min-w-0">
                  <span className="block text-slate-700 truncate">{t.assignment?.doctor}</span>
                  <span className="block text-[10.5px] text-slate-400 truncate">
                    {t.assignment?.product} vs {t.assignment?.competitor || "competitor"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {t.share > 0 && <span className="text-slate-400 tabular-nums">{t.share}%</span>}
                  <TrendIcon direction={t.direction} />
                  <span className={`font-bold tabular-nums w-11 text-right ${
                    t.direction === "up" ? "text-success-fg" : t.direction === "down" ? "text-danger-fg" : "text-slate-400"}`}>
                    {t.direction === "unknown" ? "—" : `${t.changePct > 0 ? "+" : ""}${t.changePct}%`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {shown?.events?.length > 0 && (
        <Card className={pad}>
          <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Award size={13} className="text-slate-400" /> Adjustments
          </div>
          <div className="flex flex-col gap-1.5">
            {shown.events.map((e) => (
              <div key={e.id} className={`rounded-lg px-3 py-2 flex items-center gap-3 ${e.points < 0 ? "bg-danger-bg" : "bg-success-bg"}`}>
                <span className={`text-[14px] font-extrabold shrink-0 ${e.points < 0 ? "text-danger-fg" : "text-success-fg"}`}>
                  {e.points > 0 ? `+${e.points}` : e.points}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[12px] font-bold ${e.points < 0 ? "text-danger-fg" : "text-success-fg"}`}>{e.kind}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{e.note} · {e.date}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
