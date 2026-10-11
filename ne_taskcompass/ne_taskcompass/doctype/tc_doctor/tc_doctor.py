import frappe
from frappe.model.document import Document

HUMAN_SOURCES = {"admin", "field_rep"}


class TCDoctor(Document):
	def before_insert(self):
		if not self.added_by:
			self.added_by = frappe.session.user
		if not self.status:
			self.status = "Pending"

	def validate(self):
		self.updated_by_user = frappe.session.user
		if self.person_type == "Other":
			self.person_type_other = (self.person_type_other or "").strip()
			if not self.person_type_other:
				frappe.throw("Describe the person type when you choose Other")
		else:
			self.person_type_other = ""
		self._validate_confidence()
		self._validate_hod_evidence()
		self._protect_human_classification()
		self._validate_one_hod()
		self._sync_primary_hospital()

	def _validate_confidence(self):
		for field in ("person_type_confidence", "hod_confidence"):
			value = self.get(field)
			if value is not None and (value < 0 or value > 1):
				frappe.throw(f"{self.meta.get_label(field)} must be between 0 and 1")

	def _validate_hod_evidence(self):
		if self.hod_candidate and not self.hod_evidence:
			frappe.throw("HOD candidates must carry the evidence that triggered the flag")

	def _protect_human_classification(self):
		if self.is_new():
			return
		previous = self.get_doc_before_save()
		if not previous:
			return
		if previous.person_type_source in HUMAN_SOURCES and self.person_type_source not in HUMAN_SOURCES:
			if previous.person_type != self.person_type:
				frappe.throw(
					"An import cannot overwrite a person type that a human already confirmed (R12)"
				)
			self.person_type = previous.person_type
			self.person_type_source = previous.person_type_source

	def _validate_one_hod(self):
		if self.person_type != "HOD" or not self.hospital:
			return
		specialty = self.specialty or self.department
		filters = {
			"person_type": "HOD",
			"hospital": self.hospital,
			"name": ["!=", self.name or "new"],
		}
		others = frappe.get_all("TC Doctor", filters=filters, fields=["name", "specialty", "department"])
		for row in others:
			other_key = row.specialty or row.department
			if (specialty or "") == (other_key or ""):
				frappe.throw(
					f"Hospital {self.hospital} already has an HOD for this department/specialty ({row.name})"
				)

	def _sync_primary_hospital(self):
		if self.hospital and not any(r.hospital == self.hospital for r in self.hospitals):
			self.append("hospitals", {"hospital": self.hospital, "is_primary": 1})
		primaries = [r for r in self.hospitals if r.is_primary]
		if len(primaries) > 1:
			frappe.throw("A doctor can have only one primary hospital")
		if primaries and not self.hospital:
			self.hospital = primaries[0].hospital
