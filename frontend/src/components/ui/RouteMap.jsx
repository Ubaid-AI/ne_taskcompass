import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/** Same defaults Frappe Desk uses in frappe.utils.map_defaults. */
const FRAPPE_MAP = {
  center: [19.08, 72.8961],
  zoom: 5,
  tiles: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  options: {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  },
  image_path: "/assets/frappe/images/leaflet/",
};

function leaflet() {
  return window.L;
}

function waitForLeaflet(setReady) {
  if (leaflet()) {
    setReady(true);
    return () => {};
  }
  const id = setInterval(() => {
    if (leaflet()) {
      setReady(true);
      clearInterval(id);
    }
  }, 50);
  return () => clearInterval(id);
}

function ensureMap(mapRef, el, { scrollWheelZoom = false } = {}) {
  const L = leaflet();
  if (!el || !L) return null;
  if (L.Icon?.Default) {
    L.Icon.Default.imagePath = FRAPPE_MAP.image_path;
  }
  if (!mapRef.current) {
    mapRef.current = L.map(el, {
      scrollWheelZoom,
      zoomControl: true,
      doubleClickZoom: true,
      boxZoom: true,
      dragging: true,
    });
    L.tileLayer(FRAPPE_MAP.tiles, FRAPPE_MAP.options).addTo(mapRef.current);
    L.control.scale().addTo(mapRef.current);
  }
  return mapRef.current;
}

export default function RouteMap({ stops = [], height = 190, onSelect }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(() => !!leaflet());

  useEffect(() => waitForLeaflet(setReady), []);

  useEffect(() => {
    const L = leaflet();
    if (!ready || !L || !ref.current) return;
    const map = ensureMap(mapRef, ref.current, { scrollWheelZoom: true });
    if (!map) return;
    if (!map._tcLayer) {
      map._tcLayer = L.layerGroup().addTo(map);
    }
    map._tcLayer.clearLayers();
    const points = (stops || []).filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)));
    if (!points.length) {
      map.setView(FRAPPE_MAP.center, FRAPPE_MAP.zoom);
      setTimeout(() => map.invalidateSize(), 80);
      return;
    }
    const latlngs = points.map((s) => [Number(s.lat), Number(s.lng)]);
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#0f9c86", weight: 3, dashArray: "6 6" }).addTo(map._tcLayer);
    }
    points.forEach((s, i) => {
      const marker = L.marker(latlngs[i]).addTo(map._tcLayer);
      marker.bindPopup(
        `<b>${s.n || i + 1}. ${s.doctor || s.name || "Stop"}</b><br>${s.hospital || s.region || ""}<br>${s.status || ""}`
      );
      if (onSelect) {
        marker.on("click", () => onSelect(s, i));
      }
    });
    map.fitBounds(latlngs, { padding: [24, 24], maxZoom: 13 });
    setTimeout(() => map.invalidateSize(), 80);
  }, [ready, stops, onSelect]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 grid place-items-center text-[12px] text-slate-400" style={{ height }}>
        Loading map…
      </div>
    );
  }

  return <div ref={ref} className="rounded-2xl border border-slate-200 overflow-hidden" style={{ height, zIndex: 0 }} />;
}

export function TeamMap({ people = [], onSelect, height = 280 }) {
  const wrapRef = useRef(null);
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(() => !!leaflet());
  const [fullscreen, setFullscreen] = useState(false);

  onSelectRef.current = onSelect;

  useEffect(() => waitForLeaflet(setReady), []);

  useEffect(() => {
    const onFs = () => {
      const el = wrapRef.current;
      setFullscreen(Boolean(el && document.fullscreenElement === el));
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const L = leaflet();
    if (!ready || !L || !ref.current) return;
    const map = ensureMap(mapRef, ref.current, { scrollWheelZoom: true });
    if (!map) return;
    if (!map._tcMoveBound) {
      map.on("zoomstart", () => { map._tcUserMoved = true; });
      map.on("dragstart", () => { map._tcUserMoved = true; });
      map._tcMoveBound = true;
    }

    const points = (people || []).filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    const nextKeys = new Set();
    points.forEach((p) => {
      const key = String(p.id || p.name);
      nextKeys.add(key);
      const latlng = [Number(p.lat), Number(p.lng)];
      const tip = `<b>${p.name || "Salesperson"}</b><br>${p.trackedAt || p.region || ""}`;
      let marker = markersRef.current[key];
      if (!marker) {
        marker = L.marker(latlng);
        marker.bindTooltip(tip, { direction: "top", offset: [0, -28] });
        marker.on("click", () => onSelectRef.current?.(p));
        marker.addTo(map);
        markersRef.current[key] = marker;
      } else {
        marker.setLatLng(latlng);
        marker.setTooltipContent(tip);
        marker.off("click");
        marker.on("click", () => onSelectRef.current?.(p));
      }
    });
    Object.keys(markersRef.current).forEach((key) => {
      if (!nextKeys.has(key)) {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    const latlngs = points.map((p) => [Number(p.lat), Number(p.lng)]);
    if (!latlngs.length) {
      if (!map._tcFitted) {
        map.setView(FRAPPE_MAP.center, FRAPPE_MAP.zoom);
        map._tcFitted = true;
      }
    } else if (!map._tcFitted || !map._tcUserMoved) {
      map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 14 });
      map._tcFitted = true;
    }
    setTimeout(() => map.invalidateSize(), 80);
  }, [ready, people]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markersRef.current = {};
  }, []);

  async function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* browser blocked fullscreen */
    }
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 grid place-items-center text-[12px] text-slate-400" style={{ height }}>
        Loading map…
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative bg-white overflow-hidden rounded-b-2xl [&:fullscreen]:rounded-none [&:fullscreen]:h-screen"
      style={{ height: fullscreen ? "100%" : height }}
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute z-[500] top-3 right-3 w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm grid place-items-center text-slate-600 hover:bg-slate-50"
        title={fullscreen ? "Exit full screen" : "Full screen"}
      >
        {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <div ref={ref} className="w-full h-full" style={{ minHeight: fullscreen ? "100vh" : height, zIndex: 0 }} />
    </div>
  );
}
