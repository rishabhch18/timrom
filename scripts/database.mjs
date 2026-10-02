import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, openSync, closeSync, unlinkSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function checkDatabase(file) {
  const db = new DatabaseSync(path.resolve(file), { readOnly: true });
  try {
    const results = db.prepare("PRAGMA integrity_check").all();
    if (results.length !== 1 || results[0].integrity_check !== "ok")
      throw Error(
        "Database integrity check failed. Preserve this file for investigation.",
      );
    return {
      integrity: "ok",
      tables: db
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table'",
        )
        .get().count,
    };
  } finally {
    db.close();
  }
}

export async function backupDatabase(source, destination) {
  source = path.resolve(source);
  destination = path.resolve(destination);
  if (source === destination)
    throw Error("Backup destination must differ from the live database.");
  const db = new DatabaseSync(source, { readOnly: true });
  let created = false;
  try {
    mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    // Reserve the destination exclusively: never overwrite an existing backup.
    closeSync(openSync(destination, "wx", 0o600));
    created = true;
    await backup(db, destination);
    chmodSync(destination, 0o600);
    return { file: destination, ...checkDatabase(destination) };
  } catch (error) {
    if (created) unlinkSync(destination);
    throw error;
  } finally {
    db.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, source = "data/world.sqlite", destination] =
    process.argv.slice(2);
  try {
    if (command === "check") console.log(JSON.stringify(checkDatabase(source)));
    else if (command === "backup")
      console.log(
        JSON.stringify(
          await backupDatabase(
            source,
            destination ||
              `data/backups/world-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
          ),
        ),
      );
    else
      throw Error(
        "Usage: node scripts/database.mjs backup [source] [new destination]\n       node scripts/database.mjs check [file]",
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
