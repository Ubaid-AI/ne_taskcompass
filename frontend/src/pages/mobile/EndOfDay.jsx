import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import { Textarea } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useSchedule } from "../../context/ScheduleContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function EndOfDay() {
  const navigate = useNavigate();
  const toast = useToast();
  const { visits } = useSchedule();
  const [remarks, setRemarks] = useState("");
  const done = visits.filter((v) => v.status === "Done").length;

  function close() {
    toast("Schedule closed — synced to NE LiveTrack");
    navigate("/mobile/home");
  }

  return (
    <PhoneFrame>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MobileHeader title="End Of Day" back />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold text-brand-600 uppercase tracking-wide">Stage 5 · End Of Day</div>
            <div className="text-lg font-bold text-slate-800">Close Today's Schedule</div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Card padding="p-3"><div className="text-[10px] font-bold text-slate-400 uppercase">Visits</div><div className="text-xl font-extrabold text-success-fg mt-0.5">{done} / {visits.length}</div></Card>
            <Card padding="p-3"><div className="text-[10px] font-bold text-slate-400 uppercase">Samples</div><div className="text-xl font-extrabold text-slate-800 mt-0.5">2</div></Card>
            <Card padding="p-3"><div className="text-[10px] font-bold text-slate-400 uppercase">Distance</div><div className="text-xl font-extrabold text-slate-800 mt-0.5">38 km</div></Card>
          </div>
          <Textarea
            label="End-of-Day Remarks"
            placeholder="e.g. Dr. Fatima Sheikh requested a follow-up demo of the Dural Sealant Patch next week…"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <p className="text-[11px] text-slate-400">
            Schedule locks after closing — no further edits without Management override.
          </p>
        </div>
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white">
          <Button size="lg" className="w-full" onClick={close}>Close Schedule</Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
