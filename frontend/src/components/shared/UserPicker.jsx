import Avatar from "../ui/Avatar.jsx";

/**
 * Everyone who can sign in, as tappable cards.
 *
 * The client walks through this demo as five different people in one sitting, so
 * typing an email each time is friction with no upside. Tapping a name fills the
 * form; the sign in button still has to be pressed, which keeps the flow honest
 * rather than skipping straight past the login screen.
 */
export default function UserPicker({ users, value, onPick, accent = "light" }) {
  if (!users?.length) return null;

  const dark = accent === "dark";
  const groups = [
    { key: "admin", label: "Management and administration", people: users.filter((u) => u.kind === "admin") },
    { key: "field", label: "Field team", people: users.filter((u) => u.kind !== "admin") },
  ].filter((g) => g.people.length);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.key}>
          <div className={`text-[10.5px] font-bold uppercase tracking-wide mb-1.5 ${dark ? "text-brand-200/80" : "text-slate-400"}`}>
            {g.label}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {g.people.map((u) => {
              const active = value === u.name;
              return (
                <button
                  key={u.id || u.email || u.name}
                  type="button"
                  onClick={() => onPick(u)}
                  title={`${u.email} · ${u.role}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border text-left transition ${
                    active
                      ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                      : dark
                      ? "bg-white/10 border-white/15 text-white hover:bg-white/20"
                      : "bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  <Avatar initials={u.initials} size={26} />
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-semibold truncate leading-tight">{u.name}</span>
                    <span className={`block text-[10px] truncate leading-tight ${active ? "text-white/75" : dark ? "text-white/60" : "text-slate-400"}`}>
                      {u.region || u.role}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
