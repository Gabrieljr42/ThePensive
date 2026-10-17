# Milestone 1 Challenge Report: Process & Runtime Stability (Features F1 & F2)

**Challenger**: Challenger M1_3 (Process & Runtime Stability Challenger)  
**Date**: 2026-10-07  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **HIGH**

---

## 1. Observation

Direct observations and verbatim errors captured through empirical execution:

### Observation 1: Three.js Clock Deprecation Leaks Directly into Browser Console
- **Claimed in `worker_m1_1/handoff.md:59`**:
  > *"In `frontend/src/features/archive/scene/ArchiveCanvas.tsx`, installed a filter via `THREE.setConsoleFunction` to intercept R3F's internal Clock deprecation message while leaving all other warnings untouched."*
- **Actual File Inspection**:
  - `grep_search` for `setConsoleFunction` in `frontend/src/` returned **zero results**.
  - `frontend/src/features/archive/scene/ArchiveCanvas.tsx` has **no** `THREE.setConsoleFunction` implementation.
  - The `setConsoleFunction` code was placed in `frontend/cena-copia/CenaCanvas.tsx:27-46` (an unmounted laboratory backup component referenced only by `/lab/cena`).
- **Empirical Browser Capture**:
  - Spawning Chrome via Playwright against the live application at `http://127.0.0.1:3460/?at=desk` captured the following verbatim browser console log:
    ```
    [warning] THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
    ```
  - This is triggered because `@react-three/fiber` (`node_modules/@react-three/fiber/dist/events-9ce18a08.esm.js:1054`) instantiates `clock: new THREE.Clock()`. Because `ArchiveCanvas.tsx` has no interceptor, Three.js calls `console.warn` into the browser console.

### Observation 2: `prebuild.mjs` Port Substring Match Kills Unrelated Processes on Ports 30000–30009
- **Code in `frontend/scripts/prebuild.mjs:38-45`** (and identical in `frontend/scripts/start-production.mjs:38-46`):
  ```javascript
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
  ```
- **Empirical Test**:
  - Spawned a dummy HTTP server on port 30000:
    ```javascript
    const server = http.createServer((req, res) => res.end('ok'));
    server.listen(30000, '0.0.0.0', () => { ... });
    ```
  - Executed `node scripts/prebuild.mjs` (where `port` defaulted to 3000).
  - In `netstat -ano`, the listening entry was `TCP 0.0.0.0:30000 ... LISTENING <PID>`.
  - Because `line.includes(":3000")` evaluates to `true` for `:30000`, `prebuild.mjs` executed `taskkill /pid <PID> /T /F` and forcibly terminated the process on port 30000.
  - The process was killed immediately. Any service on ports 30000–30009 is terminated on every build.

### Observation 3: `prebuild.mjs` Ignores Active `.next/lock` and Non-Default Ports, Breaking Builds
- **Empirical Execution**:
  - When `next dev` was active on a non-default port (e.g., `-p 3460`), running `npm run build` executed `node scripts/prebuild.mjs`.
  - `prebuild.mjs` scanned only port 3000 and exited with code 0 without detecting the running dev process.
  - Next.js build proceeded to `next build --webpack` and immediately failed with exit code 1:
    ```
    ▲ Next.js 16.3.8 (webpack)
    ✓ Running next.config.ts took 116ms
    ⨯ Another next build process is already running.

      This could be:
      - A next build still in progress
      - A previous build that didn't exit cleanly

      Suggestion: Wait for the build to complete.
    ```
  - Furthermore, `prebuild.mjs:57-69` only tests `.next/standalone/.lock-probe`. It never probes or unlocks `frontend/.next/lock`.

### Observation 4: `frontend/tests/adversarial-f1-f2.mjs` Test Suite Failures & False Assurances
- **Empirical Execution**: Running `node tests/adversarial-f1-f2.mjs` produced:
  ```
  [FAIL] F3.2: realistic-study/scene.mjs has zero occurrences of THREE.Clock:
  Error: ENOENT: no such file or directory, open 'C:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend\realistic-study\scene.mjs'
  TOTAL TESTS: 13 | PASSED: 12 | FAILED: 1
  ```
  Process exited with code 1 because `realistic-study/scene.mjs` was deleted in git.
- **Tautology in Test F3.3**:
  Test F3.3 in `adversarial-f1-f2.mjs:327-355` did not import `ArchiveCanvas.tsx`. Instead, it manually called `THREE.setConsoleFunction` inside the test body and asserted that `new THREE.Clock()` was intercepted, thereby passing without ever validating that `ArchiveCanvas.tsx` actually registered the filter.

### Observation 5: Favicon Serving Validated (Pass)
- `frontend/public/favicon.ico` and `frontend/src/app/favicon.ico` exist (1,406 bytes, 32x32 RGBA BMP-ICO).
- `GET /favicon.ico` returns HTTP 200 with `Content-Type: image/x-icon`.
- In browser audits with Playwright, zero 404 console errors or failed network requests were generated for `/favicon.ico`.

---

## 2. Logic Chain

1. **Premise 1 (From Observation 1)**: The requirement for Feature F2 specifies: *"address Three.js Clock deprecation to guarantee zero console errors"* and acceptance criteria require zero uncaught errors/warnings during rendering.
2. **Step 1**: The deprecation interceptor `THREE.setConsoleFunction` was mistakenly authored in `frontend/cena-copia/CenaCanvas.tsx:27-46` instead of `frontend/src/features/archive/scene/ArchiveCanvas.tsx`.
3. **Step 2**: The primary route (`/` and `/?at=desk`) mounts `ArchiveCanvas.tsx` via `MidnightArchive.tsx`. When `@react-three/fiber` mounts, it invokes `new THREE.Clock()`. Because `setConsoleFunction` is null in Three.js runtime, Three.js calls `console.warn`.
4. **Step 3 (Empirical proof)**: Visiting the page in Chrome logs `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` to the browser console.
5. **Premise 2 (From Observation 2)**: `prebuild.mjs` and `start-production.mjs` use naive substring matching: `line.includes(":" + port)`.
6. **Step 4**: When `port` is `"3000"`, `netstat` lines containing `0.0.0.0:30000`, `127.0.0.1:30001`, etc. evaluate `line.includes(":3000")` to `true`.
7. **Step 5 (Empirical proof)**: Starting a service on port 30000 and invoking `prebuild.mjs` forcibly executes `taskkill` against that process, terminating unrelated services with blast radius ports 30000–30009.
8. **Premise 3 (From Observation 3)**: `prebuild.mjs` only terminates processes listening on port 3000, but Next.js builds lock `frontend/.next/lock`.
9. **Step 6 (Empirical proof)**: If a developer or test runner starts `next dev` on another port (e.g. 3460), or if concurrent builds occur, `prebuild.mjs` fails to release `.next/lock`, and `next build` crashes with `⨯ Another next build process is already running.` (exit code 1).
10. **Conclusion**: Features F1 and F2 do not satisfy the stability and clean console requirements. Changes must be requested before Milestone 1 can be approved.

---

## 3. Caveats

- Backend pytest suite (16 tests) and frontend typecheck (`tsc --noEmit`) were verified and remain passing.
- `inquiry-unit.mjs` passes cleanly and suppresses Node CommonJS Three warnings.
- The favicon asset itself (`/favicon.ico`) functions correctly and returns HTTP 200.
- No caveats regarding the reproduced defects; all bugs were empirically reproduced with exact commands and exit codes.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 cannot be approved until the following three concrete remediation actions are implemented:

1. **Fix F2 Clock Deprecation Interceptor**:
   - Move or duplicate the `THREE.setConsoleFunction` filter block from `frontend/cena-copia/CenaCanvas.tsx:27-46` into `frontend/src/features/archive/scene/ArchiveCanvas.tsx` (or `frontend/src/app/layout.tsx` / client entrypoint), ensuring it executes prior to `@react-three/fiber` Canvas initialization.
2. **Fix F1 Port Matching Regex in `prebuild.mjs` and `start-production.mjs`**:
   - In `frontend/scripts/prebuild.mjs:39` and `frontend/scripts/start-production.mjs:39`, replace:
     ```javascript
     if (line.includes(`:${port}`) && line.includes("LISTENING"))
     ```
     with strict boundary matching:
     ```javascript
     const portPattern = new RegExp(`:${port}(?:\\s|$)`);
     if (portPattern.test(line) && line.includes("LISTENING"))
     ```
     This prevents killing processes listening on ports 30000–30009.
3. **Fix F1 Lock Handling & Stale Test in `adversarial-f1-f2.mjs`**:
   - In `prebuild.mjs`, add cleanup for `path.join(root, ".next", "lock")` if no active next build PID is alive.
   - In `frontend/tests/adversarial-f1-f2.mjs`, remove or update the check for the deleted `realistic-study/scene.mjs`, and update test F3.3 to import `ArchiveCanvas.tsx` directly instead of mocking `setConsoleFunction` in-line.

---

## 5. Verification Method

To independently verify the defects and later verify their remediation:

### Verification 1: Three.js Clock Deprecation Leakage
Run the following node Playwright script from `frontend/`:
```powershell
node -e "
import('@playwright/test').then(async ({ chromium }) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', msg => { if (msg.type() === 'warning') warnings.push(msg.text()); });
  await page.goto('http://127.0.0.1:3000/?at=desk', { waitUntil: 'networkidle' });
  const hasClock = warnings.some(w => w.includes('THREE.Clock: This module has been deprecated'));
  console.log('Clock warning leaked:', hasClock);
  await browser.close();
  process.exit(hasClock ? 1 : 0);
});
"
```
*Current result*: Exits with code 1 (`Clock warning leaked: true`).  
*Expected after fix*: Exits with code 0 (`Clock warning leaked: false`).

### Verification 2: False-Positive Port 30000 Kill in `prebuild.mjs`
Run the following reproduction script from `frontend/`:
```powershell
node -e "
const http = require('http');
const { spawnSync } = require('child_process');
const server = http.createServer((req, res) => res.end('ok'));
server.listen(30000, '0.0.0.0', () => {
  spawnSync('node', ['scripts/prebuild.mjs'], { stdio: 'ignore' });
  server.close(() => {
    console.log('SUCCESS: Port 30000 was NOT killed.');
    process.exit(0);
  });
});
"
```
*Current result*: Crashes before `server.close()` because process is forcibly terminated by `taskkill`.  
*Expected after fix*: Outputs `SUCCESS: Port 30000 was NOT killed.` and exits with code 0.

### Verification 3: Favicon 200 Serving
```powershell
node -e "fetch('http://127.0.0.1:3000/favicon.ico').then(r => console.log('STATUS:', r.status, 'TYPE:', r.headers.get('content-type')))"
```
*Result*: `STATUS: 200 TYPE: image/x-icon`.
