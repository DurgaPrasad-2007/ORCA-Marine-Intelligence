// Debug helper: ask one question and show the sentence around every number the grounding check could not trace.
// Usage: node evaluation/explain-ungrounded.mjs "question" [baseUrl]
const [q, base = "http://localhost:8080"] = process.argv.slice(2);
const login = await fetch(`${base}/api/auth/demo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
const cookie = login.headers.get("set-cookie").split(";")[0];
const res = await fetch(`${base}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ message: q }) });
let event, answer;
for (const line of (await res.text()).split("\n")) {
  if (line.startsWith("event:")) event = line.slice(6).trim();
  else if (line.startsWith("data:") && event === "answer") answer = JSON.parse(line.slice(5));
}
if (!answer) { console.log("no answer"); process.exit(1); }
console.log(answer.text, "\n\nGROUNDING", answer.grounding);
for (const n of answer.grounding.ungrounded) {
  const i = answer.text.indexOf(n);
  console.log(`\n"${n}" in: …${answer.text.slice(Math.max(0, i - 80), i + 60).replace(/\n/g, " ")}…`);
  console.log("  present in a tool output as a substring:", answer.trace.some((t) => (t.output ?? "").includes(n)));
}
