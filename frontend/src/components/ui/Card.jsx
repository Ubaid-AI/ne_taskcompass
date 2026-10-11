export default function Card({ children, className = "", padding = "p-4", ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/70 shadow-card ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
