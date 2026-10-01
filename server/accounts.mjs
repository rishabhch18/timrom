import {
  randomBytes,
  randomInt,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  throw new Error(message);
};
function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128
  )
    fail("Use a password of 10–128 characters.");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function matches(password, saved) {
  try {
    const [salt, digest] = saved.split(":");
    return timingSafeEqual(
      Buffer.from(passwordHash(password, salt).split(":")[1], "hex"),
      Buffer.from(digest, "hex"),
    );
  } catch {
    return false;
  }
}
export class Accounts {
  constructor(
    world,
    { development = process.env.NODE_ENV !== "production" } = {},
  ) {
    this.w = world;
    this.development = development;
    world.db
      .exec(`CREATE TABLE IF NOT EXISTS credentials(user TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,email TEXT UNIQUE,phone TEXT UNIQUE,password TEXT,verification_mode TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_sessions(digest TEXT PRIMARY KEY,user TEXT,expires INTEGER);
      CREATE TABLE IF NOT EXISTS auth_reauth(digest TEXT PRIMARY KEY,user TEXT,session TEXT,expires INTEGER);
      CREATE TABLE IF NOT EXISTS auth_challenges(id TEXT PRIMARY KEY,digest TEXT,payload TEXT,expires INTEGER,attempts INTEGER DEFAULT 0);`);
  }
  contact(value, kind) {
    const c = String(value || "").trim();
    if (kind === "email") {
      if (c.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c))
        fail("Enter a valid email address.");
      return c.toLowerCase();
    }
    const phone = c.replace(/[ ()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone))
      fail(
        "Use an international mobile number, such as +91 followed by 10 digits.",
      );
    return phone;
  }
  session(user) {
    const token = randomBytes(32).toString("hex");
    this.w.run(
      "INSERT INTO auth_sessions VALUES(?,?,?)",
      hash(token),
      user,
      this.w.now() + 30 * 86400000,
    );
    return { token, user: this.w.user(user) };
  }
  challenge(payload) {
    if (!this.development)
      fail(
        "Email and SMS delivery are not configured. Verification is unavailable.",
      );
    const id = randomBytes(24).toString("hex"),
      code = String(randomInt(100000, 1000000));
    this.w.run("DELETE FROM auth_challenges WHERE expires<?", this.w.now());
    this.w.run(
      "INSERT INTO auth_challenges(id,digest,payload,expires) VALUES(?,?,?,?)",
      id,
      hash(code),
      JSON.stringify(payload),
      this.w.now() + 300000,
    );
    return {
      challenge: id,
      developmentCode: code,
      mode: "local-test",
      expiresIn: 300,
    };
  }
  ticket(user, token) {
    const ticket = randomBytes(32).toString("hex");
    this.w.run(
      "INSERT INTO auth_reauth VALUES(?,?,?,?)",
      hash(ticket),
      user,
      hash(token),
      this.w.now() + 300000,
    );
    return { reauth: ticket, expiresIn: 300 };
  }
  requireRecent(user, token, ticket) {
    const found =
      typeof ticket === "string" &&
      this.w.get(
        "SELECT 1 FROM auth_reauth WHERE digest=? AND user=? AND session=? AND expires>?",
        hash(ticket),
        user,
        hash(token),
        this.w.now(),
      );
    if (!found) fail("Confirm your identity again before this account change.");
  }
  async handle(action, d, ip, token) {
    const w = this.w;
    w.limit(ip, "auth", 35, 60000);
    if (action === "reauth") {
      const user = w.auth(token);
      if (!user) fail("Sign in first.");
      const c = w.get("SELECT * FROM credentials WHERE user=?", user);
      if (!c) fail("Account credentials unavailable.");
      if (d.method === "password") {
        w.limit(user, "reauth", 8, 60000);
        if (!matches(d.password, c.password)) fail("Password is incorrect.");
        return this.ticket(user, token);
      }
      return this.challenge({ purpose: "reauth", user, session: hash(token) });
    }
    if (action === "reset") {
      const kind = d.kind === "phone" ? "phone" : "email",
        contact = this.contact(d.contact, kind);
      w.limit(contact, "send", 3, 60000);
      const c = w.get(`SELECT user FROM credentials WHERE ${kind}=?`, contact);
      if (!c) fail("No local account uses that contact.");
      return this.challenge({
        purpose: "reset",
        user: c.user,
        password: passwordHash(d.password),
      });
    }
    if (action === "export" || action === "delete") {
      const user = w.auth(token);
      if (!user) fail("Sign in first.");
      this.requireRecent(user, token, d.reauth);
      if (action === "export")
        return {
          export: {
            profile: w.user(user),
            contacts: w.get(
              "SELECT username,email,phone FROM credentials WHERE user=?",
              user,
            ),
            preferences: w.prefs(user),
            activities: w.all("SELECT * FROM activities WHERE user=?", user),
            messages: w.all("SELECT * FROM messages WHERE user=?", user),
            directMessages: w.all(
              "SELECT * FROM direct_messages WHERE sender=? OR recipient=?",
              user,
              user,
            ),
            items: w.all(
              "SELECT * FROM items WHERE owner_type='user' AND owner=?",
              user,
            ),
            ledger: w.all("SELECT * FROM ledger WHERE user=?", user),
          },
        };
      if (d.confirm !== w.user(user).username)
        fail("Type your username to confirm permanent account deletion.");
      if (w.get("SELECT 1 FROM homes WHERE owner=?", user))
        fail("Transfer or delete your owned homes first.");
      w.tx(() => {
        for (const i of w.all(
          "SELECT * FROM items WHERE owner_type='user' AND owner=?",
          user,
        )) {
          w.clearPlacement(i.id);
          w.run("DELETE FROM item_offers WHERE item=?", i.id);
          w.run("DELETE FROM items WHERE id=?", i.id);
        }
        w.run(
          "DELETE FROM reactions WHERE message IN (SELECT id FROM messages WHERE user=?)",
          user,
        );
        w.run(
          "DELETE FROM message_details WHERE message IN (SELECT id FROM messages WHERE user=?)",
          user,
        );
        for (const table of [
          "messages",
          "activities",
          "ledger",
          "members",
          "roles",
          "room_access",
          "bans",
          "restrictions",
          "profiles",
          "favourites",
          "notifications",
          "reactions",
          "personal_mutes",
          "blocks",
          "requests",
          "credentials",
          "auth_sessions",
          "auth_reauth",
        ])
          w.run(`DELETE FROM ${table} WHERE user=?`, user);
        w.run("DELETE FROM friends WHERE sender=? OR recipient=?", user, user);
        w.run(
          "DELETE FROM direct_messages WHERE sender=? OR recipient=?",
          user,
          user,
        );
        w.run(
          "DELETE FROM succession WHERE sender=? OR recipient=?",
          user,
          user,
        );
        w.run("DELETE FROM item_offers WHERE sender=?", user);
        w.run("UPDATE item_origins SET donor=NULL WHERE donor=?", user);
        w.run("DELETE FROM report_reviews WHERE report IN (SELECT id FROM reports WHERE user=? OR target=?)",user,user);
        w.run("DELETE FROM reports WHERE user=? OR target=?", user, user);
        w.run("DELETE FROM blocks WHERE target=?", user);
        w.run("DELETE FROM personal_mutes WHERE target=?", user);
        w.run(
          "DELETE FROM moderation_log WHERE actor=? OR target=?",
          user,
          user,
        );
        for (const c of w.all("SELECT id,payload FROM auth_challenges"))
          if (JSON.parse(c.payload).user === user)
            w.run("DELETE FROM auth_challenges WHERE id=?", c.id);
        w.run("DELETE FROM users WHERE id=?", user);
      });
      w.presence.delete(user);
      w.reservations?.delete(user);
      return { deleted: true };
    }
    if (action === "signup") {
      const kind = d.kind === "phone" ? "phone" : "email",
        contact = this.contact(d.contact, kind);
      w.limit(contact, "send", 3, 60000);
      const username = String(d.username || "")
        .toLowerCase()
        .replace(/^@/, "");
      if (!/^[a-z][a-z0-9_]{2,23}$/.test(username))
        fail(
          "Username: 3–24 letters, numbers or underscores; start with a letter.",
        );
      if (!["adult", "teen"].includes(d.band))
        fail("Choose an age group. Accounts are 13+.");
      const name = String(d.name || "").trim();
      if (name.length < 2 || name.length > 24)
        fail("Display name must be 2–24 characters.");
      if (
        w.get(
          `SELECT 1 FROM credentials WHERE username=? OR ${kind}=?`,
          username,
          contact,
        )
      )
        fail("That username or contact is already registered.");
      return this.challenge({
        purpose: "signup",
        kind,
        contact,
        username,
        name,
        band: d.band,
        password: kind === "email" ? passwordHash(d.password) : null,
      });
    }
    if (action === "login") {
      const email = this.contact(d.contact, "email");
      w.limit(email, "password", 8, 60000);
      const c = w.get("SELECT * FROM credentials WHERE email=?", email);
      // Run a password derivation even for an unknown address.
      const saved =
        c?.password || `00000000000000000000000000000000:${"00".repeat(64)}`;
      if (!matches(d.password, saved) || !c)
        fail("Email or password is incorrect.");
      return this.session(c.user);
    }
    if (action === "mobile") {
      const phone = this.contact(d.contact, "phone");
      w.limit(phone, "send", 3, 60000);
      const c = w.get("SELECT user FROM credentials WHERE phone=?", phone);
      if (!c)
        fail(
          "No local account uses that mobile number. Create an account first.",
        );
      return this.challenge({ purpose: "login", user: c.user });
    }
    if (action === "link") {
      const user = w.auth(token);
      if (!user) fail("Sign in first.");
      this.requireRecent(user, token, d.reauth);
      const kind = d.kind === "phone" ? "phone" : "email",
        contact = this.contact(d.contact, kind);
      if (!w.get("SELECT 1 FROM credentials WHERE user=?", user))
        fail(
          "This legacy demo profile has no account credentials. Create a new account to test authentication.",
        );
      if (w.get(`SELECT 1 FROM credentials WHERE ${kind}=?`, contact))
        fail("That contact is already registered.");
      if (
        w.get(`SELECT ${kind} AS contact FROM credentials WHERE user=?`, user)
          ?.contact
      )
        fail("This contact is already linked.");
      w.limit(contact, "send", 3, 60000);
      return this.challenge({
        purpose: "link",
        user,
        kind,
        contact,
        password: kind === "email" ? passwordHash(d.password) : null,
      });
    }
    if (action === "verify") {
      const c = w.get(
        "SELECT * FROM auth_challenges WHERE id=?",
        String(d.challenge),
      );
      if (!c || c.expires <= w.now() || c.attempts >= 5)
        fail("Code expired or unavailable. Start again.");
      w.run("UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?", c.id);
      if (
        !timingSafeEqual(
          Buffer.from(c.digest, "hex"),
          Buffer.from(hash(String(d.code)), "hex"),
        )
      )
        fail("Incorrect verification code.");
      const p = JSON.parse(c.payload);
      if (["link", "reauth"].includes(p.purpose) && w.auth(token) !== p.user)
        fail("Sign in to the account that requested this code.");
      return w.tx(() => {
        w.run("DELETE FROM auth_challenges WHERE id=?", c.id);
        let user = p.user;
        if (p.purpose === "reauth") {
          if (hash(token) !== p.session)
            fail("Use the session that requested this code.");
          return this.ticket(user, token);
        }
        if (p.purpose === "reset") {
          w.run(
            "UPDATE credentials SET password=? WHERE user=?",
            p.password,
            user,
          );
          w.run("DELETE FROM auth_sessions WHERE user=?", user);
          w.run("DELETE FROM auth_reauth WHERE user=?", user);
          return this.session(user);
        }
        if (p.purpose === "signup") {
          if (
            w.get(
              `SELECT 1 FROM credentials WHERE username=? OR ${p.kind}=?`,
              p.username,
              p.contact,
            )
          )
            fail("Username or contact was registered meanwhile. Start again.");
          user = w.login(p.name, p.band).user.id;
          w.run(
            `INSERT INTO credentials(user,username,${p.kind},password,verification_mode) VALUES(?,?,?,?,?)`,
            user,
            p.username,
            p.contact,
            p.password,
            "local-test",
          );
          // New accounts authenticate only through expiring hashed sessions.
          w.run("UPDATE users SET token=NULL WHERE id=?", user);
        } else if (p.purpose === "link") {
          w.run(
            `UPDATE credentials SET ${p.kind}=?, password=COALESCE(?,password) WHERE user=?`,
            p.contact,
            p.password,
            user,
          );
          return { linked: true };
        }
        return this.session(user);
      });
    }
    if (action === "logout") {
      if (typeof token === "string")
        w.run("DELETE FROM auth_sessions WHERE digest=?", hash(token));
      return { ok: true };
    }
    fail("Unknown account action.");
  }
}
export const sessionDigest = hash;
