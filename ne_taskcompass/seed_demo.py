"""Idempotent demo records so LiveTrack can show Frappe data, not bundled UI fixtures."""

import json

import frappe
from frappe.utils import add_months, getdate, now_datetime, today

DEMO_HOSPITAL = "Jinnah Hospital Lahore"


def seed_demo_data():
	if not frappe.db.exists("DocType", "TC Hospital"):
		return
	try:
		if frappe.db.exists("TC Hospital", DEMO_HOSPITAL):
			_enrich()
		else:
			_seed()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "NE TaskCompass demo seed")


def _enrich():
	"""Fill extra months / missing rows after the first seed."""
	territories = _territories()
	people = _sales_people(territories)
	_targets(people)


def _seed():
	territories = _territories()
	people = _sales_people(territories)
	hospitals = _hospitals(territories)
	doctors = _doctors(people, hospitals)
	_schedules(doctors, hospitals)
	_targets(people)
	_followups(people, doctors)
	_samples(people, doctors, hospitals)
	_day_plans_and_visits(people, doctors, hospitals)
	_tender(people, doctors, hospitals)
	_notifications()
	_edit_request(doctors, people)


def _territories():
	parent = frappe.db.get_value("Territory", {"is_group": 1}, "name") or "All Territories"
	if not frappe.db.exists("Territory", parent):
		frappe.get_doc(
			{"doctype": "Territory", "territory_name": parent, "is_group": 1}
		).insert(ignore_permissions=True)
	out = {}
	for name in ("Lahore", "Karachi", "Islamabad"):
		if frappe.db.exists("Territory", name):
			out[name] = name
			continue
		frappe.get_doc(
			{
				"doctype": "Territory",
				"territory_name": name,
				"parent_territory": parent,
				"is_group": 0,
			}
		).insert(ignore_permissions=True)
		out[name] = name
	return out


def _sales_people(territories):
	parent = frappe.db.get_value("Sales Person", {"is_group": 1}, "name")
	if not parent:
		parent = "Sales Team"
		if not frappe.db.exists("Sales Person", parent):
			frappe.get_doc(
				{
					"doctype": "Sales Person",
					"sales_person_name": parent,
					"is_group": 1,
					"enabled": 1,
				}
			).insert(ignore_permissions=True)
	rows = [
		("Ali Raza", "Lahore"),
		("Sara Khan", "Karachi"),
		("Hamza Malik", "Islamabad"),
	]
	out = {}
	for name, city in rows:
		if frappe.db.exists("Sales Person", name):
			out[city] = name
			if frappe.db.has_column("Sales Person", "tc_territory"):
				frappe.db.set_value("Sales Person", name, "tc_territory", territories[city], update_modified=False)
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Sales Person",
				"sales_person_name": name,
				"parent_sales_person": parent,
				"is_group": 0,
				"enabled": 1,
			}
		)
		if frappe.db.has_column("Sales Person", "tc_territory"):
			doc.tc_territory = territories[city]
		doc.insert(ignore_permissions=True)
		out[city] = doc.name
	return out


def _hospitals(territories):
	rows = [
		("Jinnah Hospital Lahore", "Lahore", 31.4845, 74.2962),
		("Mayo Hospital Lahore", "Lahore", 31.5714, 74.3152),
		("Services Hospital Lahore", "Lahore", 31.5386, 74.3228),
		("Aga Khan University Hospital", "Karachi", 24.8924, 67.0748),
		("Jinnah Postgraduate Medical Centre", "Karachi", 24.8597, 67.0104),
		("Liaquat National Hospital", "Karachi", 24.8731, 67.0749),
		("PIMS Islamabad", "Islamabad", 33.6938, 73.0651),
		("Holy Family Hospital", "Islamabad", 33.6261, 73.0715),
		("Polyclinic Hospital", "Islamabad", 33.7215, 73.0766),
	]
	out = {}
	for name, city, lat, lng in rows:
		if frappe.db.exists("TC Hospital", name):
			out[name] = name
			continue
		frappe.get_doc(
			{
				"doctype": "TC Hospital",
				"hospital_name": name,
				"city": city,
				"territory": territories[city],
				"latitude": lat,
				"longitude": lng,
				"address": f"{name}, {city}",
			}
		).insert(ignore_permissions=True)
		out[name] = name
	return out


def _doctors(people, hospitals):
	rows = [
		("Prof. Ahmed Qureshi", "HOD", "Neurosurgery", "Jinnah Hospital Lahore", "Lahore", "Approved"),
		("Prof. Nadia Sheikh", "HOD", "Neurology", "Mayo Hospital Lahore", "Lahore", "Approved"),
		("Dr. Imran Baig", "Professor", "Neurosurgery", "Jinnah Hospital Lahore", "Lahore", "Approved"),
		("Dr. Sana Malik", "Professor", "Spine", "Mayo Hospital Lahore", "Lahore", "Approved"),
		("Ms. Rabia Noor", "OT Incharge", "Theatre", "Services Hospital Lahore", "Lahore", "Approved"),
		("Mr. Tariq Javed", "OT Incharge", "Theatre", "Jinnah Hospital Lahore", "Lahore", "Approved"),
		("Prof. Farhan Ali", "HOD", "Neurosurgery", "Aga Khan University Hospital", "Karachi", "Approved"),
		("Prof. Hina Raza", "HOD", "Neurology", "Jinnah Postgraduate Medical Centre", "Karachi", "Approved"),
		("Dr. Omar Siddiqui", "Professor", "Neurosurgery", "Aga Khan University Hospital", "Karachi", "Approved"),
		("Dr. Ayesha Kamal", "Professor", "Spine", "Liaquat National Hospital", "Karachi", "Approved"),
		("Ms. Kiran Shah", "OT Incharge", "Theatre", "Aga Khan University Hospital", "Karachi", "Approved"),
		("Mr. Bilal Hussain", "OT Incharge", "Theatre", "Jinnah Postgraduate Medical Centre", "Karachi", "Approved"),
		("Prof. Khalid Mehmood", "HOD", "Neurosurgery", "PIMS Islamabad", "Islamabad", "Approved"),
		("Prof. Maham Zafar", "HOD", "Neurology", "Holy Family Hospital", "Islamabad", "Approved"),
		("Dr. Usman Tariq", "Professor", "Neurosurgery", "PIMS Islamabad", "Islamabad", "Approved"),
		("Dr. Zara Naeem", "Professor", "Spine", "Polyclinic Hospital", "Islamabad", "Approved"),
		("Ms. Fiza Khan", "OT Incharge", "Theatre", "PIMS Islamabad", "Islamabad", "Approved"),
		("Mr. Adeel Mir", "OT Incharge", "Theatre", "Holy Family Hospital", "Islamabad", "Approved"),
		("Dr. Pending Iqbal", "Unclassified", "Neurosurgery", "Jinnah Hospital Lahore", "Lahore", "Pending"),
		("Dr. Pending Karachi", "Professor", "Neurosurgery", "Aga Khan University Hospital", "Karachi", "Pending"),
	]
	out = {}
	for name, ptype, specialty, hospital, city, status in rows:
		existing = frappe.db.get_value("TC Doctor", {"doctor_name": name}, "name")
		if existing:
			out[name] = existing
			continue
		doc = frappe.get_doc(
			{
				"doctype": "TC Doctor",
				"doctor_name": name,
				"status": status,
				"person_type": ptype,
				"person_type_source": "admin",
				"specialty": specialty,
				"hospital": hospital,
				"city": city,
				"assigned_to": people[city],
				"phone": "0300" + str(abs(hash(name)) % 10000000).zfill(7),
			}
		)
		doc.insert(ignore_permissions=True)
		out[name] = doc.name
	return out


def _schedules(doctors, hospitals):
	pairs = [
		("Prof. Ahmed Qureshi", "Jinnah Hospital Lahore", "Mon", "09:00", "13:00"),
		("Prof. Ahmed Qureshi", "Jinnah Hospital Lahore", "Wed", "09:00", "13:00"),
		("Prof. Farhan Ali", "Aga Khan University Hospital", "Tue", "10:00", "14:00"),
		("Prof. Khalid Mehmood", "PIMS Islamabad", "Thu", "08:30", "12:30"),
	]
	for doctor, hospital, day, start, end in pairs:
		if frappe.db.exists("TC Doctor Schedule", {"doctor": doctors[doctor], "day_of_week": day, "start_time": start}):
			continue
		frappe.get_doc(
			{
				"doctype": "TC Doctor Schedule",
				"doctor": doctors[doctor],
				"hospital": hospital,
				"day_of_week": day,
				"start_time": start,
				"end_time": end,
				"source": "Manual",
			}
		).insert(ignore_permissions=True)


def _targets(people):
	products = ["Stypcel", "Glubran 0.5 ml", "VP Shunts", "ImmiSeal"]
	qty = {"Stypcel": 80, "Glubran 0.5 ml": 12, "VP Shunts": 6, "ImmiSeal": 8}
	# Three months so LiveTrack Performance has a real history, not empty bars.
	for offset in range(3):
		d = add_months(getdate(), -offset)
		year, month = d.year, d.month
		factor = 1 - (offset * 0.12)
		achieved = {
			"Stypcel": max(8, int(45 * factor)),
			"Glubran 0.5 ml": max(1, int(7 * factor)),
			"VP Shunts": max(1, int(3 * factor)),
			"ImmiSeal": max(1, int(2 * factor)),
		}
		for sp in people.values():
			for product in products:
				if not frappe.db.exists("TC Product", product):
					continue
				if not frappe.db.exists(
					"TC Monthly Target", {"salesperson": sp, "product": product, "year": year, "month": month}
				):
					frappe.get_doc(
						{
							"doctype": "TC Monthly Target",
							"salesperson": sp,
							"product": product,
							"year": year,
							"month": month,
							"target_qty": qty[product],
						}
					).insert(ignore_permissions=True)
				if not frappe.db.exists(
					"TC Weekly Achievement",
					{"salesperson": sp, "product": product, "year": year, "month": month, "week_of_month": 1},
				):
					frappe.get_doc(
						{
							"doctype": "TC Weekly Achievement",
							"salesperson": sp,
							"product": product,
							"year": year,
							"month": month,
							"week_of_month": 1,
							"achieved_qty": achieved[product],
						}
					).insert(ignore_permissions=True)
			if offset == 0 and not frappe.db.exists("TC Performance Event", {"salesperson": sp, "kind": "target_hit"}):
				frappe.get_doc(
					{
						"doctype": "TC Performance Event",
						"salesperson": sp,
						"event_date": today(),
						"kind": "target_hit",
						"points": 4,
						"note": "Hit weekly Stypcel target",
					}
				).insert(ignore_permissions=True)


def _followups(people, doctors):
	pairs = [
		("Prof. Ahmed Qureshi", "Stypcel", "Lahore", "Surgicel"),
		("Prof. Farhan Ali", "Glubran 0.5 ml", "Karachi", "Tisseel"),
	]
	today_d = getdate()
	for doctor, product, city, competitor in pairs:
		dname = doctors[doctor]
		if frappe.db.exists("TC Follow Up", {"doctor": dname, "product": product, "status": "Active"}):
			continue
		frappe.get_doc(
			{
				"doctype": "TC Follow Up",
				"doctor": dname,
				"product": product,
				"status": "Active",
				"assigned_to": people[city],
				"competitor_name": competitor,
				"target_share": 40,
				"reason": "Already using a competitor in theatre; grow our share.",
			}
		).insert(ignore_permissions=True)
		for i in range(3):
			d = add_months(today_d, -i)
			if frappe.db.exists(
				"TC Doctor Monthly Sales",
				{"doctor": dname, "product": product, "year": d.year, "month": d.month},
			):
				continue
			frappe.get_doc(
				{
					"doctype": "TC Doctor Monthly Sales",
					"doctor": dname,
					"product": product,
					"year": d.year,
					"month": d.month,
					"qty": 8 + i * 2,
					"competitor_qty": 12 - i,
					"recorded_by": people[city],
				}
			).insert(ignore_permissions=True)


def _samples(people, doctors, hospitals):
	rows = [
		("Dr. Imran Baig", "VP Shunts", "Lahore", "Jinnah Hospital Lahore", "Pending"),
		("Dr. Omar Siddiqui", "ImmiSeal", "Karachi", "Aga Khan University Hospital", "Approved"),
	]
	for doctor, product, city, hospital, status in rows:
		dname = doctors[doctor]
		if frappe.db.exists("TC Sample Order", {"doctor": dname, "product": product}):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "TC Sample Order",
				"doctor": dname,
				"product": product,
				"requested_by": people[city],
				"doctor_name": doctor,
				"hospital_name": hospital,
				"department": "Neurosurgery",
				"related_surgeries_pm": 12,
				"total_surgeries_pm": 40,
				"expected_consumption_pm": 6,
				"status": status,
			}
		)
		if status == "Approved":
			doc.review_text = "Holds well on dura. Want a second box next month."
			doc.interest_level = "High"
			doc.expected_usage_date = today()
		doc.insert(ignore_permissions=True)


def _day_plans_and_visits(people, doctors, hospitals):
	city_docs = {
		"Lahore": [
			"Prof. Ahmed Qureshi",
			"Prof. Nadia Sheikh",
			"Dr. Imran Baig",
			"Dr. Sana Malik",
			"Ms. Rabia Noor",
			"Mr. Tariq Javed",
		],
		"Karachi": [
			"Prof. Farhan Ali",
			"Prof. Hina Raza",
			"Dr. Omar Siddiqui",
			"Dr. Ayesha Kamal",
			"Ms. Kiran Shah",
			"Mr. Bilal Hussain",
		],
		"Islamabad": [
			"Prof. Khalid Mehmood",
			"Prof. Maham Zafar",
			"Dr. Usman Tariq",
			"Dr. Zara Naeem",
			"Ms. Fiza Khan",
			"Mr. Adeel Mir",
		],
	}
	coords = {
		"Jinnah Hospital Lahore": (31.4845, 74.2962),
		"Mayo Hospital Lahore": (31.5714, 74.3152),
		"Services Hospital Lahore": (31.5386, 74.3228),
		"Aga Khan University Hospital": (24.8924, 67.0748),
		"Jinnah Postgraduate Medical Centre": (24.8597, 67.0104),
		"Liaquat National Hospital": (24.8731, 67.0749),
		"PIMS Islamabad": (33.6938, 73.0651),
		"Holy Family Hospital": (33.6261, 73.0715),
		"Polyclinic Hospital": (33.7215, 73.0766),
	}
	times = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00"]
	product = "Raney Clips" if frappe.db.exists("TC Product", "Raney Clips") else frappe.db.get_value("TC Product", {}, "name")
	for city, names in city_docs.items():
		sp = people[city]
		if frappe.db.exists("TC Day Plan", {"salesperson": sp, "plan_date": today()}):
			continue
		plan = frappe.get_doc(
			{
				"doctype": "TC Day Plan",
				"salesperson": sp,
				"plan_date": today(),
				"day_type": "Field Day",
				"status": "Active",
			}
		)
		for i, dname in enumerate(names):
			plan.append(
				"items",
				{
					"doctor": doctors[dname],
					"visit_time": times[i],
					"status": "Done" if i < 3 else "Pending",
					"sort_order": i,
				},
			)
		plan.insert(ignore_permissions=True)
		for i, dname in enumerate(names[:3]):
			docname = doctors[dname]
			hospital = frappe.db.get_value("TC Doctor", docname, "hospital")
			lat, lng = coords.get(hospital, (31.52, 74.35))
			if frappe.db.exists("TC Visit", {"doctor": docname, "product": product, "visit_number": 1}):
				continue
			frappe.get_doc(
				{
					"doctype": "TC Visit",
					"salesperson": sp,
					"doctor": docname,
					"product": product,
					"visited_at": now_datetime(),
					"visit_number": 1,
					"showed_brochure": 1,
					"did_demonstration": 1 if i else 0,
					"notes": "Demo seed visit",
					"latitude": lat + 0.002 * i,
					"longitude": lng + 0.002 * i,
					"day_plan": plan.name,
					"is_followup": 0,
				}
			).insert(ignore_permissions=True)


def _tender(people, doctors, hospitals):
	if frappe.db.exists("TC Tender", {"title": "PIMS neurosurgery annual tender"}):
		return
	frappe.get_doc(
		{
			"doctype": "TC Tender",
			"title": "PIMS neurosurgery annual tender",
			"hospital": "PIMS Islamabad",
			"champion_doctor": doctors["Prof. Khalid Mehmood"],
			"lead": people["Islamabad"],
			"stage": "Documents Prepared",
			"value": 4200000,
			"items": [
				{"product": "Stypcel", "qty": 200, "unit_price": 850},
				{"product": "VP Shunts", "qty": 40, "unit_price": 18000},
			],
		}
	).insert(ignore_permissions=True)


def _notifications():
	users = set(frappe.get_all("Has Role", filters={"role": ["in", ["System Manager", "TC Super Admin", "TC Management", "TC Sales Manager"]]}, pluck="parent"))
	users.add("Administrator")
	notes = [
		("Pending sample order", "Dr. Imran Baig sample for VP Shunts is waiting for approval."),
		("Two doctors pending", "Field reps submitted new doctors that need directory approval."),
		("Follow-up assigned", "Stypcel follow-up is active on Prof. Ahmed Qureshi."),
	]
	for user in users:
		if not frappe.db.exists("User", user) or user == "Guest":
			continue
		for title, body in notes:
			if frappe.db.exists("TC Notification", {"user": user, "title": title}):
				continue
			frappe.get_doc(
				{"doctype": "TC Notification", "user": user, "title": title, "body": body, "read": 0}
			).insert(ignore_permissions=True)


def _edit_request(doctors, people):
	doctor = doctors["Dr. Sana Malik"]
	if frappe.db.exists("TC Doctor Edit Request", {"doctor": doctor, "status": "Pending"}):
		return
	frappe.get_doc(
		{
			"doctype": "TC Doctor Edit Request",
			"doctor": doctor,
			"requested_by": frappe.session.user or "Administrator",
			"status": "Pending",
			"reason": "Theatre list moved to Wednesday mornings.",
			"changes_json": json.dumps({"phone": {"from": "03001112222", "to": "03215556666"}}),
		}
	).insert(ignore_permissions=True)
