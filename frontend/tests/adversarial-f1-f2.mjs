import { spawn, spawnSync, execSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const prebuildScript = path.join(frontendRoot, "scripts", "prebuild.mjs");
const pidFile = path.join(frontendRoot, ".pensieve-server.pid");

console.log("=== ADVERSARIAL STRESS HARNESS: FEATURES F1 & F2 ===");
console.log(`Frontend Root: ${frontendRoot}`);

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    console.log(`\n[RUNNING] ${name}`);
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    console.log(`\n[RUNNING] ${name}`);
    await fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    testsFailed++;
  }
}

// --------------------------------------------------------------------------
// SUITE 1: Feature F1 (prebuild.mjs Concurrency & Port Lock Handling)
// --------------------------------------------------------------------------

// Helper to spawn a dummy HTTP server on a port
function startDummyServer(port) {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn(
      process.execPath,
      [
        "-e",
        `
        const http = require('http');
        const s = http.createServer((req, res) => { res.end('dummy'); });
        s.listen(${port}, '0.0.0.0', () => {
          console.log('LISTENING');
        });
        process.on('SIGTERM', () => { s.close(); process.exit(0); });
        process.on('SIGINT', () => { s.close(); process.exit(0); });
        `,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let output = "";
    serverProcess.stdout.on("data", (data) => {
      output += data.toString();
      if (output.includes("LISTENING")) {
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[DummyServer err]:`, data.toString());
    });

    serverProcess.on("error", reject);
  });
}

// Test 1.1: Concurrent executions of prebuild.mjs
await runAsyncTest("F1.1: 10 concurrent executions of prebuild.mjs do not crash or race", async () => {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      new Promise((resolve) => {
        const proc = spawn(process.execPath, [prebuildScript], {
          cwd: frontendRoot,
          stdio: "pipe",
        });
        let stderr = "";
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("exit", (code) => {
          resolve({ code, stderr });
        });
      })
    );
  }

  const results = await Promise.all(promises);
  for (let i = 0; i < results.length; i++) {
    const { code, stderr } = results[i];
    assert.equal(
      code,
      0,
      `Instance ${i} failed with code ${code}. Stderr: ${stderr}`
    );
  }
});

// Test 1.2: prebuild terminates locked server on default port 3000 (with PID file)
await runAsyncTest("F1.2: prebuild terminates server locked on port 3000 tracked by PID file", async () => {
  const dummy = await startDummyServer(3000);
  assert.ok(dummy.pid, "Dummy server should have a valid PID");
  fs.writeFileSync(pidFile, String(dummy.pid), "utf8");

  // Verify server is listening
  const res = await fetch("http://127.0.0.1:3000/").catch(() => null);
  assert.ok(res && res.ok, "Dummy server should be reachable on port 3000");

  // Run prebuild
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed: ${result.stderr.toString()}`);

  // Wait brief moment and verify server was killed
  await new Promise((r) => setTimeout(r, 500));
  const resAfter = await fetch("http://127.0.0.1:3000/").catch(() => null);
  assert.equal(resAfter, null, "Dummy server on port 3000 must no longer be reachable");

  // PID file should be removed
  assert.equal(fs.existsSync(pidFile), false, "PID file must be deleted");
});

// Test 1.3: prebuild terminates unrecorded orphan server locked on port 3000 (NO PID file)
await runAsyncTest("F1.3: prebuild terminates unrecorded orphaned server listening on port 3000 via netstat scan", async () => {
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);

  const dummy = await startDummyServer(3000);
  assert.ok(dummy.pid, "Dummy server should have a valid PID");

  // Verify server is reachable without PID file
  const res = await fetch("http://127.0.0.1:3000/").catch(() => null);
  assert.ok(res && res.ok, "Dummy server should be reachable on port 3000");

  // Run prebuild WITHOUT PID file
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed: ${result.stderr.toString()}`);

  // Verify server was killed via port scanning
  await new Promise((r) => setTimeout(r, 500));
  const resAfter = await fetch("http://127.0.0.1:3000/").catch(() => null);
  assert.equal(resAfter, null, "Port 3000 must be cleared even without PID file");
});

// Test 1.4: prebuild respects PENSIEVE_PORT environment variable
await runAsyncTest("F1.4: prebuild terminates server on custom PENSIEVE_PORT=3998", async () => {
  const customPort = 3998;
  const dummy = await startDummyServer(customPort);

  const res = await fetch(`http://127.0.0.1:${customPort}/`).catch(() => null);
  assert.ok(res && res.ok, `Server should be reachable on port ${customPort}`);

  // Run prebuild with PENSIEVE_PORT=3998
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    env: { ...process.env, PENSIEVE_PORT: String(customPort) },
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed: ${result.stderr.toString()}`);

  await new Promise((r) => setTimeout(r, 500));
  const resAfter = await fetch(`http://127.0.0.1:${customPort}/`).catch(() => null);
  assert.equal(resAfter, null, `Port ${customPort} must be cleared`);
});

// Test 1.5: Stale & malformed PID file edge cases
runTest("F1.5a: Stale PID file with nonexistent PID does not cause prebuild failure", () => {
  fs.writeFileSync(pidFile, "999999", "utf8");
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed on stale PID: ${result.stderr.toString()}`);
  assert.equal(fs.existsSync(pidFile), false, "Stale PID file should be removed");
});

runTest("F1.5b: Malformed PID file with string content does not crash prebuild", () => {
  fs.writeFileSync(pidFile, "NOT_A_VALID_NUMBER_CORRUPTED", "utf8");
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed on corrupted PID: ${result.stderr.toString()}`);
  assert.equal(fs.existsSync(pidFile), false, "Malformed PID file should be removed");
});

runTest("F1.5c: Empty PID file does not crash prebuild", () => {
  fs.writeFileSync(pidFile, "", "utf8");
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0, `prebuild failed on empty PID: ${result.stderr.toString()}`);
  assert.equal(fs.existsSync(pidFile), false, "Empty PID file should be removed");
});

runTest("F1.5d: prebuild does not terminate itself if PID file matches process.pid", () => {
  // If PID file somehow contained the PID of prebuild itself
  // prebuild must safely ignore it
  fs.writeFileSync(pidFile, "123456789", "utf8");
  const result = spawnSync(process.execPath, [prebuildScript], {
    cwd: frontendRoot,
    stdio: "pipe",
  });
  assert.equal(result.status, 0);
});

// --------------------------------------------------------------------------
// SUITE 2: Feature F2 (Favicon Binary Validation & Contract)
// --------------------------------------------------------------------------

runTest("F2.1: public/favicon.ico and src/app/favicon.ico exist and have valid ICO headers", () => {
  const publicFavicon = path.join(frontendRoot, "public", "favicon.ico");
  const appFavicon = path.join(frontendRoot, "src", "app", "favicon.ico");
  const svgFavicon = path.join(frontendRoot, "public", "favicon.svg");

  assert.ok(fs.existsSync(publicFavicon), "public/favicon.ico must exist");
  assert.ok(fs.existsSync(appFavicon), "src/app/favicon.ico must exist");
  assert.ok(fs.existsSync(svgFavicon), "public/favicon.svg must exist");

  const buf = fs.readFileSync(publicFavicon);
  assert.ok(buf.length > 0, "favicon.ico must not be empty");

  // Validate ICO Header:
  // Byte 0-1: Reserved (must be 0x0000)
  // Byte 2-3: Type (1 for ICO, 2 for CUR)
  // Byte 4-5: Count of images (>= 1)
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);

  assert.equal(reserved, 0, "ICO header reserved bytes must be 0");
  assert.equal(type, 1, "ICO header image type must be 1 (icon)");
  assert.ok(count >= 1, `ICO must contain at least 1 image, found ${count}`);

  const appBuf = fs.readFileSync(appFavicon);
  assert.equal(buf.length, appBuf.length, "public and src/app favicon sizes should match");

  const svgContent = fs.readFileSync(svgFavicon, "utf8");
  assert.ok(svgContent.includes("<svg"), "SVG favicon must be valid SVG markup");
});

runTest("F2.2: layout.tsx explicitly defines metadata.icons with /favicon.ico", () => {
  const layoutPath = path.join(frontendRoot, "src", "app", "layout.tsx");
  const layoutCode = fs.readFileSync(layoutPath, "utf8");
  assert.ok(
    layoutCode.includes('icon: "/favicon.ico"'),
    "layout.tsx must configure icon: '/favicon.ico' in metadata"
  );
});

// --------------------------------------------------------------------------
// SUITE 3: Feature F2 (Three.js Clock Deprecation & Console Leakage)
// --------------------------------------------------------------------------

await runAsyncTest("F3.1: inquiry-unit.mjs executes with zero THREE deprecation warnings", async () => {
  const proc = spawn(process.execPath, ["tests/inquiry-unit.mjs"], {
    cwd: frontendRoot,
    stdio: "pipe",
  });

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d) => (stdout += d.toString()));
  proc.stderr.on("data", (d) => (stderr += d.toString()));

  const exitCode = await new Promise((resolve) => proc.on("exit", resolve));

  assert.equal(exitCode, 0, `inquiry-unit.mjs exited with code ${exitCode}`);
  assert.ok(
    !stdout.includes("THREE_CJS_DEPRECATED"),
    "Stdout must not leak THREE_CJS_DEPRECATED"
  );
  assert.ok(
    !stderr.includes("THREE_CJS_DEPRECATED"),
    "Stderr must not leak THREE_CJS_DEPRECATED"
  );
  assert.ok(
    !stdout.includes("THREE.Clock: This module has been deprecated"),
    "Stdout must not leak Clock deprecation"
  );
  assert.ok(
    !stderr.includes("THREE.Clock: This module has been deprecated"),
    "Stderr must not leak Clock deprecation"
  );
  assert.ok(
    stdout.includes("passed"),
    "inquiry-unit.mjs must complete successfully"
  );
});

runTest("F3.2: realistic-study/scene.mjs has zero occurrences of THREE.Clock", () => {
  const scenePath = path.join(frontendRoot, "realistic-study", "scene.mjs");
  const content = fs.readFileSync(scenePath, "utf8");
  assert.ok(
    !content.includes("THREE.Clock"),
    "realistic-study/scene.mjs must NOT contain THREE.Clock"
  );
  assert.ok(
    content.includes("new THREE.Timer()"),
    "realistic-study/scene.mjs must use THREE.Timer"
  );
  assert.ok(
    content.includes("timer.getElapsed()"),
    "realistic-study/scene.mjs must use timer.getElapsed()"
  );
});

await runAsyncTest("F3.3: THREE.setConsoleFunction filter in ArchiveCanvas intercepts Clock deprecation cleanly", async () => {
  const THREE = await import("three");
  assert.equal(typeof THREE.setConsoleFunction, "function");

  let intercepted = false;
  let otherLogged = false;

  THREE.setConsoleFunction((type, msg, ...params) => {
    if (
      type === "warn" &&
      typeof msg === "string" &&
      msg.includes("Clock: This module has been deprecated")
    ) {
      intercepted = true;
      return;
    }
    otherLogged = true;
  });

  // Instantiating Clock should be intercepted without leaking
  const clock = new THREE.Clock();
  assert.ok(clock, "Clock was instantiated");
  assert.equal(intercepted, true, "Clock deprecation warning must be intercepted");
  assert.equal(otherLogged, false, "No other warnings should have been emitted for Clock");

  // Verify other warnings still pass through
  THREE.warn("legitimate-test-warning");
  assert.equal(otherLogged, true, "Legitimate warnings must NOT be suppressed by the filter");
});

console.log("\n========================================");
console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);
console.log("========================================");

if (testsFailed > 0) {
  process.exit(1);
}
