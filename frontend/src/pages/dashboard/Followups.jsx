import { useState, useMemo } from "react";
import {
  Repeat, Plus, Info, TrendingUp, TrendingDown, Minus, Search, Pause, Play, X, BarChart3,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { followupTrend, MONTH_SHORT } from "../../lib/performance.js";

const STATUS_TONE = {
  active: "bg-success-bg text-success-fg",
  paused: "bg-warning-bg text-warning-fg",
  closed: "bg-slate-100 text-slate-500",
};

function TrendCell({ trend }) {
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const tone =
    trend.direction === "up" ? "text-success-fg"
    : trend.direction === "down" ? "text-danger-fg" : "text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold tabular-nums ${tone}`}>
      <Icon size={14} />
      {trend.direction === "unknown" ? "no data" : `${trend.changePct > 0 ? "+" : ""}${trend.changePct}%`}
    </span>
  );
}

export default function Followups() {
  const toast = useToast();
  const { dashboardUser } = useSession();
  const {
    followups, assignFollowup, setFollowupStatus, reassignFollowup,
    doctors, products, users, salesForDoctor, visits,
  } = useData();

  async function reassign(f, repName) {
    const res = await reassignFollowup(f.id, repName);
    toast(res.ok ? `${f.doctor} · ${f.product} now with ${repName}.` : res.error);
  }

  const [tab, setTab] = useState("active");
  const [query, setQuery] = useState("");
  const [rep, setRep] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    doctorId: "", productId: "", competitor: "", reason: "",
    assignedToName: "", targetShare: "", reviewAfter: "",
  });
  const [busy, setBusy] = useState(false);

  const approved = useMemo(
    () => doctors.filter((d) => d.status !== "rejected"),
    [doctors]
  );

  const alreadyAssigned = useMemo(
    () => followups.some((f) =>
      f.doctorId === form.doctorId && f.productId === form.productId && f.status === "active"),
    [followups, form.doctorId, form.productId]
  );

  // Sales are recorded per doctor and product, so the trend for an assignment
  // reads only the rows for that product rather than the doctor's whole book.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return followups
      .filter((f) => (tab === "all" ? true : f.status === tab))
      .filter((f) => !rep || f.assignedTo === rep || (!f.assignedTo && f.rep === rep))
      .filter((f) => !q || f.doctor.toLowerCase().includes(q) || f.product.toLowerCase().includes(q)
        || (f.competitor || "").toLowerCase().includes(q))
      .map((f) => {
        const productSales = salesForDoctor(f.doctorId)
          .map((period) => ({
            ...period,
            lines: period.lines.filter((l) => l.productId === f.productId),
          }))
          .filter((period) => period.lines.length)
          .map((period) => ({
            year: period.year, month: period.month,
            qty: period.lines.reduce((n, l) => n + l.qty, 0),
            competitorQty: period.lines.reduce((n, l) => n + l.competitorQty, 0),
          }));
        const visitCount = visits.filter(
          (v) => v.doctorId === f.doctorId && v.product === f.product && v.isFollowup
        ).length;
        return { ...f, sales: productSales, trend: followupTrend(productSales), visitCount };
      });
  }, [followups, tab, rep, query, salesForDoctor, visits]);

  const counts = useMemo(() => ({
    active: followups.filter((f) => f.status === "active").length,
    paused: followups.filter((f) => f.status === "paused").length,
    closed: followups.filter((f) => f.status === "closed").length,
    all: followups.length,
  }), [followups]);

  const summary = useMemo(() => {
    const active = rows.filter((r) => r.status === "active");
    return {
      growing: active.filter((r) => r.trend.direction === "up").length,
      declining: active.filter((r) => r.trend.direction === "down").length,
      flat: active.filter((r) => r.trend.direction === "flat").length,
      noData: active.filter((r) => r.trend.direction === "unknown").length,
    };
  }, [rows]);

  async function save() {
    setBusy(true);
    const res = await assignFollowup({ ...form, byId: dashboardUser?.id });
    setBusy(false);
    if (!res.ok) return toast(res.error);
    const doctor = approved.find((d) => d.id === form.doctorId);
    const product = products.find((p) => p.id === form.productId);
    toast(
      res.warning ||
      `${doctor?.name} assigned to ${res.followup?.assignedTo || "the doctor's rep"} ` +
      `for follow up on ${product?.name}.`
    );
    setForm({
      doctorId: "", productId: "", competitor: "", reason: "",
      assignedToName: "", targetShare: "", reviewAfter: "",
    });
    setAdding(false);
  }

  async function changeStatus(f, status) {
    const res = await setFollowupStatus(f.id, status);
    toast(res.ok ? `${f.doctor} · ${f.product} set to ${status}.` : res.error);
  }

  return (
    <DashboardLayout
      title="Follow ups"
      subtitle="Surgeons already using a product alongside a competitor's, assigned per product"
    >
      <div className="flex gap-2 text-[12px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-4">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>
          A follow up is assigned to a <b>doctor and one product</b>, not to the doctor as a whole. A
          surgeon may use our haemostat beside a competitor's while never having seen our dural graft,
          and only the first should escape the three visit limit. Assigning here is what lets the rep
          log a fourth and later visit in the app.
        </span>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Growing", value: summary.growing, tone: "text-success-fg", icon: TrendingUp },
          { label: "Declining", value: summary.declining, tone: "text-danger-fg", icon: TrendingDown },
          { label: "Holding", value: summary.flat, tone: "text-slate-600", icon: Minus },
          { label: "Awaiting sales data", value: summary.noData, tone: "text-slate-400", icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 grid place-items-center shrink-0">
              <s.icon size={17} className={s.tone} />
            </div>
            <div>
              <div className={`text-[19px] font-extrabold leading-tight ${s.tone}`}>{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          {["active", "paused", "closed", "all"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-lg text-[12.5px] font-semibold capitalize transition ${
                tab === t ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              {t} <span className="opacity-70">({counts[t]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctor, product or competitor"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] bg-white focus:outline-none focus:border-brand-400" />
        </div>
        <select value={rep} onChange={(e) => setRep(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] bg-white shrink-0">
          <option value="">All salespeople</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <Button icon={Plus} onClick={() => setAdding(true)} className="shrink-0">Assign follow up</Button>
      </div>

      {/* Assignments */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Product on follow up</th>
                <th className="px-4 py-3 font-semibold">Competing with</th>
                <th className="px-4 py-3 font-semibold">Assigned to</th>
                <th className="px-4 py-3 font-semibold">Volume trend</th>
                <th className="px-4 py-3 font-semibold">Our share</th>
                <th className="px-4 py-3 font-semibold">Visits</th>
                <th className="px-4 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-800">{f.doctor}</div>
                    <div className="text-[11.5px] text-slate-400">
                      {f.city}{f.rep ? ` · ${f.rep}` : " · unassigned"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-slate-700">{f.product}</div>
                    <div className="text-[11px] text-slate-400">since {f.assignedAt}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{f.competitor || "—"}</td>
                  <td className="px-4 py-2.5">
                    {/* Reassignable in place. Follow ups move between reps more
                        often than doctors do, so burying this behind an edit
                        screen would make the common action the awkward one. */}
                    <select
                      value={f.assignedTo || ""}
                      onChange={(e) => reassign(f, e.target.value)}
                      className="text-[12px] px-2 py-1 rounded-lg border border-slate-200 bg-white max-w-[140px]"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <TrendCell trend={f.trend} />
                    {Array.isArray(f.sales) && f.sales.length > 0 && (
                      <div className="flex items-end gap-0.5 h-6 mt-1">
                        {f.sales.slice(-6).map((s) => {
                          const max = Math.max(1, ...f.sales.map((x) => x.qty));
                          return (
                            <div key={`${s.year}-${s.month}`} className="w-2 bg-brand-500 rounded-t"
                              style={{ height: `${Math.max(8, (s.qty / max) * 100)}%` }}
                              title={`${MONTH_SHORT[s.month - 1]}: ${s.qty}`} />
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {f.trend.share > 0 ? `${f.trend.share}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{f.visitCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[f.status]}`}>
                        {f.status}
                      </span>
                      {f.status === "active" && (
                        <>
                          <button onClick={() => changeStatus(f, "paused")} title="Pause, keeps the record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-warning-fg hover:bg-warning-bg transition">
                            <Pause size={14} />
                          </button>
                          <button onClick={() => changeStatus(f, "closed")} title="Close, they no longer use a competitor"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg transition">
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {f.status !== "active" && (
                        <button onClick={() => changeStatus(f, "active")} title="Reactivate"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-success-fg hover:bg-success-bg transition">
                          <Play size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="text-center text-slate-400 py-12 text-[13px] px-6">
            <Repeat size={26} className="mx-auto mb-2 text-slate-300" />
            {followups.length === 0
              ? "No follow ups assigned yet. Assign one when a rep reports that a surgeon is using one of our products alongside a competitor's."
              : "Nothing matches these filters."}
          </div>
        )}
      </Card>

      {/* Assign */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Assign a follow up"
        subtitle="One doctor, one product"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy || !form.doctorId || !form.productId || alreadyAssigned}>
              {busy ? "Assigning…" : "Assign"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
            This lifts the three visit limit for this doctor and this product only. Every other
            product still follows the normal cycle.
          </div>
          {/* Picked by id, not by name. Two surgeons can share a name across
              131 records, and a name based reverse lookup silently returns the
              wrong one. Searchable because scrolling 131 options is not a
              picker, it is a punishment. */}
          <SearchSelect
            label="Doctor *"
            value={form.doctorId}
            placeholder="Search by name, hospital or specialty"
            empty="No doctor matches that."
            options={approved.map((d) => ({
              value: d.id,
              label: d.name,
              sub: `${d.specialty || "—"} · ${d.hospital || "—"} · ${d.rep || "unassigned"}`,
            }))}
            onChange={(id) => setForm({ ...form, doctorId: id })}
          />

          <SearchSelect
            label="Product they already use *"
            value={form.productId}
            placeholder="Search products"
            options={(products || []).map((p) => ({ value: p.id, label: p.name, sub: p.category }))}
            onChange={(id) => setForm({ ...form, productId: id })}
          />
          {form.doctorId && form.productId && alreadyAssigned && (
            <div className="text-[11.5px] text-danger-fg bg-danger-bg rounded-lg px-3 py-2">
              This doctor already has an active follow up for that product. Pick a different product,
              or reopen the existing one from the table.
            </div>
          )}
          <Input label="Competing product or brand"
            placeholder="e.g. Johnson &amp; Johnson Surgicel"
            value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })} />

          {/* Who carries the work. Defaults to the doctor's own rep, but a
              competitive account often belongs with a more senior person, and
              reassigning the doctor to achieve that would disturb every other
              visit, target and plan attached to them. */}
          <Select
            label="Assign to salesperson"
            options={[{ value: "", label: "Doctor's own rep" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            value={form.assignedToName}
            onChange={(e) => setForm({ ...form, assignedToName: e.target.value })}
          />
          {form.doctorId && (
            <div className="text-[11px] text-slate-400 -mt-1.5">
              {form.assignedToName
                ? `${users.find((u) => u.id === form.assignedToName)?.name || form.assignedToName} will see this on their Follow ups tab in the app.`
                : `Goes to ${approved.find((d) => d.id === form.doctorId)?.rep || "whoever owns this doctor"}.`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Share to win (%)" type="number" min="0" max="100"
              placeholder="e.g. 60"
              value={form.targetShare} onChange={(e) => setForm({ ...form, targetShare: e.target.value })} />
            <Input label="Review after" type="date"
              value={form.reviewAfter} onChange={(e) => setForm({ ...form, reviewAfter: e.target.value })} />
          </div>

          <Input label="Why this is worth repeat visits"
            placeholder="e.g. Uses ours in 3 of 10 cases, rest on competitor"
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Record their monthly purchases against this product so the trend can be measured.
            Without those figures the follow up shows as "awaiting sales data" rather than growing
            or declining.
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
