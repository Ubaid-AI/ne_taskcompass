const variants = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm",
  secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
  success: "bg-success-solid hover:brightness-95 text-white shadow-sm",
  danger: "bg-white hover:bg-danger-bg text-danger-fg border border-danger-fg/30",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
  dark: "bg-slate-900 hover:bg-slate-800 text-white",
};

const sizes = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-[15px] px-5 py-3 rounded-xl gap-2 font-semibold",
};

export default function Button({
  children, variant = "primary", size = "md", className = "", icon: Icon, disabled, ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {typeof Icon === "function" ? <Icon size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}
