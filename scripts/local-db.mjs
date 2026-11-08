#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data", "postgres");
const LOG_FILE = path.join(ROOT, ".data", "postgres.log");
const PORT = process.env.LOCAL_PG_PORT ?? "55432";
const USER = "recallpilot";
const DATABASE = "recallpilot";

function findPgBin() {
  if (process.env.PGBIN) return process.env.PGBIN;
  const candidates = [];
  if (process.platform === "win32") {
    const base = "C:\\Program Files\\PostgreSQL";
    if (existsSync(base)) {
      for (const version of readdirSync(base).sort((a, b) => Number(b) - Number(a))) {
        candidates.push(path.join(base, version, "bin"));
      }
    }
  } else {
    candidates.push("/usr/lib/postgresql/18/bin", "/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/16/bin");
  }
  const found = candidates.find((candidate) => existsSync(path.join(candidate, "initdb.exe")) || existsSync(path.join(candidate, "initdb")));
  if (!found) {
    throw new Error("PostgreSQL binaries not found. Set PGBIN to the directory containing initdb/pg_ctl.");
  }
  return found;
}

const PG_BIN = findPgBin();
const exe = (name) => path.join(PG_BIN, process.platform === "win32" ? `${name}.exe` : name);

function run(name, args, options = {}) {
  const result = spawnSync(exe(name), args, {
    stdio: options.capture ? "pipe" : options.silent ? "ignore" : "inherit",
    encoding: "utf8",
    timeout: options.timeout ?? 120_000,
    env: { ...process.env, PGPASSWORD: "" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const details = options.capture ? `${result.stdout ?? ""}${result.stderr ?? ""}` : "";
    throw new Error(`${name} exited with ${result.status}. ${details}`);
  }
  return result;
}

function isRunning() {
  if (!existsSync(DATA_DIR)) return false;
  const result = run("pg_ctl", ["-D", DATA_DIR, "status"], { capture: true, allowFailure: true });
  return result.status === 0;
}

function init() {
  if (existsSync(path.join(DATA_DIR, "PG_VERSION"))) return;
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  console.log(`Initialising PostgreSQL cluster at ${DATA_DIR}`);
  run("initdb", [
    "-D",
    DATA_DIR,
    "-U",
    USER,
    "--auth=trust",
    "--encoding=UTF8",
    "--locale=C",
  ]);
}

function ping() {
  const result = run(
    "psql",
    ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", "postgres", "-tAc", "select 1"],
    { capture: true, allowFailure: true, timeout: 10_000 }
  );
  return result.status === 0 && result.stdout.trim() === "1";
}

function waitForReady(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (ping()) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error(`PostgreSQL did not become ready. See ${LOG_FILE}`);
}

function start() {
  init();
  if (isRunning() && ping()) {
    console.log(`PostgreSQL is already running on port ${PORT}.`);
  } else {
    console.log(`Starting PostgreSQL on port ${PORT}...`);
    const child = spawn(
      exe("pg_ctl"),
      ["-D", DATA_DIR, "-l", LOG_FILE, "-o", `-p ${PORT} -h 127.0.0.1`, "start", "-w"],
      { detached: true, stdio: "ignore", env: { ...process.env, PGPASSWORD: "" } }
    );
    child.unref();
    waitForReady();
  }
  ensureDatabase();
  console.log(`DATABASE_URL=postgresql://${USER}@127.0.0.1:${PORT}/${DATABASE}`);
}

function ensureDatabase() {
  const check = run(
    "psql",
    ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", "postgres", "-tAc", `select 1 from pg_database where datname='${DATABASE}'`],
    { capture: true, allowFailure: true }
  );
  if (check.status !== 0) throw new Error(`Could not query Postgres: ${check.stderr}`);
  if (check.stdout.trim() !== "1") {
    console.log(`Creating database ${DATABASE}...`);
    run("createdb", ["-h", "127.0.0.1", "-p", PORT, "-U", USER, DATABASE]);
  }
}

function stop() {
  if (!isRunning()) {
    console.log("PostgreSQL is not running.");
    return;
  }
  run("pg_ctl", ["-D", DATA_DIR, "stop", "-m", "fast", "-w"]);
}

const command = process.argv[2] ?? "start";

try {
  switch (command) {
    case "start":
    case "ensure":
      start();
      break;
    case "stop":
      stop();
      break;
    case "status":
      console.log(isRunning() ? `Running on port ${PORT}` : "Stopped");
      break;
    default:
      throw new Error(`Unknown command: ${command}. Use start, stop or status.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
