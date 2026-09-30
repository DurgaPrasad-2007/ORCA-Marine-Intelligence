import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { checkPassword, endSession, hashPassword, requireUser, startSession } from "../auth";
import { one, run, type User } from "../db";

const router: IRouter = Router();
export const ROLES = ["fisher", "coastal officer", "researcher", "maritime operator"] as const;
const LANGS = ["English", "Hindi", "Bengali", "Odia", "Telugu", "Tamil", "Malayalam", "Kannada", "Marathi", "Gujarati"] as const;

const signup = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(120), password: z.string().min(8).max(200), role: z.enum(ROLES).default("fisher"), language: z.enum(LANGS).default("English") });
const signin = z.object({ email: z.email().max(120), password: z.string().min(1).max(200) });
const profile = z.object({ name: z.string().trim().min(2).max(80).optional(), role: z.enum(ROLES).optional(), language: z.enum(LANGS).optional() });

const bad = (res: import("express").Response, err: z.ZodError) => res.status(400).json({ error: z.prettifyError(err) });

router.post("/auth/signup", (req, res) => {
  const p = signup.safeParse(req.body);
  if (!p.success) return void bad(res, p.error);
  const email = p.data.email.toLowerCase();
  if (one("SELECT id FROM users WHERE email = ?", email)) return void res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
  const r = run("INSERT INTO users (email, name, pw_hash, role, language) VALUES (?, ?, ?, ?, ?)", email, p.data.name, hashPassword(p.data.password), p.data.role, p.data.language);
  startSession(res, Number(r.lastInsertRowid));
  res.status(201).json({ user: one<User>("SELECT id, email, name, role, language FROM users WHERE id = ?", Number(r.lastInsertRowid)) });
});

router.post("/auth/signin", (req, res) => {
  const p = signin.safeParse(req.body);
  if (!p.success) return void bad(res, p.error);
  const row = one<User & { pw_hash: string }>("SELECT id, email, name, role, language, pw_hash FROM users WHERE email = ?", p.data.email.toLowerCase());
  if (!row || !checkPassword(p.data.password, row.pw_hash)) return void res.status(401).json({ error: "Email or password is incorrect." });
  startSession(res, row.id);
  res.json({ user: { id: row.id, email: row.email, name: row.name, role: row.role, language: row.language } });
});

// One-click access for evaluators: a real account (own saved locations and history), created on first use.
router.post("/auth/demo", (_req, res) => {
  const email = "guest@orca.local";
  let row = one<User>("SELECT id, email, name, role, language FROM users WHERE email = ?", email);
  if (!row) {
    const r = run("INSERT INTO users (email, name, pw_hash, role, language) VALUES (?, ?, ?, ?, ?)", email, "Guest reviewer", hashPassword(`guest-${Date.now()}-${Math.random()}`), "coastal officer", "English");
    row = one<User>("SELECT id, email, name, role, language FROM users WHERE id = ?", Number(r.lastInsertRowid))!;
  }
  startSession(res, row.id);
  res.json({ user: row });
});

router.post("/auth/signout", (req, res) => { endSession(req, res); res.json({ ok: true }); });
router.get("/auth/me", (req, res) => res.json({ user: req.user ?? null }));

router.patch("/auth/me", requireUser, (req, res) => {
  const p = profile.safeParse(req.body);
  if (!p.success) return void bad(res, p.error);
  const u = req.user!;
  run("UPDATE users SET name = ?, role = ?, language = ? WHERE id = ?", p.data.name ?? u.name, p.data.role ?? u.role, p.data.language ?? u.language, u.id);
  res.json({ user: one<User>("SELECT id, email, name, role, language FROM users WHERE id = ?", u.id) });
});

export default router;
