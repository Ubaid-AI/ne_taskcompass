export default function BarChart({ data, height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <span className="text-[11px] font-bold text-slate-500">{d.value}</span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
            style={{ height: `${(d.value / max) * (height - 40)}px` }}
          />
          <span className="text-[11px] text-slate-400 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="w-32 text-[12.5px] text-slate-600 font-medium truncate">{d.name}</span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-6 text-[12.5px] font-bold text-slate-700 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
