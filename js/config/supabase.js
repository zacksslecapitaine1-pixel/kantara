// ═══════════════════════════════════════════════════════════
// KANTARA — Supabase Engine v3
// Remplace Firebase totalement.
// Fournit une API compatible Firestore (userCol, db, etc.)
// ═══════════════════════════════════════════════════════════

// ─── Client Supabase global ───────────────────────────────
let _supabaseClient = null;

function getClient() {
  if (!_supabaseClient) {
    throw new Error('Supabase non initialisé. Configurez la connexion d\'abord.');
  }
  return _supabaseClient;
}

// ─── Initialise Supabase depuis les clés utilisateur ──────
function initSupabase(config) {
  const { url, anonKey } = config;
  if (!url || !anonKey) throw new Error('URL et clé Supabase requis');
  if (typeof supabase === 'undefined') {
    throw new Error('Bibliothèque Supabase non chargée. Vérifiez votre connexion internet.');
  }
  _supabaseClient = supabase.createClient(url, anonKey);
  window._supabase = _supabaseClient;
  return _supabaseClient;
}

// ─── Collections (noms Firestore → tables Supabase) ───────
const Collections = {
  USERS:         'users',
  PROJECTS:      'projects',
  TASKS:         'tasks',
  EXPENSES:      'expenses',
  CLIENTS:       'clients',
  SUPPLIERS:     'suppliers',
  QUOTES:        'quotes',
  INVOICES:      'invoices',
  PAYMENTS:      'payments',
  PROOFS:        'proofs',
  JOURNAL:       'journal',
  NOTIFICATIONS: 'notifications',
  // v4 new
  TEAM_MEMBERS:  'team_members',
  MILESTONES:    'milestones',
  SUBTASKS:      'subtasks',
  DOCUMENTS:     'documents',
};

// ─── Mapping tables ────────────────────────────────────────
const TABLE_MAP = {
  users:         'settings',
  projects:      'projects',
  tasks:         'tasks',
  expenses:      'expenses',
  clients:       'clients',
  suppliers:     'suppliers',
  quotes:        'quotes',
  invoices:      'invoices',
  payments:      'payments',
  proofs:        'proofs',
  journal:       'notifications',
  notifications: 'notifications',
  // v4 new
  team_members:  'team_members',
  milestones:    'milestones',
  subtasks:      'subtasks',
  documents:     'documents',
};

// ─── Mapping camelCase JS ↔ snake_case PostgreSQL ─────────
const FIELD_MAP = {
  // communs
  createdAt:            'created_at',
  updatedAt:            'updated_at',
  // projets
  clientId:             'client_id',
  projectId:            'project_id',
  startDate:            'start_date',
  endDate:              'end_date',
  // tâches
  dueDate:              'due_date',
  timeEstimate:         'time_estimate',
  assigneeId:           'assignee_id',
  isRecurring:          'is_recurring',
  recurringPeriod:      'recurring_period',
  // dépenses
  supplierId:           'supplier_id',
  receiptUrl:           'receipt_url',
  // factures / devis
  quoteId:              'quote_id',
  invoiceId:            'invoice_id',
  // preuves
  fileName:             'file_name',
  linkType:             'link_type',
  linkId:               'link_id',
  // paiements
  // observateurs
  accessCode:           'access_code',
  isActive:             'is_active',
  // paramètres
  adminPassword:        'admin_password',
  companyName:          'company_name',
  displayName:          'display_name',
  notificationsEnabled: 'notifications_enabled',
  // team v4
  avatarColor:          'avatar_color',
  performanceScore:     'performance_score',
  // documents v4
  taskId:               'task_id',
  // milestones v4
  healthScore:          'health_score',
};

const FIELD_MAP_REVERSE = {};
for (const [k, v] of Object.entries(FIELD_MAP)) FIELD_MAP_REVERSE[v] = k;

function toSnake(key)  { return FIELD_MAP[key]         || key; }
function toCamel(key)  { return FIELD_MAP_REVERSE[key] || key; }

// ─── Sérialisation valeurs ─────────────────────────────────
function now() { return new Date().toISOString(); }

const Timestamp = {
  fromDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    return { _iso: date.toISOString(), toDate: () => date, seconds: Math.floor(date.getTime() / 1000) };
  },
  now() {
    const d = new Date();
    return { _iso: d.toISOString(), toDate: () => d, seconds: Math.floor(d.getTime() / 1000) };
  },
};

const FieldValue = {
  serverTimestamp: () => now(),
  increment:       (n) => n,
  arrayUnion:      (...vals) => vals,
  arrayRemove:     () => [],
};

function serializeValue(v) {
  if (v === null || v === undefined)           return null;
  if (Array.isArray(v))                        return JSON.stringify(v);
  if (v && typeof v === 'object' && v._iso)    return v._iso;
  if (v instanceof Date)                       return v.toISOString();
  return v;
}

function serializeData(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[toSnake(k)] = serializeValue(v);
  }
  return out;
}

function deserializeRow(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = toCamel(k);
    if (typeof v === 'string') {
      const t = v.trim();
      if ((t.startsWith('[') || t.startsWith('{')) && (t.endsWith(']') || t.endsWith('}'))) {
        try { out[camelKey] = JSON.parse(t); continue; } catch {}
      }
    }
    out[camelKey] = v;
  }
  return out;
}

// ─── generateId ───────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── DocRef ───────────────────────────────────────────────
class DocRef {
  constructor(table, id) { this._table = table; this._id = id; }

  async get() {
    const { data, error } = await getClient()
      .from(this._table).select('*').eq('id', this._id).single();
    if (error || !data) return { exists: false, id: this._id, data: () => null };
    return { exists: true, id: data.id, data: () => deserializeRow(data), ref: this };
  }

  async update(updates) {
    const { error } = await getClient()
      .from(this._table).update(serializeData(updates)).eq('id', this._id);
    if (error) throw new Error(error.message);
  }

  async delete() {
    const { error } = await getClient().from(this._table).delete().eq('id', this._id);
    if (error) throw new Error(error.message);
  }

  async set(data) {
    const row = { ...serializeData(data), id: this._id };
    const { error } = await getClient().from(this._table).upsert(row);
    if (error) throw new Error(error.message);
  }

  collection(subCol) {
    return new CollectionRef(TABLE_MAP[subCol] || subCol);
  }
}

// ─── QueryRef ─────────────────────────────────────────────
class QueryRef {
  constructor(table) {
    this._table   = table;
    this._filters = [];
    this._order   = null;
    this._orderDir = 'asc';
    this._limitN  = null;
  }

  where(field, op, value) {
    const clone = Object.assign(Object.create(QueryRef.prototype), this,
      { _filters: [...this._filters, { field: toSnake(field), op, value }] });
    return clone;
  }

  orderBy(field, dir = 'asc') {
    return Object.assign(Object.create(QueryRef.prototype), this,
      { _order: toSnake(field), _orderDir: dir });
  }

  limit(n) {
    return Object.assign(Object.create(QueryRef.prototype), this, { _limitN: n });
  }

  async get() {
    let q = getClient().from(this._table).select('*');
    for (const f of this._filters) {
      if      (f.op === '==' || f.op === '=')  q = q.eq(f.field,  f.value);
      else if (f.op === '!=' || f.op === '<>') q = q.neq(f.field, f.value);
      else if (f.op === '>')                   q = q.gt(f.field,  f.value);
      else if (f.op === '<')                   q = q.lt(f.field,  f.value);
      else if (f.op === '>=')                  q = q.gte(f.field, f.value);
      else if (f.op === '<=')                  q = q.lte(f.field, f.value);
    }
    if (this._order) q = q.order(this._order, { ascending: this._orderDir !== 'desc' });
    if (this._limitN) q = q.limit(this._limitN);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const docs = (data || []).map(row => ({
      id:     row.id,
      data:   () => deserializeRow(row),
      exists: true,
      ref:    new DocRef(this._table, row.id),
    }));
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
}

// ─── CollectionRef ────────────────────────────────────────
class CollectionRef {
  constructor(table) { this._table = table; }

  async get() {
    const { data, error } = await getClient().from(this._table).select('*');
    if (error) throw new Error(error.message);
    const docs = (data || []).map(row => ({
      id:     row.id,
      data:   () => deserializeRow(row),
      exists: true,
      ref:    new DocRef(this._table, row.id),
    }));
    return { docs, size: docs.length, empty: docs.length === 0 };
  }

  async add(data) {
    const id  = crypto.randomUUID ? crypto.randomUUID() : generateId();
    const row = { ...serializeData(data), id };
    const { error } = await getClient().from(this._table).insert(row);
    if (error) throw new Error(error.message);
    return { id };
  }

  doc(id)                    { return new DocRef(this._table, id); }
  where(field, op, value)    { return new QueryRef(this._table).where(field, op, value); }
  orderBy(field, dir = 'asc'){ return new QueryRef(this._table).orderBy(field, dir); }
}

// ─── userCol() — point d'entrée principal ─────────────────
function userCol(collection) {
  return new CollectionRef(TABLE_MAP[collection] || collection);
}

// ─── db (compatibilité Firestore) ─────────────────────────
const db = {
  collection(name) {
    const table = TABLE_MAP[name] || name;
    return {
      doc(uid) {
        return {
          async get()         { return new DocRef('settings', 'config').get(); },
          async update(data)  { return new DocRef('settings', 'config').update(data); },
          async set(data)     { return new DocRef('settings', 'config').set(data); },
          collection(subCol)  { return new CollectionRef(TABLE_MAP[subCol] || subCol); },
        };
      }
    };
  },
  batch() {
    const ops = [];
    return {
      update(docRef, data) { ops.push({ type: 'update', ref: docRef, data }); },
      delete(docRef)       { ops.push({ type: 'delete', ref: docRef }); },
      async commit() {
        for (const op of ops) {
          if (op.type === 'update') await op.ref.update(op.data).catch(console.warn);
          if (op.type === 'delete') await op.ref.delete().catch(console.warn);
        }
      }
    };
  },
};

// ─── Storage shim (base64 in DB) ──────────────────────────
const storage = {
  ref(path) {
    let _dataUrl = null;
    return {
      async put(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = (e) => { _dataUrl = e.target.result; resolve(this); };
          reader.onerror = () => reject(new Error('Erreur lecture fichier'));
          reader.readAsDataURL(file);
        });
      },
      async getDownloadURL() { return _dataUrl; },
    };
  }
};

// ─── KantaraDB — helpers settings & followers ─────────────
const KantaraDB = {
  async getSettings() {
    const { data, error } = await getClient()
      .from('settings').select('*').eq('id', 'config').single();
    if (error || !data) return { admin_password: '1234', display_name: 'Administrateur' };
    return data;
  },

  async updateSettings(updates) {
    const row = { ...serializeData(updates), updated_at: new Date().toISOString() };
    // Also accept snake_case keys directly
    for (const [k, v] of Object.entries(updates)) {
      if (k.includes('_')) row[k] = serializeValue(v);
    }
    const { error } = await getClient()
      .from('settings').update(row).eq('id', 'config');
    if (error) throw new Error(error.message);
  },

  async setAdminPassword(password) {
    const { error } = await getClient()
      .from('settings')
      .update({ admin_password: password, updated_at: new Date().toISOString() })
      .eq('id', 'config');
    if (error) throw new Error(error.message);
  },

  async getFollowers() {
    const { data, error } = await getClient()
      .from('followers').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(f => ({
      id:          f.id,
      name:        f.name,
      access_code: f.access_code,
      is_active:   f.is_active !== false,
      created_at:  f.created_at,
      permissions: typeof f.permissions === 'string'
        ? (() => { try { return JSON.parse(f.permissions); } catch { return { view: true, edit: false, manage: false }; } })()
        : (f.permissions || { view: true, edit: false, manage: false }),
    }));
  },

  async addFollower({ name, access_code, permissions, is_active = true }) {
    const id  = crypto.randomUUID ? crypto.randomUUID() : generateId();
    const row = {
      id,
      name,
      access_code,
      permissions: JSON.stringify(permissions || { view: true, edit: false, manage: false }),
      is_active,
      created_at: new Date().toISOString(),
    };
    const { error } = await getClient().from('followers').insert(row);
    if (error) throw new Error(error.message);
    return id;
  },

  async updateFollower(id, updates) {
    const row = {};
    if (updates.name        !== undefined) row.name        = updates.name;
    if (updates.access_code !== undefined) row.access_code = updates.access_code;
    if (updates.is_active   !== undefined) row.is_active   = updates.is_active;
    if (updates.permissions !== undefined) {
      row.permissions = typeof updates.permissions === 'string'
        ? updates.permissions : JSON.stringify(updates.permissions);
    }
    const { error } = await getClient().from('followers').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteFollower(id) {
    const { error } = await getClient().from('followers').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── SQL d'initialisation COMPLET v4 ──────────────────────
// Affiché à l'étape 2 du wizard de configuration
// Contient TOUTES les tables (v3 + v4 nouvelles)
const KANTARA_INIT_SQL = `-- ═══════════════════════════════════════════════════════════
-- KANTARA v4 — SQL D'INITIALISATION COMPLET
-- Copiez TOUT ce bloc dans Supabase > SQL Editor > Run
-- ═══════════════════════════════════════════════════════════

-- ── Suppression des tables existantes ─────────────────────
DROP TABLE IF EXISTS documents        CASCADE;
DROP TABLE IF EXISTS subtasks         CASCADE;
DROP TABLE IF EXISTS milestones       CASCADE;
DROP TABLE IF EXISTS team_members     CASCADE;
DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS proofs           CASCADE;
DROP TABLE IF EXISTS payments         CASCADE;
DROP TABLE IF EXISTS invoices         CASCADE;
DROP TABLE IF EXISTS quotes           CASCADE;
DROP TABLE IF EXISTS expenses         CASCADE;
DROP TABLE IF EXISTS tasks            CASCADE;
DROP TABLE IF EXISTS suppliers        CASCADE;
DROP TABLE IF EXISTS clients          CASCADE;
DROP TABLE IF EXISTS projects         CASCADE;
DROP TABLE IF EXISTS followers        CASCADE;
DROP TABLE IF EXISTS settings         CASCADE;

-- ── TABLE : settings ──────────────────────────────────────
CREATE TABLE settings (
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
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ── TABLE : followers ─────────────────────────────────────
CREATE TABLE followers (
  id          TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name        TEXT        NOT NULL,
  access_code TEXT        UNIQUE NOT NULL,
  permissions TEXT        NOT NULL DEFAULT '{"view":true,"edit":false,"manage":false}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;

-- ── TABLE : projects ──────────────────────────────────────
CREATE TABLE projects (
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
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- ── TABLE : tasks ─────────────────────────────────────────
CREATE TABLE tasks (
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
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- ── TABLE : clients ───────────────────────────────────────
CREATE TABLE clients (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL DEFAULT '',
  phone      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  company    TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- ── TABLE : suppliers ─────────────────────────────────────
CREATE TABLE suppliers (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL DEFAULT '',
  phone      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  category   TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- ── TABLE : expenses ──────────────────────────────────────
CREATE TABLE expenses (
  id          TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title       TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL DEFAULT 0,
  category    TEXT        NOT NULL DEFAULT '',
  project_id  TEXT,
  supplier_id TEXT,
  date        TEXT,
  notes       TEXT        NOT NULL DEFAULT '',
  receipt_url TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- ── TABLE : quotes ────────────────────────────────────────
CREATE TABLE quotes (
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
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

-- ── TABLE : invoices ──────────────────────────────────────
CREATE TABLE invoices (
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
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- ── TABLE : payments ──────────────────────────────────────
CREATE TABLE payments (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  invoice_id TEXT,
  amount     NUMERIC     NOT NULL DEFAULT 0,
  date       TEXT,
  method     TEXT        NOT NULL DEFAULT 'cash',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- ── TABLE : proofs ────────────────────────────────────────
CREATE TABLE proofs (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  url        TEXT        NOT NULL DEFAULT '',
  file_name  TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'other',
  notes      TEXT        NOT NULL DEFAULT '',
  link_type  TEXT,
  link_id    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE proofs DISABLE ROW LEVEL SECURITY;

-- ── TABLE : notifications ─────────────────────────────────
CREATE TABLE notifications (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  title      TEXT,
  message    TEXT,
  type       TEXT        NOT NULL DEFAULT 'info',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════
-- NOUVELLES TABLES v4
-- ═══════════════════════════════════════════════

-- ── TABLE : team_members ──────────────────────
CREATE TABLE team_members (
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
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- ── TABLE : milestones ────────────────────────
CREATE TABLE milestones (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  project_id TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  date       TEXT,
  done       BOOLEAN     NOT NULL DEFAULT false,
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;

-- ── TABLE : subtasks ──────────────────────────
CREATE TABLE subtasks (
  id         TEXT        PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  task_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;

-- ── TABLE : documents ─────────────────────────
CREATE TABLE documents (
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
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- ── Données initiales ──────────────────────────
INSERT INTO settings (id, admin_password, display_name, company_name, currency, language, theme)
VALUES ('config', '1234', 'Administrateur', 'Mon Entreprise', 'XOF', 'fr', 'light')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- ✅ FIN — Kantara v4 prêt !
-- ═══════════════════════════════════════════════`;

