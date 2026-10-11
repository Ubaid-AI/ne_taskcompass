import frappe
from frappe.utils import cint, get_datetime, get_time, now_datetime

from ne_taskcompass.api.utils import current_sales_person, require_login
from ne_taskcompass.engine.people import get_managed_sales_persons, is_tc_admin, resolve_sales_person


def _fmt_time(val):
	if val in (None, ""):
		return None
	try:
		t = get_time(val)
	except Exception:
		return str(val)
	return f"{int(t.hour):02d}:{int(t.minute):02d}:{int(getattr(t, 'second', 0) or 0):02d}"


def _interval_minutes(val):
	if val in (None, ""):
		return 15
	try:
		t = get_time(val)
	except Exception:
		return 15
	total = int(t.hour) * 60 + int(t.minute)
	if getattr(t, "second", 0):
		total += 1 if int(t.second) >= 30 else 0
	return total or 15


def tracker_window(when=None):
	"""Whether the mobile app should be posting locations right now."""
	when = get_datetime(when or now_datetime())
	current = when.time()
	if not frappe.db.exists("TC Settings", "TC Settings"):
		return {"active": True, "start": "08:00:00", "end": "18:00:00"}
	start = _fmt_time(frappe.db.get_single_value("TC Settings", "tracker_start_time")) or "08:00:00"
	end = _fmt_time(frappe.db.get_single_value("TC Settings", "tracker_end_time")) or "18:00:00"
	start_t = get_time(start)
	end_t = get_time(end)
	if start_t <= end_t:
		active = start_t <= current <= end_t
	else:
		active = current >= start_t or current <= end_t
	return {"active": bool(active), "start": start, "end": end}


def tracker_settings():
	interval = "00:15:00"
	if frappe.db.exists("TC Settings", "TC Settings"):
		interval = _fmt_time(frappe.db.get_single_value("TC Settings", "location_interval")) or interval
	window = tracker_window()
	return {
		"tracker_start_time": window["start"],
		"tracker_end_time": window["end"],
		"location_interval": interval,
		"location_interval_minutes": _interval_minutes(interval),
		"tracker_active_now": window["active"],
	}


@frappe.whitelist()
def post_location(**kwargs):
	"""Mobile app posts the salesperson GPS at the configured interval."""
	require_login()
	payload = frappe._dict(kwargs)
	lat = payload.latitude if payload.latitude not in (None, "") else payload.lat
	lng = payload.longitude if payload.longitude not in (None, "") else payload.lng
	if lat in (None, "") or lng in (None, ""):
		frappe.throw("Latitude and longitude are required")
	window = tracker_window(payload.tracked_at or payload.datetime)
	if not window["active"]:
		frappe.throw(
			f"Location tracking is off outside {window['start']}–{window['end']}"
		)
	sp = resolve_sales_person(payload.salesperson) if payload.salesperson else None
	if not sp:
		sp = current_sales_person()
	elif not is_tc_admin() and sp not in (get_managed_sales_persons() or [sp]):
		sp = current_sales_person()
	doc = frappe.get_doc(
		{
			"doctype": "TC Sales Person Tracker",
			"salesperson": sp,
			"tracked_at": payload.tracked_at or payload.datetime or now_datetime(),
			"latitude": lat,
			"longitude": lng,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def list_locations(salesperson=None, from_datetime=None, to_datetime=None, limit=200):
	require_login()
	filters = {}
	if salesperson:
		resolved = resolve_sales_person(salesperson)
		if resolved:
			filters["salesperson"] = resolved
	elif not is_tc_admin():
		names = get_managed_sales_persons()
		if not names:
			return []
		filters["salesperson"] = ["in", names]
	if from_datetime and to_datetime:
		filters["tracked_at"] = ["between", [from_datetime, to_datetime]]
	elif from_datetime:
		filters["tracked_at"] = [">=", from_datetime]
	elif to_datetime:
		filters["tracked_at"] = ["<=", to_datetime]
	return frappe.get_all(
		"TC Sales Person Tracker",
		filters=filters,
		fields=["name", "tracked_at", "salesperson", "latitude", "longitude"],
		order_by="tracked_at desc",
		limit=cint(limit or 200),
	)


@frappe.whitelist()
def latest_locations(plan_date=None):
	"""Last TC Sales Person Tracker ping today for each salesperson the caller can see."""
	require_login()
	from frappe.utils import getdate, nowdate

	day = getdate(plan_date or nowdate())
	start, end = f"{day} 00:00:00", f"{day} 23:59:59"
	conditions = ["tracked_at between %(start)s and %(end)s"]
	values = {"start": start, "end": end}
	if not is_tc_admin():
		names = get_managed_sales_persons()
		if not names:
			return []
		conditions.append("salesperson in %(names)s")
		values["names"] = names
	where = " and ".join(conditions)
	return frappe.db.sql(
		f"""
		select t.name, t.salesperson, t.latitude, t.longitude, t.tracked_at
		from `tabTC Sales Person Tracker` t
		inner join (
			select salesperson, max(tracked_at) as last_at
			from `tabTC Sales Person Tracker`
			where {where}
			group by salesperson
		) latest
			on latest.salesperson = t.salesperson and latest.last_at = t.tracked_at
		order by t.salesperson
		""",
		values,
		as_dict=True,
	)
