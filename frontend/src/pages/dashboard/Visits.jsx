import { useMemo, useState } from "react";
import { Camera, Eye, Pencil } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select, Textarea, Checkbox } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { getGps } from "../../lib/gps.js";

function isLocked(status) {
  return Boolean(status && !["Pending", "Missed"].includes(status));
}

function VisitPhoto({ src, caption }) {
  const [failed, setFailed] = useState(false);
  if (!src) return null;
  if (failed) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="text-[11px] text-brand-700 font-semibold">
        Open photo{caption ? ` · ${caption}` : ""}
      </a>
    );
  }
  return (
    <figure className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
      <img
        src={src}
        alt={caption || "Visit photo"}
        className="w-full max-h-56 object-contain bg-white"
        onError={() => setFailed(true)}
      />
      {caption ? <figcaption className="px-2.5 py-1.5 text-[11px] text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

function doctorHospitals(doctor, hospitals) {
  const ids = doctor?.hospitals || [];
  return ids.map((id) => {
    const h = (hospitals || []).find((row) => row.id === id || row.name === id);
    return { value: id, label: h?.name || id, sub: h?.city };
  });
}

export default function Visits() {
  const toast = useToast();
  const {
    visits, doctors, hospitals, products, checkinVisit, checkoutVisit, updateVisit,
  } = useData();
  const nameOf = (id) => doctors.find((d) => d.id === id)?.name || id;
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  const rows = useMemo(() => {
    return (visits || []).filter((v) => !filterStatus || v.status === filterStatus);
  }, [visits, filterStatus]);

  function openView(v) {
    setForm(toForm(v));
    setMode("view");
  }

  function openEdit(v) {
    setForm(toForm(v));
    setMode("edit");
  }

  function toForm(v) {
    return {
      id: v.id,
      salesperson: v.salesperson,
      doctor: v.doctorId,
      hospital: v.hospital,
      product: v.product,
      status: v.status || "Pending",
      notes: v.notes || "",
      showedBrochure: Boolean(v.showedBrochure),
      didDemonstration: Boolean(v.didDemonstration || v.demo),
      outcome: v.outcome || "",
      visitedAt: v.visitedAt,
      checkinTime: v.checkinTime,
      checkoutTime: v.checkoutTime,
      dayPlan: v.dayPlan,
      gpsOk: v.gpsOk,
      gpsMetres: v.gpsMetres,
      gpsReason: v.gpsReason,
      images: v.images || [],
    };
  }

  async function onCheckin(v) {
    const id = v.id || v;
    setBusy(id);
    try {
      const gps = await getGps();
      const res = await checkinVisit({
        name: id,
        checkin_latitude: gps.latitude,
        checkin_longitude: gps.longitude,
      });
      if (!res.ok) toast(res.error || "Check-in failed.");
      else {
        toast("Checked in.");
        setMode(null);
      }
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  }

  async function onCheckout(v) {
    const id = v.id || v;
    setBusy(id);
    try {
      const gps = await getGps();
      const res = await checkoutVisit({
        name: id,
        checkout_latitude: gps.latitude,
        checkout_longitude: gps.longitude,
      });
      if (!res.ok) toast(res.error || "Check-out failed.");
      else {
        toast("Checked out.");
        setMode(null);
      }
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  }

  async function saveEdit() {
    if (!form?.id) return;
    if (!isLocked(form.status) && (!form.doctor || !form.product)) {
      return toast("Doctor and product are required.");
    }
    setBusy(form.id);
    const res = await updateVisit({
      name: form.id,
      doctor: form.doctor,
      hospital: form.hospital,
      product: form.product,
      notes: form.notes,
      showed_brochure: form.showedBrochure ? 1 : 0,
      did_demonstration: form.didDemonstration ? 1 : 0,
      outcome: form.outcome,
    });
    setBusy("");
    if (!res.ok) return toast(res.error || "Could not save that visit.");
    toast("Visit updated.");
    setMode(null);
  }

  const locked = form ? isLocked(form.status) : false;
  const readOnly = mode === "view";
  const selectedDoctor = doctors.find((d) => d.id === form?.doctor);

  return (
    <DashboardLayout
      title="Visits"
      subtitle="Created from the day plan. View or edit a visit here. After check-in, doctor, hospital and product are locked."
    >
      <div className="mb-4 max-w-xs">
        <Select
          label="Filter by status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            "Pending",
            "In Progress",
            "Done",
            "Missed",
            "Rescheduled",
          ]}
        />
      </div>
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Rep</th>
                <th className="px-4 py-2.5 font-semibold">Doctor</th>
                <th className="px-4 py-2.5 font-semibold">Product</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Check-in</th>
                <th className="px-4 py-2.5 font-semibold">Check-out</th>
                <th className="px-4 py-2.5 font-semibold">Hospital GPS</th>
                <th className="px-4 py-2.5 font-semibold">Photos</th>
                <th className="px-4 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{v.visitedAt || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.salesperson}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{v.doctorName || nameOf(v.doctorId)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{v.product}</td>
                  <td className="px-4 py-2.5"><StatusPill status={v.status}>{v.status || "Pending"}</StatusPill></td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[12px]">{v.checkinTime || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[12px]">{v.checkoutTime || "—"}</td>
                  <td className="px-4 py-2.5">
                    {v.gpsOk === true && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-bg text-success-fg">
                        {v.gpsMetres} m · at hospital
                      </span>
                    )}
                    {v.gpsOk === false && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-bg text-danger-fg" title={v.gpsReason}>
                        {v.gpsReason || "Off site"}
                      </span>
                    )}
                    {v.gpsOk == null && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        No hospital pin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {(v.imageCount || v.images?.length) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                        <Camera size={12} /> {v.imageCount || v.images.length}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => openView(v)} title="View">
                        <Eye size={15} />
                      </button>
                      <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => openEdit(v)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      {v.status === "Pending" && (
                        <Button size="sm" disabled={busy === v.id} onClick={() => onCheckin(v)}>
                          {busy === v.id ? "…" : "Check-In"}
                        </Button>
                      )}
                      {v.status === "In Progress" && (
                        <Button size="sm" disabled={busy === v.id} onClick={() => onCheckout(v)}>
                          {busy === v.id ? "…" : "Check-Out"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-[13px]">No visits yet. Save a day plan to create them.</div>
        )}
      </Card>

      <Modal
        open={Boolean(mode) && Boolean(form)}
        onClose={() => setMode(null)}
        title={readOnly ? "Visit" : "Edit visit"}
        subtitle={
          locked
            ? "Doctor, hospital and product are locked after check-in. Notes and discussion can still be updated."
            : "Pending and missed visits can change doctor, hospital and product. That also updates the day plan row."
        }
        maxW="max-w-2xl"
        footer={
          readOnly ? (
            <>
              {form?.status === "Pending" && (
                <Button disabled={busy === form.id} onClick={() => onCheckin(form)}>{busy === form.id ? "…" : "Check-In"}</Button>
              )}
              {form?.status === "In Progress" && (
                <Button disabled={busy === form.id} onClick={() => onCheckout(form)}>{busy === form.id ? "…" : "Check-Out"}</Button>
              )}
              <Button variant="ghost" onClick={() => setMode(null)}>Close</Button>
              <Button onClick={() => setMode("edit")}>Edit</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={busy === form?.id}>{busy === form?.id ? "Saving…" : "Save visit"}</Button>
            </>
          )
        }
      >
        {form && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusPill status={form.status}>{form.status}</StatusPill>
              {form.id && <span className="text-[12px] text-slate-400">{form.id}</span>}
              {form.dayPlan && <span className="text-[12px] text-slate-400">Plan {form.dayPlan}</span>}
            </div>
            <Input label="Salesperson" value={form.salesperson || ""} disabled />
            <SearchSelect
              label="Doctor"
              value={form.doctor}
              disabled={readOnly || locked}
              options={doctors.map((d) => ({
                value: d.id,
                label: d.name,
                sub: `${d.personType || "Unclassified"} · ${(d.hospitals || []).length} hospitals`,
              }))}
              onChange={(id) => {
                const doc = doctors.find((d) => d.id === id);
                const options = doctorHospitals(doc, hospitals);
                setForm({
                  ...form,
                  doctor: id,
                  hospital: options.length === 1 ? options[0].value : "",
                });
              }}
            />
            <SearchSelect
              label="Hospital"
              value={form.hospital}
              disabled={readOnly || locked}
              options={doctorHospitals(selectedDoctor, hospitals)}
              placeholder={form.doctor ? "Hospitals on this doctor" : "Pick a doctor first"}
              empty="This doctor has no rows in the Hospitals table"
              onChange={(id) => setForm({ ...form, hospital: id })}
            />
            <SearchSelect
              label="Product"
              value={form.product}
              disabled={readOnly || locked}
              options={(products || []).map((p) => ({ value: p.id, label: p.name, sub: p.category }))}
              onChange={(id) => setForm({ ...form, product: id })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Check-in" value={form.checkinTime || "—"} disabled />
              <Input label="Check-out" value={form.checkoutTime || "—"} disabled />
            </div>
            <Checkbox
              label="Brochure shown"
              checked={form.showedBrochure}
              onChange={readOnly ? undefined : (v) => setForm({ ...form, showedBrochure: v })}
            />
            <Checkbox
              label="Demonstration given"
              checked={form.didDemonstration}
              onChange={readOnly ? undefined : (v) => setForm({ ...form, didDemonstration: v })}
            />
            <Select
              label="Outcome"
              value={form.outcome || ""}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              options={[
                { value: "", label: "—" },
                "Refused",
                "Will Buy",
                "Sample Requested",
              ]}
            />
            <Textarea
              label="Notes"
              rows={3}
              value={form.notes}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {(form.images || []).length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1.5">Photos from the field</div>
                <div className="grid grid-cols-2 gap-2">
                  {form.images.map((img) => (
                    <VisitPhoto key={img.id || img.src} src={img.src} caption={img.caption} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
