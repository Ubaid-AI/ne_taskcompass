import { Lock } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import PerformancePanel from "../../components/shared/PerformancePanel.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { salesperson } from "../../data/neData.js";

export default function Targets() {
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="My Targets & Performance" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <Lock size={11} className="shrink-0" />
          You see only your own figures. Management sees the whole team.
        </div>

        {/* The same component the portal renders, so a rep and their manager are
            always looking at identical numbers rather than two implementations
            that quietly drift apart. */}
        <PerformancePanel userName={me.name} compact />

        <div className="text-[10.5px] text-slate-400 leading-relaxed px-0.5 pb-2">
          The office sets your monthly target, and the weekly figure is that number split across four
          weeks. What you sold is entered by management, so these are read only here. Tap through the
          months above to see how any earlier month went.
        </div>
      </div>
    </div>
  );
}
