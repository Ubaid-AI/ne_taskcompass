export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">{label}</span>}
      <input
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition placeholder:text-slate-400 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">{label}</span>}
      <textarea
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition placeholder:text-slate-400 resize-none ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, options = [], className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">{label}</span>}
      <select
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition ${className}`}
        {...props}
      >
        {options.map((o) => {
          const value = typeof o === "object" && o != null ? o.value : o;
          const labelText = typeof o === "object" && o != null ? (o.label ?? o.value) : o;
          return <option key={String(value)} value={value}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}

export function Checkbox({ label, checked, onChange, className = "" }) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <span
        onClick={() => onChange?.(!checked)}
        className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
          checked ? "bg-brand-600 border-brand-600" : "bg-white border-slate-300"
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}
