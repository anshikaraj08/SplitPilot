CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS group_memberships (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id),
  joined_on DATE NOT NULL,
  left_on DATE,
  role TEXT NOT NULL DEFAULT 'member',
  UNIQUE (group_id, person_id, joined_on)
);

CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review_required',
  row_count INTEGER NOT NULL DEFAULT 0,
  anomaly_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_rows (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw JSONB NOT NULL,
  normalized JSONB,
  action TEXT NOT NULL,
  created_expense_id INTEGER,
  created_payment_id INTEGER
);

CREATE TABLE IF NOT EXISTS import_anomalies (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  policy TEXT NOT NULL,
  action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  source_import_row_id INTEGER REFERENCES import_rows(id),
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  paid_by_person_id INTEGER NOT NULL REFERENCES people(id),
  original_amount NUMERIC(12, 3) NOT NULL,
  original_currency TEXT NOT NULL,
  amount_inr_paise INTEGER NOT NULL,
  split_type TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id),
  share_paise INTEGER NOT NULL,
  basis TEXT NOT NULL,
  basis_value NUMERIC(12, 4),
  UNIQUE (expense_id, person_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  source_import_row_id INTEGER REFERENCES import_rows(id),
  paid_on DATE NOT NULL,
  from_person_id INTEGER NOT NULL REFERENCES people(id),
  to_person_id INTEGER NOT NULL REFERENCES people(id),
  amount_inr_paise INTEGER NOT NULL,
  original_amount NUMERIC(12, 3) NOT NULL,
  original_currency TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
