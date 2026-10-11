import { useMemo, useState } from "react";
import {
  GitBranch, AlertTriangle, Info, Search, TrendingDown, Clock, Wallet,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import { useData } from "../../context/DataContext.jsx";
import { STAGES, STAGE_INDEX, funnel } from "../../lib/pipeline.js";

const fmtPKR = (n) =>
  n == null ? null : `PKR ${Math.round(n).toLocaleString("en-PK")}`;

const STAGE_TONE = {
  introduced: "bg-slate-100 text-slate-600",
  demonstrated: "bg-sky-50 text-sky-700",
  sample: "bg-amber-50 text-amber-700",
  trial: "bg-violet-50 text-violet-700",
  evaluated: "bg-indigo-50 text-indigo-700",
  ordering: "bg-success-bg text-success-fg",
  growing: "bg-success-bg text-success-fg",
  at_risk: "bg-danger-bg text-danger-fg",
  lost: "bg-slate-100 text-slate-400",
};

export default function Pipeline() {
  const { pipeline, users, products } = useData();

  const all = useMemo(() => pipeline(), [pipeline]);
  const [stage, setStage] = useState("");
  const [rep, setRep] = useState("");
  const [query, setQuery] = useState("");
  const [onlyStalled, setOnlyStalled] = useState(false);

  const live = useMemo(() => all.filter((o) => !o.isLost), [all]);
  const steps = useMemo(() => funnel(live), [live]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((o) =>
      (!stage || o.stage === stage) &&
      (!rep || o.rep === rep) &&
      (!onlyStalled || o.stalled) &&
      (!q || o.doctor.toLowerCase().includes(q) || o.product.toLowerCase().includes(q) ||
        (o.hospital || "").toLowerCase().includes(q))
    );
  }, [all, stage, rep, query, onlyStalled]);

  const stalled = useMemo(() => all.filter((o) => o.stalled), [all]);
  const valued = useMemo(() => live.filter((o) => o.valueKnown), [live]);
  const inPlay = valued.reduce((n, o) => n + o.annualValue, 0);
  const missingPrices = products.filter((p) => p.unitPrice == null).length;

  const counts = useMemo(() => {
    const c = {};
    for (const o of all) c[o.stage] = (c[o.stage] || 0) + 1;
    return c;
  }, [all]);

  return (
    <DashboardLayout
      title="Sales Pipeline"
      subtitle={`${live.length} live opportunities, ${stalled.length} needing a chase`}
    >
      <div className="flex gap-2 text-[12px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-4">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          Nothing here is entered by hand. Every stage is read from what the field team already
          records: visits, sample order forms, stamped reviews and monthly purchases. An opportunity
          is one <b>doctor and one product</b>, so the same surgeon can appear more than once.
        </span>
      </div>

      {/* Headline */}
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        <Card className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
            <GitBranch size={17} />
          </div>
          <div>
            <div className="text-[19px] font-extrabold text-slate-800 leading-tight">{live.length}</div>
            <div className="text-[11px] text-slate-400">live opportunities</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-warning-bg text-warning-fg grid place-items-center shrink-0">
            <Clock size={17} />
          </div>
          <div>
            <div className="text-[19px] font-extrabold text-warning-fg leading-tight">{stalled.length}</div>
            <div className="text-[11px] text-slate-400">stalled too long</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-danger-bg text-danger-fg grid place-items-center shrink-0">
            <TrendingDown size={17} />
          </div>
          <div>
            <div className="text-[19px] font-extrabold text-danger-fg leading-tight">{counts.at_risk || 0}</div>
            <div className="text-[11px] text-slate-400">ordering but declining</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-success-bg text-success-fg grid place-items-center shrink-0">
            <Wallet size={17} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold text-slate-800 leading-tight truncate">
              {valued.length ? fmtPKR(inPlay) : "Not priced"}
            </div>
            <div className="text-[11px] text-slate-400">
              {valued.length ? `annualised, from ${valued.length} of ${live.length}` : "add prices to see value"}
            </div>
          </div>
        </Card>
      </div>

      {missingPrices > 0 && (
        <div className="flex gap-2 text-[12px] text-warning-fg bg-warning-bg border border-warning-fg/25 rounded-xl px-3 py-2.5 mb-4">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>
            {missingPrices} of {products.length} products have no unit price, so their opportunities
            show no value rather than a guess. Set prices in Supabase after running migration 008.
          </span>
        </div>
      )}

      {/* Funnel */}
      <Card className="mb-4">
        <div className="text-[13px] font-bold text-slate-700 mb-1">Where opportunities reach, and where they stop</div>
        <div className="text-[11.5px] text-slate-400 mb-3">
          Each bar counts everything that has reached that stage or beyond. The percentage is how many
          carried through from the stage before, which is where the money leaks.
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((s) => {
            const width = live.length ? (s.reached / live.length) * 100 : 0;
            return (
              <button key={s.key} onClick={() => setStage(stage === s.key ? "" : s.key)}
                title={s.hint}
                className={`text-left rounded-lg transition ${stage === s.key ? "ring-2 ring-brand-400" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-slate-700 w-32 shrink-0">{s.label}</span>
                  <span className="text-[12px] font-bold text-slate-800 tabular-nums w-8">{s.reached}</span>
                  {s.conversion != null && (
                    <span className={`text-[11px] font-bold tabular-nums ${
                      s.conversion >= 60 ? "text-success-fg" : s.conversion >= 30 ? "text-warning-fg" : "text-danger-fg"}`}>
                      {s.conversion}% carried through
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden ml-32">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${width}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctor, product or hospital"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] bg-white focus:outline-none focus:border-brand-400" />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] bg-white shrink-0">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label} ({counts[s.key] || 0})</option>)}
          <option value="at_risk">At risk ({counts.at_risk || 0})</option>
          <option value="lost">Lost ({counts.lost || 0})</option>
        </select>
        <select value={rep} onChange={(e) => setRep(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] bg-white shrink-0">
          <option value="">All salespeople</option>
          {users.map((u) => <option key={u.id || u.name}>{u.name}</option>)}
        </select>
        <button onClick={() => setOnlyStalled((v) => !v)}
          className={`px-3.5 py-2.5 rounded-xl text-[12.5px] font-semibold border transition shrink-0 ${
            onlyStalled ? "bg-warning-fg border-warning-fg text-white" : "bg-white border-slate-200 text-slate-600"}`}>
          Stalled only
        </button>
      </div>

      {/* Opportunities */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Doctor and product</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Waiting</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold text-right">Annual value</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((o) => (
                <tr key={o.id} className={`border-b border-slate-100 last:border-0 ${o.stalled ? "bg-warning-bg/40" : "hover:bg-slate-50/60"}`}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-800">{o.doctor}</div>
                    <div className="text-[11.5px] text-slate-400 truncate">
                      {o.product} · {o.hospital}
                      {o.competitor && <> · vs {o.competitor}</>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STAGE_TONE[o.stage]}`}>
                      {o.label}
                    </span>
                    {o.reason && <div className="text-[10.5px] text-slate-400 mt-0.5">{o.reason}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    {o.ageDays == null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <span className={o.stalled ? "text-warning-fg font-semibold" : "text-slate-500"}>
                        {o.ageDays} day{o.ageDays === 1 ? "" : "s"}
                        {o.stalled && <> · over {o.stallLimit}</>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{o.rep || "Unassigned"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {o.valueKnown
                      ? <span className="font-semibold text-slate-700">{fmtPKR(o.annualValue)}</span>
                      : <span className="text-[11.5px] text-slate-300">not priced</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="text-center text-slate-400 py-12 text-[13px] px-6">
            <GitBranch size={26} className="mx-auto mb-2 text-slate-300" />
            {all.length === 0
              ? "No opportunities yet. They appear on their own as reps log visits, submit sample order forms and purchases get recorded."
              : "Nothing matches these filters."}
          </div>
        )}
      </Card>

      <div className="text-[11.5px] text-slate-400 mt-3 leading-relaxed">
        Stages come from records, so this cannot drift from reality. A doctor who has bought is shown
        as ordering even if an old visit recorded a refusal, because a purchase is stronger evidence
        than a sentence typed months earlier.
      </div>
    </DashboardLayout>
  );
}
