import React, { useState } from "react";
export default function AccountScreen({ world, link = false, me, onDone }) {
  const [mode, setMode] = useState(link ? "link" : "signup"),
    [kind, setKind] = useState(link && me?.account?.email ? "phone" : "email"),
    [pending, setPending] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const action = pending
        ? "verify"
        : mode === "signup"
          ? "signup"
          : mode === "link"
            ? "link"
            : kind === "email"
              ? "login"
              : "mobile";
      const result = await world.account(action, {
        ...data,
        kind,
        ...(pending ? { challenge: pending.challenge } : {}),
      });
      if (result.challenge) setPending(result);
      else if (result.linked) {
        setPending(null);
        onDone?.();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={link ? "account-link" : "welcome"}>
      {!link && (
        <div className="welcome-art">
          <span className="brand-mark">w</span>
          <div className="eyebrow">ONE WORLD · YOUR PEOPLE, YOUR PLACE</div>
          <h1>
            A little closer.
            <br />A world together.
          </h1>
          <p>Find your people. Make a home. Share the everyday.</p>
          <div className="account-house" aria-hidden="true">
            <span>⌂</span>
            <i>✦</i>
            <b>☁</b>
          </div>
        </div>
      )}
      <form
        className="welcome-form"
        onSubmit={submit}
        key={`${mode}-${kind}-${!!pending}`}
      >
        <span className="eyebrow">
          {link ? "PRIVATE ACCOUNT DETAILS" : "COME ON IN"}
        </span>
        <h2>
          {pending
            ? "One more step."
            : link
              ? "Add a contact."
              : mode === "signup"
                ? "Make yourself at home."
                : "Welcome home."}
        </h2>
        {!link && !pending && (
          <div className="segmented">
            <button
              type="button"
              className={mode === "signup" ? "selected" : ""}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
            <button
              type="button"
              className={mode === "login" ? "selected" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
          </div>
        )}
        {!pending ? (
          <>
            <div className="segmented">
              <button
                type="button"
                disabled={link && !!me?.account?.email}
                className={kind === "email" ? "selected" : ""}
                onClick={() => setKind("email")}
              >
                ✉ Email
              </button>
              <button
                type="button"
                disabled={link && !!me?.account?.phone}
                className={kind === "phone" ? "selected" : ""}
                onClick={() => setKind("phone")}
              >
                ▯ Mobile
              </button>
            </div>
            {mode === "signup" && (
              <>
                <label className="field">
                  <span>Display name</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={24}
                    autoComplete="nickname"
                    placeholder="What should we call you?"
                  />
                </label>
                <label className="field">
                  <span>Unique @username</span>
                  <input
                    name="username"
                    required
                    pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}"
                    placeholder="your_username"
                    autoComplete="username"
                  />
                </label>
                <label className="field">
                  <span>Age group · 13+ only</span>
                  <select name="band">
                    <option value="adult">18 or older</option>
                    <option value="teen">13–17</option>
                  </select>
                </label>
              </>
            )}
            <label className="field">
              <span>
                {kind === "email"
                  ? "Email address"
                  : "Mobile number with country code"}
              </span>
              <input
                name="contact"
                type={kind === "email" ? "email" : "tel"}
                autoComplete={kind === "email" ? "email" : "tel"}
                required
                placeholder={kind === "email" ? "you@example.test" : "+91…"}
              />
            </label>
            {kind === "email" && (
              <label className="field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  placeholder="At least 10 characters"
                />
              </label>
            )}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "login" && kind === "email"
                  ? "Sign in →"
                  : "Continue →"}
            </button>
          </>
        ) : (
          <>
            <p>
              Enter the six-digit code to finish{" "}
              {link ? "linking your contact" : "signing in"}.
            </p>
            <div className="local-code">
              <strong>Local verification test</strong>
              <p>
                No email or SMS was sent. Test code:{" "}
                <b>{pending.developmentCode}</b>
              </p>
              <small>
                Expires in 5 minutes. This does not verify real contact
                ownership.
              </small>
            </div>
            <label className="field">
              <span>Verification code</span>
              <input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {busy ? "Checking…" : "Verify local code →"}
            </button>
            <button type="button" onClick={() => setPending(null)}>
              Start again
            </button>
          </>
        )}
        {!pending && (
          <p className="quiet">
            Local prototype. Use test contact details. Email and SMS delivery
            are not connected. Your contact details stay private; age groups are
            self-declared.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
