// Sign in as guest, open one app URL, wait for the agent to finish, screenshot.
// Usage: node evaluation/ui-shot.mjs <baseUrl> </app/path?query> <out.png> [width] [height]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base, path, out, width = "1600", height = "950"] = process.argv.slice(2);
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--window-size=${width},${height}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "orca-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(250); t = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => undefined); }
const ws = new WebSocket(t.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errors = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) pend.get(m.id)(m.result); if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text); });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await cdp("Runtime.enable"); await cdp("Page.enable");
await cdp("Page.navigate", { url: `${base}/sign-in` }); await sleep(2500);
await ev(`document.querySelector('[data-testid="button-guest-access"]').click()`);
for (let i = 0; i < 20 && !(await ev(`location.pathname.startsWith('/app')`)); i++) await sleep(500);
await sleep(1000);
await cdp("Page.navigate", { url: `${base}${path}` }); await sleep(4000);
for (let i = 0; i < 180; i++) { await sleep(1000); if (await ev(`!document.querySelector('[data-testid="button-stop"]')`)) break; }
await sleep(Number(process.env.WAIT ?? 7000));
const shot = await cdp("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log("saved", out, "at", await ev("location.pathname"), errors.length ? `errors: ${errors.join("; ")}` : "no page errors");
ws.close(); proc.kill(); process.exit(0);
