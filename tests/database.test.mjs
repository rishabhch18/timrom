import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { backupDatabase, checkDatabase } from "../scripts/database.mjs";

test("online backups include committed WAL data, reopen independently, and never overwrite an existing file", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "timrom-backup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, "live.sqlite"),
    destination = path.join(dir, "backup.sqlite");
  const live = new DatabaseSync(source);
  t.after(() => live.close());
  live.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE history(id INTEGER PRIMARY KEY,body TEXT); INSERT INTO history VALUES(1,'preserved');",
  );
  assert(existsSync(source + "-wal"));
  assert.equal((await backupDatabase(source, destination)).integrity, "ok");
  live.exec("UPDATE history SET body='later' WHERE id=1");
  const restored = new DatabaseSync(destination, { readOnly: true });
  assert.equal(
    restored.prepare("SELECT body FROM history").get().body,
    "preserved",
  );
  restored.close();
  assert.equal(statSync(destination).mode & 0o777, 0o600);
  await assert.rejects(backupDatabase(source, destination), /EEXIST/);
  assert.equal(checkDatabase(destination).integrity, "ok");
  await assert.rejects(backupDatabase(source, source), /differ/);
});
