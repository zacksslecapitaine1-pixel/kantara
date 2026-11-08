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
  paymentMethod:        'payment_method',
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

// ─── Écriture résiliente ──────────────────────────────────
// Si la base n'a pas encore toutes les colonnes attendues (SQL de mise à jour pas encore
// exécuté), PostgREST renvoie « Could not find the 'x' column ». Avant, la création
// échouait complètement. Maintenant on retire la colonne inconnue et on réessaie : la
// création fonctionne, et on prévient l'utilisateur de lancer le SQL de mise à jour.
const _missingColumns = new Set();
let _missingWarned = false;

function _extractMissingColumn(error) {
  const msg = (error && error.message) || '';
  let m = msg.match(/Could not find the '([^']+)' column/i);      // PostgREST (PGRST204)
  if (!m) m = msg.match(/column "([^"]+)" of relation/i);          // Postgres (42703)
  return m ? m[1] : null;
}

function _friendlyDbError(error) {
  const msg = (error && error.message) || 'Erreur base de données';
  if (error?.code === '42P01' || /relation .* does not exist/i.test(msg))
    return 'Table introuvable : exécutez le SQL d\'initialisation dans Supabase (SQL Editor).';
  if (error?.code === '42501' || /permission denied|row-level security/i.test(msg))
    return 'Accès refusé par Supabase : exécutez le SQL d\'initialisation (il désactive la RLS des tables).';
  if (error?.code === '23505')
    return 'Cet élément existe déjà (valeur en double).';
  if (error?.code === '23502')
    return 'Un champ obligatoire est vide : ' + msg;
  return msg;
}

async function _writeResilient(table, row, run) {
  const payload = { ...row };
  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await run(payload);
    if (!error) {
      if (_missingColumns.size && !_missingWarned && typeof Toast !== 'undefined') {
        _missingWarned = true;
        Toast.warning(
          'Base de données à mettre à jour',
          'Enregistré, mais certaines colonnes manquent (' + [..._missingColumns].join(', ') +
          '). Copiez le SQL de mise à jour (Paramètres → Base de données) et exécutez-le dans Supabase.',
          12000
        );
      }
      return;
    }
    const col = _extractMissingColumn(error);
    if (col && col in payload && col !== 'id') {
      delete payload[col];
      _missingColumns.add(table + '.' + col);
      console.warn('[Kantara] Colonne absente ' + table + '.' + col + ' — ignorée. Exécutez le SQL de mise à jour.');
      continue;
    }
    throw new Error(_friendlyDbError(error));
  }
  throw new Error('Enregistrement impossible : trop de colonnes manquantes. Exécutez le SQL de mise à jour dans Supabase.');
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
    await _writeResilient(this._table, serializeData(updates),
      (p) => getClient().from(this._table).update(p).eq('id', this._id));
  }

  async delete() {
    const { error } = await getClient().from(this._table).delete().eq('id', this._id);
    if (error) throw new Error(error.message);
  }

  async set(data) {
    const row = { ...serializeData(data), id: this._id };
    await _writeResilient(this._table, row,
      (p) => getClient().from(this._table).upsert(p));
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
    await _writeResilient(this._table, row,
      (p) => getClient().from(this._table).insert(p));
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

// ─── SQL d'initialisation / mise à jour v4.1 ─────────────
// Non destructif (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS) : réexécutable sans perdre de données.
// Affiché à l'étape 1 du wizard et copiable depuis Paramètres → Base de données.
const KANTARA_INIT_SQL = `-- ═══════════════════════════════════════════════════════════
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
-- ═══════════════════════════════════════════════════════════`;

