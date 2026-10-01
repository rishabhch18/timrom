import { Injectable, signal } from "@angular/core";
export interface Person {
  id: string;
  name: string;
  username?: string;
  room?: string;
  x: number;
  y: number;
  voice?: boolean;
  muted?: boolean;
  video?: boolean;
  speaker?: boolean;
  hand?: boolean;
  blocked?: boolean;
}
export interface Room {
  id: string;
  home: string;
  name: string;
  kind: string;
  capacity: number;
  count: number;
  locked: number;
  outdoor: number;
  voice_mode: string;
  role?: string;
  people: Person[];
  messages: { id: string; name: string; body: string; user: string }[];
  items: Item[];
}
export interface Home {
  id: string;
  name: string;
  genre: string;
  city: string;
  band: string;
  member: boolean;
  role: string;
  invite?: string;
  rooms: Room[];
  members?: Person[];
}
export interface Item {
  id: string;
  asset: string;
  room?: string;
  owner: string;
  owner_type: string;
  loan?: string;
  x: number;
  y: number;
  rotation: number;
}
export interface WorldState {
  me: {
    id: string;
    name: string;
    username: string;
    band: string;
    coins: number;
    xp: number;
    level: number;
    auto: number;
    furniture_auto: number;
    voice_follow: number;
  };
  homes: Home[];
  room: Room | null;
  scene?: unknown;
  items: Item[];
  catalog: { id: string; name: string; price: number; level: number }[];
  activities: { id: string; kind: string; start: number; end: number | null }[];
  friends: { other: string; user: string; status: string; sender: string }[];
}
@Injectable({ providedIn: "root" })
export class SocialService {
  readonly state = signal<WorldState | null>(null);
  readonly status = signal("Disconnected");
  readonly error = signal("");
  readonly busy = signal(false);
  private token = "";
  private socket?: WebSocket;
  private retry?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private pending = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  signalHandler?: (from: string, data: unknown) => void;
  constructor() {
    try {
      this.token = sessionStorage.getItem("timrom.session") || "";
    } catch {}
    if (this.token) this.connect();
  }
  async auth(
    action: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    this.busy.set(true);
    this.error.set("");
    try {
      const res = await fetch("/api/auth/" + action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: "Bearer " + this.token } : {}),
        },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error || "Sign-in failed.");
      if (body.token) {
        this.token = body.token;
        try {
          sessionStorage.setItem("timrom.session", this.token);
        } catch {}
        this.connect();
      }
      return body;
    } catch (e) {
      this.error.set(
        e instanceof Error ? e.message : "Cannot reach the local server.",
      );
      throw e;
    } finally {
      this.busy.set(false);
    }
  }
  private connect() {
    clearTimeout(this.retry);
    const generation = ++this.generation;
    this.socket?.close();
    this.status.set("Connecting");
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/socket`,
    );
    this.socket = ws;
    ws.onopen = () => {
      if (generation === this.generation)
        ws.send(JSON.stringify({ type: "hello", token: this.token }));
    };
    ws.onmessage = (event) => {
      if (generation !== this.generation) return;
      const m = JSON.parse(event.data);
      if (m.type === "state") {
        this.state.set(m.data);
        this.status.set("Connected");
      }
      if (m.type === "authError") {
        this.error.set("Your session ended. Sign in again.");
        this.clear();
      }
      if (m.type === "signal") this.signalHandler?.(m.from, m.data);
      if (m.type === "error") this.error.set(m.message);
      const request = this.pending.get(m.id);
      if (request && (m.type === "ack" || m.type === "error")) {
        clearTimeout(request.timer);
        this.pending.delete(m.id);
        m.type === "ack" ? request.resolve() : request.reject(Error(m.message));
      }
    };
    ws.onclose = () => {
      if (generation !== this.generation) return;
      this.status.set("Reconnecting");
      for (const q of this.pending.values()) {
        clearTimeout(q.timer);
        q.reject(Error("Disconnected; check state before retrying."));
      }
      this.pending.clear();
      if (this.token) this.retry = setTimeout(() => this.connect(), 1500);
    };
    ws.onerror = () =>
      this.error.set("Cannot reach the local server. Run npm run dev.");
  }
  command(type: string, data: Record<string, unknown> = {}): Promise<void> {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.status() !== "Connected"
    )
      return Promise.reject(Error("Wait for the connection to return."));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Server did not confirm the action."));
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ type, data, id }));
    });
  }
  async run(type: string, data: Record<string, unknown> = {}) {
    this.error.set("");
    try {
      await this.command(type, data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Action failed.");
    }
  }
  signal(to: string, data: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(
        JSON.stringify({ type: "signal", data: { to, signal: data } }),
      );
  }
  async logout() {
    try {
      await this.auth("logout", {});
    } finally {
      this.clear();
    }
  }
  private clear() {
    this.generation++;
    clearTimeout(this.retry);
    this.socket?.close();
    this.token = "";
    try {
      sessionStorage.removeItem("timrom.session");
    } catch {}
    this.state.set(null);
    this.status.set("Disconnected");
    for (const q of this.pending.values()) {
      clearTimeout(q.timer);
      q.reject(Error("Session ended."));
    }
    this.pending.clear();
  }
}
