import React, { useState, useEffect, useRef } from "react";
import { useWorld } from "./useWorld";
import { useCall } from "./useCall";
import { Avatar, Furniture } from "./RoomScene";
import AccountScreen from "./AccountScreen";
import ConnectedScene from "./ConnectedScene";
const activities = [
  "Socializing",
  "Studying",
  "Working",
  "Gaming",
  "Eating",
  "Resting",
  "Sleeping",
  "Private break",
];
const icons = {
  globe: "◎",
  home: "⌂",
  friends: "♧",
  journal: "◷",
  shop: "◇",
  settings: "⚙",
  arrow: "↗",
  plus: "+",
  chat: "◌",
};
const fmt = (n) => new Intl.NumberFormat("en-IN").format(n);
function Icon({ name }) {
  return (
    <span className="icon" aria-hidden="true">
      {icons[name] || name}
    </span>
  );
}
function Media({ stream, muted = false }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} />;
}
function Globe() {
  return (
    <svg viewBox="0 0 300 260" className="globe-art" aria-hidden="true">
      <defs>
        <radialGradient id="globe">
          <stop stopColor="#edf1e4" />
          <stop offset="1" stopColor="#cad9c5" />
        </radialGradient>
        <clipPath id="earth">
          <circle cx="150" cy="130" r="104" />
        </clipPath>
      </defs>
      <ellipse cx="158" cy="246" rx="85" ry="8" fill="#6d8b6620" />
      <circle cx="150" cy="130" r="104" fill="url(#globe)" />
      <g clipPath="url(#earth)" fill="none" stroke="#f9faf3" opacity=".65">
        <ellipse cx="150" cy="130" rx="51" ry="104" />
        <ellipse cx="150" cy="130" rx="88" ry="104" />
        <ellipse cx="150" cy="130" rx="104" ry="38" />
        <ellipse cx="150" cy="130" rx="104" ry="76" />
        <path d="M46 130H254M150 26V234" />
      </g>
      <g fill="#87a58d" stroke="#e4ecdf" strokeWidth="3">
        <path d="M67 86L91 54 122 48 145 60 126 82 120 102 103 118 93 104 76 99Z M111 130L127 125 145 145 140 170 126 197 115 169Z" />
        <path d="M156 80L168 63 193 66 211 78 229 82 240 108 221 112 211 127 193 118 183 139 169 125 164 101 148 100Z M152 107L174 113 183 141 169 174 157 158 146 128Z M213 164L237 160 245 183 224 191 207 184Z" />
      </g>
      <circle cx="195" cy="125" r="13" fill="#fffdf6" />
      <circle cx="195" cy="125" r="6" fill="#335f4c" />
      <path
        d="M192 114Q224 74 265 95"
        fill="none"
        stroke="#9caf95"
        strokeDasharray="4 5"
      />
      <rect x="224" y="62" width="65" height="28" rx="14" fill="#fffdf6" />
      <text x="256" y="80" textAnchor="middle" fontSize="11" fill="#355447">
        India ↗
      </text>
    </svg>
  );
}
function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function App() {
  const world = useWorld(),
    call = useCall(world),
    { state: s, status, error, setError, command } = world;
  const [page, setPage] = useState("discover"),
    [modal, setModal] = useState(null),
    [object, setObject] = useState(null),
    [genre, setGenre] = useState("All"),
    [search, setSearch] = useState(""),
    [city, setCity] = useState("All cities"),
    [province, setProvince] = useState("All states"),
    [lang, setLang] = useState(() => localStorage.getItem("ow-lang") || "en"),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(null),
    [builder, setBuilder] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const chatEnd = useRef();
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [s?.room?.messages?.length]);
  useEffect(() => {
    setSelected(null);
    setBuilder(false);
  }, [s?.room?.id]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const hi = lang === "hi",
    t = (en, hin) => (hi ? hin : en);
  async function act(type, data = {}, success) {
    try {
      await command(type, data);
      if (success) setNotice(success);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  if (!world.token) return <AccountScreen world={world} />;
  if (!s)
    return (
      <div className="loading">
        <span className="brand-mark">w</span>
        <h2>Finding your people…</h2>
        <p>{status}</p>
        <button onClick={world.logout}>Return to sign in</button>
      </div>
    );
  const { me, room, homes, catalog, items } = s,
    home = homes.find((h) => h.id === room?.home),
    isOwner = home?.owner === me.id,
    current = s.activities.find((a) => !a.end);
  const owned = homes.filter((h) => h.owner === me.id),
    asset = (id) => catalog.find((a) => a.id === id),
    nav = [
      ["discover", "globe", t("Discover", "खोजें")],
      ["room", "home", t("Your spaces", "आपके घर")],
      ["friends", "friends", t("Friends", "दोस्त")],
      ["journal", "journal", t("My activities", "मेरी गतिविधियाँ")],
      ["shop", "shop", t("Shop & inventory", "दुकान और सामान")],
    ];
  async function join(r) {
    if (await act("join", { room: r.id })) {
      setPage("room");
      setBuilder(false);
    }
  }
  function person(p) {
    if (p.id === me.id) setModal({ type: "profile" });
    else setModal({ type: "person", person: p });
  }
  const available = items.filter(
    (i) =>
      ((i.owner_type === "user" && i.owner === me.id && !i.loan) ||
        (i.owner_type === "home" && i.owner === home?.id) ||
        i.loan === home?.id) &&
      asset(i.asset)?.kind !== "theme",
  );
  const matching = homes.filter(
    (h) =>
      (genre === "All" || h.genre === genre) &&
      (city === "All cities" || h.city === city) &&
      (province === "All states" || h.state === province) &&
      `${h.name} ${h.description} ${h.city} ${h.state} ${h.genre}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className={`app-shell ${room ? "in-world" : ""}`}>
      <aside className="rail">
        <button
          className="brand-mark"
          onClick={() => setPage("discover")}
          aria-label="One World home"
        >
          w
        </button>
        <div className="rail-line" />
        {nav.map(([id, icon, label]) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
          >
            <Icon name={icon} />
          </button>
        ))}
        <button
          onClick={() => setModal({ type: "createHome" })}
          title="Create a home"
          aria-label="Create a home"
        >
          <Icon name="plus" />
        </button>
        <div className="rail-bottom">
          <button
            onClick={() => setModal({ type: "profile" })}
            aria-label="Edit avatar"
          >
            <Avatar color={me.color} body={me.body} size={38} />
          </button>
        </div>
      </aside>
      <aside className="sidebar">
        <div className="wordmark">
          one world<span className="pilot">LOCAL</span>
        </div>
        <p className="sidebar-caption">A PLACE TO BELONG</p>
        <nav>
          {nav.map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={page === id ? "active" : ""}
            >
              <Icon name={icon} />
              {label}
              {id === "friends" &&
                s.friends.some(
                  (f) => f.recipient === me.id && f.status === "pending",
                ) && <span className="dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-heading">
          <span>{t("YOUR HOMES", "आपके घर")}</span>
          <button
            aria-label="New home"
            onClick={() => setModal({ type: "createHome" })}
          >
            +
          </button>
        </div>
        {owned.length ? (
          owned.map((h) => (
            <button
              className="home-link"
              key={h.id}
              onClick={() => join(h.rooms[0])}
            >
              <span className="home-emblem">⌂</span>
              <span>
                {h.name}
                <small>{h.online} here · invite only</small>
              </span>
            </button>
          ))
        ) : (
          <p className="empty-small">A little space, just for your people.</p>
        )}
        <button
          className="text-link"
          onClick={() => setModal({ type: "invite" })}
        >
          ＋ Join with an invite
        </button>
        <div className="sidebar-bottom">
          <div className="progress-card">
            <div>
              <span>Level {me.level}</span>
              <small>{me.xp % 10}/10 XP</small>
            </div>
            <div className="progress">
              <i style={{ width: `${(me.xp % 10) * 10}%` }} />
            </div>
            <p>Every moment helps you grow.</p>
          </div>
          <button
            className="profile-card"
            onClick={() => setModal({ type: "profile" })}
          >
            <Avatar color={me.color} body={me.body} size={45} />
            <span>
              <strong>{me.name}</strong>
              <small>
                <i className="status-dot" />
                {status === "connected" ? "Online" : status}
              </small>
            </span>
            <span>⌄</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            {t("Your world", "आपकी दुनिया")}
            <span>/</span>
            <strong>
              {page === "room" && home
                ? home.name
                : nav.find((n) => n[0] === page)?.[2]}
            </strong>
          </div>
          <div className="top-actions">
            <span className="age-tag">
              {me.band === "teen"
                ? "13–17 · Teen spaces"
                : "18+ · Adult spaces"}
            </span>
            <button
              className="language"
              onClick={() => {
                const l = hi ? "en" : "hi";
                setLang(l);
                localStorage.setItem("ow-lang", l);
              }}
            >
              EN / हिन्दी
            </button>
            <button
              className="coin-balance"
              onClick={() => setModal({ type: "wallet" })}
            >
              <span>◈</span> {fmt(me.coins)} <small>coins</small>
            </button>
          </div>
        </header>
        {status !== "connected" && (
          <div className="connection-banner" role="status">
            Connection interrupted. Reconnecting… Your saved chat and items are
            safe.
          </div>
        )}
        <main className={"main-content " + (room ? "room-content" : "")}>
          {page === "discover" && (
            <div
              className={room ? "world-panel" : "page-panel"}
              aria-label="discover panel"
            >
              {room && (
                <button
                  className="panel-close"
                  aria-label="Close discover panel"
                  onClick={() => setPage("room")}
                >
                  ×
                </button>
              )}
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE WORLD FEELS SMALLER HERE</span>
                  <h1>
                    {t(
                      "Find your kind of people.",
                      "अपने जैसे लोगों से मिलें।",
                    )}
                  </h1>
                  <p>
                    {t(
                      "Somewhere to talk. Somewhere to focus. Somewhere to belong.",
                      "बातें करें, ध्यान लगाएँ, और साथ समय बिताएँ।",
                    )}
                  </p>
                </div>
                <div className="button-row">
                  <button onClick={() => setModal({ type: "invite" })}>
                    Join with invite
                  </button>
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "createHome" })}
                  >
                    ＋ {t("Create a home", "घर बनाएँ")}
                  </button>
                </div>
              </div>
              <section className="discovery-hero">
                <div>
                  <span className="pill">
                    <i className="status-dot" />
                    {s.online} {s.online === 1 ? "person" : "people"} online in
                    your age group
                  </span>
                  <h2>
                    Your next hello
                    <br />
                    could be anywhere.
                  </h2>
                  <p>
                    Explore homes by place and passion.
                    <br />
                    Start close to home. Make the world your own.
                  </p>
                  <div className="location-path">
                    <span>Earth</span>
                    <b>›</b>
                    <span>Asia</span>
                    <b>›</b>
                    <strong>India</strong>
                  </div>
                </div>
                <Globe />
                <div className="hero-footnote">
                  India pilot
                  <br />
                  <span>Global discovery comes next</span>
                </div>
              </section>
              <div className="section-header">
                <h2>
                  {t("An open door, a new connection.", "नया घर, नई पहचान।")}
                </h2>
                <span>{matching.length} homes to explore</span>
              </div>
              <div className="discover-tools">
                <div className="search">
                  <span>⌕</span>
                  <input
                    aria-label="Search homes"
                    placeholder={t(
                      "Search homes, cities, interests…",
                      "घर, शहर, रुचियाँ खोजें…",
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter state"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setCity("All cities");
                  }}
                >
                  <option>All states</option>
                  {[...new Set(homes.map((h) => h.state))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option>All cities</option>
                  {[
                    ...new Set(
                      homes
                        .filter(
                          (h) =>
                            province === "All states" || h.state === province,
                        )
                        .map((h) => h.city),
                    ),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="chips">
                {["All", "Hangout", "Study", "Gaming", "Work", "Community"].map(
                  (g) => (
                    <button
                      className={genre === g ? "selected" : ""}
                      onClick={() => setGenre(g)}
                      key={g}
                    >
                      {g}
                    </button>
                  ),
                )}
              </div>
              <div className="homes-grid">
                {matching.map((h, i) => (
                  <article className="home-card" key={h.id}>
                    <div className={"home-illustration tone-" + (i % 3)}>
                      <svg viewBox="0 0 240 125" aria-hidden="true">
                        <ellipse
                          cx="120"
                          cy="108"
                          rx="90"
                          ry="10"
                          fill="#465a4120"
                        />
                        <path
                          d="M38 88V39L117 13 202 40V89L120 118Z"
                          fill={i % 2 ? "#d1c8da" : "#c2d0b7"}
                        />
                        <path
                          d="M38 39L120 69 202 40V89L120 118 38 88Z"
                          fill="#f2ecdf"
                        />
                        <g transform="translate(93 85)">
                          <Furniture kind="sofa" />
                        </g>
                        <g transform="translate(163 64) scale(.8)">
                          <Furniture kind="plant" />
                        </g>
                        <g transform="translate(153 99) scale(.7)">
                          <Furniture kind="desk" />
                        </g>
                      </svg>
                      <span className="card-genre">{h.genre}</span>
                      <span className="card-online">
                        <i className="status-dot" />
                        {h.online} here
                      </span>
                    </div>
                    <div className="home-card-body">
                      <h3>{h.name}</h3>
                      <p>{h.description}</p>
                      <div className="home-meta">
                        {h.city}, {h.country}{" "}
                        <span>· {h.public ? "Public" : "Invite only"}</span>
                      </div>
                      <footer>
                        <span>{h.rooms.length} rooms · EN / हिन्दी</span>
                        {h.owner === me.id && (
                          <button
                            aria-label={`Manage doors for ${h.name}`}
                            onClick={() =>
                              setModal({ type: "homeLocks", home: h.id })
                            }
                          >
                            ⚙
                          </button>
                        )}
                        <button
                          onClick={() => join(h.rooms[0])}
                          aria-label={`Visit ${h.name}`}
                        >
                          Visit home <Icon name="arrow" />
                        </button>
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
              {!matching.length && (
                <div className="empty-state">
                  <h3>No homes here yet.</h3>
                  <p>Try another filter, or create the first.</p>
                </div>
              )}
            </div>
          )}
          {page === "room" && !room && (
            <div className="empty-state">
              <Icon name="home" />
              <h1>A place is waiting for you.</h1>
              <p>Visit a home or build your own, then step into a room.</p>
              <button className="primary" onClick={() => setPage("discover")}>
                Explore homes →
              </button>
            </div>
          )}
          {room && (
            <>
              <div className="room-heading">
                <div>
                  <span className="eyebrow">
                    {home.city} · {home.genre} ·{" "}
                    {home.public ? "PUBLIC HOME" : "INVITE ONLY"}
                  </span>
                  <h1>{home.name}</h1>
                  <p>{home.description}</p>
                </div>
                <div className="button-row">
                  <button
                    title="Account & privacy"
                    aria-label="Account & privacy"
                    onClick={() => setModal({ type: "account" })}
                  >
                    ⚙
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          navigator.clipboard
                            .writeText(home.invite)
                            .then(() =>
                              setNotice("Invite copied: " + home.invite),
                            )
                            .catch(() => setNotice("Invite: " + home.invite));
                        }}
                      >
                        Invite friends ↗
                      </button>
                      <button
                        onClick={() => setModal({ type: "roomSettings" })}
                      >
                        Room settings
                      </button>
                    </>
                  )}
                  <button className="quiet-button" onClick={() => act("leave")}>
                    Leave home
                  </button>
                </div>
              </div>
              <div className="house-status">
                <span>
                  ⌂ {room.name}{" "}
                  <small>
                    · {room.people.length}/{room.capacity || "∞"}
                  </small>
                </span>
                <span>
                  Walk through doorways to explore {home.rooms.length} connected
                  rooms
                </span>
                {isOwner && (
                  <button
                    aria-label="Add room"
                    onClick={() => setModal({ type: "createRoom" })}
                  >
                    ＋
                  </button>
                )}
              </div>
              <div className="room-layout">
                <section className="room-stage">
                  <div className="stage-top">
                    <span>
                      <i className="status-dot" />
                      {room.people.length}{" "}
                      {room.people.length === 1 ? "person" : "people"} here{" "}
                      <b>·</b>{" "}
                      {room.capacity === 0
                        ? "Unlimited occupancy"
                        : `${room.capacity} places`}
                      {room.people.find((p) => p.id === me.id)?.seat
                        ? " · You are seated"
                        : ""}
                    </span>
                    {isOwner && (
                      <button
                        className={builder ? "selected" : ""}
                        onClick={() => setBuilder(!builder)}
                      >
                        {builder ? "✓ Finish decorating" : "◇ Decorate room"}
                      </button>
                    )}
                  </div>
                  <ConnectedScene
                    scene={s.scene}
                    me={me}
                    currentRoom={room.id}
                    builder={builder}
                    onPerson={person}
                    onObject={(item) => setObject(item)}
                    onTile={(target, x, y) => {
                      setObject(null);
                      return builder
                        ? selected
                          ? act("place", { room: target, item: selected, x, y })
                          : setNotice("Choose furniture from the tray first.")
                        : act("move", { room: target, x, y });
                    }}
                  />
                  {object && (
                    <div
                      className="object-menu"
                      role="group"
                      aria-label="Furniture actions"
                    >
                      <strong>
                        {asset(object.asset)?.name || object.asset}
                      </strong>
                      {(
                        {
                          chair: [["sit", "♧", "Sit"]],
                          sofa: [
                            ["sit", "♧", "Sit"],
                            ["rest", "☾", "Rest"],
                          ],
                          bed: [
                            ["rest", "☾", "Rest"],
                            ["sleep", "☾", "Sleep"],
                          ],
                          desk: [
                            ["study", "▤", "Study"],
                            ["work", "▣", "Work"],
                          ],
                          counter: [["eat", "♨", "Eat"]],
                        }[object.asset] || []
                      ).map(([action, icon, label]) => (
                        <button
                          key={action}
                          title={label}
                          onClick={() => {
                            act("interact", { item: object.id, action });
                            setObject(null);
                          }}
                        >
                          <span>{icon}</span>
                          {label}
                        </button>
                      ))}
                      <button
                        aria-label="Close furniture actions"
                        onClick={() => setObject(null)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {s.scene?.people.find((p) => p.id === me.id)?.action && (
                    <button
                      className="stand-button"
                      onClick={() => act("stand")}
                    >
                      ↑ Stand / cancel action
                    </button>
                  )}
                  {s.notice && (
                    <p role="status" className="scene-notice">
                      {s.notice}
                    </p>
                  )}
                  {builder && (
                    <div className="builder-tray">
                      <div>
                        <strong>Your furnishing tray</strong>
                        <small>
                          Choose an item, then click a tile. One copy per
                          purchase.
                        </small>
                      </div>
                      <div className="builder-items">
                        {available.map((i) => (
                          <button
                            key={i.id}
                            className={selected === i.id ? "selected" : ""}
                            onClick={() => setSelected(i.id)}
                          >
                            {asset(i.asset)?.name}
                            <small>
                              {i.room === room.id
                                ? "In this room"
                                : i.room
                                  ? "In another room"
                                  : i.loan
                                    ? "Borrowed"
                                    : "In storage"}
                            </small>
                          </button>
                        ))}
                      </div>
                      <div className="button-row">
                        {selected && (
                          <button
                            onClick={() =>
                              act("store", { item: selected }, "Item stored.")
                            }
                          >
                            Store selected
                          </button>
                        )}
                        <button onClick={() => setPage("shop")}>
                          Get more furniture ↗
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="room-dock">
                    <div>
                      <span className="dock-icon">♪</span>
                      <span>
                        <strong>
                          {call.stream
                            ? "You’re in the conversation"
                            : "A good conversation starts with hello."}
                        </strong>
                        <small>
                          {room.people.filter((p) => p.voice).length}/6 in this
                          local call · Joining is always your choice
                        </small>
                      </span>
                    </div>
                    {!call.stream ? (
                      <button
                        className="primary"
                        onClick={call.join}
                        disabled={call.busy}
                      >
                        {call.busy ? "Connecting…" : "Join voice"}
                      </button>
                    ) : (
                      <div className="button-row">
                        <button onClick={call.toggleMute}>
                          {call.muted ? "Unmute" : "Mute"}
                        </button>
                        <button onClick={call.toggleVideo}>
                          {call.video ? "Camera off" : "Camera on"}
                        </button>
                        <button className="danger" onClick={call.leave}>
                          Leave call
                        </button>
                      </div>
                    )}
                  </div>
                  {(call.stream || Object.keys(call.remotes).length > 0) && (
                    <div className="call-grid">
                      {call.stream && (
                        <div>
                          <Media stream={call.stream} muted />
                          <span>You · {call.muted ? "muted" : "mic on"}</span>
                        </div>
                      )}
                      {Object.entries(call.remotes).map(([id, stream]) => (
                        <div key={id}>
                          <Media stream={stream} />
                          <span>
                            {room.people.find((p) => p.id === id)?.name ||
                              "Peer"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {room.kind === "Gaming" && (
                    <div className="activity-bar">
                      <span>♧</span>
                      <div>
                        <strong>Bring your own game.</strong>
                        <small>
                          Share an external lobby and keep the conversation
                          here.
                        </small>
                      </div>
                      <button onClick={() => setModal({ type: "game" })}>
                        Share game link
                      </button>
                    </div>
                  )}
                  <div className="activity-bar">
                    <span>◷</span>
                    <div>
                      <strong>
                        {current ? current.kind : "What are you up to?"}
                      </strong>
                      <small>
                        {current
                          ? `${current.visibility === "private" ? "Only you can see this" : "Visible to this room"} · ${Math.floor((s.serverTime - current.start) / 60000)} min`
                          : "Your real-life routine stays private by default."}
                      </small>
                    </div>
                    <button onClick={() => setModal({ type: "activity" })}>
                      {current ? "Update" : "Set activity"}
                    </button>
                  </div>
                </section>
                <aside className="chat-panel">
                  <header>
                    <h3>{t("Room conversation", "कमरे की बातचीत")}</h3>
                    <span>{room.people.length} here</span>
                  </header>
                  <div className="people-strip">
                    {room.people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => person(p)}
                        title={p.name}
                      >
                        <Avatar color={p.color} body={p.body} size={36} />
                        <small>{p.name.slice(0, 8)}</small>
                      </button>
                    ))}
                  </div>
                  <div
                    className="messages"
                    aria-live="polite"
                    aria-label="Room messages"
                  >
                    {!room.messages.length && (
                      <div className="chat-welcome">
                        <span>☀</span>
                        <h3>Room for a little hello.</h3>
                        <p>
                          Be the first to start a conversation. Messages are
                          saved in this room.
                        </p>
                      </div>
                    )}
                    {room.messages.map((m) => (
                      <div className="chat-message" key={m.id}>
                        <div
                          className="message-initial"
                          style={{ background: m.color + "44" }}
                        >
                          {m.name.slice(0, 1)}
                        </div>
                        <div>
                          <strong>{m.name}</strong>
                          <time>
                            {new Date(m.time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                          <p>
                            <MessageText text={m.body} />
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEnd} />
                  </div>
                  <form
                    className="composer"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!message.trim() || busy) return;
                      setBusy(true);
                      if (
                        await act("chat", {
                          body: message,
                          nonce: crypto.randomUUID(),
                        })
                      )
                        setMessage("");
                      setBusy(false);
                    }}
                  >
                    <input
                      aria-label="Message room"
                      placeholder={t(
                        "Say something kind…",
                        "कुछ अच्छी बात कहें…",
                      )}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={1000}
                    />
                    <button
                      className="primary"
                      aria-label="Send message"
                      disabled={busy || !message.trim()}
                    >
                      ↑
                    </button>
                  </form>
                  <p className="chat-note">
                    Make space for one another. Block or report from a profile.
                  </p>
                </aside>
              </div>
            </>
          )}
          {page === "journal" && (
            <div
              className={room ? "world-panel" : "page-panel"}
              aria-label="journal panel"
            >
              {room && (
                <button
                  className="panel-close"
                  aria-label="Close journal panel"
                  onClick={() => setPage("room")}
                >
                  ×
                </button>
              )}
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR TIME, YOUR STORY</span>
                  <h1>Little moments add up.</h1>
                  <p>
                    Track your routines without turning them into a competition.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => setModal({ type: "activity" })}
                >
                  ＋ Set activity
                </button>
              </div>
              <div className="stats-grid">
                <div>
                  <span>TIME TOGETHER</span>
                  <strong>
                    {Math.floor(me.seconds / 60)} <small>minutes</small>
                  </strong>
                  <p>Total connected time · counted once across tabs</p>
                </div>
                <div>
                  <span>YOUR EXPERIENCE</span>
                  <strong>
                    {me.xp} <small>XP · Level {me.level}</small>
                  </strong>
                  <p>All online time counts, including rest and sleep.</p>
                </div>
                <div>
                  <span>INTERACTIVE REWARDS</span>
                  <strong>
                    {s.ledger
                      .filter(
                        (l) =>
                          l.delta > 0 &&
                          l.reason === "Interactive participation window",
                      )
                      .reduce((a, l) => a + l.delta, 0)}{" "}
                    <small>coins</small>
                  </strong>
                  <p>Recent ledger rewards from participating together.</p>
                </div>
              </div>
              <section className="surface auto-card">
                <div>
                  <h3>Let your rooms follow your routine.</h3>
                  <p>
                    After you opt in, entering a room starts its activity. A
                    manual activity takes priority. You can stop or delete any
                    record.
                  </p>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={!!me.auto}
                    onChange={(e) => act("auto", { enabled: e.target.checked })}
                  />
                  Room-based tracking
                </label>
              </section>
              <div className="section-header">
                <h2>Your activity journal</h2>
                <span>Private unless you choose otherwise</span>
              </div>
              <div className="activity-list">
                {s.activities.map((a) => (
                  <article className="activity-row" key={a.id}>
                    <span className="activity-symbol">
                      {a.kind === "Sleeping"
                        ? "☾"
                        : a.kind === "Studying"
                          ? "▤"
                          : "◷"}
                    </span>
                    <div>
                      <strong>
                        {a.kind}
                        {!a.end && <span className="live-tag">Now</span>}
                      </strong>
                      <small>
                        {new Date(a.start).toLocaleString()} ·{" "}
                        {Math.floor(
                          ((a.end || s.serverTime) - a.start) / 60000,
                        )}{" "}
                        min ·{" "}
                        {a.automatic === 2
                          ? "Furniture-based"
                          : a.automatic
                            ? "Room-based"
                            : "Manual"}
                      </small>
                    </div>
                    <select
                      aria-label={`Visibility for ${a.kind}`}
                      value={a.visibility}
                      onChange={(e) =>
                        act("activityVisibility", {
                          id: a.id,
                          visibility: e.target.value,
                        })
                      }
                    >
                      <option value="private">Only me</option>
                      <option value="public">Visible in room</option>
                    </select>
                    {!a.end && (
                      <button onClick={() => act("activityStop")}>Stop</button>
                    )}
                    <button
                      className="quiet-button"
                      onClick={() =>
                        setModal({ type: "deleteActivity", activity: a })
                      }
                    >
                      Delete
                    </button>
                  </article>
                ))}
                {!s.activities.length && (
                  <div className="empty-state">
                    <h3>Your journal starts with a moment.</h3>
                    <p>Choose an activity, or opt in to room-based tracking.</p>
                  </div>
                )}
              </div>
              <p className="quiet">
                A recorded activity is self-reported, not proof of real-life
                behavior. Only your current public activity is shared in a room.
              </p>
            </div>
          )}
          {page === "friends" && (
            <div
              className={room ? "world-panel" : "page-panel"}
              aria-label="friends panel"
            >
              {room && (
                <button
                  className="panel-close"
                  aria-label="Close friends panel"
                  onClick={() => setPage("room")}
                >
                  ×
                </button>
              )}
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR PEOPLE</span>
                  <h1>Good company, a click away.</h1>
                  <p>Visit a room and select an avatar to add a friend.</p>
                </div>
              </div>
              <form
                className="friend-lookup"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await act(
                    "friendByUsername",
                    { username: new FormData(e.target).get("username") },
                    "Friend request sent.",
                  );
                }}
              >
                <label className="field">
                  <span>Find by exact @username</span>
                  <input
                    name="username"
                    placeholder="@username"
                    required
                    maxLength={25}
                  />
                </label>
                <button className="primary">Add friend</button>
              </form>
              <div className="friends-grid">
                {s.friends.map((f) => (
                  <article
                    className="surface friend-card"
                    key={f.sender + f.recipient}
                  >
                    <Avatar />
                    <div>
                      <h3>{f.user}</h3>
                      <p>
                        {f.status === "accepted"
                          ? "Friends"
                          : f.sender === me.id
                            ? "Request sent"
                            : "Wants to be your friend"}
                      </p>
                    </div>
                    {f.status === "pending" && f.recipient === me.id && (
                      <button
                        className="primary"
                        onClick={() =>
                          act(
                            "friend",
                            { user: f.other },
                            "You are now friends.",
                          )
                        }
                      >
                        Accept
                      </button>
                    )}
                  </article>
                ))}
              </div>
              {!s.friends.length && (
                <div className="empty-state">
                  <h2>Every friendship starts with hello.</h2>
                  <button
                    className="primary"
                    onClick={() => setPage("discover")}
                  >
                    Find a home →
                  </button>
                </div>
              )}
              <p className="quiet">
                This first build supports friend requests and room
                conversations. Direct messages and friend presence are next.
              </p>
            </div>
          )}
          {page === "shop" && (
            <div
              className={room ? "world-panel" : "page-panel"}
              aria-label="shop panel"
            >
              {room && (
                <button
                  className="panel-close"
                  aria-label="Close shop panel"
                  onClick={() => setPage("room")}
                >
                  ×
                </button>
              )}
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A LITTLE MORE YOU</span>
                  <h1>Make room for your style.</h1>
                  <p>
                    Experience unlocks possibilities. Coins make them yours.
                  </p>
                </div>
                <button onClick={() => setModal({ type: "wallet" })}>
                  ◈ {me.coins} coins
                </button>
              </div>
              <div className="catalog-grid">
                {catalog.map((a) => {
                  const unlocked = me.level >= a.level,
                    ownedTheme =
                      a.kind === "theme" &&
                      items.some((i) => i.asset === a.id && i.owner === me.id);
                  return (
                    <article className="catalog-card" key={a.id}>
                      <div
                        className="product-art"
                        style={
                          a.kind === "theme" ? { background: a.color } : {}
                        }
                      >
                        {a.kind === "theme" ? (
                          <span>Aa</span>
                        ) : (
                          <svg viewBox="-55 -70 110 110">
                            <Furniture kind={a.kind} color={a.color} />
                          </svg>
                        )}
                        <small>Level {a.level}</small>
                      </div>
                      <h3>{a.name}</h3>
                      <p>{a.description}</p>
                      <footer>
                        <strong>{a.price ? `◈ ${a.price}` : "Free"}</strong>
                        <button
                          disabled={!unlocked || ownedTheme}
                          onClick={() =>
                            act(
                              "buy",
                              { asset: a.id, nonce: crypto.randomUUID() },
                              a.name + " added to your inventory.",
                            )
                          }
                        >
                          {ownedTheme
                            ? "Owned"
                            : unlocked
                              ? "Get item"
                              : "Locked"}
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
              <div className="section-header">
                <h2>Your inventory</h2>
                <span>
                  Furniture = one placeable copy · Finishes = reusable
                </span>
              </div>
              <div className="inventory-list">
                {items.map((i) => (
                  <div className="inventory-row" key={i.id}>
                    <span
                      className="item-dot"
                      style={{ background: asset(i.asset)?.color }}
                    />
                    <div>
                      <strong>{asset(i.asset)?.name}</strong>
                      <small>
                        {i.owner_type === "home"
                          ? "Home owned"
                          : i.owner === me.id
                            ? "Yours"
                            : "Borrowed"}
                        {i.loan
                          ? " · Lent to " +
                            (homes.find((h) => h.id === i.loan)?.name ||
                              "a home")
                          : ""}{" "}
                        · {i.room ? "Placed" : "Stored"}
                      </small>
                    </div>
                    {asset(i.asset)?.kind === "theme" ? (
                      <button
                        disabled={!isOwner}
                        onClick={() =>
                          act(
                            "theme",
                            { room: room.id, asset: i.asset },
                            "Room finish updated.",
                          )
                        }
                      >
                        Apply to current room
                      </button>
                    ) : (
                      <>
                        {i.loan ? (
                          <button
                            onClick={() =>
                              act(
                                "returnItem",
                                { item: i.id },
                                "Item returned to its owner.",
                              )
                            }
                          >
                            {i.owner === me.id ? "Reclaim" : "Return"}
                          </button>
                        ) : (
                          i.owner_type === "user" &&
                          i.owner === me.id && (
                            <button
                              onClick={() =>
                                setModal({ type: "share", item: i })
                              }
                            >
                              Lend / donate
                            </button>
                          )
                        )}
                        <button
                          disabled={
                            !isOwner ||
                            !(
                              (i.owner_type === "home" &&
                                i.owner === home?.id) ||
                              (i.owner_type === "user" &&
                                i.owner === me.id &&
                                !i.loan) ||
                              i.loan === home?.id
                            )
                          }
                          onClick={() => {
                            setSelected(i.id);
                            setBuilder(true);
                            setPage("room");
                          }}
                        >
                          Place / move
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="quiet">
                To decorate, visit a home you own. Shared furniture is placed by
                the home owner. Your trial coins have no monetary value.
              </p>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <i className="status-dot" />
            {status === "connected" ? "Connected to your local world" : status}
          </span>
          <span>
            Built for presence, not pressure. <b>Local pilot · v0.2</b>
          </span>
        </footer>
      </div>
      {error && (
        <div className="toast error" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              account: "Account & privacy",
              homeLocks: "Manage room doors",
              game: "A game is better together.",
              createHome: "Build your little corner.",
              invite: "An invitation to belong.",
              profile: "A face that feels like you.",
              activity: "What are you up to?",
              roomSettings: "A little room to configure.",
              createRoom: "Make space for something.",
              share: "Share a little comfort.",
              wallet: "Your pocket of possibilities.",
              person: modal.person?.name,
              deleteActivity: "Delete this activity?",
            }[modal.type]
          }
          onClose={() => setModal(null)}
        >
          {error && (
            <p className="error" role="alert">
              {error}
              <button className="text-link" onClick={() => setError("")}>
                Dismiss
              </button>
            </p>
          )}
          {modal.type === "game" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = new FormData(e.target),
                  url = d.get("url");
                try {
                  if (new URL(url).protocol !== "https:")
                    throw Error("Use a secure HTTPS game link.");
                  if (
                    await act(
                      "chat",
                      {
                        body: "🎮 " + d.get("name") + "\n" + url,
                        nonce: crypto.randomUUID(),
                      },
                      "Game link shared in this room.",
                    )
                  )
                    setModal(null);
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <p>
                Your game runs on its own website. This app keeps your group
                together in the room.
              </p>
              <Field label="Game name">
                <input
                  name="name"
                  required
                  maxLength={60}
                  placeholder="Our game night"
                />
              </Field>
              <Field label="Game or lobby link">
                <input
                  name="url"
                  type="url"
                  required
                  maxLength={700}
                  placeholder="https://…"
                />
              </Field>
              <button className="primary wide">Share link in room</button>
            </form>
          )}
          {modal.type === "createHome" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                if (await act("createHome", d, "Your home is ready.")) {
                  setModal(null);
                  setPage("room");
                }
              }}
            >
              <p>
                Start with two furnished rooms. New homes are invite only and
                share your age group.
              </p>
              <Field label="Home name">
                <input
                  name="name"
                  placeholder="The Sunday Club"
                  minLength={3}
                  maxLength={48}
                  required
                />
              </Field>
              <Field label="What brings you together?">
                <select name="genre">
                  {["Hangout", "Study", "Gaming", "Work", "Community"].map(
                    (g) => (
                      <option key={g}>{g}</option>
                    ),
                  )}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="State">
                  <input
                    name="state"
                    defaultValue="Maharashtra"
                    required
                    maxLength={40}
                  />
                </Field>
                <Field label="City">
                  <input
                    name="city"
                    defaultValue="Pune"
                    required
                    maxLength={40}
                  />
                </Field>
              </div>
              <Field label="A little introduction">
                <textarea
                  name="description"
                  placeholder="A place for our people."
                  maxLength={200}
                />
              </Field>
              <button className="primary wide">Create home · Free</button>
            </form>
          )}
          {modal.type === "invite" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act("invite", {
                    code: new FormData(e.target).get("code"),
                  })
                ) {
                  setModal(null);
                  setPage("room");
                }
              }}
            >
              <p>
                Ask the host for their invite code. Invitations work only within
                your age group.
              </p>
              <Field label="Invite code">
                <input
                  name="code"
                  required
                  autoFocus
                  placeholder="Paste your code"
                />
              </Field>
              <button className="primary wide">Step inside →</button>
            </form>
          )}
          {modal.type === "profile" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act(
                    "profile",
                    Object.fromEntries(new FormData(e.target)),
                    "Avatar updated.",
                  )
                )
                  setModal(null);
              }}
            >
              <div className="avatar-preview">
                <Avatar color={me.color} body={me.body} size={120} />
                <div>
                  <h3>{me.name}</h3>
                  <p>
                    Level {me.level} · {me.band === "teen" ? "Teen" : "Adult"}{" "}
                    spaces
                  </p>
                </div>
              </div>
              <Field label="Avatar proportions">
                <select name="body" defaultValue={me.body}>
                  <option value="miniature">
                    Miniature · round and playful
                  </option>
                  <option value="mature">Mature · taller proportions</option>
                </select>
              </Field>
              <Field label="Your color">
                <input type="color" name="color" defaultValue={me.color} />
              </Field>
              <p className="quiet">
                Proportions express style; they do not change your age group.
                These simple prototype avatars are not the final character
                designs.
              </p>
              <button className="primary wide">Save avatar</button>
              <button
                type="button"
                className="wide"
                onClick={() => setModal({ type: "account" })}
              >
                Account & privacy {me.username ? "· @" + me.username : ""}
              </button>
              <button
                type="button"
                className="text-link wide"
                onClick={async () => {
                  if (call.stream) await call.leave();
                  world.logout();
                  setModal(null);
                }}
              >
                Sign out
              </button>
              <p className="quiet">
                This browser stores your session. Signing out removes its token;
                this prototype has no account recovery.
              </p>
            </form>
          )}
          {modal.type === "account" && (
            <div>
              <p>
                {me.account ? "@" + me.account.username : "Legacy demo profile"}
              </p>
              {me.account && (
                <>
                  <p className="quiet">
                    {me.account.email || "No email linked"} ·{" "}
                    {me.account.phone || "No mobile linked"} · Local test
                    verification
                  </p>
                  {(!me.account.email || !me.account.phone) && (
                    <AccountScreen
                      world={world}
                      link
                      me={me}
                      onDone={() => {
                        setModal(null);
                        setNotice("Contact linked.");
                      }}
                    />
                  )}
                </>
              )}
              <label className="consent">
                <input
                  type="checkbox"
                  checked={!!me.furniture_auto}
                  onChange={(e) =>
                    act("furnitureAuto", { enabled: e.target.checked })
                  }
                />
                <span>
                  <strong>Furniture-based activity tracking</strong>
                  <small>
                    Future sit, rest, sleep, study, work and eat actions start a
                    private activity timer. Manual timers take priority. Avatar
                    actions alone cannot verify real-life activity.
                  </small>
                </span>
              </label>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={!!me.voice_follow}
                  onChange={(e) =>
                    act("voiceFollow", { enabled: e.target.checked })
                  }
                />
                <span>
                  <strong>Follow me into room calls</strong>
                  <small>
                    After I join voice, switch calls as I walk through doors.
                    Keep my mic and camera state. Disconnect if the destination
                    call is full.
                  </small>
                </span>
              </label>
            </div>
          )}
          {modal.type === "activity" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act(
                    "activity",
                    Object.fromEntries(new FormData(e.target)),
                    "Activity started.",
                  )
                )
                  setModal(null);
              }}
            >
              <p>
                All online time earns XP. Interactive time together can also
                earn coins. Rest and sleep earn XP, not coins on their own.
              </p>
              <Field label="Activity">
                <select
                  name="kind"
                  defaultValue={current?.kind || "Socializing"}
                >
                  {activities.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Who can see your current activity?">
                <select
                  name="visibility"
                  defaultValue={current?.visibility || "private"}
                >
                  <option value="private">Only me</option>
                  <option value="public">People in my room</option>
                </select>
              </Field>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={!!me.auto}
                  onChange={(e) => act("auto", { enabled: e.target.checked })}
                />
                Opt in to room-based tracking
              </label>
              <button className="primary wide">Start activity</button>
              {current && (
                <button
                  type="button"
                  className="text-link wide"
                  onClick={async () => {
                    if (await act("activityStop")) setModal(null);
                  }}
                >
                  Stop current activity
                </button>
              )}
            </form>
          )}
          {modal.type === "homeLocks" && (
            <div>
              {homes
                .find((h) => h.id === modal.home)
                ?.rooms.map((r) => (
                  <label className="consent" key={r.id}>
                    <input
                      type="checkbox"
                      checked={!!r.locked}
                      onChange={(e) =>
                        act("lock", { room: r.id, locked: e.target.checked })
                      }
                    />
                    <span>
                      Lock {r.name}
                      <small>
                        Block new arrivals. People inside can leave.
                      </small>
                    </span>
                  </label>
                ))}
            </div>
          )}
          {modal.type === "roomSettings" && (
            <>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={!!room.locked}
                  onChange={(e) =>
                    act("lock", { room: room.id, locked: e.target.checked })
                  }
                />
                <span>Lock this room to new arrivals</span>
              </label>
              <CapacityForm
                room={room}
                onSave={async (capacity) => {
                  if (
                    await act(
                      "capacity",
                      { room: room.id, capacity },
                      "Capacity updated.",
                    )
                  )
                    setModal(null);
                }}
              />
            </>
          )}
          {modal.type === "createRoom" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                if (
                  await act(
                    "createRoom",
                    { ...d, home: home.id, capacity: Number(d.capacity) },
                    "Room created.",
                  )
                )
                  setModal(null);
              }}
            >
              <Field label="Room name">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="Late-night kitchen"
                />
              </Field>
              <Field label="Room activity">
                <select name="kind">
                  {activities.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Capacity · 0 means unlimited">
                <input
                  type="number"
                  name="capacity"
                  min="0"
                  max="10000"
                  defaultValue="8"
                  required
                />
              </Field>
              <button className="primary wide">Create room · Free</button>
            </form>
          )}
          {modal.type === "share" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                setModal({ ...modal, type: "share", confirm: d });
              }}
            >
              {!modal.confirm ? (
                <>
                  <p>
                    <strong>{asset(modal.item.asset)?.name}</strong> is yours.
                    Decide how this home can use it.
                  </p>
                  <Field label="Choose a home">
                    <select name="home" required>
                      {homes
                        .filter((h) => h.owner !== "system")
                        .map((h) => (
                          <option value={h.id} key={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Ownership">
                    <select name="mode">
                      <option value="lend">Lend · you can reclaim it</option>
                      <option value="donate">
                        Donate · permanent transfer to the home
                      </option>
                    </select>
                  </Field>
                  <button
                    className="primary wide"
                    disabled={!homes.some((h) => h.owner !== "system")}
                  >
                    Review sharing
                  </button>
                  <p className="quiet">
                    Visit an invite-only home first to make it available here.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>{asset(modal.item.asset)?.name}</strong> →{" "}
                    <strong>
                      {homes.find((h) => h.id === modal.confirm.home)?.name}
                    </strong>
                  </p>
                  <p>
                    {modal.confirm.mode === "donate"
                      ? "Ownership permanently transfers to this home. You cannot reclaim a donation."
                      : "You keep ownership. You or the host can end the loan at any time."}
                  </p>
                  <p>
                    If placed, this item will be stored first. Reclaiming a seat
                    gently moves its occupant to the entrance.
                  </p>
                  <button
                    type="button"
                    className="primary wide"
                    onClick={async () => {
                      if (
                        await act(
                          "shareItem",
                          { ...modal.confirm, item: modal.item.id },
                          modal.confirm.mode === "donate"
                            ? "Furniture donated permanently."
                            : "Furniture lent. You can reclaim it from inventory.",
                        )
                      )
                        setModal(null);
                    }}
                  >
                    Confirm{" "}
                    {modal.confirm.mode === "donate"
                      ? "permanent donation"
                      : "loan"}
                  </button>
                </>
              )}
            </form>
          )}
          {modal.type === "wallet" && (
            <>
              <div className="wallet-total">
                ◈ {fmt(me.coins)}
                <small>trial coins</small>
              </div>
              <p>
                Earn coins by participating together. Buy furniture after
                reaching its required level.
              </p>
              <div className="info-box">
                <strong>Pilot reward rules</strong>
                <p>
                  1 XP per connected minute, once per account. Every minute can
                  award 2 coins for a non-repeated message with someone present,
                  or at least 30 seconds in a shared call or matching
                  interactive activity.
                </p>
                <p>
                  These are trial rates. Idle calls and self-reported activities
                  are not yet protected against reward farming.
                </p>
              </div>
              <button className="wide" disabled>
                Buy coins with money · not enabled locally
              </button>
              <h3>Recent coin history</h3>
              <div className="ledger">
                {s.ledger.slice(0, 12).map((l) => (
                  <div key={l.id}>
                    <span>
                      {l.reason}
                      <small>{new Date(l.time).toLocaleString()}</small>
                    </span>
                    <strong>
                      {l.delta > 0 ? "+" : ""}
                      {l.delta}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          )}
          {modal.type === "person" && (
            <>
              <div className="avatar-preview">
                <Avatar {...modal.person} size={100} />
                <div>
                  <h3>{modal.person.name}</h3>
                  <p>
                    {modal.person.blocked
                      ? "Blocked"
                      : modal.person.activity || "Their activity is private"}
                  </p>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={modal.person.blocked}
                  onClick={() =>
                    act(
                      "friend",
                      { user: modal.person.id },
                      "Friend request updated.",
                    )
                  }
                >
                  Add friend
                </button>
                <button
                  onClick={async () => {
                    if (
                      await act(
                        "block",
                        { user: modal.person.id },
                        "Blocked. Their messages and call media are hidden.",
                      )
                    )
                      setModal(null);
                  }}
                >
                  Block
                </button>
                {isOwner && (
                  <button
                    className="danger"
                    onClick={async () => {
                      if (
                        await act(
                          "ban",
                          { home: home.id, user: modal.person.id },
                          "Removed and banned from this home.",
                        )
                      )
                        setModal(null);
                    }}
                  >
                    Ban from home
                  </button>
                )}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act(
                      "report",
                      {
                        user: modal.person.id,
                        body: new FormData(e.target).get("reason"),
                      },
                      "Report saved locally. No moderation team is connected.",
                    )
                  )
                    setModal(null);
                }}
              >
                <Field label="Report a concern">
                  <textarea
                    name="reason"
                    placeholder="Describe what happened"
                    minLength={5}
                    maxLength={500}
                    required
                  />
                </Field>
                <button>Save local report</button>
              </form>
            </>
          )}
          {modal.type === "deleteActivity" && (
            <>
              <p>
                This removes the activity from your journal. Earned XP and coins
                are not removed.
              </p>
              <button
                className="danger wide"
                onClick={async () => {
                  if (
                    await act(
                      "activityDelete",
                      { id: modal.activity.id },
                      "Activity deleted.",
                    )
                  )
                    setModal(null);
                }}
              >
                Delete activity
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function CapacityForm({ room, onSave }) {
  const [value, setValue] = useState(room.capacity);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value);
      }}
    >
      <p>
        A full room refuses new arrivals. Lowering capacity does not remove
        people already inside.
      </p>
      <div className="capacity-display">
        {value === 0 ? "∞" : value}
        <span>
          {value === 0 ? "Unlimited occupancy" : "people in this room"}
        </span>
      </div>
      <input
        className="capacity-slider"
        aria-label="Room capacity slider"
        type="range"
        min="0"
        max="50"
        value={Math.min(value, 50)}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <div className="range-labels">
        <span>0 · Unlimited</span>
        <span>50</span>
      </div>
      <Field label="Exact capacity · 0–10,000">
        <input
          type="number"
          min="0"
          max="10000"
          required
          value={value}
          onChange={(e) =>
            setValue(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </Field>
      <div className="info-box">
        Unlimited means no admission limit. It does not promise unlimited server
        capacity or unlimited callers. Local calls support 6 participants.
      </div>
      <button className="primary wide" disabled={value === ""}>
        Save capacity
      </button>
    </form>
  );
}

function MessageText({ text }) {
  return text.split(/(https:\/\/[^\s]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part} ↗
      </a>
    ) : (
      part
    ),
  );
}
