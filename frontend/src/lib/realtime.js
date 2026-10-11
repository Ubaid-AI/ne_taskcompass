// Live updates from Supabase.
//
// Supabase Realtime speaks the Phoenix Channels protocol over a WebSocket. The
// official client wraps that, but this project deliberately avoids npm
// dependencies, so the handful of frames we need are written out by hand below.
//
// The socket is treated as an optimisation, never as a requirement. Realtime
// has to be enabled per table on the server (migration 003 does that), the
// connection can be blocked by a corporate proxy, and a phone on a weak signal
// will drop it. So if the socket fails to connect, errors, or simply goes quiet,
// this falls back to polling on a timer. The caller gets the same callback
// either way and does not need to know which mode is running.

const HEARTBEAT_MS = 25000;
const POLL_MS = 12000;
const CONNECT_TIMEOUT_MS = 6000;

export function createRealtime({ url, key, tables, onChange, onStatus }) {
  let socket = null;
  let heartbeat = null;
  let pollTimer = null;
  let connectTimer = null;
  let ref = 0;
  let closed = false;
  let mode = "starting";

  const setMode = (next, detail) => {
    if (mode === next) return;
    mode = next;
    onStatus?.(next, detail);
  };

  const nextRef = () => String(++ref);

  function startPolling(reason) {
    if (closed || pollTimer) return;
    setMode("polling", reason);
    pollTimer = setInterval(() => onChange?.({ table: "*", reason: "poll" }), POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function connect() {
    if (closed) return;
    if (typeof WebSocket === "undefined") {
      startPolling("no WebSocket in this environment");
      return;
    }

    const wsUrl =
      url.replace(/^http/, "ws") + `/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`;

    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      startPolling(`socket could not be created: ${e.message}`);
      return;
    }

    // If the handshake stalls, do not sit there waiting. Start polling so the
    // user still sees fresh data, and let the socket take over if it arrives.
    connectTimer = setTimeout(() => {
      if (mode !== "realtime") startPolling("socket did not connect in time");
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      clearTimeout(connectTimer);
      for (const table of tables) {
        socket.send(JSON.stringify({
          topic: `realtime:public:${table}`,
          event: "phx_join",
          payload: {
            config: {
              postgres_changes: [{ event: "*", schema: "public", table }],
            },
          },
          ref: nextRef(),
        }));
      }
      heartbeat = setInterval(() => {
        if (socket?.readyState === 1) {
          socket.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: nextRef() }));
        }
      }, HEARTBEAT_MS);
      stopPolling();
      setMode("realtime");
    };

    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.event !== "postgres_changes") return;
      const payload = msg.payload?.data || msg.payload;
      const table = payload?.table || msg.topic?.split(":").pop();
      onChange?.({
        table,
        type: payload?.type || payload?.eventType,
        record: payload?.record,
        old: payload?.old_record,
        reason: "realtime",
      });
    };

    socket.onerror = () => startPolling("socket error");

    socket.onclose = () => {
      clearInterval(heartbeat);
      clearTimeout(connectTimer);
      heartbeat = null;
      if (closed) return;
      // Keep the data moving while we wait, then try the socket again.
      startPolling("socket closed, retrying");
      setTimeout(connect, 5000);
    };
  }

  connect();

  return {
    get mode() {
      return mode;
    },
    close() {
      closed = true;
      stopPolling();
      clearInterval(heartbeat);
      clearTimeout(connectTimer);
      try {
        socket?.close();
      } catch {
        /* already gone */
      }
    },
  };
}
