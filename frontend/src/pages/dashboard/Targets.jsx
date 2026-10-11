import { useState, useMemo, useEffect } from "react";
import { Target, Copy, Save, Info, TrendingUp, Calendar } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { recentMonths, weeklyFromMonthly, WEEKS_PER_MONTH } from "../../lib/performance.js";

export default function Targets() {
  const toast = useToast();
  const {
    users, products, targetsForMonth,
    assignMonthlyTargetsBulk, copyTargetsFromPreviousMonth, updateMonthlyAchieved,
  } = useData();

  const months = useMemo(() => recentMonths(12), []);
  const [rep, setRep] = useState("");
  const [period, setPeriod] = useState(months[0]);
  const [mode, setMode] = useState("assign");   // assign | record
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rep && users[0]?.id) setRep(users[0].id);
  }, [users, rep]);

  const lines = targetsForMonth(rep, period.year, period.month);
  const byProduct = useMemo(
    () => Object.fromEntries(lines.map((l) => [l.productId, l])),
    [lines]
  );

  // Reset unsaved edits whenever the person or the month changes, so a number
  // typed for one rep can never be saved against another.
  useEffect(() => { setDraft({}); }, [rep, period.key, mode]);

  const value = (p) =>
    draft[p.id] !== undefined
      ? draft[p.id]
      : mode === "assign"
      ? byProduct[p.id]?.target ?? ""
      : byProduct[p.id]?.achieved ?? "";

  const dirty = Object.keys(draft).length;

  const totals = useMemo(() => {
    let target = 0, achieved = 0;
    for (const p of products) {
      const line = byProduct[p.id];
      const t = mode === "assign" && draft[p.id] !== undefined ? Number(draft[p.id]) || 0 : line?.target || 0;
      const a = mode === "record" && draft[p.id] !== undefined ? Number(draft[p.id]) || 0 : line?.achieved || 0;
      target += t; achieved += a;
    }
    return { target, achieved, pct: target ? Math.min(100, Math.round((achieved / target) * 100)) : 0 };
  }, [products, byProduct, draft, mode]);

  async function save() {
    if (!rep) return toast("Pick a salesperson first.");
    if (!dirty) return toast("Nothing has changed.");
    setBusy(true);
    const byProductId = draft;
    const res = mode === "assign"
      ? await assignMonthlyTargetsBulk(rep, { year: period.year, month: period.month, byProductId })
      : await updateMonthlyAchieved(rep, period.year, period.month, 1, byProductId);
    setBusy(false);
    if (!res.ok) return toast(res.error || `Saved ${res.saved || 0}, ${res.failed || 0} failed.`);
    setDraft({});
    toast(mode === "assign"
      ? `Targets assigned to ${rep} for ${period.longLabel}.`
      : `Sales recorded for ${rep}, ${period.longLabel}.`);
  }

  async function copyForward() {
    if (!rep) return toast("Pick a salesperson first.");
    setBusy(true);
    const res = await copyTargetsFromPreviousMonth(rep, period.year, period.month);
    setBusy(false);
    toast(res.ok ? `Copied last month's targets to ${period.longLabel}.` : res.error);
  }

  return (
    <DashboardLayout
      title="Targets"
      subtitle="Assign monthly targets, and record what was actually sold"
    >
      <div className="flex gap-2 text-[12px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-4">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          The monthly figure is what you set. The weekly target is that number split across{" "}
          {WEEKS_PER_MONTH} weeks and is shown beside each row, so reps see the same goal at both
          scales. Switch to <b>Record sales</b> to enter what actually sold.
        </span>
      </div>

      {/* Who and when */}
      <Card className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Salesperson</div>
            <select
              value={rep}
              onChange={(e) => setRep(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-white"
            >
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="inline-flex bg-slate-100 rounded-xl p-1">
            {[["assign", "Assign targets"], ["record", "Record sales"]].map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)}
                className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition ${
                  mode === k ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Calendar size={12} /> Month
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {months.map((m) => (
              <button key={m.key} onClick={() => setPeriod(m)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border transition ${
                  period.key === m.key
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-brand-300"}`}>
                {m.label}{m.isCurrent ? " · now" : ""}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: "Monthly target", value: totals.target.toLocaleString(), sub: "units" },
          { label: "Recorded sold", value: totals.achieved.toLocaleString(), sub: "units" },
          { label: "Achievement", value: `${totals.pct}%`, sub: period.longLabel },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
              {s.label === "Achievement" ? <TrendingUp size={17} /> : <Target size={17} />}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{s.label}</div>
              <div className="text-[18px] font-extrabold text-slate-800 leading-tight">{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Product lines */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="text-[13px] font-bold text-slate-700">
            {mode === "assign" ? "Set the monthly target per product" : "Enter units sold this month"}
          </div>
          <div className="flex gap-2">
            {mode === "assign" && (
              <Button size="sm" variant="secondary" icon={Copy} onClick={copyForward} disabled={busy}>
                Copy last month
              </Button>
            )}
            <Button size="sm" icon={Save} onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving…" : dirty ? `Save ${dirty} change${dirty === 1 ? "" : "s"}` : "Saved"}
            </Button>
          </div>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold w-32">Monthly target</th>
              <th className="px-4 py-2.5 font-semibold w-28">Per week</th>
              <th className="px-4 py-2.5 font-semibold w-32">Sold</th>
              <th className="px-4 py-2.5 font-semibold w-24 text-right">Achieved</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const line = byProduct[p.id];
              const target = mode === "assign" && draft[p.id] !== undefined
                ? Number(draft[p.id]) || 0 : line?.target || 0;
              const sold = mode === "record" && draft[p.id] !== undefined
                ? Number(draft[p.id]) || 0 : line?.achieved || 0;
              const pct = target ? Math.min(100, Math.round((sold / target) * 100)) : 0;
              const editable = mode === "assign" ? "target" : "sold";
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    {p.category && <div className="text-[11px] text-slate-400">{p.category}</div>}
                  </td>
                  <td className="px-4 py-2">
                    {editable === "target" ? (
                      <input type="number" min="0" value={value(p)}
                        onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                        placeholder="0"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] tabular-nums focus:outline-none focus:border-brand-400" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{target || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-400 tabular-nums">
                    {target ? weeklyFromMonthly(target) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {editable === "sold" ? (
                      <input type="number" min="0" value={value(p)}
                        onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                        placeholder="0"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] tabular-nums focus:outline-none focus:border-brand-400" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{sold || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {target ? (
                      <span className={`text-[12px] font-bold tabular-nums ${
                        pct >= 100 ? "text-success-fg" : pct >= 50 ? "text-brand-700" : "text-warning-fg"}`}>
                        {pct}%
                      </span>
                    ) : <span className="text-[12px] text-slate-300">not set</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-[13px]">No products in the catalogue yet.</div>
        )}
      </Card>

      <div className="text-[11.5px] text-slate-400 mt-3 leading-relaxed">
        Targets are stored per person, per product, per month, so changing this month leaves last
        month's record intact and the history on the Performance page stays accurate.
      </div>
    </DashboardLayout>
  );
}
