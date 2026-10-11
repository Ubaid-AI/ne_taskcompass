import json
from urllib.parse import quote

import frappe
from frappe.utils import now_datetime
from frappe.utils.file_manager import save_file

from ne_taskcompass.api.files import (
	extract_note_files,
	is_public_file_url,
	normalize_file_url,
	serve_file_url,
	strip_file_notes,
)
from ne_taskcompass.api.utils import current_sales_person, require_login
from ne_taskcompass.engine.plan_visits import opd_start_time, plan_row_is_locked, planned_visited_at
from ne_taskcompass.engine.visit_rules import active_followup, next_visit_number, visit_gps_status


VISIT_FIELDS = [
	"name",
	"salesperson",
	"doctor",
	"product",
	"visit_number",
	"is_followup",
	"followup",
	"showed_brochure",
	"did_demonstration",
	"outcome",
	"notes",
	"visited_at",
	"latitude",
	"longitude",
	"checkin_time",
	"checkin_latitude",
	"checkin_longitude",
	"checkout_time",
	"checkout_latitude",
	"checkout_longitude",
	"day_plan",
	"day_plan_item",
	"status",
	"hospital",
]


def _coord(payload, *keys):
	for key in keys:
		value = payload.get(key)
		if value not in (None, ""):
			return value
	return None


def _apply_checkin(doc, payload):
	lat = _coord(payload, "checkin_latitude", "latitude", "lat")
	lng = _coord(payload, "checkin_longitude", "longitude", "lng")
	when = payload.checkin_time or payload.visited_at
	if when:
		doc.checkin_time = when
		if not doc.visited_at:
			doc.visited_at = when
	if lat not in (None, ""):
		doc.checkin_latitude = lat
		doc.latitude = lat
	if lng not in (None, ""):
		doc.checkin_longitude = lng
		doc.longitude = lng


def _apply_checkout(doc, payload):
	lat = _coord(payload, "checkout_latitude", "checkout_lat")
	lng = _coord(payload, "checkout_longitude", "checkout_lng")
	when = payload.checkout_time
	if when:
		doc.checkout_time = when
	elif not doc.checkout_time:
		doc.checkout_time = now_datetime()
	if lat not in (None, ""):
		doc.checkout_latitude = lat
	if lng not in (None, ""):
		doc.checkout_longitude = lng


def _strip_data_url(content):
	if isinstance(content, str) and content.startswith("data:") and "," in content:
		return content.split(",", 1)[1]
	return content


def _attach_images(doc, images):
	if not images:
		return
	if isinstance(images, str):
		images = json.loads(images)
	for row in images:
		item = frappe._dict(row)
		_attach_one(doc, item)


def _attach_one(doc, payload):
	file_url = payload.file_url or payload.image
	filename = payload.filename or payload.file_name or "visit.jpg"
	content = payload.content or payload.filedata or payload.image_base64
	if content and not file_url:
		file_doc = save_file(
			filename,
			_strip_data_url(content),
			"TC Visit",
			doc.name,
			decode=True,
			is_private=0,
		)
		file_url = file_doc.file_url
	if not file_url:
		frappe.throw("Image file_url or base64 content is required")
	doc.append(
		"images",
		{
			"image": file_url,
			"caption": payload.caption,
			"taken_at": payload.taken_at or now_datetime(),
		},
	)


def _doctor_names():
	return {
		d.name: d.doctor_name
		for d in frappe.get_all("TC Doctor", fields=["name", "doctor_name"])
	}


def _decorate(row, names=None):
	names = names or _doctor_names()
	row["doctor_name"] = names.get(row.doctor)
	gps = visit_gps_status(row)
	row["gps_ok"] = gps["ok"]
	row["gps_metres"] = gps["metres"]
	row["hospital"] = gps["hospital"]
	row["gps_reason"] = gps["reason"]
	row["locked"] = plan_row_is_locked(row.get("status"))
	return row


def _image_preview(visit_name, file_url, image_name=None, idx=0):
	url = normalize_file_url(file_url)
	if is_public_file_url(url):
		return url
	query = f"name={quote(str(visit_name))}&idx={int(idx)}"
	if image_name:
		query += f"&image={quote(str(image_name))}"
	return f"/api/method/ne_taskcompass.api.visits.visit_file?{query}"


def _row_get(row, key):
	if isinstance(row, dict):
		return row.get(key)
	return row.get(key) if hasattr(row, "get") else getattr(row, key, None)


def collect_visit_images(visit_name, child_rows=None, notes=None, attached_urls=None):
	images = []
	seen = set()

	def add(url, caption="", image_name=None, taken_at=None):
		url = normalize_file_url(url)
		if not url or url in seen:
			return
		seen.add(url)
		images.append(
			{
				"name": image_name,
				"image": url,
				"caption": caption or "",
				"taken_at": taken_at,
				"file_url": _image_preview(visit_name, url, image_name, len(images)),
			}
		)

	for row in child_rows or []:
		add(
			_row_get(row, "image"),
			_row_get(row, "caption") or "",
			_row_get(row, "name"),
			_row_get(row, "taken_at"),
		)
	for extra in extract_note_files(notes):
		add(extra["image"], extra["caption"])
	for url in attached_urls or []:
		add(url)
	return images


def _apply_images(row, child_rows=None, attached_urls=None):
	raw_notes = row.get("notes") if isinstance(row, dict) else row.notes
	row["images"] = collect_visit_images(row.get("name"), child_rows, raw_notes, attached_urls)
	row["notes"] = strip_file_notes(raw_notes)
	row["image_count"] = len(row["images"])
	return row


def _ensure_images_from_notes(doc):
	existing = {normalize_file_url(row.image) for row in doc.images if row.image}
	for extra in extract_note_files(doc.notes):
		if extra["image"] in existing:
			continue
		doc.append(
			"images",
			{
				"image": extra["image"],
				"caption": extra["caption"] or None,
				"taken_at": now_datetime(),
			},
		)
		existing.add(extra["image"])


def _visit_payload(doc):
	data = doc.as_dict()
	_decorate(data)
	_apply_images(data, doc.images)
	return data


@frappe.whitelist()
def visit_file(name=None, image=None, idx=None):
	"""Serve a visit photo to anyone allowed to read that visit.

	Field photos are private Frappe files, so `/private/files/...` 403s for
	managers. Notes also contain `[OPD room photo: /private/files/...]`.
	"""
	require_login()
	if not name:
		frappe.throw("name is required")
	doc = frappe.get_doc("TC Visit", name)
	doc.check_permission("read")
	urls = [item["image"] for item in collect_visit_images(doc.name, doc.images, doc.notes)]
	file_url = None
	if image:
		for row in doc.images:
			if row.name == image:
				file_url = normalize_file_url(row.image)
				break
		if not file_url:
			candidate = normalize_file_url(image)
			if candidate in urls:
				file_url = candidate
	if file_url is None and idx not in (None, ""):
		index = int(idx)
		if 0 <= index < len(urls):
			file_url = urls[index]
	if not file_url:
		frappe.throw("No visit image")
	if file_url not in urls:
		frappe.throw("No visit image")
	serve_file_url(file_url)


@frappe.whitelist()
def list_visits(doctor=None, product=None, salesperson=None):
	"""List visits. Includes status, hospital, day_plan, check-in/out GPS, and locked."""
	require_login()
	filters = {}
	if doctor:
		filters["doctor"] = doctor
	if product:
		filters["product"] = product
	if salesperson:
		filters["salesperson"] = salesperson
	rows = frappe.get_all(
		"TC Visit",
		filters=filters,
		fields=VISIT_FIELDS,
		order_by="visited_at desc",
		limit=200,
	)
	names = _doctor_names()
	children_by_parent = {}
	attached_by_parent = {}
	visit_names = [r.name for r in rows]
	if visit_names:
		for img in frappe.get_all(
			"TC Visit Image",
			filters={"parent": ["in", visit_names]},
			fields=["name", "parent", "image", "caption", "taken_at"],
		):
			children_by_parent.setdefault(img.parent, []).append(img)
		for attached in frappe.get_all(
			"File",
			filters={"attached_to_doctype": "TC Visit", "attached_to_name": ["in", visit_names]},
			fields=["file_url", "attached_to_name"],
		):
			if attached.file_url:
				attached_by_parent.setdefault(attached.attached_to_name, []).append(attached.file_url)
	for row in rows:
		_decorate(row, names)
		_apply_images(row, children_by_parent.get(row.name, []), attached_by_parent.get(row.name, []))
	return rows


@frappe.whitelist()
def get_visit(name):
	"""Full visit including images, GPS vs hospital pin, and locked."""
	require_login()
	doc = frappe.get_doc("TC Visit", name)
	return _visit_payload(doc)


DISCUSSION_FIELDS = (
	"notes",
	"showed_brochure",
	"did_demonstration",
	"outcome",
	"blocker",
	"next_action",
	"our_units",
	"competitor_units",
)
MASTER_FIELDS = ("doctor", "hospital", "product", "salesperson")


@frappe.whitelist()
def update_visit(name, **kwargs):
	"""Portal edit. Master data (doctor/hospital/product) only while Pending or Missed."""
	require_login()
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc("TC Visit", name)
	locked = plan_row_is_locked(doc.status)
	if not locked:
		changed_place = False
		for field in MASTER_FIELDS:
			if payload.get(field) not in (None, ""):
				if doc.get(field) != payload.get(field):
					changed_place = True
				doc.set(field, payload.get(field))
		if changed_place and doc.day_plan:
			plan_date = frappe.db.get_value("TC Day Plan", doc.day_plan, "plan_date")
			visit_time = opd_start_time(doc.doctor, doc.hospital, plan_date)
			if visit_time and doc.day_plan_item:
				frappe.db.set_value(
					"TC Day Plan Item",
					doc.day_plan_item,
					"visit_time",
					visit_time,
					update_modified=False,
				)
			if plan_date:
				doc.visited_at = planned_visited_at(plan_date, visit_time)
	elif any(payload.get(field) not in (None, "") and str(payload.get(field)) != str(doc.get(field) or "") for field in MASTER_FIELDS):
		frappe.throw(
			f"This visit is {doc.status}. Doctor, hospital and product cannot be changed after check-in."
		)
	for field in DISCUSSION_FIELDS:
		if field in payload:
			if field == "notes":
				_ensure_images_from_notes(doc)
				doc.notes = strip_file_notes(payload.notes)
			else:
				doc.set(field, payload.get(field))
	doc.save(ignore_permissions=True)
	return _visit_payload(doc)


@frappe.whitelist()
def log_visit(**kwargs):
	require_login()
	payload = frappe._dict(kwargs)
	sp = payload.salesperson or current_sales_person()
	doc = frappe.new_doc("TC Visit")
	doc.update(
		{
			"salesperson": sp,
			"doctor": payload.doctor,
			"hospital": payload.hospital,
			"product": payload.product,
			"status": payload.status or "Done",
			"visited_at": payload.visited_at or payload.checkin_time,
			"is_followup": 0,
			"visit_number": payload.visit_number,
			"showed_brochure": payload.showed_brochure,
			"did_demonstration": payload.did_demonstration,
			"outcome": payload.outcome,
			"notes": payload.notes,
			"latitude": payload.latitude,
			"longitude": payload.longitude,
			"day_plan": payload.day_plan,
			"day_plan_item": payload.day_plan_item,
		}
	)
	_apply_checkin(doc, payload)
	if payload.checkout_time or payload.checkout_latitude or payload.checkout_longitude:
		_apply_checkout(doc, payload)
	if payload.person_type and payload.person_type != "Unclassified":
		doctor = frappe.get_doc("TC Doctor", payload.doctor)
		if doctor.person_type == "Unclassified":
			doctor.person_type = payload.person_type
			doctor.person_type_source = "field_rep"
			doctor.save(ignore_permissions=True)
	doc.insert(ignore_permissions=True)
	_attach_images(doc, payload.images)
	if payload.images:
		doc.save(ignore_permissions=True)
	return _visit_payload(doc)


@frappe.whitelist()
def checkin(**kwargs):
	"""Mobile app starts a visit: check-in time + GPS. Creates the visit if name is omitted."""
	require_login()
	payload = frappe._dict(kwargs)
	lat = _coord(payload, "checkin_latitude", "latitude", "lat")
	lng = _coord(payload, "checkin_longitude", "longitude", "lng")
	if lat in (None, "") or lng in (None, ""):
		frappe.throw("Check-in latitude and longitude are required")
	doc = None
	if payload.name:
		doc = frappe.get_doc("TC Visit", payload.name)
	elif payload.day_plan_item:
		existing = frappe.db.get_value("TC Visit", {"day_plan_item": payload.day_plan_item}, "name")
		if existing:
			doc = frappe.get_doc("TC Visit", existing)
	if doc is None:
		if not payload.doctor or not payload.product:
			frappe.throw("Doctor and product are required to check in")
		sp = payload.salesperson or current_sales_person()
		doc = frappe.new_doc("TC Visit")
		doc.update(
			{
				"salesperson": sp,
				"doctor": payload.doctor,
				"hospital": payload.hospital,
				"product": payload.product,
				"status": "Pending",
				"visit_number": payload.visit_number or next_visit_number(payload.doctor, payload.product),
				"is_followup": cint_flag(payload.is_followup),
				"followup": payload.followup,
				"day_plan": payload.day_plan,
				"day_plan_item": payload.day_plan_item,
				"notes": payload.notes,
			}
		)
	if payload.hospital:
		doc.hospital = payload.hospital
	_apply_checkin(doc, payload)
	if not doc.checkin_time:
		doc.checkin_time = now_datetime()
		if not doc.visited_at:
			doc.visited_at = doc.checkin_time
	doc.status = "In Progress"
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	_attach_images(doc, payload.images)
	if payload.images:
		doc.save(ignore_permissions=True)
	return _visit_payload(doc)


@frappe.whitelist()
def checkout(name, **kwargs):
	"""Mobile app ends a visit: check-out time + GPS."""
	require_login()
	payload = frappe._dict(kwargs)
	payload.name = name
	if payload.latitude not in (None, "") and payload.checkout_latitude in (None, ""):
		payload.checkout_latitude = payload.latitude
	if payload.lat not in (None, "") and payload.checkout_latitude in (None, ""):
		payload.checkout_latitude = payload.lat
	if payload.longitude not in (None, "") and payload.checkout_longitude in (None, ""):
		payload.checkout_longitude = payload.longitude
	if payload.lng not in (None, "") and payload.checkout_longitude in (None, ""):
		payload.checkout_longitude = payload.lng
	doc = frappe.get_doc("TC Visit", name)
	if not doc.checkin_time:
		frappe.throw("Check in before checking out")
	_apply_checkout(doc, payload)
	doc.status = "Done"
	if payload.notes:
		doc.notes = payload.notes
	if payload.outcome:
		doc.outcome = payload.outcome
	doc.save(ignore_permissions=True)
	_attach_images(doc, payload.images)
	if payload.images:
		doc.save(ignore_permissions=True)
	return _visit_payload(doc)


@frappe.whitelist()
def attach_image(name, **kwargs):
	"""Attach one photo to a visit. Send file_url or base64 content."""
	require_login()
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc("TC Visit", name)
	_attach_one(doc, payload)
	doc.save(ignore_permissions=True)
	return _visit_payload(doc)


def cint_flag(value):
	if value in (True, 1, "1", "true", "True"):
		return 1
	return 0


@frappe.whitelist()
def next_visit(doctor, product):
	require_login()
	fu = active_followup(doctor, product)
	return {
		"followup": fu,
		"next_visit_number": 0 if fu else next_visit_number(doctor, product),
	}
