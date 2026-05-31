// ═══════════════════════════════════════════════
// KANTARA v4 — Projects Module
// Nouvelles fonctionnalités : templates, duplication,
// archivage, jalons (milestones), score de santé, export CSV
// ═══════════════════════════════════════════════

const Projects = {

  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
  _panel: null, _projects: [], _clients: [], _tasks: [],
  _filterStatus: 'all', _filterPriority: 'all', _searchQuery: '',
  _view: 'grid', _showArchived: false,
  _editId: null, _milestones: [],

  async init(panel) { this._panel = panel; this._render(); await this._load(); },
  async refresh()   { await this._load(); },

  _render() {
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('projects_title')}</h2>
          <p class="page-header-subtitle">${i18n.t('projects_subtitle')}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-export" id="proj-export-btn">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-outline btn-sm" id="proj-view-toggle" title="Changer la vue">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <button class="btn btn-outline btn-sm" id="proj-template-btn">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${i18n.t('project_from_template')}
          </button>
          <button class="btn btn-primary" id="proj-new-btn">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${i18n.t('project_new')}
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar" style="max-width:280px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="proj-search" placeholder="${i18n.t('search')}"/>
        </div>
        <select class="filter-select" id="proj-filter-status">
          <option value="all">${i18n.t('all')} ${i18n.t('status')}</option>
          <option value="active">${i18n.t('project_active')}</option>
          <option value="done">${i18n.t('project_done')}</option>
          <option value="paused">${i18n.t('project_paused')}</option>
        </select>
        <select class="filter-select" id="proj-filter-priority">
          <option value="all">${i18n.t('all')} ${i18n.t('priority')}</option>
          <option value="high">${i18n.t('project_priority_high')}</option>
          <option value="medium">${i18n.t('project_priority_medium')}</option>
          <option value="low">${i18n.t('project_priority_low')}</option>
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--text-secondary);cursor:pointer;user-select:none">
          <input type="checkbox" id="proj-show-archived" style="accent-color:var(--gold)"/> ${i18n.t('project_show_archived')}
        </label>
      </div>
      <div id="proj-content"></div>

      <!-- Modal: Create / Edit Project -->
      <div class="modal-overlay" id="modal-project" style="display:none">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <div class="modal-title" id="modal-project-title">${i18n.t('project_new')}</div>
              <div class="modal-subtitle">${i18n.t('projects_subtitle')}</div>
            </div>
            <button class="modal-close" onclick="Modal.close('modal-project')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <!-- Tabs -->
          <div class="modal-tab-bar">
            <div class="modal-tab-btn active" data-proj-tab="info">Infos</div>
            <div class="modal-tab-btn" data-proj-tab="milestones">${i18n.t('project_milestones')}</div>
          </div>
          <div class="modal-body" style="padding-top:0">
            <!-- Info Tab -->
            <div class="modal-tab-panel active" id="proj-tab-info" style="padding-top:20px">
              <div class="field-group">
                <div class="field">
                  <label class="field-label">${i18n.t('project_name')} <span class="field-required">*</span></label>
                  <input type="text" class="field-input" id="proj-name" placeholder="Ex: Construction Villa Kossou"/>
                  <span class="field-error" id="proj-name-err"></span>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('project_description')}</label>
                  <textarea class="field-textarea" id="proj-desc" placeholder="${i18n.t('description')}..." rows="3"></textarea>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('project_client')}</label>
                    <select class="field-select" id="proj-client"><option value="">${i18n.t('none')}</option></select>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('project_budget')}</label>
                    <input type="number" class="field-input" id="proj-budget" placeholder="0" min="0"/>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('start_date')}</label>
                    <input type="date" class="field-input" id="proj-start"/>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('end_date')}</label>
                    <input type="date" class="field-input" id="proj-end"/>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('status')}</label>
                    <select class="field-select" id="proj-status">
                      <option value="active">${i18n.t('project_active')}</option>
                      <option value="done">${i18n.t('project_done')}</option>
                      <option value="paused">${i18n.t('project_paused')}</option>
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('priority')}</label>
                    <select class="field-select" id="proj-priority">
                      <option value="high">${i18n.t('project_priority_high')}</option>
                      <option value="medium" selected>${i18n.t('project_priority_medium')}</option>
                      <option value="low">${i18n.t('project_priority_low')}</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('notes')}</label>
                  <textarea class="field-textarea" id="proj-notes" rows="2"></textarea>
                </div>
              </div>
            </div>
            <!-- Milestones Tab -->
            <div class="modal-tab-panel" id="proj-tab-milestones" style="padding-top:20px">
              <div id="milestones-list" class="milestone-list"></div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <input type="text" class="field-input" id="ms-title-input" placeholder="${i18n.t('project_milestone_title')}..." style="flex:1"/>
                <input type="date" class="field-input" id="ms-date-input" style="width:160px"/>
                <button class="btn btn-outline btn-sm" id="ms-add-btn">+ ${i18n.t('add')}</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-project')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="proj-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>

      <!-- Modal Template -->
      <div class="modal-overlay" id="modal-template" style="display:none">
        <div class="modal modal-md">
          <div class="modal-header">
            <div class="modal-title">${i18n.t('project_from_template')}</div>
            <button class="modal-close" onclick="Modal.close('modal-template')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="template-grid" id="template-grid">
              ${this._templateCards()}
            </div>
          </div>
        </div>
      </div>
    `;
    // Events
    document.getElementById('proj-new-btn')?.addEventListener('click', () => this._openModal());
    document.getElementById('proj-template-btn')?.addEventListener('click', () => Modal.open('modal-template'));
    document.getElementById('proj-export-btn')?.addEventListener('click', () => this._exportCSV());
    document.getElementById('proj-search')?.addEventListener('input', debounce(e => { this._searchQuery = e.target.value.toLowerCase(); this._renderList(); }, 300));
    document.getElementById('proj-filter-status')?.addEventListener('change', e => { this._filterStatus = e.target.value; this._renderList(); });
    document.getElementById('proj-filter-priority')?.addEventListener('change', e => { this._filterPriority = e.target.value; this._renderList(); });
    document.getElementById('proj-view-toggle')?.addEventListener('click', () => { this._view = this._view === 'grid' ? 'list' : 'grid'; this._renderList(); });
    document.getElementById('proj-show-archived')?.addEventListener('change', e => { this._showArchived = e.target.checked; this._renderList(); });
    document.getElementById('proj-save-btn')?.addEventListener('click', () => this._save());
    // Project tabs
    this._panel.querySelectorAll('[data-proj-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._panel.querySelectorAll('[data-proj-tab]').forEach(b => b.classList.remove('active'));
        this._panel.querySelectorAll('#proj-tab-info, #proj-tab-milestones').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('proj-tab-' + btn.dataset.projTab)?.classList.add('active');
      });
    });
    // Milestone
    document.getElementById('ms-add-btn')?.addEventListener('click', () => this._addMilestone());
    // Template cards
    this._panel.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        this._panel.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setTimeout(() => { Modal.close('modal-template'); this._openModalFromTemplate(card.dataset.tpl); }, 300);
      });
    });
  },

  _templateCards() {
    const tpls = [
      { key: 'blank',        icon: '📄', name: i18n.t('project_template_blank'), desc: 'Démarrage libre' },
      { key: 'construction', icon: '🏗️',  name: i18n.t('project_template_construction'), desc: 'BTP, travaux, chantier' },
      { key: 'web',          icon: '💻',  name: i18n.t('project_template_web'), desc: 'Site, appli, API' },
      { key: 'marketing',    icon: '📣',  name: i18n.t('project_template_marketing'), desc: 'Campagne, lancement' },
      { key: 'event',        icon: '🎪',  name: i18n.t('project_template_event'), desc: 'Événement, organisation' },
    ];
    return tpls.map(t => `<div class="template-card" data-tpl="${t.key}">
      <div class="template-icon">${t.icon}</div>
      <div class="template-name">${t.name}</div>
      <div class="template-desc">${t.desc}</div>
    </div>`).join('');
  },

  _openModalFromTemplate(tplKey) {
    const templates = {
      construction: { name: 'Projet Construction', status: 'active', priority: 'high',
        milestones: [{ title: 'Plans approuvés', date: '' }, { title: 'Fondations', date: '' }, { title: 'Gros œuvre', date: '' }, { title: 'Second œuvre', date: '' }, { title: 'Livraison', date: '' }] },
      web: { name: 'Projet Web', status: 'active', priority: 'medium',
        milestones: [{ title: 'Cahier des charges', date: '' }, { title: 'Maquettes validées', date: '' }, { title: 'Développement', date: '' }, { title: 'Tests', date: '' }, { title: 'Mise en ligne', date: '' }] },
      marketing: { name: 'Campagne Marketing', status: 'active', priority: 'medium',
        milestones: [{ title: 'Brief créatif', date: '' }, { title: 'Contenus prêts', date: '' }, { title: 'Lancement', date: '' }, { title: 'Bilan', date: '' }] },
      event: { name: 'Organisation Événement', status: 'active', priority: 'high',
        milestones: [{ title: 'Lieu confirmé', date: '' }, { title: 'Invitations envoyées', date: '' }, { title: 'Logistique', date: '' }, { title: 'Jour J', date: '' }] },
      blank: { name: '', status: 'active', priority: 'medium', milestones: [] },
    };
    const tpl = templates[tplKey] || templates.blank;
    this._milestones = tpl.milestones.map(m => ({ ...m, done: false }));
    this._openModal(null, tpl);
  },

  async _load() {
    try {
      const [projSnap, clientSnap, taskSnap] = await Promise.all([
        userCol(Collections.PROJECTS).orderBy('createdAt','desc').get(),
        userCol(Collections.CLIENTS).orderBy('name').get(),
        userCol(Collections.TASKS).get(),
      ]);
      this._projects = projSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._clients  = clientSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._tasks    = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderList();
    } catch(e) { console.error('Projects load error:', e); }
  },

  _filtered() {
    return this._projects.filter(p => {
      if (!this._showArchived && p.archived) return false;
      if (this._filterStatus !== 'all' && p.status !== this._filterStatus) return false;
      if (this._filterPriority !== 'all' && p.priority !== this._filterPriority) return false;
      if (this._searchQuery && !p.name?.toLowerCase().includes(this._searchQuery) && !p.description?.toLowerCase().includes(this._searchQuery)) return false;
      return true;
    });
  },

  _healthScore(proj) {
    const tasks  = this._tasks.filter(t => t.projectId === proj.id);
    if (!tasks.length) return { score: 'N/A', cls: 'grey' };
    const done   = tasks.filter(t => t.status === 'done').length;
    const overdue= tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    const blocked= tasks.filter(t => t.status === 'blocked').length;
    let score    = Math.round((done / tasks.length) * 100);
    score = Math.max(0, score - overdue * 5 - blocked * 8);
    const cls = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';
    return { score: score + '%', cls };
  },

  _renderList() {
    const projects = this._filtered();
    const content  = document.getElementById('proj-content');
    if (!content) return;
    if (!projects.length) {
      content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;opacity:.4"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <p style="font-size:.88rem">${i18n.t('no_results')}</p>
      </div>`; return;
    }
    if (this._view === 'list') { this._renderListView(projects, content); return; }
    content.innerHTML = `<div class="cards-grid">${projects.map(p => this._projectCard(p)).join('')}</div>`;
    content.querySelectorAll('.project-card').forEach(card => {
      card.querySelector('.proj-card-body')?.addEventListener('click', () => this._openModal(card.dataset.id));
      card.querySelector('.proj-dup-btn')?.addEventListener('click', e => { e.stopPropagation(); this._duplicate(card.dataset.id); });
      card.querySelector('.proj-archive-btn')?.addEventListener('click', e => { e.stopPropagation(); this._toggleArchive(card.dataset.id); });
      card.querySelector('.proj-del-btn')?.addEventListener('click', e => { e.stopPropagation(); this._delete(card.dataset.id); });
    });
  },

  _projectCard(p) {
    const client   = this._clients.find(c => c.id === p.clientId);
    const tasks    = this._tasks.filter(t => t.projectId === p.id);
    const done     = tasks.filter(t => t.status === 'done').length;
    const pct      = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const health   = this._healthScore(p);
    const sColor   = { active:'var(--status-active)', done:'var(--status-done)', paused:'var(--status-paused)' }[p.status] || 'var(--text-muted)';
    const prColor  = { high:'var(--status-blocked)', medium:'var(--status-pending)', low:'var(--status-active)' }[p.priority] || 'var(--text-muted)';
    return `<div class="card project-card" data-id="${p.id}">
      <div class="proj-card-body project-card-header" style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div class="project-card-title">${escapeHtml(p.name)}${p.archived?'<span class="archived-badge" style="margin-left:8px">Archivé</span>':''}</div>
            ${client ? `<div class="project-card-client">${escapeHtml(client.name)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
            <span class="health-score ${health.cls}" title="${i18n.t('project_health')}">${health.score}</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sColor}"></span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${prColor}" title="${i18n.t('priority')}"></span>
          </div>
        </div>
        <div class="project-card-progress">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:.7rem;color:var(--text-muted)">${done}/${tasks.length} ${i18n.t('nav_tasks').toLowerCase()}</span>
            <span style="font-size:.7rem;font-weight:600;color:var(--navy)">${pct}%</span>
          </div>
          <div style="height:4px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:var(--gold);border-radius:99px;transition:width .4s"></div>
          </div>
        </div>
        ${p.endDate ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:6px">📅 ${Format.date(this._toDate(p.endDate))}</div>` : ''}
      </div>
      <div class="project-card-stats">
        <div class="project-stat"><div class="project-stat-val">${Format.currency(p.budget||0, Prefs.getCurrency())}</div><div class="project-stat-label">${i18n.t('project_budget')}</div></div>
        <div class="project-stat" style="display:flex;justify-content:flex-end;gap:4px;align-items:center">
          <button class="icon-btn btn-sm proj-dup-btn" title="${i18n.t('project_duplicate')}"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
          <button class="icon-btn btn-sm proj-archive-btn" title="${p.archived ? i18n.t('project_unarchive') : i18n.t('project_archive')}"><svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></button>
          <button class="icon-btn btn-sm proj-del-btn" title="${i18n.t('delete')}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
        </div>
      </div>
    </div>`;
  },

  _renderListView(projects, content) {
    content.innerHTML = `<div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>${i18n.t('project_name')}</th><th>${i18n.t('status')}</th><th>${i18n.t('priority')}</th>
          <th>${i18n.t('project_client')}</th><th>${i18n.t('project_budget')}</th>
          <th>${i18n.t('project_health')}</th><th>${i18n.t('end_date')}</th><th></th>
        </tr></thead>
        <tbody>${projects.map(p => {
          const client = this._clients.find(c => c.id === p.clientId);
          const health = this._healthScore(p);
          const sColor = { active:'var(--status-active)', done:'var(--status-done)', paused:'var(--status-paused)' }[p.status];
          return `<tr class="table-row" data-id="${p.id}" style="cursor:pointer">
            <td><span style="font-weight:600;color:var(--navy)">${escapeHtml(p.name)}</span>${p.archived?'<span class="archived-badge" style="margin-left:6px">Archivé</span>':''}</td>
            <td><span class="status-badge" style="background:${sColor}22;color:${sColor};border-color:${sColor}44">${i18n.t('project_'+p.status)||p.status}</span></td>
            <td>${p.priority||'—'}</td>
            <td>${client ? escapeHtml(client.name) : '—'}</td>
            <td>${Format.currency(p.budget||0, Prefs.getCurrency())}</td>
            <td><span class="health-score ${health.cls}">${health.score}</span></td>
            <td>${p.endDate ? Format.date(this._toDate(p.endDate)) : '—'}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn btn-sm proj-edit" data-id="${p.id}"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="icon-btn btn-sm proj-del" data-id="${p.id}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
    content.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', e => { if (e.target.closest('button')) return; this._openModal(row.dataset.id); });
    });
    content.querySelectorAll('.proj-edit').forEach(btn => btn.addEventListener('click', () => this._openModal(btn.dataset.id)));
    content.querySelectorAll('.proj-del').forEach(btn => btn.addEventListener('click', () => this._delete(btn.dataset.id)));
  },

  _openModal(id = null, defaults = {}) {
    this._editId     = id;
    this._milestones = this._milestones || [];
    const titleEl    = document.getElementById('modal-project-title');
    // Reset tabs
    this._panel.querySelectorAll('[data-proj-tab]').forEach(b => b.classList.remove('active'));
    this._panel.querySelectorAll('#proj-tab-info, #proj-tab-milestones').forEach(p => p.classList.remove('active'));
    this._panel.querySelector('[data-proj-tab="info"]')?.classList.add('active');
    document.getElementById('proj-tab-info')?.classList.add('active');
    // Populate clients
    const clientSel = document.getElementById('proj-client');
    if (clientSel) clientSel.innerHTML = `<option value="">${i18n.t('none')}</option>` + this._clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (id) {
      const p = this._projects.find(x => x.id === id);
      if (!p) return;
      if (titleEl) titleEl.textContent = i18n.t('edit');
      const setV = (el, v) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
      setV('proj-name', p.name); setV('proj-desc', p.description); setV('proj-notes', p.notes);
      setV('proj-budget', p.budget);
      setV('proj-start', p.startDate ? p.startDate.split('T')[0] : '');
      setV('proj-end', p.endDate ? p.endDate.split('T')[0] : '');
      const ss = document.getElementById('proj-status'); if (ss) ss.value = p.status || 'active';
      const pr = document.getElementById('proj-priority'); if (pr) pr.value = p.priority || 'medium';
      if (clientSel) clientSel.value = p.clientId || '';
      // Load milestones from project data
      this._milestones = Array.isArray(p.milestones) ? p.milestones.map(m => ({...m})) : [];
    } else {
      if (titleEl) titleEl.textContent = i18n.t('project_new');
      ['proj-name','proj-desc','proj-notes','proj-budget','proj-start','proj-end'].forEach(e => { const el = document.getElementById(e); if (el) el.value = ''; });
      const ss = document.getElementById('proj-status'); if (ss) ss.value = defaults.status || 'active';
      const pr = document.getElementById('proj-priority'); if (pr) pr.value = defaults.priority || 'medium';
      const pn = document.getElementById('proj-name'); if (pn && defaults.name) pn.value = defaults.name;
      if (!this._milestones?.length) this._milestones = (defaults.milestones || []).map(m => ({...m}));
    }
    const err = document.getElementById('proj-name-err'); if (err) err.textContent = '';
    this._renderMilestones();
    Modal.open('modal-project');
  },

  // ── Milestones ──
  _addMilestone() {
    const titleInp = document.getElementById('ms-title-input');
    const dateInp  = document.getElementById('ms-date-input');
    const title    = titleInp?.value.trim();
    if (!title) return;
    this._milestones.push({ title, date: dateInp?.value || '', done: false });
    if (titleInp) titleInp.value = '';
    if (dateInp) dateInp.value = '';
    this._renderMilestones();
  },
  _renderMilestones() {
    const list = document.getElementById('milestones-list');
    if (!list) return;
    if (!this._milestones.length) { list.innerHTML = `<p style="color:var(--text-muted);font-size:.82rem;padding:12px 0">Aucun jalon défini</p>`; return; }
    list.innerHTML = this._milestones.map((ms, i) => `
      <div class="milestone-item ${ms.done ? 'done' : ''}">
        <div class="milestone-dot"></div>
        <div class="milestone-content">
          <div class="milestone-title">${escapeHtml(ms.title)}</div>
          ${ms.date ? `<div class="milestone-date">📅 ${Format.date(new Date(ms.date))}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          <div class="milestone-check" data-idx="${i}" title="${ms.done ? 'Marquer non fait' : 'Marquer fait'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style="color:var(--text-muted);cursor:pointer" data-ms-del="${i}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
      </div>`).join('');
    list.querySelectorAll('.milestone-check').forEach(btn => {
      btn.addEventListener('click', () => { this._milestones[+btn.dataset.idx].done = !this._milestones[+btn.dataset.idx].done; this._renderMilestones(); });
    });
    list.querySelectorAll('[data-ms-del]').forEach(btn => {
      btn.addEventListener('click', () => { this._milestones.splice(+btn.dataset.msDel, 1); this._renderMilestones(); });
    });
  },

  async _save() {
    const nameEl = document.getElementById('proj-name');
    const name   = nameEl?.value.trim();
    const errEl  = document.getElementById('proj-name-err');
    if (!name) { if (errEl) errEl.textContent = i18n.t('required'); nameEl?.focus(); return; }
    if (errEl) errEl.textContent = '';
    const data = {
      name,
      description: document.getElementById('proj-desc')?.value.trim() || '',
      notes:       document.getElementById('proj-notes')?.value.trim() || '',
      budget:      parseFloat(document.getElementById('proj-budget')?.value) || 0,
      startDate:   document.getElementById('proj-start')?.value || '',
      endDate:     document.getElementById('proj-end')?.value || '',
      status:      document.getElementById('proj-status')?.value || 'active',
      priority:    document.getElementById('proj-priority')?.value || 'medium',
      clientId:    document.getElementById('proj-client')?.value || '',
      milestones:  this._milestones,
      updatedAt:   new Date().toISOString(),
    };
    const btn = document.getElementById('proj-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = i18n.t('saving'); }
    try {
      if (this._editId) {
        await userCol(Collections.PROJECTS).doc(this._editId).update(data);
        Toast.success(i18n.t('success_updated'), name);
        ActivityLog.add('project_updated', `Projet mis à jour : "${name}"`);
      } else {
        await userCol(Collections.PROJECTS).add({ ...data, archived: false, createdAt: new Date().toISOString() });
        Toast.success(i18n.t('success_created'), name);
        ActivityLog.add('project_created', `Nouveau projet : "${name}"`);
      }
      this._milestones = [];
      Modal.close('modal-project');
      await this._load();
    } catch(e) { Toast.error(i18n.t('error_generic'), e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = i18n.t('save'); } }
  },

  async _duplicate(id) {
    const p = this._projects.find(x => x.id === id);
    if (!p) return;
    const { id: _id, createdAt: _ca, ...rest } = p;
    await userCol(Collections.PROJECTS).add({ ...rest, name: p.name + ' (copie)', archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    Toast.success('Dupliquer', `"${p.name}" dupliqué`);
    ActivityLog.add('project_duplicated', `Projet dupliqué : "${p.name}"`);
    await this._load();
  },

  async _toggleArchive(id) {
    const p = this._projects.find(x => x.id === id);
    if (!p) return;
    await userCol(Collections.PROJECTS).doc(id).update({ archived: !p.archived, updatedAt: new Date().toISOString() });
    Toast.success(p.archived ? i18n.t('project_unarchive') : i18n.t('project_archive'), p.name);
    ActivityLog.add('project_archived', `Projet ${p.archived ? 'restauré' : 'archivé'} : "${p.name}"`);
    await this._load();
  },

  async _delete(id) {
    const p = this._projects.find(x => x.id === id);
    Modal.confirm({
      title: i18n.t('confirm_delete_title'),
      message: i18n.t('confirm_delete_msg'),
      confirmText: i18n.t('delete'),
      onConfirm: async () => {
        await userCol(Collections.PROJECTS).doc(id).delete();
        Toast.success(i18n.t('success_deleted'), p?.name || '');
        ActivityLog.add('project_deleted', `Projet supprimé : "${p?.name}"`);
        await this._load();
      }
    });
  },

  _exportCSV() {
    const projects = this._filtered();
    const headers  = ['Nom','Statut','Priorité','Client','Budget','Début','Fin','Santé','Archivé'];
    const rows     = projects.map(p => {
      const client = this._clients.find(c => c.id === p.clientId)?.name || '';
      const health = this._healthScore(p).score;
      return [p.name, p.status, p.priority||'medium', client, p.budget||0, p.startDate||'', p.endDate||'', health, p.archived?'Oui':'Non'];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'projets-kantara.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export','Fichier CSV téléchargé');
  },
};
