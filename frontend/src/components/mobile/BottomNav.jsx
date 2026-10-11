import { NavLink } from "react-router-dom";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { Home, Stethoscope, Repeat, CalendarDays, FlaskConical, Target, Gavel, User } from "lucide-react";

const items = [
  { to: "/mobile/home", label: "Home", icon: Home },
  { to: "/mobile/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/mobile/followups", label: "Follow ups", icon: Repeat, badge: "followups" },
  { to: "/mobile/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/mobile/samples", label: "Samples", icon: FlaskConical },
  { to: "/mobile/targets", label: "Targets", icon: Target },
  { to: "/mobile/tenders", label: "Tenders", icon: Gavel },
  { to: "/mobile/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const { followupsForRep } = useData();
  const { mobileUser } = useSession();
  // A count on the tab, so a rep can see there is work waiting without opening
  // it. Follow ups are easy to forget precisely because nothing else prompts them.
  const followupCount = mobileUser ? followupsForRep(mobileUser.name).length : 0;

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white flex justify-around items-stretch py-1 px-0.5">
      {items.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[8.5px] font-semibold transition ${
              isActive ? "text-brand-700" : "text-slate-400"
            }`
          }
        >
          <span className="relative">
            <Icon size={16} />
            {badge === "followups" && followupCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-brand-600 text-white text-[8px] font-bold grid place-items-center">
                {followupCount > 9 ? "9+" : followupCount}
              </span>
            )}
          </span>
          <span className="truncate w-full text-center leading-tight">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}
