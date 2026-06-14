# DECISIONS

## Stack

Options considered: MERN, Next.js, React plus Express.

Decision: React, Node.js, Express, and Neon Postgres because the assignment asks for relational DB behavior and the user requested this stack.

## Database

Options considered: SQLite, local Postgres, Neon Postgres.

Decision: Neon Postgres. It satisfies the relational database requirement and is deployable.

## Money Storage

Options considered: decimal rupees, JavaScript numbers, integer paise.

Decision: Store posted INR values as integer paise. This keeps balance math deterministic and makes settlement rounding explainable.

## Currency Conversion

Options considered: live exchange rates, row-specific rates, fixed assignment rate.

Decision: Use a fixed documented USD to INR rate through `USD_TO_INR_RATE`, defaulting to `83`. Live rates would make old imports non-reproducible.

## Import Behavior

Options considered: fail whole import, silently clean data, import with report.

Decision: Import with report. Every row is preserved, anomalies are surfaced, and ambiguous rows are held for review.

## Membership Conflicts

Options considered: automatically remove inactive members, keep CSV as source of truth, block row.

Decision: Keep explicitly listed participants but flag membership conflicts. This avoids silently changing obligations and satisfies the requirement to surface messy data.
