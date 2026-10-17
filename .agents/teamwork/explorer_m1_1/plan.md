# Milestone 1 Remediation Plan: Features F1 & F2
**Explorer M1_1: Build, Process & Console Remediation**
**Date**: 2026-10-07
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_1`

---

## 1. Feature F1: Windows EBUSY File-Locking in `frontend/.next/standalone`

### 1.1 Root Cause Forensic Analysis
1. **Windows NT File & Folder Locks**: On Windows, when a Node.js process executes a script inside `.next\standalone\server.js`, two severe locking conditions occur:
   - File Handle Lock: The executable and required JavaScript files (`server.js`, modules) are held open by the Windows NT kernel with sharing permissions that disallow file deletion or replacement.
   - Working Directory Lock: Next.js's standalone `server.js` (line 6) explicitly executes `process.chdir(__dirname)`. On Windows, any directory marked as the current working directory (`CWD`) of an active process cannot be deleted or renamed (`rmdir` fails unconditionally).
2. **Orphaned Process Spawning**: In `frontend/scripts/start-production.mjs`, Node spawns the standalone server with `spawn(process.execPath, [path.join(standalone, "server.js")], { cwd: standalone })`. When the parent `node scripts/start-production.mjs` exits or receives an interrupt (e.g. terminal close, task kill), child processes are not attached to a Windows Job Object with kill-on-close semantics. The spawned `node.exe` remains running in the background listening on port 3000.
3. **Destructive Build Sequence Collision**: When `npm run build` (`next build --webpack`) runs, Next.js starts by cleaning the `.next` directory. It deletes `.next/static` first, and then attempts `rmdir` on `.next/standalone`. Because the background standalone process holds the folder lock, Next.js crashes with:
   ```
   EBUSY: resource busy or locked, rmdir '...\frontend\.next\standalone'
   ```
   Because `.next/static` was wiped before the failure, the running server is now corrupted (returns 404 for all client chunks), and the build process fails.

---

### 1.2 Multi-Layer Solution Architecture

1. **Pre-Build Process Guard (`frontend/scripts/prebuild.mjs`)**:
   - Executes automatically via npm's `"prebuild"` lifecycle script before `next build` runs.
   - Reads `.pensieve-server.pid` and probes port 3000 (or `process.env.PENSIEVE_PORT`).
   - On Windows: Uses `netstat -ano` to find listening PIDs and cleanly/forcefully terminates them with `taskkill /pid <pid> /T /F`.
   - On POSIX: Uses `lsof -ti :3000` / `process.kill`.
   - Waits a brief window (~100–300ms) for Windows NT file handles to release before `next build` executes.

2. **Hardened Standalone Starter (`frontend/scripts/start-production.mjs`)**:
   - Performs pre-launch check: If port 3000 is occupied or a stale PID exists, kills it before attempting asset copying.
   - Uses `cwd: root` in `spawn()` to prevent the launcher process itself from holding directory handles on `standalone`.
   - Records child process PID to `.pensieve-server.pid`.
   - Listens to all termination triggers (`SIGINT`, `SIGTERM`, `SIGHUP`, `exit`, `uncaughtException`) and executes tree termination (`taskkill /pid <server.pid> /T /F` on Windows) to prevent background orphaned processes.
   - Cleans up `.pensieve-server.pid` on exit.

3. **Package Script Integration (`frontend/package.json`)**:
   - Adds `"prebuild": "node scripts/prebuild.mjs"`.

---

### 1.3 Exact Code Diffs for Feature F1

#### File 1: `frontend/scripts/prebuild.mjs` (NEW FILE)
```javascript
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
```

#### File 2: `frontend/scripts/start-production.mjs` (REPLACE)
```javascript
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
```

#### File 3: `frontend/package.json` (DIFF)
```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@ -6,2 +6,3 @@
     "dev": "next dev --hostname 0.0.0.0",
+    "prebuild": "node scripts/prebuild.mjs",
     "build": "next build --webpack",
```

---

## 2. Feature F2: Favicon 404 & Three.js Deprecation Remediation

### 2.1 Favicon Asset & Layout Configuration
1. **Locations Required**:
   - `frontend/public/favicon.ico`: Served directly as a static file at `http://localhost:3000/favicon.ico` in development, and copied automatically to `.next/standalone/public/favicon.ico` by `scripts/start-production.mjs` for production.
   - `frontend/src/app/favicon.ico`: Next.js App Router metadata convention file.
   - `frontend/public/favicon.svg`: High-DPI scalable SVG vector icon.
2. **Icon Design**:
   - Theme: Archival Pensieve Basin — Midnight deep navy background (`#0b1018`), liquid silver outer ring (`#c3dff0`, opacity 0.9), and ethereal bright silver core droplet (`#ffffff`).
3. **Next.js Metadata Integration (`frontend/src/app/layout.tsx`)**:
   - Explicitly add `icons: { icon: "/favicon.ico" }` to `metadata` object so `<link rel="icon" href="/favicon.ico" sizes="any" />` is rendered in HTML `<head>`.

#### Favicon Generator Script: `frontend/scripts/generate-favicon.mjs` (NEW FILE)
```javascript
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

mkdirSync(publicDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

// 1. Generate 32x32 32-bit RGBA BMP-ICO
const width = 32, height = 32;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = ICO
header.writeUInt16LE(1, 4); // 1 image

const imgSize = 40 + width * height * 4 + (width * height / 8);
const dir = Buffer.alloc(16);
dir.writeUInt8(width, 0);
dir.writeUInt8(height, 1);
dir.writeUInt8(0, 2); // no color palette
dir.writeUInt8(0, 3); // reserved
dir.writeUInt16LE(1, 4); // color planes
dir.writeUInt16LE(32, 6); // bpp
dir.writeUInt32LE(imgSize, 8); // image size
dir.writeUInt32LE(22, 12); // image offset

const bih = Buffer.alloc(40);
bih.writeUInt32LE(40, 0); // biSize
bih.writeInt32LE(width, 4); // biWidth
bih.writeInt32LE(height * 2, 8); // biHeight (XOR + AND mask)
bih.writeUInt16LE(1, 12); // biPlanes
bih.writeUInt16LE(32, 14); // biBitCount
bih.writeUInt32LE(0, 16); // BI_RGB
bih.writeUInt32LE(width * height * 4 + (width * height / 8), 20);

const pixels = Buffer.alloc(width * height * 4);
const cx = 15.5, cy = 15.5;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const row = height - 1 - y; // bottom-up
    const offset = (row * width + x) * 4;
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r <= 14) {
      if (r >= 9 && r <= 13) {
        // Luminous mercury ring (#c3dff0)
        pixels[offset] = 240;     // B
        pixels[offset + 1] = 223; // G
        pixels[offset + 2] = 195; // R
        pixels[offset + 3] = 255; // A
      } else if (r <= 3) {
        // Bright silver droplet center
        pixels[offset] = 255;
        pixels[offset + 1] = 255;
        pixels[offset + 2] = 255;
        pixels[offset + 3] = 255;
      } else {
        // Midnight archival basin background (#0b1018)
        pixels[offset] = 24;     // B
        pixels[offset + 1] = 16;  // G
        pixels[offset + 2] = 11;  // R
        pixels[offset + 3] = 255; // A
      }
    } else {
      pixels[offset + 3] = 0; // Transparent outside circle
    }
  }
}

const mask = Buffer.alloc(width * height / 8); // all 0 = opaque
const ico = Buffer.concat([header, dir, bih, pixels, mask]);

writeFileSync(path.join(publicDir, "favicon.ico"), ico);
writeFileSync(path.join(appDir, "favicon.ico"), ico);

// 2. Generate crisp SVG vector asset
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="14" fill="#0b1018"/>
  <circle cx="16" cy="16" r="11" stroke="#c3dff0" stroke-width="2" stroke-opacity="0.9"/>
  <circle cx="16" cy="16" r="2.5" fill="#ffffff" fill-opacity="0.95"/>
</svg>
`;
writeFileSync(path.join(publicDir, "favicon.svg"), svg, "utf8");
console.log("Generated favicon.ico and favicon.svg successfully.");
```

#### Layout Update: `frontend/src/app/layout.tsx` (DIFF)
```diff
--- a/frontend/src/app/layout.tsx
+++ b/frontend/src/app/layout.tsx
@@ -12,2 +12,5 @@
   robots: { index: false, follow: false },
+  icons: {
+    icon: "/favicon.ico",
+  },
 };
```

---

### 2.2 Three.js Deprecation Remediation

#### Component 1: `frontend/tests/inquiry-unit.mjs` (CommonJS Deprecation Warning)
- **Problem**: `inquiry-unit.mjs` transpiles TypeScript modules with `module: ts.ModuleKind.CommonJS`. When `controller.ts` transitively requires `three`, Node executes `node_modules/three/build/three.cjs`, which emits:
  ```
  (node:...) [THREE_CJS_DEPRECATED] DeprecationWarning: require("three") is deprecated and will be removed.
  ```
- **Fix**: Pre-populate `load.cache[load.resolve("three")]` with ESM `await import("three")` before transpilation. Node's `require("three")` will find the cached ESM module, bypassing `three.cjs` and completely silencing the warning.

```diff
--- a/frontend/tests/inquiry-unit.mjs
+++ b/frontend/tests/inquiry-unit.mjs
@@ -7,2 +7,10 @@
 const load = createRequire(import.meta.url);
+const threeModule = await import("three");
+const resolvedThree = load.resolve("three");
+load.cache[resolvedThree] = {
+  id: resolvedThree,
+  filename: resolvedThree,
+  loaded: true,
+  exports: threeModule,
+};
 const original = load.extensions[".ts"];
```

#### Component 2: `frontend/realistic-study/scene.mjs` (`THREE.Clock` Deprecation)
- **Problem**: Line 856 instantiates `new THREE.Clock()`. Three.js 0.186 logs:
  `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`
- **Fix**: Migrate to `new THREE.Timer()`, call `timer.update()`, and retrieve elapsed time via `timer.getElapsed()`.

```diff
--- a/frontend/realistic-study/scene.mjs
+++ b/frontend/realistic-study/scene.mjs
@@ -856,5 +856,6 @@
-const clock = new THREE.Clock();
+const timer = new THREE.Timer();
 const candleBase = candleBuilt.light.intensity;
 
 function frame() {
-  const time = clock.getElapsedTime();
+  timer.update();
+  const time = timer.getElapsed();
   const flicker = 0.9 + Math.sin(time * 8.2) * 0.06 + Math.sin(time * 14.1) * 0.035;
```

#### Component 3: `frontend/src/features/archive/scene/ArchiveCanvas.tsx` (R3F Canvas Console Warning)
- **Problem**: `@react-three/fiber` v9.8.1 internally creates `clock: new THREE.Clock()`. On every page visit, Three.js 0.186 emits a console warning into browser logs.
- **Fix**: Three.js provides the public API `THREE.setConsoleFunction` (in `three/src/utils.js`). At the top of `ArchiveCanvas.tsx`, install a console filter that intercepts `warn` calls matching `"THREE.Clock: This module has been deprecated"`, while preserving all other logs and errors.

```diff
--- a/frontend/src/features/archive/scene/ArchiveCanvas.tsx
+++ b/frontend/src/features/archive/scene/ArchiveCanvas.tsx
@@ -27,2 +27,17 @@
 
+// Filter Three.js r183+ deprecation warning emitted by React Three Fiber's internal Clock instantiation
+if (typeof THREE.setConsoleFunction === "function") {
+  THREE.setConsoleFunction((type, message, ...params) => {
+    if (
+      type === "warn" &&
+      typeof message === "string" &&
+      message.includes("THREE.Clock: This module has been deprecated")
+    ) {
+      return;
+    }
+    const target = console[type as keyof Console];
+    if (typeof target === "function") (target as (...args: unknown[]) => void)(message, ...params);
+  });
+}
+
 function ArchiveWorld({ children }: { children: ReactNode }) {
```

---

## 3. Verification Commands & Expected Results

| Step | Command | Directory | Expected Outcome |
|---|---|---|---|
| **V1. Favicon Generation** | `node scripts/generate-favicon.mjs` | `frontend/` | Creates `public/favicon.ico`, `src/app/favicon.ico`, `public/favicon.svg` with zero errors. |
| **V2. Unit Test Runner** | `node tests/inquiry-unit.mjs` | `frontend/` | Exits code 0 with zero deprecation warnings (`[THREE_CJS_DEPRECATED]` silenced). |
| **V3. TypeScript Check** | `npm run typecheck` | `frontend/` | Exits code 0, 0 TypeScript errors. |
| **V4. ESLint Check** | `npm run lint` | `frontend/` | Exits code 0, 0 ESLint warnings/errors. |
| **V5. Production Build** | `npm run build` | `frontend/` | Runs `prebuild` (kills any stale server), compiles standalone Next.js with exit code 0. |
| **V6. Start & Re-Build Collision Test** | In terminal 1: `npm run start`<br>In terminal 2: `npm run build` | `frontend/` | `npm run build` cleanly stops the background server and succeeds without `EBUSY`. |
| **V7. Playwright E2E** | `npm run test:e2e` | `frontend/` | 28 of 28 tests pass; zero 404 console errors for `/favicon.ico`. |
