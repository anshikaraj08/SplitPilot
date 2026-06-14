import express from "express";
import { query } from "../db.js";
import { calculateBalances } from "../services/balances.js";

export const balancesRouter = express.Router();

balancesRouter.get("/:groupId", async (req, res, next) => {
  try {
    const expensesResult = await query(
      `SELECT e.id, e.description, e.amount_inr_paise, p.display_name AS paid_by
       FROM expenses e
       JOIN people p ON p.id = e.paid_by_person_id
       WHERE e.group_id = $1 AND e.status = 'active'
       ORDER BY e.expense_date, e.id`,
      [req.params.groupId]
    );
    const splitsResult = await query(
      `SELECT es.expense_id, p.display_name AS person, es.share_paise
       FROM expense_splits es
       JOIN people p ON p.id = es.person_id
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = $1 AND e.status = 'active'`,
      [req.params.groupId]
    );
    const paymentsResult = await query(
      `SELECT pf.display_name AS from_name, pt.display_name AS to_name, amount_inr_paise
       FROM payments pay
       JOIN people pf ON pf.id = pay.from_person_id
       JOIN people pt ON pt.id = pay.to_person_id
       WHERE pay.group_id = $1`,
      [req.params.groupId]
    );

    const expenses = expensesResult.rows.map((expense) => ({
      id: expense.id,
      description: expense.description,
      paidBy: expense.paid_by,
      amountInrPaise: Number(expense.amount_inr_paise),
      splits: splitsResult.rows
        .filter((split) => split.expense_id === expense.id)
        .map((split) => ({ person: split.person, sharePaise: Number(split.share_paise) }))
    }));
    const payments = paymentsResult.rows.map((payment) => ({
      from: payment.from_name,
      to: payment.to_name,
      amountPaise: Number(payment.amount_inr_paise)
    }));

    res.json(calculateBalances(expenses, payments));
  } catch (error) {
    next(error);
  }
});
