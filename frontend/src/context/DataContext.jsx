import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/frappe.js";
import { achievementPct, followupTrend as localTrend, recentMonths, visitAllowance } from "../lib/performance.js";
import { describeOpportunity } from "../lib/pipeline.js";

const DataCtx = createContext(null);

function mapDoctor(d) {
  const hospitals = Array.isArray(d.hospitals)
    ? d.hospitals.map((h) => (typeof h === "string" ? h : h.hospital || h.name)).filter(Boolean)
    : [];
  if (d.hospital && !hospitals.includes(d.hospital)) hospitals.unshift(d.hospital);
  return {
    id: d.name,
    name: d.doctor_name,
    personType: d.person_type === "Unclassified" ? "Unclassified" : d.person_type,
    personTypeOther: d.person_type_other || "",
    status: (d.status || "Pending").toLowerCase(),
    specialty: d.specialty,
    designation: d.designation || "",
    hospital: d.hospital,
    hospitals,
    city: d.city,
    rep: d.assigned_to,
    phone: d.phone || "",
    whatsapp: d.whatsapp || "",
    email: d.email || "",
    notes: d.notes || "",
    imageUrl: d.image || d.imageUrl || "",
    usesCompetitor: d.uses_competitor,
    source: d.person_type_source === "scraper" ? "Directory" : "Manual",
  };
}

function mapProduct(p) {
  return {
    id: p.name,
    name: p.product_name || p.name,
    category: p.category,
    monthlyTarget: p.monthly_target,
    unitPrice: p.unit_price,
    item: p.item,
  };
}

function mapUser(u) {
  const name = u.sales_person_name || u.name;
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    id: u.name,
    name,
    initials: ((parts[0] || "?").slice(0, 1) + (parts[1] || "").slice(0, 1)).toUpperCase(),
    region: u.tc_territory || "",
    kind: "field",
    employee: u.employee,
  };
}

function mapFollowup(f) {
  return {
    id: f.name,
    doctorId: f.doctor,
    doctor: f.doctor_name || f.doctor,
    product: f.product,
    productId: f.product,
    status: (f.status || "Active").toLowerCase(),
    assignedTo: f.assigned_to,
    competitor: f.competitor_name,
    targetShare: f.target_share,
    reviewAfter: f.review_after,
    reason: f.reason,
  };
}

function parseChanges(raw) {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return {};
    const out = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === "object" && ("from" in value || "to" in value)) out[key] = value;
      else out[key] = { from: "", to: value };
    });
    return out;
  } catch {
    return {};
  }
}

function cleanVisitNotes(text) {
  if (!text) return "";
  return String(text)
    .replace(/\[[^\[\]]+?:\s*\/?(?:private\/)?files\/[^\]]+\]/gi, "")
    .replace(/\/(?:private\/)?files\/[^\s\]"'<>]+/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function mapVisitImages(v) {
  const fromApi = (v.images || []).map((img, i) => ({
    id: img.name || `${v.name}-img-${i}`,
    src: img.file_url
      || (v.name
        ? `/api/method/ne_taskcompass.api.visits.visit_file?name=${encodeURIComponent(v.name)}&idx=${i}${img.name ? `&image=${encodeURIComponent(img.name)}` : ""}`
        : img.image || ""),
    caption: img.caption || "",
  })).filter((img) => img.src);
  if (fromApi.length) return fromApi;
  const fallback = [];
  const re = /\/(?:private\/)?files\/[^\s\]"'<>]+/gi;
  const notes = v.notes || "";
  let match;
  while ((match = re.exec(notes))) {
    fallback.push({
      id: `${v.name}-note-${fallback.length}`,
      src: `/api/method/ne_taskcompass.api.visits.visit_file?name=${encodeURIComponent(v.name)}&idx=${fallback.length}`,
      caption: "",
    });
  }
  return fallback;
}

function stampedPathFromReview(text) {
  if (!text) return "";
  const tagged = String(text).match(/\[Stamped review document:\s*([^\]]+)\]/i);
  if (tagged) return tagged[1].trim();
  const bare = String(text).match(/(\/(?:private\/)?files\/[^\s\]]+)/i);
  return bare ? bare[1] : "";
}

function cleanReviewText(text) {
  if (!text) return "";
  return String(text).replace(/\[Stamped review document:\s*[^\]]*\]/gi, "").trim();
}

function mapSample(s) {
  const stamped = (s.stamped_document || s.stampedDoc || stampedPathFromReview(s.review_text) || "").trim();
  const stampedFileUrl = (s.stamped_file_url || "").trim()
    || (s.name && stamped
      ? `/api/method/ne_taskcompass.api.samples.stamped_file?name=${encodeURIComponent(s.name)}`
      : "");
  return {
    id: s.name,
    doctorId: s.doctor,
    doctorName: s.doctor_name,
    product: s.product,
    status: (s.status || "Pending").toLowerCase(),
    requestedBy: s.requested_by,
    approvalWarning: s.approval_warning,
    related: s.related_surgeries_pm,
    relatedSurgeries: s.related_surgeries_pm,
    total: s.total_surgeries_pm,
    totalSurgeries: s.total_surgeries_pm,
    expected: s.expected_consumption_pm,
    expectedConsumption: s.expected_consumption_pm,
    hospitalName: s.hospital_name,
    designation: s.designation,
    department: s.department,
    review: cleanReviewText(s.review_text),
    interest: s.interest_level,
    usageDate: s.expected_usage_date,
    stampedDoc: stamped,
    stampedFileUrl,
    doctor: s.doctor_name || s.doctor,
    rep: s.requested_by,
    createdAt: s.creation,
    date: s.creation,
  };
}

export function DataProvider({ children }) {
  const [source, setSource] = useState("connecting");
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [products, setProducts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [users, setUsers] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [sampleOrders, setSampleOrders] = useState([]);
  const [samples, setSamples] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [monthlyTargets, setMonthlyTargets] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [pipelineRows, setPipelineRows] = useState([]);
  const [scores, setScores] = useState([]);
  const [kpis, setKpis] = useState({ planned: 0, completed: 0, missed: 0, activeReps: 0 });
  const [salesByDoctor, setSalesByDoctor] = useState({});
  const [dayPlans, setDayPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [designations, setDesignations] = useState([]);

  const loadAll = useCallback(async () => {
    const settled = async (method, args) => {
      try {
        return await api.call(method, args);
      } catch (e) {
        console.error(method, e);
        return null;
      }
    };
    try {
      const [
        docs, hosps, prods, people, fups, smpls, pending, tnds, pipe, team, overview, visitRows, tgt, planRows, schedRows, notes, salesRows, eventRows, terrs, desigs,
      ] = await Promise.all([
        settled("ne_taskcompass.api.directory.list_doctors"),
        settled("ne_taskcompass.api.directory.list_hospitals"),
        settled("ne_taskcompass.api.directory.list_products"),
        settled("ne_taskcompass.api.directory.list_sales_persons"),
        settled("ne_taskcompass.api.followups.list_followups"),
        settled("ne_taskcompass.api.samples.list_samples"),
        settled("ne_taskcompass.api.approvals.pending"),
        settled("ne_taskcompass.api.tenders.list_tenders"),
        settled("ne_taskcompass.api.pipeline.get_pipeline"),
        settled("ne_taskcompass.api.performance.score_history", { months: 12 }),
        settled("ne_taskcompass.api.performance.overview"),
        settled("ne_taskcompass.api.visits.list_visits"),
        settled("ne_taskcompass.api.targets.list_targets", { history: 12 }),
        settled("ne_taskcompass.api.plans.list_plans"),
        settled("ne_taskcompass.api.directory.list_schedules"),
        settled("ne_taskcompass.api.notifications.list_notifications"),
        settled("ne_taskcompass.api.followups.list_doctor_sales"),
        settled("ne_taskcompass.api.performance.list_events"),
        settled("ne_taskcompass.api.setup.list_territories"),
        settled("ne_taskcompass.api.setup.list_designations"),
      ]);
      const any = [docs, hosps, prods, people].some((x) => x != null);
      if (!any) {
        setSource("error");
        return;
      }
      setDoctors((docs || []).map(mapDoctor));
      setHospitals((hosps || []).map((h) => ({
        id: h.name, name: h.hospital_name, city: h.city, territory: h.territory,
        lat: h.latitude, lng: h.longitude, address: h.address,
      })));
      setTerritories((terrs || []).map((t) => ({
        id: t.name, name: t.territory_name || t.name, parent: t.parent_territory,
      })));
      setDesignations((desigs || []).map((d) => ({
        id: d.name, name: d.designation_name || d.name,
      })));
      setProducts((prods || []).map(mapProduct));
      setUsers((people || []).map(mapUser));
      setFollowups((fups || []).map(mapFollowup));
      const mappedSamples = (smpls || []).map(mapSample);
      setSampleOrders(mappedSamples);
      setSamples(mappedSamples);
      setEditRequests((pending?.edits || []).map((e) => ({
        id: e.name, doctor: e.doctor, doctorId: e.doctor, requestedBy: e.requested_by,
        status: (e.status || "Pending").toLowerCase(),
        changes: parseChanges(e.changes_json), reason: e.reason, createdAt: e.creation,
      })));
      setTenders((tnds || []).map((t) => ({ ...t, id: t.name })));
      setPipelineRows(pipe?.opportunities || []);
      setScores(team || []);
      setDayPlans(planRows || []);
      setSchedules(schedRows || []);
      setNotifications(notes || []);
      setKpis({
        planned: overview?.planned || 0,
        completed: overview?.completed || 0,
        missed: overview?.missed || 0,
        activeReps: overview?.active_reps || 0,
      });
      setVisits((visitRows || []).map((v) => ({
        id: v.name, doctorId: v.doctor, product: v.product, visitNumber: v.visit_number,
        isFollowup: v.is_followup, outcome: v.outcome, demo: v.did_demonstration,
        visitedAt: v.visited_at, salesperson: v.salesperson,
        lat: v.latitude, lng: v.longitude, dayPlan: v.day_plan, notes: cleanVisitNotes(v.notes),
        doctorName: v.doctor_name, hospital: v.hospital,
        gpsOk: v.gps_ok, gpsMetres: v.gps_metres, gpsReason: v.gps_reason,
        checkinTime: v.checkin_time, checkoutTime: v.checkout_time,
        checkinLat: v.checkin_latitude, checkinLng: v.checkin_longitude,
        checkoutLat: v.checkout_latitude, checkoutLng: v.checkout_longitude,
        images: mapVisitImages(v),
        imageCount: (v.images && v.images.length) || v.image_count || 0,
        status: v.status, dayPlanItem: v.day_plan_item,
        showedBrochure: v.showed_brochure, didDemonstration: v.did_demonstration,
      })));
      const grouped = {};
      (tgt?.targets || []).forEach((t) => {
        const owner = t.salesperson;
        const key = `${owner}::${t.year}-${String(t.month).padStart(2, "0")}`;
        grouped[key] = grouped[key] || [];
        const achieved = (tgt.achievements || [])
          .filter((a) => a.salesperson === t.salesperson && a.product === t.product && a.year === t.year && a.month === t.month)
          .reduce((n, a) => n + (a.achieved_qty || 0), 0);
        grouped[key].push({
          productId: t.product, product: t.product, target: t.target_qty, achieved, rowId: t.name, weekly: t.weekly_target,
        });
      });
      setMonthlyTargets(grouped);
      setAchievements(tgt?.achievements || []);
      const byDoctor = {};
      (salesRows || []).forEach((r) => {
        const list = (byDoctor[r.doctor] = byDoctor[r.doctor] || []);
        let period = list.find((p) => p.year === r.year && p.month === r.month);
        if (!period) {
          period = { year: r.year, month: r.month, lines: [] };
          list.push(period);
        }
        period.lines.push({
          productId: r.product, qty: r.qty || 0, competitorQty: r.competitor_qty || 0,
        });
      });
      setSalesByDoctor(byDoctor);
      setEvents((eventRows || []).map((e) => ({
        id: e.name, salesperson: e.salesperson, date: e.event_date, kind: e.kind,
        points: e.points || 0, note: e.note || "",
      })));
      setSource("frappe");
    } catch (e) {
      console.error(e);
      setSource("error");
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addDoctor = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.create_doctor", {
        doctor_name: payload.name,
        person_type: payload.personType,
        person_type_other: payload.personType === "Other" ? payload.personTypeOther : "",
        hospital: payload.hospital || (payload.hospitals || [])[0],
        hospitals: JSON.stringify(payload.hospitals || (payload.hospital ? [payload.hospital] : [])),
        city: payload.city,
        phone: payload.phone,
        assigned_to: payload.rep,
        specialty: payload.specialty,
        designation: payload.designation,
        notes: payload.notes,
        status: "Approved",
        person_type_source: "admin",
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const addHospital = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.create_hospital", {
        hospital_name: payload.name, city: payload.city, territory: payload.territory || payload.city,
        address: payload.address, latitude: payload.lat, longitude: payload.lng,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const updateHospital = async (id, payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.update_hospital", {
        name: id,
        city: payload.city,
        territory: payload.territory || payload.city,
        address: payload.address,
        latitude: payload.lat,
        longitude: payload.lng,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const addTerritory = async (name) => {
    try {
      await api.call("ne_taskcompass.api.setup.create_territory", { territory_name: name });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const addDesignation = async (name) => {
    try {
      await api.call("ne_taskcompass.api.setup.create_designation", { designation_name: name });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const addSalesPerson = async ({ name, territory }) => {
    try {
      await api.call("ne_taskcompass.api.setup.create_sales_person", {
        sales_person_name: name, territory,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const saveTender = async (payload) => {
    try {
      const args = {
        name: payload.name || undefined,
        title: payload.title,
        hospital: payload.hospital,
        champion_doctor: payload.champion_doctor,
        lead: payload.lead,
        stage: payload.stage,
        submission_date: payload.submission_date || null,
        po_number: payload.po_number,
        po_date: payload.po_date || null,
        supporting_document: payload.supporting_document || undefined,
        notes: payload.notes,
      };
      if (payload.items != null) args.items = JSON.stringify(payload.items);
      const doc = await api.call("ne_taskcompass.api.tenders.save_tender", args);
      await loadAll();
      return { ok: true, name: doc?.name };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteTender = async (name) => {
    try {
      await api.call("ne_taskcompass.api.tenders.delete_tender", { name });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const requestDoctorEdit = async (id, patch, meta = {}) => {
    try {
      const current = doctors.find((d) => d.id === id) || {};
      const fields = {
        doctor_name: patch.name,
        person_type: patch.personType,
        person_type_other: patch.personType === "Other" ? (patch.personTypeOther || "") : "",
        specialty: patch.specialty,
        phone: patch.phone,
        whatsapp: patch.whatsapp,
        designation: patch.designation,
        notes: patch.notes,
      };
      const currentValues = {
        doctor_name: current.name || "",
        person_type: current.personType || "",
        person_type_other: current.personTypeOther || "",
        specialty: current.specialty || "",
        phone: current.phone || "",
        whatsapp: current.whatsapp || "",
        designation: current.designation || "",
        notes: current.notes || "",
      };
      const changes = {};
      Object.entries(fields).forEach(([field, to]) => {
        const next = to == null ? "" : String(to);
        const prev = currentValues[field] == null ? "" : String(currentValues[field]);
        if (next !== prev) changes[field] = { from: prev, to: next };
      });
      if (!Object.keys(changes).length) return { ok: false, error: "Change at least one field." };
      await api.call("ne_taskcompass.api.directory.submit_edit_request", {
        doctor: id,
        changes: JSON.stringify(changes),
        reason: meta.reason || "",
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const updateDoctor = async (id, patch) => {
    try {
      await api.call("ne_taskcompass.api.directory.update_doctor", {
        name: id,
        doctor_id: id,
        doctor_name: patch.doctor_name || patch.name,
        person_type: patch.personType || patch.person_type,
        person_type_other: (patch.personType || patch.person_type) === "Other" ? (patch.personTypeOther || patch.person_type_other || "") : "",
        hospital: patch.hospital,
        hospitals: JSON.stringify(patch.hospitals || (patch.hospital ? [patch.hospital] : [])),
        city: patch.city,
        phone: patch.phone,
        whatsapp: patch.whatsapp,
        email: patch.email,
        assigned_to: patch.rep || patch.assigned_to,
        specialty: patch.specialty,
        designation: patch.designation,
        notes: patch.notes,
        image: patch.imageUrl || patch.image,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteDoctor = async (id) => {
    try {
      await api.call("ne_taskcompass.api.directory.delete_doctor", { name: id });
      await loadAll();
      return { ok: true, removed: id };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const setDoctorStatus = async (id, status) => {
    await api.call("ne_taskcompass.api.approvals.decide_doctor", { name: id, action: status });
    await loadAll();
  };

  const reviewEditRequest = async (id, decision) => {
    await api.call("ne_taskcompass.api.approvals.decide_edit", { name: id, action: decision });
    await loadAll();
    return { ok: true };
  };

  const reviewSampleOrder = async (id, status) => {
    const res = await api.call("ne_taskcompass.api.samples.decide_sample", {
      name: id, action: status, confirm_additional: 1,
    });
    await loadAll();
    return res?.ok === false ? res : { ok: true };
  };

  const assignFollowup = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.followups.assign_followup", {
        doctor: payload.doctorId || payload.doctor,
        product: payload.productId || payload.product,
        assigned_to: payload.assignedTo || payload.assignedToName || payload.rep || "",
        competitor_name: payload.competitor,
        target_share: payload.targetShare === "" || payload.targetShare == null ? null : Number(payload.targetShare),
        review_after: payload.reviewAfter || null,
        reason: payload.reason,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const setFollowupStatus = async (id, status) => {
    try {
      await api.call("ne_taskcompass.api.followups.set_followup_status", { name: id, status });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const reassignFollowup = async (id, repName) => {
    try {
      await api.call("ne_taskcompass.api.followups.reassign_followup", { name: id, assigned_to: repName });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const ownerKeys = useCallback((userName) => {
    const user = users.find((u) => u.name === userName || u.id === userName);
    return [userName, user?.id, user?.name].filter(Boolean);
  }, [users]);

  const targetsForMonth = useCallback((userName, year, month) => {
    const suffix = `::${year}-${String(month).padStart(2, "0")}`;
    for (const key of ownerKeys(userName)) {
      const rows = monthlyTargets[`${key}${suffix}`];
      if (rows?.length) return rows;
    }
    return [];
  }, [monthlyTargets, ownerKeys]);

  const assignMonthlyTargetsBulk = async (userName, { year, month, byProductId }) => {
    const lines = Object.entries(byProductId).map(([product, target_qty]) => ({ product, target_qty }));
    try {
      await api.call("ne_taskcompass.api.targets.set_monthly_targets", { salesperson: userName, year, month, lines });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const copyTargetsFromPreviousMonth = async (userName, year, month) => {
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const sourceLines = targetsForMonth(userName, prev.year, prev.month);
    const byProductId = Object.fromEntries(sourceLines.map((l) => [l.productId, l.target]));
    return assignMonthlyTargetsBulk(userName, { year, month, byProductId });
  };

  const updateMonthlyAchieved = async (userName, year, month, week, byProductId) => {
    const lines = Object.entries(byProductId).map(([product, achieved_qty]) => ({ product, achieved_qty }));
    try {
      await api.call("ne_taskcompass.api.targets.set_weekly_achieved", {
        salesperson: userName, year, month, week_of_month: week, lines,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const salesForDoctor = useCallback((doctorId) =>
    (salesByDoctor[doctorId] || []).map((p) => ({
      ...p,
      lines: p.lines || [],
      qty: (p.lines || []).reduce((n, l) => n + (l.qty || 0), 0),
      competitorQty: (p.lines || []).reduce((n, l) => n + (l.competitorQty || 0), 0),
    })),
  [salesByDoctor]);

  const schedulesFor = useCallback((doctorId) => {
    const groups = {};
    (schedules || []).filter((s) => s.doctor === doctorId).forEach((s) => {
      const hospital = s.hospital || "Hospital";
      groups[hospital] = groups[hospital] || { hospital, slots: [] };
      groups[hospital].slots.push({
        day: s.day_of_week,
        start: s.start_time,
        end: s.end_time,
        source: s.source,
      });
    });
    return Object.values(groups);
  }, [schedules]);

  const visitPermission = useCallback((doctorId) => {
    const doc = doctors.find((d) => d.id === doctorId);
    const visitsFor = (visits || []).filter((v) => v.doctorId === doctorId);
    const hasAssignment = (followups || []).some((f) => f.doctorId === doctorId && f.status === "active");
    return visitAllowance(doc, visitsFor, hasAssignment);
  }, [doctors, visits, followups]);

  const performanceForMonth = useCallback((userName, year, month) => {
    const keys = new Set(ownerKeys(userName));
    const row = scores.find((s) => keys.has(s.salesperson) && Number(s.year) === Number(year) && Number(s.month) === Number(month));
    const lines = row?.lines?.length ? row.lines.map((l) => ({
      productId: l.product, product: l.product, target: l.target || 0, achieved: l.achieved || 0,
    })) : targetsForMonth(userName, year, month);
    const pct = row?.achieved_pct ?? achievementPct(lines);
    const score = row?.score ?? 0;
    const hasData = Boolean(row?.has_data ?? lines.length);
    const monthEvents = events.filter((e) => {
      if (!keys.has(e.salesperson)) return false;
      const d = String(e.date || "");
      return d.startsWith(`${year}-${String(month).padStart(2, "0")}`);
    });
    return {
      userName, year, month, score, achievedPct: pct, lines, hasData,
      targetTotal: lines.reduce((n, l) => n + (Number(l.target) || 0), 0),
      achievedTotal: lines.reduce((n, l) => n + (Number(l.achieved) || 0), 0),
      followupPoints: row?.followup_points || 0,
      events: monthEvents,
    };
  }, [scores, targetsForMonth, ownerKeys, events]);

  const performanceHistory = useCallback((userName, count = 12) =>
    recentMonths(count).map((m) => ({
      ...m,
      ...performanceForMonth(userName, m.year, m.month),
      key: m.key,
      label: m.label,
      longLabel: m.longLabel,
      isCurrent: m.isCurrent,
    })),
  [performanceForMonth]);

  const overallPerformance = useCallback((userName, count = 12) => {
    const history = performanceHistory(userName, count).filter((h) => h.hasData);
    if (!history.length) {
      return {
        score: 0, band: { label: "At Risk" }, months: 0, achievedTotal: 0, targetTotal: 0,
        achievedPct: 0, best: null, history: [], trend: 0,
      };
    }
    const score = Math.round(history.reduce((n, h) => n + h.score, 0) / history.length);
    const achievedTotal = history.reduce((n, h) => n + (h.achievedTotal || 0), 0);
    const targetTotal = history.reduce((n, h) => n + (h.targetTotal || 0), 0);
    const best = [...history].sort((a, b) => b.score - a.score)[0];
    const newest = history[0]?.score || 0;
    const oldest = history[history.length - 1]?.score || 0;
    return {
      score,
      band: { label: score >= 70 ? "On Track" : "Needs Push" },
      history,
      months: history.length,
      achievedTotal,
      targetTotal,
      achievedPct: targetTotal ? Math.min(100, Math.round((achievedTotal / targetTotal) * 100)) : 0,
      best,
      trend: newest - oldest,
    };
  }, [performanceHistory]);

  const teamPerformance = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const seen = new Set();
    const fromScores = [];
    scores.forEach((s) => {
      if (Number(s.year) !== year || Number(s.month) !== month) return;
      if (seen.has(s.salesperson)) return;
      seen.add(s.salesperson);
      fromScores.push(s);
    });
    const list = fromScores.length ? fromScores : users.map((u) => ({ salesperson: u.id || u.name, score: 0 }));
    return list.map((s) => {
      const key = s.salesperson || s.name || "Rep";
      const user = users.find((u) => u.name === key || u.id === key);
      const monthScore = performanceForMonth(key, year, month);
      const label = user?.name || key;
      const parts = String(label).trim().split(/\s+/).filter(Boolean);
      return {
        id: user?.id || key,
        name: label,
        region: user?.region || "",
        initials: ((parts[0] || "?").slice(0, 1) + (parts[1] || "").slice(0, 1)).toUpperCase(),
        score: monthScore.score || s.score || 0,
        visits: { done: kpis.completed, planned: kpis.planned },
        achievement: monthScore.achievedPct || 0,
        band: s.band,
      };
    });
  }, [scores, users, kpis, performanceForMonth]);

  const nowPeriod = () => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };
  const targetsFor = useCallback((name) => {
    const { year, month } = nowPeriod();
    return targetsForMonth(name, year, month);
  }, [targetsForMonth]);
  const performanceFor = useCallback((name) => {
    const { year, month } = nowPeriod();
    return performanceForMonth(name, year, month).score || 0;
  }, [performanceForMonth]);
  const achievementFor = useCallback((name) => {
    const { year, month } = nowPeriod();
    return performanceForMonth(name, year, month).achievedPct || 0;
  }, [performanceForMonth]);
  const eventsFor = useCallback((name) => {
    const keys = new Set(ownerKeys(name));
    return events.filter((e) => keys.has(e.salesperson));
  }, [events, ownerKeys]);

  const followupTrendFor = useCallback((doctorId, product) => {
    const rows = salesForDoctor(doctorId).flatMap((p) =>
      (p.lines || [])
        .filter((l) => !product || l.productId === product)
        .map((l) => ({ year: p.year, month: p.month, qty: l.qty, competitorQty: l.competitorQty }))
    );
    return localTrend(rows);
  }, [salesForDoctor]);

  const pipeline = useCallback(() => pipelineRows.map((r) => ({
    doctorId: r.doctor,
    doctor: r.doctor_name || "",
    product: r.product || "",
    hospital: r.hospital || "",
    stage: r.stage,
    label: r.label,
    value: r.value,
    monthlyValue: r.value,
    annualValue: r.value != null ? Number(r.value) * 12 : 0,
    valueKnown: r.value != null,
    stalled: r.stalled,
    isLost: r.is_lost,
    atRisk: r.at_risk,
    assignedTo: r.assigned_to,
    rep: r.assigned_to,
  })), [pipelineRows]);

  const addProduct = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.create_product", {
        product_name: payload.name, category: payload.category,
        monthly_target: payload.monthlyTarget === "" ? null : payload.monthlyTarget,
        unit_price: payload.unitPrice === "" ? null : payload.unitPrice,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const updateProduct = async (id, payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.update_product", {
        name: id,
        product_name: payload.name,
        category: payload.category,
        monthly_target: payload.monthlyTarget === "" ? null : payload.monthlyTarget,
        unit_price: payload.unitPrice === "" ? null : payload.unitPrice,
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.call("ne_taskcompass.api.directory.delete_product", { name: id });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const upsertSchedule = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.directory.upsert_schedule", payload);
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteSchedule = async (name) => {
    try {
      await api.call("ne_taskcompass.api.directory.delete_schedule", { name });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const saveDayPlan = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.plans.save_plan", {
        name: payload.name,
        salesperson: payload.salesperson,
        plan_date: payload.plan_date,
        day_type: payload.day_type,
        remarks: payload.remarks,
        items: JSON.stringify(payload.items || []),
      });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteDayPlan = async (name) => {
    try {
      await api.call("ne_taskcompass.api.plans.delete_plan", { name });
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const checkinVisit = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.visits.checkin", payload);
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const checkoutVisit = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.visits.checkout", payload);
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const updateVisit = async (payload) => {
    try {
      await api.call("ne_taskcompass.api.visits.update_visit", payload);
      await loadAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };
  const approvedDoctors = doctors.filter((d) => d.status === "approved");
  const pendingDoctors = doctors.filter((d) => d.status === "pending");
  const sourceCounts = doctors.reduce((acc, d) => {
    const key = d.source || "Manual";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const value = {
    source, isSupabaseConfigured: true, liveMode: "socket", refresh: loadAll,
    doctors, approvedDoctors, pendingDoctors, products, visits, samples, tenders, users, allUsers: users, hospitals,
    sourceCounts, kpis, dayPlans, schedules, notifications,
    addDoctor, addHospital, updateHospital, updateDoctor, deleteDoctor, requestDoctorEdit, setDoctorStatus, addProduct, updateProduct, deleteProduct,
    upsertSchedule, deleteSchedule, saveDayPlan, deleteDayPlan, checkinVisit, checkoutVisit, updateVisit, addTerritory, addSalesPerson, addDesignation, saveTender, deleteTender,
    territories, designations,
    editRequests, reviewEditRequest, sampleOrders, reviewSampleOrder,
    followups, assignFollowup, setFollowupStatus, reassignFollowup, salesForDoctor,
    schedulesFor, visitPermission,
    monthlyTargets, targetsForMonth, targetsFor, eventsFor, performanceFor, achievementFor,
    assignMonthlyTargetsBulk, copyTargetsFromPreviousMonth, updateMonthlyAchieved,
    performanceForMonth, performanceHistory, overallPerformance, teamPerformance, pipeline,
    followupTrendFor,
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  return useContext(DataCtx);
}
