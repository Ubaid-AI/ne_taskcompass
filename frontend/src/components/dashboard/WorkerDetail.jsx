import { useState } from "react";
import {
  MapPin, LogIn, LogOut, Route as RouteIcon, Wifi, WifiOff,
  Target, Activity, Gauge, CheckCircle2, Clock,
} from "lucide-react";
import Modal from "../ui/Modal.jsx";
import RouteMap from "../ui/RouteMap.jsx";
import Avatar from "../ui/Avatar.jsx";
import StatusPill from "../ui/StatusPill.jsx";
import { useData } from "../../context/DataContext.jsx";
import { bandFor } from "../../lib/performance.js";
import PerformancePanel from "../shared/PerformancePanel.jsx";

const TABS = [
  { key: "performance", label: "Performance", icon: Gauge },
  { key: "route", label: "Today's Route", icon: RouteIcon },
  { key: "targets", label: "Targets", icon: Target },
];

function pct(a, t) { return t === 0 ? 0 : Math.min(100, Math.round((a / t) * 100)); }

function Stat({ label, value, tone = "text-slate-800", sub }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-[10.5px] font-bold text-slate-400 uppercase">{label}</div>
      <div className={`text-[15px] font-extrabold mt-0.5 ${tone}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default function WorkerDetail({ rep, worker, onClose }) {
  const [tab, setTab] = useState("performance");
  const { targetsFor, performanceFor, achievementFor, visits, doctors, hospitals, dayPlans } = useData();
  const person = rep || worker;
  if (!person) return null;

  const name = person.name;
  const personId = person.id || name;
  const todayIso = new Date().toISOString().slice(0, 10);
  const plan = (dayPlans || []).find((p) => p.salesperson === personId || p.salesperson === name);
  const todayVisits = (visits || []).filter((v) => (v.salesperson === personId || v.salesperson === name) && String(v.visitedAt || "").startsWith(todayIso));
  const route = (plan?.items || todayVisits).map((row, i) => {
    const visit = row.doctorId
      ? row
      : todayVisits.find((v) => v.doctorId === row.doctor) || {};
    const doctor = doctors.find((d) => d.id === (row.doctor || row.doctorId)) || {};
    const hospital = hospitals.find((h) => h.id === doctor.hospital || h.name === doctor.hospital) || {};
    return {
      n: i + 1,
      time: row.visit_time || (visit.visitedAt || "").slice(11, 16) || "—",
      doctor: doctor.name || row.doctor || visit.doctorId,
      hospital: hospital.name || doctor.hospital || "",
      status: row.status || (visit.id ? "Done" : "Pending"),
      lat: visit.lat ?? hospital.lat,
      lng: visit.lng ?? hospital.lng,
    };
  });
  const day = {
    route,
    history: todayVisits.map((v) => `${(v.visitedAt || "").slice(11, 16)} visit · ${doctors.find((d) => d.id === v.doctorId)?.name || v.doctorId}`),
    checkIn: route[0]?.time || "—",
    checkOut: route[route.length - 1]?.time || "—",
    distanceKm: 0,
    gps: route.some((s) => s.lat != null) ? "Active" : "Disabled",
    status: person.status || "Active",
  };
  const visitStats = { done: route.filter((s) => s.status === "Done").length, planned: route.length || 6 };
  const targets = targetsFor(name) || targetsFor(personId) || [];
  const score = performanceFor(name) || performanceFor(personId) || 0;
  const achievement = achievementFor(name) || achievementFor(personId) || 0;
  const band = bandFor(score);
  const gpsOff = day.gps === "Disabled";
  const topProducts = [...targets].sort((a, b) => pct(b.achieved, b.target) - pct(a.achieved, a.target));

  return (
    <Modal
      open={!!person}
      onClose={onClose}
      maxW="max-w-3xl"
      title={name}
      subtitle={`${person.region || "Territory"} · complete field performance`}
    >
      {/* Header summary */}
      <div className="flex items-center gap-4 mb-4">
        <Avatar initials={person.initials} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${band.bg} ${band.tone}`}>{band.label}</span>
            <StatusPill status={day.status || person.status}>{day.status || person.status}</StatusPill>
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            {visitStats.done}/{visitStats.planned} visits today · {day.distanceKm} km travelled
          </div>
        </div>
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8eef0" strokeWidth="3.6" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={band.ring} strokeWidth="3.6"
              strokeDasharray={`${score} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className={`text-[19px] font-extrabold leading-none ${band.tone}`}>{score}</div>
              <div className="text-[9px] text-slate-400">/ 100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition ${
              tab === key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- PERFORMANCE ---- */}
      {tab === "performance" && (
        <PerformancePanel userName={personId} compact />
      )}

      {/* ---------------------------------------------------------- ROUTE ---- */}
      {tab === "route" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1"><LogIn size={11} /> Check-in</div>
              <div className="text-[14px] font-bold text-slate-800 mt-0.5">{day.checkIn}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1"><LogOut size={11} /> Check-out</div>
              <div className="text-[14px] font-bold text-slate-800 mt-0.5">{day.checkOut}</div>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${gpsOff ? "bg-danger-bg" : "bg-success-bg"}`}>
              <div className={`text-[10.5px] font-bold uppercase flex items-center gap-1 ${gpsOff ? "text-danger-fg" : "text-success-fg"}`}>
                {gpsOff ? <WifiOff size={11} /> : <Wifi size={11} />} GPS
              </div>
              <div className={`text-[14px] font-bold mt-0.5 ${gpsOff ? "text-danger-fg" : "text-success-fg"}`}>{day.gps}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-bold text-slate-700">Full day route</div>
              <div className="text-[11.5px] text-slate-400">{day.distanceKm} km travelled</div>
            </div>
            <RouteMap stops={day.route} height={170} />
          </div>

          <div className="grid sm:grid-cols-2 gap-x-5">
            <div>
              <div className="text-[12px] font-bold text-slate-500 mb-2">Stops</div>
              <div className="flex flex-col">
                {day.route.map((s, i) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold text-white bg-brand-600">{s.n}</span>
                      {i < day.route.length - 1 && <span className="w-0.5 flex-1 min-h-[16px] bg-slate-200" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-800">{s.time} · {s.doctor}</div>
                      <div className="text-[11.5px] text-slate-500 truncate flex items-center gap-1"><MapPin size={10} /> {s.hospital}</div>
                      <div className={`text-[10.5px] font-bold ${s.status === "Done" ? "text-success-fg" : s.status === "In Progress" ? "text-info-fg" : "text-slate-400"}`}>{s.status}</div>
                    </div>
                  </div>
                ))}
                {day.route.length === 0 && <div className="text-[12px] text-slate-400">No route recorded today.</div>}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Activity size={13} /> Activity history</div>
              <div className="flex flex-col gap-2">
                {day.history.map((h, i) => (
                  <div key={i} className="text-[12px] text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- TARGETS ---- */}
      {tab === "targets" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[12.5px] font-bold text-slate-700">Weekly product targets</div>
            <div className="text-[13px] font-extrabold text-brand-700">{achievement}% overall</div>
          </div>
          <div className="max-h-[46vh] overflow-y-auto pr-1 flex flex-col gap-2">
            {topProducts.map((t) => {
              const p = pct(t.achieved, t.target);
              const tone = p >= 100 ? "bg-success-solid" : p >= 50 ? "bg-brand-600" : "bg-warning-solid";
              return (
                <div key={t.productId} className="rounded-xl border border-slate-200 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12.5px] font-semibold text-slate-800 truncate">{t.product}</span>
                    <span className="text-[11.5px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                      {p >= 100 && <CheckCircle2 size={12} className="text-success-fg" />} {p}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${p}%` }} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    <b className="text-slate-600">{t.achieved} Pcs</b> sold out of {t.target} Pcs
                  </div>
                </div>
              );
            })}
            {targets.length === 0 && (
              <div className="text-[12px] text-slate-400 text-center py-6">No weekly targets assigned yet.</div>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <Clock size={11} /> Sales figures are entered weekly by Management on the Targets page.
          </div>
        </div>
      )}
    </Modal>
  );
}
