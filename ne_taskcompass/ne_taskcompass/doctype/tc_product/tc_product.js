frappe.ui.form.on("TC Product", {
	item(frm) {
		if (!frm.doc.item) return;
		frappe.db.get_value("Item", frm.doc.item, ["item_name", "standard_rate", "item_group"], (r) => {
			if (!r) return;
			if (r.item_name && !frm.doc.product_name) {
				frm.set_value("product_name", r.item_name);
			}
			if (r.standard_rate && !frm.doc.unit_price) {
				frm.set_value("unit_price", r.standard_rate);
			}
			if (r.item_group && !frm.doc.category) {
				frm.set_value("category", r.item_group);
			}
		});
	},
});
