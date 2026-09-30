// End-to-end UI walkthrough over Chrome DevTools Protocol (no extra dependencies).
// Signs in as the guest reviewer, opens every module, asks a real question, screenshots each step, reports console errors.
// Usage: node evaluation/ui-walkthrough.mjs <baseUrl> <outDir> ["question"]   (server must be running; question hits the real model)
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base = "http://localhost:8080", out = "shots", question = "Is it safe to fish near Digha tomorrow morning? Where is the nearest PFZ?"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333 + Math.floor(Math.random() * 500);
const width = Number(process.env.WIDTH ?? 1440);
const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--window-size=${width},${process.env.HEIGHT ?? 900}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "orca-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40 && !targets; i++) { await sleep(250); targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => undefined); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, `${name}.png`), Buffer.from(r.data, "base64")); console.log("shot", name); };
const go = async (path, wait = 2500) => { await cdp("Page.navigate", { url: `${base}${path}` }); await sleep(wait); };
const click = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
const text = () => ev("document.body.innerText");
const check = async (label, cond) => console.log(cond ? "PASS" : "FAIL", label);

await cdp("Runtime.enable"); await cdp("Page.enable");
await go("/");
await shot("01-home");
await go("/sign-in");
await shot("02-sign-in");
await click('[data-testid="button-guest-access"]');
await sleep(2500);
check("guest sign-in lands on /app", (await ev("location.pathname")) === "/app");
await sleep(6000); // live overview + watchlist
await shot("03-overview");
const pages = [["/app/map", "04-map"], ["/app/watch", "05-watchlist"], ["/app/watch?tab=alerts", "06-alerts"], ["/app/sources", "07-sources"], ["/app/history", "08-history"], ["/app/settings", "09-settings"]];
for (const [p, n] of pages) { await go(p, p.includes("sources") || p.includes("watch") ? 7000 : 4000); await shot(n); }
// Real navigation by clicking (a typed URL hides client-side routing bugs)
await go("/app", 3000);
for (const [testid, path] of [["nav-ask-orca", "/app/ask"], ["nav-map", "/app/map"], ["nav-watchlist-alerts", "/app/watch"], ["nav-history", "/app/history"], ["nav-data-sources", "/app/sources"], ["nav-settings", "/app/settings"], ["nav-overview", "/app"]]) {
  await click(`[data-testid="${testid}"]`);
  await sleep(1500);
  const at = await ev("location.pathname");
  check(`click ${testid} -> ${path}`, at === path && !/not in the current ORCA map/.test(await text()));
}
await go("/app/ask", 3000);
await shot("10-ask-empty");
await ev(`(() => { const i = document.querySelector('[data-testid="input-question"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(i, ${JSON.stringify(question)}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(300);
await click('[data-testid="button-send"]');
await sleep(4000);
await shot("11-ask-working");
for (let i = 0; i < 160; i++) { await sleep(1000); if (await ev(`!document.querySelector('[data-testid="button-stop"]')`)) break; }
await sleep(3000);
await shot("12-ask-answer");
await click('[data-testid="tab-evidence"]'); await sleep(500); await shot("13-ask-evidence");
await click('[data-testid="tab-trace"]'); await sleep(500); await shot("14-ask-trace");
const t = await text();
check("answer has grounding check", /Number check/.test(t));
check("no error banner", !/could not produce|hit an unexpected error/.test(t));
console.log(errors.length ? `console errors:\n  ${[...new Set(errors)].join("\n  ")}` : "no console errors");
ws.close(); proc.kill(); process.exit(0);
