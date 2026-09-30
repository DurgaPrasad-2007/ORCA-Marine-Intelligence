// Small custom auth: email + password (scrypt), opaque random session token in an httpOnly cookie, sha256 of the token stored.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { one, run, type User } from "./db";

const COOKIE = "orca_session";
const DAYS = 30;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function startSession(res: Response, userId: number) {
  const token = randomBytes(32).toString("base64url");
  run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", sha(token), userId, Date.now() + DAYS * 864e5);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env["NODE_ENV"] === "production", maxAge: DAYS * 864e5, path: "/" });
}
export function endSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (token) run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
  res.clearCookie(COOKIE, { path: "/" });
}

declare global {
  namespace Express {
    interface Request { user?: User }
  }
}

export function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    const row = one<User & { expires_at: number }>(
      "SELECT u.id, u.email, u.name, u.role, u.language, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
      sha(token),
    );
    if (row && row.expires_at > Date.now()) req.user = { id: row.id, email: row.email, name: row.name, role: row.role, language: row.language };
  }
  next();
}
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) { res.status(401).json({ error: "Sign in required" }); return; }
  next();
}
