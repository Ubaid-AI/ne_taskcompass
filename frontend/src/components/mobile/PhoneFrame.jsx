import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Smartphone, Maximize2 } from "lucide-react";

const FRAME_KEY = "ne_show_phone_frame";

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return <span>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
}

/**
 * The shell the field app runs inside.
 *
 * On a phone, and under the browser's device emulation, this is not a mockup:
 * it fills the viewport edge to edge and behaves like an installed app, with no
 * decorative bezel stealing space from an already small screen.
 *
 * On a wide desktop screen it defaults to a phone-shaped frame so the app can be
 * reviewed beside the portal, and the frame can be switched off to run the app
 * full width. The choice is remembered.
 *
 * The breakpoint is measured from the real viewport rather than set with a
 * Tailwind class, because DevTools device emulation changes the viewport and
 * this needs to follow it live.
 */
export default function PhoneFrame({ children }) {
  const [wide, setWide] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 900
  );
  const [framed, setFramed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem(FRAME_KEY);
      return saved === null ? true : saved === "1";
    } catch {
      return true;   // private browsing, just show the frame
    }
  });

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggleFrame() {
    setFramed((f) => {
      const next = !f;
      try { window.localStorage.setItem(FRAME_KEY, next ? "1" : "0"); } catch { /* private mode */ }
      return next;
    });
  }

  // Phone, tablet, or DevTools device emulation: be the whole app.
  if (!wide || !framed) {
    return (
      <div className="min-h-[100dvh] h-[100dvh] w-full bg-white flex flex-col overflow-hidden">
        {wide && (
          <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-900 text-slate-300 text-[11px]">
            <Link to="/" className="flex items-center gap-1.5 hover:text-white transition">
              <ArrowLeft size={12} /> Exit demo
            </Link>
            <button onClick={toggleFrame} className="flex items-center gap-1.5 hover:text-white transition">
              <Smartphone size={12} /> Show phone frame
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      </div>
    );
  }

  // Wide screen with the frame on: a phone sitting on a desk.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 gap-3">
      <div className="flex items-center gap-4 text-slate-400 text-xs font-medium">
        <Link to="/" className="flex items-center gap-1.5 hover:text-white transition">
          <ArrowLeft size={14} /> Exit demo
        </Link>
        <button onClick={toggleFrame} className="flex items-center gap-1.5 hover:text-white transition">
          <Maximize2 size={13} /> Open full width
        </button>
      </div>
      <div className="h-[820px] w-[390px] bg-white rounded-[44px] border-[10px] border-slate-900 shadow-2xl overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-30" />
        <div className="flex items-center justify-between px-5 pt-4 pb-1 text-[12px] font-semibold text-slate-800 shrink-0">
          <Clock />
          <span className="flex items-center gap-1 text-[11px]">📶 🔋 87%</span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      </div>
      <div className="text-center text-slate-500 text-[11px] max-w-[390px] leading-relaxed">
        This is the real app, not a picture of one. For true phone sizing open the device toolbar
        with Ctrl+Shift+M and pick a handset; the frame drops away on its own.
      </div>
    </div>
  );
}
