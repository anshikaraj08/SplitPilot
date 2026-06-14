export const NAME_ALIASES = new Map([
  ["aisha", "Aisha"],
  ["rohan", "Rohan"],
  ["priya", "Priya"],
  ["priya s", "Priya"],
  ["meera", "Meera"],
  ["dev", "Dev"],
  ["dev's friend kabir", "Kabir"],
  ["kabir", "Kabir"],
  ["sam", "Sam"]
]);

export function normalizePersonName(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  const key = cleaned.toLowerCase();
  return NAME_ALIASES.get(key) || cleaned;
}

export function splitPeople(value) {
  if (!value) return [];
  return String(value)
    .split(";")
    .map(normalizePersonName)
    .filter(Boolean);
}
