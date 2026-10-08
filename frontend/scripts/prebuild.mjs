import { rmSync, existsSync, readFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const pidFile = path.join(root, ".pensieve-server.pid");
const port = process.env.PENSIEVE_PORT ?? "3000";

function killPid(pid) {
  const num = parseInt(pid, 10);
  if (!num || Number.isNaN(num) || num === process.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(num), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(num, "SIGTERM");
    }
  } catch {}
}

// 1. Check tracked PID file
if (existsSync(pidFile)) {
  try {
    const raw = readFileSync(pidFile, "utf8").trim();
    if (raw) killPid(raw);
  } catch {}
  try {
    rmSync(pidFile, { force: true });
  } catch {}
}

// 2. Scan and terminate any process listening on the target port
try {
  if (process.platform === "win32") {
    const output = execSync("netstat -ano", { encoding: "utf8" });
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes(`:${port}`) && line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid)) {
          killPid(pid);
        }
      }
    }
  } else {
    try {
      const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim().split(/\s+/);
      for (const pid of pids) {
        if (pid) killPid(pid);
      }
    } catch {}
  }
} catch {}

// 3. Ensure any Windows file handle locks on .next/standalone are released
const standalone = path.join(root, ".next", "standalone");
if (existsSync(standalone)) {
  const start = Date.now();
  while (Date.now() - start < 300) {
    try {
      rmSync(path.join(standalone, ".lock-probe"), { force: true });
      break;
    } catch {
      // Allow Windows filesystem driver time to release locks
    }
  }
}
