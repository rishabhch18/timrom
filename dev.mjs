import { spawn } from "node:child_process";
const backend = spawn(process.execPath, ["--watch", "server/index.mjs"], {
  stdio: "inherit",
});
const angular = spawn(
  process.execPath,
  [
    "node_modules/@angular/cli/bin/ng.js",
    "serve",
    "--host",
    "127.0.0.1",
    "--port",
    "4200",
    "--proxy-config",
    "proxy.conf.json",
  ],
  { stdio: "inherit" },
);
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  backend.kill("SIGTERM");
  angular.kill("SIGTERM");
  const timer = setTimeout(() => process.exit(code), 2000);
  timer.unref();
}
for (const child of [backend, angular])
  child.on("exit", (code) => close(code || 0));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => close());
console.log(
  "Timrom: Angular :4200 + watched local backend :3012. No sample data is imported.",
);
