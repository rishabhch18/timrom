import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
import { Accounts } from "../server/accounts.mjs";
test("fresh reauthentication protects linking, export and deletion; password reset revokes sessions", async (t) => {
  let now = 1_000_000;
  const w = new World(":memory:", () => now, { seed: false });
  t.after(() => w.close());
  const a = new Accounts(w);
  const q = await a.handle(
    "signup",
    {
      name: "Privacy QA",
      username: "privacyqa",
      band: "adult",
      kind: "email",
      contact: "privacy@example.test",
      password: "local-original-password",
    },
    "test",
  );
  const s = await a.handle(
    "verify",
    { challenge: q.challenge, code: q.developmentCode },
    "test",
  );
  w.connect(s.user.id);
  await assert.rejects(a.handle("export", {}, "test", s.token), /Confirm/);
  const r = await a.handle(
    "reauth",
    { method: "password", password: "local-original-password" },
    "test",
    s.token,
  );
  const out = await a.handle("export", { reauth: r.reauth }, "test", s.token);
  assert.equal(out.export.contacts.email, "privacy@example.test");
  assert(!JSON.stringify(out).includes("local-original-password"));
  now += 300001;
  await assert.rejects(
    a.handle("export", { reauth: r.reauth }, "test", s.token),
    /Confirm/,
  );
  const reset = await a.handle(
    "reset",
    {
      kind: "email",
      contact: "privacy@example.test",
      password: "local-new-password",
    },
    "test",
  );
  const fresh = await a.handle(
    "verify",
    { challenge: reset.challenge, code: reset.developmentCode },
    "test",
  );
  assert.equal(w.auth(s.token), undefined);
  const reauth = await a.handle(
    "reauth",
    { method: "password", password: "local-new-password" },
    "test",
    fresh.token,
  );
  w.handle(s.user.id, "createHome", { name: "Must transfer home" });
  await assert.rejects(
    a.handle(
      "delete",
      { reauth: reauth.reauth, confirm: "privacyqa" },
      "test",
      fresh.token,
    ),
    /Transfer/,
  );
  const h = w.snapshot(s.user.id).homes[0];
  w.handle(s.user.id, "deleteHome", { home: h.id, confirm: h.name });
  await a.handle(
    "delete",
    { reauth: reauth.reauth, confirm: "privacyqa" },
    "test",
    fresh.token,
  );
  assert.equal(w.auth(fresh.token), undefined);
  assert.equal(
    w.get("SELECT * FROM credentials WHERE user=?", s.user.id),
    undefined,
  );
  assert.equal(w.presence.has(s.user.id), false);
});
