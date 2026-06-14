# AI_USAGE

## Tool Used

Codex was used as the primary coding collaborator.

## Key Prompts

- "Read the assignment PDF and make an implementation plan."
- "Use React, Node, Express, and Neon DB."
- "Do whatever is asked only."

## AI Mistakes Caught and Corrected

1. The first plan suggested SQLite as a fast local option. The user specified Neon DB, so the implementation was changed to Postgres via Neon.
2. A generic plan initially treated duplicate handling vaguely. The CSV was inspected and exact/fuzzy duplicate policies were made explicit in the importer.
3. The import scope could have silently normalized member timeline conflicts. The implemented policy instead flags inactive members while preserving explicit CSV participants.

## Engineer of Record Notes

The code is intentionally organized so the live review can trace anomalies through `server/src/services/importer.js` and balances through `server/src/services/balances.js`.
