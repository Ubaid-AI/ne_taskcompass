const MAP = {
  pending: "warning", "in progress": "info", locked: "neutral", done: "success",
  approved: "success", rejected: "danger", active: "success", "on route": "info",
  "gps disabled": "danger", missed: "danger", closed: "success", rescheduled: "info",
};

const styles = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-slate-100 text-slate-600",
};

export default function StatusPill({ children, status }) {
  const key = (status || children || "").toString().toLowerCase();
  const tone = styles[MAP[key]] || styles.neutral;
  return (
    <span className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${tone}`}>
      {children}
    </span>
  );
}
