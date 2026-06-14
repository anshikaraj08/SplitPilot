import express from "express";
import { query, transaction } from "../db.js";
import { getOrCreatePersonId } from "../services/people.js";
import { allocateRemainder, rupeesToPaise } from "../services/money.js";

export const expensesRouter = express.Router();

expensesRouter.get("/:groupId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.expense_date, e.description, payer.display_name AS paid_by,
              e.original_amount, e.original_currency, e.amount_inr_paise, e.split_type, e.notes
       FROM expenses e
       JOIN people payer ON payer.id = e.paid_by_person_id
       WHERE e.group_id = $1
       ORDER BY e.expense_date DESC, e.id DESC`,
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/:groupId", async (req, res, next) => {
  try {
    const created = await transaction(async (client) => {
      const amountPaise = rupeesToPaise(req.body.amount);
      const payerId = await getOrCreatePersonId(client, req.body.paidBy);
      const expense = await client.query(
        `INSERT INTO expenses
         (group_id, expense_date, description, paid_by_person_id, original_amount, original_currency, amount_inr_paise, split_type, notes)
         VALUES ($1, $2, $3, $4, $5, 'INR', $6, 'equal', $7)
         RETURNING *`,
        [req.params.groupId, req.body.date, req.body.description, payerId, req.body.amount, amountPaise, req.body.notes || null]
      );
      const participants = req.body.participants || [];
      const splits = allocateRemainder(amountPaise, participants.map((person) => ({ person, weight: 1, basis: "equal", basisValue: 1 })));
      for (const split of splits) {
        const personId = await getOrCreatePersonId(client, split.person);
        await client.query(
          `INSERT INTO expense_splits (expense_id, person_id, share_paise, basis, basis_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [expense.rows[0].id, personId, split.sharePaise, split.basis, split.basisValue]
        );
      }
      return expense.rows[0];
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

expensesRouter.patch("/:expenseId", async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE expenses
       SET description = COALESCE($2, description),
           notes = COALESCE($3, notes),
           status = COALESCE($4, status)
       WHERE id = $1
       RETURNING *`,
      [req.params.expenseId, req.body.description, req.body.notes, req.body.status]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
