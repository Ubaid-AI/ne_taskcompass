import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import { useData } from "../../context/DataContext.jsx";

export default function Notifications() {
  const { notifications } = useData();
  return (
    <DashboardLayout title="Notifications" subtitle="Alerts stored on TC Notification">
      <div className="flex flex-col gap-2.5 max-w-2xl">
        {(notifications || []).length === 0 ? (
          <Card className="text-center text-slate-400 py-8 text-[13px]">No notifications for this user.</Card>
        ) : notifications.map((n) => (
          <Card key={n.name} className="flex items-center gap-3.5">
            <span className={`text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${n.read ? "bg-slate-100 text-slate-500" : "bg-info-bg text-info-fg"}`}>
              {n.read ? "Read" : "New"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-slate-700">{n.title}</div>
              <div className="text-[11.5px] text-slate-400 mt-0.5">{n.body}</div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
