import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, CalendarClock, CheckSquare, BarChart3, Bell, Users, Target, TrendingUp, Repeat, LogOut, BookOpen, Package, FileText, MapPin, Settings, UserCog, ChevronDown } from "lucide-react";
import LogoMark from "../ui/LogoMark.jsx";
import { useSession } from "../../context/SessionContext.jsx";

const items = [
  { to: "/dashboard/home", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/directory", label: "Doctors & Hospitals", icon: Users },
  { to: "/dashboard/products", label: "Products", icon: Package },
  {
    label: "Schedules",
    icon: CalendarClock,
    children: [
      { to: "/dashboard/schedules/day-plan", label: "Day Plan" },
      { to: "/dashboard/schedules/doctor-schedule", label: "Doctor Schedule" },
    ],
  },
  { to: "/dashboard/visits", label: "Visits", icon: MapPin },
  { to: "/dashboard/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/dashboard/targets", label: "Targets", icon: Target },
  { to: "/dashboard/followups", label: "Follow ups", icon: Repeat },
  { to: "/dashboard/tenders", label: "Tenders", icon: FileText },
  { to: "/dashboard/performance", label: "Performance", icon: TrendingUp },
  { to: "/dashboard/reports", label: "Reports & AI", icon: BarChart3 },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/users", label: "Users", icon: UserCog },
  { to: "/dashboard/setup", label: "Setup", icon: Settings },
  { to: "/dashboard/guide", label: "User Guide", icon: BookOpen },
];

const linkClass = (active) =>
  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition ${
    active ? "bg-white/10 text-white shadow-inner" : "text-brand-200 hover:bg-white/5 hover:text-white"
  }`;

function GroupItem({ item }) {
  const location = useLocation();
  const Icon = item.icon;
  const childActive = item.children.some((c) => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${linkClass(childActive)}`}
      >
        <Icon size={17} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-white/10 flex flex-col gap-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-[12.5px] font-medium transition ${
                  isActive ? "bg-white/10 text-white" : "text-brand-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { logout } = useSession();

  return (
    <div className="w-60 shrink-0 bg-brand-900 text-white flex flex-col h-full print:hidden">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shadow-md">
          <LogoMark size={30} variant="white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[14px] leading-tight">NE LiveTrack</div>
          <div className="text-[10.5px] text-brand-300 leading-tight">National Enterprises</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
        {items.map((item) =>
          item.children ? (
            <GroupItem key={item.label} item={item} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          )
        )}
      </nav>
      <button
        onClick={() => logout()}
        className="mx-3 mb-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-brand-200 hover:bg-white/5 hover:text-white transition"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
