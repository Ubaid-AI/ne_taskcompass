import { useMemo, useState } from "react";
import {
  Search, Stethoscope, Building2, MapPin, ShieldCheck, UserCheck, Plus,
  Database, ChevronLeft, ChevronRight, Phone, Pencil, Trash2, Eye, AlertTriangle,
} from "lucide-react";
import DoctorProfile from "../../components/shared/DoctorProfile.jsx";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { PERSON_TYPES } from "../../data/neData.js";

const PAGE_SIZE = 25;

const typeTone = {
  HOD: "bg-brand-600 text-white",
  Professor: "bg-info-solid text-white",
  "OT Incharge": "bg-slate-500 text-white",
  Unclassified: "bg-slate-200 text-slate-600",
};

const sourceTone = {
  Marham: "bg-emerald-50 text-emerald-700",
  Oladoc: "bg-sky-50 text-sky-700",
  Manual: "bg-slate-100 text-slate-600",
};

export default function Directory() {
  const toast = useToast();
  const { dashboardUser } = useSession();
  const canDelete = Boolean(dashboardUser?.isSuperAdmin || dashboardUser?.isAdmin || dashboardUser?.kind === "admin");
  const {
    doctors, hospitals, users, territories, sourceCounts,
    addDoctor, addHospital, updateHospital, updateDoctor, deleteDoctor, source,
  } = useData();

  // View, edit and delete are three separate pieces of state on purpose. Sharing
  // one would mean closing the profile to edit, then losing your place.
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  function startEdit(d) {
    setViewing(null);
    setEditing(d);
    const hospitals = (d.hospitals || []).length ? [...d.hospitals] : (d.hospital ? [d.hospital] : []);
    setEditForm({
      name: d.name || "", personType: d.personType || "Unclassified",
      personTypeOther: d.personTypeOther || "",
      specialty: d.specialty || "", city: d.city || "", phone: d.phone || "",
      whatsapp: d.whatsapp || "", email: d.email || "", hospital: hospitals[0] || "",
      hospitals,
      designation: d.designation || "", imageUrl: d.imageUrl || "", notes: d.notes || "",
    });
  }

  async function saveEdit() {
    const hospitals = (editForm.hospitals || []).filter(Boolean);
    if (!hospitals.length) return toast("Attach at least one hospital.");
    if (editForm.personType === "Other" && !(editForm.personTypeOther || "").trim()) {
      return toast("Describe the person type.");
    }
    setBusy(true);
    const res = await updateDoctor(editing.id, { ...editForm, hospitals, hospital: hospitals[0] });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not save that change.");
    toast(`${editForm.name} updated.`);
    setEditing(null);
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await deleteDoctor(deleting.id);
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not delete that record.");
    toast(`${res.removed} removed from the directory.`);
    setDeleting(null);
    setViewing(null);
  }

  const [tab, setTab] = useState("doctors");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [ptype, setPtype] = useState("");
  const [rep, setRep] = useState("");
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const repNames = users.map((u) => u.name);
  const emptyDoctor = { name: "", personType: "Professor", personTypeOther: "", specialty: "Neurosurgery", hospital: "", hospitals: [], city: "", rep: users[0]?.id || "" };
  const [docForm, setDocForm] = useState(emptyDoctor);
  const [hospForm, setHospForm] = useState({ name: "", city: "", address: "", lat: "", lng: "" });
  const [editingHosp, setEditingHosp] = useState(null);

  const cityOptions = useMemo(
    () => (territories || []).map((t) => ({ value: t.id || t.name, label: t.name })),
    [territories]
  );

  function hospitalsInCity(city) {
    if (!city) return hospitals;
    return hospitals.filter((h) => h.city === city || h.territory === city);
  }

  function hospitalLabel(id) {
    const h = hospitals.find((row) => row.id === id || row.name === id);
    return h?.name || id;
  }

  function addHospitalId(form, setForm, id) {
    if (!id) return;
    const current = (form.hospitals || []).filter(Boolean);
    if (current.includes(id)) return;
    const next = [...current, id];
    setForm({ ...form, hospitals: next, hospital: next[0] });
  }

  function removeHospitalId(form, setForm, id) {
    const next = (form.hospitals || []).filter((h) => h !== id);
    setForm({ ...form, hospitals: next, hospital: next[0] || "" });
  }

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) =>
      (!q || d.name.toLowerCase().includes(q) || (d.hospital || "").toLowerCase().includes(q) ||
        (d.specialty || "").toLowerCase().includes(q)) &&
      (!city || d.city === city) &&
      (!ptype || d.personType === ptype) &&
      (!rep || d.rep === rep)
    );
  }, [doctors, query, city, ptype, rep]);

  const filteredHospitals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hospitals.filter((h) =>
      (!q || h.name.toLowerCase().includes(q)) && (!city || h.city === city || h.territory === city)
    );
  }, [hospitals, query, city]);

  const pageCount = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const shown = filteredDoctors.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function resetPage(fn) {
    return (v) => { fn(v); setPage(0); };
  }

  async function saveDoctor(e) {
    e?.preventDefault();
    if (!docForm.name.trim()) return toast("Enter the doctor's name");
    if (docForm.personType === "Other" && !(docForm.personTypeOther || "").trim()) {
      return toast("Describe the person type.");
    }
    if (!docForm.city) return toast("Pick a city first");
    const hospitals = (docForm.hospitals || []).filter(Boolean);
    if (!hospitals.length && !docForm.hospital) return toast("Attach at least one hospital from the list");
    try {
      const res = await addDoctor({ ...docForm, hospitals: hospitals.length ? hospitals : [docForm.hospital], hospital: hospitals[0] || docForm.hospital });
      if (!res.ok) return toast(res.error || "Could not save that doctor.");
      setDocForm(emptyDoctor); setShowModal(false);
      toast("Doctor added");
    } catch (err) {
      toast(err.message || "Could not save that doctor.");
    }
  }

  async function saveHospital(e) {
    e?.preventDefault();
    if (!hospForm.name.trim()) return toast("Enter the hospital name");
    if (!hospForm.city) return toast("Pick a city from the territory list");
    const res = await addHospital({
      ...hospForm,
      territory: hospForm.city,
      lat: hospForm.lat === "" ? null : Number(hospForm.lat),
      lng: hospForm.lng === "" ? null : Number(hospForm.lng),
    });
    if (!res.ok) return toast(res.error);
    setHospForm({ name: "", city: "", address: "", lat: "", lng: "" }); setShowModal(false);
    toast("Hospital added");
  }

  async function saveHospEdit() {
    if (!editingHosp?.city) return toast("Pick a city from the territory list");
    setBusy(true);
    const res = await updateHospital(editingHosp.id, {
      city: editingHosp.city,
      address: editingHosp.address,
      lat: editingHosp.lat === "" ? null : Number(editingHosp.lat),
      lng: editingHosp.lng === "" ? null : Number(editingHosp.lng),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast(`${editingHosp.name} updated.`);
    setEditingHosp(null);
  }

  const totalFromDirectories = (sourceCounts.Marham || 0) + (sourceCounts.Oladoc || 0);

  return (
    <DashboardLayout
      title="Doctors and Hospitals"
      subtitle={`${doctors.length} doctors and ${hospitals.length} hospitals in the database`}
    >
      {/* Where the data came from */}
      <Card className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
          <Database size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-slate-800">Directory sources</div>
          <div className="text-[12px] text-slate-500">
            {totalFromDirectories} records imported from public medical directories, kept fresh by the field team.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([src, n]) => (
            <span key={src} className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${sourceTone[src] || sourceTone.Manual}`}>
              {src}: {n}
            </span>
          ))}
          <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${source === "frappe" ? "bg-success-bg text-success-fg" : "bg-slate-100 text-slate-500"}`}>
            {source === "frappe" ? "Live database" : source === "connecting" ? "Connecting…" : "Unavailable"}
          </span>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-4">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          <button
            onClick={() => { setTab("doctors"); setPage(0); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${
              tab === "doctors" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Stethoscope size={15} /> Doctors <span className="opacity-70">({doctors.length})</span>
          </button>
          <button
            onClick={() => { setTab("hospitals"); setPage(0); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${
              tab === "hospitals" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 size={15} /> Hospitals <span className="opacity-70">({hospitals.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search by doctor, hospital or specialty"
            className="w-full outline-none text-[13.5px] text-slate-700 bg-transparent"
          />
        </div>

        <select value={city} onChange={(e) => resetPage(setCity)(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 outline-none">
          <option value="">All cities</option>
          {cityOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {tab === "doctors" && (
          <>
            <select value={ptype} onChange={(e) => resetPage(setPtype)(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 outline-none">
              <option value="">All types</option>
              {PERSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={rep} onChange={(e) => resetPage(setRep)(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 outline-none">
              <option value="">All reps</option>
              {repNames.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </>
        )}

        <Button icon={Plus} onClick={() => setShowModal(true)} className="shrink-0">
          Add {tab === "doctors" ? "Doctor" : "Hospital"}
        </Button>
      </div>

      {tab === "doctors" ? (
        <>
          <div className="flex items-center gap-2 text-[12px] text-brand-700 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 mb-3">
            <ShieldCheck size={15} className="shrink-0" />
            Each doctor belongs to one salesperson, so two reps can never be assigned the same doctor.
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold">Doctor</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Hospital</th>
                    <th className="px-4 py-3 font-semibold">Assigned to</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setViewing(d)}
                      title="Open full profile with OPD timings"
                      className="border-b border-slate-100 last:border-0 hover:bg-brand-50/50 cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800">{d.name}</div>
                        <div className="text-[11.5px] text-slate-400 flex items-center gap-2">
                          {d.specialty}
                          {d.phone && <span className="flex items-center gap-1"><Phone size={10} /> {d.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase whitespace-nowrap ${typeTone[d.personType] || "bg-slate-200 text-slate-700"}`}>
                          {d.personType === "Other" && d.personTypeOther ? `Other · ${d.personTypeOther}` : d.personType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-slate-700">{hospitalLabel(d.hospital)}</div>
                        {(d.hospitals || []).length > 1 && (
                          <div className="text-[11px] text-brand-700">+{(d.hospitals || []).length - 1} more hospital{(d.hospitals || []).length - 1 === 1 ? "" : "s"}</div>
                        )}
                        <div className="text-[11.5px] text-slate-400 flex items-center gap-1"><MapPin size={11} /> {d.city}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {d.rep ? (
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700">
                            <UserCheck size={14} className="text-brand-600" /> {d.rep}
                          </span>
                        ) : <span className="text-[12px] text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sourceTone[d.source] || sourceTone.Manual}`}>
                          {d.source}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          d.status === "approved" ? "bg-success-bg text-success-fg"
                          : d.status === "pending" ? "bg-warning-bg text-warning-fg"
                          : "bg-danger-bg text-danger-fg"}`}>
                          {d.status}
                        </span>
                      </td>
                      {/* stopPropagation so a button press does not also open the profile */}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewing(d)}
                            title="View profile and OPD timings"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => startEdit(d)}
                            title="Edit this doctor"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          {canDelete && (
                          <button
                            onClick={() => setDeleting(d)}
                            title="Delete this doctor"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No doctors match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-[12.5px] text-slate-500">
              Showing {shown.length === 0 ? 0 : current * PAGE_SIZE + 1} to {current * PAGE_SIZE + shown.length} of {filteredDoctors.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={ChevronLeft}
                disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
              <span className="text-[12.5px] text-slate-600 px-1">Page {current + 1} of {pageCount}</span>
              <Button variant="secondary" size="sm"
                disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>Next</Button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHospitals.map((h) => (
            <Card key={h.id || h.name} className="flex items-start gap-3 cursor-pointer hover:border-brand-200"
              onClick={() => setEditingHosp({
                id: h.id, name: h.name, city: h.city || h.territory || "",
                address: h.address || "", lat: h.lat ?? "", lng: h.lng ?? "",
              })}>
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                <Building2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[13.5px] text-slate-800 leading-tight">{h.name}</div>
                <div className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {h.city || h.territory || "—"}</div>
                <div className="text-[12px] mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-brand-700 font-semibold">
                    {doctors.filter((d) => d.hospital === h.id || d.hospital === h.name).length} doctors
                  </span>
                  {h.lat && h.lng ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-bg text-success-fg">GPS pin set</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg">Add GPS</span>
                  )}
                </div>
                {h.lat && h.lng ? (
                  <div className="text-[11px] font-mono text-slate-400 mt-1">{Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}</div>
                ) : null}
              </div>
            </Card>
          ))}
          {filteredHospitals.length === 0 && (
            <Card className="col-span-full text-center text-slate-400 py-10">No hospitals match these filters.</Card>
          )}
        </div>
      )}

      {/* Add modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={tab === "doctors" ? "Add Doctor" : "Add Hospital"}
        subtitle="Added here by management, so it is approved immediately."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={tab === "doctors" ? saveDoctor : saveHospital}>
              Save {tab === "doctors" ? "Doctor" : "Hospital"}
            </Button>
          </>
        }
      >
        {tab === "doctors" ? (
          <form onSubmit={saveDoctor} className="flex flex-col gap-3">
            <Input label="Doctor Name" placeholder="Prof. Dr. Full Name"
              value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Person Type" options={PERSON_TYPES}
                value={docForm.personType} onChange={(e) => setDocForm({ ...docForm, personType: e.target.value })} />
              {docForm.personType === "Other" && (
                <Input label="Specify person type *" placeholder="e.g. Senior Registrar"
                  value={docForm.personTypeOther || ""}
                  onChange={(e) => setDocForm({ ...docForm, personTypeOther: e.target.value })} />
              )}
              <Select
                label="City"
                options={[{ value: "", label: "Select city" }, ...cityOptions]}
                value={docForm.city}
                onChange={(e) => setDocForm({ ...docForm, city: e.target.value, hospital: "" })}
              />
            </div>
            <Input label="Specialty" placeholder="Neurosurgery"
              value={docForm.specialty} onChange={(e) => setDocForm({ ...docForm, specialty: e.target.value })} />
            <div>
              <SearchSelect
                label="Hospitals (add one or more)"
                value=""
                placeholder={docForm.city ? "Search and add a hospital" : "Pick a city, then add hospitals"}
                empty={docForm.city ? "No hospital in this city. Add the hospital first." : "Pick a city first"}
                options={hospitalsInCity(docForm.city)
                  .filter((h) => !(docForm.hospitals || []).includes(h.id || h.name))
                  .map((h) => ({ value: h.id || h.name, label: h.name, sub: h.city, city: h.city }))}
                onChange={(id, opt) => {
                  if (!id) return;
                  setDocForm((f) => {
                    const current = (f.hospitals || []).filter(Boolean);
                    if (current.includes(id)) return { ...f, city: opt?.city || f.city };
                    const next = [...current, id];
                    return { ...f, hospitals: next, hospital: next[0], city: opt?.city || f.city };
                  });
                }}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(docForm.hospitals || []).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-brand-50 text-brand-800 rounded-full px-2.5 py-1">
                    {hospitalLabel(id)}
                    <button type="button" onClick={() => removeHospitalId(docForm, setDocForm, id)} className="text-brand-600">×</button>
                  </span>
                ))}
                {(docForm.hospitals || []).length === 0 && (
                  <span className="text-[11px] text-slate-400">No hospitals attached yet.</span>
                )}
              </div>
            </div>
            <Select
              label="Assign to Salesperson"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              value={docForm.rep}
              onChange={(e) => setDocForm({ ...docForm, rep: e.target.value })}
            />
          </form>
        ) : (
          <form onSubmit={saveHospital} className="flex flex-col gap-3">
            <Input label="Hospital Name" placeholder="Hospital name"
              value={hospForm.name} onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })} />
            <Select
              label="City"
              options={[{ value: "", label: "Select city" }, ...cityOptions]}
              value={hospForm.city}
              onChange={(e) => setHospForm({ ...hospForm, city: e.target.value })}
            />
            <Input label="Address" placeholder="Street, area"
              value={hospForm.address} onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" type="number" step="0.000001" placeholder="e.g. 24.8607"
                value={hospForm.lat} onChange={(e) => setHospForm({ ...hospForm, lat: e.target.value })} />
              <Input label="Longitude" type="number" step="0.000001" placeholder="e.g. 67.0011"
                value={hospForm.lng} onChange={(e) => setHospForm({ ...hospForm, lng: e.target.value })} />
            </div>
            <div className="text-[11.5px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Pin the hospital so a field visit is only accepted when the rep’s phone is within the check-in radius of this location.
            </div>
          </form>
        )}
      </Modal>

      {/* Full profile, including every OPD session at every hospital */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Doctor profile"
        footer={<Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <DoctorProfile
            doctor={viewing}
            mode="admin"
            onEdit={startEdit}
            onDelete={canDelete ? (d) => { setViewing(null); setDeleting(d); } : undefined}
          />
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name || "doctor"}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </>
        }
      >
        {editForm && (
          <div className="flex flex-col gap-3">
            <div className="text-[11.5px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
              Changes save straight to the shared database and everyone sees them at once. Setting the
              person type by hand marks it as confirmed, so the next directory import will not undo it.
            </div>
            <Input label="Full name" value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Person type" options={PERSON_TYPES} value={editForm.personType}
                onChange={(e) => setEditForm({ ...editForm, personType: e.target.value })} />
              {editForm.personType === "Other" && (
                <Input label="Specify person type *" placeholder="e.g. Senior Registrar"
                  value={editForm.personTypeOther || ""}
                  onChange={(e) => setEditForm({ ...editForm, personTypeOther: e.target.value })} />
              )}
              <Select
                label="City"
                options={[{ value: "", label: "Select city" }, ...cityOptions]}
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value, hospital: "" })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Specialty" value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} />
              <Input label="Designation" placeholder="Consultant Neurosurgeon" value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="WhatsApp" value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
            </div>
            <Input label="Email" type="email" value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Photo URL" placeholder="https://…" value={editForm.imageUrl}
              onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
            <div>
              <SearchSelect
                label="Hospitals (add one or more)"
                value=""
                placeholder={editForm.city ? "Search and add a hospital" : "Pick a city, then add hospitals"}
                empty={editForm.city ? "No hospital in this city." : "Pick a city first"}
                options={hospitalsInCity(editForm.city)
                  .filter((h) => !(editForm.hospitals || []).includes(h.id || h.name))
                  .map((h) => ({ value: h.id || h.name, label: h.name, sub: h.city, city: h.city }))}
                onChange={(id, opt) => {
                  if (!id) return;
                  setEditForm((f) => {
                    const current = (f.hospitals || []).filter(Boolean);
                    if (current.includes(id)) return { ...f, city: opt?.city || f.city };
                    const next = [...current, id];
                    return { ...f, hospitals: next, hospital: next[0], city: opt?.city || f.city };
                  });
                }}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(editForm.hospitals || []).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-brand-50 text-brand-800 rounded-full px-2.5 py-1">
                    {hospitalLabel(id)}{id === (editForm.hospitals || [])[0] ? " · primary" : ""}
                    <button type="button" onClick={() => removeHospitalId(editForm, setEditForm, id)} className="text-brand-600">×</button>
                  </span>
                ))}
              </div>
            </div>
            <Input label="Notes" placeholder="Anything the team should know before visiting"
              value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      {/* Delete, with the consequences spelled out */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this doctor?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-danger-fg shrink-0 mt-0.5" />
            <div className="text-[13px] text-slate-600 leading-relaxed">
              <b className="text-slate-800">{deleting.name}</b> will be removed from the directory for
              everyone, along with their OPD timings and visit history. This cannot be undone.
              <div className="mt-2 text-[12px] text-slate-500">
                If the record is simply wrong rather than unwanted, editing it keeps the visit history
                intact and is usually the better choice.
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editingHosp)}
        onClose={() => setEditingHosp(null)}
        title={`Hospital · ${editingHosp?.name || ""}`}
        subtitle="City comes from Territory. GPS is used to confirm the rep was at this hospital."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingHosp(null)}>Cancel</Button>
            <Button onClick={saveHospEdit} disabled={busy}>{busy ? "Saving…" : "Save hospital"}</Button>
          </>
        }
      >
        {editingHosp && (
          <div className="flex flex-col gap-3">
            <Select
              label="City"
              options={[{ value: "", label: "Select city" }, ...cityOptions]}
              value={editingHosp.city}
              onChange={(e) => setEditingHosp({ ...editingHosp, city: e.target.value })}
            />
            <Input label="Address" value={editingHosp.address}
              onChange={(e) => setEditingHosp({ ...editingHosp, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" type="number" step="0.000001" value={editingHosp.lat}
                onChange={(e) => setEditingHosp({ ...editingHosp, lat: e.target.value })} />
              <Input label="Longitude" type="number" step="0.000001" value={editingHosp.lng}
                onChange={(e) => setEditingHosp({ ...editingHosp, lng: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
