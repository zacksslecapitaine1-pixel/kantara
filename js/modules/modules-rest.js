// ═══════════════════════════════════════════════
// KANTARA — Quotes Module
// ═══════════════════════════════════════════════
const Quotes = {

  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
  _panel:null, _quotes:[], _clients:[], _projects:[], _counter:0,

  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },

  _render(){
    this._panel.innerHTML=`
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-header-title">${i18n.t('quotes_title')}</h2><p class="page-header-subtitle">${i18n.t('quotes_subtitle')}</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" id="qt-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('quote_new')}</button></div>
      </div>
      <div id="qt-content"></div>
      <!-- Modal Quote -->
      <div class="modal-overlay" id="modal-quote" style="display:none">
        <div class="modal modal-xl">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-qt-title">${i18n.t('quote_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-quote')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="field-group">
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('quote_client')} <span class="field-required">*</span></label><select class="field-select" id="qt-client"><option value="">${i18n.t('none')}</option></select><span class="field-error" id="qt-client-err"></span></div>
                <div class="field"><label class="field-label">${i18n.t('quote_project')}</label><select class="field-select" id="qt-project"><option value="">${i18n.t('none')}</option></select></div>
              </div>
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('quote_date')}</label><input type="date" class="field-input" id="qt-date"/></div>
                <div class="field"><label class="field-label">${i18n.t('quote_validity')}</label><input type="number" class="field-input" id="qt-validity" value="30" min="1"/></div>
              </div>
              <div class="field-row">
                <div class="field"><label class="field-label">${i18n.t('status')}</label><select class="field-select" id="qt-status"><option value="draft">${i18n.t('quote_status_draft')}</option><option value="sent">${i18n.t('quote_status_sent')}</option><option value="accepted">${i18n.t('quote_status_accepted')}</option><option value="rejected">${i18n.t('quote_status_rejected')}</option></select></div>
                <div class="field"><label class="field-label">${i18n.t('currency')}</label><select class="field-select" id="qt-currency">${this._currencyOptions()}</select></div>
              </div>
              <!-- Line items -->
              <div style="margin-top:8px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                  <label class="field-label" style="margin:0">${i18n.t('quote_items')}</label>
                  <button class="btn btn-outline btn-sm" id="qt-add-line"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('quote_add_item')}</button>
                </div>
                <div style="background:var(--cream);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border)">
                  <div style="display:grid;grid-template-columns:1fr 80px 110px 110px 36px;gap:8px;padding:8px 12px;background:var(--cream-dark);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)">
                    <span>${i18n.t('quote_item_description')}</span><span>${i18n.t('quote_item_qty')}</span><span>${i18n.t('quote_item_unit_price')}</span><span>${i18n.t('quote_item_total')}</span><span></span>
                  </div>
                  <div id="qt-lines"></div>
                </div>
                <!-- Totals -->
                <div style="display:flex;justify-content:flex-end;margin-top:16px">
                  <div style="min-width:260px">
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem;color:var(--text-muted);border-bottom:1px solid var(--divider)"><span>${i18n.t('subtotal')}</span><span id="qt-subtotal">0</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:.85rem;border-bottom:1px solid var(--divider)">
                      <span style="color:var(--text-muted)">${i18n.t('tax')} (%)</span>
                      <input type="number" id="qt-tax" value="0" min="0" max="100" style="width:70px;padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem;text-align:right;background:var(--bg-input);outline:none"/>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:10px 0;font-family:var(--font-display);font-size:1.1rem;font-weight:600;color:var(--navy)"><span>${i18n.t('total')}</span><span id="qt-total">0</span></div>
                  </div>
                </div>
              </div>
              <div class="field"><label class="field-label">${i18n.t('notes')}</label><textarea class="field-textarea" id="qt-notes" rows="2" placeholder="${i18n.getLang()==='fr'?'Conditions, délais, garanties...':'Terms, deadlines, warranties...'}"></textarea></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-quote')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="qt-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('qt-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('qt-add-line')?.addEventListener('click',()=>this._addLine());
    document.getElementById('qt-save-btn')?.addEventListener('click',()=>this._save());
    document.getElementById('qt-tax')?.addEventListener('input',()=>this._calcTotals());
  },

  _currencyOptions(sel=''){
    const c=['XOF','XAF','USD','EUR','GBP','NGN','GHS','MAD'];
    const cur=sel||Prefs.getCurrency();
    return c.map(x=>`<option value="${x}" ${x===cur?'selected':''}>${x}</option>`).join('');
  },

  async _load(){
    try{
      const [qtSnap,clSnap,prSnap]=await Promise.all([
        userCol(Collections.QUOTES).orderBy('createdAt','desc').get(),
        userCol(Collections.CLIENTS).orderBy('name').get(),
        userCol(Collections.PROJECTS).orderBy('name').get(),
      ]);
      this._quotes=qtSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._clients=clSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._projects=prSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._counter=Math.max(0,...this._quotes.map(q=>{const m=(q.number||'').match(/(\d+)$/);return m?parseInt(m[1]):0;}));
      const clSel=document.getElementById('qt-client');
      if(clSel)clSel.innerHTML=`<option value="">${i18n.t('none')}</option>`+this._clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      const prSel=document.getElementById('qt-project');
      if(prSel)prSel.innerHTML=`<option value="">${i18n.t('none')}</option>`+this._projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _renderList(){
    const el=document.getElementById('qt-content');if(!el)return;
    if(!this._quotes.length){
      el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg></div><h3 class="empty-title">${i18n.t('quote_no_quotes')}</h3><button class="btn btn-primary" onclick="document.getElementById('qt-new-btn').click()">+ ${i18n.t('quote_new')}</button></div>`;
      return;
    }
    const currency=Prefs.getCurrency();
    const sB=s=>{const m={draft:'badge-paused',sent:'badge-inprogress',accepted:'badge-active',rejected:'badge-blocked'};const l={draft:i18n.t('quote_status_draft'),sent:i18n.t('quote_status_sent'),accepted:i18n.t('quote_status_accepted'),rejected:i18n.t('quote_status_rejected')};return`<span class="badge ${m[s]||'badge-low'}">${l[s]||s}</span>`;};
    el.innerHTML=`<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>${i18n.t('quote_number')}</th><th>${i18n.t('quote_client')}</th><th>${i18n.t('quote_project')}</th><th>${i18n.t('date')}</th><th>${i18n.t('status')}</th><th>${i18n.t('total')}</th><th>${i18n.t('actions')}</th></tr></thead>
      <tbody>${this._quotes.map(q=>{
        const client=this._clients.find(c=>c.id===q.clientId);
        const proj=this._projects.find(p=>p.id===q.projectId);
        return`<tr>
          <td><span style="font-weight:600;color:var(--navy)">${q.number||'—'}</span></td>
          <td>${client?client.name:'—'}</td>
          <td style="color:var(--text-muted)">${proj?proj.name:'—'}</td>
          <td style="color:var(--text-muted)">${Format.date(q.date)}</td>
          <td>${sB(q.status)}</td>
          <td><strong>${Format.currency(q.total||0,q.currency||currency)}</strong></td>
          <td><div class="table-actions">
            ${q.status==='accepted'?`<button class="action-btn" title="${i18n.t('quote_convert_invoice')}" data-qt-convert="${q.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg></button>`:''}
            <button class="action-btn" data-qt-pdf="${q.id}" title="Télécharger PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" data-qt-edit="${q.id}">${editIcon()}</button>
            <button class="action-btn delete" data-qt-delete="${q.id}">${deleteIcon()}</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
    el.querySelectorAll('[data-qt-edit]').forEach(b=>b.addEventListener('click',()=>this._openModal(b.dataset.qtEdit)));
    el.querySelectorAll('[data-qt-delete]').forEach(b=>b.addEventListener('click',()=>this._delete(b.dataset.qtDelete)));
    el.querySelectorAll('[data-qt-convert]').forEach(b=>b.addEventListener('click',()=>this._convertToInvoice(b.dataset.qtConvert)));
    el.querySelectorAll('[data-qt-pdf]').forEach(b=>b.addEventListener('click',()=>this._generatePDF(b.dataset.qtPdf)));
  },

  _openModal(id=null){
    document.getElementById('qt-lines').innerHTML='';
    const titleEl=document.getElementById('modal-qt-title');
    if(titleEl)titleEl.textContent=id?i18n.t('edit'):i18n.t('quote_new');
    if(id){
      const q=this._quotes.find(x=>x.id===id);if(!q)return;
      document.getElementById('qt-client').value=q.clientId||'';
      document.getElementById('qt-project').value=q.projectId||'';
      document.getElementById('qt-date').value=Format.dateInput(q.date);
      document.getElementById('qt-validity').value=q.validity||30;
      document.getElementById('qt-status').value=q.status||'draft';
      document.getElementById('qt-currency').value=q.currency||Prefs.getCurrency();
      document.getElementById('qt-tax').value=q.tax||0;
      document.getElementById('qt-notes').value=q.notes||'';
      (q.lines||[]).forEach(l=>this._addLine(l));
    }else{
      document.getElementById('qt-client').value='';
      document.getElementById('qt-project').value='';
      document.getElementById('qt-date').value=Format.dateInput(new Date());
      document.getElementById('qt-validity').value=30;
      document.getElementById('qt-status').value='draft';
      document.getElementById('qt-currency').value=Prefs.getCurrency();
      document.getElementById('qt-tax').value=0;
      document.getElementById('qt-notes').value='';
      this._addLine();
    }
    document.getElementById('qt-save-btn').dataset.editId=id||'';
    this._calcTotals();
    Modal.open('modal-quote');
  },

  _addLine(data={}){
    const el=document.getElementById('qt-lines');if(!el)return;
    const idx=el.children.length;
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr 80px 110px 110px 36px;gap:8px;padding:8px 12px;border-top:1px solid var(--divider);align-items:center';
    row.innerHTML=`
      <input type="text" class="field-input" style="font-size:.82rem;padding:6px 10px" placeholder="${i18n.t('quote_item_description')}..." value="${data.description||''}"/>
      <input type="number" class="field-input qt-qty" style="font-size:.82rem;padding:6px 8px;text-align:right" value="${data.qty||1}" min="0" step="any"/>
      <input type="number" class="field-input qt-price" style="font-size:.82rem;padding:6px 8px;text-align:right" placeholder="0" value="${data.unitPrice||''}" min="0" step="any"/>
      <div class="qt-line-total" style="font-size:.85rem;font-weight:600;color:var(--navy);text-align:right;padding:0 4px">${Format.currency((data.qty||1)*(data.unitPrice||0),Prefs.getCurrency())}</div>
      <button class="action-btn delete qt-remove-line" style="flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    `;
    row.querySelectorAll('.qt-qty,.qt-price').forEach(inp=>inp.addEventListener('input',()=>{
      const qty=parseFloat(row.querySelector('.qt-qty').value)||0;
      const price=parseFloat(row.querySelector('.qt-price').value)||0;
      row.querySelector('.qt-line-total').textContent=Format.currency(qty*price,document.getElementById('qt-currency')?.value||Prefs.getCurrency());
      this._calcTotals();
    }));
    row.querySelector('.qt-remove-line').addEventListener('click',()=>{row.remove();this._calcTotals();});
    el.appendChild(row);
    this._calcTotals();
  },

  _calcTotals(){
    const el=document.getElementById('qt-lines');if(!el)return;
    const currency=document.getElementById('qt-currency')?.value||Prefs.getCurrency();
    let sub=0;
    el.querySelectorAll('div').forEach(row=>{
      const qty=parseFloat(row.querySelector?.('.qt-qty')?.value)||0;
      const price=parseFloat(row.querySelector?.('.qt-price')?.value)||0;
      sub+=qty*price;
    });
    const taxPct=parseFloat(document.getElementById('qt-tax')?.value)||0;
    const tax=sub*(taxPct/100);
    const total=sub+tax;
    const subEl=document.getElementById('qt-subtotal');if(subEl)subEl.textContent=Format.currency(sub,currency);
    const totEl=document.getElementById('qt-total');if(totEl)totEl.textContent=Format.currency(total,currency);
  },

  _getLines(){
    const el=document.getElementById('qt-lines');if(!el)return[];
    return Array.from(el.children).map(row=>({
      description:row.querySelectorAll('input')[0]?.value?.trim()||'',
      qty:parseFloat(row.querySelector('.qt-qty')?.value)||0,
      unitPrice:parseFloat(row.querySelector('.qt-price')?.value)||0,
      total:(parseFloat(row.querySelector('.qt-qty')?.value)||0)*(parseFloat(row.querySelector('.qt-price')?.value)||0),
    })).filter(l=>l.description);
  },

  async _save(){
    const clientId=document.getElementById('qt-client').value;
    const errEl=document.getElementById('qt-client-err');
    if(!clientId){errEl.textContent=i18n.t('error_required');return;}
    errEl.textContent='';
    const editId=document.getElementById('qt-save-btn').dataset.editId;
    const lines=this._getLines();
    const taxPct=parseFloat(document.getElementById('qt-tax').value)||0;
    const subtotal=lines.reduce((s,l)=>s+l.total,0);
    const tax=subtotal*(taxPct/100);
    const total=subtotal+tax;
    const dateVal=document.getElementById('qt-date').value;
    const data={
      clientId,projectId:document.getElementById('qt-project').value||null,
      date:dateVal?Timestamp.fromDate(new Date(dateVal)):now(),
      validity:parseInt(document.getElementById('qt-validity').value)||30,
      status:document.getElementById('qt-status').value,
      currency:document.getElementById('qt-currency').value,
      lines,tax:taxPct,subtotal,total,
      notes:document.getElementById('qt-notes').value.trim(),
      updatedAt:now(),
    };
    try{
      if(editId){await userCol(Collections.QUOTES).doc(editId).update(data);Toast.success(i18n.t('success_updated'));}
      else{data.createdAt=now();data.number=generateDocNumber('DEVIS',this._counter);await userCol(Collections.QUOTES).add(data);Toast.success(i18n.t('success_created'));}
      Modal.close('modal-quote');await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  async _convertToInvoice(id){
    const q=this._quotes.find(x=>x.id===id);if(!q)return;
    const now_=now();
    const dueDate=new Date();dueDate.setDate(dueDate.getDate()+30);
    // BUG #8 FIX: Use proper counter (max existing number) not array length to avoid duplicates
    let invCounter=0;
    try{
      const invSnap=await userCol(Collections.INVOICES).get();
      invCounter=Math.max(0,...invSnap.docs.map(d=>{const m=(d.data().number||'').match(/(\d+)$/);return m?parseInt(m[1]):0;}));
    }catch(e){}
    const data={
      clientId:q.clientId,projectId:q.projectId,
      date:now_,dueDate:Timestamp.fromDate(dueDate),
      lines:q.lines,tax:q.tax,subtotal:q.subtotal,total:q.total,
      currency:q.currency,notes:q.notes,
      status:'unpaid',paid:0,quoteId:id,
      number:generateDocNumber('FAC',invCounter),
      createdAt:now_,updatedAt:now_,
    };
    try{
      await userCol(Collections.INVOICES).add(data);
      await userCol(Collections.QUOTES).doc(id).update({status:'accepted',updatedAt:now_});
      Toast.success(i18n.t('quote_convert_invoice'));
      await this._load();
      setTimeout(()=>App.goTo('/invoices'),600);
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _generatePDF(id){
    const q=this._quotes.find(x=>x.id===id); if(!q)return;
    const client=this._clients.find(c=>c.id===q.clientId);
    const {jsPDF}=(window.jspdf||window);
    if(!jsPDF){Toast.error(i18n.getLang()==='fr'?'Module PDF non chargé':'PDF module not loaded');return;}
    const doc=new jsPDF(); const lang=i18n.getLang();
    const currency=q.currency||Prefs.getCurrency();
    const userProfile=AppState.userProfile||{};
    doc.setFillColor(15,27,45);doc.rect(0,0,210,40,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(201,151,42);doc.text('KANTARA',20,18);
    doc.setFontSize(10);doc.setTextColor(255,255,255);doc.text(userProfile.displayName||'',20,26);
    if(userProfile.company)doc.text(userProfile.company,20,32);
    doc.setFontSize(16);doc.setTextColor(15,27,45);doc.setFont('helvetica','bold');
    doc.text((lang==='fr'?'DEVIS':'QUOTE')+` ${q.number||''}`,210-20,55,{align:'right'});
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
    doc.text(`${lang==='fr'?'Date':'Date'}: ${Format.date(q.date)}`,210-20,62,{align:'right'});
    const validDate=new Date();validDate.setDate(validDate.getDate()+(q.validity||30));
    doc.text(`${lang==='fr'?"Valide jusqu'au":'Valid until'}: ${Format.date(validDate.toISOString())}`,210-20,68,{align:'right'});
    doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(15,27,45);
    doc.text(lang==='fr'?'DEVIS POUR:':'QUOTE FOR:',20,55);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,60);
    if(client){doc.text(client.name,20,62);if(client.phone)doc.text(client.phone,20,68);if(client.email)doc.text(client.email,20,74);}
    doc.setDrawColor(201,151,42);doc.setLineWidth(0.5);doc.line(20,82,190,82);
    const tableData=(q.lines||[]).map(l=>[l.description,l.qty,Format.currency(l.unitPrice,currency),Format.currency(l.total,currency)]);
    doc.autoTable({startY:87,head:[[lang==='fr'?'Description':'Description',lang==='fr'?'Qté':'Qty',lang==='fr'?'Prix unitaire':'Unit Price','Total']],body:tableData,theme:'grid',headStyles:{fillColor:[15,27,45],textColor:[201,151,42],fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:9,textColor:[40,40,40]},columnStyles:{0:{cellWidth:85},1:{cellWidth:20,halign:'center'},2:{cellWidth:40,halign:'right'},3:{cellWidth:35,halign:'right'}},margin:{left:20,right:20}});
    const finalY=doc.lastAutoTable.finalY+10;
    const taxAmt=(q.subtotal||0)*((q.tax||0)/100);
    doc.setFillColor(248,245,240);doc.rect(120,finalY,70,q.tax?42:32,'F');
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
    doc.text(lang==='fr'?'Sous-total:':'Subtotal:',125,finalY+9);doc.text(Format.currency(q.subtotal||0,currency),190,finalY+9,{align:'right'});
    if(q.tax){doc.text(`Taxe (${q.tax}%):`,125,finalY+18);doc.text(Format.currency(taxAmt,currency),190,finalY+18,{align:'right'});}
    const totY=q.tax?finalY+32:finalY+22;
    doc.setDrawColor(201,151,42);doc.line(120,totY-5,190,totY-5);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(15,27,45);
    doc.text('TOTAL:',125,totY+2);doc.text(Format.currency(q.total||0,currency),190,totY+2,{align:'right'});
    if(q.notes){doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);doc.text(q.notes,20,totY+20);}
    doc.setFontSize(8);doc.setTextColor(150,150,150);doc.setDrawColor(220,220,220);doc.line(20,275,190,275);
    doc.text('Generated by KANTARA',105,280,{align:'center'});
    doc.save(`Devis_${q.number||id}.pdf`);
    Toast.success(lang==='fr'?'Devis téléchargé':'Quote downloaded');
  },

  _delete(id){
    const q=this._quotes.find(x=>x.id===id);
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:`"${q?.number}"`,onConfirm:async()=>{
      await userCol(Collections.QUOTES).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();
    }});
  }
};
// ═══════════════════════════════════════════════
const Invoices = {
  _panel:null, _invoices:[], _clients:[], _projects:[], _counter:0,

  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },

  _render(){
    this._panel.innerHTML=`
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-header-title">${i18n.t('invoices_title')}</h2><p class="page-header-subtitle">${i18n.t('invoices_subtitle')}</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" id="inv-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('invoice_new')}</button></div>
      </div>
      <div class="grid-4" style="margin-bottom:20px" id="inv-stats"></div>
      <div class="filter-bar">
        <select class="filter-select" id="inv-filter-status">
          <option value="all">${i18n.t('all')}</option>
          <option value="unpaid">${i18n.t('invoice_status_unpaid')}</option>
          <option value="partial">${i18n.t('invoice_status_partial')}</option>
          <option value="paid">${i18n.t('invoice_status_paid')}</option>
          <option value="overdue">${i18n.t('invoice_status_overdue')}</option>
        </select>
      </div>
      <div id="inv-content"></div>
      <!-- Modal Invoice -->
      <div class="modal-overlay" id="modal-invoice" style="display:none">
        <div class="modal modal-xl">
          <div class="modal-header">
            <div><div class="modal-title" id="modal-inv-title">${i18n.t('invoice_new')}</div></div>
            <button class="modal-close" onclick="Modal.close('modal-invoice')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body"><div class="field-group">
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('invoice_client')} <span class="field-required">*</span></label><select class="field-select" id="inv-client"><option value="">${i18n.t('none')}</option></select><span class="field-error" id="inv-client-err"></span></div>
              <div class="field"><label class="field-label">${i18n.t('invoice_project')}</label><select class="field-select" id="inv-project"><option value="">${i18n.t('none')}</option></select></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('invoice_date')}</label><input type="date" class="field-input" id="inv-date"/></div>
              <div class="field"><label class="field-label">${i18n.t('invoice_due_date')}</label><input type="date" class="field-input" id="inv-due"/></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.t('status')}</label><select class="field-select" id="inv-status"><option value="unpaid">${i18n.t('invoice_status_unpaid')}</option><option value="partial">${i18n.t('invoice_status_partial')}</option><option value="paid">${i18n.t('invoice_status_paid')}</option><option value="overdue">${i18n.t('invoice_status_overdue')}</option></select></div>
              <div class="field"><label class="field-label">${i18n.t('currency')}</label><select class="field-select" id="inv-currency">${this._currencyOptions()}</select></div>
            </div>
            <!-- Lines -->
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <label class="field-label" style="margin:0">${i18n.t('quote_items')}</label>
                <button class="btn btn-outline btn-sm" id="inv-add-line">+ ${i18n.t('quote_add_item')}</button>
              </div>
              <div style="background:var(--cream);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border)">
                <div style="display:grid;grid-template-columns:1fr 80px 110px 110px 36px;gap:8px;padding:8px 12px;background:var(--cream-dark);font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--text-muted)"><span>${i18n.t('quote_item_description')}</span><span>Qté</span><span>${i18n.t('quote_item_unit_price')}</span><span>Total</span><span></span></div>
                <div id="inv-lines"></div>
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:16px">
                <div style="min-width:260px">
                  <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem;color:var(--text-muted);border-bottom:1px solid var(--divider)"><span>${i18n.t('subtotal')}</span><span id="inv-subtotal">0</span></div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:.85rem;border-bottom:1px solid var(--divider)"><span style="color:var(--text-muted)">${i18n.t('tax')} (%)</span><input type="number" id="inv-tax" value="0" min="0" max="100" style="width:70px;padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem;text-align:right;background:var(--bg-input);outline:none"/></div>
                  <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem;border-bottom:1px solid var(--divider)"><span style="color:var(--text-muted)">${i18n.getLang()==='fr'?'Déjà payé':'Already paid'}</span><span id="inv-paid-display" style="color:var(--success);font-weight:600">0</span></div>
                  <div style="display:flex;justify-content:space-between;padding:10px 0;font-family:var(--font-display);font-size:1.1rem;font-weight:600;color:var(--navy)"><span>${i18n.t('total')}</span><span id="inv-total">0</span></div>
                </div>
              </div>
            </div>
            <div class="field"><label class="field-label">${i18n.t('notes')}</label><textarea class="field-textarea" id="inv-notes" rows="2"></textarea></div>
          </div></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-invoice')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="inv-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
      <!-- Modal: Add payment -->
      <div class="modal-overlay" id="modal-payment" style="display:none">
        <div class="modal modal-sm">
          <div class="modal-header">
            <div class="modal-title">${i18n.t('invoice_add_payment')}</div>
            <button class="modal-close" onclick="Modal.close('modal-payment')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body"><div class="field-group">
            <div class="field"><label class="field-label">${i18n.t('invoice_payment_amount')} <span class="field-required">*</span></label><input type="number" class="field-input" id="pay-amount" min="0" step="any"/></div>
            <div class="field"><label class="field-label">${i18n.t('invoice_payment_date')}</label><input type="date" class="field-input" id="pay-date"/></div>
            <div class="field"><label class="field-label">${i18n.t('invoice_payment_method')}</label><select class="field-select" id="pay-method"><option value="cash">${i18n.t('expense_pay_cash')}</option><option value="mobile">${i18n.t('expense_pay_mobile')}</option><option value="transfer">${i18n.t('expense_pay_transfer')}</option><option value="check">${i18n.t('expense_pay_check')}</option></select></div>
            <div class="field"><label class="field-label">${i18n.t('notes')}</label><input type="text" class="field-input" id="pay-notes"/></div>
          </div></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-payment')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="pay-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('inv-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('inv-add-line')?.addEventListener('click',()=>this._addLine());
    document.getElementById('inv-save-btn')?.addEventListener('click',()=>this._save());
    document.getElementById('inv-tax')?.addEventListener('input',()=>this._calcTotals());
    document.getElementById('inv-filter-status')?.addEventListener('change',()=>this._renderList());
    document.getElementById('pay-save-btn')?.addEventListener('click',()=>this._savePayment());
  },

  _currencyOptions(sel=''){const c=['XOF','XAF','USD','EUR','GBP','NGN','GHS','MAD'];const cur=sel||Prefs.getCurrency();return c.map(x=>`<option value="${x}" ${x===cur?'selected':''}>${x}</option>`).join('');},

  async _load(){
    try{
      const [invSnap,clSnap,prSnap]=await Promise.all([
        userCol(Collections.INVOICES).orderBy('createdAt','desc').get(),
        userCol(Collections.CLIENTS).orderBy('name').get(),
        userCol(Collections.PROJECTS).orderBy('name').get(),
      ]);
      this._invoices=invSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._clients=clSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._projects=prSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._counter=Math.max(0,...this._invoices.map(i=>{const m=(i.number||'').match(/(\d+)$/);return m?parseInt(m[1]):0;}));
      AppState.invoices=this._invoices;
      const clOpts=`<option value="">${i18n.t('none')}</option>`+this._clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      const prOpts=`<option value="">${i18n.t('none')}</option>`+this._projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      const cs=document.getElementById('inv-client');if(cs)cs.innerHTML=clOpts;
      const ps=document.getElementById('inv-project');if(ps)ps.innerHTML=prOpts;
      this._renderStats();this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _renderStats(){
    const el=document.getElementById('inv-stats');if(!el)return;
    const currency=Prefs.getCurrency();
    const total=this._invoices.reduce((s,i)=>s+(i.total||0),0);
    const paid=this._invoices.reduce((s,i)=>s+(i.paid||0),0);
    const due=total-paid;
    const overdueCount=this._invoices.filter(i=>i.status==='overdue'||(i.status==='unpaid'&&i.dueDate&&safeDate(i.dueDate)<new Date())).length;
    el.innerHTML=`
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Total facturé':'Total Invoiced'}</div><div class="stat-value">${Format.currency(total,currency)}</div><div class="stat-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'Total reçu':'Total Received'}</div><div class="stat-value" style="color:var(--success)">${Format.currency(paid,currency)}</div><div class="stat-icon success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.t('client_balance')}</div><div class="stat-value" style="color:${due>0?'var(--danger)':'var(--navy)'}">${Format.currency(due,currency)}</div><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.getLang()==='fr'?'En retard':'Overdue'}</div><div class="stat-value">${overdueCount}</div><div class="stat-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div>
    `;
  },

  _renderList(){
    const el=document.getElementById('inv-content');if(!el)return;
    const filterStatus=document.getElementById('inv-filter-status')?.value||'all';
    const now_=new Date();
    const list=this._invoices.filter(i=>{
      if(filterStatus==='all')return true;
      const eff=i.status==='unpaid'&&i.dueDate&&safeDate(i.dueDate)<now_?'overdue':i.status;
      return eff===filterStatus;
    });
    if(!list.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div><h3 class="empty-title">${i18n.t('invoice_no_invoices')}</h3><button class="btn btn-primary" onclick="document.getElementById('inv-new-btn').click()">+ ${i18n.t('invoice_new')}</button></div>`;return;}
    const currency=Prefs.getCurrency();
    const sB=i=>{const due_=i.status==='unpaid'&&i.dueDate&&safeDate(i.dueDate)<now_?'overdue':i.status;const m={unpaid:'badge-pending',partial:'badge-inprogress',paid:'badge-active',overdue:'badge-blocked'};const l={unpaid:i18n.t('invoice_status_unpaid'),partial:i18n.t('invoice_status_partial'),paid:i18n.t('invoice_status_paid'),overdue:i18n.t('invoice_status_overdue')};return`<span class="badge ${m[due_]||'badge-low'}">${l[due_]||due_}</span>`;};
    el.innerHTML=`<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>${i18n.t('invoice_number')}</th><th>${i18n.t('invoice_client')}</th><th>${i18n.t('invoice_due_date')}</th><th>${i18n.t('status')}</th><th>${i18n.t('total')}</th><th>${i18n.getLang()==='fr'?'Payé':'Paid'}</th><th>${i18n.getLang()==='fr'?'Restant':'Remaining'}</th><th>${i18n.t('actions')}</th></tr></thead>
      <tbody>${list.map(inv=>{
        const client=this._clients.find(c=>c.id===inv.clientId);
        const remaining=(inv.total||0)-(inv.paid||0);
        return`<tr>
          <td><span style="font-weight:600;color:var(--navy)">${inv.number||'—'}</span></td>
          <td>${client?client.name:'—'}</td>
          <td>${Format.date(inv.dueDate)}</td>
          <td>${sB(inv)}</td>
          <td><strong>${Format.currency(inv.total||0,inv.currency||currency)}</strong></td>
          <td style="color:var(--success)">${Format.currency(inv.paid||0,inv.currency||currency)}</td>
          <td style="color:${remaining>0?'var(--danger)':'var(--success)'};font-weight:600">${Format.currency(remaining,inv.currency||currency)}</td>
          <td><div class="table-actions">
            ${inv.status!=='paid'?`<button class="action-btn" data-inv-pay="${inv.id}" title="${i18n.t('invoice_add_payment')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></button>`:''}
            <button class="action-btn" data-inv-pdf="${inv.id}" title="${i18n.t('invoice_download')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" data-inv-edit="${inv.id}">${editIcon()}</button>
            <button class="action-btn delete" data-inv-delete="${inv.id}">${deleteIcon()}</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
    el.querySelectorAll('[data-inv-edit]').forEach(b=>b.addEventListener('click',()=>this._openModal(b.dataset.invEdit)));
    el.querySelectorAll('[data-inv-delete]').forEach(b=>b.addEventListener('click',()=>this._delete(b.dataset.invDelete)));
    el.querySelectorAll('[data-inv-pay]').forEach(b=>b.addEventListener('click',()=>this._openPayment(b.dataset.invPay)));
    el.querySelectorAll('[data-inv-pdf]').forEach(b=>b.addEventListener('click',()=>this._generatePDF(b.dataset.invPdf)));
  },

  _openModal(id=null){
    document.getElementById('inv-lines').innerHTML='';
    const titleEl=document.getElementById('modal-inv-title');if(titleEl)titleEl.textContent=id?i18n.t('edit'):i18n.t('invoice_new');
    if(id){
      const inv=this._invoices.find(x=>x.id===id);if(!inv)return;
      document.getElementById('inv-client').value=inv.clientId||'';
      document.getElementById('inv-project').value=inv.projectId||'';
      document.getElementById('inv-date').value=Format.dateInput(inv.date);
      document.getElementById('inv-due').value=Format.dateInput(inv.dueDate);
      document.getElementById('inv-status').value=inv.status||'unpaid';
      document.getElementById('inv-currency').value=inv.currency||Prefs.getCurrency();
      document.getElementById('inv-tax').value=inv.tax||0;
      document.getElementById('inv-notes').value=inv.notes||'';
      const paidEl=document.getElementById('inv-paid-display');if(paidEl)paidEl.textContent=Format.currency(inv.paid||0,inv.currency||Prefs.getCurrency());
      (inv.lines||[]).forEach(l=>this._addLine(l));
    }else{
      document.getElementById('inv-client').value='';document.getElementById('inv-project').value='';
      document.getElementById('inv-date').value=Format.dateInput(new Date());
      const dd=new Date();dd.setDate(dd.getDate()+30);
      document.getElementById('inv-due').value=Format.dateInput(dd);
      document.getElementById('inv-status').value='unpaid';
      document.getElementById('inv-currency').value=Prefs.getCurrency();
      document.getElementById('inv-tax').value=0;document.getElementById('inv-notes').value='';
      const paidEl=document.getElementById('inv-paid-display');if(paidEl)paidEl.textContent=Format.currency(0,Prefs.getCurrency());
      this._addLine();
    }
    document.getElementById('inv-save-btn').dataset.editId=id||'';
    this._calcTotals();Modal.open('modal-invoice');
  },

  _addLine(data={}){
    const el=document.getElementById('inv-lines');if(!el)return;
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr 80px 110px 110px 36px;gap:8px;padding:8px 12px;border-top:1px solid var(--divider);align-items:center';
    row.innerHTML=`<input type="text" class="field-input" style="font-size:.82rem;padding:6px 10px" value="${data.description||''}" placeholder="${i18n.t('quote_item_description')}..."/>
      <input type="number" class="field-input inv-qty" style="font-size:.82rem;padding:6px 8px;text-align:right" value="${data.qty||1}" min="0" step="any"/>
      <input type="number" class="field-input inv-price" style="font-size:.82rem;padding:6px 8px;text-align:right" value="${data.unitPrice||''}" min="0" step="any"/>
      <div class="inv-line-total" style="font-size:.85rem;font-weight:600;color:var(--navy);text-align:right;padding:0 4px">${Format.currency((data.qty||1)*(data.unitPrice||0),Prefs.getCurrency())}</div>
      <button class="action-btn delete inv-remove-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    row.querySelectorAll('.inv-qty,.inv-price').forEach(inp=>inp.addEventListener('input',()=>{
      const q=parseFloat(row.querySelector('.inv-qty').value)||0;
      const p=parseFloat(row.querySelector('.inv-price').value)||0;
      row.querySelector('.inv-line-total').textContent=Format.currency(q*p,document.getElementById('inv-currency')?.value||Prefs.getCurrency());
      this._calcTotals();
    }));
    row.querySelector('.inv-remove-line').addEventListener('click',()=>{row.remove();this._calcTotals();});
    el.appendChild(row);this._calcTotals();
  },

  _calcTotals(){
    const el=document.getElementById('inv-lines');if(!el)return;
    const currency=document.getElementById('inv-currency')?.value||Prefs.getCurrency();
    let sub=0;
    el.querySelectorAll(':scope > div').forEach(row=>{
      const q=parseFloat(row.querySelector('.inv-qty')?.value)||0;
      const p=parseFloat(row.querySelector('.inv-price')?.value)||0;
      sub+=q*p;
    });
    const taxPct=parseFloat(document.getElementById('inv-tax')?.value)||0;
    const total=sub+(sub*(taxPct/100));
    const subEl=document.getElementById('inv-subtotal');if(subEl)subEl.textContent=Format.currency(sub,currency);
    const totEl=document.getElementById('inv-total');if(totEl)totEl.textContent=Format.currency(total,currency);
  },

  _getLines(){
    const el=document.getElementById('inv-lines');if(!el)return[];
    return Array.from(el.children).map(row=>({
      description:row.querySelectorAll('input')[0]?.value?.trim()||'',
      qty:parseFloat(row.querySelector('.inv-qty')?.value)||0,
      unitPrice:parseFloat(row.querySelector('.inv-price')?.value)||0,
      total:(parseFloat(row.querySelector('.inv-qty')?.value)||0)*(parseFloat(row.querySelector('.inv-price')?.value)||0),
    })).filter(l=>l.description);
  },

  async _save(){
    const clientId=document.getElementById('inv-client').value;
    const errEl=document.getElementById('inv-client-err');
    if(!clientId){errEl.textContent=i18n.t('error_required');return;}
    errEl.textContent='';
    const editId=document.getElementById('inv-save-btn').dataset.editId;
    const lines=this._getLines();
    const taxPct=parseFloat(document.getElementById('inv-tax').value)||0;
    const subtotal=lines.reduce((s,l)=>s+l.total,0);
    const total=subtotal+(subtotal*(taxPct/100));
    const dateVal=document.getElementById('inv-date').value;
    const dueVal=document.getElementById('inv-due').value;
    const existing=editId?this._invoices.find(x=>x.id===editId):null;
    const data={
      clientId,projectId:document.getElementById('inv-project').value||null,
      date:dateVal?Timestamp.fromDate(new Date(dateVal)):now(),
      dueDate:dueVal?Timestamp.fromDate(new Date(dueVal)):null,
      status:document.getElementById('inv-status').value,
      currency:document.getElementById('inv-currency').value,
      lines,tax:taxPct,subtotal,total,
      paid:existing?.paid||0,
      notes:document.getElementById('inv-notes').value.trim(),
      updatedAt:now(),
    };
    try{
      if(editId){await userCol(Collections.INVOICES).doc(editId).update(data);Toast.success(i18n.t('success_updated'));}
      else{data.createdAt=now();data.number=generateDocNumber('FAC',this._counter);await userCol(Collections.INVOICES).add(data);Toast.success(i18n.t('success_created'));}
      Modal.close('modal-invoice');await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  _openPayment(invId){
    document.getElementById('pay-save-btn').dataset.invId=invId;
    document.getElementById('pay-amount').value='';
    document.getElementById('pay-date').value=Format.dateInput(new Date());
    document.getElementById('pay-method').value='cash';
    document.getElementById('pay-notes').value='';
    Modal.open('modal-payment');
    document.getElementById('pay-amount').focus();
  },

  async _savePayment(){
    const invId=document.getElementById('pay-save-btn').dataset.invId;
    const amount=parseFloat(document.getElementById('pay-amount').value);
    if(!amount||amount<=0){Toast.warning(i18n.t('error_required'));return;}
    const inv=this._invoices.find(x=>x.id===invId);if(!inv)return;
    const newPaid=Math.min((inv.paid||0)+amount,inv.total||0);
    const newStatus=newPaid>=(inv.total||0)?'paid':newPaid>0?'partial':'unpaid';
    const dateVal=document.getElementById('pay-date').value;
    try{
      await userCol(Collections.INVOICES).doc(invId).update({paid:newPaid,status:newStatus,updatedAt:now()});
      await userCol(Collections.PAYMENTS).add({invoiceId:invId,amount,date:dateVal?Timestamp.fromDate(new Date(dateVal)):now(),method:document.getElementById('pay-method').value,notes:document.getElementById('pay-notes').value.trim(),createdAt:now()});
      Toast.success(i18n.t('success_saved'));
      if(newStatus==='paid')Toast.success('🎉 '+(i18n.getLang()==='fr'?'Facture entièrement payée !':'Invoice fully paid!'));
      Modal.close('modal-payment');await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },

  async _generatePDF(id){
    const inv=this._invoices.find(x=>x.id===id);if(!inv)return;
    const client=this._clients.find(c=>c.id===inv.clientId);
    const {jsPDF}=(window.jspdf||window);if(!jsPDF){Toast.error(i18n.getLang()==='fr'?'Module PDF non chargé':'PDF module not loaded');return;}
    const doc=new jsPDF();
    const currency=inv.currency||Prefs.getCurrency();
    const userProfile=AppState.userProfile||{};
    const lang=i18n.getLang();
    // Header
    doc.setFillColor(15,27,45);doc.rect(0,0,210,40,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(201,151,42);
    doc.text('KANTARA',20,18);
    doc.setFontSize(10);doc.setTextColor(255,255,255);
    doc.text(userProfile.displayName||'',20,26);
    if(userProfile.company)doc.text(userProfile.company,20,32);
    // Invoice label
    doc.setFontSize(16);doc.setTextColor(15,27,45);doc.setFont('helvetica','bold');
    doc.text((lang==='fr'?'FACTURE':'INVOICE')+` ${inv.number||''}`,210-20,55,{align:'right'});
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
    doc.text(`${lang==='fr'?'Date':'Date'}: ${Format.date(inv.date)}`,210-20,62,{align:'right'});
    doc.text(`${lang==='fr'?'Échéance':'Due'}: ${Format.date(inv.dueDate)}`,210-20,68,{align:'right'});
    // Client info
    doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(15,27,45);
    doc.text(lang==='fr'?'FACTURER À:':'BILL TO:',20,55);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,60);
    if(client){doc.text(client.name,20,62);if(client.phone)doc.text(client.phone,20,68);if(client.email)doc.text(client.email,20,74);}
    // Line separator
    doc.setDrawColor(201,151,42);doc.setLineWidth(0.5);doc.line(20,82,190,82);
    // Items table
    const tableData=(inv.lines||[]).map(l=>[l.description,l.qty,Format.currency(l.unitPrice,currency),Format.currency(l.total,currency)]);
    doc.autoTable({startY:87,head:[[lang==='fr'?'Description':'Description',lang==='fr'?'Qté':'Qty',lang==='fr'?'Prix unitaire':'Unit Price',lang==='fr'?'Total':'Total']],body:tableData,theme:'grid',headStyles:{fillColor:[15,27,45],textColor:[201,151,42],fontStyle:'bold',fontSize:9},bodyStyles:{fontSize:9,textColor:[40,40,40]},columnStyles:{0:{cellWidth:85},1:{cellWidth:20,halign:'center'},2:{cellWidth:40,halign:'right'},3:{cellWidth:35,halign:'right'}},margin:{left:20,right:20}});
    const finalY=doc.lastAutoTable.finalY+10;
    // Totals
    const taxAmt=(inv.subtotal||0)*((inv.tax||0)/100);
    doc.setFillColor(248,245,240);doc.rect(120,finalY,70,inv.tax?42:32,'F');
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
    doc.text(lang==='fr'?'Sous-total:':'Subtotal:',125,finalY+9);doc.text(Format.currency(inv.subtotal||0,currency),190,finalY+9,{align:'right'});
    if(inv.tax){doc.text(`${lang==='fr'?'Taxe':'Tax'} (${inv.tax}%):`,125,finalY+18);doc.text(Format.currency(taxAmt,currency),190,finalY+18,{align:'right'});}
    const totY=inv.tax?finalY+32:finalY+22;
    doc.setDrawColor(201,151,42);doc.line(120,totY-5,190,totY-5);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(15,27,45);
    doc.text(lang==='fr'?'TOTAL:':'TOTAL:',125,totY+2);doc.text(Format.currency(inv.total||0,currency),190,totY+2,{align:'right'});
    // Paid
    if(inv.paid>0){doc.setFontSize(9);doc.setTextColor(22,163,74);doc.text(`${lang==='fr'?'Reçu:':'Received:'} ${Format.currency(inv.paid,currency)}`,125,totY+12);doc.setTextColor(220,38,38);doc.text(`${lang==='fr'?'Solde:':'Balance:'} ${Format.currency((inv.total||0)-(inv.paid||0),currency)}`,125,totY+20);}
    // Footer
    doc.setFontSize(8);doc.setTextColor(150,150,150);doc.setFont('helvetica','normal');
    const footY=280;doc.setDrawColor(220,220,220);doc.line(20,footY-5,190,footY-5);
    doc.text('Generated by KANTARA — kantara.app',105,footY,{align:'center'});
    if(inv.notes){doc.text(inv.notes,20,footY-12);}
    doc.save(`Facture_${inv.number||id}.pdf`);
    Toast.success(i18n.t('invoice_download'));
  },

  _delete(id){
    const i=this._invoices.find(x=>x.id===id);
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:`"${i?.number}"`,onConfirm:async()=>{
      await userCol(Collections.INVOICES).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();
    }});
  }
};

// ═══════════════════════════════════════════════
// KANTARA — Proofs Module
// ═══════════════════════════════════════════════
const Proofs = {
  _panel:null, _proofs:[], _projects:[], _expenses:[],
  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },
  _render(){
    this._panel.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-header-title">${i18n.t('proofs_title')}</h2><p class="page-header-subtitle">${i18n.t('proofs_subtitle')}</p></div><div class="page-header-actions"><button class="btn btn-primary" id="pr-new-btn"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${i18n.t('proof_add')}</button></div></div>
      <div id="pr-content"></div>
      <!-- Modal -->
      <div class="modal-overlay" id="modal-proof" style="display:none">
        <div class="modal">
          <div class="modal-header"><div><div class="modal-title">${i18n.t('proof_add')}</div></div><button class="modal-close" onclick="Modal.close('modal-proof')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
          <div class="modal-body"><div class="field-group">
            <div class="field"><label class="field-label">${i18n.getLang()==='fr'?'Fichier (photo ou PDF)':'File (photo or PDF)'} <span class="field-required">*</span></label>
              <div class="upload-zone" id="pr-upload-zone">
                <div class="upload-zone-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                <div class="upload-zone-text"><strong>${i18n.getLang()==='fr'?'Cliquez ou glissez':'Click or drag'}</strong> ${i18n.getLang()==='fr'?'un fichier ici':'a file here'}</div>
                <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">PNG, JPG, PDF — max 5MB</div>
              </div>
              <input type="file" id="pr-file" accept="image/*,application/pdf" style="display:none"/>
              <div id="pr-file-preview" style="display:none;margin-top:8px;padding:10px;background:var(--cream);border-radius:var(--radius-md);align-items:center;gap:10px"></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">${i18n.getLang()==='fr'?'Type de document':'Document Type'}</label><select class="field-select" id="pr-type"><option value="photo">${i18n.t('proof_type_photo')}</option><option value="invoice">${i18n.t('proof_type_invoice')}</option><option value="receipt">${i18n.t('proof_type_receipt')}</option><option value="other">${i18n.t('proof_type_other')}</option></select></div>
              <div class="field"><label class="field-label">${i18n.t('proof_link_to')}</label><select class="field-select" id="pr-link"><option value="">${i18n.t('none')}</option></select></div>
            </div>
            <div class="field"><label class="field-label">${i18n.t('notes')}</label><input type="text" class="field-input" id="pr-notes" placeholder="${i18n.t('notes')}..."/></div>
          </div></div>
          <div class="modal-footer"><button class="btn btn-outline" onclick="Modal.close('modal-proof')">${i18n.t('cancel')}</button><button class="btn btn-primary" id="pr-save-btn">${i18n.t('save')}</button></div>
        </div>
      </div>
    `;
    document.getElementById('pr-new-btn')?.addEventListener('click',()=>this._openModal());
    document.getElementById('pr-save-btn')?.addEventListener('click',()=>this._save());
    const zone=document.getElementById('pr-upload-zone');
    const fileInput=document.getElementById('pr-file');
    zone?.addEventListener('click',()=>fileInput?.click());
    zone?.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
    zone?.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
    zone?.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)this._previewFile(f);});
    fileInput?.addEventListener('change',e=>{const f=e.target.files[0];if(f)this._previewFile(f);});
  },
  _previewFile(file){
    document.getElementById('pr-save-btn')._file=file;
    const prev=document.getElementById('pr-file-preview');
    if(prev){
      const isImg=file.type.startsWith('image/');
      prev.style.display='flex';
      prev.innerHTML=`<div style="width:40px;height:40px;border-radius:6px;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">${isImg?`<img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover"/>`:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>'}</div><div style="flex:1"><div style="font-size:.82rem;font-weight:500;color:var(--navy)">${file.name}</div><div style="font-size:.72rem;color:var(--text-muted)">${Format.fileSize(file.size)}</div></div>`;
    }
  },
  async _load(){
    try{
      const [prSnap,projSnap,expSnap]=await Promise.all([userCol(Collections.PROOFS).orderBy('createdAt','desc').get(),userCol(Collections.PROJECTS).get(),userCol(Collections.EXPENSES).get()]);
      this._proofs=prSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._projects=projSnap.docs.map(d=>({id:d.id,...d.data()}));
      this._expenses=expSnap.docs.map(d=>({id:d.id,...d.data()}));
      const lnkOpts=[`<option value="">${i18n.t('none')}</option>`,...this._projects.map(p=>`<option value="project:${p.id}">📁 ${p.name}</option>`),...this._expenses.map(e=>`<option value="expense:${e.id}">💰 ${Format.truncate(e.title||e.description||'',30)}</option>`)].join('');
      const lnkSel=document.getElementById('pr-link');if(lnkSel)lnkSel.innerHTML=lnkOpts;
      this._renderList();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
  },
  _renderList(){
    const el=document.getElementById('pr-content');if(!el)return;
    if(!this._proofs.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><h3 class="empty-title">${i18n.t('proof_no_proofs')}</h3><button class="btn btn-primary" onclick="document.getElementById('pr-new-btn').click()">+ ${i18n.t('proof_add')}</button></div>`;return;}
    el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px">
      ${this._proofs.map(p=>`<div class="card" style="overflow:hidden;cursor:pointer" onclick="window.open('${p.url||'#'}','_blank')">
        <div style="height:120px;background:var(--cream);display:flex;align-items:center;justify-content:center;overflow:hidden">
          ${p.url&&p.type!=='pdf'?`<img src="${p.url}" style="width:100%;height:100%;object-fit:cover"/>`:`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`}
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:.78rem;font-weight:500;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.fileName||'—'}</div>
          <div style="font-size:.68rem;color:var(--text-muted);margin-top:2px">${Format.timeAgo(p.createdAt)}</div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="action-btn delete" onclick="event.stopPropagation();Proofs._delete('${p.id}')">${deleteIcon()}</button></div>
        </div>
      </div>`).join('')}
    </div>`;
  },
  _openModal(){ Modal.open('modal-proof'); },
  async _save(){
    const btn=document.getElementById('pr-save-btn');
    const file=btn._file;if(!file){Toast.warning(i18n.t('error_required'));return;}
    btn.disabled=true;btn.textContent=i18n.t('loading');
    try{
      const compressed=file.type.startsWith('image/')?await compressImage(file):file;
      const user=Auth.getUser();if(!user)return;
      const dt=new Date();const fname=`${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}_${file.name}`;
      const userId = (typeof Auth !== 'undefined' ? Auth.getUser()?.uid : null) || 'local';
      const ref=storage.ref(`proofs/${userId}/${Date.now()}_${fname}`);
      await ref.put(compressed);
      const url=await ref.getDownloadURL();
      const lnkVal=document.getElementById('pr-link')?.value;
      const [lnkType,lnkId]=lnkVal?lnkVal.split(':'):['',''];
      await userCol(Collections.PROOFS).add({url,fileName:fname,type:document.getElementById('pr-type')?.value||'other',notes:document.getElementById('pr-notes')?.value?.trim()||'',linkType:lnkType||null,linkId:lnkId||null,createdAt:now()});
      Toast.success(i18n.t('success_saved'));Modal.close('modal-proof');btn._file=null;
      // BUG #15 FIX: Reset preview UI and file input after upload
      const prev=document.getElementById('pr-file-preview');if(prev)prev.style.display='none';
      const fi=document.getElementById('pr-file');if(fi)fi.value='';
      await this._load();
    }catch(err){Toast.error(i18n.t('error_generic'),err.message);}
    finally{btn.disabled=false;btn.textContent=i18n.t('save');}
  },
  _delete(id){Modal.confirm({title:i18n.t('confirm_delete_title'),message:'',onConfirm:async()=>{await userCol(Collections.PROOFS).doc(id).delete();Toast.success(i18n.t('success_deleted'));await this._load();}});}
};

// ═══════════════════════════════════════════════
// KANTARA — Notifications Module
// ═══════════════════════════════════════════════
const Notifications = {
  _notifs:[], _unreadCount:0,

  async loadCount(){
    try{
      const snap=await userCol(Collections.NOTIFICATIONS).where('read','==',false).get();
      this._unreadCount=snap.size||snap.docs?.length||0;
      const dot=document.getElementById('notif-dot');
      if(dot) dot.style.display = this._unreadCount > 0 ? 'block' : 'none';
    }catch(e){
      // On error, hide the dot to avoid stale display
      const dot=document.getElementById('notif-dot');
      if(dot) dot.style.display='none';
    }
  },

  async renderPanel(){
    try{
      const snap=await userCol(Collections.NOTIFICATIONS).orderBy('createdAt','desc').limit(20).get();
      this._notifs=snap.docs.map(d=>({id:d.id,...d.data()}));
      const el=document.getElementById('notif-list');if(!el)return;
      if(!this._notifs.length){el.innerHTML=`<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:.85rem">${i18n.t('notif_no_notifications')}</div>`;return;}
      el.innerHTML=this._notifs.map(n=>`<div class="notif-item ${n.read?'':'unread'}" onclick="Notifications._markRead('${n.id}')">
        <div class="notif-dot-badge" style="${n.read?'opacity:0':''}"></div>
        <div style="flex:1"><div class="notif-item-title">${n.title||'—'}</div><div class="notif-item-text">${n.message||''}</div><div class="notif-item-time">${Format.timeAgo(n.createdAt)}</div></div>
      </div>`).join('');
    }catch(e){}
  },

  async _markRead(id){
    try{await userCol(Collections.NOTIFICATIONS).doc(id).update({read:true});await this.renderPanel();await this.loadCount();}catch(e){}
  },

  async markAllRead(){
    try{
      const snap=await userCol(Collections.NOTIFICATIONS).where('read','==',false).get();
      const batch=db.batch();
      snap.docs.forEach(d=>batch.update(d.ref,{read:true}));
      await batch.commit();
      await this.renderPanel();await this.loadCount();
    }catch(e){}
  }
};

// ═══════════════════════════════════════════════
// KANTARA — Reports Module
// ═══════════════════════════════════════════════
const Reports = {
  _panel:null,
  async init(panel){ this._panel=panel; this._render(); await this._load(); },
  async refresh(){ await this._load(); },
  _render(){
    this._panel.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-header-title">${i18n.t('reports_title')}</h2><p class="page-header-subtitle">${i18n.t('reports_subtitle')}</p></div></div>
      <div class="tabs">
        <div class="tab-item active" data-tab="financial">${i18n.t('report_financial')}</div>
        <div class="tab-item" data-tab="expenses">${i18n.t('report_expenses')}</div>
        <div class="tab-item" data-tab="clients">${i18n.t('report_client')}</div>
      </div>
      <div id="rep-content"></div>
    `;
    this._panel.querySelectorAll('.tab-item').forEach(t=>{
      t.addEventListener('click',()=>{
        this._panel.querySelectorAll('.tab-item').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        this._renderTab(t.dataset.tab);
      });
    });
  },
  async _load(){
    try{
      const [projSnap,expSnap,invSnap,clSnap]=await Promise.all([
        userCol(Collections.PROJECTS).get(),
        userCol(Collections.EXPENSES).get(),
        userCol(Collections.INVOICES).get(),
        userCol(Collections.CLIENTS).get()
      ]);
      AppState.projects=projSnap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.expenses=expSnap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.invoices=invSnap.docs.map(d=>({id:d.id,...d.data()}));
      AppState.clients=clSnap.docs.map(d=>({id:d.id,...d.data()}));
    }catch(e){}
    await this._renderTab('financial');
  },
  async _renderTab(tab){
    const el=document.getElementById('rep-content');if(!el)return;
    const projects=AppState.projects||[];
    const expenses=AppState.expenses||[];
    const invoices=AppState.invoices||[];
    const clients=AppState.clients||[];
    const currency=Prefs.getCurrency();

    if(tab==='financial'){
      const totalBudget=projects.reduce((s,p)=>s+(p.budget||0),0);
      const totalExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
      const totalInvoiced=invoices.reduce((s,i)=>s+(i.total||0),0);
      const totalPaid=invoices.reduce((s,i)=>s+(i.paid||0),0);
      el.innerHTML=`
        <div class="grid-2" style="margin-bottom:24px">
          <div class="card card-body">
            <h3 style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);margin-bottom:16px">${i18n.getLang()==='fr'?'Résumé financier':'Financial Summary'}</h3>
            ${[
              [i18n.t('dash_total_budget'),Format.currency(totalBudget,currency),'var(--navy)'],
              [i18n.t('dash_total_expenses'),Format.currency(totalExp,currency),'var(--danger)'],
              [i18n.t('dash_balance'),Format.currency(totalBudget-totalExp,currency),(totalBudget-totalExp)<0?'var(--danger)':'var(--success)'],
              ['—','—',''],
              [i18n.getLang()==='fr'?'Total facturé':'Total Invoiced',Format.currency(totalInvoiced,currency),'var(--navy)'],
              [i18n.getLang()==='fr'?'Total reçu':'Total Received',Format.currency(totalPaid,currency),'var(--success)'],
              [i18n.t('client_balance'),Format.currency(totalInvoiced-totalPaid,currency),'var(--danger)'],
            ].map(([l,v,c])=>l==='—'?`<hr style="border:none;border-top:1px solid var(--divider);margin:8px 0"/>`:
              `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider);font-size:.88rem"><span style="color:var(--text-muted)">${l}</span><strong style="color:${c}">${v}</strong></div>`
            ).join('')}
          </div>
          <div class="card card-body">
            <h3 style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);margin-bottom:16px">${i18n.getLang()==='fr'?'Par projet':'By Project'}</h3>
            ${projects.slice(0,8).map(p=>{
              const spent=expenses.filter(e=>e.projectId===p.id).reduce((s,e)=>s+(e.amount||0),0);
              const pct=p.budget?Format.percent(spent,p.budget):0;
              return`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px"><span style="color:var(--navy);font-weight:500">${Format.truncate(p.name,30)}</span><span style="color:var(--text-muted)">${Format.currency(spent,currency)} / ${Format.currency(p.budget||0,currency)}</span></div><div class="progress-bar"><div class="progress-fill ${pct>=100?'danger':pct>=80?'warning':''}" style="width:${pct}%"></div></div></div>`;
            }).join('')}
          </div>
        </div>
        <div class="card" style="padding:20px">
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn btn-gold btn-sm" onclick="Reports._exportPDF()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>${i18n.t('report_export_pdf')}</button>
          </div>
          <canvas id="rep-monthly-chart" height="120"></canvas>
        </div>
      `;
      setTimeout(()=>{
        const canvas=document.getElementById('rep-monthly-chart');if(!canvas)return;
        const months=[];const now=new Date();
        for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({label:d.toLocaleString(i18n.getLang()==='fr'?'fr-FR':'en-US',{month:'short'}),year:d.getFullYear(),month:d.getMonth()});}
        const expData=months.map(m=>expenses.filter(e=>{const d=e.date?.toDate?safeDate(e.date):new Date(e.date);return d.getFullYear()===m.year&&d.getMonth()===m.month;}).reduce((s,e)=>s+(e.amount||0),0));
        const invData=months.map(m=>invoices.filter(i=>{const d=i.date?.toDate?safeDate(i.date):new Date(i.date);return d&&d.getFullYear()===m.year&&d.getMonth()===m.month;}).reduce((s,i)=>s+(i.paid||0),0));
        const isDark=document.documentElement.getAttribute('data-theme')==='dark';
        const tc=isDark?'#B0BBC8':'#4A5568';const gc=isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';
        new Chart(canvas,{type:'line',data:{labels:months.map(m=>m.label),datasets:[{label:i18n.getLang()==='fr'?'Revenus':'Revenue',data:invData,borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.1)',tension:.4,fill:true},{label:i18n.t('nav_expenses'),data:expData,borderColor:'#C9972A',backgroundColor:'rgba(201,151,42,.1)',tension:.4,fill:true}]},options:{responsive:true,plugins:{legend:{labels:{color:tc,font:{size:11}}}},scales:{x:{ticks:{color:tc,font:{size:11}},grid:{color:gc}},y:{ticks:{color:tc,font:{size:11},callback:v=>Format.currency(v,currency)},grid:{color:gc}}}}});
      },200);
    } else if(tab==='expenses'){
      const byCategory={};expenses.forEach(e=>{byCategory[e.category]=(byCategory[e.category]||0)+(e.amount||0);});
      const catLabels={materials:i18n.t('expense_cat_materials'),transport:i18n.t('expense_cat_transport'),labor:i18n.t('expense_cat_labor'),equipment:i18n.t('expense_cat_equipment'),misc:i18n.t('expense_cat_misc')};
      el.innerHTML=`
        <div class="grid-2" style="margin-bottom:24px">
          <div class="card card-body">
            <h3 style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);margin-bottom:16px">${i18n.getLang()==='fr'?'Par catégorie':'By Category'}</h3>
            ${Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amount])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider);font-size:.88rem"><span style="color:var(--text-muted)">${catLabels[cat]||cat}</span><strong style="color:var(--navy)">${Format.currency(amount,currency)}</strong></div>`).join('')}
          </div>
          <div class="card card-body" style="display:flex;align-items:center;justify-content:center"><canvas id="rep-cat-chart" style="max-height:280px"></canvas></div>
        </div>
      `;
      setTimeout(()=>{
        const canvas=document.getElementById('rep-cat-chart');if(!canvas)return;
        const isDark=document.documentElement.getAttribute('data-theme')==='dark';
        const tc=isDark?'#B0BBC8':'#4A5568';
        new Chart(canvas,{type:'pie',data:{labels:Object.keys(byCategory).map(k=>catLabels[k]||k),datasets:[{data:Object.values(byCategory),backgroundColor:['#C9972A','#1E3050','#22C55E','#6366F1','#94A3B8'],borderWidth:2,borderColor:isDark?'#162336':'#fff'}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:tc,font:{size:11},padding:12}}}}});
      },200);
    } else {
      el.innerHTML=`<div class="card"><div class="table-wrapper"><table><thead><tr><th>${i18n.t('name')}</th><th>${i18n.t('client_total_invoiced')}</th><th>${i18n.t('client_total_paid')}</th><th>${i18n.t('client_balance')}</th></tr></thead><tbody>
        ${clients.map(c=>{const ci=invoices.filter(i=>i.clientId===c.id);const inv=ci.reduce((s,i)=>s+(i.total||0),0);const paid=ci.reduce((s,i)=>s+(i.paid||0),0);const due=inv-paid;return`<tr><td><strong>${c.name}</strong></td><td>${Format.currency(inv,currency)}</td><td style="color:var(--success)">${Format.currency(paid,currency)}</td><td style="color:${due>0?'var(--danger)':'var(--success)'};font-weight:${due>0?600:400}">${Format.currency(due,currency)}</td></tr>`;}).join('')}
      </tbody></table></div></div>`;
    }
  },

  async _exportPDF(){
    const {jsPDF}=(window.jspdf||window);if(!jsPDF){Toast.error(i18n.getLang()==='fr'?'Module PDF non disponible':'PDF module not available');return;}
    const doc=new jsPDF();const currency=Prefs.getCurrency();const lang=i18n.getLang();
    const projects=AppState.projects||[];const expenses=AppState.expenses||[];const invoices=AppState.invoices||[];
    doc.setFillColor(15,27,45);doc.rect(0,0,210,35,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(201,151,42);doc.text('KANTARA',20,15);
    doc.setFontSize(10);doc.setTextColor(255,255,255);doc.text(lang==='fr'?'Rapport Financier':'Financial Report',20,24);
    doc.text(Format.date(new Date()),190,24,{align:'right'});
    const totalBudget=projects.reduce((s,p)=>s+(p.budget||0),0);
    const totalExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
    const totalInv=invoices.reduce((s,i)=>s+(i.total||0),0);
    const totalPaid=invoices.reduce((s,i)=>s+(i.paid||0),0);
    doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(15,27,45);
    doc.text(lang==='fr'?'Résumé':'Summary',20,50);
    doc.autoTable({startY:55,body:[[lang==='fr'?'Budget total':'Total Budget',Format.currency(totalBudget,currency)],[lang==='fr'?'Total dépenses':'Total Expenses',Format.currency(totalExp,currency)],[lang==='fr'?'Solde budget':'Budget Balance',Format.currency(totalBudget-totalExp,currency)],[lang==='fr'?'Total facturé':'Total Invoiced',Format.currency(totalInv,currency)],[lang==='fr'?'Total reçu':'Total Received',Format.currency(totalPaid,currency)],[lang==='fr'?'Solde clients':'Client Balance',Format.currency(totalInv-totalPaid,currency)]],theme:'striped',bodyStyles:{fontSize:9},columnStyles:{0:{fontStyle:'bold',textColor:[15,27,45]},1:{halign:'right'}},margin:{left:20,right:20}});
    doc.save('Rapport_Kantara.pdf');Toast.success(i18n.t('report_export_pdf'));
  }
};

// ═══════════════════════════════════════════════
// KANTARA — Settings Module (Supabase)
// ═══════════════════════════════════════════════
const Settings = {
  _panel:null, _followers:[],
  async init(panel){ this._panel=panel; await this._load(); this._render(); },
  async refresh(){ await this._load(); this._render(); },
  async _load(){
    try {
      const s = await KantaraDB.getSettings();
      AppState.userProfile = { ...AppState.userProfile,
        displayName: s.display_name || AppState.userProfile?.displayName || 'Administrateur',
        company:     s.company_name || AppState.userProfile?.company || '',
        currency:    s.currency     || AppState.userProfile?.currency || 'XOF',
      };
      if (Auth.isCreator()) this._followers = await KantaraDB.getFollowers();
    } catch(e) { console.warn('[Settings]', e.message); }
  },
  _render(){
    const user = Auth.getUser();
    const profile = AppState.userProfile || {};
    const isCreator = Auth.isCreator();
    const L = i18n.getLang();
    const t = (fr, en) => L === 'fr' ? fr : en;
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('settings_title')}</h2>
          <p class="page-header-subtitle">${t('Gérez votre espace Kantara','Manage your Kantara workspace')}</p>
        </div>
      </div>
      <div class="settings-grid">

        <div class="card card-body">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
            <div class="user-avatar" style="width:56px;height:56px;font-size:1.25rem;background:var(--navy)">${Format.initials(user?.displayName||'?')}</div>
            <div>
              <div style="font-weight:700;font-size:1rem;color:var(--navy)">${user?.displayName||'—'}</div>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">${isCreator?t('Administrateur','Administrator'):t('Observateur','Follower')}</div>
            </div>
          </div>
          ${isCreator ? `
          <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--navy);margin-bottom:16px">${i18n.t('settings_profile')}</h3>
          <div class="field-group">
            <div class="field"><label class="field-label">${t('Nom affiche','Display name')}</label><input type="text" class="field-input" id="set-name" value="${user?.displayName||''}"/></div>
            <div class="field"><label class="field-label">${i18n.t('auth_company')}</label><input type="text" class="field-input" id="set-company" value="${profile.company||''}"/></div>
            <button class="btn btn-primary" id="set-profile-save">${i18n.t('save')}</button>
          </div>` : `<p style="font-size:.85rem;color:var(--text-muted)">${t("Connecte en tant qu'observateur. Contactez l'administrateur.","Connected as observer.")}</p>`}
        </div>

        <div class="card card-body">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--navy);margin-bottom:16px">${i18n.t('settings_preferences')}</h3>
          <div class="field-group">
            <div class="field"><label class="field-label">${i18n.t('settings_language')}</label>
              <select class="field-select" id="set-lang">
                <option value="fr" ${i18n.getLang()==='fr'?'selected':''}>Français</option>
                <option value="en" ${i18n.getLang()==='en'?'selected':''}>English</option>
              </select>
            </div>
            <div class="field"><label class="field-label">${i18n.t('settings_currency')}</label>
              <select class="field-select" id="set-currency">
                ${['XOF','XAF','USD','EUR','GBP','NGN','GHS','MAD','TND','EGP','ZAR','KES'].map(c=>`<option value="${c}" ${Prefs.getCurrency()===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label class="field-label">${i18n.t('settings_theme')}</label>
              <select class="field-select" id="set-theme">
                <option value="light" ${Prefs.get('theme')==='light'?'selected':''}>${i18n.t('settings_theme_light')}</option>
                <option value="dark" ${Prefs.get('theme')==='dark'?'selected':''}>${i18n.t('settings_theme_dark')}</option>
              </select>
            </div>
            <button class="btn btn-primary" id="set-prefs-save">${i18n.t('save')}</button>
          </div>
        </div>

        ${isCreator ? `
        <div class="card card-body">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--navy);margin-bottom:16px">${t('Mot de passe admin','Admin Password')}</h3>
          <div class="field-group">
            <div class="field"><label class="field-label">${t('Nouveau mot de passe','New password')}</label>
              <input type="password" class="field-input" id="set-new-pass" placeholder="${t('Nouveau mot de passe','New password')}"/>
            </div>
            <div class="field"><label class="field-label">${t('Confirmer','Confirm')}</label>
              <input type="password" class="field-input" id="set-confirm-pass" placeholder="${t('Confirmer','Confirm password')}"/>
            </div>
            <button class="btn btn-primary" id="set-pass-save">${t('Changer le mot de passe','Change password')}</button>
          </div>
        </div>

        <div class="card card-body" style="grid-column:1/-1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <div>
              <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--navy);margin-bottom:4px">${t('Observateurs','Followers')}</h3>
              <p style="font-size:.8rem;color:var(--text-muted)">${t('Gérez les personnes qui accèdent à vos projets','Manage access for people following your projects')}</p>
            </div>
            <button class="btn btn-primary btn-sm" id="set-add-follower">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${t('Ajouter','Add')}
            </button>
          </div>
          <div id="followers-list">${this._renderFollowers()}</div>
        </div>

        <div class="card card-body" style="border-color:rgba(220,38,38,.2)">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--danger);margin-bottom:12px">${i18n.t('settings_danger_zone')}</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" id="set-reset-supabase">${t('Reconfigurer Supabase','Reconfigure Supabase')}</button>
            <button class="btn btn-danger btn-sm" id="set-logout-btn">${t('Se déconnecter','Log out')}</button>
          </div>
        </div>` : ''}

      </div>

      <div class="modal-overlay" id="modal-follower" style="display:none">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title" id="follower-modal-title">${t('Nouvel observateur','New follower')}</div>
            <button class="modal-close" onclick="Modal.close('modal-follower')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="field-group">
              <div class="field"><label class="field-label">${t('Nom','Name')} <span style="color:var(--danger)">*</span></label><input type="text" class="field-input" id="follower-name" placeholder="${t('Ex: Jean Dupont','Ex: John Smith')}"/></div>
              <div class="field"><label class="field-label">${t("Code d'acces",'Access code')} <span style="color:var(--danger)">*</span></label>
                <div style="display:flex;gap:8px">
                  <input type="text" class="field-input" id="follower-code-input" placeholder="KAN-XXXXXX" style="text-transform:uppercase;letter-spacing:.1em;font-weight:600"/>
                  <button type="button" class="btn btn-outline btn-sm" id="follower-gen-code">${t('Générer','Generate')}</button>
                </div>
              </div>
              <div class="field"><label class="field-label">${t('Permissions','Permissions')}</label>
                <div style="display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--cream);border-radius:10px">
                  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.86rem">
                    <input type="checkbox" id="perm-view" checked disabled style="accent-color:var(--navy)"/>
                    <strong>${t('Voir','View')}</strong>
                  </label>
                  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.86rem">
                    <input type="checkbox" id="perm-edit" style="accent-color:var(--navy)"/>
                    <strong>${t('Modifier','Edit')}</strong>
                  </label>
                  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.86rem">
                    <input type="checkbox" id="perm-manage" style="accent-color:var(--navy)"/>
                    <strong>${t('Gérer','Manage')}</strong>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-follower')">${i18n.t('cancel')}</button>
            <button class="btn btn-primary" id="follower-save-btn">${i18n.t('save')}</button>
          </div>
        </div>
      </div>
    `;
    this._bindEvents(isCreator);
  },
  _renderFollowers(){
    const L = i18n.getLang();
    if (!this._followers.length) return `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:.86rem">${L==='fr'?'Aucun observateur.':'No followers yet.'}</div>`;
    return this._followers.map(f=>`
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
        <div class="user-avatar" style="width:38px;height:38px;font-size:.85rem;flex-shrink:0">${Format.initials(f.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.9rem;color:var(--navy)">${f.name}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">
            Code: <code style="background:var(--cream-dark);padding:1px 6px;border-radius:4px;font-size:.7rem;letter-spacing:.06em">${f.access_code}</code>
            &nbsp;·&nbsp; <span style="color:${f.is_active!==false?'var(--success)':'var(--text-muted)'}">${f.is_active!==false?(L==='fr'?'Actif':'Active'):(L==='fr'?'Inactif':'Inactive')}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="Settings._editFollower('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Settings._deleteFollower('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
        </div>
      </div>`).join('');
  },
  _bindEvents(isCreator){
    document.getElementById('set-profile-save')?.addEventListener('click',async()=>{
      const name=document.getElementById('set-name').value.trim();
      const company=document.getElementById('set-company').value.trim();
      try{ await Auth.updateProfile({displayName:name,company}); Toast.success(i18n.t('success_updated')); App._setupUser(Auth.getUser()); }
      catch(e){ Toast.error(i18n.t('error_generic'),e.message); }
    });
    document.getElementById('set-prefs-save')?.addEventListener('click',()=>{
      const lang=document.getElementById('set-lang').value;
      const currency=document.getElementById('set-currency').value;
      const theme=document.getElementById('set-theme').value;
      i18n.setLang(lang); Prefs.set('currency',currency).set('theme',theme).applyTheme();
      if(isCreator) Auth.updateProfile({currency,language:lang,theme}).catch(()=>{});
      Toast.success(i18n.t('success_saved'));
    });
    document.getElementById('set-pass-save')?.addEventListener('click',async()=>{
      const p=document.getElementById('set-new-pass').value;
      const c=document.getElementById('set-confirm-pass').value;
      const L=i18n.getLang();
      if(!p) return Toast.warning(L==='fr'?'Entrez un mot de passe':'Enter a password');
      if(p!==c) return Toast.warning(L==='fr'?'Les mots de passe ne correspondent pas':'Passwords do not match');
      try{ await KantaraDB.setAdminPassword(p); Toast.success(L==='fr'?'Mot de passe mis à jour !':'Password updated!'); document.getElementById('set-new-pass').value=''; document.getElementById('set-confirm-pass').value=''; }
      catch(e){ Toast.error(i18n.t('error_generic'),e.message); }
    });
    document.getElementById('set-reset-supabase')?.addEventListener('click',()=>{
      Modal.confirm({title:i18n.getLang()==='fr'?'Reconfigurer':'Reconfigure',message:i18n.getLang()==='fr'?'Vous serez déconnecté.':'You will be logged out.',
        onConfirm:()=>{ SetupWizard.clearConfig(); window.location.href='index.html'; }});
    });
    document.getElementById('set-logout-btn')?.addEventListener('click',()=>{
      Modal.confirm({title:i18n.t('confirm_logout_title')||'Déconnexion',message:i18n.t('confirm_logout_msg')||'Déconnexion ?',
        onConfirm:async()=>{ await Auth.logout(); window.location.href='index.html'; }});
    });
    document.getElementById('set-add-follower')?.addEventListener('click',()=>this._openFollowerModal());
    document.getElementById('follower-gen-code')?.addEventListener('click',()=>this._generateCode());
    document.getElementById('follower-save-btn')?.addEventListener('click',()=>this._saveFollower());
  },
  _generateCode(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code='KAN-';
    for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
    const inp=document.getElementById('follower-code-input');
    if(inp) inp.value=code;
  },
  _openFollowerModal(f=null){
    document.getElementById('follower-modal-title').textContent=f?(i18n.getLang()==='fr'?'Modifier':'Edit follower'):(i18n.getLang()==='fr'?'Nouvel observateur':'New follower');
    document.getElementById('follower-name').value=f?.name||'';
    document.getElementById('follower-code-input').value=f?.access_code||'';
    document.getElementById('perm-edit').checked=!!(f?.permissions?.edit);
    document.getElementById('perm-manage').checked=!!(f?.permissions?.manage);
    document.getElementById('follower-save-btn').dataset.editId=f?.id||'';
    if(!f) this._generateCode();
    Modal.open('modal-follower');
  },
  _editFollower(id){ const f=this._followers.find(f=>f.id===id); if(f) this._openFollowerModal(f); },
  _deleteFollower(id){
    Modal.confirm({title:i18n.t('confirm_delete_title'),message:i18n.getLang()==='fr'?'Supprimer cet observateur ?':'Delete this follower?',type:'danger',
      onConfirm:async()=>{
        try{ await KantaraDB.deleteFollower(id); this._followers=this._followers.filter(f=>f.id!==id); document.getElementById('followers-list').innerHTML=this._renderFollowers(); Toast.success(i18n.t('success_deleted')); }
        catch(e){ Toast.error(i18n.t('error_generic'),e.message); }
      }});
  },
  async _saveFollower(){
    const name=document.getElementById('follower-name')?.value?.trim();
    const code=document.getElementById('follower-code-input')?.value?.trim()?.toUpperCase();
    const editId=document.getElementById('follower-save-btn')?.dataset.editId;
    const permissions={view:true,edit:!!(document.getElementById('perm-edit')?.checked),manage:!!(document.getElementById('perm-manage')?.checked)};
    const L=i18n.getLang();
    if(!name) return Toast.warning(L==='fr'?'Entrez un nom':'Enter a name');
    if(!code) return Toast.warning(L==='fr'?"Entrez un code d'accès":'Enter an access code');
    try{
      if(editId){ await KantaraDB.updateFollower(editId,{name,access_code:code,permissions}); const idx=this._followers.findIndex(f=>f.id===editId); if(idx>=0) this._followers[idx]={...this._followers[idx],name,access_code:code,permissions}; }
      else{ const id=await KantaraDB.addFollower({name,access_code:code,permissions,is_active:true}); this._followers.unshift({id,name,access_code:code,permissions,is_active:true}); }
      document.getElementById('followers-list').innerHTML=this._renderFollowers();
      Modal.close('modal-follower'); Toast.success(i18n.t('success_saved'));
    }catch(e){ Toast.error(i18n.t('error_generic'),e.message); }
  },
};

// ═══════════════════════════════════════════════
// KANTARA — Notifications Full Page Module
// ═══════════════════════════════════════════════
const NotifPage = {
  _panel: null,

  async init(panel) {
    this._panel = panel;
    await this.refresh();
  },

  async refresh() {
    if (!this._panel) return;
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title">${i18n.t('notif_title')}</h2>
          <p class="page-header-subtitle">${i18n.getLang()==='fr'?'Toutes vos alertes et rappels':'All your alerts and reminders'}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline btn-sm" id="notifpage-markall">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            ${i18n.t('notif_mark_all_read')}
          </button>
          <button class="btn btn-ghost btn-sm" id="notifpage-clear" style="color:var(--danger)">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            ${i18n.t('notif_clear_all')}
          </button>
        </div>
      </div>
      <div id="notifpage-list"><div style="text-align:center;padding:60px 20px;color:var(--text-muted)">${i18n.t('loading')}</div></div>
    `;

    document.getElementById('notifpage-markall')?.addEventListener('click', async () => {
      await Notifications.markAllRead();
      await this.refresh();
    });

    document.getElementById('notifpage-clear')?.addEventListener('click', () => {
      Modal.confirm({
        title: i18n.t('notif_clear_all'),
        message: i18n.getLang()==='fr'?'Supprimer toutes les notifications ?':'Delete all notifications?',
        onConfirm: async () => {
          try {
            const snap = await userCol(Collections.NOTIFICATIONS).get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            await this.refresh();
            Notifications.loadCount();
          } catch(e) { Toast.error(i18n.t('error_generic')); }
        }
      });
    });

    await this._loadNotifs();
  },

  async _loadNotifs() {
    const el = document.getElementById('notifpage-list'); if (!el) return;
    try {
      const snap = await userCol(Collections.NOTIFICATIONS).orderBy('createdAt','desc').limit(50).get();
      const notifs = snap.docs.map(d => ({id:d.id,...d.data()}));

      if (!notifs.length) {
        el.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
            <h3 class="empty-title">${i18n.t('notif_no_notifications')}</h3>
          </div>`;
        return;
      }

      const typeIcon = (t) => {
        const icons = {
          budget:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
          task:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
          invoice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
          info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        };
        return icons[t] || icons.info;
      };

      const typeColor = (t) => ({budget:'var(--warning)',task:'var(--danger)',invoice:'var(--info)',info:'var(--text-muted)'})[t]||'var(--text-muted)';

      el.innerHTML = `<div class="card">
        ${notifs.map(n => `
          <div style="display:flex;gap:14px;padding:16px 20px;border-bottom:1px solid var(--divider);cursor:pointer;background:${n.read?'':'rgba(201,151,42,0.03)'};transition:background .15s"
               onclick="NotifPage._markRead('${n.id}',this)">
            <div style="width:38px;height:38px;border-radius:var(--radius-md);background:${typeColor(n.type)}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${typeColor(n.type)}">
              ${typeIcon(n.type)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span style="font-size:.87rem;font-weight:${n.read?400:600};color:var(--navy)">${n.title||'—'}</span>
                ${!n.read?'<span style="width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>':''}
              </div>
              <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5">${n.message||''}</div>
              <div style="font-size:.7rem;color:var(--text-muted);margin-top:5px">${Format.timeAgo(n.createdAt)}</div>
            </div>
            <button class="action-btn delete" onclick="event.stopPropagation();NotifPage._delete('${n.id}',this.closest('[onclick]'))" style="flex-shrink:0;align-self:center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('')}
      </div>`;
    } catch(e) {
      el.innerHTML = `<div class="empty-state"><p class="empty-description">${i18n.t('error_generic')}</p></div>`;
    }
  },

  async _markRead(id, el) {
    try {
      await userCol(Collections.NOTIFICATIONS).doc(id).update({read:true});
      el && (el.style.background = '');
      el && el.querySelector('span[style*="background:var(--gold)"]')?.remove();
      el && (el.querySelector('span[style*="font-weight:600"]') || el.querySelector('.font-weight-600'))?.style && 
        (el.querySelector('[style*="font-weight:600"]').style.fontWeight = '400');
      Notifications.loadCount();
    } catch(e) {}
  },

  async _delete(id, row) {
    try {
      await userCol(Collections.NOTIFICATIONS).doc(id).delete();
      row?.remove();
      Notifications.loadCount();
    } catch(e) {}
  }
};
