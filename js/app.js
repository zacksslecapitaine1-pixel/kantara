// ═══════════════════════════════════════════════
// KANTARA — Main App Bootstrap & Router
// Supabase + Password Auth Edition
// ═══════════════════════════════════════════════

const App = {

  // Module registry — direct references (window[] lookup is unreliable for const)
  _modules: {},

  _registerModules() {
    // These are defined as consts in their files - register them explicitly
    const mods = { Dashboard, Projects, Tasks, Clients, Suppliers, Expenses, Quotes, Invoices, Proofs, Reports, Settings, NotifPage, Team, Documents };
    for (const [name, mod] of Object.entries(mods)) {
      if (mod) this._modules[name] = mod;
    }
  },

  _pages: {
    '/dashboard':     { panel: 'panel-dashboard',     title: 'nav_dashboard',     module: 'Dashboard'   },
    '/projects':      { panel: 'panel-projects',      title: 'nav_projects',      module: 'Projects'    },
    '/tasks':         { panel: 'panel-tasks',         title: 'nav_tasks',         module: 'Tasks'       },
    '/clients':       { panel: 'panel-clients',       title: 'nav_clients',       module: 'Clients'     },
    '/suppliers':     { panel: 'panel-suppliers',     title: 'nav_suppliers',     module: 'Suppliers'   },
    '/expenses':      { panel: 'panel-expenses',      title: 'nav_expenses',      module: 'Expenses'    },
    '/quotes':        { panel: 'panel-quotes',        title: 'nav_quotes',        module: 'Quotes'      },
    '/invoices':      { panel: 'panel-invoices',      title: 'nav_invoices',      module: 'Invoices'    },
    '/proofs':        { panel: 'panel-proofs',        title: 'nav_proofs',        module: 'Proofs'      },
    '/reports':       { panel: 'panel-reports',       title: 'nav_reports',       module: 'Reports'     },
    '/settings':      { panel: 'panel-settings',      title: 'nav_settings',      module: 'Settings'    },
    '/notifications': { panel: 'panel-notifications', title: 'nav_notifications', module: 'NotifPage'   },
    '/team':          { panel: 'panel-team',          title: 'nav_team',          module: 'Team'        },
    '/documents':     { panel: 'panel-documents',     title: 'nav_documents',     module: 'Documents'   },
  },
  _initialized: new Set(),
  _currentPath: '/dashboard',

  async boot() {
    Prefs.load().applyTheme();
    i18n.init();
    Toast.init();

    // Init Supabase from stored config
    const cfg = SetupWizard.getConfig();
    if (!cfg.url || !cfg.anonKey) {
      window.location.href = 'index.html';
      return;
    }
    try { initSupabase(cfg); } catch (e) { window.location.href = 'index.html'; return; }

    // Check auth session
    Auth.init(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      // Apply theme from user profile
      const theme = AppState.userProfile?.theme || Prefs.get('theme') || 'light';
      if (theme !== Prefs.get('theme')) {
        Prefs.set('theme', theme).applyTheme();
      }
      const lang = AppState.userProfile?.language || i18n.getLang();
      if (lang !== i18n.getLang()) i18n.setLang(lang);

      this._registerModules();
      this._setupUser(user);
      this._setupSidebar(user);
      this._setupTopbar();
      this._setupThemeToggle();
      this._setupNotifPanel();
      this._setupSaveBtn();
      this._setupSidebarToggle();
      this._setupGlobalSearch();
      this._applyPermissions(user);
      this._setupFAB();
      this._initRouter();
      Notifications.loadCount();

      setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) { loader.classList.add('hide'); setTimeout(() => loader.remove(), 400); }
        if (window.innerWidth <= 768) {
          const mobileBtn = document.getElementById('mobile-menu-btn');
          if (mobileBtn) mobileBtn.style.display = 'flex';
        }
      }, 900);
    });
  },

  _setupUser(user) {
    const avatar   = document.getElementById('sidebar-avatar');
    const username = document.getElementById('sidebar-username');
    const email    = document.getElementById('sidebar-email');
    const roleBadge = document.getElementById('sidebar-role-badge');

    const name = user.displayName || 'Utilisateur';
    if (avatar) avatar.textContent = Format.initials(name);
    if (username) username.textContent = name;
    if (email) email.textContent = user.role === 'creator' ? 'Administrateur' : 'Observateur';
    if (roleBadge) {
      roleBadge.textContent = user.role === 'creator' ? 'Admin' : 'Observer';
      roleBadge.className = `sidebar-role-badge ${user.role === 'creator' ? 'role-admin' : 'role-follower'}`;
    }
  },

  _applyPermissions(user) {
    // Hide write actions for followers who can't edit
    if (!Auth.canEdit()) {
      document.querySelectorAll('[data-requires-edit]').forEach(el => el.style.display = 'none');
    }
    if (!Auth.canManage()) {
      document.querySelectorAll('[data-requires-manage]').forEach(el => el.style.display = 'none');
    }
    if (!Auth.isCreator()) {
      // Hide settings link for non-creators
      const settingsLink = document.querySelector('[data-page="/settings"]');
      if (settingsLink) settingsLink.parentElement?.classList.add('hidden');
    }
  },

  _setupSidebar(user) {
    SidebarManager.init();

    const userBtn  = document.getElementById('sidebar-user-btn');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    userBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown?.classList.add('hidden'));

    logoutBtn?.addEventListener('click', () => {
      Modal.confirm({
        title: i18n.t('confirm_logout_title') || 'Déconnexion',
        message: i18n.t('confirm_logout_msg') || 'Voulez-vous vraiment vous déconnecter ?',
        confirmText: i18n.t('confirm_logout_title') || 'Se déconnecter',
        onConfirm: async () => {
          await Auth.logout();
          window.location.href = 'index.html';
        }
      });
    });
  },

  _setupTopbar() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    mobileBtn?.addEventListener('click', () => {
      if (SidebarManager._sidebar?.classList.contains('mobile-open')) {
        SidebarManager.close();
      } else {
        SidebarManager.open();
      }
    });
  },

  _setupThemeToggle() {
    // Note: button id in app.html is 'theme-toggle' (not 'theme-toggle-btn')
    const btn = document.getElementById('theme-toggle') || document.getElementById('theme-toggle-btn');
    const iconLight = document.getElementById('theme-icon-light');
    const iconDark  = document.getElementById('theme-icon-dark');

    const updateIcons = () => {
      const isDark = Prefs.get('theme') === 'dark';
      if (iconLight) iconLight.style.display = isDark ? 'none' : 'block';
      if (iconDark)  iconDark.style.display  = isDark ? 'block' : 'none';
    };
    updateIcons();

    btn?.addEventListener('click', () => {
      const next = Prefs.get('theme') === 'dark' ? 'light' : 'dark';
      Prefs.set('theme', next).applyTheme();
      updateIcons();
      if (Auth.isCreator()) {
        KantaraDB.updateSettings({ theme: next }).catch(() => {});
      }
    });
  },

  _setupNotifPanel() {
    const notifBtn   = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');
    const markAllBtn = document.getElementById('mark-all-read');

    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notifPanel?.classList.contains('hidden');
      if (isHidden) {
        notifPanel?.classList.remove('hidden');
        Notifications.renderPanel();
      } else {
        notifPanel?.classList.add('hidden');
      }
    });

    markAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      Notifications.markAllRead();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!notifBtn?.contains(e.target) && !notifPanel?.contains(e.target)) {
        notifPanel?.classList.add('hidden');
      }
    });

    // Wire "See all" link in notif footer
    notifPanel?.querySelector('[data-page="/notifications"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      notifPanel.classList.add('hidden');
      this.goTo('/notifications');
    });
  },

  _setupSaveBtn() {
    const saveBtn = document.getElementById('save-btn');
    const indicator = document.getElementById('save-indicator');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      const orig = saveBtn.innerHTML;
      saveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .6s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg><span>Sauvegarde...</span>`;
      // Refresh current module
      const page = this._pages[this._currentPath];
      if (page) {
        const mod = this._modules[page.module];
        if (mod?.refresh) await mod.refresh().catch(()=>{});
      }
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = orig;
        if (indicator) { indicator.textContent = '✓ Sauvegardé'; setTimeout(() => { indicator.textContent = ''; }, 2000); }
      }, 800);
    });
  },

  _setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    toggleBtn?.addEventListener('click', () => SidebarManager.toggle());
  },

  _setupGlobalSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;

    // Create results dropdown
    const wrapper = input.closest('.search-input-bar') || input.parentElement;
    if (wrapper && !document.getElementById('global-search-results')) {
      wrapper.style.position = 'relative';
      const panel = document.createElement('div');
      panel.id = 'global-search-results';
      panel.className = 'search-results-panel';
      panel.style.display = 'none';
      wrapper.appendChild(panel);
    }

    const panel = document.getElementById('global-search-results');
    let debounceTimer = null;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q || q.length < 2) { if (panel) panel.style.display = 'none'; return; }
      debounceTimer = setTimeout(async () => {
        if (panel) {
          panel.style.display = 'block';
          panel.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:.8rem">Recherche...</div>`;
        }
        const results = await GlobalSearch.search(q);
        if (panel) {
          panel.style.display = 'block';
          panel.innerHTML = GlobalSearch.renderDropdown(results, (page) => this.goTo(page));
          // Wire click events on results
          panel.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
              this.goTo(item.dataset.page);
              input.value = '';
              panel.style.display = 'none';
            });
          });
        }
      }, 350);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (panel) panel.style.display = 'none'; input.value = ''; }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && panel && !panel.contains(e.target)) panel.style.display = 'none';
    });
  },

  _initRouter() {
    const nav = (path) => {
      history.pushState({}, '', path);
      this._loadPage(path);
    };

    // Sidebar nav links
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const path = el.dataset.page;
        nav(path);
        if (window.innerWidth <= 768) SidebarManager.close();
      });
    });

    // Popstate
    window.addEventListener('popstate', () => {
      this._loadPage(location.pathname || '/dashboard');
    });

    // Initial load
    const initial = location.pathname;
    const validPaths = Object.keys(this._pages);
    this._loadPage(validPaths.includes(initial) ? initial : '/dashboard');
  },

  goTo(path) {
    history.pushState({}, '', path);
    this._loadPage(path);
  },

  _loadPage(path) {
    const page = this._pages[path] || this._pages['/dashboard'];
    const resolvedPath = this._pages[path] ? path : '/dashboard';

    // Update active nav
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === resolvedPath);
    });

    // Show panel
    document.querySelectorAll('.page-panel').forEach(el => el.classList.remove('active'));
    const panel = document.getElementById(page.panel);
    if (panel) panel.classList.add('active');

    // Update page title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = i18n.t(page.title) || page.title;

    this._currentPath = resolvedPath;

    // Init module once
    if (!this._initialized.has(resolvedPath)) {
      const mod = this._modules[page.module];
      if (mod && typeof mod.init === 'function') {
        this._initialized.add(resolvedPath);
        mod.init(panel).catch(err => {
          console.error(`[Kantara] Module ${page.module} error:`, err);
          // Show error visibly inside the panel
          if (panel) {
            panel.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:16px;text-align:center;padding:40px">
                <div style="width:56px;height:56px;border-radius:50%;background:rgba(220,38,38,.1);display:flex;align-items:center;justify-content:center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <div style="font-weight:700;color:#dc2626;font-size:.95rem;margin-bottom:6px">Erreur de chargement</div>
                  <div style="color:#64748b;font-size:.82rem;max-width:400px">${err.message || 'Une erreur inattendue est survenue'}</div>
                </div>
                <button onclick="App._initialized.delete('${resolvedPath}');App._loadPage('${resolvedPath}')" style="padding:8px 20px;background:var(--navy);color:white;border:none;border-radius:8px;cursor:pointer;font-size:.85rem">Réessayer</button>
              </div>`;
          }
        });
      }
    } else {
      const mod = this._modules[page.module];
      if (mod && typeof mod.refresh === 'function') mod.refresh();
    }
  },
  _setupFAB() {
    const btn  = document.getElementById('fab-main-btn');
    const menu = document.getElementById('fab-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
      const isOpen = menu.classList.contains('open');
      btn.querySelector('svg').style.transform = isOpen ? 'rotate(45deg)' : '';
      btn.querySelector('svg').style.transition = 'transform .2s';
    });
    document.addEventListener('click', () => {
      menu.classList.remove('open');
      if (btn.querySelector('svg')) btn.querySelector('svg').style.transform = '';
    });
  },
};
document.addEventListener('DOMContentLoaded', () => {
  // Config check — redirect to index.html if not configured
  const _cfg = SetupWizard.getConfig();
  if (!_cfg.url || !_cfg.anonKey) {
    window.location.href = 'index.html';
  } else {
    try { initSupabase(_cfg); } catch(e) { window.location.href = 'index.html'; }
    App.boot();
  }
});
