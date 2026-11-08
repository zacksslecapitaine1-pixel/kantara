-- ═══════════════════════════════════════════════════════════
-- KANTARA v4.1 — SQL D'INITIALISATION ET DE MISE À JOUR
-- Copiez TOUT ce bloc dans Supabase > SQL Editor > Run
--
-- ✅ SANS DANGER : aucune donnée n'est supprimée.
--    Utilisable sur une base neuve OU sur une base existante
--    (il ajoute simplement les tables / colonnes manquantes).
--    Vous pouvez l'exécuter autant de fois que nécessaire.
-- ═══════════════════════════════════════════════════════════

-- ── TABLE : settings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                    TEXT        PRIMARY KEY DEFAULT 'config',
  admin_password        TEXT        NOT NULL DEFAULT '1234',
  display_name          TEXT        NOT NULL DEFAULT 'Administrateur',
  company_name          TEXT        NOT NULL DEFAULT 'Mon Entreprise',
  currency              TEXT        NOT NULL DEFAULT 'XOF',
  language              TEXT        NOT NULL DEFAULT 'fr',
  theme                 TEXT        NOT NULL DEFAULT 'light',
  notifications_enabled BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : followers (observateurs) ──────────────────────
CREATE TABLE IF NOT EXISTS followers (
  id          TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name        TEXT        NOT NULL,
  access_code TEXT        UNIQUE NOT NULL,
  permissions TEXT        NOT NULL DEFAULT '{"view":true,"edit":false,"manage":false}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : projects ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  client_id   TEXT,
  status      TEXT        NOT NULL DEFAULT 'active',
  priority    TEXT        NOT NULL DEFAULT 'medium',
  budget      NUMERIC     NOT NULL DEFAULT 0,
  start_date  TEXT,
  end_date    TEXT,
  notes       TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#C9972A',
  archived    BOOLEAN     NOT NULL DEFAULT false,
  milestones  TEXT        NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : tasks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title            TEXT        NOT NULL,
  project_id       TEXT,
  assignee         TEXT        NOT NULL DEFAULT '',
  assignee_id      TEXT        NOT NULL DEFAULT '',
  status           TEXT        NOT NULL DEFAULT 'todo',
  priority         TEXT        NOT NULL DEFAULT 'medium',
  due_date         TEXT,
  notes            TEXT        NOT NULL DEFAULT '',
  issue            TEXT        NOT NULL DEFAULT '',
  tags             TEXT        NOT NULL DEFAULT '[]',
  checklist        TEXT        NOT NULL DEFAULT '[]',
  time_estimate    NUMERIC     NOT NULL DEFAULT 0,
  is_recurring     BOOLEAN     NOT NULL DEFAULT false,
  recurring_period TEXT        NOT NULL DEFAULT 'weekly',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : clients ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL DEFAULT '',
  phone      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  company    TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'individual',
  status     TEXT        NOT NULL DEFAULT 'active',
  city       TEXT        NOT NULL DEFAULT '',
  country    TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : suppliers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL DEFAULT '',
  phone      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  category   TEXT        NOT NULL DEFAULT '',
  specialty  TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : expenses ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title          TEXT        NOT NULL DEFAULT '',
  description    TEXT        NOT NULL DEFAULT '',
  amount         NUMERIC     NOT NULL DEFAULT 0,
  category       TEXT        NOT NULL DEFAULT '',
  project_id     TEXT,
  supplier_id    TEXT,
  date           TEXT,
  payment_method TEXT        NOT NULL DEFAULT 'cash',
  reference      TEXT        NOT NULL DEFAULT '',
  currency       TEXT        NOT NULL DEFAULT 'XOF',
  notes          TEXT        NOT NULL DEFAULT '',
  receipt_url    TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : quotes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  number     TEXT,
  client_id  TEXT,
  project_id TEXT,
  status     TEXT        NOT NULL DEFAULT 'draft',
  lines      TEXT        NOT NULL DEFAULT '[]',
  subtotal   NUMERIC     NOT NULL DEFAULT 0,
  tax        NUMERIC     NOT NULL DEFAULT 0,
  total      NUMERIC     NOT NULL DEFAULT 0,
  currency   TEXT        NOT NULL DEFAULT 'XOF',
  date       TEXT,
  validity   INTEGER     NOT NULL DEFAULT 30,
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : invoices ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  number     TEXT,
  client_id  TEXT,
  project_id TEXT,
  quote_id   TEXT,
  status     TEXT        NOT NULL DEFAULT 'draft',
  lines      TEXT        NOT NULL DEFAULT '[]',
  subtotal   NUMERIC     NOT NULL DEFAULT 0,
  tax        NUMERIC     NOT NULL DEFAULT 0,
  total      NUMERIC     NOT NULL DEFAULT 0,
  paid       NUMERIC     NOT NULL DEFAULT 0,
  currency   TEXT        NOT NULL DEFAULT 'XOF',
  date       TEXT,
  due_date   TEXT,
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : payments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  invoice_id TEXT,
  amount     NUMERIC     NOT NULL DEFAULT 0,
  date       TEXT,
  method     TEXT        NOT NULL DEFAULT 'cash',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : proofs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proofs (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  url        TEXT        NOT NULL DEFAULT '',
  file_name  TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'other',
  notes      TEXT        NOT NULL DEFAULT '',
  link_type  TEXT,
  link_id    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : notifications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title      TEXT,
  message    TEXT,
  type       TEXT        NOT NULL DEFAULT 'info',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : team_members ──────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id                TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL DEFAULT '',
  phone             TEXT        NOT NULL DEFAULT '',
  role              TEXT        NOT NULL DEFAULT 'member',
  department        TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'active',
  avatar_color      TEXT        NOT NULL DEFAULT '#C9972A',
  performance_score NUMERIC     NOT NULL DEFAULT 0,
  notes             TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : milestones ────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  project_id TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  date       TEXT,
  done       BOOLEAN     NOT NULL DEFAULT false,
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : subtasks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  task_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE : documents ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title      TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'other',
  url        TEXT        NOT NULL DEFAULT '',
  project_id TEXT,
  task_id    TEXT,
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- MISE À JOUR DES TABLES EXISTANTES
-- (ajoute les colonnes manquantes — sans effet si déjà présentes)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_name          TEXT    NOT NULL DEFAULT 'Mon Entreprise';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency              TEXT    NOT NULL DEFAULT 'XOF';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS language              TEXT    NOT NULL DEFAULT 'fr';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme                 TEXT    NOT NULL DEFAULT 'light';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS milestones TEXT    NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color      TEXT    NOT NULL DEFAULT '#C9972A';

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id      TEXT    NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS issue            TEXT    NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags             TEXT    NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist        TEXT    NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_estimate    NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_period TEXT    NOT NULL DEFAULT 'weekly';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS type    TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status  TEXT NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city    TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT '';

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description    TEXT NOT NULL DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference      TEXT NOT NULL DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE expenses ALTER COLUMN title SET DEFAULT '';

-- ── Accès (l'application utilise la clé publique "anon") ──
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE followers     DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients       DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers     DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses      DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments      DISABLE ROW LEVEL SECURITY;
ALTER TABLE proofs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  DISABLE ROW LEVEL SECURITY;
ALTER TABLE milestones    DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks      DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents     DISABLE ROW LEVEL SECURITY;

-- ── Données initiales ─────────────────────────────────────
INSERT INTO settings (id, admin_password, display_name, company_name, currency, language, theme)
VALUES ('config', '1234', 'Administrateur', 'Mon Entreprise', 'XOF', 'fr', 'light')
ON CONFLICT (id) DO NOTHING;

-- ── Recharge le cache de l'API Supabase (prise en compte immédiate) ──
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- ✅ FIN — Kantara v4.1 prêt !
-- ═══════════════════════════════════════════════════════════
