const palette = ["from-brand-500 to-brand-700", "from-sky-500 to-sky-700", "from-violet-500 to-violet-700", "from-amber-500 to-amber-700", "from-rose-500 to-rose-700"];

function hashIndex(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % palette.length;
  return h;
}

export default function Avatar({ initials = "?", size = 36, className = "" }) {
  const label = String(initials || "?").slice(0, 3) || "?";
  const grad = palette[hashIndex(label)];
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`shrink-0 rounded-full bg-gradient-to-br ${grad} text-white font-bold flex items-center justify-center ${className}`}
    >
      {label}
    </div>
  );
}
