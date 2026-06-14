# SCOPE

## Product Scope

SplitPilot implements the assignment requirements only: login, group membership over time, expenses, CSV import with anomaly handling, balances, settlements, relational database schema, and documentation.

## Anomaly Log and Policies

| Issue | Example | Policy | Action |
| --- | --- | --- | --- |
| Duplicate exact expense | Two Marina Bites rows | Keep the first; later duplicate requires approval | Flag as `EXACT_DUPLICATE` |
| Similar duplicate with different amount | Thalassa dinner rows | Do not choose a winner silently | Flag for review |
| Name casing/spacing | `priya`, `rohan ` | Trim and normalize known names | Use canonical person |
| Alias | `Priya S` | Map documented alias to Priya | Use canonical person |
| Missing payer | House cleaning supplies | Cannot post automatically | Hold for review |
| Settlement in expense export | Rohan paid Aisha back | Record as payment, not expense | Classify as settlement |
| Comma amount | `1,200` | Strip grouping commas | Parse numeric value |
| Sub-paise amount | `899.995` | Round after conversion to nearest paise | Flag rounding |
| USD expense | Goa villa booking | Convert using fixed documented rate, default `83` | Convert to INR paise |
| Negative amount | Parasailing refund | Treat as refund reducing balances | Post as negative expense |
| Ambiguous date | `Mar-14` | Interpret as March 14, 2026 | Normalize and flag |
| Missing currency | Groceries DMart | Default to INR for recurring flat expenses | Set INR and flag |
| Zero amount | Swiggy row | Do not post as expense | Hold in report |
| Inactive member | Meera in April | Keep explicit CSV participant but flag timeline conflict | Surface anomaly |
| Unknown guest | Dev's friend Kabir | Normalize known guest to Kabir | Include and flag guest context |
| Split details mismatch | Equal row with shares | Respect split type; details are informational | Flag mismatch |

## Database Schema

The relational schema is in `server/src/schema.sql`.

Main tables:

- `users`
- `groups`
- `people`
- `group_memberships`
- `expenses`
- `expense_splits`
- `payments`
- `import_batches`
- `import_rows`
- `import_anomalies`

Money is stored as INR paise in posting tables to avoid floating-point balance errors.
