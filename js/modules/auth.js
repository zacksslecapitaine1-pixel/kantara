// ═══════════════════════════════════════════════
// KANTARA — Authentication (Supabase / Password)
// Creator: simple password
// Followers: access code
// No email, no registration, no Firebase
// ═══════════════════════════════════════════════

const SESSION_KEY = 'kantara_session';

const Auth = {
  _session: null,
  _callbacks: [],

  init(onReady) {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try { this._session = JSON.parse(raw); }
      catch { this._session = null; localStorage.removeItem(SESSION_KEY); }
    }
    if (this._session) {
      AppState.userProfile = {
        uid: this._session.uid,
        displayName: this._session.displayName || 'Administrateur',
        email: this._session.email || '',
        company: this._session.company || '',
        currency: this._session.currency || Prefs.getCurrency() || 'XOF',
        language: this._session.language || i18n.getLang(),
        theme: this._session.theme || 'light',
        notificationsEnabled: true,
        role: this._session.role || 'creator',
        permissions: this._session.permissions || { view: true, edit: true, manage: true },
      };
    }
    this._callbacks.forEach(fn => fn(this._session ? this._buildUser() : null));
    if (onReady) onReady(this._session ? this._buildUser() : null);
  },

  onChange(fn) { this._callbacks.push(fn); },
  getUser() { return this._session ? this._buildUser() : null; },

  _buildUser() {
    if (!this._session) return null;
    return {
      uid: this._session.uid,
      displayName: this._session.displayName || 'Administrateur',
      email: this._session.email || '',
      role: this._session.role || 'creator',
      permissions: this._session.permissions || { view: true, edit: true, manage: true },
    };
  },

  async login({ password }) {
    const settings = await KantaraDB.getSettings();
    // Settings columns are snake_case from Supabase
    const stored = settings.admin_password || '1234';
    if (password !== stored) {
      const err = new Error('Mot de passe incorrect');
      err.code = 'auth/wrong-password';
      throw err;
    }
    const session = {
      uid:         'creator',
      displayName: settings.display_name   || 'Administrateur',
      email:       '',
      company:     settings.company_name   || '',
      currency:    settings.currency       || 'XOF',
      language:    settings.language       || 'fr',
      theme:       settings.theme          || 'light',
      role:        'creator',
      permissions: { view: true, edit: true, manage: true },
    };
    this._saveSession(session);
    return this._buildUser();
  },

  async loginFollower({ code }) {
    const followers = await KantaraDB.getFollowers();
    const follower = followers.find(f => f.access_code === code.trim().toUpperCase() && f.is_active !== false);
    if (!follower) {
      const err = new Error("Code d'accès invalide");
      err.code = 'auth/invalid-code';
      throw err;
    }
    const session = {
      uid: follower.id,
      displayName: follower.name,
      email: '',
      role: 'follower',
      permissions: follower.permissions || { view: true, edit: false, manage: false },
    };
    this._saveSession(session);
    return this._buildUser();
  },

  _saveSession(session) {
    this._session = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    AppState.userProfile = {
      uid: session.uid,
      displayName: session.displayName,
      email: session.email || '',
      company: session.company || '',
      currency: session.currency || 'XOF',
      language: session.language || 'fr',
      theme: session.theme || 'light',
      notificationsEnabled: true,
      role: session.role,
      permissions: session.permissions,
    };
  },

  async logout() {
    this._session = null;
    localStorage.removeItem(SESSION_KEY);
    AppState.userProfile = {};
  },

  async updateProfile(data = {}) {
    if (!this._session) throw new Error('Non connecté');
    if (this._session.role !== 'creator') return; // followers cannot update profile
    // Build snake_case DB update object
    const dbUpdates = {};
    if (data.displayName !== undefined) { dbUpdates.display_name = data.displayName; this._session.displayName = data.displayName; }
    if (data.company     !== undefined) { dbUpdates.company_name = data.company;     this._session.company     = data.company; }
    if (data.currency    !== undefined) { dbUpdates.currency     = data.currency;    this._session.currency    = data.currency; }
    if (data.language    !== undefined) { dbUpdates.language     = data.language; }
    if (data.theme       !== undefined) { dbUpdates.theme        = data.theme; }
    if (Object.keys(dbUpdates).length === 0) return; // nothing to update
    dbUpdates.updated_at = new Date().toISOString();
    await KantaraDB.updateSettings(dbUpdates);
    localStorage.setItem(SESSION_KEY, JSON.stringify(this._session));
    AppState.userProfile = { ...AppState.userProfile, ...data };
  },

  isCreator() { return this._session?.role === 'creator'; },
  canEdit() {
    if (!this._session) return false;
    if (this._session.role === 'creator') return true;
    return !!(this._session.permissions?.edit);
  },
  canManage() {
    if (!this._session) return false;
    return this._session.role === 'creator' || !!(this._session.permissions?.manage);
  },

  setupAuthPage() {
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        langBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        i18n.setLang(btn.dataset.lang);
      });
      if (btn.dataset.lang === i18n.getLang()) btn.classList.add('active');
    });

    const modeBtns = document.querySelectorAll('.auth-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        document.getElementById('creator-section')?.classList.toggle('hidden', mode !== 'creator');
        document.getElementById('follower-section')?.classList.toggle('hidden', mode !== 'follower');
      });
    });

    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
          btn.innerHTML = input.type === 'password'
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
        }
      });
    });

    document.getElementById('creator-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('creator-password')?.value;
      const btn = document.getElementById('creator-submit');
      if (!password) return;
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-auth-loading"><span class="btn-spinner"></span>${i18n.t('loading')}</span>`;
      try {
        await this.login({ password });
        window.location.href = 'app.html';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = i18n.getLang() === 'fr' ? 'Entrer dans le système' : 'Enter system';
        Toast.error(i18n.getLang() === 'fr' ? 'Accès refusé' : 'Access denied',
          i18n.getLang() === 'fr' ? 'Mot de passe incorrect' : 'Wrong password');
        const inp = document.getElementById('creator-password');
        inp?.classList.add('shake');
        setTimeout(() => inp?.classList.remove('shake'), 600);
      }
    });

    document.getElementById('follower-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('follower-code')?.value;
      const btn = document.getElementById('follower-submit');
      if (!code) return;
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-auth-loading"><span class="btn-spinner"></span>${i18n.t('loading')}</span>`;
      try {
        await this.loginFollower({ code });
        window.location.href = 'app.html';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = i18n.getLang() === 'fr' ? 'Accéder' : 'Access';
        Toast.error(i18n.getLang() === 'fr' ? 'Code invalide' : 'Invalid code',
          i18n.getLang() === 'fr' ? "Code d'accès non reconnu" : 'Access code not recognized');
        const inp = document.getElementById('follower-code');
        inp?.classList.add('shake');
        setTimeout(() => inp?.classList.remove('shake'), 600);
      }
    });
  },
};

const AppState = {
  userProfile: {},
  projects: [],
  clients: [],
  suppliers: [],
  expenses: [],
  tasks: [],
  invoices: [],
  _listeners: {},
  emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); },
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
};
