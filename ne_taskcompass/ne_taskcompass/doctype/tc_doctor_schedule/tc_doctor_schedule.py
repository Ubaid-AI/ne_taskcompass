import frappe
from frappe.model.document import Document


def format_hhmm(value):
	"""Normalise a Time / Data / timedelta value to HH:MM."""
	if value in (None, ""):
		return ""
	if hasattr(value, "total_seconds"):
		total = int(value.total_seconds()) % (24 * 3600)
		hours, rem = divmod(total, 3600)
		minutes = rem // 60
		return f"{hours:02d}:{minutes:02d}"
	if hasattr(value, "hour") and hasattr(value, "minute"):
		return f"{int(value.hour):02d}:{int(value.minute):02d}"
	text = str(value).strip()
	if not text:
		return ""
	parts = text.split(":")
	try:
		hours = int(parts[0])
		minutes = int(parts[1]) if len(parts) > 1 else 0
	except (TypeError, ValueError):
		frappe.throw("Start and end time must be HH:MM")
	if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
		frappe.throw("Start and end time must be HH:MM")
	return f"{hours:02d}:{minutes:02d}"


def get_doctor_hospital_names(doctor):
	"""Hospitals from the doctor's Hospitals child table only."""
	if not doctor:
		return []
	names = []
	for hospital in frappe.get_all(
		"TC Doctor Hospital",
		filters={"parent": doctor},
		pluck="hospital",
		order_by="idx",
	):
		if hospital and hospital not in names:
			names.append(hospital)
	return names


def attach_hospitals_to_doctors(rows):
	if not rows:
		return rows
	names = [row.name for row in rows]
	links = frappe.get_all(
		"TC Doctor Hospital",
		filters={"parent": ["in", names]},
		fields=["parent", "hospital"],
		order_by="idx",
	)
	by_parent = {}
	for row in links:
		if row.hospital:
			by_parent.setdefault(row.parent, []).append(row.hospital)
	for row in rows:
		seen = []
		for hospital in by_parent.get(row.name, []):
			if hospital not in seen:
				seen.append(hospital)
		row["hospitals"] = seen
	return rows


class TCDoctorSchedule(Document):
	def validate(self):
		start = format_hhmm(self.start_time)
		end = format_hhmm(self.end_time)
		self.start_time = start
		self.end_time = end
		self._validate_hospital()
		if not start or not end:
			frappe.throw("Start time and end time are required (HH:MM)")
		if start >= end:
			frappe.throw("End time must be after start time")
		self._validate_duplicate(start, end)

	def _validate_hospital(self):
		if not self.doctor:
			frappe.throw("Doctor is required")
		if not self.hospital:
			frappe.throw("Hospital is required")
		allowed = get_doctor_hospital_names(self.doctor)
		if not allowed:
			frappe.throw("This doctor has no hospitals in the Hospitals table. Add them on the doctor first.")
		if self.hospital not in allowed:
			frappe.throw("Hospital must be one this doctor is attached to")

	def _validate_duplicate(self, start, end):
		filters = {
			"doctor": self.doctor,
			"hospital": self.hospital,
			"day_of_week": self.day_of_week,
		}
		if not self.is_new():
			filters["name"] = ["!=", self.name]
		for row in frappe.get_all(
			"TC Doctor Schedule",
			filters=filters,
			fields=["name", "start_time", "end_time"],
		):
			if format_hhmm(row.start_time) == start and format_hhmm(row.end_time) == end:
				frappe.throw(
					"This doctor already has a schedule at this hospital with the same day and timings. "
					"Use a different start or end time."
				)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def hospital_query(doctype, txt, searchfield, start, page_len, filters):
	doctor = (filters or {}).get("doctor")
	names = get_doctor_hospital_names(doctor)
	if not names:
		return []
	txt = (txt or "").strip()
	or_filters = None
	if txt:
		or_filters = {
			"name": ["like", f"%{txt}%"],
			"hospital_name": ["like", f"%{txt}%"],
		}
	return frappe.get_all(
		"TC Hospital",
		filters={"name": ["in", names]},
		or_filters=or_filters,
		fields=["name", "hospital_name"],
		limit_start=start,
		limit_page_length=page_len,
		order_by="hospital_name",
		as_list=1,
	)


def on_doctype_update():
	frappe.db.add_index("TC Doctor Schedule", ["doctor", "hospital", "day_of_week"])
