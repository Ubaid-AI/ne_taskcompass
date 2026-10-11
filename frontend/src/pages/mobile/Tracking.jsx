import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import RouteMap from "../../components/ui/RouteMap.jsx";
import { useSchedule } from "../../context/ScheduleContext.jsx";
import { todayRoute } from "../../data/mock.js";

const dotColor = { Done: "bg-brand-600", "In Progress": "bg-info-solid", Pending: "bg-slate-300" };

export default function Tracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { visits, updateStatus } = useSchedule();
  const visit = visits.find((v) => v.id === id) || visits[0];
  const [eta, setEta] = useState(9);

  useEffect(() => {
    const t = setInterval(() => setEta((e) => Math.max(1, e - 1)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <PhoneFrame>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MobileHeader title="On The Road" back />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold text-brand-600 uppercase tracking-wide">Stage 2 · On The Road</div>
            <div className="text-lg font-bold text-slate-800">En route to {visit.doctor}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-bold text-slate-500">Full Day Route</span>
              <span className="text-[10.5px] text-slate-400">Updates every 3 min · GPS-verified</span>
            </div>
            <RouteMap stops={todayRoute} height={170} />
          </div>

          <Card className="flex flex-col gap-1">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Next Stop</div>
            <div className="font-bold text-[14px] text-slate-800">{visit.hospital}</div>
            <div className="text-[12.5px] text-slate-500">{visit.location} · ETA {eta} min</div>
          </Card>

          <div>
            <div className="text-[12px] font-bold text-slate-500 mb-2">Today's Stops</div>
            <div className="flex flex-col">
              {todayRoute.map((s, i) => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold text-white ${dotColor[s.status] || "bg-slate-300"}`}>{s.n}</span>
                    {i < todayRoute.length - 1 && <span className="w-0.5 flex-1 min-h-[18px] bg-slate-200" />}
                  </div>
                  <div className="pb-3 min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800 flex items-center gap-1.5">{s.time}
                      <span className="text-[10px] font-bold text-slate-400">{s.status}</span>
                    </div>
                    <div className="text-[11.5px] text-slate-500 truncate flex items-center gap-1"><MapPin size={10} /> {s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] text-slate-400 leading-relaxed">
            If location is turned off, Management is notified immediately by name — the app
            requires GPS to remain active while on duty.
          </p>
        </div>
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white">
          <Button
            variant="success"
            size="lg"
            className="w-full"
            onClick={() => { updateStatus(visit.id, "In Progress"); navigate(`/mobile/visit/${visit.id}`); }}
          >
            Arrived — Check In
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
