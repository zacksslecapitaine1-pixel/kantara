// ═══════════════════════════════════════════════
// KANTARA v4 — Documents Module
// Gestion de fichiers, liens, versioning,
// catégorisation par projet/tâche
// ═══════════════════════════════════════════════

const Documents = {

  _panel: null, _docs: [], _projects: [],
  _filterType: 'all', _filterProject: 'all', _searchQuery: '',
  _editId: null,

  async init(panel) { this._panel = panel; this._render(); await this._load(); },
  async refresh()   { await this._load(); },

  _render() {
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('documents_title')}</h2>
          <p class="page-header-subtitle">${i18n.t('documents_subtitle')}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-export" id="doc-export-btn">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" id="doc-new-btn">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${i18n.t('document_new')}
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar" style="max-width:280px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="doc-search" placeholder="${i18n.t('search')}"/>
        </div>
        <select class="filter-select" id="doc-filter-type">
          <option value="all">${i18n.t('document_all_types')}</option>
          <option value="pdf">PDF</option>
          <option value="image">Image</option>
          <option value="excel">Excel</option>
          <option value="word">Word</option>
          <option value="link">Lien</option>
          <option value="other">Autre</option>
        </select>
        <select class="filter-select" id="doc-filter-project">
          <option value="all">Tous les projets</option>
        </select>
      </div>
      <!-- Stats -->
      <div id="doc-stats-row" style="margin-bottom:20px"></div>
      <div id="doc-content"></div>

      <!-- Modal Document -->
      <div class="modal-overlay" id="modal-document" style="display:none">
        <div class="modal modal-md">
          <div class="modal-header">
            <div class="modal-title" id="modal-doc-title">${i18n.t('document_new')}</div>
            <button class="modal-close" onclick="Modal.close('modal-document')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="field-group">
              <div class="field">
                <label class="field-label">${i18n.t('document_title')} <span class="field-required">*</span></label>
                <input type="text" class="field-input" id="doc-title-input" placeholder="Ex: Contrat client, Plan de chantier..."/>
                <span class="field-error" id="doc-title-err"></span>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">${i18n.t('document_type')}</label>
                  <select class="field-select" id="doc-type-sel">
                    <option value="pdf">PDF</option>
                    <option value="image">Image</option>
                    <option value="excel">Excel / Tableur</option>
                    <option value="word">Word / Document</option>
                    <option value="link">Lien URL</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">${i18n.t('document_project')}</label>
                  <select class="field-select" id="doc-project-sel"><option value="">${i18n.t('none')}</option></select>
                </div>
              </div>
              <div class="field">
                <label class="field-label">${i18n.t('document_url')}</label>
                <input type="url" class="field-input" id="doc-url-input" placeholder="https://..."/>
                <span style="font-size:.72rem;color:var(--text-muted);margin-top:4px;display:block">Collez l'URL du fichier (Google Drive, Dropbox, OneDrive...)</span>
              </div>
              <div class="field">
                <label class="field-label">${i18n.t('notes')}</label>
                <textarea class="field-textarea" id="doc-notes" rows="2" placeholder="${i18n.t('notes')}..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-document')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="doc-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('doc-new-btn')?.addEventListener('click', () => this._openModal());
    document.getElementById('doc-export-btn')?.addEventListener('click', () => this._exportCSV());
    document.getElementById('doc-search')?.addEventListener('input', debounce(e => { this._searchQuery = e.target.value.toLowerCase(); this._renderList(); }, 300));
    document.getElementById('doc-filter-type')?.addEventListener('change', e => { this._filterType = e.target.value; this._renderList(); });
    document.getElementById('doc-filter-project')?.addEventListener('change', e => { this._filterProject = e.target.value; this._renderList(); });
    document.getElementById('doc-save-btn')?.addEventListener('click', () => this._save());
  },

  async _load() {
    try {
      const [docSnap, projSnap] = await Promise.all([
        userCol(Collections.DOCUMENTS).orderBy('createdAt','desc').get().catch(() => ({ docs: [] })),
        userCol(Collections.PROJECTS).orderBy('name').get().catch(() => ({ docs: [] })),
      ]);
      this._docs     = docSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._projects = projSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._populateProjectFilter();
      this._renderStats();
      this._renderList();
    } catch(e) { console.error('Documents load error:', e); }
  },

  _populateProjectFilter() {
    const sel = document.getElementById('doc-filter-project');
    if (sel) sel.innerHTML = `<option value="all">Tous les projets</option>` +
      this._projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  },

  _renderStats() {
    const el = document.getElementById('doc-stats-row');
    if (!el) return;
    const byType = this._docs.reduce((a, d) => { a[d.type] = (a[d.type]||0)+1; return a; }, {});
    el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">
      ${Object.entries({ pdf:'PDF', image:'Images', excel:'Excel', word:'Word', link:'Liens', other:'Autres' }).map(([k,label]) =>
        `<div class="kpi-card-v4" style="flex:1;min-width:100px;padding:14px 16px">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="doc-icon ${this._iconClass(k)}" style="width:32px;height:32px;font-size:.9rem">${this._typeEmoji(k)}</div>
            <div><div class="kpi-card-v4-value" style="font-size:1.3rem">${byType[k]||0}</div><div class="kpi-card-v4-label">${label}</div></div>
          </div>
        </div>`
      ).join('')}
    </div>`;
  },

  _filtered() {
    return this._docs.filter(d => {
      if (this._filterType !== 'all' && d.type !== this._filterType) return false;
      if (this._filterProject !== 'all' && d.projectId !== this._filterProject) return false;
      if (this._searchQuery && !d.title?.toLowerCase().includes(this._searchQuery) && !d.notes?.toLowerCase().includes(this._searchQuery)) return false;
      return true;
    });
  },

  _typeEmoji(type) {
    return { pdf:'📄', image:'🖼️', excel:'📊', word:'📝', link:'🔗', other:'📎' }[type] || '📎';
  },
  _iconClass(type) {
    return { pdf:'doc-icon-pdf', image:'doc-icon-image', excel:'doc-icon-excel', word:'doc-icon-word', link:'doc-icon-link', other:'doc-icon-other' }[type] || 'doc-icon-other';
  },

  _renderList() {
    const docs    = this._filtered();
    const content = document.getElementById('doc-content');
    if (!content) return;
    if (!docs.length) {
      content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;opacity:.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size:.88rem">${this._docs.length ? i18n.t('no_results') : 'Aucun document. Ajoutez votre premier document !'}</p>
      </div>`; return;
    }
    content.innerHTML = `<div class="doc-grid">${docs.map(d => this._docCard(d)).join('')}</div>`;
    content.querySelectorAll('.doc-card').forEach(card => {
      card.querySelector('.doc-open-btn')?.addEventListener('click', e => { e.stopPropagation(); const doc = this._docs.find(d => d.id === card.dataset.id); if (doc?.url) window.open(doc.url, '_blank'); });
      card.querySelector('.doc-edit-btn')?.addEventListener('click', e => { e.stopPropagation(); this._openModal(card.dataset.id); });
      card.querySelector('.doc-del-btn')?.addEventListener('click', e => { e.stopPropagation(); this._delete(card.dataset.id); });
    });
  },

  _docCard(d) {
    const proj = this._projects.find(p => p.id === d.projectId);
    return `<div class="doc-card" data-id="${d.id}">
      <div class="doc-icon ${this._iconClass(d.type)}">${this._typeEmoji(d.type)}</div>
      <div class="doc-info">
        <div class="doc-name" title="${escapeHtml(d.title)}">${escapeHtml(d.title)}</div>
        <div class="doc-meta">
          ${proj ? `📁 ${escapeHtml(proj.name)} · ` : ''}
          ${Format.date(new Date(d.createdAt))}
        </div>
        ${d.notes ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.notes)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px">
          ${d.url ? `<button class="btn btn-outline btn-sm doc-open-btn" style="font-size:.72rem;padding:3px 10px">${i18n.t('document_open')} ↗</button>` : ''}
          <button class="icon-btn btn-sm doc-edit-btn" title="${i18n.t('edit')}"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-btn btn-sm doc-del-btn" title="${i18n.t('delete')}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
        </div>
      </div>
    </div>`;
  },

  _openModal(id = null) {
    this._editId = id;
    const titleEl  = document.getElementById('modal-doc-title');
    const projSel  = document.getElementById('doc-project-sel');
    if (projSel) projSel.innerHTML = `<option value="">${i18n.t('none')}</option>` +
      this._projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if (id) {
      const d = this._docs.find(x => x.id === id);
      if (!d) return;
      if (titleEl) titleEl.textContent = i18n.t('edit');
      const setV = (el, v) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
      setV('doc-title-input', d.title); setV('doc-url-input', d.url); setV('doc-notes', d.notes);
      const ts = document.getElementById('doc-type-sel'); if (ts) ts.value = d.type || 'other';
      if (projSel) projSel.value = d.projectId || '';
    } else {
      if (titleEl) titleEl.textContent = i18n.t('document_new');
      ['doc-title-input','doc-url-input','doc-notes'].forEach(e => { const el = document.getElementById(e); if (el) el.value = ''; });
      const ts = document.getElementById('doc-type-sel'); if (ts) ts.value = 'other';
    }
    const err = document.getElementById('doc-title-err'); if (err) err.textContent = '';
    Modal.open('modal-document');
  },

  async _save() {
    const titleEl = document.getElementById('doc-title-input');
    const title   = titleEl?.value.trim();
    const errEl   = document.getElementById('doc-title-err');
    if (!title) { if (errEl) errEl.textContent = i18n.t('required'); titleEl?.focus(); return; }
    if (errEl) errEl.textContent = '';
    const data = {
      title,
      type:      document.getElementById('doc-type-sel')?.value || 'other',
      url:       document.getElementById('doc-url-input')?.value.trim() || '',
      projectId: document.getElementById('doc-project-sel')?.value || '',
      notes:     document.getElementById('doc-notes')?.value.trim() || '',
      updatedAt: new Date().toISOString(),
    };
    const btn = document.getElementById('doc-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = i18n.t('saving'); }
    try {
      if (this._editId) {
        await userCol(Collections.DOCUMENTS).doc(this._editId).update(data);
        Toast.success(i18n.t('success_updated'), title);
      } else {
        await userCol(Collections.DOCUMENTS).add({ ...data, createdAt: new Date().toISOString() });
        Toast.success(i18n.t('success_created'), title);
        ActivityLog.add('document_created', `Nouveau document : "${title}"`);
      }
      Modal.close('modal-document');
      await this._load();
    } catch(e) { Toast.error(i18n.t('error_generic'), e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = i18n.t('save'); } }
  },

  async _delete(id) {
    const d = this._docs.find(x => x.id === id);
    Modal.confirm({
      title: i18n.t('confirm_delete_title'),
      message: i18n.t('confirm_delete_msg'),
      confirmText: i18n.t('delete'),
      onConfirm: async () => {
        await userCol(Collections.DOCUMENTS).doc(id).delete();
        Toast.success(i18n.t('success_deleted'), d?.title || '');
        await this._load();
      }
    });
  },

  _exportCSV() {
    const headers = ['Titre','Type','Projet','URL','Notes','Date'];
    const rows    = this._filtered().map(d => {
      const proj = this._projects.find(p => p.id === d.projectId)?.name || '';
      return [d.title, d.type, proj, d.url||'', d.notes||'', d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''];
    });
    const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='documents-kantara.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export','Fichier CSV téléchargé');
  },
};
