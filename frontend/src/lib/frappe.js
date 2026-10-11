const CSRF = () => window.csrf_token || (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "";

async function request(method, args = {}) {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Frappe-CSRF-Token": CSRF(),
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.exc || data.exception) {
    const msg = (data._server_messages && safeParse(data._server_messages)) || data.exception || data.exc || "Request failed";
    throw new Error(Array.isArray(msg) ? msg.map(stripHtml).join(" ") : String(msg));
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data.message;
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed.map((item) => {
      try {
        const obj = JSON.parse(item);
        return obj.message || item;
      } catch {
        return item;
      }
    });
  } catch {
    return raw;
  }
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, "");
}

export async function uploadFile({ file, doctype, docname, fieldname, isPrivate = 1 }) {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("is_private", String(isPrivate));
  if (doctype) body.append("doctype", doctype);
  if (docname) body.append("docname", docname);
  if (fieldname) body.append("fieldname", fieldname);
  const res = await fetch("/api/method/upload_file", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "X-Frappe-CSRF-Token": CSRF() },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.exc || data.exception) {
    throw new Error(data.message || data.exception || "Could not upload the file");
  }
  return data.message;
}

export const api = {
  call: request,
  get: (method, args) => request(method, args),
};

export async function frappeLogin(usr, pwd) {
  const res = await fetch("/api/method/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const data = await res.json();
  if (!res.ok || data.exc || data.message === "Invalid login credentials") {
    throw new Error("Invalid email or password");
  }
  return api.call("ne_taskcompass.api.auth.me");
}

export async function frappeLogout() {
  try {
    await request("ne_taskcompass.api.auth.logout");
  } finally {
    window.location.href = "/login?redirect-to=/livetrack";
  }
}
