// `npm run dev`: build and start the API on :8080, then the React dev server on :5173 (proxying /api to the API).
// Open http://localhost:5173. Restart this command after changing API code.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const api = path.join(root, "artifacts", "api-server");
const web = path.join(root, "artifacts", "orca-web");
const shell = process.platform === "win32";

console.log("[dev] building API…");
const build = spawnSync("node", ["build.mjs"], { cwd: api, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const run = (name, cmd, args, cwd, env) => {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: "inherit", shell });
  p.on("exit", (code) => { console.log(`[dev] ${name} exited (${code})`); shutdown(code ?? 0); });
  return p;
};

const children = [
  run("api", "node", ["--enable-source-maps", "--env-file-if-exists=../../.env", "dist/index.mjs"], api, { PORT: "8080" }),
  run("web", "npx", ["vite", "--config", "vite.config.ts"], web, { PORT: "5173", BASE_PATH: "/", API_PORT: "8080" }),
];
let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  for (const c of children) c.kill();
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
console.log("[dev] open http://localhost:5173");
