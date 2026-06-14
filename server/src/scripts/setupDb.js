import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { pool, query } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "schema.sql");

async function seed() {
  const passwordHash = await bcrypt.hash("splitpilot123", 10);
  const userResult = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ["SplitPilot Demo", "demo@splitpilot.local", passwordHash]
  );

  const groupResult = await query(
    `INSERT INTO groups (name, created_by)
     SELECT $1, $2
     WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = $1)
     RETURNING id`,
    ["SplitPilot Flat", userResult.rows[0].id]
  );

  const existingGroup = await query("SELECT id FROM groups WHERE name = $1", ["SplitPilot Flat"]);
  const groupId = groupResult.rows[0]?.id || existingGroup.rows[0].id;

  const people = ["Aisha", "Rohan", "Priya", "Meera", "Dev", "Sam", "Kabir"];
  for (const name of people) {
    await query(
      `INSERT INTO people (display_name, normalized_name)
       VALUES ($1, $2)
       ON CONFLICT (normalized_name) DO NOTHING`,
      [name, name.toLowerCase()]
    );
  }

  const memberships = [
    ["Aisha", "2026-02-01", null, "member"],
    ["Rohan", "2026-02-01", null, "member"],
    ["Priya", "2026-02-01", null, "member"],
    ["Meera", "2026-02-01", "2026-03-31", "member"],
    ["Dev", "2026-02-08", "2026-03-14", "guest"],
    ["Sam", "2026-04-10", null, "member"],
    ["Kabir", "2026-03-11", "2026-03-11", "guest"]
  ];

  for (const [name, joined, left, role] of memberships) {
    await query(
      `INSERT INTO group_memberships (group_id, person_id, joined_on, left_on, role)
       SELECT $1, id, $3, $4, $5 FROM people WHERE normalized_name = $2
       ON CONFLICT (group_id, person_id, joined_on) DO UPDATE
       SET left_on = EXCLUDED.left_on, role = EXCLUDED.role`,
      [groupId, name.toLowerCase(), joined, left, role]
    );
  }
}

async function main() {
  const schema = await fs.readFile(schemaPath, "utf8");
  await query(schema);
  await seed();
  await pool.end();
  console.log("SplitPilot database schema and seed data are ready.");
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
