import { useMemo } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import BarChart, { HBarChart } from "../../components/ui/BarChart.jsx";
import { useData } from "../../context/DataContext.jsx";

export default function Reports() {
  const { visits, kpis, doctors, followups, sampleOrders } = useData();

  const visitsPerDay = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Object.fromEntries(days.map((d) => [d, 0]));
    (visits || []).forEach((v) => {
      if (!v.visitedAt) return;
      const d = new Date(v.visitedAt);
      if (Number.isNaN(d.getTime())) return;
      counts[days[d.getDay()]] += 1;
    });
    return days.map((label) => ({ label, value: counts[label] }));
  }, [visits]);

  const topDoctors = useMemo(() => {
    const counts = {};
    (visits || []).forEach((v) => {
      const name = doctors.find((d) => d.id === v.doctorId)?.name || v.doctorId;
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [visits, doctors]);

  const completion = kpis.planned ? Math.round((kpis.completed / kpis.planned) * 100) : 0;

  return (
    <DashboardLayout title="Reports" subtitle="Built from TC Visit, Day Plan and Sample Order">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <div className="font-bold text-slate-800">Visits by weekday</div>
            <div className="text-[12px] text-slate-400">Logged field visits</div>
            <div className="mt-4"><BarChart data={visitsPerDay} /></div>
          </Card>
          <Card>
            <div className="font-bold text-slate-800 mb-1">Top doctors by visits</div>
            <HBarChart data={topDoctors.length ? topDoctors : [{ name: "No visits yet", value: 0 }]} />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {[
            { label: "Schedule completion today", value: `${completion}%` },
            { label: "Active follow-ups", value: (followups || []).filter((f) => f.status === "active").length },
            { label: "Pending samples", value: (sampleOrders || []).filter((s) => s.status === "pending").length },
            { label: "Doctors in directory", value: (doctors || []).length },
          ].map((s) => (
            <Card key={s.label}>
              <div className="text-[12px] text-slate-500">{s.label}</div>
              <div className="text-2xl font-extrabold text-slate-800 mt-1">{s.value}</div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
