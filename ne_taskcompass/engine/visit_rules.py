import math

import frappe
from frappe.utils import cint, flt

STANDARD_VISIT_CAP = 3


def get_standard_visits(doctor, product, exclude=None):
	filters = {"doctor": doctor, "product": product, "is_followup": 0}
	if exclude:
		filters["name"] = ["!=", exclude]
	return frappe.get_all(
		"TC Visit",
		filters=filters,
		fields=["name", "visit_number", "outcome", "did_demonstration"],
		order_by="visit_number asc",
	)


def cycle_is_closed(doctor, product, exclude=None):
	rows = get_standard_visits(doctor, product, exclude=exclude)
	if any(r.outcome == "Refused" for r in rows):
		return True
	if any(r.outcome in ("Will Buy", "Sample Requested") for r in rows) and len(rows) >= STANDARD_VISIT_CAP:
		return True
	if len(rows) >= STANDARD_VISIT_CAP:
		return True
	return False


def next_visit_number(doctor, product, exclude=None):
	rows = get_standard_visits(doctor, product, exclude=exclude)
	if not rows:
		return 1
	return int(max(r.visit_number or 0 for r in rows)) + 1


def active_followup(doctor, product):
	return frappe.db.get_value(
		"TC Follow Up",
		{"doctor": doctor, "product": product, "status": "Active"},
		"name",
	)


def haversine_m(lat1, lon1, lat2, lon2):
	r = 6371000.0
	p1, p2 = math.radians(flt(lat1)), math.radians(flt(lat2))
	dphi = math.radians(flt(lat2) - flt(lat1))
	dl = math.radians(flt(lon2) - flt(lon1))
	a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
	return 2 * r * math.asin(min(1, math.sqrt(a)))


def gps_radius_m():
	try:
		return cint(frappe.db.get_single_value("TC Settings", "gps_check_meters") or 200)
	except Exception:
		return 200


def hospital_coords(doctor=None, hospital=None):
	hospital = hospital or (frappe.db.get_value("TC Doctor", doctor, "hospital") if doctor else None)
	if not hospital:
		return None, None, None
	lat, lng = frappe.db.get_value("TC Hospital", hospital, ["latitude", "longitude"]) or (None, None)
	return hospital, lat, lng


def visit_gps_status(visit):
	"""Return (ok, metres, hospital) for a visit row or document."""
	def _get(key):
		return visit.get(key)

	doctor = _get("doctor")
	hospital = _get("hospital")
	vlat = _get("checkin_latitude")
	vlng = _get("checkin_longitude")
	if vlat in (None, "") or vlng in (None, ""):
		vlat = _get("latitude")
		vlng = _get("longitude")
	hospital, hlat, hlng = hospital_coords(doctor=doctor, hospital=hospital)
	if hlat in (None, "") or hlng in (None, ""):
		return {"ok": None, "metres": None, "hospital": hospital, "reason": "Hospital has no pin yet"}
	if vlat in (None, "") or vlng in (None, ""):
		return {"ok": False, "metres": None, "hospital": hospital, "reason": "Visit has no GPS"}
	metres = round(haversine_m(vlat, vlng, hlat, hlng))
	radius = gps_radius_m()
	ok = metres <= radius
	return {
		"ok": ok,
		"metres": metres,
		"hospital": hospital,
		"radius": radius,
		"reason": None if ok else f"{metres} m from {hospital} (limit {radius} m)",
	}


def validate_visit_gps(visit):
	status = visit.get("status") or "Pending"
	if status in ("Pending", "Missed", "Rescheduled"):
		return
	gps_status = visit_gps_status(visit)
	if gps_status["ok"] is None:
		return
	if gps_status["ok"] is False:
		frappe.throw(
			gps_status["reason"]
			or "Check-in GPS does not match the hospital location. Stand at the hospital and try again."
		)


def validate_visit(visit):
	status = visit.get("status") or "Pending"
	if status in ("Pending", "Missed", "Rescheduled") or visit.flags.from_day_plan:
		return
	validate_visit_gps(visit)
	if status in ("In Progress", "Done"):
		return
	if visit.is_followup:
		_validate_followup_visit(visit)
		return
	_validate_standard_visit(visit)


def _validate_standard_visit(visit):
	if active_followup(visit.doctor, visit.product):
		frappe.throw(
			"This doctor and product has an active follow up. Log the visit on the follow up screen."
		)
	existing = get_standard_visits(visit.doctor, visit.product, exclude=visit.name)
	if any(r.outcome == "Refused" for r in existing):
		frappe.throw("This cycle is already closed: the doctor refused this product")
	next_number = next_visit_number(visit.doctor, visit.product, exclude=visit.name)
	if not visit.visit_number:
		visit.visit_number = next_number
	if int(visit.visit_number) != next_number and visit.is_new():
		frappe.throw(f"Next visit for this doctor and product must be visit {next_number}")
	if visit.visit_number < 1 or visit.visit_number > STANDARD_VISIT_CAP:
		frappe.throw("Standard visits are numbered 1 to 3 (R1)")
	if visit.visit_number == 1 and not (visit.showed_brochure or visit.did_demonstration):
		frappe.throw("Visit 1 requires a brochure or a demonstration")
	if visit.visit_number >= 2 and not visit.did_demonstration:
		frappe.throw("Demonstration is mandatory from visit 2 onward (R2)")
	if visit.visit_number == STANDARD_VISIT_CAP and not visit.outcome:
		frappe.throw("An outcome is required on visit 3 (R3)")
	if visit.outcome and visit.outcome not in ("Refused", "Will Buy", "Sample Requested"):
		frappe.throw("Outcome must be Refused, Will Buy, or Sample Requested")


def _validate_followup_visit(visit):
	assignment = visit.followup or active_followup(visit.doctor, visit.product)
	if not assignment:
		frappe.throw("Follow up visits require an active follow up assignment for this doctor and product")
	visit.followup = assignment
	assigned_product = frappe.db.get_value("TC Follow Up", assignment, "product")
	if assigned_product != visit.product:
		frappe.throw("Follow up visit product must match the assigned follow up product")
	status = frappe.db.get_value("TC Follow Up", assignment, "status")
	if status != "Active":
		frappe.throw("This follow up is not active")
	if visit.our_units is None or visit.our_units < 0:
		frappe.throw("Our units used this month is required")
	if not visit.blocker:
		frappe.throw("What is holding them back is required")
	count = frappe.db.count(
		"TC Visit",
		{"doctor": visit.doctor, "product": visit.product, "is_followup": 1, "name": ["!=", visit.name or "new"]},
	)
	visit.followup_round = count + 1
	visit.visit_number = min(STANDARD_VISIT_CAP, visit.visit_number or STANDARD_VISIT_CAP)
