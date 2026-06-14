import express from "express";
import { query } from "../db.js";

export const groupsRouter = express.Router();

groupsRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query("SELECT id, name, created_at FROM groups ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

groupsRouter.post("/", async (req, res, next) => {
  try {
    const result = await query(
      "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *",
      [req.body.name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

groupsRouter.get("/:id/members", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT gm.id, p.display_name, gm.joined_on, gm.left_on, gm.role
       FROM group_memberships gm
       JOIN people p ON p.id = gm.person_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_on, p.display_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});
