// Real National Enterprises data — mirrors supabase/seed.sql so the demo runs
// identically with or without a live Supabase connection.
//
// Products and monthly targets come from the client's
// "Monthly Sales Target & Quarterly Incentive Policy" sheet
// (Sales Executive: Mr. Shoaib · Territory: Islamabad · Effective 01-JUL-26).

// The three roles the client recognises, plus the honest fourth. "Unclassified"
// is what a doctor is until someone who has actually met them says otherwise;
// see backend/app/scraper/classify.py for why guessing was worse.
export const PERSON_TYPES = ["HOD", "Professor", "OT Incharge", "Other", "Unclassified"];

export const DAY_TYPES = ["Field Day", "OT Full Day", "OT Half Day"];

// Day plan composition rule: exactly 6 visits — at least 2 HOD, at least 2
// Professor, and the remaining 2 may be any of the three types.
export const PLAN_RULE = { minHOD: 2, minProfessor: 2 };

export const salesperson = {
  id: "u-shoaib",
  name: "Mr. Shoaib",
  initials: "MS",
  role: "Salesperson",
  region: "Islamabad Territory",
  email: "shoaib@nationalenterprises.com.pk",
};

export const manager = {
  id: "u-nadia",
  name: "Nadia Farooq",
  initials: "NF",
  role: "Sales Manager",
  region: "All Territories",
  email: "nadia.farooq@nationalenterprises.com.pk",
};

// 16 real products with the client's monthly targets (Pcs)
export const PRODUCTS = [
  { id: "p1",  name: "Glubran 0.5 ml",               category: "Adhesives & Sealants", monthly: 50 },
  { id: "p2",  name: "Glubran 1 ml",                 category: "Adhesives & Sealants", monthly: 50 },
  { id: "p3",  name: "ImmiSeal",                     category: "Adhesives & Sealants", monthly: 25 },
  { id: "p4",  name: "Stypcel",                      category: "Haemostats",           monthly: 700 },
  { id: "p5",  name: "Raney Clips",                  category: "Disposables",          monthly: 300 },
  { id: "p6",  name: "Perforators",                  category: "Power Tools",          monthly: 100 },
  { id: "p7",  name: "Burs",                         category: "Power Tools",          monthly: 100 },
  { id: "p8",  name: "Dura Patch (RDS/RDP)",         category: "Implants",             monthly: 25 },
  { id: "p9",  name: "Surgical Patties",             category: "Disposables",          monthly: 700 },
  { id: "p10", name: "Programmable Shunts",          category: "Shunts",               monthly: 14 },
  { id: "p11", name: "Ommaya Reservoir / Connector", category: "Shunts",               monthly: 7 },
  { id: "p12", name: "EVD",                          category: "Drainage",             monthly: 20 },
  { id: "p13", name: "VP Shunts",                    category: "Shunts",               monthly: 20 },
  { id: "p14", name: "LP Shunts",                    category: "Shunts",               monthly: 7 },
  { id: "p15", name: "Pana Spray",                   category: "Disposables",          monthly: 14 },
  { id: "p16", name: "Cotton Balls",                 category: "Disposables",          monthly: 70 },
];

export const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);

// Weekly target = monthly / 4 (rounded up). `achieved` is entered manually each week.
export const weeklyTargets = PRODUCTS.map((p, i) => ({
  productId: p.id,
  product: p.name,
  target: Math.ceil(p.monthly / 4),
  achieved: [7, 5, 3, 120, 44, 18, 12, 4, 160, 2, 1, 3, 4, 1, 2, 14][i],
}));

export const HOSPITALS = [
  { id: "h1", name: "Shifa International Hospital", city: "Islamabad" },
  { id: "h2", name: "Pakistan Institute of Medical Sciences (PIMS)", city: "Islamabad" },
  { id: "h3", name: "Maroof International Hospital", city: "Islamabad" },
  { id: "h4", name: "KRL Hospital", city: "Islamabad" },
  { id: "h5", name: "Combined Military Hospital (CMH)", city: "Rawalpindi" },
  { id: "h6", name: "Benazir Bhutto Hospital", city: "Rawalpindi" },
  { id: "h7", name: "Holy Family Hospital", city: "Rawalpindi" },
  { id: "h8", name: "Ali Medical Centre", city: "Islamabad" },
];

// Only HOD / Professor / OT Incharge are allowed (client rule 3).
export const DOCTORS = [
  { id: "d1",  name: "Prof. Dr. Tariq Salahuddin", personType: "HOD",         specialty: "Neurosurgery",      hospital: "Shifa International Hospital", city: "Islamabad",  rep: "Mr. Shoaib",  status: "approved", phone: "+92 300 8001122" },
  { id: "d2",  name: "Prof. Dr. Anwar ul Haq",     personType: "Professor",   specialty: "Neurosurgery",      hospital: "Shifa International Hospital", city: "Islamabad",  rep: "Mr. Shoaib",  status: "approved", phone: "+92 300 8001123" },
  { id: "d3",  name: "Dr. Saima Nawaz",            personType: "OT Incharge", specialty: "Operation Theatre", hospital: "Shifa International Hospital", city: "Islamabad",  rep: "Mr. Shoaib",  status: "approved", phone: "+92 300 8001124" },
  { id: "d4",  name: "Prof. Dr. Muhammad Ashraf",  personType: "HOD",         specialty: "Neurosurgery",      hospital: "Pakistan Institute of Medical Sciences (PIMS)", city: "Islamabad", rep: "Mr. Shoaib", status: "approved", phone: "+92 300 8002211" },
  { id: "d5",  name: "Prof. Dr. Nadeem Akhtar",    personType: "Professor",   specialty: "Neurosurgery",      hospital: "Pakistan Institute of Medical Sciences (PIMS)", city: "Islamabad", rep: "Mr. Shoaib", status: "approved", phone: "+92 300 8002212" },
  { id: "d6",  name: "Dr. Rukhsana Bibi",          personType: "OT Incharge", specialty: "Operation Theatre", hospital: "Pakistan Institute of Medical Sciences (PIMS)", city: "Islamabad", rep: "Mr. Shoaib", status: "approved", phone: "+92 300 8002213" },
  { id: "d7",  name: "Prof. Dr. Zahid Mahmood",    personType: "HOD",         specialty: "Neurosurgery",      hospital: "Maroof International Hospital", city: "Islamabad", rep: "Sana Yousaf", status: "approved", phone: "+92 300 8003311" },
  { id: "d8",  name: "Prof. Dr. Ayesha Siddiqa",   personType: "Professor",   specialty: "Spinal Surgery",    hospital: "Maroof International Hospital", city: "Islamabad", rep: "Sana Yousaf", status: "approved", phone: "+92 300 8003312" },
  { id: "d9",  name: "Dr. Imran Yousafzai",        personType: "OT Incharge", specialty: "Operation Theatre", hospital: "KRL Hospital",                  city: "Islamabad", rep: "Sana Yousaf", status: "approved", phone: "+92 300 8004411" },
  { id: "d10", name: "Prof. Dr. Khalid Mehmood",   personType: "HOD",         specialty: "Neurosurgery",      hospital: "Combined Military Hospital (CMH)", city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8005511" },
  { id: "d11", name: "Prof. Dr. Sohail Abbas",     personType: "Professor",   specialty: "Neurosurgery",      hospital: "Combined Military Hospital (CMH)", city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8005512" },
  { id: "d12", name: "Dr. Farhana Kausar",         personType: "OT Incharge", specialty: "Operation Theatre", hospital: "Combined Military Hospital (CMH)", city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8005513" },
  { id: "d13", name: "Prof. Dr. Asif Raza",        personType: "HOD",         specialty: "Neurosurgery",      hospital: "Benazir Bhutto Hospital",       city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8006611" },
  { id: "d14", name: "Prof. Dr. Shahid Nazir",     personType: "Professor",   specialty: "Neurosurgery",      hospital: "Holy Family Hospital",          city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8007711" },
  { id: "d15", name: "Dr. Nasreen Akhtar",         personType: "OT Incharge", specialty: "Operation Theatre", hospital: "Holy Family Hospital",          city: "Rawalpindi", rep: "Ahmed Raza", status: "approved", phone: "+92 300 8007712" },
  { id: "d16", name: "Prof. Dr. Waseem Ahmed",     personType: "Professor",   specialty: "Neurosurgery",      hospital: "Ali Medical Centre",            city: "Islamabad",  rep: "Sana Yousaf", status: "approved", phone: "+92 300 8008811" },
  // Added from the mobile app — waiting for admin approval (rule 4)
  { id: "d17", name: "Prof. Dr. Junaid Rasheed",   personType: "Professor",   specialty: "Neurosurgery",      hospital: "Ali Medical Centre",            city: "Islamabad",  rep: "Mr. Shoaib", status: "pending", phone: "+92 300 8008812" },
  { id: "d18", name: "Dr. Mehwish Tariq",          personType: "OT Incharge", specialty: "Operation Theatre", hospital: "KRL Hospital",                  city: "Islamabad",  rep: "Mr. Shoaib", status: "pending", phone: "+92 300 8004412" },
];

// Visit history — drives the 3-visit rule and "new product each visit" rule.
// stage 1 = brochure/catalog, 2 = demonstration, 3 = outcome.
export const visitHistorySeed = [
  { id: "vh1", doctorId: "d1", product: "Stypcel",            visitNumber: 3, brochure: true, demo: true, outcome: "Will Buy",         date: "18 Jul 2026" },
  { id: "vh2", doctorId: "d1", product: "Raney Clips",        visitNumber: 1, brochure: true, demo: false, outcome: null,              date: "21 Jul 2026" },
  { id: "vh3", doctorId: "d2", product: "Glubran 1 ml",       visitNumber: 2, brochure: true, demo: true, outcome: null,               date: "20 Jul 2026" },
  { id: "vh4", doctorId: "d4", product: "Programmable Shunts",visitNumber: 3, brochure: true, demo: true, outcome: "Sample Requested", date: "17 Jul 2026" },
  { id: "vh5", doctorId: "d5", product: "Surgical Patties",   visitNumber: 1, brochure: true, demo: false, outcome: null,              date: "22 Jul 2026" },
  { id: "vh6", doctorId: "d3", product: "Cotton Balls",       visitNumber: 3, brochure: true, demo: true, outcome: "Refused",          date: "15 Jul 2026" },
];

// Samples — a doctor may only ever receive ONE sample (rule 9).
export const sampleSeed = [
  {
    id: "s1", doctorId: "d4", doctor: "Prof. Dr. Muhammad Ashraf", product: "Programmable Shunts",
    qty: 1, status: "Issued", date: "18 Jul 2026", rep: "Mr. Shoaib",
    review: "Shunt performed well in a paediatric hydrocephalus case; valve settings held.",
    interest: "High", usageDate: "26 Jul 2026", stampedDoc: "stamped-review-ashraf.jpg",
  },
  {
    id: "s2", doctorId: "d10", doctor: "Prof. Dr. Khalid Mehmood", product: "Dura Patch (RDS/RDP)",
    qty: 1, status: "Approved", date: "21 Jul 2026", rep: "Ahmed Raza",
    review: null, interest: null, usageDate: null, stampedDoc: null,
  },
];

export const tenderSeed = [
  { id: "t1", title: "PIMS — Annual Shunt & Drainage Supply", hospital: "Pakistan Institute of Medical Sciences (PIMS)", lead: "Mr. Shoaib", value: 3200000, stage: "Submitted", submissionDate: "30 Jul 2026", notes: "Technical bid submitted; awaiting opening." },
  { id: "t2", title: "CMH Rawalpindi — Neuro Consumables Rate Contract", hospital: "Combined Military Hospital (CMH)", lead: "Ahmed Raza", value: 1850000, stage: "Documents Prepared", submissionDate: "06 Aug 2026", notes: "Awaiting affidavit and sample submission." },
  { id: "t3", title: "Shifa International — Dura Patch Supply", hospital: "Shifa International Hospital", lead: "Mr. Shoaib", value: 940000, stage: "Technical Evaluation", submissionDate: "26 Jul 2026", notes: "Committee reviewing technical compliance." },
];

export const TENDER_STAGES = ["Identified", "Submitted", "Won", "Lost", "Closed"];

// Performance penalties / credits (rules 14–16)
export const performanceEvents = [
  { id: "pe1", kind: "Late visit",     points: -5, note: "Arrived 40 min late at PIMS",                       date: "21 Jul 2026" },
  { id: "pe2", kind: "Wrong location", points: -8, note: "Check-in recorded 2.1 km away from Shifa International", date: "20 Jul 2026" },
  { id: "pe3", kind: "Target hit",     points:  5, note: "Weekly Stypcel target exceeded",                     date: "22 Jul 2026" },
];

/** Weekly achievement % across all product lines. */
export function targetAchievementPct(lines = weeklyTargets) {
  const t = lines.reduce((s, l) => s + l.target, 0);
  const a = lines.reduce((s, l) => s + Math.min(l.achieved, l.target), 0);
  return t === 0 ? 0 : Math.round((a / t) * 100);
}

/**
 * Overall performance out of 100 (rules 14–16):
 *   70% weight on weekly target achievement,
 *   30% weight on visit completion,
 *   then penalty/credit points from performance events are applied.
 */
export function performanceScore({ lines = weeklyTargets, visitsDone = 5, visitsPlanned = 6, events = performanceEvents } = {}) {
  const targetPart = targetAchievementPct(lines) * 0.7;
  const visitPart = (visitsPlanned ? (visitsDone / visitsPlanned) * 100 : 0) * 0.3;
  const adjustment = events.reduce((s, e) => s + e.points, 0);
  const raw = targetPart + visitPart + adjustment;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
