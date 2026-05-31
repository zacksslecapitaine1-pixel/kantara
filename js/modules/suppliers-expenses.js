// ═══════════════════════════════════════════════
// KANTARA — Suppliers Module
// ═══════════════════════════════════════════════
const Suppliers = {

  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
  _panel:null, _suppliers:[], _searchQuery:'',

  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },

  _render(){
    this._panel.innerHTML=`
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-header-title">${i18n.t('suppliers_title')}</h2><p class="page-header-subtitle">${i18n.t('suppliers_subtitle')}</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" id="sup-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('supplier_new')}</button></div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="sup-search" placeholder="${i18n.t('search')}"/></div>
      </div>
      <div id="sup-content"></div>
      <!-- Modal -->
      <div class="modal-overlay" id="modal-supplier" style="display:none">
        <div class="modal">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-sup-title">${i18n.t('supplier_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-supplier')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body"><div class="field-group">
            <div class="field"><label class="field-label">${i18n.t('supplier_name')} <span class="field-required">*</span></label><input type="text" class="field-input" id="sup-name"/><span class="field-error" id="sup-name-err"></span></div>
            <div class="field"><label class="field-label">${i18n.t('supplier_specialty')}</label><input type="text" class="field-input" id="sup-specialty" placeholder="${i18n.getLang()==='fr'?'Ex: Matériaux de construction':'Ex: Building Materials'}"/></div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('phone')}</label><input type="tel" class="field-input" id="sup-phone"/></div>
              <div class="field"><label class="field-label">${i18n.t('email')}</label><input type="email" class="field-input" id="sup-email"/></div>
            </div>
            <div class="field"><label class="field-label">${i18n.t('address')}</label><input type="text" class="field-input" id="sup-address"/></div>
            <div class="field"><label class="field-label">${i18n.t('notes')}</label><textarea class="field-textarea" id="sup-notes" rows="2"></textarea></div>
          </div></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-supplier')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="sup-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('sup-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('sup-search')?.addEventListener('input',debounce(e=>{this._searchQuery=e.target.value.toLowerCase();this._renderList();},300));
    document.getElementById('sup-save-btn')?.addEventListener('click',()=>this._save());
  },

  async _load(){
    try{
      const snap=await userCol(Collections.SUPPLIERS).orderBy('name').get();
      this._suppliers=snap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.suppliers=this._suppliers;
      this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _renderList(){
    const el=document.getElementById('sup-content'); if(!el)return;
    const list=this._suppliers.filter(s=>!this._searchQuery||s.name.toLowerCase().includes(this._searchQuery));
    if(!list.length){
      el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div><h3 class="empty-title">${i18n.t('supplier_no_suppliers')}</h3><button class="btn btn-primary" onclick="document.getElementById('sup-new-btn').click()">+ ${i18n.t('supplier_new')}</button></div>`;
      return;
    }
    const currency=Prefs.getCurrency();
    const expenses=AppState.expenses||[];
    el.innerHTML=`<div class="grid-3">
      ${list.map(s=>{
        const spent=expenses.filter(e=>e.supplierId===s.id).reduce((sum,e)=>sum+(e.amount||0),0);
        return`<div class="card card-hoverable" style="padding:20px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div class="user-avatar" style="width:42px;height:42px;font-size:.9rem;background:linear-gradient(135deg,var(--navy-mid),var(--navy-soft))">${Format.initials(s.name)}</div>
            <div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>${s.specialty?`<div style="font-size:.72rem;color:var(--gold-muted)">${s.specialty}</div>`:''}</div>
          </div>
          ${s.phone?`<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">📞 ${s.phone}</div>`:''}
          ${s.email?`<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">✉️ ${s.email}</div>`:''}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--divider)">
            <div><div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">${i18n.t('supplier_total_spent')}</div><div style="font-family:var(--font-display);font-size:1.1rem;font-weight:600;color:var(--navy)">${Format.currency(spent,currency)}</div></div>
            <div style="display:flex;gap:4px">
              <button class="action-btn" data-sup-edit="${s.id}">${editIcon()}</button>
              <button class="action-btn delete" data-sup-delete="${s.id}">${deleteIcon()}</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
    el.querySelectorAll('[data-sup-edit]').forEach(b=>b.addEventListener('click',()=>this._openModal(b.dataset.supEdit)));
    el.querySelectorAll('[data-sup-delete]').forEach(b=>b.addEventListener('click',()=>this._delete(b.dataset.supDelete)));
  },

  _openModal(id=null){
    const titleEl=document.getElementById('modal-sup-title');
    if(titleEl)titleEl.textContent=id?i18n.t('edit'):i18n.t('supplier_new');
    if(id){
      const s=this._suppliers.find(x=>x.id===id);if(!s)return;
      document.getElementById('sup-name').value=s.name||'';
      document.getElementById('sup-specialty').value=s.specialty||'';
      document.getElementById('sup-phone').value=s.phone||'';
      document.getElementById('sup-email').value=s.email||'';
      document.getElementById('sup-address').value=s.address||'';
      document.getElementById('sup-notes').value=s.notes||'';
    }else{
      ['sup-name','sup-specialty','sup-phone','sup-email','sup-address','sup-notes'].forEach(fid=>{const el=document.getElementById(fid);if(el)el.value='';});
    }
    document.getElementById('sup-save-btn').dataset.editId=id||'';
    Modal.open('modal-supplier');
    document.getElementById('sup-name').focus();
  },

  async _save(){
    const name=document.getElementById('sup-name').value.trim();
    const errEl=document.getElementById('sup-name-err');
    if(!name){errEl.textContent=i18n.t('error_required');return;}
    errEl.textContent='';
    const editId=document.getElementById('sup-save-btn').dataset.editId;
    const data={name,specialty:document.getElementById('sup-specialty').value.trim(),phone:document.getElementById('sup-phone').value.trim(),email:document.getElementById('sup-email').value.trim(),address:document.getElementById('sup-address').value.trim(),notes:document.getElementById('sup-notes').value.trim(),updatedAt:now()};
    try{
      if(editId){await userCol(Collections.SUPPLIERS).doc(editId).update(data);Toast.success(i18n.t('success_updated'));}
      else{data.createdAt=now();await userCol(Collections.SUPPLIERS).add(data);Toast.success(i18n.t('success_created'));}
      Modal.close('modal-supplier');await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _delete(id){
    const s=this._suppliers.find(x=>x.id===id);
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:`"${s?.name}"`,onConfirm:async()=>{
      await userCol(Collections.SUPPLIERS).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();
    }});
  }
};

// ═══════════════════════════════════════════════
// KANTARA — Expenses Module
// ═══════════════════════════════════════════════
const Expenses = {
  _panel:null, _expenses:[], _projects:[], _suppliers:[], _filterCat:'all', _filterMethod:'all', _filterProject:'all', _searchQuery:'',

  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },

  _render(){
    this._panel.innerHTML=`
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-header-title">${i18n.t('expenses_title')}</h2><p class="page-header-subtitle">${i18n.t('expenses_subtitle')}</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" id="exp-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('expense_new')}</button></div>
      </div>
      <!-- Stat cards -->
      <div class="grid-3" style="margin-bottom:20px" id="exp-stats"></div>
      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-input-bar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="exp-search" placeholder="${i18n.t('search')}"/></div>
        <select class="filter-select" id="exp-filter-cat">
          <option value="all">${i18n.t('all')} ${i18n.t('category')}</option>
          <option value="materials">${i18n.t('expense_cat_materials')}</option>
          <option value="transport">${i18n.t('expense_cat_transport')}</option>
          <option value="labor">${i18n.t('expense_cat_labor')}</option>
          <option value="equipment">${i18n.t('expense_cat_equipment')}</option>
          <option value="misc">${i18n.t('expense_cat_misc')}</option>
        </select>
        <select class="filter-select" id="exp-filter-project"><option value="all">${i18n.t('all')} ${i18n.t('nav_projects')}</option></select>
        <select class="filter-select" id="exp-filter-method">
          <option value="all">${i18n.t('all')} ${i18n.t('expense_payment_method')}</option>
          <option value="cash">${i18n.t('expense_pay_cash')}</option>
          <option value="mobile">${i18n.t('expense_pay_mobile')}</option>
          <option value="transfer">${i18n.t('expense_pay_transfer')}</option>
          <option value="check">${i18n.t('expense_pay_check')}</option>
          <option value="card">${i18n.t('expense_pay_card')}</option>
        </select>
      </div>
      <div id="exp-content"></div>

      <!-- Modal -->
      <div class="modal-overlay" id="modal-expense" style="display:none">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-exp-title">${i18n.t('expense_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-expense')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body"><div class="field-group">
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('expense_amount')} <span class="field-required">*</span></label><input type="number" class="field-input" id="exp-amount" min="0" step="any" placeholder="0"/><span class="field-error" id="exp-amount-err"></span></div>
              <div class="field"><label class="field-label">${i18n.t('expense_date')} <span class="field-required">*</span></label><input type="date" class="field-input" id="exp-date"/></div>
            </div>
            <div class="field"><label class="field-label">${i18n.t('expense_description')} <span class="field-required">*</span></label><input type="text" class="field-input" id="exp-desc" placeholder="${i18n.getLang()==='fr'?'Ex: Achat ciment (50 sacs)':'Ex: Cement purchase (50 bags)'}"/><span class="field-error" id="exp-desc-err"></span></div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('expense_category')}</label><select class="field-select" id="exp-cat">
                <option value="materials">${i18n.t('expense_cat_materials')}</option>
                <option value="transport">${i18n.t('expense_cat_transport')}</option>
                <option value="labor">${i18n.t('expense_cat_labor')}</option>
                <option value="equipment">${i18n.t('expense_cat_equipment')}</option>
                <option value="misc">${i18n.t('expense_cat_misc')}</option>
              </select></div>
              <div class="field"><label class="field-label">${i18n.t('expense_payment_method')}</label><select class="field-select" id="exp-method">
                <option value="cash">${i18n.t('expense_pay_cash')}</option>
                <option value="mobile">${i18n.t('expense_pay_mobile')}</option>
                <option value="transfer">${i18n.t('expense_pay_transfer')}</option>
                <option value="check">${i18n.t('expense_pay_check')}</option>
                <option value="card">${i18n.t('expense_pay_card')}</option>
              </select></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('expense_project')}</label><select class="field-select" id="exp-project"><option value="">${i18n.t('none')}</option></select></div>
              <div class="field"><label class="field-label">${i18n.t('expense_supplier')}</label><select class="field-select" id="exp-supplier"><option value="">${i18n.t('none')}</option></select></div>
            </div>
            <div class="field"><label class="field-label">${i18n.t('expense_reference')}</label><input type="text" class="field-input" id="exp-ref" placeholder="FAC-2025-001"/></div>
            <div class="field"><label class="field-label">${i18n.t('notes')}</label><textarea class="field-textarea" id="exp-notes" rows="2"></textarea></div>
          </div></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-expense')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="exp-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('exp-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('exp-search')?.addEventListener('input',debounce(e=>{this._searchQuery=e.target.value.toLowerCase();this._renderList();},300));
    document.getElementById('exp-filter-cat')?.addEventListener('change',e=>{this._filterCat=e.target.value;this._renderList();});
    document.getElementById('exp-filter-project')?.addEventListener('change',e=>{this._filterProject=e.target.value;this._renderList();});
    document.getElementById('exp-filter-method')?.addEventListener('change',e=>{this._filterMethod=e.target.value;this._renderList();});
    document.getElementById('exp-save-btn')?.addEventListener('click',()=>this._save());
  },

  async _load(){
    try{
      const [expSnap,projSnap,supSnap]=await Promise.all([
        userCol(Collections.EXPENSES).orderBy('date','desc').get(),
        userCol(Collections.PROJECTS).orderBy('name').get(),
        userCol(Collections.SUPPLIERS).orderBy('name').get(),
      ]);
      this._expenses=expSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._projects=projSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._suppliers=supSnap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.expenses=this._expenses;

      const projOpts=this._projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      const supOpts=this._suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
      const filterSel=document.getElementById('exp-filter-project');
      if(filterSel)filterSel.innerHTML=`<option value="all">${i18n.t('all')} ${i18n.t('nav_projects')}</option>`+projOpts;
      const projSel=document.getElementById('exp-project');
      if(projSel)projSel.innerHTML=`<option value="">${i18n.t('none')}</option>`+projOpts;
      const supSel=document.getElementById('exp-supplier');
      if(supSel)supSel.innerHTML=`<option value="">${i18n.t('none')}</option>`+supOpts;

      this._renderStats();
      this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _renderStats(){
    const el=document.getElementById('exp-stats');if(!el)return;
    const currency=Prefs.getCurrency();
    const total=this._expenses.reduce((s,e)=>s+(e.amount||0),0);
    const thisMonth=this._expenses.filter(e=>{const d=e.date?.toDate?safeDate(e.date):new Date(e.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}).reduce((s,e)=>s+(e.amount||0),0);
    const catMap={};this._expenses.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+(e.amount||0);});
    const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
    const catLabels={materials:i18n.t('expense_cat_materials'),transport:i18n.t('expense_cat_transport'),labor:i18n.t('expense_cat_labor'),equipment:i18n.t('expense_cat_equipment'),misc:i18n.t('expense_cat_misc')};
    el.innerHTML=`
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Total dépenses':'Total Expenses'}</div><div class="stat-value">${Format.currency(total,currency)}</div><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Ce mois-ci':'This Month'}</div><div class="stat-value">${Format.currency(thisMonth,currency)}</div><div class="stat-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Catégorie principale':'Top Category'}</div><div class="stat-value" style="font-size:1.2rem">${topCat?catLabels[topCat[0]]||topCat[0]:'—'}</div><div class="stat-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div></div>
    `;
  },

  _renderList(){
    const el=document.getElementById('exp-content');if(!el)return;
    const list=this._expenses.filter(e=>{
      if(this._filterCat!=='all'&&e.category!==this._filterCat)return false;
      if(this._filterProject!=='all'&&e.projectId!==this._filterProject)return false;
      if(this._filterMethod!=='all'&&e.paymentMethod!==this._filterMethod)return false;
      if(this._searchQuery&&!(e.description||'').toLowerCase().includes(this._searchQuery))return false;
      return true;
    });
    if(!list.length){
      el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h3 class="empty-title">${i18n.t('expense_no_expenses')}</h3><button class="btn btn-primary" onclick="document.getElementById('exp-new-btn').click()">+ ${i18n.t('expense_new')}</button></div>`;
      return;
    }
    const currency=Prefs.getCurrency();
    const catColors={materials:'var(--gold)',transport:'var(--info)',labor:'var(--success)',equipment:'var(--status-done)',misc:'var(--text-muted)'};
    const catLabels={materials:i18n.t('expense_cat_materials'),transport:i18n.t('expense_cat_transport'),labor:i18n.t('expense_cat_labor'),equipment:i18n.t('expense_cat_equipment'),misc:i18n.t('expense_cat_misc')};
    const methodLabel={cash:i18n.t('expense_pay_cash'),mobile:i18n.t('expense_pay_mobile'),transfer:i18n.t('expense_pay_transfer'),check:i18n.t('expense_pay_check'),card:i18n.t('expense_pay_card')};
    el.innerHTML=`<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>${i18n.t('description')}</th><th>${i18n.t('category')}</th><th>${i18n.t('expense_project')}</th><th>${i18n.t('expense_payment_method')}</th><th>${i18n.t('date')}</th><th>${i18n.t('amount')}</th><th>${i18n.t('actions')}</th></tr></thead>
      <tbody>${list.map(e=>{
        const proj=this._projects.find(p=>p.id===e.projectId);
        const sup=this._suppliers.find(s=>s.id===e.supplierId);
        return`<tr>
          <td><div style="font-weight:500;color:var(--navy)">${Format.truncate(e.description||'—',35)}</div>${e.reference?`<div style="font-size:.7rem;color:var(--text-muted)">📄 ${e.reference}</div>`:''}${sup?`<div style="font-size:.7rem;color:var(--text-muted)">🏪 ${sup.name}</div>`:''}</td>
          <td><span class="badge" style="background:${catColors[e.category]||'#ccc'}18;color:${catColors[e.category]||'var(--text-muted)'}">${catLabels[e.category]||e.category||'—'}</span></td>
          <td style="color:var(--text-muted);font-size:.82rem">${proj?proj.name:'—'}</td>
          <td style="color:var(--text-muted);font-size:.82rem">${methodLabel[e.paymentMethod]||e.paymentMethod||'—'}</td>
          <td style="color:var(--text-muted)">${Format.date(e.date)}</td>
          <td><strong style="color:var(--navy)">${Format.currency(e.amount,e.currency||currency)}</strong></td>
          <td><div class="table-actions"><button class="action-btn" data-exp-edit="${e.id}">${editIcon()}</button><button class="action-btn delete" data-exp-delete="${e.id}">${deleteIcon()}</button></div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
    el.querySelectorAll('[data-exp-edit]').forEach(b=>b.addEventListener('click',()=>this._openModal(b.dataset.expEdit)));
    el.querySelectorAll('[data-exp-delete]').forEach(b=>b.addEventListener('click',()=>this._delete(b.dataset.expDelete)));
  },

  _openModal(id=null){
    const titleEl=document.getElementById('modal-exp-title');
    if(titleEl)titleEl.textContent=id?i18n.t('edit'):i18n.t('expense_new');
    if(id){
      const e=this._expenses.find(x=>x.id===id);if(!e)return;
      document.getElementById('exp-amount').value=e.amount||'';
      document.getElementById('exp-date').value=Format.dateInput(e.date);
      document.getElementById('exp-desc').value=e.description||'';
      document.getElementById('exp-cat').value=e.category||'materials';
      document.getElementById('exp-method').value=e.paymentMethod||'cash';
      document.getElementById('exp-project').value=e.projectId||'';
      document.getElementById('exp-supplier').value=e.supplierId||'';
      document.getElementById('exp-ref').value=e.reference||'';
      document.getElementById('exp-notes').value=e.notes||'';
    }else{
      document.getElementById('exp-amount').value='';
      document.getElementById('exp-date').value=Format.dateInput(new Date());
      document.getElementById('exp-desc').value='';
      document.getElementById('exp-cat').value='materials';
      document.getElementById('exp-method').value='cash';
      document.getElementById('exp-project').value=this._filterProject!=='all'?this._filterProject:'';
      document.getElementById('exp-supplier').value='';
      document.getElementById('exp-ref').value='';
      document.getElementById('exp-notes').value='';
    }
    document.getElementById('exp-save-btn').dataset.editId=id||'';
    Modal.open('modal-expense');
    document.getElementById('exp-amount').focus();
  },

  async _save(){
    const amount=parseFloat(document.getElementById('exp-amount').value);
    const desc=document.getElementById('exp-desc').value.trim();
    const dateVal=document.getElementById('exp-date').value;
    let valid=true;
    if(!amount||amount<=0){document.getElementById('exp-amount-err').textContent=i18n.t('error_required');valid=false;}else{document.getElementById('exp-amount-err').textContent='';}
    if(!desc){document.getElementById('exp-desc-err').textContent=i18n.t('error_required');valid=false;}else{document.getElementById('exp-desc-err').textContent='';}
    if(!valid)return;
    const editId=document.getElementById('exp-save-btn').dataset.editId;
    const data={
      amount,description:desc,
      date:dateVal?Timestamp.fromDate(new Date(dateVal)):now(),
      category:document.getElementById('exp-cat').value,
      paymentMethod:document.getElementById('exp-method').value,
      projectId:document.getElementById('exp-project').value||null,
      supplierId:document.getElementById('exp-supplier').value||null,
      reference:document.getElementById('exp-ref').value.trim(),
      notes:document.getElementById('exp-notes').value.trim(),
      currency:Prefs.getCurrency(),
      updatedAt:now(),
    };
    try{
      if(editId){await userCol(Collections.EXPENSES).doc(editId).update(data);Toast.success(i18n.t('success_updated'));}
      else{data.createdAt=now();await userCol(Collections.EXPENSES).add(data);Toast.success(i18n.t('success_created'));}
      Modal.close('modal-expense');
      // Check budget alert
      await this._checkBudgetAlert(data.projectId,data.amount);
      await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  async _checkBudgetAlert(projectId,addedAmount){
    if(!projectId)return;
    try{
      const projDoc=await userCol(Collections.PROJECTS).doc(projectId).get();
      if(!projDoc.exists)return;
      const proj=projDoc.data();
      if(!proj.budget)return;
      const allExp=await userCol(Collections.EXPENSES).where('projectId','==',projectId).get();
      const total=allExp.docs.reduce((s,d)=>s+(d.data().amount||0),0);
      const pct=total/proj.budget;
      if(pct>=1){Toast.warning(`⚠️ ${i18n.t('notif_budget_100')}`,proj.name,6000);}
      else if(pct>=0.8){Toast.info(`🔔 ${i18n.t('notif_budget_80')}`,proj.name,5000);}
    }catch(e){}
  },

  _delete(id){
    const e=this._expenses.find(x=>x.id===id);
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:`"${e?.description}"`,onConfirm:async()=>{
      await userCol(Collections.EXPENSES).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();
    }});
  }
};
