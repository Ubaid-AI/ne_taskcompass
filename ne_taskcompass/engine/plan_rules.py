import frappe

CONFIRMED_TYPES = {"HOD", "Professor", "OT Incharge"}


def validate_day_plan(plan):
	if plan.day_type in ("OT Full Day", "OT Half Day"):
		return
	items = [row for row in (plan.items or []) if row.doctor]
	if not items:
		frappe.throw("Add at least one visit")

	hod = 0
	professor = 0
	for row in items:
		person_type = frappe.db.get_value("TC Doctor", row.doctor, "person_type")
		if person_type == "HOD":
			hod += 1
		elif person_type == "Professor":
			professor += 1
	if hod < 2:
		frappe.throw("A Field Day plan needs at least two HODs. Unclassified doctors do not count (R5, D8)")
	if professor < 2:
		frappe.throw(
			"A Field Day plan needs at least two Professors. Unclassified doctors do not count (R5, D8)"
		)
