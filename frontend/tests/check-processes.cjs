// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS diagnostic script.
const cp = require("child_process");
try {
  const out = cp.execSync("powershell -Command \"Get-CimInstance Win32_Process -Filter 'Name = ''node.exe''' | Select-Object ProcessId, CommandLine | Format-List\"", { encoding: "utf8" });
  console.log(out);
} catch (e) {
  console.error(e);
}
