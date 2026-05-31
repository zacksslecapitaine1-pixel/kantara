// ═══════════════════════════════════════════════
// KANTARA v4 — Tasks Module
// Nouvelles fonctionnalités: tags, checklist,
// estimation de temps, assigné, vue liste/kanban,
// export CSV, tâches récurrentes
// ═══════════════════════════════════════════════

const Tasks = {

  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
  _panel: null, _tasks: [], _projects: [], _teamMembers: [],
  _filterStatus: 'all', _filterProject: 'all', _filterPriority: 'all',
  _searchQuery: '', _view: 'kanban',
  _editId: null,
  _checklistItems: [],
  _tagsList: [],
  _activeTimer: null, _timerStart: null, _timerInterval: null,

  async init(panel) { this._panel = panel; this._render(); await this._load(); },
  async refresh()    { await this._load(); },

  _render() {
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('tasks_title')}</h2>
          <p class="page-header-subtitle">${i18n.t('tasks_subtitle')}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-export" id="task-export-btn">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${i18n.t('task_export_csv')}
          </button>
          <button class="btn btn-outline btn-sm" id="task-view-toggle" title="Changer la vue">
            <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button class="btn btn-primary" id="task-new-btn">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${i18n.t('task_new')}
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar" style="max-width:250px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="task-search" placeholder="${i18n.t('search')}"/>
        </div>
        <select class="filter-select" id="task-filter-project"><option value="all">${i18n.t('all')} ${i18n.t('nav_projects')}</option></select>
        <select class="filter-select" id="task-filter-status">
          <option value="all">${i18n.t('all')} ${i18n.t('status')}</option>
          <option value="todo">${i18n.t('task_todo')}</option>
          <option value="inprogress">${i18n.t('task_inprogress')}</option>
          <option value="done">${i18n.t('task_done')}</option>
          <option value="blocked">${i18n.t('task_blocked')}</option>
        </select>
        <select class="filter-select" id="task-filter-priority">
          <option value="all">${i18n.t('all')}</option>
          <option value="high">${i18n.t('project_priority_high')}</option>
          <option value="medium">${i18n.t('project_priority_medium')}</option>
          <option value="low">${i18n.t('project_priority_low')}</option>
        </select>
      </div>
      <div id="task-content"></div>

      <!-- Modal Task v4 -->
      <div class="modal-overlay" id="modal-task" style="display:none">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-task-title">${i18n.t('task_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-task')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <!-- Tab bar -->
          <div class="modal-tab-bar">
            <div class="modal-tab-btn active" data-tab="details">${i18n.t('task_tab_details')}</div>
            <div class="modal-tab-btn" data-tab="checklist">${i18n.t('task_tab_checklist')} <span id="checklist-count-badge" style="margin-left:4px"></span></div>
            <div class="modal-tab-btn" data-tab="notes">${i18n.t('task_tab_notes')}</div>
          </div>
          <div class="modal-body" style="padding-top:0">
            <!-- Tab: Details -->
            <div class="modal-tab-panel active" id="tab-details">
              <div class="field-group" style="padding-top:20px">
                <div class="field">
                  <label class="field-label">${i18n.t('task_title')} <span class="field-required">*</span></label>
                  <input type="text" class="field-input" id="task-title-input" placeholder="Ex: Pose des fondations"/>
                  <span class="field-error" id="task-title-err"></span>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('task_project')}</label>
                    <select class="field-select" id="task-project-sel"><option value="">${i18n.t('none')}</option></select>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('task_assignee')}</label>
                    <select class="field-select" id="task-assignee-sel"><option value="">${i18n.t('none')}</option></select>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('status')}</label>
                    <select class="field-select" id="task-status-sel">
                      <option value="todo">${i18n.t('task_todo')}</option>
                      <option value="inprogress">${i18n.t('task_inprogress')}</option>
                      <option value="done">${i18n.t('task_done')}</option>
                      <option value="blocked">${i18n.t('task_blocked')}</option>
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('priority')}</label>
                    <select class="field-select" id="task-priority-sel">
                      <option value="high">${i18n.t('project_priority_high')}</option>
                      <option value="medium" selected>${i18n.t('project_priority_medium')}</option>
                      <option value="low">${i18n.t('project_priority_low')}</option>
                    </select>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field">
                    <label class="field-label">${i18n.t('task_due_date')}</label>
                    <input type="date" class="field-input" id="task-due"/>
                  </div>
                  <div class="field">
                    <label class="field-label">${i18n.t('task_time_estimate')}</label>
                    <input type="number" class="field-input" id="task-estimate" placeholder="0" min="0" step="0.5"/>
                  </div>
                </div>
                <!-- Tags -->
                <div class="field">
                  <label class="field-label">${i18n.t('task_tags')}</label>
                  <div class="tag-input-wrapper" id="tag-input-wrapper">
                    <input type="text" id="tag-input" placeholder="${i18n.t('task_tags_placeholder')}"/>
                  </div>
                </div>
                <!-- Récurrence -->
                <div class="field-row">
                  <div class="field" style="flex:0 0 auto">
                    <label class="field-label">${i18n.t('task_recurring')}</label>
                    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer">
                      <input type="checkbox" id="task-recurring-chk" style="width:16px;height:16px;accent-color:var(--gold)"/>
                      <span style="font-size:.83rem;color:var(--text-secondary)">${i18n.t('task_recurring')}</span>
                    </label>
                  </div>
                  <div class="field" id="recurring-period-field" style="display:none">
                    <label class="field-label">${i18n.t('task_recurring_period')}</label>
                    <select class="field-select" id="task-period-sel">
                      <option value="daily">${i18n.t('task_period_daily')}</option>
                      <option value="weekly" selected>${i18n.t('task_period_weekly')}</option>
                      <option value="monthly">${i18n.t('task_period_monthly')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <!-- Tab: Checklist -->
            <div class="modal-tab-panel" id="tab-checklist" style="padding:20px 0">
              <div id="checklist-items-container" class="checklist-container"></div>
              <div class="checklist-add-row" style="padding:0 4px">
                <input type="text" class="field-input" id="checklist-new-input" placeholder="${i18n.t('task_checklist_add')}..." style="flex:1"/>
                <button class="btn btn-outline btn-sm" id="checklist-add-btn">+ ${i18n.t('add')}</button>
              </div>
            </div>
            <!-- Tab: Notes -->
            <div class="modal-tab-panel" id="tab-notes" style="padding:20px 0">
              <div class="field">
                <label class="field-label">${i18n.t('notes')}</label>
                <textarea class="field-textarea" id="task-desc" rows="5" placeholder="${i18n.t('description')}..."></textarea>
              </div>
              <div class="field" style="margin-top:12px">
                <label class="field-label">${i18n.t('task_issue')}</label>
                <textarea class="field-textarea" id="task-issue" rows="3" placeholder="${i18n.getLang()==='fr'?'Décrivez tout problème rencontré...':'Describe any issue encountered...'}"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-task')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="task-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('task-new-btn')?.addEventListener('click', () => this._openModal());
    document.getElementById('task-search')?.addEventListener('input', debounce(e => { this._searchQuery = e.target.value.toLowerCase(); this._renderList(); }, 300));
    document.getElementById('task-filter-status')?.addEventListener('change', e => { this._filterStatus = e.target.value; this._renderList(); });
    document.getElementById('task-filter-project')?.addEventListener('change', e => { this._filterProject = e.target.value; this._renderList(); });
    document.getElementById('task-filter-priority')?.addEventListener('change', e => { this._filterPriority = e.target.value; this._renderList(); });
    document.getElementById('task-view-toggle')?.addEventListener('click', () => { this._view = this._view === 'kanban' ? 'list' : 'kanban'; this._renderList(); });
    document.getElementById('task-save-btn')?.addEventListener('click', () => this._save());
    document.getElementById('task-export-btn')?.addEventListener('click', () => this._exportCSV());
    // Tab switching
    this._panel.querySelectorAll('.modal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._panel.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
        this._panel.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('tab-' + tab)?.classList.add('active');
      });
    });
    // Tags input
    document.getElementById('tag-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._addTag(e.target.value.trim()); e.target.value = ''; }
    });
    // Checklist
    document.getElementById('checklist-add-btn')?.addEventListener('click', () => {
      const inp = document.getElementById('checklist-new-input');
      if (inp?.value.trim()) { this._addChecklistItem(inp.value.trim()); inp.value = ''; }
    });
    document.getElementById('checklist-new-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const inp = e.target; if (inp.value.trim()) { this._addChecklistItem(inp.value.trim()); inp.value = ''; } }
    });
    // Recurring toggle
    document.getElementById('task-recurring-chk')?.addEventListener('change', (e) => {
      const f = document.getElementById('recurring-period-field');
      if (f) f.style.display = e.target.checked ? '' : 'none';
    });
  },

  async _load() {
    try {
      const [tasksSnap, projectsSnap, teamSnap] = await Promise.all([
        userCol(Collections.TASKS).orderBy('createdAt','desc').get(),
        userCol(Collections.PROJECTS).orderBy('name').get(),
        userCol(Collections.TEAM_MEMBERS).orderBy('name').get().catch(() => ({ docs: [] })),
      ]);
      this._tasks       = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._projects    = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._teamMembers = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderList();
      this._populateFilters();
    } catch(e) { console.error('Tasks load error:', e); }
  },

  _populateFilters() {
    const sel = document.getElementById('task-filter-project');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = `<option value="all">${i18n.t('all')} ${i18n.t('nav_projects')}</option>` +
        this._projects.map(p => `<option value="${p.id}" ${p.id===cur?'selected':''}>${p.name}</option>`).join('');
    }
  },

  _filtered() {
    return this._tasks.filter(t => {
      if (this._filterStatus !== 'all' && t.status !== this._filterStatus) return false;
      if (this._filterProject !== 'all' && t.projectId !== this._filterProject) return false;
      if (this._filterPriority !== 'all' && t.priority !== this._filterPriority) return false;
      if (this._searchQuery) {
        const q = this._searchQuery;
        const tags = Array.isArray(t.tags) ? t.tags.join(' ').toLowerCase() : '';
        if (!t.title?.toLowerCase().includes(q) && !t.notes?.toLowerCase().includes(q) && !tags.includes(q)) return false;
      }
      return true;
    });
  },

  _renderList() {
    const tasks   = this._filtered();
    const content = document.getElementById('task-content');
    if (!content) return;
    if (!tasks.length) {
      content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;opacity:.4"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <p style="font-size:.88rem">${i18n.t('no_results')}</p>
      </div>`; return;
    }
    if (this._view === 'kanban') this._renderKanban(tasks, content);
    else this._renderTableView(tasks, content);
  },

  _renderKanban(tasks, content) {
    const cols = [
      { key: 'todo',       label: i18n.t('task_todo'),       color: 'var(--text-muted)' },
      { key: 'inprogress', label: i18n.t('task_inprogress'), color: 'var(--status-pending)' },
      { key: 'done',       label: i18n.t('task_done'),       color: 'var(--status-active)' },
      { key: 'blocked',    label: i18n.t('task_blocked'),    color: 'var(--status-blocked)' },
    ];
    content.innerHTML = `<div class="kanban-board">${cols.map(col => {
      const colTasks = tasks.filter(t => t.status === col.key);
      return `<div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:${col.color}">${col.label}</span>
          <span class="kanban-col-count">${colTasks.length}</span>
        </div>
        ${colTasks.map(t => this._kanbanCard(t)).join('')}
      </div>`;
    }).join('')}</div>`;
    content.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => this._openModal(card.dataset.id));
    });
  },

  _kanbanCard(t) {
    const proj = this._projects.find(p => p.id === t.projectId);
    const tags  = Array.isArray(t.tags) ? t.tags : [];
    const checklist = Array.isArray(t.checklist) ? t.checklist : [];
    const chkDone   = checklist.filter(c => c.done).length;
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';
    const pColor = { high:'var(--status-blocked)', medium:'var(--status-pending)', low:'var(--status-active)' }[t.priority] || 'var(--text-muted)';
    const member = this._teamMembers.find(m => m.id === t.assigneeId);
    return `<div class="kanban-card" data-id="${t.id}" style="border-left:3px solid ${pColor}">
      <div class="kanban-card-title">${escapeHtml(t.title)}</div>
      ${proj ? `<div style="font-size:.7rem;color:var(--gold-muted);margin-bottom:6px">📁 ${escapeHtml(proj.name)}</div>` : ''}
      ${tags.length ? `<div class="tags-row">${tags.slice(0,3).map(tg => `<span class="tag-chip tag-chip-sm" style="background:rgba(201,151,42,.1);color:var(--gold-muted)">${escapeHtml(tg)}</span>`).join('')}</div>` : ''}
      <div class="kanban-card-meta" style="margin-top:8px">
        ${t.dueDate ? `<span ${isOverdue?'style="color:var(--status-blocked);font-weight:600"':''}>${isOverdue?'⚠ ':''}${Format.date(this._toDate(t.dueDate))}</span>` : ''}
        ${t.timeEstimate ? `<span>⏱ ${t.timeEstimate}h</span>` : ''}
        ${checklist.length ? `<span>☑ ${chkDone}/${checklist.length}</span>` : ''}
        ${member ? `<span style="display:inline-flex;align-items:center;gap:4px"><span class="assignee-avatar-sm" style="background:${member.avatarColor||'#C9972A'}">${Format.initials(member.name)}</span>${escapeHtml(member.name.split(' ')[0])}</span>` : ''}
        ${t.isRecurring ? '<span title="Récurrent">🔄</span>' : ''}
      </div>
    </div>`;
  },

  _renderTableView(tasks, content) {
    content.innerHTML = `<div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>${i18n.t('task_title')}</th>
          <th>${i18n.t('status')}</th>
          <th>${i18n.t('priority')}</th>
          <th>${i18n.t('task_project')}</th>
          <th>${i18n.t('task_assignee')}</th>
          <th>${i18n.t('task_due_date')}</th>
          <th>${i18n.t('task_tags')}</th>
          <th></th>
        </tr></thead>
        <tbody>${tasks.map(t => {
          const proj   = this._projects.find(p => p.id === t.projectId);
          const member = this._teamMembers.find(m => m.id === t.assigneeId);
          const tags   = Array.isArray(t.tags) ? t.tags : [];
          const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';
          const statusColor = { todo:'var(--text-muted)', inprogress:'var(--status-pending)', done:'var(--status-active)', blocked:'var(--status-blocked)' };
          const pColor = { high:'var(--status-blocked)', medium:'var(--status-pending)', low:'var(--status-active)' };
          return `<tr class="table-row" data-id="${t.id}" style="cursor:pointer">
            <td><span style="font-weight:500;color:var(--navy)">${escapeHtml(t.title)}</span>${t.isRecurring?'<span style="margin-left:6px;font-size:.7rem">🔄</span>':''}</td>
            <td><span class="status-badge" style="background:${statusColor[t.status]}22;color:${statusColor[t.status]};border-color:${statusColor[t.status]}44">${i18n.t('task_'+t.status)||t.status}</span></td>
            <td><span style="color:${pColor[t.priority]||'var(--text-muted)'};font-size:.8rem;font-weight:600">${i18n.t('project_priority_'+t.priority)||t.priority}</span></td>
            <td>${proj ? escapeHtml(proj.name) : '—'}</td>
            <td>${member ? `<span style="display:inline-flex;align-items:center;gap:6px"><span class="assignee-avatar-sm" style="background:${member.avatarColor||'#C9972A'}">${Format.initials(member.name)}</span>${escapeHtml(member.name)}</span>` : '—'}</td>
            <td ${isOverdue?'style="color:var(--status-blocked);font-weight:600"':''}>${t.dueDate ? Format.date(this._toDate(t.dueDate)) : '—'}</td>
            <td>${tags.slice(0,2).map(tg=>`<span class="tag-chip tag-chip-sm" style="background:rgba(201,151,42,.1);color:var(--gold-muted)">${escapeHtml(tg)}</span>`).join(' ')}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn btn-sm task-edit-btn" data-id="${t.id}" title="${i18n.t('edit')}">
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn btn-sm task-del-btn" data-id="${t.id}" title="${i18n.t('delete')}">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
    content.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.task-edit-btn') || e.target.closest('.task-del-btn')) return;
        this._openModal(row.dataset.id);
      });
    });
    content.querySelectorAll('.task-edit-btn').forEach(btn => btn.addEventListener('click', () => this._openModal(btn.dataset.id)));
    content.querySelectorAll('.task-del-btn').forEach(btn => btn.addEventListener('click', () => this._delete(btn.dataset.id)));
  },

  _openModal(id = null) {
    this._editId      = id;
    this._checklistItems = [];
    this._tagsList    = [];

    // Reset tab to details
    this._panel.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    this._panel.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
    this._panel.querySelector('.modal-tab-btn[data-tab="details"]')?.classList.add('active');
    document.getElementById('tab-details')?.classList.add('active');

    // Populate projects and assignees
    const projSel = document.getElementById('task-project-sel');
    if (projSel) projSel.innerHTML = `<option value="">${i18n.t('none')}</option>` +
      this._projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const assignSel = document.getElementById('task-assignee-sel');
    if (assignSel) assignSel.innerHTML = `<option value="">${i18n.t('none')}</option>` +
      this._teamMembers.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');

    const titleEl = document.getElementById('modal-task-title');

    if (id) {
      const t = this._tasks.find(x => x.id === id);
      if (!t) return;
      if (titleEl) titleEl.textContent = i18n.t('edit');
      const setVal = (el, v) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
      setVal('task-title-input', t.title);
      setVal('task-desc', t.notes);
      setVal('task-issue', t.issue);
      setVal('task-due', t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate.split('T')[0] : Format.dateInput(this._toDate(t.dueDate))) : '');
      setVal('task-estimate', t.timeEstimate || 0);
      const ss = document.getElementById('task-status-sel'); if (ss) ss.value = t.status || 'todo';
      const ps = document.getElementById('task-priority-sel'); if (ps) ps.value = t.priority || 'medium';
      const prs = document.getElementById('task-project-sel'); if (prs) prs.value = t.projectId || '';
      const as = document.getElementById('task-assignee-sel'); if (as) as.value = t.assigneeId || '';
      // Recurring
      const rc = document.getElementById('task-recurring-chk'); if (rc) rc.checked = !!t.isRecurring;
      const rpf = document.getElementById('recurring-period-field'); if (rpf) rpf.style.display = t.isRecurring ? '' : 'none';
      const rps = document.getElementById('task-period-sel'); if (rps) rps.value = t.recurringPeriod || 'weekly';
      // Tags
      this._tagsList = Array.isArray(t.tags) ? [...t.tags] : [];
      this._renderTags();
      // Checklist
      this._checklistItems = Array.isArray(t.checklist) ? t.checklist.map(c => typeof c === 'string' ? { text: c, done: false } : { ...c }) : [];
      this._renderChecklist();
    } else {
      if (titleEl) titleEl.textContent = i18n.t('task_new');
      ['task-title-input','task-desc','task-issue','task-due','task-estimate'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
      const ss = document.getElementById('task-status-sel'); if (ss) ss.value = 'todo';
      const ps = document.getElementById('task-priority-sel'); if (ps) ps.value = 'medium';
      const rc = document.getElementById('task-recurring-chk'); if (rc) rc.checked = false;
      const rpf = document.getElementById('recurring-period-field'); if (rpf) rpf.style.display = 'none';
      this._tagsList = []; this._renderTags();
      this._checklistItems = []; this._renderChecklist();
    }
    const err = document.getElementById('task-title-err'); if (err) err.textContent = '';
    Modal.open('modal-task');
  },

  // ── Tags ──
  _addTag(tag) {
    if (!tag || this._tagsList.includes(tag)) return;
    this._tagsList.push(tag);
    this._renderTags();
  },
  _removeTag(tag) {
    this._tagsList = this._tagsList.filter(t => t !== tag);
    this._renderTags();
  },
  _renderTags() {
    const wrapper = document.getElementById('tag-input-wrapper');
    const input   = document.getElementById('tag-input');
    if (!wrapper) return;
    const chips = this._tagsList.map(tag =>
      `<span class="tag-chip tag-chip-removable" style="background:rgba(201,151,42,.12);color:var(--gold-muted)" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span class="tag-chip-x">×</span></span>`
    ).join('');
    wrapper.innerHTML = chips + (input ? '' : '<input type="text" id="tag-input" placeholder="'+i18n.t('task_tags_placeholder')+'"/>');
    if (!document.getElementById('tag-input')) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.id = 'tag-input'; inp.placeholder = i18n.t('task_tags_placeholder');
      inp.style.cssText = 'border:none;background:transparent;outline:none;font-family:var(--font-body);font-size:.85rem;color:var(--text-primary);min-width:100px;flex:1';
      wrapper.appendChild(inp);
      inp.addEventListener('keydown', (e) => { if (e.key==='Enter') { e.preventDefault(); this._addTag(e.target.value.trim()); e.target.value = ''; }});
    }
    wrapper.querySelectorAll('.tag-chip-removable').forEach(chip => {
      chip.addEventListener('click', () => this._removeTag(chip.dataset.tag));
    });
  },

  // ── Checklist ──
  _addChecklistItem(text) {
    this._checklistItems.push({ text, done: false });
    this._renderChecklist();
  },
  _renderChecklist() {
    const container = document.getElementById('checklist-items-container');
    if (!container) return;
    if (!this._checklistItems.length) {
      container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:20px 0">${i18n.t('task_no_checklist')}</p>`;
    } else {
      const done = this._checklistItems.filter(c => c.done).length;
      const pct  = Math.round(done / this._checklistItems.length * 100);
      container.innerHTML = `
        <div class="checklist-progress">
          <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${pct}%"></div></div>
          <div class="checklist-progress-text">${done}/${this._checklistItems.length} — ${pct}%</div>
        </div>
        <div style="height:12px"></div>
        ${this._checklistItems.map((item, i) => `
          <div class="checklist-item ${item.done ? 'done' : ''}" data-idx="${i}">
            <div class="checklist-checkbox ${item.done ? 'checked' : ''}" data-idx="${i}"></div>
            <span class="checklist-text">${escapeHtml(item.text)}</span>
            <div class="checklist-del" data-idx="${i}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>`).join('')}`;
    }
    const badge = document.getElementById('checklist-count-badge');
    if (badge) {
      const d = this._checklistItems.filter(c=>c.done).length;
      badge.textContent = this._checklistItems.length ? `(${d}/${this._checklistItems.length})` : '';
    }
    container.querySelectorAll('.checklist-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const i = +cb.dataset.idx;
        this._checklistItems[i].done = !this._checklistItems[i].done;
        this._renderChecklist();
      });
    });
    container.querySelectorAll('.checklist-del').forEach(btn => {
      btn.addEventListener('click', () => {
        this._checklistItems.splice(+btn.dataset.idx, 1);
        this._renderChecklist();
      });
    });
  },

  async _save() {
    const titleEl = document.getElementById('task-title-input');
    const title   = titleEl?.value.trim();
    const errEl   = document.getElementById('task-title-err');
    if (!title) { if (errEl) errEl.textContent = i18n.t('required'); titleEl?.focus(); return; }
    if (errEl) errEl.textContent = '';
    const data = {
      title,
      notes:           document.getElementById('task-desc')?.value.trim() || '',
      issue:           document.getElementById('task-issue')?.value.trim() || '',
      projectId:       document.getElementById('task-project-sel')?.value || '',
      assigneeId:      document.getElementById('task-assignee-sel')?.value || '',
      status:          document.getElementById('task-status-sel')?.value || 'todo',
      priority:        document.getElementById('task-priority-sel')?.value || 'medium',
      dueDate:         document.getElementById('task-due')?.value || '',
      timeEstimate:    parseFloat(document.getElementById('task-estimate')?.value) || 0,
      tags:            [...this._tagsList],
      checklist:       this._checklistItems.map(c => ({ text: c.text, done: c.done })),
      isRecurring:     document.getElementById('task-recurring-chk')?.checked || false,
      recurringPeriod: document.getElementById('task-period-sel')?.value || 'weekly',
      updatedAt:       new Date().toISOString(),
    };
    const btn = document.getElementById('task-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = i18n.t('saving'); }
    try {
      if (this._editId) {
        await userCol(Collections.TASKS).doc(this._editId).update(data);
        Toast.success(i18n.t('success_updated'), title);
        ActivityLog.add('task_updated', `Tâche mise à jour : "${title}"`);
      } else {
        await userCol(Collections.TASKS).add({ ...data, createdAt: new Date().toISOString() });
        Toast.success(i18n.t('success_created'), title);
        ActivityLog.add('task_created', `Nouvelle tâche : "${title}"`);
      }
      Modal.close('modal-task');
      await this._load();
    } catch(e) {
      Toast.error(i18n.t('error_generic'), e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = i18n.t('save'); }
    }
  },

  async _delete(id) {
    const t = this._tasks.find(x => x.id === id);
    Modal.confirm({
      title:       i18n.t('confirm_delete_title'),
      message:     i18n.t('confirm_delete_msg'),
      confirmText: i18n.t('delete'),
      onConfirm: async () => {
        await userCol(Collections.TASKS).doc(id).delete();
        Toast.success(i18n.t('success_deleted'), t?.title || '');
        ActivityLog.add('task_deleted', `Tâche supprimée : "${t?.title}"`);
        await this._load();
      }
    });
  },

  _exportCSV() {
    const tasks = this._filtered();
    const headers = ['Titre','Statut','Priorité','Projet','Assigné','Échéance','Estimation (h)','Tags','Récurrent'];
    const rows    = tasks.map(t => {
      const proj   = this._projects.find(p => p.id === t.projectId)?.name || '';
      const member = this._teamMembers.find(m => m.id === t.assigneeId)?.name || '';
      const tags   = Array.isArray(t.tags) ? t.tags.join(';') : '';
      return [
        t.title, t.status, t.priority, proj, member,
        t.dueDate || '', t.timeEstimate || 0, tags, t.isRecurring ? 'Oui' : 'Non'
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'taches-kantara.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export', 'Fichier CSV téléchargé');
  },
};
