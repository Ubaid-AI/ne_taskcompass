// Copyright (c) 2026, Ubaid Khanzada and contributors
// For license information, please see license.txt

frappe.ui.form.on("TC Visit", {
	refresh(frm) {
		frm.clear_custom_buttons();
		if (frm.is_new()) return;
		const locked = frm.doc.status && !["Pending", "Missed"].includes(frm.doc.status);
		["doctor", "hospital", "product", "salesperson"].forEach((field) => {
			frm.set_df_property(field, "read_only", locked ? 1 : 0);
		});
		if (frm.doc.status === "Pending" && !frm.doc.checkin_time) {
			frm.add_custom_button(__("Check-In"), () => with_gps(frm, "checkin"));
		}
		if (frm.doc.status === "In Progress" && !frm.doc.checkout_time) {
			frm.add_custom_button(__("Check-Out"), () => with_gps(frm, "checkout"));
		}
	},
});

function with_gps(frm, action) {
	if (!navigator.geolocation) {
		frappe.msgprint("Location is not available in this browser.");
		return;
	}
	frappe.dom.freeze(__("Getting location…"));
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			frappe.dom.unfreeze();
			const args = {
				name: frm.doc.name,
				latitude: pos.coords.latitude,
				longitude: pos.coords.longitude,
			};
			if (action === "checkin") {
				args.checkin_latitude = pos.coords.latitude;
				args.checkin_longitude = pos.coords.longitude;
			} else {
				args.checkout_latitude = pos.coords.latitude;
				args.checkout_longitude = pos.coords.longitude;
			}
			frappe.call({
				method: `ne_taskcompass.api.visits.${action}`,
				args,
				freeze: true,
				callback() {
					frm.reload_doc();
				},
			});
		},
		() => {
			frappe.dom.unfreeze();
			frappe.msgprint("Allow location to check in or check out.");
		},
		{ enableHighAccuracy: true, timeout: 15000 }
	);
}
