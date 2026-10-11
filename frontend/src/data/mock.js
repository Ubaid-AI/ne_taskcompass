// All data on this page is illustrative demo data for client presentation only.

export const salesperson = {
  name: "Ahmed Raza",
  initials: "AR",
  role: "Salesperson",
  region: "Islamabad / Rawalpindi Region",
  email: "ahmed.raza@nationalenterprises.com.pk",
};

export const manager = {
  name: "Nadia Farooq",
  initials: "NF",
  role: "Sales Manager",
  region: "All Territories",
  email: "nadia.farooq@nationalenterprises.com.pk",
};

export const PRODUCTS = [
  "Neuro-Surgical Clamp (v4.2)",
  "Micro-Drill Kit",
  "Spinal Mesh 02",
  "Cranial Fixation Plate",
  "Dural Sealant Patch",
  "Aneurysm Clip Set",
  "Endoscopic Burr Kit",
  "Bone Wax Sachets",
];

export const DOCTORS = [
  { id: "d1", name: "Dr. Ayesha Khan", hospital: "Shifa International Hospital", city: "Islamabad" },
  { id: "d2", name: "Dr. Bilal Ahmed", hospital: "Aga Khan University Hospital", city: "Karachi" },
  { id: "d3", name: "Dr. Fatima Sheikh", hospital: "Jinnah Postgraduate Medical Centre", city: "Karachi" },
  { id: "d4", name: "Dr. Hassan Raza", hospital: "Services Hospital", city: "Lahore" },
  { id: "d5", name: "Dr. Zainab Qureshi", hospital: "Lahore General Hospital", city: "Lahore" },
  { id: "d6", name: "Dr. Imran Siddiqui", hospital: "Combined Military Hospital", city: "Rawalpindi" },
];

export const PIPELINE_STAGES = [
  "Initial Visit", "Product Discussion", "Product Demonstration", "Trial Planned",
  "Trial Completed", "Clinical Evaluation", "Purchase Committee", "Tender Opportunity",
  "Tender Submitted", "Order Expected", "Order Received", "Closed Won", "Closed Lost",
];

export const morningPlanDoctors = [
  { id: "d1", name: "Dr. Ayesha Khan", hospital: "Shifa International Hospital · Islamabad", checked: true },
  { id: "d2", name: "Dr. Bilal Ahmed", hospital: "Aga Khan University Hospital · Karachi", checked: true },
  { id: "d5", name: "Dr. Zainab Qureshi", hospital: "Lahore General Hospital · Lahore", checked: false },
];

export const todaySchedule = [
  { id: "v1", time: "09:30 AM", doctor: "Dr. Ayesha Khan", hospital: "Shifa International Hospital", location: "Islamabad", status: "Pending", assignedBy: "Nadia Farooq · Sales Manager", product: "Neuro-Surgical Clamp (v4.2)" },
  { id: "v2", time: "11:00 AM", doctor: "Dr. Bilal Ahmed", hospital: "Aga Khan University Hospital · OT 4", location: "Karachi", status: "Pending" },
  { id: "v3", time: "01:45 PM", doctor: "Dr. Hassan Raza", hospital: "Services Hospital", location: "Lahore", status: "Locked", lockedBy: "Nadia Farooq (Lahore Region)" },
  { id: "v4", time: "03:00 PM", doctor: "Dr. Fatima Sheikh", hospital: "Jinnah Postgraduate Medical Centre", location: "Karachi", status: "Pending", assignedBy: "Nadia Farooq · Sales Manager", product: "Aneurysm Clip Set" },
];

// Tasks pushed to the salesperson from the portal by a manager (SRS §6).
export const adminAssignedTasks = todaySchedule.filter((v) => v.assignedBy);

export const sampleRequestsSeed = [
  { id: "s1", product: "Micro-Drill Kit", doctor: "Dr. Ayesha Khan", qty: 1, status: "Pending", date: "22 Jul 2026" },
  { id: "s2", product: "Spinal Mesh 02", doctor: "Dr. Fatima Sheikh", qty: 2, status: "Approved", date: "20 Jul 2026" },
  { id: "s3", product: "Cranial Fixation Plate", doctor: "Dr. Hassan Raza", qty: 1, status: "Rejected", date: "18 Jul 2026" },
];

export const teamReps = [
  { id: "r1", name: "Bilal Hussain", initials: "BH", region: "Lahore Region", status: "On Route", visits: "4/6", lat: 31.52, lng: 74.35 },
  { id: "r2", name: "Kamran Iqbal", initials: "KI", region: "Karachi Region", status: "GPS Disabled", visits: "2/5", lat: 24.86, lng: 67.00 },
  { id: "r3", name: "Sana Yousaf", initials: "SY", region: "Islamabad Region", status: "Active", visits: "6/6", lat: 33.68, lng: 73.05 },
  { id: "r4", name: "Nadia Farooq", initials: "NF", region: "Lahore Region", status: "On Route", visits: "3/7", lat: 31.55, lng: 74.32 },
  { id: "r5", name: "Ahmed Raza", initials: "AR", region: "Rawalpindi Region", status: "Active", visits: "3/4", lat: 33.60, lng: 73.07 },
];

export const scheduleTable = [
  { rep: "Nadia Farooq", doctor: "Dr. Ayesha Khan", time: "09:30 AM", status: "Pending" },
  { rep: "Sana Yousaf", doctor: "Dr. Bilal Ahmed", time: "11:00 AM", status: "In Progress" },
  { rep: "Kamran Iqbal", doctor: "Dr. Hassan Raza", time: "01:45 PM", status: "Locked" },
  { rep: "Bilal Hussain", doctor: "Dr. Fatima Sheikh", time: "03:00 PM", status: "Done" },
  { rep: "Ahmed Raza", doctor: "Dr. Imran Siddiqui", time: "04:15 PM", status: "Pending" },
];

export const approvalsSeed = [
  { id: "a1", kind: "Doctor Correction", title: "Timing correction for Dr. Imran Siddiqui", detail: "Submitted by Ahmed Raza · Combined Military Hospital, Rawalpindi" },
  { id: "a2", kind: "Sample Request", title: "Cranial Fixation Plate ×1 for Dr. Hassan Raza", detail: "Requested by Bilal Hussain · Services Hospital, Lahore" },
  { id: "a3", kind: "Schedule Exception", title: "Reassign Dr. Zainab Qureshi", detail: "Requested by Sana Yousaf · Lahore General Hospital" },
];

export const notificationsSeed = [
  { id: "n1", tag: "GPS", title: "GPS disabled — Kamran Iqbal, Karachi Region", time: "2 min ago", statusColor: "danger" },
  { id: "n2", tag: "MISSED", title: "Missed visit — Dr. Sana Malik not visited by Sana Yousaf", time: "18 min ago", statusColor: "danger" },
  { id: "n3", tag: "NEW DOCTOR", title: "New doctor request — Dr. Imran Siddiqui submitted by Ahmed Raza", time: "40 min ago", statusColor: "info" },
  { id: "n4", tag: "FOLLOW-UP", title: "Follow-up overdue — Dr. Zainab Qureshi, 3 days", time: "1 hr ago", statusColor: "warning" },
  { id: "n5", tag: "SAMPLES", title: "2 sample requests awaiting review", time: "2 hr ago", statusColor: "warning" },
];

export const visitsPerDay = [
  { label: "Mon", value: 28 }, { label: "Tue", value: 34 }, { label: "Wed", value: 31 },
  { label: "Thu", value: 40 }, { label: "Fri", value: 36 }, { label: "Sat", value: 19 },
];

export const topDoctorsByDiscussion = [
  { name: "Dr. Ayesha Khan", value: 14 },
  { name: "Dr. Bilal Ahmed", value: 11 },
  { name: "Dr. Hassan Raza", value: 9 },
  { name: "Dr. Fatima Sheikh", value: 8 },
];

export const kpis = {
  planned: 214,
  completed: 168,
  missed: 9,
  activeReps: 47,
  pendingFollowUps: 12,
  pendingSamples: 5,
};

// NOTE: the doctor and hospital lists that used to live here have been removed.
// The portal and the mobile app now read the real directory (131 doctors, 112
// hospitals imported from Marham and Oladoc) from Supabase via DataContext.
// Local fallback data lives in neData.js.

// Full daily route + attendance + history per field rep, used by the portal
// Worker Detail view. x/y are percentage positions for the route sketch (SVG).
export const repDetails = {
  r1: {
    checkIn: "08:52 AM", checkOut: "—", distanceKm: 34, gps: "Active",
    route: [
      { n: 1, time: "09:10", doctor: "Dr. Hassan Raza", hospital: "Services Hospital", status: "Done", x: 12, y: 44 },
      { n: 2, time: "11:20", doctor: "Dr. Zainab Qureshi", hospital: "Lahore General Hospital", status: "Done", x: 34, y: 20 },
      { n: 3, time: "01:30", doctor: "Dr. Usman Tariq", hospital: "Doctors Hospital", status: "In Progress", x: 60, y: 38 },
      { n: 4, time: "03:15", doctor: "Dr. Kamran Butt", hospital: "Hameed Latif Hospital", status: "Pending", x: 86, y: 22 },
    ],
    history: ["Checked in at Services Hospital, 09:10", "Sample issued: Spinal Mesh 02 to Dr. Hassan Raza", "Call report submitted for Dr. Zainab Qureshi", "En route to Doctors Hospital"],
  },
  r2: {
    checkIn: "09:05 AM", checkOut: "—", distanceKm: 12, gps: "Disabled",
    route: [
      { n: 1, time: "09:40", doctor: "Dr. Bilal Ahmed", hospital: "Aga Khan University Hospital", status: "Done", x: 16, y: 30 },
      { n: 2, time: "11:50", doctor: "Dr. Fatima Sheikh", hospital: "Jinnah Postgraduate Medical Centre", status: "In Progress", x: 52, y: 46 },
    ],
    history: ["Checked in at AKUH, 09:40", "GPS turned off at 11:05 — management alerted", "Call report pending for Dr. Fatima Sheikh"],
  },
  r3: {
    checkIn: "08:40 AM", checkOut: "04:10 PM", distanceKm: 41, gps: "Active",
    route: [
      { n: 1, time: "09:00", doctor: "Dr. Ayesha Khan", hospital: "Shifa International Hospital", status: "Done", x: 10, y: 40 },
      { n: 2, time: "11:00", doctor: "Dr. Sana Malik", hospital: "PIMS", status: "Done", x: 40, y: 24 },
      { n: 3, time: "01:30", doctor: "Dr. Ayesha Khan", hospital: "Shifa International (follow-up)", status: "Done", x: 66, y: 44 },
      { n: 4, time: "03:20", doctor: "Dr. Waseem Akhtar", hospital: "Maroof International", status: "Done", x: 90, y: 28 },
    ],
    history: ["Full day completed — 6/6 visits", "2 samples issued", "3 call reports submitted", "Checked out 04:10 PM"],
  },
  r4: {
    checkIn: "09:15 AM", checkOut: "—", distanceKm: 22, gps: "Active",
    route: [
      { n: 1, time: "09:45", doctor: "Dr. Hassan Raza", hospital: "Services Hospital", status: "Done", x: 14, y: 36 },
      { n: 2, time: "12:10", doctor: "Dr. Zainab Qureshi", hospital: "Lahore General Hospital", status: "In Progress", x: 58, y: 30 },
    ],
    history: ["Checked in at Services Hospital, 09:45", "Call report submitted for Dr. Hassan Raza", "En route to Lahore General"],
  },
  r5: {
    checkIn: "08:58 AM", checkOut: "—", distanceKm: 27, gps: "Active",
    route: [
      { n: 1, time: "09:30", doctor: "Dr. Imran Siddiqui", hospital: "Combined Military Hospital", status: "Done", x: 12, y: 42 },
      { n: 2, time: "11:40", doctor: "Dr. Imran Siddiqui", hospital: "CMH — Clinical eval", status: "In Progress", x: 46, y: 22 },
      { n: 3, time: "02:00", doctor: "Dr. Tariq Mehmood", hospital: "Benazir Bhutto Hospital", status: "Pending", x: 82, y: 40 },
    ],
    history: ["Checked in at CMH, 09:30", "Clinical evaluation report collected", "Sample feedback recorded from Dr. Imran"],
  },
};

// The logged-in salesperson's own route for the mobile "On the Road" screen.
export const todayRoute = [
  { n: 1, time: "09:30", label: "Dr. Ayesha Khan · Shifa Int'l", status: "Done", x: 12, y: 44 },
  { n: 2, time: "11:00", label: "Dr. Bilal Ahmed · AKUH", status: "In Progress", x: 42, y: 24 },
  { n: 3, time: "01:45", label: "Dr. Hassan Raza · Services", status: "Pending", x: 66, y: 46 },
  { n: 4, time: "03:00", label: "Dr. Fatima Sheikh · JPMC", status: "Pending", x: 90, y: 26 },
];

// Doctor feedback on samples that were issued (SRS §8) — shown on the portal,
// captured by the salesperson on the mobile app.
export const sampleFeedbackSeed = [
  { id: "sf1", product: "Spinal Mesh 02", doctor: "Dr. Hassan Raza", rep: "Bilal Hussain", interest: "High", usageDate: "28 Jul 2026", review: "Impressed with mesh flexibility; plans to use in an upcoming laminectomy case.", date: "Today" },
  { id: "sf2", product: "Micro-Drill Kit", doctor: "Dr. Bilal Ahmed", rep: "Kamran Iqbal", interest: "Medium", usageDate: "02 Aug 2026", review: "Wants to compare torque against current kit before committing.", date: "1 day ago" },
];

export const aiSuggestedQuestions = [
  "Which salesperson completed the highest number of visits today?",
  "Which hospital has the maximum product discussions this month?",
  "Which doctors require follow-up this week?",
];

export function answerAiQuestion(q) {
  const query = q.toLowerCase();
  if (query.includes("highest") && query.includes("visit")) {
    return "Sana Yousaf completed the highest number of visits today with 6 out of 6 scheduled — 100% completion in the Islamabad region.";
  }
  if (query.includes("hospital") && query.includes("discussion")) {
    return "Aga Khan University Hospital has the maximum product discussions this month with 34 logged discussions, followed by Shifa International Hospital (29).";
  }
  if (query.includes("follow-up") || query.includes("followup")) {
    return "3 doctors require follow-up this week: Dr. Zainab Qureshi (3 days overdue), Dr. Imran Siddiqui (due Friday), and Dr. Hassan Raza (Purchase Committee review pending).";
  }
  if (query.includes("territory") || query.includes("performance")) {
    return "Islamabad Region is currently the top-performing territory this month at 92% schedule completion, ahead of Lahore (81%) and Karachi (74%, impacted by 1 GPS-disabled rep).";
  }
  return "Based on current field data: 168 of 214 planned visits completed this month (78%), 12 follow-ups pending, and 5 sample requests awaiting approval. Ask me about a specific rep, doctor, hospital or territory for a detailed breakdown.";
}
