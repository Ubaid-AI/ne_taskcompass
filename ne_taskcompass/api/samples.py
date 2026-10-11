import mimetypes
import os
import re

import frappe
from frappe.utils import now_datetime
from frappe.utils.file_manager import get_file_path

from ne_taskcompass.api.utils import current_sales_person, require_admin, require_login
from ne_taskcompass.engine.sample_rules import other_product_samples

STAMPED_DOC_RE = re.compile(
	r"\[Stamped review document:\s*([^\]]+)\]",
	re.IGNORECASE,
)
FILE_URL_RE = re.compile(r"(/?(?:private/)?files/[^\s\]\"']+)", re.IGNORECASE)


def _normalize_file_url(url):
	url = (url or "").strip()
	if not url:
		return ""
	if url.startswith("http://") or url.startswith("https://"):
		from urllib.parse import urlparse

		path = urlparse(url).path or ""
		url = path
	if url.startswith("private/files/") or url.startswith("files/"):
		url = "/" + url
	return url


def extract_stamped_url(row):
	"""File URL from the Attach field, or from the marker the mobile app puts in review_text."""
	url = _normalize_file_url(row.get("stamped_document") if isinstance(row, dict) else getattr(row, "stamped_document", None))
	review = row.get("review_text") if isinstance(row, dict) else getattr(row, "review_text", None)
	review = review or ""
	if not url:
		match = STAMPED_DOC_RE.search(review)
		if match:
			url = _normalize_file_url(match.group(1))
		else:
			match = FILE_URL_RE.search(review)
			if match:
				url = _normalize_file_url(match.group(1))
	clean_review = STAMPED_DOC_RE.sub("", review).strip()
	return url, clean_review


def _link_file_to_sample(file_url, sample_name):
	if not file_url or not sample_name:
		return
	file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
	if not file_name:
		file_name = frappe.db.get_value("File", {"file_name": file_url.rsplit("/", 1)[-1]}, "name")
	if not file_name:
		return
	frappe.db.set_value(
		"File",
		file_name,
		{
			"attached_to_doctype": "TC Sample Order",
			"attached_to_name": sample_name,
			"attached_to_field": "stamped_document",
		},
		update_modified=False,
	)


def decorate_sample(row):
	url, clean = extract_stamped_url(row)
	row["stamped_document"] = url
	row["review_text"] = clean
	row["stamped_file_url"] = (
		f"/api/method/ne_taskcompass.api.samples.stamped_file?name={row['name']}" if url and row.get("name") else ""
	)
	return row


def _safe_disk_path(file_url):
	if not file_url or ".." in file_url:
		return None
	path = get_file_path(file_url)
	if not path:
		return None
	real = os.path.realpath(path)
	private_root = os.path.realpath(frappe.get_site_path("private", "files"))
	public_root = os.path.realpath(frappe.get_site_path("public", "files"))
	if not (real.startswith(private_root + os.sep) or real.startswith(public_root + os.sep)):
		return None
	if not os.path.isfile(real):
		return None
	return real


@frappe.whitelist()
def list_samples(status=None, doctor=None):
	require_login()
	filters = {}
	if status:
		filters["status"] = status
	if doctor:
		filters["doctor"] = doctor
	rows = frappe.get_all(
		"TC Sample Order",
		filters=filters,
		fields=[
			"name",
			"doctor",
			"doctor_name",
			"product",
			"requested_by",
			"status",
			"related_surgeries_pm",
			"total_surgeries_pm",
			"expected_consumption_pm",
			"relevance_pct",
			"approval_warning",
			"hospital_name",
			"designation",
			"department",
			"review_text",
			"interest_level",
			"expected_usage_date",
			"stamped_document",
			"creation",
		],
		order_by="creation desc",
	)
	return [decorate_sample(row) for row in rows]


@frappe.whitelist()
def stamped_file(name=None):
	"""Serve the stamped review photo to anyone allowed to read that sample.

	The mobile app stores these as private Frappe files. A manager is not the
	uploader, so `/private/files/...` returns 403 in an <img> tag. This
	endpoint reads the bytes from disk after checking sample read permission.
	"""
	require_login()
	if not name:
		frappe.throw("name is required")
	doc = frappe.get_doc("TC Sample Order", name)
	doc.check_permission("read")
	file_url, _ = extract_stamped_url(doc)
	if not file_url:
		frappe.throw("No stamped document")

	filename = os.path.basename(file_url)
	content = None
	disk_path = _safe_disk_path(file_url)
	if disk_path:
		filename = os.path.basename(disk_path)
		with open(disk_path, "rb") as handle:
			content = handle.read()
	else:
		file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
		if file_name:
			content = frappe.get_doc("File", file_name).get_content()
			filename = frappe.db.get_value("File", file_name, "file_name") or filename
	if not content:
		frappe.throw("File not found")

	frappe.local.response.filename = filename
	frappe.local.response.filecontent = content
	frappe.local.response.type = "download"
	frappe.local.response.display_content_as = "inline"
	frappe.local.response.content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"


@frappe.whitelist()
def sample_warning(doctor, product=None):
	require_login()
	rows = other_product_samples(doctor, exclude_product=product)
	return {"warning": bool(rows), "existing": rows}


@frappe.whitelist()
def create_sample(**kwargs):
	require_login()
	payload = frappe._dict(kwargs)
	doc = frappe.new_doc("TC Sample Order")
	doc.update(
		{
			"doctor": payload.doctor,
			"product": payload.product,
			"requested_by": payload.requested_by or current_sales_person(),
			"doctor_name": payload.doctor_name or frappe.db.get_value("TC Doctor", payload.doctor, "doctor_name"),
			"designation": payload.designation,
			"hospital_name": payload.hospital_name,
			"department": payload.department,
			"related_surgeries_pm": payload.related_surgeries_pm,
			"total_surgeries_pm": payload.total_surgeries_pm,
			"expected_consumption_pm": payload.expected_consumption_pm,
			"status": "Pending",
		}
	)
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def attach_review(name, review_text=None, interest_level=None, expected_usage_date=None, stamped_document=None):
	require_login()
	doc = frappe.get_doc("TC Sample Order", name)
	if review_text is not None:
		doc.review_text = review_text
	if interest_level:
		doc.interest_level = interest_level
	if expected_usage_date:
		doc.expected_usage_date = expected_usage_date
	if stamped_document:
		doc.stamped_document = stamped_document
	url, clean = extract_stamped_url(doc)
	if url:
		doc.stamped_document = url
		doc.review_text = clean
		_link_file_to_sample(url, doc.name)
	doc.save()
	return decorate_sample(doc.as_dict())


@frappe.whitelist()
def decide_sample(name, action, review_note=None, confirm_additional=0):
	require_admin()
	doc = frappe.get_doc("TC Sample Order", name)
	action = (action or "").title()
	if action not in ("Approved", "Rejected"):
		frappe.throw("action must be Approved or Rejected")
	warning_rows = other_product_samples(doc.doctor, exclude_product=doc.product, exclude_name=doc.name)
	if action == "Approved" and warning_rows and not int(confirm_additional or 0):
		return {
			"ok": False,
			"needs_confirmation": True,
			"warning": doc.approval_warning,
			"existing": warning_rows,
		}
	doc.status = action
	doc.review_note = review_note
	doc.reviewed_by = frappe.session.user
	doc.reviewed_at = now_datetime()
	doc.save()
	return {"ok": True, "doc": decorate_sample(doc.as_dict())}
