// Field force roster and per-person performance factors.
// Used as the local fallback and to keep names/ids consistent with Supabase.

export const FIELD_USERS = [
  { id: "u-shoaib", name: "Mr. Shoaib",    initials: "MS", role: "Salesperson",  region: "Islamabad Territory",  email: "shoaib@nationalenterprises.com.pk",        factor: 0.82 },
  { id: "u-ahmed",  name: "Ahmed Raza",    initials: "AR", role: "Salesperson",  region: "Rawalpindi Territory", email: "ahmed.raza@nationalenterprises.com.pk",    factor: 0.64 },
  { id: "u-sana",   name: "Sana Yousaf",   initials: "SY", role: "Salesperson",  region: "Islamabad Territory",  email: "sana.yousaf@nationalenterprises.com.pk",   factor: 0.95 },
  { id: "u-bilal",  name: "Bilal Hussain", initials: "BH", role: "Salesperson",  region: "Lahore Territory",     email: "bilal.hussain@nationalenterprises.com.pk", factor: 0.71 },
  { id: "u-kamran", name: "Kamran Iqbal",  initials: "KI", role: "Salesperson",  region: "Karachi Territory",    email: "kamran.iqbal@nationalenterprises.com.pk",  factor: 0.48 },
];

// Field reps added in migration 003. Kept here too so the login screen still
// lists everyone when the app is running on bundled data.
export const EXTRA_FIELD_USERS = [
  { id: "u-usman",  name: "Usman Tariq",  initials: "UT", role: "Salesperson", region: "Faisalabad Territory", email: "usman.tariq@nationalenterprises.com.pk",  factor: 0.77 },
  { id: "u-hina",   name: "Hina Zafar",   initials: "HZ", role: "Salesperson", region: "Multan Territory",     email: "hina.zafar@nationalenterprises.com.pk",   factor: 0.88 },
  { id: "u-adnan",  name: "Adnan Sheikh", initials: "AS", role: "Salesperson", region: "Peshawar Territory",   email: "adnan.sheikh@nationalenterprises.com.pk", factor: 0.59 },
  { id: "u-fatima", name: "Fatima Noor",  initials: "FN", role: "Salesperson", region: "Karachi Territory",    email: "fatima.noor@nationalenterprises.com.pk",  factor: 0.91 },
];

export const MANAGER = {
  id: "u-nadia", name: "Nadia Farooq", initials: "NF",
  role: "Sales Manager", region: "All Territories",
  email: "nadia.farooq@nationalenterprises.com.pk",
};

// Everyone who can sign in to the management portal.
export const ADMIN_USERS = [
  { id: "u-zubair", name: "Zubair Ahmed",  initials: "ZA", role: "Super Admin",    region: "National",        email: "zubair@nationalenterprises.com.pk",        canDelete: true },
  { id: "u-mgmt",   name: "NE Management", initials: "NE", role: "Management",     region: "All Territories", email: "admin@nationalenterprises.com.pk",         canDelete: true },
  { id: "u-imran",  name: "Imran Qureshi", initials: "IQ", role: "Management",     region: "All Territories", email: "imran.qureshi@nationalenterprises.com.pk", canDelete: false },
  { id: "u-nadia",  name: "Nadia Farooq",  initials: "NF", role: "Sales Manager",  region: "All Territories", email: "nadia.farooq@nationalenterprises.com.pk",  canDelete: false },
  { id: "u-ayesha", name: "Ayesha Malik",  initials: "AM", role: "Sales Manager",  region: "North Region",    email: "ayesha.malik@nationalenterprises.com.pk",  canDelete: false },
];

// Shared demo sign in code. This is a walkthrough convenience so the client can
// step through every role, not authentication. A real deployment uses Supabase
// Auth with hashed passwords and this constant disappears.
export const DEMO_PASSCODE = "ne2026";

/** Everyone with a login, field team first. */
export const ALL_LOGINS = [
  ...FIELD_USERS.map((u) => ({ ...u, kind: "field" })),
  ...EXTRA_FIELD_USERS.map((u) => ({ ...u, kind: "field" })),
  ...ADMIN_USERS.map((u) => ({ ...u, kind: "admin" })),
];

// Location / punctuality events per rep — these drive the negative marking.
export const EVENTS_BY_USER = {
  "Mr. Shoaib": [
    { id: "e1", kind: "Late visit",     points: -5, note: "Arrived 40 min late at PIMS",                     date: "21 Jul 2026" },
    { id: "e2", kind: "Target hit",     points:  5, note: "Weekly Stypcel target exceeded",                  date: "22 Jul 2026" },
  ],
  "Ahmed Raza": [
    { id: "e3", kind: "Wrong location", points: -8, note: "Check-in 2.1 km away from CMH Rawalpindi",        date: "20 Jul 2026" },
    { id: "e4", kind: "Late visit",     points: -5, note: "Late check-in at Holy Family",                    date: "22 Jul 2026" },
  ],
  "Sana Yousaf": [
    { id: "e5", kind: "Target hit",     points:  6, note: "All Islamabad visits completed on time",          date: "22 Jul 2026" },
  ],
  "Bilal Hussain": [
    { id: "e6", kind: "Missed visit",   points: -10, note: "Planned visit to Doctors Hospital not completed", date: "21 Jul 2026" },
  ],
  "Kamran Iqbal": [
    { id: "e7", kind: "GPS disabled",   points: -12, note: "GPS disabled for 1h 20m during duty hours",       date: "22 Jul 2026" },
    { id: "e8", kind: "Wrong location", points:  -8, note: "Visit logged 3.4 km from Burhani Hospital",       date: "21 Jul 2026" },
  ],
};

// Attendance + GPS route for the day, keyed by salesperson name.
export const FIELD_DAY_BY_USER = {
  "Mr. Shoaib": {
    checkIn: "08:58 AM", checkOut: "—", distanceKm: 27, gps: "Active", status: "On Route",
    route: [
      { n: 1, time: "09:30", doctor: "Prof. Dr. Muhammad Ashraf", hospital: "PIMS", status: "Done", x: 12, y: 42 },
      { n: 2, time: "11:15", doctor: "Prof. Dr. Tariq Salahuddin", hospital: "Shifa International", status: "Done", x: 38, y: 22 },
      { n: 3, time: "01:40", doctor: "Prof. Dr. Salman Asghar", hospital: "Muhammad Medical Complex", status: "In Progress", x: 64, y: 44 },
      { n: 4, time: "03:20", doctor: "Dr. Saima Nawaz", hospital: "Shifa International", status: "Pending", x: 88, y: 26 },
    ],
    history: [
      "Checked in at PIMS, 09:30",
      "Visit 3 of 3 completed for Stypcel — outcome: Will Buy",
      "Sample issued: Programmable Shunts to Prof. Dr. Muhammad Ashraf",
      "Arrived 40 min late at PIMS (−5 points)",
    ],
  },
  "Ahmed Raza": {
    checkIn: "09:15 AM", checkOut: "—", distanceKm: 22, gps: "Active", status: "On Route",
    route: [
      { n: 1, time: "09:45", doctor: "Prof. Dr. Khalid Mehmood", hospital: "CMH Rawalpindi", status: "Done", x: 14, y: 36 },
      { n: 2, time: "12:10", doctor: "Prof. Dr. Asif Raza", hospital: "Benazir Bhutto Hospital", status: "In Progress", x: 58, y: 30 },
      { n: 3, time: "02:45", doctor: "Prof. Dr. Shahid Nazir", hospital: "Holy Family Hospital", status: "Pending", x: 86, y: 46 },
    ],
    history: [
      "Checked in at CMH, 09:45",
      "Check-in recorded 2.1 km from CMH Rawalpindi (−8 points)",
      "Late check-in at Holy Family (−5 points)",
    ],
  },
  "Sana Yousaf": {
    checkIn: "08:40 AM", checkOut: "04:10 PM", distanceKm: 41, gps: "Active", status: "Active",
    route: [
      { n: 1, time: "09:00", doctor: "Prof. Dr. Zahid Mahmood", hospital: "Maroof International", status: "Done", x: 10, y: 40 },
      { n: 2, time: "11:00", doctor: "Dr. Imran Yousafzai", hospital: "KRL Hospital", status: "Done", x: 36, y: 22 },
      { n: 3, time: "01:30", doctor: "Prof. Dr. Ayesha Siddiqa", hospital: "Maroof International", status: "Done", x: 62, y: 44 },
      { n: 4, time: "03:20", doctor: "Prof. Dr. Waseem Ahmed", hospital: "Ali Medical Centre", status: "Done", x: 90, y: 26 },
    ],
    history: [
      "Full day completed — 6 of 6 visits",
      "All Islamabad visits completed on time (+6 points)",
      "3 call reports submitted",
      "Checked out 04:10 PM",
    ],
  },
  "Bilal Hussain": {
    checkIn: "08:52 AM", checkOut: "—", distanceKm: 34, gps: "Active", status: "On Route",
    route: [
      { n: 1, time: "09:10", doctor: "Prof. Dr. Khalid Hussain", hospital: "Doctors Hospital", status: "Done", x: 12, y: 44 },
      { n: 2, time: "11:20", doctor: "Assoc. Prof. Talha Abbas Awan", hospital: "Ammar Medical Complex", status: "Done", x: 34, y: 20 },
      { n: 3, time: "01:30", doctor: "Prof. Dr. Shahzad Shams", hospital: "Omar Medical & Cardiac Center", status: "In Progress", x: 60, y: 38 },
      { n: 4, time: "03:15", doctor: "Dr. Waqas Mehdi", hospital: "Mid City Hospital", status: "Pending", x: 86, y: 22 },
    ],
    history: [
      "Checked in at Doctors Hospital, 09:10",
      "Planned visit to Doctors Hospital not completed (−10 points)",
      "Call report submitted for Assoc. Prof. Talha Abbas Awan",
    ],
  },
  "Kamran Iqbal": {
    checkIn: "09:05 AM", checkOut: "—", distanceKm: 12, gps: "Disabled", status: "GPS Disabled",
    route: [
      { n: 1, time: "09:40", doctor: "Assist. Prof. Dr. Bashir Ahmad Khan", hospital: "South City Hospital", status: "Done", x: 16, y: 30 },
      { n: 2, time: "11:50", doctor: "Dr. Muhammad Naseem Uddin", hospital: "Marium General Hospital", status: "In Progress", x: 52, y: 46 },
    ],
    history: [
      "Checked in at South City Hospital, 09:40",
      "GPS disabled for 1h 20m during duty hours (−12 points)",
      "Visit logged 3.4 km from Burhani Hospital (−8 points)",
      "Call report pending",
    ],
  },
};

export const VISITS_BY_USER = {
  "Mr. Shoaib":    { done: 5, planned: 6 },
  "Ahmed Raza":    { done: 4, planned: 6 },
  "Sana Yousaf":   { done: 6, planned: 6 },
  "Bilal Hussain": { done: 4, planned: 6 },
  "Kamran Iqbal":  { done: 3, planned: 6 },
};

/**
 * Overall performance out of 100 for one salesperson.
 *   70% weekly target achievement + 30% visit completion, then
 *   location/punctuality points are applied (rules 14-16).
 */
export function scoreFor({ targetPct = 0, visits = { done: 0, planned: 6 }, events = [] }) {
  const targetPart = targetPct * 0.7;
  const visitPart = (visits.planned ? (visits.done / visits.planned) * 100 : 0) * 0.3;
  const adjust = events.reduce((s, e) => s + e.points, 0);
  return Math.max(0, Math.min(100, Math.round(targetPart + visitPart + adjust)));
}

export function bandFor(score) {
  if (score >= 85) return { label: "Excellent", tone: "text-success-fg", bg: "bg-success-bg", ring: "#22a35f" };
  if (score >= 70) return { label: "On track",  tone: "text-brand-700",  bg: "bg-brand-50",   ring: "#0c806f" };
  if (score >= 50) return { label: "Needs focus", tone: "text-warning-fg", bg: "bg-warning-bg", ring: "#c9820c" };
  return { label: "Critical", tone: "text-danger-fg", bg: "bg-danger-bg", ring: "#d14747" };
}
