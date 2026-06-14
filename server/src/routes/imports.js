import express from "express";
import multer from "multer";
import { analyzeCsv } from "../services/importer.js";
import { transaction, query } from "../db.js";
import { getOrCreatePersonId } from "../services/people.js";

export const importsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function postExpense(client, groupId, importRowId, row) {
  const payerId = await getOrCreatePersonId(client, row.normalized.paidBy);
  const expense = await client.query(
    `INSERT INTO expenses
     (group_id, source_import_row_id, expense_date, description, paid_by_person_id, original_amount, original_currency, amount_inr_paise, split_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      groupId,
      importRowId,
      row.normalized.date,
      row.normalized.description,
      payerId,
      row.normalized.originalAmount,
      row.normalized.currency,
      row.normalized.amountInrPaise,
      row.normalized.splitType,
      row.normalized.notes
    ]
  );
  const expenseId = expense.rows[0].id;
  for (const split of row.splits) {
    const splitPersonId = await getOrCreatePersonId(client, split.person);
    await client.query(
      `INSERT INTO expense_splits (expense_id, person_id, share_paise, basis, basis_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [expenseId, splitPersonId, split.sharePaise, split.basis, split.basisValue]
    );
  }
  await client.query("UPDATE import_rows SET created_expense_id = $1 WHERE id = $2", [expenseId, importRowId]);
}

async function postPayment(client, groupId, importRowId, row) {
  const fromId = await getOrCreatePersonId(client, row.normalized.paidBy);
  const toName = row.normalized.participants[0];
  if (!toName) return;
  const toId = await getOrCreatePersonId(client, toName);
  const payment = await client.query(
    `INSERT INTO payments
     (group_id, source_import_row_id, paid_on, from_person_id, to_person_id, amount_inr_paise, original_amount, original_currency, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      groupId,
      importRowId,
      row.normalized.date,
      fromId,
      toId,
      row.normalized.amountInrPaise,
      row.normalized.originalAmount,
      row.normalized.currency,
      row.normalized.notes
    ]
  );
  await client.query("UPDATE import_rows SET created_payment_id = $1 WHERE id = $2", [payment.rows[0].id, importRowId]);
}

importsRouter.post("/:groupId", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required." });
    const csvText = req.file.buffer.toString("utf8");
    const analysis = analyzeCsv(csvText);
    const saved = await transaction(async (client) => {
      const batchResult = await client.query(
        `INSERT INTO import_batches (group_id, filename, row_count, anomaly_count)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          req.params.groupId,
          req.file.originalname,
          analysis.length,
          analysis.reduce((sum, row) => sum + row.anomalies.length, 0)
        ]
      );
      const batch = batchResult.rows[0];
      for (const row of analysis) {
        const importRow = await client.query(
          `INSERT INTO import_rows (batch_id, row_number, raw, normalized, action)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [batch.id, row.rowNumber, row.raw, row.normalized, row.action]
        );
        const importRowId = importRow.rows[0]?.id;
        for (const issue of row.anomalies) {
          await client.query(
            `INSERT INTO import_anomalies (batch_id, row_number, code, severity, message, policy, action)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [batch.id, issue.rowNumber, issue.code, issue.severity, issue.message, issue.policy, issue.action]
          );
        }
        if (row.action === "posted_expense") {
          await postExpense(client, req.params.groupId, importRowId, row);
        }
        if (row.action === "posted_payment") {
          await postPayment(client, req.params.groupId, importRowId, row);
        }
      }
      return batch;
    });
    res.status(201).json({ batch: saved, rows: analysis });
  } catch (error) {
    next(error);
  }
});

importsRouter.get("/:batchId/report", async (req, res, next) => {
  try {
    const batch = await query("SELECT * FROM import_batches WHERE id = $1", [req.params.batchId]);
    const anomalies = await query(
      "SELECT row_number, code, severity, message, policy, action FROM import_anomalies WHERE batch_id = $1 ORDER BY row_number, id",
      [req.params.batchId]
    );
    res.json({ batch: batch.rows[0], anomalies: anomalies.rows });
  } catch (error) {
    next(error);
  }
});
