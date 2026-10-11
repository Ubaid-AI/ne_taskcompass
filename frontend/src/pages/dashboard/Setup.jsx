import { useEffect, useState } from "react";
import { Plus, MapPin, Users, SlidersHorizontal, BadgeCheck } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { api } from "../../lib/frappe.js";

const TABS = [
  { id: "cities", label: "Cities", icon: MapPin },
  { id: "team", label: "Sales team", icon: Users },
  { id: "designations", label: "Designations", icon: BadgeCheck },
  { id: "settings", label: "App settings", icon: SlidersHorizontal },
];

function timeInput(val, fallback) {
  const parts = String(val || fallback || "00:00:00").split(":");
  const h = String(parts[0] || "0").padStart(2, "0");
  const m = String(parts[1] || "0").padStart(2, "0");
  return `${h}:${m}`;
}

export default function Setup() {
  const toast = useToast();
  const { territories, users, designations, addTerritory, addSalesPerson, addDesignation } = useData();
  const [tab, setTab] = useState("cities");
  const [cityOpen, setCityOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [designationOpen, setDesignationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cityName, setCityName] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [person, setPerson] = useState({ name: "", territory: "" });
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.call("ne_taskcompass.api.setup.get_settings").then(setSettings).catch(() => {});
  }, []);

  async function saveCity() {
    if (!cityName.trim()) return toast("Enter a city name.");
    setBusy(true);
    const res = await addTerritory(cityName.trim());
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast(`${cityName} added as a territory.`);
    setCityName("");
    setCityOpen(false);
  }

  async function saveDesignation() {
    if (!designationName.trim()) return toast("Enter a designation.");
    setBusy(true);
    const res = await addDesignation(designationName.trim());
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast(`${designationName.trim()} added.`);
    setDesignationName("");
    setDesignationOpen(false);
  }

  async function savePerson() {
    if (!person.name.trim()) return toast("Enter the salesperson name.");
    if (!person.territory) return toast("Pick their city.");
    setBusy(true);
    const res = await addSalesPerson(person);
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast(`${person.name} added.`);
    setPerson({ name: "", territory: "" });
    setTeamOpen(false);
  }

  async function saveSettings() {
    setBusy(true);
    try {
      await api.call("ne_taskcompass.api.setup.save_settings", settings);
      toast("Settings saved.");
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  return (
    <DashboardLayout
      title="Setup"
      subtitle="Cities, sales team and visit rules — the same masters as the NE TaskCompass workspace"
    >
      <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold ${
              tab === t.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "cities" && (
        <>
          <div className="flex justify-end mb-3">
            <Button icon={Plus} onClick={() => setCityOpen(true)}>Add city</Button>
          </div>
          <Card padding="p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-semibold">City / territory</th>
                  <th className="px-4 py-2.5 font-semibold">Parent</th>
                </tr>
              </thead>
              <tbody>
                {(territories || []).map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{t.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.parent || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!territories || territories.length === 0) && (
              <div className="text-center text-slate-400 py-10 text-[13px]">No cities yet. Add Lahore, Karachi, Islamabad…</div>
            )}
          </Card>
        </>
      )}

      {tab === "team" && (
        <>
          <div className="flex justify-end mb-3">
            <Button icon={Plus} onClick={() => setTeamOpen(true)}>Add salesperson</Button>
          </div>
          <Card padding="p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">City</th>
                  <th className="px-4 py-2.5 font-semibold">Employee</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{u.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.region || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{u.employee || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "designations" && (
        <>
          <div className="flex justify-end mb-3">
            <Button icon={Plus} onClick={() => setDesignationOpen(true)}>Add designation</Button>
          </div>
          <Card padding="p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-semibold">Designation</th>
                </tr>
              </thead>
              <tbody>
                {(designations || []).map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{d.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!designations || designations.length === 0) && (
              <div className="text-center text-slate-400 py-10 text-[13px]">No designations yet.</div>
            )}
          </Card>
        </>
      )}

      {tab === "settings" && settings && (
        <Card className="max-w-lg flex flex-col gap-3">
          <Input label="Score floor" type="number" value={settings.score_floor}
            onChange={(e) => setSettings({ ...settings, score_floor: e.target.value })} />
          <Input label="Weeks per month" type="number" value={settings.weeks_per_month}
            onChange={(e) => setSettings({ ...settings, weeks_per_month: e.target.value })} />
          <Input label="Hospital check-in radius (metres)" type="number" value={settings.gps_check_meters}
            onChange={(e) => setSettings({ ...settings, gps_check_meters: e.target.value })} />
          <Input label="GPS retention (days)" type="number" value={settings.gps_retention_days}
            onChange={(e) => setSettings({ ...settings, gps_retention_days: e.target.value })} />
          <div className="text-[13px] font-bold text-slate-700 pt-2">Sales person tracker</div>
          <div className="text-[12px] text-slate-500 -mt-1">
            The field app posts GPS only between start and end, at this interval.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tracker start time" type="time" value={timeInput(settings.tracker_start_time, "08:00:00")}
              onChange={(e) => setSettings({ ...settings, tracker_start_time: e.target.value ? `${e.target.value}:00` : "" })} />
            <Input label="Tracker end time" type="time" value={timeInput(settings.tracker_end_time, "18:00:00")}
              onChange={(e) => setSettings({ ...settings, tracker_end_time: e.target.value ? `${e.target.value}:00` : "" })} />
          </div>
          <Input label="Location interval" type="time" value={timeInput(settings.location_interval, "00:15:00")}
            onChange={(e) => setSettings({ ...settings, location_interval: e.target.value ? `${e.target.value}:00` : "" })} />
          <div className="text-[12px] text-slate-500 -mt-1">
            Hours and minutes between location posts (example 00:15 = every 15 minutes).
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={Boolean(settings.warn_additional_sample)}
              onChange={(e) => setSettings({ ...settings, warn_additional_sample: e.target.checked ? 1 : 0 })} />
            Warn when a doctor already has a sample of another product
          </label>
          <div>
            <Button onClick={saveSettings} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
          </div>
        </Card>
      )}

      <Modal open={cityOpen} onClose={() => setCityOpen(false)} title="Add city"
        subtitle="Creates an ERPNext Territory. Hospitals and doctors use this as city."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCityOpen(false)}>Cancel</Button>
            <Button onClick={saveCity} disabled={busy}>{busy ? "Saving…" : "Save city"}</Button>
          </>
        }
      >
        <Input label="City name" placeholder="e.g. Peshawar" value={cityName}
          onChange={(e) => setCityName(e.target.value)} />
      </Modal>

      <Modal open={designationOpen} onClose={() => setDesignationOpen(false)} title="Add designation"
        subtitle="Shows up on the sample order form. Other is already included."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDesignationOpen(false)}>Cancel</Button>
            <Button onClick={saveDesignation} disabled={busy}>{busy ? "Saving…" : "Save designation"}</Button>
          </>
        }
      >
        <Input label="Designation" placeholder="e.g. Senior Registrar" value={designationName}
          onChange={(e) => setDesignationName(e.target.value)} />
      </Modal>

      <Modal open={teamOpen} onClose={() => setTeamOpen(false)} title="Add salesperson"
        subtitle="Creates a Sales Person linked to a city territory"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTeamOpen(false)}>Cancel</Button>
            <Button onClick={savePerson} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Full name" value={person.name}
            onChange={(e) => setPerson({ ...person, name: e.target.value })} />
          <Select
            label="City"
            options={[{ value: "", label: "Select city" }, ...(territories || []).map((t) => ({ value: t.id, label: t.name }))]}
            value={person.territory}
            onChange={(e) => setPerson({ ...person, territory: e.target.value })}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
