// Copyright (c) 2026, Ubaid Khanzada and contributors
// For license information, please see license.txt

frappe.ui.form.on("TC Day Plan", {
	setup(frm) {
		frm.set_query("hospital", "items", function (doc, cdt, cdn) {
			const row = locals[cdt][cdn];
			if (!row.doctor) {
				return { filters: { name: ["in", ["__none__"]] } };
			}
			return {
				query: "ne_taskcompass.ne_taskcompass.doctype.tc_doctor_schedule.tc_doctor_schedule.hospital_query",
				filters: { doctor: row.doctor },
			};
		});
	},
	refresh(frm) {
		lock_item_rows(frm);
	},
	plan_date(frm) {
		(frm.doc.items || []).forEach((row) => {
			if (row.doctor && row.hospital && !is_locked(row.status)) {
				fetch_visit_time(frm, row.doctype, row.name);
			}
		});
	},
});

frappe.ui.form.on("TC Day Plan Item", {
	form_render(frm, cdt, cdn) {
		lock_one_row(frm, cdt, cdn);
	},
	doctor(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (is_locked(row.status)) return;
		frappe.model.set_value(cdt, cdn, "hospital", "");
		frappe.model.set_value(cdt, cdn, "visit_time", "");
		if (!row.doctor) return;
		frappe.db.get_doc("TC Doctor", row.doctor).then((doc) => {
			const names = (doc.hospitals || []).map((r) => r.hospital).filter(Boolean);
			if (names.length === 1) {
				frappe.model.set_value(cdt, cdn, "hospital", names[0]);
			}
		});
	},
	hospital(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (is_locked(row.status)) return;
		fetch_visit_time(frm, cdt, cdn);
	},
});

function is_locked(status) {
	return status && !["Pending", "Missed"].includes(status);
}

function lock_item_rows(frm) {
	(frm.doc.items || []).forEach((row) => lock_one_row(frm, row.doctype, row.name));
}

function lock_one_row(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) return;
	const locked = is_locked(row.status);
	const grid_row = frm.fields_dict.items.grid.grid_rows_by_docname[cdn];
	if (!grid_row) return;
	["doctor", "hospital", "product", "visit_time", "status"].forEach((field) => {
		grid_row.toggle_editable(field, !locked);
	});
	if (locked) {
		grid_row.wrapper.find(".grid-remove-row, .grid-duplicate-row").hide();
	}
}

function fetch_visit_time(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row.doctor || !row.hospital) {
		frappe.model.set_value(cdt, cdn, "visit_time", "");
		return;
	}
	frappe.call({
		method: "ne_taskcompass.api.plans.opd_start_time",
		args: {
			doctor: row.doctor,
			hospital: row.hospital,
			plan_date: frm.doc.plan_date,
		},
		callback(r) {
			if (r.message) {
				frappe.model.set_value(cdt, cdn, "visit_time", r.message);
			}
		},
	});
}
