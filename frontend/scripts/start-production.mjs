import { access, cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const standalone = path.join(root, ".next", "standalone");
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
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.PENSIEVE_HOST ?? "127.0.0.1",
    PORT: process.env.PENSIEVE_PORT ?? "3000",
  },
});
server.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
