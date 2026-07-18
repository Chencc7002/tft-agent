import { access, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sqliteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function openDatabase(filePath) {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    return new DatabaseSync(filePath);
  } catch (nodeSqliteError) {
    try {
      const { default: BetterSQLite3 } = await import("better-sqlite3");
      return new BetterSQLite3(filePath);
    } catch (betterSqliteError) {
      throw new Error(
        `SQLite backup requires Node 22+ node:sqlite or better-sqlite3. `
        + `node:sqlite: ${nodeSqliteError.message}; better-sqlite3: ${betterSqliteError.message}`
      );
    }
  }
}

const source = resolve(
  argument("source")
  ?? process.env.TFT_AGENT_CACHE_PATH
  ?? ".cache/tft-agent.sqlite"
);
const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/u, "Z");
const destination = resolve(
  argument("output")
  ?? `.cache/backups/tft-agent-${timestamp}.sqlite`
);

if (source === destination) throw new Error("Backup destination must differ from the source database");
await access(source);
await mkdir(dirname(destination), { recursive: true });
try {
  await access(destination);
  throw new Error(`Backup destination already exists: ${destination}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const sourceDatabase = await openDatabase(source);
try {
  sourceDatabase.exec(`VACUUM INTO ${sqliteLiteral(destination)}`);
} finally {
  sourceDatabase.close();
}

const backupDatabase = await openDatabase(destination);
let integrity;
let tables;
try {
  integrity = backupDatabase.prepare("PRAGMA integrity_check").get();
  tables = backupDatabase.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all().map((row) => row.name);
} finally {
  backupDatabase.close();
}

const integrityValue = String(integrity?.integrity_check ?? Object.values(integrity ?? {})[0] ?? "");
if (integrityValue !== "ok") throw new Error(`Backup integrity check failed: ${integrityValue || "unknown"}`);

const metadata = await stat(destination);
console.log(JSON.stringify({
  ok: true,
  source,
  destination,
  bytes: metadata.size,
  integrity: integrityValue,
  tables
}, null, 2));
