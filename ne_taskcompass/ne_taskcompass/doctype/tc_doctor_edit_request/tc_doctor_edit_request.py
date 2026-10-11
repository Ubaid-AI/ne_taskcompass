import json

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

ALLOWED_FIELDS = {
	"doctor_name",
	"person_type",
	"person_type_other",
	"specialty",
	"department",
	"designation",
	"hospital",
	"city",
	"phone",
	"whatsapp",
	"email",
	"notes",
}


class TCDoctorEditRequest(Document):
	def before_insert(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user

	def validate(self):
		changes = self._parsed_changes()
		if not changes:
			frappe.throw("Changes JSON must be a non-empty object of field: {from, to}")
		for field in changes:
			if field not in ALLOWED_FIELDS:
				frappe.throw(f"Field {field} cannot be changed through an edit request")
		if self.status in ("Approved", "Rejected") and not self.reviewed_by:
			self.reviewed_by = frappe.session.user
			self.reviewed_at = now_datetime()

	def on_update(self):
		if self.status == "Approved" and self.has_value_changed("status"):
			self._apply()

	def _parsed_changes(self):
		try:
			data = json.loads(self.changes_json or "{}")
		except json.JSONDecodeError:
			frappe.throw("Changes JSON is not valid JSON")
		if not isinstance(data, dict):
			frappe.throw("Changes JSON must be an object")
		return data

	def _apply(self):
		self.reviewed_by = frappe.session.user
		self.reviewed_at = now_datetime()
		doctor = frappe.get_doc("TC Doctor", self.doctor)
		changes = self._parsed_changes()
		for field, spec in changes.items():
			new_value = spec.get("to") if isinstance(spec, dict) else spec
			if field == "person_type":
				doctor.person_type_source = "field_rep"
			doctor.set(field, new_value)
		doctor.save(ignore_permissions=True)
