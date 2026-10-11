import json

import frappe

from ne_taskcompass.api.utils import (
	current_sales_person,
	payload_list,
	payload_number,
	require_login,
	require_manager,
)
from ne_taskcompass.engine.people import get_managed_sales_persons, get_sales_person_territory, is_tc_admin, is_tc_manager, resolve_sales_person
from ne_taskcompass.engine.visit_rules import active_followup, cycle_is_closed, next_visit_number
from ne_taskcompass.ne_taskcompass.doctype.tc_doctor_schedule.tc_doctor_schedule import (
	attach_hospitals_to_doctors,
	format_hhmm,
)


@frappe.whitelist()
def list_sales_persons():
	require_login()
	# Super Admin / Management see every region. A Sales Manager sees only their territory.
	if is_tc_admin():
		filters = {"enabled": 1, "is_group": 0}
	else:
		names = get_managed_sales_persons()
		if not names:
			return []
		filters = {"name": ["in", names], "enabled": 1, "is_group": 0}
	fields = ["name", "sales_person_name", "employee", "parent_sales_person"]
	if frappe.db.has_column("Sales Person", "tc_territory"):
		fields.append("tc_territory")
	return frappe.get_all(
		"Sales Person",
		filters=filters,
		fields=fields,
		order_by="sales_person_name",
	)


@frappe.whitelist()
def list_products():
	require_login()
	return frappe.get_all(
		"TC Product",
		filters={"disabled": 0},
		fields=["name", "product_name", "category", "monthly_target", "unit_price", "currency", "item"],
		order_by="product_name",
	)


def _product_currency(value):
	code = (value or "PKR").strip() or "PKR"
	if frappe.db.exists("Currency", code):
		return code
	return None


@frappe.whitelist()
def create_product(**kwargs):
	require_manager()
	from ne_taskcompass.seed import ensure_item

	payload = frappe._dict(kwargs)
	name = (payload.product_name or payload.name or "").strip()
	if not name:
		frappe.throw("Product name is required")
	if frappe.db.exists("TC Product", name):
		frappe.throw("A product with that name already exists")
	try:
		item_code = ensure_item(name, payload.category)
	except Exception:
		frappe.log_error(frappe.get_traceback(), f"NE TaskCompass Item create: {name}")
		item_code = None
	doc = frappe.new_doc("TC Product")
	doc.product_name = name
	doc.category = payload.category
	doc.monthly_target = payload_number(payload.monthly_target) or 0
	doc.unit_price = payload_number(payload.unit_price)
	currency = _product_currency(payload.currency)
	if currency:
		doc.currency = currency
	if item_code:
		doc.item = item_code
	doc.insert(ignore_permissions=True)
	if not doc.item:
		frappe.throw("Could not create the stock item for this product. Check Item settings and try again.")
	return doc.as_dict()


@frappe.whitelist()
def update_product(name, **kwargs):
	require_manager()
	if not frappe.db.exists("TC Product", name):
		frappe.throw("That product was not found")
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc("TC Product", name)
	if payload.product_name:
		doc.product_name = payload.product_name
	if payload.category not in (None,):
		doc.category = payload.category
	if payload.monthly_target not in (None, ""):
		doc.monthly_target = payload_number(payload.monthly_target) or 0
	if payload.unit_price not in (None, ""):
		doc.unit_price = payload_number(payload.unit_price)
	currency = _product_currency(payload.currency) if payload.currency else None
	if currency:
		doc.currency = currency
	doc.save(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def delete_product(name):
	require_manager()
	if not frappe.db.exists("TC Product", name):
		frappe.throw("That product was not found")
	frappe.delete_doc("TC Product", name, ignore_permissions=True, force=True)
	return {"ok": True}


@frappe.whitelist()
def list_hospitals(territory=None):
	require_login()
	filters = {}
	if territory:
		filters["territory"] = territory
	elif not is_tc_admin():
		own = get_sales_person_territory()
		if own:
			filters["territory"] = own
		else:
			return []
	return frappe.get_all(
		"TC Hospital",
		filters=filters,
		fields=["name", "hospital_name", "city", "territory", "latitude", "longitude", "address"],
		order_by="hospital_name",
	)


@frappe.whitelist()
def list_doctors(status=None, search=None):
	require_login()
	filters = {}
	if status:
		filters["status"] = status
	or_filters = None
	if search:
		or_filters = {"doctor_name": ["like", f"%{search}%"], "city": ["like", f"%{search}%"]}
	fields = [
		"name",
		"doctor_name",
		"person_type",
		"person_type_other",
		"status",
		"specialty",
		"designation",
		"hospital",
		"city",
		"assigned_to",
		"phone",
		"whatsapp",
		"email",
		"notes",
		"image",
		"uses_competitor",
		"person_type_source",
		"added_by",
	]
	rows = frappe.get_all("TC Doctor", filters=filters, or_filters=or_filters, fields=fields, order_by="doctor_name")
	if is_tc_admin():
		return attach_hospitals_to_doctors(rows)
	allowed = set(get_managed_sales_persons() or [])
	territory = get_sales_person_territory()
	hospitals = set()
	if territory:
		hospitals = set(frappe.get_all("TC Hospital", filters={"territory": territory}, pluck="name"))
	user = frappe.session.user
	out = []
	for d in rows:
		if d.assigned_to in allowed:
			out.append(d)
		elif d.added_by == user:
			out.append(d)
		elif territory and d.hospital in hospitals and (not d.assigned_to or d.status == "Approved"):
			out.append(d)
	return attach_hospitals_to_doctors(out)


def _resolve_hospital(value):
	if not value:
		return None
	if frappe.db.exists("TC Hospital", value):
		return value
	return frappe.db.get_value("TC Hospital", {"hospital_name": value}, "name")


def _hospital_rows(payload, fallback=None):
	rows = []
	seen = set()
	for raw in payload_list(payload, "hospitals"):
		if isinstance(raw, str):
			hospital = _resolve_hospital(raw)
			primary = False
		else:
			hospital = _resolve_hospital(raw.get("hospital") or raw.get("name") or raw.get("value"))
			primary = bool(raw.get("is_primary"))
		if hospital and hospital not in seen:
			seen.add(hospital)
			rows.append({"hospital": hospital, "is_primary": 1 if primary else 0})
	primary = _resolve_hospital(payload.get("hospital") or fallback)
	if primary and primary not in seen:
		rows.insert(0, {"hospital": primary, "is_primary": 1})
		seen.add(primary)
	if rows and not any(r["is_primary"] for r in rows):
		rows[0]["is_primary"] = 1
	return rows


def _apply_hospitals(doc, rows):
	if not rows:
		return
	doc.set("hospitals", [])
	for row in rows:
		doc.append("hospitals", row)
	primary = next((r["hospital"] for r in rows if r.get("is_primary")), rows[0]["hospital"])
	doc.hospital = primary
	if not doc.city:
		doc.city = frappe.db.get_value("TC Hospital", primary, "city")


def _doctor_payload(data):
	if not data:
		return data
	names = []
	for row in data.get("hospitals") or []:
		hospital = row.get("hospital") if isinstance(row, dict) else getattr(row, "hospital", None)
		if hospital and hospital not in names:
			names.append(hospital)
	data["hospitals"] = names
	return data


@frappe.whitelist()
def get_doctor(name):
	require_login()
	if not frappe.db.exists("TC Doctor", name):
		frappe.throw("That doctor was not found")
	doc = frappe.get_doc("TC Doctor", name)
	data = _doctor_payload(doc.as_dict())
	data["schedules"] = _format_schedule_rows(
		frappe.get_all(
			"TC Doctor Schedule",
			filters={"doctor": name},
			fields=["name", "hospital", "day_of_week", "start_time", "end_time", "source"],
			order_by="day_of_week",
		)
	)
	return data


@frappe.whitelist()
def create_doctor(**kwargs):
	require_login()

	sp = current_sales_person(required=False)
	payload = frappe._dict(kwargs)
	rows = _hospital_rows(payload)
	hospital = rows[0]["hospital"] if rows else _resolve_hospital(payload.hospital)
	if not hospital:
		frappe.throw("Attach at least one hospital. Add the hospital first if it is not in the directory.")
	if not frappe.db.exists("TC Hospital", hospital):
		frappe.throw("That hospital is not in the directory. Add the hospital first, then the doctor.")
	status = payload.status or ("Approved" if is_tc_manager() else "Pending")
	assigned = resolve_sales_person(payload.assigned_to or payload.rep) or sp
	doc = frappe.new_doc("TC Doctor")
	doc.update(
		{
			"doctor_name": payload.doctor_name,
			"person_type": payload.person_type or "Unclassified",
			"person_type_other": payload.person_type_other if payload.person_type == "Other" else "",
			"person_type_source": payload.person_type_source or ("admin" if is_tc_manager() else "field_rep"),
			"specialty": payload.specialty,
			"department": payload.department,
			"designation": payload.designation,
			"hospital": hospital,
			"city": payload.city or frappe.db.get_value("TC Hospital", hospital, "city"),
			"phone": payload.phone,
			"whatsapp": payload.whatsapp,
			"email": payload.email,
			"notes": payload.notes,
			"assigned_to": assigned,
			"status": status,
			"added_by": frappe.session.user,
		}
	)
	_apply_hospitals(doc, rows or [{"hospital": hospital, "is_primary": 1}])
	doc.insert(ignore_permissions=True)
	return _doctor_payload(doc.as_dict())


@frappe.whitelist()
def update_doctor(name=None, **kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	# Portal edit used to send the display name as `name`, which overwrote the document id and 404'd.
	docname = name or payload.get("doctor_id") or payload.get("id")
	if not docname or not frappe.db.exists("TC Doctor", docname):
		frappe.throw("That doctor was not found")
	doc = frappe.get_doc("TC Doctor", docname)
	mapping = {
		"doctor_name": "doctor_name",
		"personType": "person_type",
		"person_type": "person_type",
		"personTypeOther": "person_type_other",
		"person_type_other": "person_type_other",
		"hospital": "hospital",
		"city": "city",
		"phone": "phone",
		"whatsapp": "whatsapp",
		"email": "email",
		"rep": "assigned_to",
		"assigned_to": "assigned_to",
		"specialty": "specialty",
		"designation": "designation",
		"notes": "notes",
		"image": "image",
		"imageUrl": "image",
	}
	for src, field in mapping.items():
		if payload.get(src) not in (None, ""):
			doc.set(field, payload.get(src))
	# Display name may arrive as `name` only when it is not the document id.
	if payload.get("name") and payload.get("name") != docname:
		doc.doctor_name = payload.get("name")
	if payload.personType or payload.person_type:
		doc.person_type_source = "admin"
	if payload.get("rep") or payload.get("assigned_to"):
		resolved = resolve_sales_person(payload.get("assigned_to") or payload.get("rep"))
		if resolved:
			doc.assigned_to = resolved
	if payload.get("hospitals") not in (None, "") or payload.get("hospital"):
		rows = _hospital_rows(payload, fallback=doc.hospital)
		if rows:
			_apply_hospitals(doc, rows)
	doc.save(ignore_permissions=True)
	return _doctor_payload(doc.as_dict())


@frappe.whitelist()
def delete_doctor(name=None, **kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	docname = name or payload.get("doctor_id") or payload.get("id")
	if not docname or not frappe.db.exists("TC Doctor", docname):
		frappe.throw("That doctor was not found")
	for doctype, field in (
		("TC Doctor Schedule", "doctor"),
		("TC Doctor Edit Request", "doctor"),
		("TC Follow Up", "doctor"),
		("TC Doctor Monthly Sales", "doctor"),
	):
		for row_name in frappe.get_all(doctype, filters={field: docname}, pluck="name"):
			frappe.delete_doc(doctype, row_name, ignore_permissions=True, force=True)
	frappe.delete_doc("TC Doctor", docname, ignore_permissions=True, force=True)
	return {"ok": True, "name": docname}


@frappe.whitelist()
def create_hospital(**kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	name = payload.hospital_name or payload.name
	if not name:
		frappe.throw("Hospital name is required")
	city = (payload.city or payload.territory or "").strip()
	territory = (payload.territory or payload.city or "").strip() or None
	if frappe.db.exists("TC Hospital", name):
		return frappe.get_doc("TC Hospital", name).as_dict()
	if not city:
		frappe.throw("Pick a city (territory) for this hospital")
	doc = frappe.get_doc(
		{
			"doctype": "TC Hospital",
			"hospital_name": name,
			"city": city,
			"territory": territory if territory and frappe.db.exists("Territory", territory) else None,
			"address": payload.address,
			"latitude": payload.latitude or payload.lat,
			"longitude": payload.longitude or payload.lng,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def update_hospital(name, **kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc("TC Hospital", name)
	city = payload.city or payload.territory
	if city:
		doc.city = city
		if frappe.db.exists("Territory", city):
			doc.territory = city
	if payload.address not in (None,):
		doc.address = payload.address
	lat = payload.latitude if payload.latitude not in (None, "") else payload.lat
	lng = payload.longitude if payload.longitude not in (None, "") else payload.lng
	if lat not in (None, ""):
		doc.latitude = lat
	if lng not in (None, ""):
		doc.longitude = lng
	if payload.hospital_name:
		doc.hospital_name = payload.hospital_name
	doc.save(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def eligible_products(doctor):
	require_login()
	products = frappe.get_all("TC Product", filters={"disabled": 0}, pluck="name")
	out = []
	for product in products:
		fu = active_followup(doctor, product)
		closed = cycle_is_closed(doctor, product)
		if fu or not closed:
			out.append(
				{
					"product": product,
					"followup": fu,
					"next_visit_number": 0 if fu else next_visit_number(doctor, product),
					"closed": closed and not fu,
				}
			)
	return out


def _format_schedule_rows(rows):
	for row in rows:
		row.start_time = format_hhmm(row.start_time)
		row.end_time = format_hhmm(row.end_time)
	return rows


def _format_schedule_doc(data):
	data["start_time"] = format_hhmm(data.get("start_time"))
	data["end_time"] = format_hhmm(data.get("end_time"))
	return data


@frappe.whitelist()
def list_schedules(doctor=None):
	require_login()
	filters = {}
	if doctor:
		filters["doctor"] = doctor
	return _format_schedule_rows(
		frappe.get_all(
			"TC Doctor Schedule",
			filters=filters,
			fields=["name", "doctor", "hospital", "day_of_week", "start_time", "end_time", "source"],
			order_by="doctor, day_of_week",
		)
	)


@frappe.whitelist()
def upsert_schedule(**kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	fields = {
		"doctor": payload.doctor,
		"hospital": payload.hospital,
		"day_of_week": payload.day_of_week or payload.day,
		"start_time": format_hhmm(payload.start_time or payload.start),
		"end_time": format_hhmm(payload.end_time or payload.end),
		"source": payload.source or "Manual",
	}
	if payload.name:
		doc = frappe.get_doc("TC Doctor Schedule", payload.name)
		doc.update(fields)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": "TC Doctor Schedule", **fields})
		doc.insert(ignore_permissions=True)
	return _format_schedule_doc(doc.as_dict())


@frappe.whitelist()
def delete_schedule(name):
	require_manager()
	frappe.delete_doc("TC Doctor Schedule", name, ignore_permissions=True)
	return {"ok": True}


@frappe.whitelist()
def submit_edit_request(doctor, changes, reason=None):
	require_login()
	if isinstance(changes, str):
		changes = json.loads(changes)
	doc = frappe.get_doc(
		{
			"doctype": "TC Doctor Edit Request",
			"doctor": doctor,
			"changes_json": json.dumps(changes),
			"reason": reason,
			"requested_by": frappe.session.user,
			"status": "Pending",
		}
	)
	doc.insert()
	return doc.as_dict()
