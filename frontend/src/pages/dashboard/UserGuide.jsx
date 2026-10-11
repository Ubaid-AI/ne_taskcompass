import { Printer } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";

function H({ children }) {
  return <h2 className="text-[17px] font-extrabold text-slate-800 mt-8 mb-2 first:mt-0">{children}</h2>;
}
function P({ children }) {
  return <p className="text-[13.5px] text-slate-600 leading-relaxed mb-3">{children}</p>;
}
function Step({ n, title, why, effect, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-[13px] font-extrabold grid place-items-center shrink-0">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold text-slate-800">{title}</div>
          <div className="text-[13px] text-slate-600 mt-1 leading-relaxed">{children}</div>
          <div className="mt-2.5 grid sm:grid-cols-2 gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] text-brand-900 leading-relaxed">
              <b>Why add this.</b> {why}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700 leading-relaxed">
              <b>What it unlocks.</b> {effect}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserGuide() {
  return (
    <DashboardLayout
      title="Staff user guide"
      subtitle="Train yourself, then train the next person. Print or save as PDF from the button."
    >
      <div className="flex justify-end mb-4 print:hidden">
        <Button icon={Printer} variant="secondary" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <Card className="max-w-3xl">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-700">National Enterprises</div>
        <h1 className="text-[22px] font-extrabold text-slate-800 mt-1">NE LiveTrack &amp; TaskCompass</h1>
        <P>
          This is the field CRM for our neurosurgery range. It is not a notebook and it is not
          WhatsApp. Every visit, sample and target lives in one place so the office and the field
          team see the same truth.
        </P>
        <P>
          Use this guide to run the system yourself, and to train a new manager or salesperson.
          Read it in order the first time. The order matters: if you skip a step, later screens
          look empty and people think the software is broken.
        </P>
      </Card>

      <div className="max-w-3xl">
        <H>Who uses what</H>
        <div className="grid sm:grid-cols-3 gap-3 mb-2">
          {[
            {
              t: "Management portal",
              d: "NE LiveTrack at /livetrack. Day plans, visits, approvals, targets, map, performance, users. Managers run the whole day from here.",
            },
            {
              t: "Office workspace",
              d: "NE TaskCompass in the ERP. Super admin master data: products, settings, and records the portal also shows.",
            },
            {
              t: "Field staff",
              d: "Salespersons log day plans, visits, GPS and sample requests. Their work is what fills the portal.",
            },
          ].map((x) => (
            <Card key={x.t} className="h-full">
              <div className="text-[13px] font-bold text-slate-800">{x.t}</div>
              <div className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">{x.d}</div>
            </Card>
          ))}
        </div>
        <P>
          A salesperson cannot open LiveTrack. A manager can. If someone is refused at login, they
          have the wrong role — ask an admin to give them TC Sales Manager, TC Management, or TC Super Admin.
          Who appears on the Users page is decided in ERP on the User form (LiveTrack portal only).
          Creating a login from LiveTrack → Users assigns the role you pick and turns that flag on for you.
        </P>

        <H>Roles in plain language</H>
        <Card padding="p-0" className="overflow-hidden mb-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Who</th>
                <th className="px-4 py-2.5">What they can do</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold">TC Salesperson</td><td className="px-4 py-2.5">Field rep</td><td className="px-4 py-2.5">Own doctors, visits, day plans, sample requests. No LiveTrack.</td></tr>
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold">TC Sales Manager</td><td className="px-4 py-2.5">Regional manager</td><td className="px-4 py-2.5">LiveTrack for their own city / territory. Approve, set targets, assign follow-ups.</td></tr>
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold">TC Management</td><td className="px-4 py-2.5">Head office</td><td className="px-4 py-2.5">All regions. Cannot delete doctors.</td></tr>
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold">TC Super Admin</td><td className="px-4 py-2.5">System owner</td><td className="px-4 py-2.5">Everything, including delete and products.</td></tr>
            </tbody>
          </table>
        </Card>

        <H>Start from zero — add data in this order</H>
        <P>
          Do not begin with visits. A visit needs a doctor, a doctor needs a hospital and a
          salesperson, and a score needs a target. Follow these steps once for a new city or a new
          hire. After that, daily work is only plans, visits and approvals.
        </P>

        <Step n={1} title="Territories (cities / regions)" why="A manager should only see their own geography. A rep’s work is rolled up by territory." effect="Sales persons can be tagged Lahore, Karachi, Islamabad, and so on. Filters and scores stay local.">
          In LiveTrack open <b>Setup</b> → Cities and add the cities you sell in. That creates the same
          Territory records the rest of the system uses. One city = one territory.
        </Step>

        <Step n={2} title="Users (login + city)" why="Every visit, target and score is owned by a Sales Person, not by an email address." effect="The name appears on the Dashboard, Performance and Targets. Without this link the portal shows nobody.">
          In LiveTrack open <b>Users</b> and add a login. The role picker only shows the four TaskCompass
          roles. For a salesperson or sales manager, pick their city — Employee and Sales Person are
          created automatically. A sales manager only sees their own territory.
          The Users list is portal logins only. If someone is missing, an ERP admin ticks
          <b> LiveTrack portal only</b> on that User in ERP — that checkbox is not shown in LiveTrack.
        </Step>

        <Step n={3} title="Products (our catalogue)" why="A visit is always “this doctor + this product”. Targets, samples, follow-ups and the pipeline are all per product." effect="Reps can log work. Managers can set monthly units. Empty product list = empty Targets and Pipeline.">
          Products live in LiveTrack → <b>Products</b> (a stock item is created automatically).
          Add only items the field team actually carries (Stypcel, Glubran, shunts, clips, and so on). Set a unit price if
          you want pipeline value in rupees. No price still works — value will show as unknown.
        </Step>

        <Step n={4} title="Hospitals" why="Doctors sit in hospitals. The map uses hospital GPS when a rep has not yet logged a visit pin." effect="Directory → Hospitals. Doctors can be attached. The live map can place the team.">
          In LiveTrack open <b>Doctors &amp; Hospitals</b> → Hospitals → Add Hospital. Name, city,
          and if you know it, the address. Add GPS later if you want a precise pin.
        </Step>

        <Step n={5} title="Doctors" why="This is the heart of the system. No doctor means no visit, no sample, no follow-up, no pipeline row." effect="The directory fills. A salesperson is the only owner of that doctor — two reps cannot share one name.">
          Add Doctor: full name, person type (HOD / Professor / OT Incharge), specialty, hospital,
          city, assigned salesperson. Field reps can submit a new name; it stays <b>Pending</b> until
          a manager approves it on Approvals. Unapproved doctors are hidden from the field team on
          purpose, so a typo does not become “our customer”.
        </Step>

        <Step n={6} title="OPD timings (schedules)" why="A day plan is worthless if the surgeon is in theatre, not in clinic." effect="Doctor Schedule shows weekly hours. The profile shows “available today”. Reps plan around real OPD.">
          LiveTrack → <b>Schedules</b> → <b>Doctor Schedule</b> → Add OPD timing. Hospital is taken from the selected doctor. Times are HH:MM.
          Example: Prof. Qureshi, Jinnah, Mon 09:00–13:00. Extra slots at the same hospital are allowed if the times differ.
        </Step>

        <Step n={7} title="Monthly targets" why="Performance is mostly “did they hit the number”. A month with no target cannot be scored, so it stays blank instead of a fake zero." effect="Targets page, Performance rings, and the Dashboard % all light up. Copy last month if the mix has not changed.">
          LiveTrack → <b>Targets</b>. Pick the salesperson, pick the month, enter units per product.
          That is the monthly figure; the system splits it across weeks. After the week, record
          achieved units on the same page. Do this on time — late numbers make the score jump.
        </Step>

        <H>Daily field work — what the team must enter, and why</H>

        <Step n={8} title="Day plan (this morning)" why="Dashboard “Planned / Completed / Missed” is counted from today’s plan, not from memory." effect="Each row creates a visit. Check-in and check-out update that visit and the day plan row together. When every row is Done, the plan closes.">
          LiveTrack → <b>Schedules</b> → <b>Day Plan</b>. Add a plan, or open View / Edit on an existing one.
          Each visit row needs a doctor, a hospital from that doctor’s Hospitals table, a product, and a visit time
          (filled from Doctor Schedule start time). Use <b>Add visit row</b> for as many stops as you need.
          A Field Day still needs at least 2 HOD and 2 Professor. There is no cap on how many doctors you add. OT Full Day and OT Half Day skip that mix.
          Saving creates a visit for each row. Pending and Missed rows can still be edited; those changes copy onto the visit.
          After <b>Check-In</b> the row is locked (In Progress / Done). Do not leave the plan empty and then log random visits.
        </Step>

        <Step n={9} title="Check in, then check out (GPS)" why="The map, reports, three-visit cycle and pipeline all read from the visit record." effect="Status moves Pending → In Progress → Done on both the visit and the day plan row. The day plan closes when every row is Done.">
          Open the day plan (View) or <b>Visits</b>. At the hospital, turn GPS on and tap <b>Check-In</b>.
          Status becomes In Progress and check-in time / lat / long are stored. Check-In hides; <b>Check-Out</b> appears.
          Check-Out sets Done and stores check-out GPS. The check-in radius is in Setup (default 200 m) when the hospital has a pin.
          View or Edit a visit from Visits: Pending and Missed can still change doctor, hospital and product (that updates the day plan row).
          After check-in, only notes, brochure, demo and outcome can change. From visit 2, a demonstration is required.
          Standard cycle is <b>three visits</b> to convert, unless they are on follow-up.
        </Step>

        <Step n={10} title="Sample order (when they want to try stock)" why="Samples cost money. Theatre volume on the form tells the office whether the quantity is honest." effect="The request appears on Approvals. After use, a stamped review moves the pipeline toward trial / ordering.">
          The rep fills related surgeries per month, total surgeries, and expected consumption.
          If that doctor already has a sample of another product, the form warns you. Manager
          approves or rejects. After the case, collect written feedback and interest level.
        </Step>

        <Step n={11} title="Follow-up (they already use a competitor)" why="These surgeons have adopted someone. The job is share of theatre, not a three-call close." effect="The three-visit cap is lifted for that product only. Performance includes whether monthly volume is rising.">
          Manager assigns follow-up: doctor, our product, competitor name, target share.
          Field logs follow-up visits with our units and the obstacle. The Follow ups page
          shows growing / declining. Reassign if the rep covering that hospital changes.
        </Step>

        <H>What each LiveTrack page is for</H>
        <Card padding="p-0" className="overflow-hidden mb-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Page</th>
                <th className="px-4 py-2.5">You open it to…</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              <tr><td className="px-4 py-2.5 font-semibold">Dashboard</td><td className="px-4 py-2.5">See today’s planned vs done. The live map shows each rep’s last tracker pin today. Click a marker for their page. Zoom and full screen are on the map. It refreshes every 5 seconds.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Doctors &amp; Hospitals</td><td className="px-4 py-2.5">Search, add, edit, open a full profile with OPD timings.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Products</td><td className="px-4 py-2.5">Catalogue the field team sells. Each visit, sample and target is per product.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Schedules → Day Plan</td><td className="px-4 py-2.5">View, add, edit a day plan. Add extra visit rows. Check in / check out. Locked after check-in.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Schedules → Doctor Schedule</td><td className="px-4 py-2.5">Weekly OPD hours. Hospital comes from the selected doctor. Visit time on the day plan uses start time.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Visits</td><td className="px-4 py-2.5">View and edit visits created from the day plan. Check-in / check-out. GPS vs hospital pin.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Approvals</td><td className="px-4 py-2.5">New doctors, directory corrections, sample orders, sample feedback.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Pipeline</td><td className="px-4 py-2.5">Every doctor–product opportunity. Not typed by hand — built from visits and samples.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Targets</td><td className="px-4 py-2.5">Set monthly units and record weekly achieved.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Follow ups</td><td className="px-4 py-2.5">Competitor accounts and whether volume is growing.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Tenders</td><td className="px-4 py-2.5">Hospital tenders the team is tracking.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Performance</td><td className="px-4 py-2.5">Score out of 100. Drill into a month or the last 3 / 6 / 12 months.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Reports</td><td className="px-4 py-2.5">Visits by weekday, busiest doctors, completion %.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Notifications</td><td className="px-4 py-2.5">Pending samples, new doctors, follow-up alerts.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Users</td><td className="px-4 py-2.5">Create portal / field logins. Only the four TaskCompass roles.</td></tr>
              <tr><td className="px-4 py-2.5 font-semibold">Setup</td><td className="px-4 py-2.5">Cities, sales team names, visit GPS radius.</td></tr>
            </tbody>
          </table>
        </Card>

        <H>Rules that surprise new users</H>
        <ul className="list-disc pl-5 text-[13.5px] text-slate-600 leading-relaxed space-y-2 mb-4">
          <li><b>One doctor, one salesperson.</b> If two reps “both know” a surgeon, pick an owner. The other can join a visit; they cannot both be assigned.</li>
          <li><b>Three standard visits, then stop</b> — unless the office flags them as using a competitor (follow-up).</li>
          <li><b>Visit 2 and 3 need a demonstration</b>, not only a brochure.</li>
          <li><b>A pending doctor is invisible</b> to the field team until you approve.</li>
          <li><b>Pipeline is not a spreadsheet you type.</b> If a stage looks wrong, check the visit, sample or monthly sales behind it.</li>
          <li><b>No targets = no score</b> for that month. It is empty, not zero. Assign targets before you judge the rep.</li>
          <li><b>GPS off</b> means Check-In cannot prove they were at the hospital. Turn it on at the gate. The check-in radius is set in Setup (default 200 m).</li>
          <li><b>A Field Day has no six-doctor cap.</b> It still needs at least 2 HOD and 2 Professor. Unclassified names do not count toward those two.</li>
          <li><b>After Check-In the row is locked.</b> Doctor, hospital, product and time cannot change. Pending and Missed rows still can, and they update the visit.</li>
        </ul>

        <H>How a score is built</H>
        <P>
          About 70% is hitting the monthly product targets. The rest is how the work was done
          (visits completed, follow-up volume moving, plus or minus any conduct notes the office
          adds). Excellent is 85+, On Track 70+, Needs Push 50+, below that is At Risk.
        </P>

        <H>Train a new manager (half day)</H>
        <ol className="list-decimal pl-5 text-[13.5px] text-slate-600 leading-relaxed space-y-1.5 mb-4">
          <li>Log into LiveTrack together. Point at Dashboard: planned, completed, map.</li>
          <li>Open <b>Users</b> and show how to add a salesperson for a city. Open <b>Setup</b> for cities.</li>
          <li>Open Doctors &amp; Hospitals. Search a known surgeon. Open the profile. Show OPD timings.</li>
          <li>On Schedules → Day Plan, add a day plan for one rep with as many visits as you need. Open View, then Edit. On Doctor Schedule, add one OPD timing.</li>
          <li>Approve one pending doctor and one sample (or walk through a past example).</li>
          <li>On Targets, set next month for one rep. Explain copy-from-last-month.</li>
          <li>On Follow ups, show growing vs declining. Assign one follow-up if a competitor is known.</li>
          <li>On Performance, pick that same rep. Show current month vs last three months.</li>
          <li>Ask them to train one salesperson the same afternoon using the checklist below.</li>
        </ol>

        <H>Train a new salesperson (one hour)</H>
        <ol className="list-decimal pl-5 text-[13.5px] text-slate-600 leading-relaxed space-y-1.5 mb-4">
          <li>Your doctors are already assigned. You do not add random hospitals from another city.</li>
          <li>Every morning: build the day plan from OPD timings. Add extra rows if the day is longer. Do not visit unplanned names.</li>
          <li>At the hospital: GPS on, Check-In, then the call, then Check-Out. Brochure / demo and one line of notes go on the visit (View / Edit).</li>
          <li>If they ask for a sample: fill theatre numbers honestly. Wait for office approval before promising boxes.</li>
          <li>If they already use a competitor: tell the office. Do not burn the three-visit cycle on them.</li>
          <li>If a phone number is wrong: suggest a correction. Do not invent a second doctor record.</li>
          <li>End of day: leftover stops become Missed unless you reschedule. That number is visible to your manager.</li>
        </ol>

        <H>If a screen looks empty</H>
        <P>
          Empty almost always means a step above was skipped, not that LiveTrack is disconnected.
          No reps → Sales Person not created. No doctors → none added or still pending. No map pins
          → no visit GPS and no hospital coordinates. No score → no monthly target. No pipeline →
          no visits or samples yet. A name missing from Users → they are not a portal login
          (ERP admin: User → LiveTrack portal only). Add the missing record, then refresh.
        </P>

        <Card className="mt-4 bg-brand-50 border-brand-100">
          <div className="text-[13px] font-bold text-brand-900">Keep this guide alive</div>
          <P>
            When you hire, sit with them and tick the two training lists. When a rule changes
            (for example sample limits), update this page so the next trainer does not teach the old way.
            The live copy is always in LiveTrack → User Guide.
          </P>
        </Card>
      </div>
    </DashboardLayout>
  );
}
