# NE LiveTrack & TaskCompass — Staff User Guide

National Enterprises field CRM for the neurosurgery range.

Use this to run the system and to train the next manager or salesperson. Read it **in order** the first time. If you skip a step, later screens look empty and people think the software is broken.

The live copy is also inside the portal: **LiveTrack → User Guide** (`/livetrack#/dashboard/guide`). Print or save as PDF from that page.

---

## Who uses what

| Place | Who | What it is for |
|---|---|---|
| **NE LiveTrack** (`/livetrack`) | Sales managers and office | Day plans, visits, map, approvals, targets, performance, users. Run the whole day from the portal. |
| **NE TaskCompass** workspace in the ERP | Super admin | Products, settings, same master records |
| **Field** | Salespersons | Same day-plan and visit APIs as the portal (Postman / native app). No LiveTrack. |

A salesperson cannot open LiveTrack. If login is refused, they have the wrong role.

Who appears on the Users page is decided in ERP on the User form (**LiveTrack portal only**). That checkbox is not shown in LiveTrack. Creating a login from LiveTrack → Users assigns the role you pick and turns that flag on for you.

### Roles

| Role | Who | What they can do |
|---|---|---|
| TC Salesperson | Field rep | Own doctors, visits, day plans, sample requests. No LiveTrack. |
| TC Sales Manager | Regional manager | LiveTrack for **their own city / territory**. Approve, set targets, assign follow-ups. |
| TC Management | Head office | All regions. Cannot delete doctors. |
| TC Super Admin | System owner | Everything, including delete and products. |

---

## Start from zero — add data in this order

Do not begin with visits. A visit needs a doctor, a doctor needs a hospital and a salesperson, and a score needs a target.

### 1. Territories (cities / regions)

**Add:** LiveTrack → **Setup** → Cities (creates Territory records).

**Why:** A manager should only see their own geography. A rep’s work is rolled up by territory.

**What it unlocks:** Sales persons can be tagged to a city. Filters and scores stay local.

### 2. Users (login + city)

**Add:** LiveTrack → **Users**. Pick one of the four TaskCompass roles. For salesperson or sales manager, pick their city. Employee and Sales Person are created automatically.

**Why:** Every visit, target and score is owned by a Sales Person, not by an email address.

**What it unlocks:** The name appears on Dashboard, Performance and Targets. Without this link the portal shows nobody.

If someone is missing from Users, an ERP admin ticks **LiveTrack portal only** on that User in ERP.

### 3. Products (catalogue)

**Add:** LiveTrack → Products. A stock item is created automatically. Only items the field team actually carries. Unit price is optional (pipeline value in rupees).

**Why:** A visit is always “this doctor + this product”. Targets, samples, follow-ups and the pipeline are all per product.

**What it unlocks:** Reps can log work. Managers can set monthly units.

### 4. Hospitals

**Add:** LiveTrack → Doctors & Hospitals → Hospitals → Add Hospital (name, city, address, GPS if known).

**Why:** Doctors sit in hospitals. The map uses hospital GPS when a rep has not yet logged a visit pin. Visit GPS is checked against this pin (Setup → visit radius, default 200 m).

**What it unlocks:** Doctors can be attached. The live map can place the team.

### 5. Doctors

**Add:** Name, person type (HOD / Professor / OT Incharge), specialty, hospital, city, **one** assigned salesperson.

**Why:** This is the heart of the system. No doctor means no visit, no sample, no follow-up, no pipeline row.

**What it unlocks:** The directory fills. Two reps cannot share one doctor.

Field reps may submit a name; it stays **Pending** until a manager approves it. Unapproved doctors are hidden from the field team so a typo does not become “our customer”.

### 6. OPD timings (schedules)

**Add:** LiveTrack → Schedules → **Doctor Schedule** → Add OPD timing. Hospital is taken from the selected doctor. Times are HH:MM. Example: Prof. Qureshi, Jinnah, Mon 09:00–13:00. Extra slots at the same hospital are allowed if the times differ.

**Why:** A day plan is worthless if the surgeon is in theatre, not in clinic. Visit time on the day plan is this start time.

**What it unlocks:** Doctor Schedule, “available today” on the profile, and auto-filled visit time on the day plan.

### 7. Monthly targets

**Add:** LiveTrack → Targets. Salesperson + month + units per product. After the week, record achieved units on the same page.

**Why:** Performance is mostly “did they hit the number”. A month with no target cannot be scored (it stays blank, not a fake zero).

**What it unlocks:** Performance rings and Dashboard %. Copy last month if the mix has not changed.

---

## Daily field work

### 8. Day plan (this morning)

LiveTrack → **Schedules** → **Day Plan**. Add a plan, or open **View** / **Edit** on an existing one.

Each visit row needs a doctor, a hospital from that doctor’s Hospitals table, a product, and a visit time (from Doctor Schedule start time). Use **Add visit row** — it is not capped at 6.

A **Field Day** needs **at least 6 visits**, including at least 2 HOD and 2 Professor. Extra rows are allowed. Unclassified names do not count. OT Full Day and OT Half Day skip that rule.

Saving creates a **TC Visit** for each row (salesperson, doctor, hospital, product, day plan). Pending and Missed rows can still be edited; those changes copy onto the visit. After **Check-In** the row is locked.

**Why:** Dashboard Planned / Completed / Missed is counted from today’s plan.

**What it unlocks:** Each row is a visit. Check-in and check-out update the visit and the day plan together. When every row is Done, the plan is Closed.

### 9. Check in, then check out (GPS)

Open the day plan (View) or **Visits**. At the hospital, GPS on, **Check-In**. Status becomes In Progress; check-in time / lat / long are stored. Check-In hides; **Check-Out** appears and sets Done.

The check-in radius is in Setup (default 200 m) when the hospital has a pin.

View or Edit a visit from Visits. Pending and Missed can still change doctor, hospital and product (that updates the day plan row). After check-in, only notes, brochure, demo and outcome can change. From visit 2, a demonstration is required. Standard cycle is **three visits**, then stop unless they are on follow-up.

**Why:** Map, reports, visit cap and pipeline all read the visit.

**What it unlocks:** Completed count, map pin, pipeline stage (introduced → demonstrated). The day plan closes when every row is Done.

### 10. Sample order

Related surgeries / month, total surgeries, expected consumption. Manager approves. After the case, collect written feedback.

**Why:** Samples cost money. Theatre volume tells the office if the quantity is honest.

**What it unlocks:** Approvals queue, then pipeline toward trial / ordering.

### 11. Follow-up (already using a competitor)

Manager assigns: doctor, our product, competitor, target share. Field logs our units vs competitor units.

**Why:** These surgeons have adopted someone. The job is share of theatre, not a three-call close.

**What it unlocks:** Three-visit cap lifted for that product only. Performance includes whether monthly volume is rising.

---

## What each LiveTrack page is for

| Page | Open it to… |
|---|---|
| Dashboard | Today’s planned vs done. Live map: last tracker pin today per rep. Click a marker for their page. Zoom and full screen. Refreshes every 5 seconds |
| Doctors & Hospitals | Search, add, edit, full profile with OPD |
| Products | Catalogue the field team sells |
| Schedules → Day Plan | View, add, edit a day plan. Add extra visit rows. Check in / check out. Locked after check-in |
| Schedules → Doctor Schedule | Weekly OPD hours. Hospital comes from the selected doctor |
| Visits | View and edit visits from the day plan. Check-in / check-out. GPS vs hospital pin |
| Approvals | New doctors, corrections, sample orders, feedback |
| Pipeline | Doctor–product opportunities (built from visits and samples, not typed) |
| Targets | Monthly units and weekly achieved |
| Follow ups | Competitor accounts and volume trend |
| Tenders | Hospital tenders the team is tracking |
| Performance | Score out of 100, month or 3 / 6 / 12 month view |
| Reports | Visits by weekday, busiest doctors, completion % |
| Notifications | Pending samples, new doctors, follow-up alerts |
| Users | Create portal / field logins. Only the four TaskCompass roles |
| Setup | Cities, sales team names, visit GPS radius |
| User Guide | This document, inside the portal |

---

## Rules that surprise new users

- **One doctor, one salesperson.** Pick an owner.
- **Three standard visits, then stop**, unless they are on follow-up.
- **Visit 2 and 3 need a demonstration**, not only a brochure.
- **A pending doctor is invisible** until you approve.
- **Pipeline is not a spreadsheet you type.** If a stage looks wrong, check the visit or sample behind it.
- **No targets = no score** for that month.
- **GPS off** means Check-In cannot prove they were at the hospital. Check-in radius is in Setup (default 200 m).
- **A Field Day needs at least 6 visits** with at least 2 HOD and 2 Professor. Extra rows are allowed.
- **After Check-In the row is locked.** Doctor, hospital, product and time cannot change. Pending and Missed still can, and they update the visit.

## How a score is built

About 70% is hitting monthly product targets. The rest is how the work was done (visits, follow-up volume, conduct notes). Excellent 85+, On Track 70+, Needs Push 50+, below that At Risk.

---

## Train a new manager (half day)

1. Log into LiveTrack. Dashboard: planned, completed, map.
2. Users: add a salesperson for a city. Setup: cities.
3. Doctors & Hospitals: search a known surgeon, open the profile, show OPD timings.
4. Schedules → Day Plan: add a day plan for one rep (at least 6 visits on a Field Day, extra rows if needed). Open View, then Edit. Doctor Schedule: add one OPD timing.
5. Approve one pending doctor and one sample (or walk through a past example).
6. Targets: set next month for one rep. Show copy-from-last-month.
7. Follow ups: growing vs declining. Assign one if a competitor is known.
8. Performance: same rep, current month vs last three months.
9. Ask them to train one salesperson the same afternoon.

## Train a new salesperson (one hour)

1. Your doctors are already assigned. Do not add random hospitals from another city.
2. Every morning: day plan from OPD timings. Add extra rows if the day is longer.
3. At the hospital: GPS on, Check-In, then the call, then Check-Out. Brochure / demo and one line of notes go on the visit.
4. Sample: fill theatre numbers honestly. Wait for approval before promising boxes.
5. Already using a competitor: tell the office. Do not burn the three-visit cycle.
6. Wrong phone number: suggest a correction. Do not create a second doctor.
7. End of day: leftovers become Missed unless rescheduled.

## If a screen looks empty

Empty almost always means a step above was skipped.

| You see | Likely missing |
|---|---|
| No reps | Sales Person not created / not linked to Employee |
| Name missing from Users | User is not a portal login — in ERP tick LiveTrack portal only |
| No doctors | None added, or still pending approval |
| No map pins | No visit GPS and no hospital coordinates |
| No score | No monthly target for that person |
| No pipeline | No visits or samples yet |

Add the missing record, then refresh.
