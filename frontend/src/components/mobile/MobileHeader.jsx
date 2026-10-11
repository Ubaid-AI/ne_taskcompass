import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import LogoMark from "../ui/LogoMark.jsx";

export default function MobileHeader({ title = "NE TaskCompass", back = false, gps = true }) {
  const navigate = useNavigate();
  return (
    <div className="shrink-0 flex items-center justify-between px-4 pb-2.5 pt-1 border-b border-slate-100 bg-white">
      <div className="flex items-center gap-1.5 min-w-0">
        {back ? (
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-500 hover:text-slate-800">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <LogoMark size={22} variant="color" className="shrink-0" />
        )}
        <span className="font-bold text-[15px] text-slate-800 truncate">{title}</span>
      </div>
      {gps && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 pulse-dot" />
          GPS Active
        </div>
      )}
    </div>
  );
}
