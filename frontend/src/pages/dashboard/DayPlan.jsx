import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select, Textarea } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { DAY_TYPES, PLAN_RULE } from "../../data/neData.js";
import { api } from "../../lib/frappe.js";
import { getGps } from "../../lib/gps.js";

function todayISO() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function emptySlot() {
  return { doctor: "", hospital: "", product: "", visit_time: "", status: "Pending" };
}

function isLocked(status) {
  return Boolean(status && !["Pending", "Missed"].includes(status));
}

function doctorHospitals(doctor, hospitals) {
  const ids = doctor?.hospitals || [];
  return ids.map((id) => {
    const h = (hospitals || []).find((row) => row.id === id || row.name === id);
    return { value: id, label: h?.name || id, sub: h?.city };
  });
}

async function fetchOpdStart(doctor, hospital, planDate) {
  if (!doctor || !hospital) return "";
  try {
    return (await api.call("ne_taskcompass.api.plans.opd_start_time", {
      doctor, hospital, plan_date: planDate,
    })) || "";
  } catch {
    return "";
  }
}

function blankPlan(salesperson) {
  return {
    name: "",
    salesperson: salesperson || "",
    plan_date: todayISO(),
    day_type: "Field Day",
    remarks: "",
    items: [emptySlot()],
  };
}

export default function DayPlan() {
  const toast = useToast();
  const {
    dayPlans, doctors, users, hospitals, products,
    saveDayPlan, deleteDayPlan, checkinVisit, checkoutVisit,
  } = useData();
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterSalesperson, setFilterSalesperson] = useState("");
  const [plan, setPlan] = useState(blankPlan(""));

  useEffect(() => {
    if (mode !== "view" || !plan.name) return;
    const latest = (dayPlans || []).find((p) => p.name === plan.name);
    if (!latest) return;
    setPlan({
      name: latest.name,
      salesperson: latest.salesperson,
      plan_date: latest.plan_date,
      day_type: latest.day_type,
      remarks: latest.remarks || "",
      items: (latest.items || []).map((i) => ({ ...i })),
      status: latest.status,
    });
  }, [dayPlans, mode, plan.name]);

  const filteredPlans = useMemo(() => {
    return (dayPlans || []).filter((p) => {
      if (filterDate && p.plan_date !== filterDate) return false;
      if (filterSalesperson && p.salesperson !== filterSalesperson) return false;
      if (filterDoctor && !(p.items || []).some((i) => i.doctor === filterDoctor)) return false;
      return true;
    });
  }, [dayPlans, filterDate, filterSalesperson, filterDoctor]);

  const doctorFilterOptions = [
    { value: "", label: "All doctors" },
    ...doctors.map((d) => ({ value: d.id, label: d.name })),
  ];
  const salespersonFilterOptions = [
    { value: "", label: "All salespersons" },
    ...(users || []).map((u) => ({ value: u.id, label: u.name, sub: u.region })),
  ];

  const planDoctors = doctors.filter((d) => !plan.salesperson || d.rep === plan.salesperson);
  const filled = (plan.items || []).filter((i) => i.doctor);
  const hod = filled.filter((i) => doctors.find((d) => d.id === i.doctor)?.personType === "HOD").length;
  const professor = filled.filter((i) => doctors.find((d) => d.id === i.doctor)?.personType === "Professor").length;
  const isField = plan.day_type === "Field Day";
  const readOnly = mode === "view";
  const hasLocked = (plan.items || []).some((i) => isLocked(i.status));

  function setItem(idx, patch) {
    setPlan((p) => {
      const items = [...p.items];
      if (isLocked(items[idx]?.status)) return p;
      items[idx] = { ...items[idx], ...patch };
      return { ...p, items };
    });
  }

  function removeItem(idx) {
    setPlan((p) => {
      const row = p.items[idx];
      if (isLocked(row?.status)) return p;
      const items = p.items.filter((_, i) => i !== idx);
      return { ...p, items: items.length ? items : [emptySlot()] };
    });
  }

  async function onPickDoctor(idx, id) {
    const doc = doctors.find((d) => d.id === id);
    const options = doctorHospitals(doc, hospitals);
    const hospital = options.length === 1 ? options[0].value : "";
    const visit_time = hospital ? await fetchOpdStart(id, hospital, plan.plan_date) : "";
    setItem(idx, { doctor: id, hospital, visit_time });
  }

  async function onPickHospital(idx, hospital) {
    const item = plan.items[idx];
    const visit_time = await fetchOpdStart(item.doctor, hospital, plan.plan_date);
    setItem(idx, { hospital, visit_time });
  }

  function openAdd() {
    setPlan(blankPlan(users[0]?.id || ""));
    setMode("add");
  }

  function openView(p) {
    setPlan({
      name: p.name,
      salesperson: p.salesperson,
      plan_date: p.plan_date,
      day_type: p.day_type,
      remarks: p.remarks || "",
      items: (p.items || []).map((i) => ({ ...i })),
      status: p.status,
    });
    setMode("view");
  }

  function openEdit(p) {
    setPlan({
      name: p.name,
      salesperson: p.salesperson,
      plan_date: p.plan_date,
      day_type: p.day_type,
      remarks: p.remarks || "",
      items: (p.items || []).length ? (p.items || []).map((i) => ({ ...i })) : [emptySlot()],
      status: p.status,
    });
    setMode("edit");
  }

  async function savePlan() {
    if (!plan.salesperson) return toast("Pick a salesperson.");
    if (!plan.plan_date) return toast("Pick a date.");
    const items = (plan.items || []).filter((i) => i.doctor);
    if (!items.length) return toast("Add at least one visit row.");
    if (items.some((i) => !i.hospital)) return toast("Pick a hospital from the doctor's Hospitals table for each visit.");
    if (items.some((i) => !i.product)) return toast("Pick a product for each visit.");
    if (isField) {
      if (hod < PLAN_RULE.minHOD) return toast(`A Field Day needs at least ${PLAN_RULE.minHOD} HODs.`);
      if (professor < PLAN_RULE.minProfessor) return toast(`A Field Day needs at least ${PLAN_RULE.minProfessor} Professors.`);
    }
    setBusy(true);
    const res = await saveDayPlan({
      name: plan.name,
      salesperson: plan.salesperson,
      plan_date: plan.plan_date,
      day_type: plan.day_type,
      remarks: plan.remarks,
      items,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not save that day plan.");
    toast(plan.name ? "Day plan updated. Pending and missed visits were synced." : "Day plan saved. A visit was created for each row.");
    setMode(null);
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await deleteDayPlan(deleting.name);
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not delete that day plan.");
    toast("Day plan deleted.");
    setDeleting(null);
    setMode(null);
  }

  async function onCheckin(row) {
    setRowBusy(row.name || row.visit);
    try {
      const gps = await getGps();
      const res = await checkinVisit({
        name: row.visit,
        day_plan: plan.name,
        day_plan_item: row.name,
        doctor: row.doctor,
        hospital: row.hospital,
        product: row.product,
        checkin_latitude: gps.latitude,
        checkin_longitude: gps.longitude,
      });
      if (!res.ok) toast(res.error || "Check-in failed.");
      else toast("Checked in. Status is In Progress.");
    } catch (e) {
      toast(e.message);
    }
    setRowBusy("");
  }

  async function onCheckout(row) {
    if (!row.visit) return toast("No visit record for this row yet.");
    setRowBusy(row.name || row.visit);
    try {
      const gps = await getGps();
      const res = await checkoutVisit({
        name: row.visit,
        checkout_latitude: gps.latitude,
        checkout_longitude: gps.longitude,
      });
      if (!res.ok) toast(res.error || "Check-out failed.");
      else toast("Checked out. Status is Done.");
    } catch (e) {
      toast(e.message);
    }
    setRowBusy("");
  }

  return (
    <DashboardLayout title="Day Plan" subtitle="Add visit rows as a table. After check-in, that row is locked. Pending and missed rows update the linked visit.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Input label="Filter by date" type="date" value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)} />
        <SearchSelect
          label="Filter by doctor"
          value={filterDoctor}
          options={doctorFilterOptions}
          placeholder="All doctors"
          onChange={setFilterDoctor}
        />
        <SearchSelect
          label="Filter by salesperson"
          value={filterSalesperson}
          options={salespersonFilterOptions}
          placeholder="All salespersons"
          onChange={setFilterSalesperson}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-bold text-slate-700">Day plans</div>
        <Button size="sm" icon={Plus} onClick={openAdd}>Add day plan</Button>
      </div>
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 font-bold">Date</th>
                <th className="px-5 py-2.5 font-bold">Rep</th>
                <th className="px-5 py-2.5 font-bold">Type</th>
                <th className="px-5 py-2.5 font-bold">Visits</th>
                <th className="px-5 py-2.5 font-bold">Status</th>
                <th className="px-5 py-2.5 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-slate-400">
                    {(dayPlans || []).length === 0 ? "No day plans yet. Add one here for a salesperson." : "No day plans match these filters."}
                  </td>
                </tr>
              ) : filteredPlans.map((p) => (
                <tr key={p.name} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">{p.plan_date}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <div>{p.salesperson}</div>
                    <div className="text-[11px] text-slate-400">{p.name}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{p.day_type}</td>
                  <td className="px-5 py-3.5 text-slate-600">{(p.items || []).length}</td>
                  <td className="px-5 py-3.5"><StatusPill status={p.status}>{p.status}</StatusPill></td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => openView(p)} title="View">
                        <Eye size={15} />
                      </button>
                      <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-danger-bg hover:text-danger-fg"
                        onClick={() => setDeleting(p)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(mode)}
        onClose={() => setMode(null)}
        title={mode === "view" ? "Day plan" : mode === "edit" ? "Edit day plan" : "Add day plan"}
        subtitle={
          mode === "view"
            ? "Check in and check out from a visit row. Rows already in progress or done cannot be changed."
            : "Add as many visit rows as you need. Hospital comes from the doctor's Hospitals table. After check-in that row is locked."
        }
        maxW="max-w-4xl"
        footer={
          readOnly ? (
            <>
              <Button variant="ghost" onClick={() => setMode(null)}>Close</Button>
              <Button onClick={() => setMode("edit")}>Edit</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
              <Button onClick={savePlan} disabled={busy}>{busy ? "Saving…" : "Save day plan"}</Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <SearchSelect
            label="Salesperson"
            value={plan.salesperson}
            disabled={readOnly || hasLocked}
            options={(users || []).map((u) => ({ value: u.id, label: u.name, sub: u.region }))}
            onChange={(id) => setPlan({ ...plan, salesperson: id })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={plan.plan_date} disabled={readOnly || hasLocked}
              onChange={(e) => setPlan({ ...plan, plan_date: e.target.value })} />
            <Select label="Day type" options={DAY_TYPES} value={plan.day_type} disabled={readOnly}
              onChange={(e) => setPlan({ ...plan, day_type: e.target.value })} />
          </div>
          {isField && (
            <div className="text-[12px] text-slate-500 rounded-xl bg-slate-50 px-3 py-2">
              {filled.length} visit{filled.length === 1 ? "" : "s"} · {hod} HOD (min {PLAN_RULE.minHOD}) · {professor} Professor (min {PLAN_RULE.minProfessor})
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Visits</div>
            {!readOnly && (
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPlan({ ...plan, items: [...plan.items, emptySlot()] })}>
                Add visit row
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {(plan.items || []).map((item, idx) => {
              const doc = doctors.find((d) => d.id === item.doctor);
              const locked = isLocked(item.status);
              const disableRow = readOnly || locked;
              return (
                <div key={item.name || idx} className={`rounded-xl border p-3 ${locked ? "border-slate-200 bg-slate-50" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Visit {idx + 1}</div>
                      {item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}
                      {locked && <span className="text-[11px] text-slate-400">Locked after check-in</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {readOnly && item.status === "Pending" && (
                        <Button size="sm" disabled={rowBusy === (item.name || item.visit)} onClick={() => onCheckin(item)}>
                          {rowBusy === (item.name || item.visit) ? "…" : "Check-In"}
                        </Button>
                      )}
                      {readOnly && item.status === "In Progress" && (
                        <Button size="sm" disabled={rowBusy === (item.name || item.visit)} onClick={() => onCheckout(item)}>
                          {rowBusy === (item.name || item.visit) ? "…" : "Check-Out"}
                        </Button>
                      )}
                      {!readOnly && !locked && (
                        <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg" onClick={() => removeItem(idx)} title="Remove row">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchSelect
                      label="Doctor"
                      value={item.doctor}
                      disabled={disableRow}
                      options={planDoctors.map((d) => ({
                        value: d.id,
                        label: d.name,
                        sub: `${d.personType || "Unclassified"} · ${(d.hospitals || []).length} hospitals`,
                      }))}
                      onChange={(id) => onPickDoctor(idx, id)}
                    />
                    <SearchSelect
                      label="Hospital"
                      value={item.hospital}
                      disabled={disableRow}
                      options={doctorHospitals(doc, hospitals)}
                      placeholder={item.doctor ? "Hospitals on this doctor" : "Pick a doctor first"}
                      empty="This doctor has no rows in the Hospitals table"
                      onChange={(id) => onPickHospital(idx, id)}
                    />
                    <SearchSelect
                      label="Product"
                      value={item.product}
                      disabled={disableRow}
                      options={(products || []).map((p) => ({ value: p.id, label: p.name, sub: p.category }))}
                      onChange={(id) => setItem(idx, { product: id })}
                    />
                    <Input
                      label="Visit time (from OPD)"
                      type="time"
                      step="60"
                      disabled={disableRow}
                      value={item.visit_time || ""}
                      onChange={(e) => setItem(idx, { visit_time: e.target.value })}
                    />
                  </div>
                  {item.visit && (
                    <div className="text-[11px] text-slate-400 mt-2">Visit {item.visit}</div>
                  )}
                </div>
              );
            })}
          </div>
          <Textarea label="Remarks" rows={2} value={plan.remarks} disabled={readOnly}
            onChange={(e) => setPlan({ ...plan, remarks: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete day plan"
        subtitle="Pending and missed visits on this plan will be removed too. In-progress or done visits block delete."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete {deleting?.name} for {deleting?.salesperson} on {deleting?.plan_date}?
        </p>
      </Modal>
    </DashboardLayout>
  );
}
