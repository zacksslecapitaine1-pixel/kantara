// ═══════════════════════════════════════════════
// KANTARA — Utility Helpers
// ═══════════════════════════════════════════════

// ════════════════════════════════
// TOAST NOTIFICATIONS
// ════════════════════════════════
const Toast = {
  _container: null,

  init() {
    this._container = document.getElementById('toast-container');
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
  },

  show(type = 'info', title = '', message = '', duration = 4000) {
    if (!this._container) this.init();

    const icons = {
      success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <div class="toast-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    `;

    toast.querySelector('.toast-close').onclick = () => this._remove(toast);
    this._container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this._remove(toast), duration);
    }
    return toast;
  },

  _remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  },

  success(title, msg, dur) { return this.show('success', title, msg, dur); },
  error(title, msg, dur)   { return this.show('error', title, msg, dur); },
  warning(title, msg, dur) { return this.show('warning', title, msg, dur); },
  info(title, msg, dur)    { return this.show('info', title, msg, dur); },
};

// ════════════════════════════════
// MODAL MANAGER
// ════════════════════════════════
const Modal = {
  _stack: [],

  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    requestAnimationFrame(() => el.classList.add('visible'));
    this._stack.push(id);
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close(id);
    }, { once: true });

    // Close on Escape
    const onEsc = (e) => {
      if (e.key === 'Escape') { this.close(id); document.removeEventListener('keydown', onEsc); }
    };
    document.addEventListener('keydown', onEsc);
  },

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('visible');
    setTimeout(() => {
      el.style.display = 'none';
      const idx = this._stack.indexOf(id);
      if (idx > -1) this._stack.splice(idx, 1);
      if (this._stack.length === 0) document.body.style.overflow = '';
    }, 300);
  },

  closeAll() {
    [...this._stack].forEach(id => this.close(id));
  },

  // Confirm dialog
  confirm(options = {}) {
    const {
      title = i18n.t('confirm_delete_title'),
      message = i18n.t('confirm_delete_msg'),
      confirmText = i18n.t('delete'),
      cancelText = i18n.t('cancel'),
      type = 'danger',
      onConfirm = () => {},
    } = options;

    let modal = document.getElementById('confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal modal-sm">
          <div class="modal-header">
            <div>
              <div class="modal-title" id="confirm-modal-title"></div>
              <div class="modal-subtitle" id="confirm-modal-msg"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="confirm-cancel"></button>
            <button class="btn" id="confirm-ok"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector('#confirm-modal-title').textContent = title;
    modal.querySelector('#confirm-modal-msg').textContent = message;
    const cancelBtn = modal.querySelector('#confirm-cancel');
    const okBtn = modal.querySelector('#confirm-ok');
    cancelBtn.textContent = cancelText;
    okBtn.textContent = confirmText;
    okBtn.className = `btn btn-${type}`;

    cancelBtn.onclick = () => this.close('confirm-modal');
    okBtn.onclick = () => { this.close('confirm-modal'); onConfirm(); };

    this.open('confirm-modal');
  }
};

// ════════════════════════════════
// SAVE INDICATOR
// ════════════════════════════════
const SaveManager = {
  _unsaved: false,
  _saveBtn: null,
  _indicator: null,
  _onSave: null,

  init(onSave) {
    this._onSave = onSave;
    this._saveBtn = document.getElementById('save-btn');
    this._indicator = document.getElementById('save-indicator');

    // Only bind click once
    if (this._saveBtn && !this._saveBtn._bound) {
      this._saveBtn._bound = true;
      this._saveBtn.addEventListener('click', () => this.save());
    }

    // Warn before leaving page with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this._unsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  markUnsaved() {
    this._unsaved = true;
    if (this._saveBtn) this._saveBtn.classList.add('unsaved');
    if (this._indicator) {
      this._indicator.className = 'save-indicator unsaved';
      this._indicator.innerHTML = `
        <span class="save-dot"></span>
        <span>${i18n.t('unsaved_changes')}</span>
      `;
    }
  },

  async save() {
    if (!this._onSave) return;
    if (this._saveBtn) {
      this._saveBtn.disabled = true;
      this._saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 12l2 2 4-4"/></svg>
        ${i18n.t('saving')}
      `;
    }

    try {
      await this._onSave();
      this.markSaved();
      Toast.success(i18n.t('saved'), i18n.t('success_saved'));
    } catch (err) {
      Toast.error(i18n.t('error_generic'), err.message);
      if (this._saveBtn) {
        this._saveBtn.disabled = false;
        this._saveBtn.classList.add('unsaved');
      }
    }
  },

  markSaved() {
    this._unsaved = false;
    if (this._saveBtn) {
      this._saveBtn.disabled = false;
      this._saveBtn.classList.remove('unsaved');
      this._saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        ${i18n.t('save')}
      `;
    }
    if (this._indicator) {
      this._indicator.className = 'save-indicator saved';
      this._indicator.innerHTML = `
        <span class="save-dot"></span>
        <span>${i18n.t('saved')}</span>
      `;
      setTimeout(() => {
        if (this._indicator) this._indicator.innerHTML = '';
      }, 3000);
    }
  }
};

// ════════════════════════════════
// FORMATTERS
// ════════════════════════════════
// safeDate: converts any date value (ISO string, Timestamp, Date) to Date
function safeDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

const Format = {
  currency(amount, currency = 'XOF', locale = null) {
    const loc = locale || (i18n.getLang() === 'fr' ? 'fr-FR' : 'en-US');
    try {
      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount || 0);
    } catch {
      return `${currency} ${(amount || 0).toLocaleString()}`;
    }
  },

  number(n) {
    return (n || 0).toLocaleString(i18n.getLang() === 'fr' ? 'fr-FR' : 'en-US');
  },

  date(d, opts = {}) {
    if (!d) return '—';
    const date = d?.toDate ? d.toDate() : new Date(d);
    const locale = i18n.getLang() === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', ...opts });
  },

  dateInput(d) {
    if (!d) return '';
    const date = d?.toDate ? d.toDate() : new Date(d);
    return date.toISOString().split('T')[0];
  },

  timeAgo(d) {
    if (!d) return '';
    const date = d?.toDate ? d.toDate() : new Date(d);
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    const lang = i18n.getLang();

    if (min < 1)  return lang === 'fr' ? "À l'instant" : 'Just now';
    if (min < 60) return lang === 'fr' ? `il y a ${min} min` : `${min} min ago`;
    if (hr < 24)  return lang === 'fr' ? `il y a ${hr}h` : `${hr}h ago`;
    if (day < 7)  return lang === 'fr' ? `il y a ${day}j` : `${day}d ago`;
    return this.date(d);
  },

  percent(value, total) {
    if (!total) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
  },

  initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  },

  truncate(str = '', maxLen = 40) {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  },

  fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
};

// ════════════════════════════════
// VALIDATORS
// ════════════════════════════════
const Validate = {
  email(v)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  required(v) { return v !== null && v !== undefined && String(v).trim() !== ''; },
  minLen(v, n){ return String(v || '').trim().length >= n; },
  positive(v) { return parseFloat(v) > 0; },

  form(fields) {
    // fields: [{ value, rules: ['required', 'email', ...], errorEl }]
    let valid = true;
    fields.forEach(({ value, rules = [], errorEl, label }) => {
      let msg = '';
      for (const rule of rules) {
        if (rule === 'required' && !this.required(value)) { msg = i18n.t('error_required'); break; }
        if (rule === 'email' && value && !this.email(value)) { msg = i18n.t('error_email_invalid'); break; }
        if (rule === 'password' && !this.minLen(value, 6)) { msg = i18n.t('error_password_short'); break; }
        if (rule === 'positive' && !this.positive(value)) { msg = i18n.t('error_required'); break; }
      }
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.previousElementSibling?.classList.toggle('error', !!msg);
      }
      if (msg) valid = false;
    });
    return valid;
  }
};

// ════════════════════════════════
// DEBOUNCE / THROTTLE
// ════════════════════════════════
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

// ════════════════════════════════
// ROUTER (SPA — hash-based)
// ════════════════════════════════
const Router = {
  _routes: {},
  _current: null,
  _notFound: null,

  register(path, handler) {
    this._routes[path] = handler;
    return this;
  },

  notFound(handler) {
    this._notFound = handler;
    return this;
  },

  // Navigate via hash (consistent with App._navigate)
  navigate(path) {
    window.location.hash = path;
    this._dispatch(path);
  },

  _dispatch(path) {
    const handler = this._routes[path];
    if (handler) {
      this._current = path;
      handler(path);
      this._updateNav(path);
    } else if (this._notFound) {
      this._notFound(path);
    }
  },

  _updateNav(path) {
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
  },

  // BUG #3 FIX: init() now listens to hashchange for browser Back/Forward support
  init() {
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.replace('#', '') || '/dashboard';
      this._dispatch(path);
    });
    // Dispatch current hash on load
    const startPath = window.location.hash.replace('#', '') || '/dashboard';
    this._dispatch(startPath);
  },

  getCurrent() { return this._current; }
};

// ════════════════════════════════
// LOCAL JOURNAL (Activity Log)
// ════════════════════════════════
const Journal = {
  async log(action, details = {}) {
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    if (!user) return;
    try {
      await userCol(Collections.JOURNAL).add({
        action,
        details,
        createdAt: now(),
        uid: user.uid,
      });
    } catch (e) {
      // Non-blocking — journal errors must never break the UI
    }
  }
};

// ════════════════════════════════
// USER PREFERENCES
// ════════════════════════════════
const Prefs = {
  _data: {},

  load() {
    try {
      this._data = JSON.parse(localStorage.getItem('kantara_prefs') || '{}');
    } catch { this._data = {}; }
    return this;
  },

  get(key, fallback = null) {
    return this._data[key] ?? fallback;
  },

  set(key, value) {
    this._data[key] = value;
    localStorage.setItem('kantara_prefs', JSON.stringify(this._data));
    return this;
  },

  applyTheme() {
    const theme = this.get('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);
  },

  getCurrency() {
    return this.get('currency', 'XOF');
  }
};

// ════════════════════════════════
// GENERATE UNIQUE ID / NUMBER
// ════════════════════════════════
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateDocNumber(prefix, count) {
  const year = new Date().getFullYear();
  const num = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${num}`;
}

// ════════════════════════════════
// IMAGE COMPRESSION
// ════════════════════════════════
async function compressImage(file, maxWidthPx = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ════════════════════════════════
// ICON HELPERS (global — used across all modules)
// ════════════════════════════════
function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}

function deleteIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
}

// ════════════════════════════════
// SIDEBAR TOGGLE
// ════════════════════════════════
const SidebarManager = {
  _sidebar: null,
  _mainContent: null,
  _collapsed: false,

  init() {
    this._sidebar = document.getElementById('sidebar');
    this._mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');

    this._collapsed = localStorage.getItem('kantara_sidebar') === 'collapsed';
    if (this._collapsed) this._apply(true);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-nav-overlay');

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        this._sidebar?.classList.toggle('mobile-open');
        overlay?.style && (overlay.style.display = this._sidebar?.classList.contains('mobile-open') ? 'block' : 'none');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        this._sidebar?.classList.remove('mobile-open');
        overlay.style.display = 'none';
      });
    }
  },

  toggle() {
    this._collapsed = !this._collapsed;
    this._apply(this._collapsed);
    localStorage.setItem('kantara_sidebar', this._collapsed ? 'collapsed' : 'expanded');
  },

  open() {
    this._sidebar?.classList.add('mobile-open');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (overlay) overlay.style.display = 'block';
  },

  close() {
    this._sidebar?.classList.remove('mobile-open');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  _apply(collapsed) {
    this._sidebar?.classList.toggle('collapsed', collapsed);
    this._mainContent?.classList.toggle('sidebar-collapsed', collapsed);
  }
};

// ════════════════════════════════════════════════
// ACTIVITY LOG — Journal d'activité en mémoire
// (persiste en localStorage pour la session)
// ════════════════════════════════════════════════
const ActivityLog = {
  _KEY: 'kantara_activity_log',
  _MAX: 100,

  _load() {
    try { return JSON.parse(localStorage.getItem(this._KEY) || '[]'); }
    catch { return []; }
  },

  _save(logs) {
    try { localStorage.setItem(this._KEY, JSON.stringify(logs.slice(0, this._MAX))); }
    catch {}
  },

  add(type, message) {
    const logs = this._load();
    logs.unshift({ type, message, ts: new Date().toISOString() });
    this._save(logs);
  },

  get() { return this._load(); },

  clear() { localStorage.removeItem(this._KEY); },
};

// ════════════════════════════════════════════════
// GLOBAL SEARCH — Recherche universelle
// ════════════════════════════════════════════════
const GlobalSearch = {
  _cache: {},

  async search(query) {
    if (!query || query.length < 2) return {};
    const q = query.toLowerCase();
    const results = {};

    try {
      // Search projects
      const projSnap = await userCol(Collections.PROJECTS).get().catch(() => null);
      if (projSnap) {
        results.projects = projSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
          .slice(0, 4);
      }

      // Search tasks
      const taskSnap = await userCol(Collections.TASKS).get().catch(() => null);
      if (taskSnap) {
        results.tasks = taskSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.title?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
          .slice(0, 4);
      }

      // Search clients
      const clientSnap = await userCol(Collections.CLIENTS).get().catch(() => null);
      if (clientSnap) {
        results.clients = clientSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
          .slice(0, 3);
      }
    } catch(e) { console.warn('GlobalSearch error:', e); }

    return results;
  },

  renderDropdown(results, onNavigate) {
    const L     = i18n.getLang();
    const icons = {
      projects: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
      tasks:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
      clients:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    };
    const labels = {
      projects: L==='fr'?'Projets':'Projects',
      tasks:    L==='fr'?'Tâches':'Tasks',
      clients:  L==='fr'?'Clients':'Clients',
    };
    const pages = { projects:'/projects', tasks:'/tasks', clients:'/clients' };

    let html = '';
    let total = 0;
    for (const [type, items] of Object.entries(results)) {
      if (!items?.length) continue;
      total += items.length;
      html += `<div class="search-result-group">
        <div class="search-result-group-title">${labels[type]||type}</div>
        ${items.map(item => `
          <div class="search-result-item" data-page="${pages[type]}" data-id="${item.id}">
            <div class="search-result-icon">${icons[type]||'📄'}</div>
            <div class="search-result-text">
              <div class="search-result-title">${escapeHtml(item.name||item.title||'—')}</div>
              <div class="search-result-sub">${escapeHtml(item.email||item.status||item.description||'')} </div>
            </div>
          </div>`).join('')}
      </div>`;
    }
    if (!total) html = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.82rem">${L==='fr'?'Aucun résultat':'No results'}</div>`;
    return html;
  }
};
