import { useState, useEffect, useRef, useCallback } from "react";
export function useWorld() {
  const [token, setToken] = useState(() => localStorage.getItem("ow-token")),
    [state, setState] = useState(null),
    [status, setStatus] = useState("connecting"),
    [error, setError] = useState("");
  const socket = useRef(null),
    pending = useRef(new Map()),
    signal = useRef(() => {});
  useEffect(() => {
    if (!token) {
      setState(null);
      setStatus("signed out");
      return;
    }
    let disposed = false,
      timer,
      attempt = 0;
    const rejectPending = () => {
      for (const p of pending.current.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("Connection interrupted. Please retry."));
      }
      pending.current.clear();
    };
    function connect() {
      if (disposed) return;
      setStatus("connecting");
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/socket`,
      );
      socket.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: "hello", token }));
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "state") {
          attempt = 0;
          setState(m.data);
          setStatus("connected");
        }
        if (m.type === "authError") {
          localStorage.removeItem("ow-token");
          setToken(null);
        }
        if (m.type === "signal") signal.current(m);
        if (m.type === "ack" || m.type === "error") {
          const p = pending.current.get(m.id);
          if (p) {
            clearTimeout(p.timer);
            pending.current.delete(m.id);
            m.type === "ack" ? p.resolve() : p.reject(new Error(m.message));
          } else if (m.type === "error") setError(m.message);
        }
      };
      ws.onclose = () => {
        rejectPending();
        if (!disposed) {
          setStatus("reconnecting");
          timer = setTimeout(connect, Math.min(10000, 500 * 2 ** attempt++));
        }
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socket.current?.close();
      rejectPending();
    };
  }, [token]);
  const command = useCallback(
    (type, data = {}) =>
      new Promise((resolve, reject) => {
        const ws = socket.current;
        if (ws?.readyState !== 1)
          return reject(new Error("Waiting for the world to reconnect."));
        const id = crypto.randomUUID();
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error("No response. Please retry."));
        }, 10000);
        pending.current.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, type, data }));
      }),
    [],
  );
  const sendSignal = useCallback((to, data) => {
    if (socket.current?.readyState === 1)
      socket.current.send(
        JSON.stringify({ type: "signal", data: { to, signal: data } }),
      );
  }, []);
  async function account(action, data) {
    const res = await fetch("/api/auth/" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw Error(result.error || "Account request failed.");
    if (result.token) {
      setError("");
      localStorage.setItem("ow-token", result.token);
      setToken(result.token);
    }
    return result;
  }
  function logout() {
    setError("");
    account("logout", {}).catch(() => {});
    localStorage.removeItem("ow-token");
    setToken(null);
    setState(null);
  }
  return {
    state,
    status,
    error,
    setError,
    command,
    account,
    logout,
    token,
    signal,
    sendSignal,
  };
}
