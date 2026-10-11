export default function Tabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto ${className}`}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition ${
            active === t ? "bg-brand-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
