export async function getOrCreatePersonId(client, name) {
  const normalized = String(name || "").trim().toLowerCase();
  const result = await client.query("SELECT id FROM people WHERE normalized_name = $1", [normalized]);
  if (result.rows[0]) return result.rows[0].id;
  const created = await client.query(
    "INSERT INTO people (display_name, normalized_name) VALUES ($1, $2) RETURNING id",
    [name, normalized]
  );
  return created.rows[0].id;
}
