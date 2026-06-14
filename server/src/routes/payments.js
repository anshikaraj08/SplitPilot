import express from "express";
import { query, transaction } from "../db.js";
import { getOrCreatePersonId } from "../services/people.js";
import { rupeesToPaise } from "../services/money.js";

export const paymentsRouter = express.Router();

paymentsRouter.get("/:groupId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pay.id, pay.paid_on, pf.display_name AS from_person, pt.display_name AS to_person,
              pay.original_amount, pay.original_currency, pay.amount_inr_paise, pay.notes
       FROM payments pay
       JOIN people pf ON pf.id = pay.from_person_id
       JOIN people pt ON pt.id = pay.to_person_id
       WHERE pay.group_id = $1
       ORDER BY pay.paid_on DESC, pay.id DESC`,
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/:groupId", async (req, res, next) => {
  try {
    const created = await transaction(async (client) => {
      const fromId = await getOrCreatePersonId(client, req.body.from);
      const toId = await getOrCreatePersonId(client, req.body.to);
      const amountPaise = rupeesToPaise(req.body.amount);
      const result = await client.query(
        `INSERT INTO payments
         (group_id, paid_on, from_person_id, to_person_id, amount_inr_paise, original_amount, original_currency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7)
         RETURNING *`,
        [req.params.groupId, req.body.date, fromId, toId, amountPaise, req.body.amount, req.body.notes || null]
      );
      return result.rows[0];
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});
