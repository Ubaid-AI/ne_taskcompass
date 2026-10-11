import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMPTY = { doctor: "", hospital: "", day_of_week: "Mon", start_time: "09:00", end_time: "13:00" };

function hhmm(value) {
  if (!value) return "";
  const parts = String(value).split(":");
  if (parts.length < 2) return String(value);
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

function doctorHospitals(doctor, hospitals) {
  const ids = doctor?.hospitals || [];
  return ids.map((id) => {
    const h = (hospitals || []).find((row) => row.id === id || row.name === id);
    return { value: id, label: h?.name || id, sub: h?.city };
  });
}

export default function DoctorSchedule() {
  const toast = useToast();
  const { schedules, doctors, hospitals, upsertSchedule, deleteSchedule } = useData();
  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterHospital, setFilterHospital] = useState("");

  const selectedDoctor = doctors.find((d) => d.id === form.doctor);
  const hospitalOptions = doctorHospitals(selectedDoctor, hospitals);

  const filtered = useMemo(() => {
    return (schedules || []).filter((s) => {
      if (filterDoctor && s.doctor !== filterDoctor) return false;
      if (filterHospital && s.hospital !== filterHospital) return false;
      return true;
    });
  }, [schedules, filterDoctor, filterHospital]);

  const doctorFilterOptions = [
    { value: "", label: "All doctors" },
    ...doctors.map((d) => ({ value: d.id, label: d.name, sub: d.hospital })),
  ];

  const hospitalFilterOptions = useMemo(() => {
    if (filterDoctor) {
      const doc = doctors.find((d) => d.id === filterDoctor);
      return [{ value: "", label: "All hospitals" }, ...doctorHospitals(doc, hospitals)];
    }
    const ids = [...new Set((schedules || []).map((s) => s.hospital).filter(Boolean))];
    return [
      { value: "", label: "All hospitals" },
      ...ids.map((id) => {
        const h = (hospitals || []).find((row) => row.id === id || row.name === id);
        return { value: id, label: h?.name || id };
      }),
    ];
  }, [schedules, hospitals, filterDoctor, doctors]);

  async function save() {
    if (!form.doctor) return toast("Pick a doctor.");
    if (!hospitalOptions.length) return toast("This doctor has no hospitals in the Hospitals table.");
    if (!form.hospital) return toast("Pick a hospital for this doctor.");
    if (!hospitalOptions.some((h) => h.value === form.hospital)) {
      return toast("Hospital must be one from this doctor's Hospitals table.");
    }
    if (!form.start_time || !form.end_time) return toast("Start and end time are required (HH:MM).");
    const start = hhmm(form.start_time);
    const end = hhmm(form.end_time);
    if (start >= end) return toast("End time must be after start time.");
    const duplicate = (schedules || []).some(
      (s) =>
        s.doctor === form.doctor &&
        s.hospital === form.hospital &&
        s.day_of_week === form.day_of_week &&
        hhmm(s.start_time) === start &&
        hhmm(s.end_time) === end
    );
    if (duplicate) {
      return toast("This doctor already has a schedule at this hospital with the same day and timings. Use a different start or end time.");
    }
    setBusy(true);
    const res = await upsertSchedule({ ...form, start_time: start, end_time: end });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not save that timing.");
    toast("OPD timing saved.");
    setOpen(false);
    setForm(EMPTY);
  }

  async function remove(name) {
    const res = await deleteSchedule(name);
    toast(res.ok ? "Timing removed." : res.error);
  }

  return (
    <DashboardLayout
      title="Doctor Schedule"
      subtitle="Weekly OPD hours. Hospital is taken from the doctor's Hospitals table. Same doctor, hospital, day, and timings cannot be saved twice."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <SearchSelect
          label="Filter by doctor"
          value={filterDoctor}
          options={doctorFilterOptions}
          placeholder="All doctors"
          onChange={(id) => { setFilterDoctor(id); setFilterHospital(""); }}
        />
        <SearchSelect
          label="Filter by hospital"
          value={filterHospital}
          options={hospitalFilterOptions}
          placeholder="All hospitals"
          onChange={setFilterHospital}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-bold text-slate-700">Doctor weekly timings</div>
        <Button size="sm" icon={Plus} onClick={() => { setForm(EMPTY); setOpen(true); }}>Add OPD timing</Button>
      </div>
      <Card padding="p-0">
        <div className="grid grid-cols-[1.6fr_1.4fr_0.6fr_1fr_auto] bg-slate-50 border-b border-slate-100 px-5 py-2.5">
          {["Doctor", "Hospital", "Day", "Hours", ""].map((h) => (
            <div key={h || "x"} className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-[13px] text-slate-400">
              {(schedules || []).length === 0 ? "No doctor schedules yet. Add when they hold OPD." : "No timings match these filters."}
            </div>
          ) : filtered.map((s) => (
            <div key={s.name} className="grid grid-cols-[1.6fr_1.4fr_0.6fr_1fr_auto] items-center px-5 py-3.5">
              <div className="text-[13.5px] font-semibold text-slate-700">{doctorName(s.doctor)}</div>
              <div className="text-[13.5px] text-slate-600">{s.hospital}</div>
              <div className="text-[13px] text-slate-500">{s.day_of_week}</div>
              <div className="text-[13px] font-mono text-slate-500">{hhmm(s.start_time)}–{hhmm(s.end_time)}</div>
              <button type="button" onClick={() => remove(s.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg" title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add OPD timing"
        subtitle="Hospital comes from the doctor's Hospitals table. Extra slots at the same hospital are allowed if the times differ."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save timing"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <SearchSelect
            label="Doctor"
            value={form.doctor}
            options={doctors.map((d) => ({
              value: d.id,
              label: d.name,
              sub: (d.hospitals || []).join(" · ") || "No hospitals in table",
            }))}
            onChange={(id) => {
              const doc = doctors.find((d) => d.id === id);
              const options = doctorHospitals(doc, hospitals);
              setForm({ ...form, doctor: id, hospital: options.length === 1 ? options[0].value : "" });
            }}
          />
          <SearchSelect
            label="Hospital"
            value={form.hospital}
            options={hospitalOptions}
            placeholder={form.doctor ? "Hospitals on this doctor" : "Pick a doctor first"}
            empty="This doctor has no rows in the Hospitals table"
            onChange={(id) => setForm({ ...form, hospital: id })}
          />
          <Select label="Day" options={DAYS} value={form.day_of_week}
            onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start (HH:MM)" type="time" step="60" value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="End (HH:MM)" type="time" step="60" value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
