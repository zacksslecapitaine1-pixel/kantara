// ═══════════════════════════════════════════════
// KANTARA — Clients Module
// ═══════════════════════════════════════════════
const Clients = {

  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
  _panel:null, _clients:[], _searchQuery:'',

  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },

  _render(){
    this._panel.innerHTML=`
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-header-title">${i18n.t('clients_title')}</h2><p class="page-header-subtitle">${i18n.t('clients_subtitle')}</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" id="cl-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('client_new')}</button></div>
      </div>
      <div class="filter-bar">
        <div class="search-input-bar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="cl-search" placeholder="${i18n.t('search')}"/></div>
        <select class="filter-select" id="cl-filter-status">
          <option value="all">${i18n.t('all')}</option>
          <option value="active">${i18n.t('client_active')}</option>
          <option value="inactive">${i18n.t('client_inactive')}</option>
          <option value="bad_payer">${i18n.t('client_bad_payer')}</option>
        </select>
      </div>
      <!-- Summary cards -->
      <div class="grid-3" id="cl-stats" style="margin-bottom:24px"></div>
      <!-- List -->
      <div id="cl-content"></div>

      <!-- Modal -->
      <div class="modal-overlay" id="modal-client" style="display:none">
        <div class="modal">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-cl-title">${i18n.t('client_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-client')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="field-group">
              <div class="field"><label class="field-label">${i18n.t('client_name')} <span class="field-required">*</span></label><input type="text" class="field-input" id="cl-name" placeholder="Jean Koné"/><span class="field-error" id="cl-name-err"></span></div>
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('client_type')}</label><select class="field-select" id="cl-type"><option value="individual">${i18n.t('client_type_individual')}</option><option value="company">${i18n.t('client_type_company')}</option></select></div>
                <div class="field"><label class="field-label">${i18n.t('client_status')}</label><select class="field-select" id="cl-status"><option value="active">${i18n.t('client_active')}</option><option value="inactive">${i18n.t('client_inactive')}</option><option value="bad_payer">${i18n.t('client_bad_payer')}</option></select></div>
              </div>
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('phone')}</label><input type="tel" class="field-input" id="cl-phone" placeholder="+225 07 00 00 00"/></div>
                <div class="field"><label class="field-label">${i18n.t('email')}</label><input type="email" class="field-input" id="cl-email" placeholder="client@email.com"/></div>
              </div>
              <div class="field"><label class="field-label">${i18n.t('address')}</label><input type="text" class="field-input" id="cl-address" placeholder="${i18n.t('address')}..."/></div>
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('city')}</label><input type="text" class="field-input" id="cl-city"/></div>
                <div class="field"><label class="field-label">${i18n.t('country')}</label><input type="text" class="field-input" id="cl-country"/></div>
              </div>
              <div class="field"><label class="field-label">${i18n.t('notes')}</label><textarea class="field-textarea" id="cl-notes" rows="2"></textarea></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-client')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="cl-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('cl-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('cl-search')?.addEventListener('input',debounce(e=>{this._searchQuery=e.target.value.toLowerCase();this._renderList();},300));
    document.getElementById('cl-filter-status')?.addEventListener('change',e=>{this._filterStatus=e.target.value;this._renderList();});
    document.getElementById('cl-save-btn')?.addEventListener('click',()=>this._save());
  },

  async _load(){
    try{
      const [snap,invSnap]=await Promise.all([
        userCol(Collections.CLIENTS).orderBy('name').get(),
        userCol(Collections.INVOICES).get()
      ]);
      this._clients=snap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.clients=this._clients;
      AppState.invoices=invSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._renderStats();
      this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _renderStats(){
    const el=document.getElementById('cl-stats');
    if(!el)return;
    const currency=Prefs.getCurrency();
    const invoices=AppState.invoices||[];
    const totalInvoiced=invoices.reduce((s,i)=>s+(i.total||0),0);
    const totalPaid=invoices.reduce((s,i)=>s+(i.paid||0),0);
    const totalDue=totalInvoiced-totalPaid;
    el.innerHTML=`
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Total clients':'Total clients'}</div><div class="stat-value">${this._clients.length}</div><div class="stat-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.t('client_total_invoiced')}</div><div class="stat-value">${Format.currency(totalInvoiced,currency)}</div><div class="stat-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.t('client_balance')}</div><div class="stat-value" style="color:${totalDue>0?'var(--danger)':'var(--success)'}">${Format.currency(totalDue,currency)}</div><div class="stat-icon ${totalDue>0?'danger':'success'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div></div>
    `;
  },

  _renderList(){
    const el=document.getElementById('cl-content');
    if(!el)return;
    const filterStatus=document.getElementById('cl-filter-status')?.value||'all';
    const list=this._clients.filter(c=>{
      if(filterStatus!=='all'&&c.status!==filterStatus)return false;
      if(this._searchQuery&&!(c.name||'').toLowerCase().includes(this._searchQuery))return false;
      return true;
    });
    if(!list.length){
      el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h3 class="empty-title">${i18n.t('client_no_clients')}</h3><button class="btn btn-primary" onclick="document.getElementById('cl-new-btn').click()">+ ${i18n.t('client_new')}</button></div>`;
      return;
    }
    const currency=Prefs.getCurrency();
    const invoices=AppState.invoices||[];
    const statusBadge=s=>{const m={active:'badge-active',inactive:'badge-paused',bad_payer:'badge-blocked'};const l={active:i18n.t('client_active'),inactive:i18n.t('client_inactive'),bad_payer:i18n.t('client_bad_payer')};return`<span class="badge ${m[s]||'badge-low'}">${l[s]||s}</span>`;};
    el.innerHTML=`<div class="card"><div class="table-wrapper"><table><thead><tr><th>${i18n.t('name')}</th><th>${i18n.t('client_type')}</th><th>${i18n.t('phone')}</th><th>${i18n.t('client_total_invoiced')}</th><th>${i18n.t('client_balance')}</th><th>${i18n.t('status')}</th><th>${i18n.t('actions')}</th></tr></thead><tbody>
      ${list.map(c=>{
        const clInv=invoices.filter(i=>i.clientId===c.id);
        const invoiced=clInv.reduce((s,i)=>s+(i.total||0),0);
        const paid=clInv.reduce((s,i)=>s+(i.paid||0),0);
        const due=invoiced-paid;
        return`<tr>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="user-avatar" style="width:32px;height:32px;font-size:.78rem;background:linear-gradient(135deg,var(--gold-muted),var(--gold))">${Format.initials(c.name)}</div><div><div style="font-weight:600;color:var(--navy)">${c.name}</div>${c.email?`<div style="font-size:.72rem;color:var(--text-muted)">${c.email}</div>`:''}</div></div></td>
          <td style="color:var(--text-muted)">${c.type==='company'?i18n.t('client_type_company'):i18n.t('client_type_individual')}</td>
          <td style="color:var(--text-muted)">${c.phone||'—'}</td>
          <td>${Format.currency(invoiced,currency)}</td>
          <td style="color:${due>0?'var(--danger)':'var(--success)'};font-weight:${due>0?600:400}">${Format.currency(due,currency)}</td>
          <td>${statusBadge(c.status)}</td>
          <td><div class="table-actions"><button class="action-btn" data-cl-edit="${c.id}">${editIcon()}</button><button class="action-btn delete" data-cl-delete="${c.id}">${deleteIcon()}</button></div></td>
        </tr>`;
      }).join('')}
    </tbody></table></div></div>`;
    el.querySelectorAll('[data-cl-edit]').forEach(b=>b.addEventListener('click',()=>this._openModal(b.dataset.clEdit)));
    el.querySelectorAll('[data-cl-delete]').forEach(b=>b.addEventListener('click',()=>this._delete(b.dataset.clDelete)));
  },

  _openModal(id=null){
    const titleEl=document.getElementById('modal-cl-title');
    if(titleEl)titleEl.textContent=id?i18n.t('edit'):i18n.t('client_new');
    if(id){
      const c=this._clients.find(x=>x.id===id);
      if(!c)return;
      document.getElementById('cl-name').value=c.name||'';
      document.getElementById('cl-type').value=c.type||'individual';
      document.getElementById('cl-status').value=c.status||'active';
      document.getElementById('cl-phone').value=c.phone||'';
      document.getElementById('cl-email').value=c.email||'';
      document.getElementById('cl-address').value=c.address||'';
      document.getElementById('cl-city').value=c.city||'';
      document.getElementById('cl-country').value=c.country||'';
      document.getElementById('cl-notes').value=c.notes||'';
    }else{
      ['cl-name','cl-phone','cl-email','cl-address','cl-city','cl-country','cl-notes'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
      const t=document.getElementById('cl-type');if(t)t.value='individual';
      const s=document.getElementById('cl-status');if(s)s.value='active';
    }
    document.getElementById('cl-save-btn').dataset.editId=id||'';
    Modal.open('modal-client');
    document.getElementById('cl-name').focus();
  },

  async _save(){
    const name=document.getElementById('cl-name').value.trim();
    const errEl=document.getElementById('cl-name-err');
    if(!name){errEl.textContent=i18n.t('error_required');return;}
    errEl.textContent='';
    const editId=document.getElementById('cl-save-btn').dataset.editId;
    const data={name,type:document.getElementById('cl-type').value,status:document.getElementById('cl-status').value,phone:document.getElementById('cl-phone').value.trim(),email:document.getElementById('cl-email').value.trim(),address:document.getElementById('cl-address').value.trim(),city:document.getElementById('cl-city').value.trim(),country:document.getElementById('cl-country').value.trim(),notes:document.getElementById('cl-notes').value.trim(),updatedAt:now()};
    try{
      if(editId){await userCol(Collections.CLIENTS).doc(editId).update(data);Toast.success(i18n.t('success_updated'));}
      else{data.createdAt=now();await userCol(Collections.CLIENTS).add(data);Toast.success(i18n.t('success_created'));}
      Modal.close('modal-client');await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _delete(id){
    const c=this._clients.find(x=>x.id===id);
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:`"${c?.name}"`,onConfirm:async()=>{
      await userCol(Collections.CLIENTS).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();
    }});
  }
};
