import { access, cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawn, spawnSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const standalone = path.join(root, ".next", "standalone");
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

// Clean up any stale standalone server before copying assets
if (existsSync(pidFile)) {
  try {
    const raw = readFileSync(pidFile, "utf8").trim();
    if (raw) killPid(raw);
  } catch {}
  try {
    await rm(pidFile, { force: true });
  } catch {}
}

try {
  if (process.platform === "win32") {
    const output = execSync("netstat -ano", { encoding: "utf8" });
    for (const line of output.split(/\r?\n/)) {
      if (line.includes(`:${port}`) && line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid)) {
          killPid(pid);
        }
      }
    }
  }
} catch {}

try {
  await access(path.join(standalone, "server.js"));
} catch {
  throw new Error(
    "Build Pensieve with npm run build before starting production.",
  );
}

await mkdir(path.join(standalone, ".next", "static"), { recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
});
await cp(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);

const server = spawn(process.execPath, [path.join(standalone, "server.js")], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.PENSIEVE_HOST ?? "127.0.0.1",
    PORT: port,
  },
});

if (server.pid) {
  try {
    await writeFile(pidFile, String(server.pid), "utf8");
  } catch {}
}

function terminate() {
  if (server && !server.killed && server.pid) {
    killPid(server.pid);
  }
  try {
    if (existsSync(pidFile)) {
      spawnSync(process.platform === "win32" ? "cmd" : "rm", [
        ...(process.platform === "win32" ? ["/c", "del", "/f", "/q", pidFile] : ["-f", pidFile]),
      ]);
    }
  } catch {}
}

server.on("exit", async (code) => {
  try {
    await rm(pidFile, { force: true });
  } catch {}
  process.exitCode = code ?? 0;
});

process.on("SIGINT", () => {
  terminate();
  process.exit(0);
});
process.on("SIGTERM", () => {
  terminate();
  process.exit(0);
});
process.on("exit", () => {
  terminate();
});
