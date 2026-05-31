// ═══════════════════════════════════════════════
// KANTARA v4 — Setup Wizard
// Ordre correct :
//   Étape 1 → Copier SQL dans Supabase
//   Étape 2 → Entrer URL + Clé Supabase
//   Étape 3 → Configurer accès admin
// ═══════════════════════════════════════════════

const SetupWizard = {
  STORAGE_KEY: 'kantara_supabase_config',
  _config: {},
  _step: 1,

  // ── Vérifie si une config existe déjà ──────────────
  hasConfig() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return false;
      const cfg = JSON.parse(raw);
      return !!(cfg.url && cfg.anonKey);
    } catch { return false; }
  },

  getConfig() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch { return {}; }
  },

  saveConfig(cfg) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cfg)); },

  clearConfig() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('kantara_session');
  },

  // ── Point d'entrée principal ────────────────────────
  check(onReady) {
    if (this.hasConfig()) {
      try {
        initSupabase(this.getConfig());
        onReady();
        return;
      } catch (e) {
        this.clearConfig();
      }
    }
    this._showWizard(onReady);
  },

  // ── Injecte le wizard dans le DOM ──────────────────
  _showWizard(onReady) {
    const overlay = document.createElement('div');
    overlay.id = 'wizard-overlay';
    overlay.innerHTML = this._wizardHTML();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    this._bindWizard(onReady, overlay);
  },

  // ── HTML complet du wizard ──────────────────────────
  _wizardHTML() {
    return `
<div class="wizard-wrap">
  <div class="wizard-card">

    <!-- En-tête avec logo + indicateur d'étapes -->
    <div class="wizard-header">
      <div class="wizard-logo">
        <div class="wizard-logo-icon">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 24 Q16 6 28 24" fill="none" stroke="#0F1B2D" stroke-width="3.5" stroke-linecap="round"/>
            <circle cx="16" cy="10" r="4" fill="#0F1B2D"/>
            <line x1="10" y1="24" x2="22" y2="24" stroke="#0F1B2D" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="wizard-logo-text">KANTARA</span>
      </div>
      <div class="wizard-steps">
        <div class="wstep active" id="wstep-1"><span>1</span><em>Base de données</em></div>
        <div class="wstep-line"></div>
        <div class="wstep" id="wstep-2"><span>2</span><em>Connexion</em></div>
        <div class="wstep-line"></div>
        <div class="wstep" id="wstep-3"><span>3</span><em>Accès admin</em></div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         ÉTAPE 1 — Copier & exécuter le SQL dans Supabase
    ══════════════════════════════════════════════ -->
    <div class="wizard-step" id="wstep-panel-1">
      <div class="wizard-step-header">
        <div class="wizard-step-num">01</div>
        <div>
          <h2 class="wizard-step-title">Initialiser la base de données</h2>
          <p class="wizard-step-desc">
            Avant tout, copiez le SQL ci-dessous et exécutez-le dans votre
            <strong>Supabase → SQL Editor</strong>. Cela crée toutes les tables nécessaires.
          </p>
        </div>
      </div>

      <div class="wizard-form">
        <!-- Bloc SQL avec bouton copier -->
        <div class="wsql-box">
          <div class="wsql-header">
            <span class="wsql-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              SQL d'initialisation Kantara v4 — 16 tables
            </span>
            <button class="wsql-copy" id="w-copy-sql">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copier le SQL
            </button>
          </div>
          <pre class="wsql-content" id="wsql-text"></pre>
        </div>

        <!-- Guide visuel -->
        <div class="wizard-steps-guide">
          <div class="guide-step">
            <div class="guide-num">1</div>
            <p>Ouvrez <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></p>
          </div>
          <div class="guide-step">
            <div class="guide-num">2</div>
            <p>Cliquez <strong>New Query</strong>, collez le SQL copié ci-dessus</p>
          </div>
          <div class="guide-step">
            <div class="guide-num">3</div>
            <p>Cliquez <strong>Run ▶</strong> — attendez le message <em>"Success"</em></p>
          </div>
          <div class="guide-step">
            <div class="guide-num">4</div>
            <p>Revenez ici et cliquez <strong>Suivant →</strong></p>
          </div>
        </div>

        <!-- Alerte info -->
        <div class="w-info-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Ce SQL crée automatiquement toutes les tables (projets, tâches, clients, factures, équipe, documents…). Il peut être réexécuté sans danger si nécessaire.</span>
        </div>
      </div>

      <div class="wizard-footer">
        <div></div>
        <button class="wbtn wbtn-primary" id="w-step1-next">
          J'ai exécuté le SQL — Suivant
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         ÉTAPE 2 — Connexion Supabase (URL + clé)
    ══════════════════════════════════════════════ -->
    <div class="wizard-step hidden" id="wstep-panel-2">
      <div class="wizard-step-header">
        <div class="wizard-step-num">02</div>
        <div>
          <h2 class="wizard-step-title">Connectez votre Supabase</h2>
          <p class="wizard-step-desc">
            Entrez les informations de votre projet Supabase.
            Vous les trouverez dans <strong>Project Settings → API</strong>.
          </p>
        </div>
      </div>

      <div class="wizard-form">
        <div class="wfield">
          <label class="wlabel">URL du projet Supabase <span class="wrequired">*</span></label>
          <input type="url" id="w-url" class="winput" placeholder="https://xxxxxxxx.supabase.co" autocomplete="off"/>
          <p class="whelp">Copiée depuis <strong>Project Settings → API → Project URL</strong></p>
        </div>
        <div class="wfield">
          <label class="wlabel">Clé API publique (anon key) <span class="wrequired">*</span></label>
          <div class="winput-wrap">
            <input type="password" id="w-key" class="winput" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." autocomplete="off"/>
            <button type="button" class="winput-eye" id="w-key-toggle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <p class="whelp">Clé <code>anon public</code> — sûre à utiliser côté frontend</p>
        </div>
        <div id="w-conn-status" class="w-status" style="display:none"></div>

        <!-- Vérification des tables incluse ici -->
        <div class="w-info-box" style="margin-top:16px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Après avoir cliqué <strong>Tester la connexion</strong>, Kantara vérifiera automatiquement que toutes les tables existent dans votre base.</span>
        </div>
      </div>

      <div class="wizard-footer">
        <button class="wbtn wbtn-outline" id="w-step2-back">← Retour</button>
        <button class="wbtn wbtn-primary" id="w-step2-connect">
          Tester la connexion
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         ÉTAPE 3 — Mot de passe administrateur
    ══════════════════════════════════════════════ -->
    <div class="wizard-step hidden" id="wstep-panel-3">
      <div class="wizard-step-header">
        <div class="wizard-step-num">03</div>
        <div>
          <h2 class="wizard-step-title">Configurer votre accès admin</h2>
          <p class="wizard-step-desc">
            Définissez votre nom et votre mot de passe administrateur.
            Vous pourrez les modifier à tout moment dans les paramètres.
          </p>
        </div>
      </div>

      <div class="wizard-form">
        <div class="wfield">
          <label class="wlabel">Votre nom <span class="wrequired">*</span></label>
          <input type="text" id="w-admin-name" class="winput" placeholder="Ex: Jean Dupont" value="Administrateur"/>
        </div>
        <div class="wfield">
          <label class="wlabel">Mot de passe administrateur <span class="wrequired">*</span></label>
          <div class="winput-wrap">
            <input type="password" id="w-admin-pass" class="winput" placeholder="Choisissez un mot de passe sécurisé" value="1234"/>
            <button type="button" class="winput-eye" id="w-pass-toggle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <p class="whelp">Par défaut : <code>1234</code> — Modifiez-le pour plus de sécurité</p>
        </div>
        <div class="wfield">
          <label class="wlabel">Confirmer le mot de passe <span class="wrequired">*</span></label>
          <input type="password" id="w-admin-confirm" class="winput" placeholder="Répétez le mot de passe" value="1234"/>
        </div>
        <div id="w-pass-status" class="w-status" style="display:none"></div>
      </div>

      <div class="wizard-footer">
        <button class="wbtn wbtn-outline" id="w-step3-back">← Retour</button>
        <button class="wbtn wbtn-primary" id="w-step3-finish">
          Lancer Kantara 🚀
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </button>
      </div>
    </div>

  </div><!-- /.wizard-card -->
</div><!-- /.wizard-wrap -->`;
  },

  // ── Liaison des événements ──────────────────────────
  _bindWizard(onReady, overlay) {

    // ── Injecter le SQL complet dans la zone de texte ──
    const sqlEl = document.getElementById('wsql-text');
    if (sqlEl) sqlEl.textContent = KANTARA_INIT_SQL.trim();

    // ── Bouton : Copier le SQL ──────────────────────────
    document.getElementById('w-copy-sql')?.addEventListener('click', async () => {
      const btn = document.getElementById('w-copy-sql');
      try {
        await navigator.clipboard.writeText(KANTARA_INIT_SQL.trim());
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ✓ Copié !`;
        btn.style.background = 'rgba(34,197,94,.15)';
        btn.style.color = '#16a34a';
        btn.style.borderColor = 'rgba(34,197,94,.3)';
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copier le SQL`;
          btn.style.background = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }, 2500);
      } catch {
        // Fallback si clipboard API non dispo
        btn.textContent = 'Sélectionnez et copiez manuellement';
        if (sqlEl) {
          sqlEl.style.border = '2px solid var(--gold)';
          sqlEl.select?.();
        }
      }
    });

    // ── Afficher/cacher le mot de passe (anon key) ─────
    document.getElementById('w-key-toggle')?.addEventListener('click', () => {
      const inp = document.getElementById('w-key');
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // ── Afficher/cacher le mot de passe admin ──────────
    document.getElementById('w-pass-toggle')?.addEventListener('click', () => {
      const inp = document.getElementById('w-admin-pass');
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // ════════════════════════════════════════════════════
    // ÉTAPE 1 → ÉTAPE 2
    // Simple confirmation que le SQL a été exécuté
    // ════════════════════════════════════════════════════
    document.getElementById('w-step1-next')?.addEventListener('click', () => {
      this._goToStep(2);
    });

    // ════════════════════════════════════════════════════
    // ÉTAPE 2 ← Retour vers Étape 1
    // ════════════════════════════════════════════════════
    document.getElementById('w-step2-back')?.addEventListener('click', () => {
      this._goToStep(1);
    });

    // ════════════════════════════════════════════════════
    // ÉTAPE 2 — Tester la connexion + vérifier les tables
    // ════════════════════════════════════════════════════
    document.getElementById('w-step2-connect')?.addEventListener('click', async () => {
      const url    = document.getElementById('w-url')?.value?.trim();
      const key    = document.getElementById('w-key')?.value?.trim();
      const btn    = document.getElementById('w-step2-connect');
      const status = document.getElementById('w-conn-status');

      // Validations basiques
      if (!url || !key) {
        this._showStatus(status, 'error', '⚠ Veuillez remplir les deux champs.');
        return;
      }
      if (!url.startsWith('https://')) {
        this._showStatus(status, 'error', "⚠ L'URL doit commencer par https://");
        return;
      }
      if (!url.includes('supabase.co')) {
        this._showStatus(status, 'error', "⚠ L'URL doit être une URL Supabase valide (*.supabase.co)");
        return;
      }

      // État de chargement
      btn.disabled = true;
      btn.innerHTML = `<span style="display:flex;align-items:center;gap:8px">
        <svg class="wspin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>Connexion en cours…</span>`;

      try {
        // 1. Initialiser Supabase
        initSupabase({ url, anonKey: key });

        // 2. Tester la connexion (ping simple)
        const { error: pingErr } = await getClient().from('settings').select('id').limit(1);
        if (pingErr && pingErr.code !== 'PGRST116') {
          throw new Error(pingErr.message || 'Impossible de joindre la base de données');
        }

        // 3. Vérifier que TOUTES les tables existent
        this._showStatus(status, 'info', '✓ Connexion OK — Vérification des tables…');
        const tables = [
          'settings','projects','tasks','clients','suppliers',
          'expenses','quotes','invoices','payments','proofs',
          'notifications','team_members','milestones','subtasks','documents'
        ];
        const missing = [];
        for (const t of tables) {
          const { error } = await getClient().from(t).select('id').limit(1);
          if (error && error.code !== 'PGRST116') missing.push(t);
        }

        if (missing.length > 0) {
          throw new Error(
            `Tables manquantes : ${missing.join(', ')}.\n` +
            `Retournez à l'étape 1 et assurez-vous d'avoir bien exécuté le SQL complet dans Supabase.`
          );
        }

        // 4. Tout est OK → sauvegarder config et passer à l'étape 3
        this._config = { url, anonKey: key };
        this._showStatus(status, 'success', `✓ Connexion réussie ! ${tables.length} tables vérifiées.`);
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = `Tester la connexion <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
          this._goToStep(3);
        }, 900);

      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `Tester la connexion <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
        const msg = e.message?.includes('fetch')
          ? '⚠ Impossible de joindre Supabase. Vérifiez l\'URL et votre connexion internet.'
          : `⚠ ${e.message || 'Erreur de connexion'}`;
        this._showStatus(status, 'error', msg);
      }
    });

    // ════════════════════════════════════════════════════
    // ÉTAPE 3 ← Retour vers Étape 2
    // ════════════════════════════════════════════════════
    document.getElementById('w-step3-back')?.addEventListener('click', () => {
      this._goToStep(2);
    });

    // ════════════════════════════════════════════════════
    // ÉTAPE 3 — Finalisation : mot de passe + lancement
    // ════════════════════════════════════════════════════
    document.getElementById('w-step3-finish')?.addEventListener('click', async () => {
      const name    = document.getElementById('w-admin-name')?.value?.trim() || 'Administrateur';
      const pass    = document.getElementById('w-admin-pass')?.value?.trim();
      const confirm = document.getElementById('w-admin-confirm')?.value?.trim();
      const btn     = document.getElementById('w-step3-finish');
      const status  = document.getElementById('w-pass-status');

      // Validations
      if (!name) {
        this._showStatus(status, 'error', '⚠ Entrez votre nom.');
        return;
      }
      if (!pass || pass.length < 4) {
        this._showStatus(status, 'error', '⚠ Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      if (pass !== confirm) {
        this._showStatus(status, 'error', '⚠ Les mots de passe ne correspondent pas.');
        return;
      }

      // État chargement
      btn.disabled = true;
      btn.innerHTML = `<span style="display:flex;align-items:center;gap:8px">
        <svg class="wspin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>Configuration…</span>`;

      try {
        // Sauvegarder le mot de passe et le nom dans Supabase
        const { error } = await getClient()
          .from('settings')
          .upsert({
            id:             'config',
            admin_password: pass,
            display_name:   name,
            updated_at:     new Date().toISOString()
          });

        if (error) throw new Error(error.message);

        // Sauvegarder la config Supabase en localStorage
        this.saveConfig(this._config);

        this._showStatus(status, 'success', '✓ Configuration enregistrée ! Lancement de Kantara…');

        setTimeout(() => {
          overlay.classList.add('closing');
          setTimeout(() => {
            overlay.remove();
            onReady();
          }, 600);
        }, 900);

      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `Lancer Kantara 🚀 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        this._showStatus(status, 'error', `⚠ ${e.message || 'Erreur lors de la configuration'}`);
      }
    });
  },

  // ── Navigation entre étapes ─────────────────────────
  _goToStep(step) {
    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById(`wstep-panel-${i}`);
      const dot   = document.getElementById(`wstep-${i}`);
      if (panel) panel.classList.toggle('hidden', i !== step);
      if (dot) {
        dot.classList.toggle('active', i === step);
        dot.classList.toggle('done',   i < step);
      }
    }
    this._step = step;
    // Scroll haut à chaque changement d'étape
    document.querySelector('.wizard-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ── Afficher un message de statut ───────────────────
  _showStatus(el, type, msg) {
    if (!el) return;
    el.style.display = 'flex';
    el.className = `w-status w-status-${type}`;
    // Icônes selon le type
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    el.innerHTML = `${icons[type] || ''}
      <span style="white-space:pre-line">${msg}</span>`;
  },
};
