import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

/**
 * Searchable picker for linked records (hospitals, doctors, …).
 * `options` is [{ value, label, sub }].
 * Dropdown is portalled so a modal's overflow does not swallow clicks.
 */
export default function SearchSelect({
  label, value, onChange, options = [], placeholder = "Search and select", empty = "No matches",
  disabled = false,
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter((o) =>
          (o.label || "").toLowerCase().includes(needle) ||
          (o.sub || "").toLowerCase().includes(needle) ||
          String(o.value).toLowerCase().includes(needle))
      : options;
    if (selected && !list.some((o) => o.value === selected.value)) return [selected, ...list];
    return list;
  }, [options, q, selected]);

  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBox({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !e.target.closest("[data-search-select-menu]")) {
        setOpen(false);
        setQ("");
      }
    }
    function onMove() { place(); }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  return (
    <label className="block relative">
      {label && <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">{label}</span>}
      <div ref={wrapRef} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
        disabled ? "bg-slate-100 border-slate-200" : "bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-brand-400"
      }`}>
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          value={open && !disabled ? q : (selected?.label || "")}
          disabled={disabled}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { if (disabled) return; setOpen(true); setQ(""); place(); }}
          placeholder={placeholder}
          className="w-full outline-none text-sm text-slate-800 bg-transparent placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        {value && !disabled && (
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 shrink-0"
            onClick={() => { onChange(""); setQ(""); setOpen(false); }}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && !disabled && box && createPortal(
        <div
          data-search-select-menu
          className="fixed z-[80] max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {shown.slice(0, 80).map((o) => (
            <button
              type="button"
              key={String(o.value) + (o.label || "")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o.value, o); setOpen(false); setQ(""); }}
              className={`w-full text-left px-3 py-2 text-[13px] ${
                String(o.value) === String(value) ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="block font-semibold truncate">{o.label}</span>
              {o.sub && <span className="block text-[11px] text-slate-400 truncate">{o.sub}</span>}
            </button>
          ))}
          {shown.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-slate-400 text-center">{empty}</div>
          )}
        </div>,
        document.body
      )}
    </label>
  );
}
