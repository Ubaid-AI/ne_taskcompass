import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Button from "../../components/ui/Button.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { salesperson } from "../../data/mock.js";

export default function Profile() {
  const navigate = useNavigate();
  const { mobileUser, setMobileUser } = useSession();
  const user = mobileUser || salesperson;

  const rows = [
    ["Email", user.email],
    ["Territory", user.region],
    ["Role", user.role],
    ["App Version", "NE TaskCompass v1.0 (Demo)"],
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="Profile" gps={false} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 py-3">
          <Avatar initials={user.initials} size={64} />
          <div className="font-bold text-[16px] text-slate-800">{user.name}</div>
          <div className="text-[12.5px] text-brand-700 font-semibold">{user.role}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-3 text-[13px]">
              <span className="text-slate-500">{label}</span>
              <span className="font-semibold text-slate-800 text-right">{value}</span>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          icon={LogOut}
          className="w-full mt-2"
          onClick={() => { setMobileUser(null); navigate("/mobile/login"); }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
