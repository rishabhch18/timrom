import { applyStatePatch } from "../shared/state-patch.mjs";
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
  personalMuted?: boolean;
  role?: string;
  activity?: string;
  action?: { item: string; kind: string; phase: "approach" | "active" } | null;
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
  access: string;
  selectedUsers?: string[];
  people: Person[];
  messages: Message[];
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
  rules: string;
  country: string;
  state: string;
  region: string;
  description: string;
  language: string;
  listing: string;
  favourite: boolean;
  latitude?: number;
  longitude?: number;
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
  deviceActive?: boolean;
  capabilities: {
    media: string;
    localCallLimit: number;
    productionMediaReady: boolean;
  };
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
    body: string;
    color: string;
    operator: boolean;
    preferences: Record<string, any>;
  };
  homes: Home[];
  frozenHomes: { id: string; name: string; owner: string; reason: string }[];
  room: Room | null;
  scene?: Scene;
  notifications: { id: string; body: string; seen: number; time: number }[];
  directMessages: {
    id: string;
    sender: string;
    recipient: string;
    body: string;
    time: number;
  }[];
  offers: {
    id: string;
    item: string;
    sender: string;
    home: string;
    mode: string;
    asset: string;
    name: string;
  }[];
  transfers: { home: string; sender: string; recipient: string }[];
  blocks: { target: string; name: string }[];
  audit?: {
    id: string;
    actor: string;
    target: string;
    action: string;
    time: number;
  }[];
  listingQueue?: Home[];
  reports?: {
    id: string;
    user: string;
    target: string;
    body: string;
    resolution?: string;
  }[];
  serverTime: number;
  items: Item[];
  catalog: { id: string; name: string; price: number; level: number }[];
  activities: {
    id: string;
    kind: string;
    start: number;
    end: number | null;
    visibility: string;
  }[];
  friends: {
    other: string;
    user: string;
    status: string;
    sender: string;
    username?: string;
  }[];
}
export interface Message {
  id: string;
  name: string;
  body: string;
  user: string;
  deleted?: number;
  edited?: number;
  replyPreview?: { name: string; body: string };
  reactions?: { user: string; emoji: string }[];
}
export interface LayoutRoom extends Room {
  ox: number;
  oy: number;
  width: number;
  height: number;
}
export interface Door {
  a: string;
  b: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
export interface Scene {
  home: string;
  rooms: LayoutRoom[];
  portals: Door[];
  revision: number;
  people: Person[];
}
@Injectable({ providedIn: "root" })
export class SocialService {
  readonly locale = signal("en");
  language() {
    return this.state()?.me.preferences?.["language"] || this.locale();
  }
  setLanguage(value: string) {
    this.locale.set(value);
    if (this.state()) void this.run("preferences", { language: value });
  }
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
      resolve: (value?: any) => void;
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
      if (body.deleted) this.clear();
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
        ws.send(
          JSON.stringify({ type: "hello", token: this.token, patches: true }),
        );
    };
    ws.onmessage = (event) => {
      if (generation !== this.generation) return;
      const m = JSON.parse(event.data);
      if (m.type === "state") {
        this.state.set(m.data);
        this.status.set("Connected");
      }
      if (m.type === "patch" && this.state()) {
        try {
          this.state.set(applyStatePatch(this.state()!, m.data));
        } catch {
          ws.close();
        }
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
        m.type === "ack"
          ? request.resolve(m.data)
          : request.reject(Error(m.message));
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
  command(type: string, data: Record<string, unknown> = {}): Promise<any> {
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
