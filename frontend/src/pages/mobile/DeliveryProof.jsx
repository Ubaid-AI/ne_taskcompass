import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, Check, ChevronLeft } from "lucide-react";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import Button from "../../components/ui/Button.jsx";
import { useSchedule } from "../../context/ScheduleContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function DeliveryProof() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { visits, updateStatus } = useSchedule();
  const visit = visits.find((v) => v.id === id) || visits[0];
  const [captured, setCaptured] = useState(false);

  function capture() {
    setCaptured(true);
    toast("Photo captured");
  }

  function finish() {
    updateStatus(visit.id, "Done");
    toast(`Visit to ${visit.doctor} completed ✓`);
    navigate("/mobile/schedule");
  }

  return (
    <PhoneFrame>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-black">
        <div className="shrink-0 flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-semibold text-[13px]">Delivery Proof</span>
          <span className="w-5" />
        </div>
        <div className="flex-1 relative flex items-center justify-center">
          <div className={`w-[72%] h-[46%] rounded-2xl border-2 flex items-center justify-center transition ${captured ? "border-success-solid" : "border-white/40"}`}>
            {captured ? <Check size={44} className="text-success-solid" /> : <Camera size={36} className="text-white/40" />}
          </div>
          <div className="absolute top-4 left-4 right-4 bg-black/55 rounded-xl px-3 py-2 text-white text-[11px]">
            Camera-only capture · gallery selection disabled
          </div>
          <div className="absolute bottom-4 left-4 right-4 bg-black/55 rounded-xl px-3 py-2 text-white text-[11px] font-mono">
            {visit.location} · {visit.hospital}
          </div>
        </div>
        <div className="shrink-0 p-4 bg-white rounded-t-2xl flex flex-col gap-3">
          <div className="text-[12px] text-slate-500">Product: Neuro-Surgical Clamp (v4.2) · Qty 1</div>
          {!captured ? (
            <Button size="lg" className="w-full" icon={Camera} onClick={capture}>Capture Photo</Button>
          ) : (
            <Button size="lg" variant="success" className="w-full" onClick={finish}>Confirm &amp; Continue</Button>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
