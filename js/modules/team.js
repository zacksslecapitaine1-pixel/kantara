// ═══════════════════════════════════════════════
// KANTARA v4 — Team Module
// Gestion des membres, rôles, départements,
// performance, charge de travail
// ═══════════════════════════════════════════════

const Team = {

  _panel: null, _members: [], _tasks: [],
  _filterRole: 'all', _filterDept: 'all', _searchQuery: '',
  _editId: null,

  _avatarColors: ['#C9972A','#3B82F6','#10B981','#8B5CF6','#EF4444','#F59E0B','#06B6D4','#EC4899','#6366F1','#14B8A6'],

  async init(panel) { this._panel = panel; this._render(); await this._load(); },
  async refresh()   { await this._load(); },

  _render() {
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('team_title')}</h2>
          <p class="page-header-subtitle">${i18n.t('team_subtitle')}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-export" id="team-export-btn">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" id="team-new-btn">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${i18n.t('team_new')}
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar" style="max-width:260px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="team-search" placeholder="${i18n.t('search')}"/>
        </div>
        <select class="filter-select" id="team-filter-role">
          <option value="all">${i18n.t('team_all_roles')}</option>
          <option value="admin">${i18n.t('team_role_admin')}</option>
          <option value="manager">${i18n.t('team_role_manager')}</option>
          <option value="member">${i18n.t('team_role_member')}</option>
          <option value="intern">${i18n.t('team_role_intern')}</option>
        </select>
        <select class="filter-select" id="team-filter-dept">
          <option value="all">${i18n.t('team_all_depts')}</option>
        </select>
      </div>
      <!-- Stats row -->
      <div id="team-stats-row" style="margin-bottom:20px"></div>
      <div id="team-content"></div>

      <!-- Modal Member -->
      <div class="modal-overlay" id="modal-member" style="display:none">
        <div class="modal modal-md">
          <div class="modal-header">
            <div class="modal-title" id="modal-member-title">${i18n.t('team_new')}</div>
            <button class="modal-close" onclick="Modal.close('modal-member')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="field-group">
              <div class="field">
                <label class="field-label">${i18n.t('name')} <span class="field-required">*</span></label>
                <input type="text" class="field-input" id="member-name" placeholder="Ex: Kofi Mensah"/>
                <span class="field-error" id="member-name-err"></span>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">${i18n.t('email')}</label>
                  <input type="email" class="field-input" id="member-email" placeholder="email@example.com"/>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('phone')}</label>
                  <input type="text" class="field-input" id="member-phone" placeholder="+228..."/>
                </div>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">${i18n.t('team_role')}</label>
                  <select class="field-select" id="member-role">
                    <option value="admin">${i18n.t('team_role_admin')}</option>
                    <option value="manager">${i18n.t('team_role_manager')}</option>
                    <option value="member" selected>${i18n.t('team_role_member')}</option>
                    <option value="intern">${i18n.t('team_role_intern')}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('team_department')}</label>
                  <input type="text" class="field-input" id="member-dept" placeholder="Ex: Technique, Marketing..."/>
                </div>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">${i18n.t('status')}</label>
                  <select class="field-select" id="member-status">
                    <option value="active">${i18n.t('team_status_active')}</option>
                    <option value="inactive">${i18n.t('team_status_inactive')}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('team_avatar_color')}</label>
                  <div id="avatar-color-picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                    ${this._avatarColors.map(c => `<div class="avatar-color-dot" data-color="${c}" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:all .15s"></div>`).join('')}
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="field-label">${i18n.t('team_notes')}</label>
                <textarea class="field-textarea" id="member-notes" rows="2" placeholder="${i18n.t('notes')}..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-member')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="member-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('team-new-btn')?.addEventListener('click', () => this._openModal());
    document.getElementById('team-export-btn')?.addEventListener('click', () => this._exportCSV());
    document.getElementById('team-search')?.addEventListener('input', debounce(e => { this._searchQuery = e.target.value.toLowerCase(); this._renderList(); }, 300));
    document.getElementById('team-filter-role')?.addEventListener('change', e => { this._filterRole = e.target.value; this._renderList(); });
    document.getElementById('team-filter-dept')?.addEventListener('change', e => { this._filterDept = e.target.value; this._renderList(); });
    document.getElementById('member-save-btn')?.addEventListener('click', () => this._save());
    this._selectedColor = this._avatarColors[0];
    this._panel.querySelectorAll('.avatar-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this._panel.querySelectorAll('.avatar-color-dot').forEach(d => d.style.borderColor = 'transparent');
        dot.style.borderColor = '#0F1B2D';
        this._selectedColor = dot.dataset.color;
      });
    });
    this._panel.querySelector('.avatar-color-dot')?.click();
  },

  async _load() {
    try {
      const [memberSnap, taskSnap] = await Promise.all([
        userCol(Collections.TEAM_MEMBERS).orderBy('createdAt','desc').get().catch(() => ({ docs: [] })),
        userCol(Collections.TASKS).get().catch(() => ({ docs: [] })),
      ]);
      this._members = memberSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._tasks   = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._populateDeptFilter();
      this._renderStats();
      this._renderList();
      // Update sidebar badge
      const badge = document.getElementById('team-count-badge');
      if (badge) { badge.textContent = this._members.length; badge.style.display = this._members.length ? '' : 'none'; }
    } catch(e) { console.error('Team load error:', e); }
  },

  _populateDeptFilter() {
    const depts = [...new Set(this._members.map(m => m.department).filter(Boolean))];
    const sel   = document.getElementById('team-filter-dept');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = `<option value="all">${i18n.t('team_all_depts')}</option>` +
        depts.map(d => `<option value="${d}" ${d===cur?'selected':''}>${escapeHtml(d)}</option>`).join('');
    }
  },

  _renderStats() {
    const el     = document.getElementById('team-stats-row');
    if (!el) return;
    const active = this._members.filter(m => m.status === 'active').length;
    const byRole = this._members.reduce((acc, m) => { acc[m.role] = (acc[m.role]||0)+1; return acc; }, {});
    const depts  = new Set(this._members.map(m => m.department).filter(Boolean)).size;
    el.innerHTML = `<div class="kpi-grid-4" style="margin-bottom:0">
      <div class="kpi-card-v4">
        <div class="kpi-card-v4-top"><div class="kpi-card-v4-icon" style="background:rgba(201,151,42,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div></div>
        <div class="kpi-card-v4-value">${this._members.length}</div>
        <div class="kpi-card-v4-label">Membres totaux</div>
      </div>
      <div class="kpi-card-v4">
        <div class="kpi-card-v4-top"><div class="kpi-card-v4-icon" style="background:rgba(34,197,94,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div></div>
        <div class="kpi-card-v4-value">${active}</div>
        <div class="kpi-card-v4-label">Membres actifs</div>
      </div>
      <div class="kpi-card-v4">
        <div class="kpi-card-v4-top"><div class="kpi-card-v4-icon" style="background:rgba(99,102,241,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div>
        <div class="kpi-card-v4-value">${depts}</div>
        <div class="kpi-card-v4-label">Départements</div>
      </div>
      <div class="kpi-card-v4">
        <div class="kpi-card-v4-top"><div class="kpi-card-v4-icon" style="background:rgba(245,158,11,.1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/></svg></div></div>
        <div class="kpi-card-v4-value">${this._tasks.filter(t=>t.status!=='done').length}</div>
        <div class="kpi-card-v4-label">Tâches en cours</div>
      </div>
    </div>`;
  },

  _filtered() {
    return this._members.filter(m => {
      if (this._filterRole !== 'all' && m.role !== this._filterRole) return false;
      if (this._filterDept !== 'all' && m.department !== this._filterDept) return false;
      if (this._searchQuery && !m.name?.toLowerCase().includes(this._searchQuery) && !m.department?.toLowerCase().includes(this._searchQuery)) return false;
      return true;
    });
  },

  _workload(memberId) {
    const activeTasks = this._tasks.filter(t => t.assigneeId === memberId && t.status !== 'done').length;
    if (activeTasks >= 8) return { label: 'Surchargé', cls: 'workload-high' };
    if (activeTasks >= 4) return { label: 'Occupé', cls: 'workload-mid' };
    return { label: 'Disponible', cls: 'workload-low' };
  },

  _renderList() {
    const members = this._filtered();
    const content = document.getElementById('team-content');
    if (!content) return;
    if (!members.length) {
      content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;opacity:.4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p style="font-size:.88rem">${this._members.length ? i18n.t('no_results') : 'Aucun membre dans l\'équipe. Ajoutez votre premier membre !'}</p>
      </div>`; return;
    }
    content.innerHTML = `<div class="team-grid">${members.map(m => this._memberCard(m)).join('')}</div>`;
    content.querySelectorAll('.member-card').forEach(card => {
      card.querySelector('.member-card-edit')?.addEventListener('click', e => { e.stopPropagation(); this._openModal(card.dataset.id); });
      card.querySelector('.member-card-del')?.addEventListener('click', e => { e.stopPropagation(); this._delete(card.dataset.id); });
    });
  },

  _memberCard(m) {
    const activeTasks = this._tasks.filter(t => t.assigneeId === m.id && t.status !== 'done').length;
    const doneTasks   = this._tasks.filter(t => t.assigneeId === m.id && t.status === 'done').length;
    const totalTasks  = activeTasks + doneTasks;
    const perf        = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
    const workload    = this._workload(m.id);
    const roleClass   = { admin:'role-admin', manager:'role-manager', member:'role-member', intern:'role-intern' }[m.role] || 'role-member';
    const roleLabel   = { admin: i18n.t('team_role_admin'), manager: i18n.t('team_role_manager'), member: i18n.t('team_role_member'), intern: i18n.t('team_role_intern') }[m.role] || m.role;
    const isActive    = m.status !== 'inactive';
    return `<div class="member-card" data-id="${m.id}">
      <div class="member-card-top">
        <div class="member-avatar-lg" style="background:${m.avatarColor||'#C9972A'};opacity:${isActive?1:.6}">
          ${Format.initials(m.name)}
        </div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(m.name)}</div>
          <div class="member-role-dept">
            <span class="role-badge ${roleClass}">${roleLabel}</span>
            ${m.department ? `<span style="margin-left:6px;color:var(--text-muted);font-size:.72rem">${escapeHtml(m.department)}</span>` : ''}
          </div>
          ${!isActive ? '<div style="font-size:.68rem;color:var(--status-blocked);margin-top:2px">Inactif</div>' : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="icon-btn btn-sm member-card-edit" title="${i18n.t('edit')}"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-btn btn-sm member-card-del" title="${i18n.t('delete')}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
        </div>
      </div>
      ${m.email ? `<div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px">✉ ${escapeHtml(m.email)}</div>` : ''}
      <div style="margin-bottom:10px">
        <span class="workload-chip ${workload.cls}">${workload.label} · ${activeTasks} tâche(s)</span>
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-muted);margin-bottom:4px">
          <span>${i18n.t('team_performance')}</span><span style="font-weight:600;color:var(--navy)">${perf}%</span>
        </div>
        <div class="perf-bar"><div class="perf-bar-fill" style="width:${perf}%;background:${perf>=70?'var(--status-active)':perf>=40?'var(--status-pending)':'var(--status-blocked)'}"></div></div>
      </div>
      <div class="member-stats">
        <div class="member-stat"><div class="member-stat-val">${activeTasks}</div><div class="member-stat-label">Actives</div></div>
        <div class="member-stat"><div class="member-stat-val">${doneTasks}</div><div class="member-stat-label">Faites</div></div>
        <div class="member-stat"><div class="member-stat-val">${perf}%</div><div class="member-stat-label">Efficacité</div></div>
      </div>
    </div>`;
  },

  _openModal(id = null) {
    this._editId = id;
    const titleEl = document.getElementById('modal-member-title');
    if (id) {
      const m = this._members.find(x => x.id === id);
      if (!m) return;
      if (titleEl) titleEl.textContent = i18n.t('edit') + ' — ' + m.name;
      const setV = (el, v) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
      setV('member-name', m.name); setV('member-email', m.email); setV('member-phone', m.phone);
      setV('member-dept', m.department); setV('member-notes', m.notes);
      const rs = document.getElementById('member-role'); if (rs) rs.value = m.role || 'member';
      const ss = document.getElementById('member-status'); if (ss) ss.value = m.status || 'active';
      this._selectedColor = m.avatarColor || this._avatarColors[0];
    } else {
      if (titleEl) titleEl.textContent = i18n.t('team_new');
      ['member-name','member-email','member-phone','member-dept','member-notes'].forEach(e => { const el = document.getElementById(e); if (el) el.value = ''; });
      const rs = document.getElementById('member-role'); if (rs) rs.value = 'member';
      const ss = document.getElementById('member-status'); if (ss) ss.value = 'active';
      this._selectedColor = this._avatarColors[0];
    }
    const err = document.getElementById('member-name-err'); if (err) err.textContent = '';
    // Update color picker selection
    this._panel.querySelectorAll('.avatar-color-dot').forEach(dot => {
      dot.style.borderColor = dot.dataset.color === this._selectedColor ? '#0F1B2D' : 'transparent';
    });
    Modal.open('modal-member');
  },

  async _save() {
    const nameEl = document.getElementById('member-name');
    const name   = nameEl?.value.trim();
    const errEl  = document.getElementById('member-name-err');
    if (!name) { if (errEl) errEl.textContent = i18n.t('required'); nameEl?.focus(); return; }
    if (errEl) errEl.textContent = '';
    const data = {
      name,
      email:       document.getElementById('member-email')?.value.trim() || '',
      phone:       document.getElementById('member-phone')?.value.trim() || '',
      role:        document.getElementById('member-role')?.value || 'member',
      department:  document.getElementById('member-dept')?.value.trim() || '',
      status:      document.getElementById('member-status')?.value || 'active',
      avatarColor: this._selectedColor || this._avatarColors[0],
      notes:       document.getElementById('member-notes')?.value.trim() || '',
      updatedAt:   new Date().toISOString(),
    };
    const btn = document.getElementById('member-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = i18n.t('saving'); }
    try {
      if (this._editId) {
        await userCol(Collections.TEAM_MEMBERS).doc(this._editId).update(data);
        Toast.success(i18n.t('success_updated'), name);
      } else {
        await userCol(Collections.TEAM_MEMBERS).add({ ...data, createdAt: new Date().toISOString() });
        Toast.success(i18n.t('success_created'), name);
      }
      Modal.close('modal-member');
      await this._load();
    } catch(e) { Toast.error(i18n.t('error_generic'), e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = i18n.t('save'); } }
  },

  async _delete(id) {
    const m = this._members.find(x => x.id === id);
    Modal.confirm({
      title: i18n.t('confirm_delete_title'),
      message: i18n.t('confirm_delete_msg'),
      confirmText: i18n.t('delete'),
      onConfirm: async () => {
        await userCol(Collections.TEAM_MEMBERS).doc(id).delete();
        Toast.success(i18n.t('success_deleted'), m?.name || '');
        await this._load();
      }
    });
  },

  _exportCSV() {
    const headers = ['Nom','Email','Téléphone','Rôle','Département','Statut','Tâches actives','Performance%'];
    const rows    = this._filtered().map(m => {
      const active = this._tasks.filter(t => t.assigneeId === m.id && t.status !== 'done').length;
      const done   = this._tasks.filter(t => t.assigneeId === m.id && t.status === 'done').length;
      const total  = active + done;
      const perf   = total ? Math.round(done/total*100) : 0;
      return [m.name, m.email||'', m.phone||'', m.role||'', m.department||'', m.status||'active', active, perf];
    });
    const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='equipe-kantara.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export','Fichier CSV téléchargé');
  },
};
