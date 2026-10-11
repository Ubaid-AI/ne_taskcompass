// Copyright (c) 2026, Ubaid Khanzada and contributors
// For license information, please see license.txt

frappe.ui.form.on("TC Doctor Schedule", {
	setup(frm) {
		frm.set_query("hospital", () => {
			if (!frm.doc.doctor) {
				return { filters: { name: ["in", ["__none__"]] } };
			}
			return {
				query: "ne_taskcompass.ne_taskcompass.doctype.tc_doctor_schedule.tc_doctor_schedule.hospital_query",
				filters: { doctor: frm.doc.doctor },
			};
		});
	},
	refresh(frm) {
		apply_hhmm(frm);
	},
	onload_post_render(frm) {
		apply_hhmm(frm);
	},
	doctor(frm) {
		frm.set_value("hospital", "");
		if (!frm.doc.doctor) return;
		frappe.db.get_doc("TC Doctor", frm.doc.doctor).then((doc) => {
			const names = (doc.hospitals || []).map((r) => r.hospital).filter(Boolean);
			if (names.length === 1) {
				frm.set_value("hospital", names[0]);
			}
		});
	},
});

function apply_hhmm(frm) {
	["start_time", "end_time"].forEach((fieldname) => {
		const ctrl = frm.fields_dict[fieldname];
		if (!ctrl) return;
		ctrl.time_format = "HH:mm";
		if (ctrl.datepicker_options) {
			ctrl.datepicker_options.timeFormat = "hh:ii";
		}
		if (ctrl.datepicker) {
			try {
				ctrl.datepicker.update({ timeFormat: "hh:ii" });
				const $tp = ctrl.datepicker.timepicker;
				if ($tp && $tp.$seconds) {
					$tp.$seconds.parent().hide();
					$tp.$secondsText.hide();
					$tp.$secondsText.prev().hide();
				}
			} catch (e) {
				/* picker not ready yet */
			}
		}
	});
}
