import { createContext, useContext, useEffect, useState } from "react";
import { api, frappeLogout } from "../lib/frappe.js";

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const [dashboardUser, setDashboardUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .call("ne_taskcompass.api.auth.me")
      .then((me) => {
        if (me?.ok) setDashboardUser(shapeUser(me));
      })
      .catch(() => setDashboardUser(null))
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    setDashboardUser(null);
    await frappeLogout();
  }

  return (
    <SessionCtx.Provider value={{ dashboardUser, setDashboardUser, ready, logout, mobileUser: null, setMobileUser: () => {} }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function shapeUser(me) {
  const name = me.full_name || me.user || "";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0] || "?").slice(0, 1) + (parts[1] || "").slice(0, 1)).toUpperCase();
  if (me.brand && typeof window !== "undefined") {
    window.tc_brand = { ...(window.tc_brand || {}), ...me.brand };
  }
  return {
    id: me.user,
    email: me.email,
    name,
    initials,
    kind: me.is_manager ? "admin" : "field",
    role: me.is_super_admin ? "super_admin" : me.is_admin ? "management" : me.is_manager ? "sales_manager" : "salesperson",
    isSuperAdmin: Boolean(me.is_super_admin),
    isAdmin: Boolean(me.is_admin),
    salesPerson: me.sales_person,
    territory: me.territory,
    roles: me.roles || [],
    portalOnly: Boolean(me.portal_only),
  };
}

export function useSession() {
  return useContext(SessionCtx);
}
