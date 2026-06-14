# SplitPilot

SplitPilot is a shared expenses app for the Spreetail assignment. It uses React, Node.js, Express, and Neon Postgres.

## Features

- Login module with seeded demo user.
- Group and membership timeline management in a relational schema.
- CSV import for `expenses_export.csv` without editing the file by hand.
- Import anomaly report with detection, policy, and action for each problem.
- Split support for `equal`, `unequal`, `percentage`, and `share`.
- Balance calculation service with simplified settlements and drill-down-ready expense entries.

## Setup

1. Create `.env` from `.env.example`.
2. Set `DATABASE_URL` to the Neon Postgres connection string.
3. Install dependencies:

```bash
npm install
```

4. Create schema and seed demo data:

```bash
npm run db:setup
```

5. Start the app:

```bash
npm run dev
```

The API runs on `http://localhost:4000` and the React app runs on `http://localhost:5173`.

Demo login:

- Email: `demo@splitpilot.local`
- Password: `splitpilot123`
