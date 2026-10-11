import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation2, Info, BellRing, ClipboardCheck, X } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSchedule } from "../../context/ScheduleContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { kpis, adminAssignedTasks } from "../../data/mock.js";
import { salesperson } from "../../data/neData.js";

const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

export default function MobileHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mobileUser } = useSession();
  const { visits } = useSchedule();
  const user = mobileUser || salesperson;
  const next = visits.find((v) => v.status === "Pending") || visits[0];
  const done = visits.filter((v) => v.status === "Done").length;
  const pending = visits.filter((v) => v.status === "Pending").length;
  const adminTasks = adminAssignedTasks;
  const [showNotice, setShowNotice] = useState(true);
  const { performanceFor, achievementFor } = useData();
  const performance = performanceFor(user.name);
  const achievementPct = achievementFor(user.name);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="NE TaskCompass" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar initials={user.initials} size={46} />
          <div className="min-w-0">
            <div className="text-[13px] text-slate-500">Good morning,</div>
            <div className="font-bold text-lg text-slate-800 truncate">{user.name.split(" ")[0]} {user.name.split(" ")[1]}</div>
            <div className="text-[11.5px] text-brand-700 font-semibold">{today}</div>
          </div>
        </div>

        {showNotice && adminTasks.length > 0 && (
          <div className="bg-brand-700 text-white rounded-2xl px-4 py-3 flex items-start gap-3 shadow-card">
            <BellRing size={18} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">{adminTasks.length} new {adminTasks.length === 1 ? "task" : "tasks"} assigned by Management</div>
              <div className="text-[11.5px] text-brand-100 mt-0.5">From {adminTasks[0].assignedBy} — check your schedule below.</div>
            </div>
            <button onClick={() => setShowNotice(false)} className="text-brand-200 hover:text-white shrink-0"><X size={15} /></button>
          </div>
        )}

        {adminTasks.length > 0 && (
          <div>
            <div className="text-[12.5px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <ClipboardCheck size={14} className="text-brand-700" /> Assigned by Management
            </div>
            <div className="flex flex-col gap-2">
              {adminTasks.map((t) => (
                <Card key={t.id} padding="p-3" className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white bg-brand-600 rounded-full px-2 py-0.5 uppercase tracking-wide">Admin Task</span>
                      <span className="text-[11.5px] font-bold text-slate-400">{t.time}</span>
                    </div>
                    <div className="font-bold text-[13.5px] text-slate-800 mt-1 truncate">{t.doctor}</div>
                    <div className="text-[11.5px] text-slate-500 truncate">{t.hospital}</div>
                    {t.product && <div className="text-[11px] text-brand-700 font-semibold mt-0.5">Focus: {t.product}</div>}
                    <div className="text-[10.5px] text-slate-400 italic mt-0.5">Assigned by {t.assignedBy}</div>
                  </div>
                  <Button size="sm" icon={Navigation2} onClick={() => navigate(`/mobile/tracking/${t.id}`)}>Start</Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Card padding="p-3">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Planned</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{visits.length}</div>
          </Card>
          <Card padding="p-3">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Done</div>
            <div className="text-2xl font-extrabold text-success-fg mt-0.5">{String(done).padStart(2, "0")}</div>
          </Card>
          <Card padding="p-3">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Pending</div>
            <div className="text-2xl font-extrabold text-warning-fg mt-0.5">{String(pending).padStart(2, "0")}</div>
          </Card>
          <Card padding="p-3">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Follow-ups</div>
            <div className="text-2xl font-extrabold text-danger-fg mt-0.5">{String(kpis.pendingFollowUps).padStart(2, "0")}</div>
          </Card>
        </div>

        {/* Performance + weekly target snapshot */}
        <button onClick={() => navigate("/mobile/targets")} className="text-left">
          <Card className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8eef0" strokeWidth="3.6" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                  stroke={performance >= 75 ? "#22a35f" : performance >= 50 ? "#c9820c" : "#d14747"}
                  strokeWidth="3.6" strokeDasharray={`${performance} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[13px] font-extrabold text-slate-800">{performance}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-slate-800">Performance {performance}/100</div>
              <div className="text-[11.5px] text-slate-500">Weekly targets {achievementPct}% achieved</div>
              <div className="text-[10.5px] text-brand-700 font-semibold mt-0.5">View targets →</div>
            </div>
          </Card>
        </button>

        <div>
          <div className="text-[12.5px] font-bold text-slate-700 mb-2">Quick Actions</div>
          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={() => navigate("/mobile/plan")}>Start Day</Button>
            <Button variant="success" className="flex-1" onClick={() => navigate(`/mobile/visit/${next.id}`)}>New Visit</Button>
          </div>
        </div>

        <div>
          <div className="text-[12.5px] font-bold text-slate-700 mb-2">Next Appointment</div>
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Avatar initials="DR" size={38} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[14px] text-slate-800">{next.doctor}</div>
                <div className="text-[12px] text-slate-500 flex items-center gap-1"><MapPin size={11} /> {next.hospital} · {next.location}</div>
              </div>
              <div className="text-[13px] font-bold text-brand-700 shrink-0">{next.time}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" icon={Navigation2} className="flex-1" onClick={() => navigate(`/mobile/tracking/${next.id}`)}>Navigate</Button>
              <Button size="sm" variant="secondary" icon={Info} className="flex-1" onClick={() => toast(`${next.doctor} · schedule details (demo)`)}>Details</Button>
            </div>
          </Card>
        </div>

        <Button variant="dark" size="lg" className="w-full" onClick={() => navigate("/mobile/end-of-day")}>
          Close Today's Schedule
        </Button>
      </div>
    </div>
  );
}
