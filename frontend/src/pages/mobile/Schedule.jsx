import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Lock, ClipboardCheck } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useSchedule } from "../../context/ScheduleContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });

export default function MobileSchedule() {
  const navigate = useNavigate();
  const toast = useToast();
  const { visits } = useSchedule();
  const [tab, setTab] = useState("Today");

  function openVisit(v) {
    if (v.status === "Locked") return toast(`Locked by ${v.lockedBy} — contact management to unlock`);
    if (v.status === "Done") return toast(`${v.doctor} — visit already completed today`);
    navigate(`/mobile/tracking/${v.id}`);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="Schedule" />
      <div className="p-4 pb-2 shrink-0">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Schedule</div>
        <div className="text-lg font-bold text-slate-800 mb-2.5">{today}</div>
        <Tabs tabs={["Today", "Tomorrow", "This Week"]} active={tab} onChange={setTab} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2.5">
        {(tab === "Today" ? visits : []).map((v) => (
          <Card key={v.id} className="cursor-pointer hover:border-brand-300 transition" onClick={() => openVisit(v)}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[12px] font-bold text-slate-400">{v.time}</span>
              <StatusPill status={v.status}>{v.status}</StatusPill>
            </div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="font-bold text-[14px] text-slate-800">{v.doctor}</div>
              {v.assignedBy && (
                <span className="text-[9.5px] font-bold text-white bg-brand-600 rounded-full px-1.5 py-0.5 uppercase tracking-wide">Admin Task</span>
              )}
            </div>
            <div className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {v.hospital} · {v.location}</div>
            {v.assignedBy && (
              <div className="text-[11px] text-brand-700 italic flex items-center gap-1 mt-1.5"><ClipboardCheck size={11} /> Assigned by {v.assignedBy}</div>
            )}
            {v.lockedBy && (
              <div className="text-[11px] text-slate-400 italic flex items-center gap-1 mt-1.5"><Lock size={10} /> Locked by {v.lockedBy}</div>
            )}
          </Card>
        ))}
        {tab !== "Today" && (
          <div className="text-center text-slate-400 text-[13px] py-16">No visits planned yet for {tab.toLowerCase()}.</div>
        )}
      </div>
    </div>
  );
}
