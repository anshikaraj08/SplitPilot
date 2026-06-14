import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";

export const authRouter = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateCredentials({ email, password }) {
  if (!email || !email.includes("@")) {
    return "Enter a valid email address.";
  }
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return "";
}

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, config.jwtSecret, { expiresIn: "7d" });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const credentialError = validateCredentials({ email, password });
    if (!name) return res.status(400).json({ message: "Name is required." });
    if (credentialError) return res.status(400).json({ message: credentialError });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );
    res.status(201).json({ user: result.rows[0], token: sign(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "An account already exists for that email." });
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const credentialError = validateCredentials({ email, password });
    if (credentialError) return res.status(400).json({ message: credentialError });

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token: sign(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const { id, name, email } = req.user;
  res.json({ user: { id, name, email } });
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token." });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token." });
  }
}
