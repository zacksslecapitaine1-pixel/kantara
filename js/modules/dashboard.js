// ═══════════════════════════════════════════════
// KANTARA — Dashboard Module
// ═══════════════════════════════════════════════

const Dashboard = {
  _panel: null,
  _charts: {},

  async init(panel) {
    this._panel = panel;
    this._render();
    this._setGreeting();
    await this._loadData();
  },

  async refresh() {
    await this._loadData();
  },

  // Safe date helper — handles ISO strings AND Timestamp objects
  _toDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },

  _render() {
    const L = i18n.getLang();
    const t = (fr, en) => L === 'fr' ? fr : en;
    this._panel.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-header-title" id="dash-greeting">—</h2>
          <p class="page-header-subtitle">${i18n.t('dash_subtitle')}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline btn-sm" id="dash-refresh-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            ${i18n.t('refresh')}
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid-4" style="margin-bottom:24px">
        <div class="card stat-card">
          <div class="stat-label">${t('Budget total','Total Budget')}</div>
          <div class="stat-value" id="stat-budget-val">—</div>
          <div class="stat-trend" id="stat-budget-sub" style="font-size:.72rem;color:var(--text-muted);margin-top:4px"></div>
          <div class="stat-icon gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${t('Dépenses totales','Total Expenses')}</div>
          <div class="stat-value" id="stat-expenses-val">—</div>
          <div class="stat-trend" id="stat-expenses-sub" style="font-size:.72rem;color:var(--text-muted);margin-top:4px"></div>
          <div class="stat-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${t('Solde','Balance')}</div>
          <div class="stat-value" id="stat-balance-val">—</div>
          <div class="stat-trend" id="stat-balance-sub" style="font-size:.72rem;margin-top:4px"></div>
          <div class="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${t('Factures impayées','Unpaid Invoices')}</div>
          <div class="stat-value" id="stat-invoices-val">—</div>
          <div class="stat-trend" id="stat-invoices-sub" style="font-size:.72rem;color:var(--text-muted);margin-top:4px"></div>
          <div class="stat-icon info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div id="dash-alerts" style="margin-bottom:20px"></div>

      <!-- Charts -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Dépenses par catégorie','Expenses by Category')}</span>
          </div>
          <div class="card-body">
            <div style="height:220px;position:relative">
              <canvas id="chart-expense-cat"></canvas>
              <div id="chart-cat-empty" style="display:none;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-muted);font-size:.84rem">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                ${t('Aucune dépense','No expenses yet')}
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Revenus vs Dépenses (6 mois)','Revenue vs Expenses (6 months)')}</span>
          </div>
          <div class="card-body">
            <div style="height:220px"><canvas id="chart-monthly"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Projects + Tasks -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Projets récents','Recent Projects')}</span>
            <button class="btn btn-ghost btn-sm" data-page="/projects">${t('Voir tout','See all')}</button>
          </div>
          <div id="dash-projects-list" class="card-body" style="padding:0">${this._skeleton(3)}</div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Tâches à venir','Upcoming Tasks')}</span>
            <button class="btn btn-ghost btn-sm" data-page="/tasks">${t('Voir tout','See all')}</button>
          </div>
          <div id="dash-tasks-list" class="card-body" style="padding:0">${this._skeleton(4)}</div>
        </div>
      </div>

      <!-- Recent expenses -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('Dépenses récentes','Recent Expenses')}</span>
          <button class="btn btn-ghost btn-sm" data-page="/expenses">${t('Voir tout','See all')}</button>
        </div>
        <div id="dash-expenses-list">${this._skeleton(3)}</div>
      </div>

      <!-- v4: Activity Feed + Team Performance -->
      <div class="grid-2" style="margin-top:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Activité récente','Recent Activity')}</span>
            <span class="section-badge" id="activity-count-badge">0</span>
          </div>
          <div class="card-body" style="padding:0">
            <div id="dash-activity-feed" class="activity-feed" style="padding:0 20px;max-height:280px;overflow-y:auto">
              ${this._skeleton(4)}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">${t('Performance équipe','Team Performance')}</span>
            <button class="btn btn-ghost btn-sm" data-page="/team">${t('Voir équipe','See team')}</button>
          </div>
          <div id="dash-team-perf" class="card-body" style="max-height:280px;overflow-y:auto">
            ${this._skeleton(3)}
          </div>
        </div>
      </div>
    `;

    // Wire refresh btn
    document.getElementById('dash-refresh-btn')?.addEventListener('click', () => this.refresh());

    // Wire "voir tout" nav buttons
    this._panel.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => App._loadPage(btn.dataset.page));
    });
  },

  _skeleton(n) {
    return Array(n).fill(0).map(() => `
      <div style="padding:14px 20px;border-bottom:1px solid var(--divider);display:flex;gap:12px;align-items:center">
        <div class="skeleton" style="width:36px;height:36px;border-radius:8px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:11px;width:55%;margin-bottom:7px;border-radius:4px"></div>
          <div class="skeleton" style="height:9px;width:35%;border-radius:4px"></div>
        </div>
        <div class="skeleton" style="height:20px;width:65px;border-radius:20px"></div>
      </div>`).join('');
  },

  _setGreeting() {
    const h = new Date().getHours();
    const L = i18n.getLang();
    const user = Auth.getUser();
    const name = user?.displayName?.split(' ')[0] || '';
    const g = h < 12 ? (L === 'fr' ? 'Bonjour' : 'Good morning')
            : h < 18 ? (L === 'fr' ? 'Bon après-midi' : 'Good afternoon')
                     : (L === 'fr' ? 'Bonsoir' : 'Good evening');
    const el = document.getElementById('dash-greeting');
    if (el) el.textContent = `${g}${name ? ', ' + name : ''} 👋`;
  },

  async _loadData() {
    try {
      const [projSnap, expSnap, invSnap, taskSnap, teamSnap] = await Promise.all([
        userCol(Collections.PROJECTS).orderBy('createdAt', 'desc').get(),
        userCol(Collections.EXPENSES).orderBy('createdAt', 'desc').get(),
        userCol(Collections.INVOICES).get(),
        userCol(Collections.TASKS).get(),
        userCol(Collections.TEAM_MEMBERS).get().catch(() => ({ docs: [] })),
      ]);

      const projects = projSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const invoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const tasks    = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const members  = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      AppState.projects = projects;
      AppState.expenses = expenses;
      AppState.invoices = invoices;
      AppState.tasks    = tasks;

      const cur = Prefs.getCurrency();
      const totalBudget   = projects.reduce((s, p) => s + (+p.budget || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (+e.amount || 0), 0);
      const balance       = totalBudget - totalExpenses;
      const unpaidInv     = invoices.filter(i => i.status !== 'paid');
      const unpaidAmt     = unpaidInv.reduce((s, i) => s + ((+i.total || 0) - (+i.paid || 0)), 0);

      const sv = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      sv('stat-budget-val',   Format.currency(totalBudget, cur));
      sv('stat-expenses-val', Format.currency(totalExpenses, cur));
      sv('stat-budget-sub',   `${projects.length} ${i18n.getLang()==='fr'?'projets':'projects'}`);
      sv('stat-expenses-sub', `${expenses.length} ${i18n.getLang()==='fr'?'dépenses':'expenses'}`);
      sv('stat-invoices-val', Format.currency(unpaidAmt, cur));
      sv('stat-invoices-sub', `${unpaidInv.length} ${i18n.getLang()==='fr'?'en attente':'pending'}`);

      const balEl = document.getElementById('stat-balance-val');
      if (balEl) {
        balEl.textContent = Format.currency(balance, cur);
        balEl.style.color = balance < 0 ? 'var(--danger)' : 'var(--success)';
      }
      const balSub = document.getElementById('stat-balance-sub');
      if (balSub) {
        balSub.textContent = balance < 0
          ? (i18n.getLang()==='fr'?'Déficit':'Deficit')
          : (i18n.getLang()==='fr'?'Excédent':'Surplus');
        balSub.style.color = balance < 0 ? 'var(--danger)' : 'var(--success)';
      }

      this._renderAlerts(projects, tasks, invoices, expenses);
      this._renderCategoryChart(expenses);
      this._renderMonthlyChart(expenses, invoices);
      this._renderProjects(projects.slice(0,5), expenses, tasks);
      this._renderTasks(tasks);
      this._renderExpenses(expenses.slice(0,5));
      this._renderActivityFeed();
      this._renderTeamPerf(members, tasks);

    } catch(err) {
      console.error('[Dashboard]', err);
      Toast.error(i18n.t('error_generic'), err.message);
    }
  },

  _renderAlerts(projects, tasks, invoices, expenses) {
    const el = document.getElementById('dash-alerts');
    if (!el) return;
    const now = new Date();
    const L = i18n.getLang();
    const alerts = [];

    // Overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'done') return false;
      const d = this._toDate(t.dueDate);
      return d && d < now;
    });
    if (overdueTasks.length)
      alerts.push({ type:'warning', msg: `⏰ ${overdueTasks.length} ${L==='fr'?'tâche(s) en retard':'overdue task(s)'}` });

    // Over-budget
    projects.forEach(p => {
      const spent = expenses.filter(e => e.projectId === p.id).reduce((s,e) => s+(+e.amount||0), 0);
      if (p.budget && spent > +p.budget)
        alerts.push({ type:'danger', msg: `⚠️ ${L==='fr'?'Budget dépassé':'Over budget'}: <strong>${p.name}</strong>` });
    });

    // Overdue invoices
    const overdueInv = invoices.filter(i => {
      if (i.status === 'paid') return false;
      const d = this._toDate(i.dueDate);
      return d && d < now;
    });
    if (overdueInv.length)
      alerts.push({ type:'danger', msg: `💸 ${overdueInv.length} ${L==='fr'?'facture(s) en retard':'invoice(s) overdue'}` });

    el.innerHTML = alerts.map(a => `
      <div style="background:${a.type==='danger'?'rgba(220,38,38,.07)':'rgba(217,119,6,.07)'};border:1px solid ${a.type==='danger'?'rgba(220,38,38,.2)':'rgba(217,119,6,.2)'};border-left:4px solid var(--${a.type});border-radius:10px;padding:12px 16px;margin-bottom:8px;font-size:.85rem;color:var(--${a.type})">
        ${a.msg}
      </div>`).join('');
  },

  _renderCategoryChart(expenses) {
    const canvas = document.getElementById('chart-expense-cat');
    const empty  = document.getElementById('chart-cat-empty');
    if (!canvas) return;
    if (this._charts.cat) { this._charts.cat.destroy(); this._charts.cat = null; }
    if (!expenses.length) {
      canvas.style.display = 'none';
      if (empty) empty.style.display = 'flex';
      return;
    }
    canvas.style.display = '';
    if (empty) empty.style.display = 'none';

    const totals = {};
    expenses.forEach(e => { totals[e.category||'misc'] = (totals[e.category||'misc']||0) + (+e.amount||0); });
    const labels = Object.keys(totals);
    const data   = Object.values(totals);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    this._charts.cat = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: ['#C9972A','#1E3050','#22C55E','#6366F1','#94A3B8','#F59E0B','#EC4899'], borderWidth: 2, borderColor: isDark ? '#162336' : '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position:'right', labels:{ color: isDark?'#B0BBC8':'#4A5568', padding:10, font:{size:11} } },
          tooltip: { callbacks: { label: ctx => ` ${Format.currency(ctx.raw, Prefs.getCurrency())}` } }
        }
      }
    });
  },

  _renderMonthlyChart(expenses, invoices) {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    if (this._charts.monthly) { this._charts.monthly.destroy(); this._charts.monthly = null; }

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ label: d.toLocaleString(i18n.getLang()==='fr'?'fr-FR':'en-US',{month:'short'}), y: d.getFullYear(), m: d.getMonth() });
    }

    const sum = (arr, field) => months.map(mo =>
      arr.filter(e => {
        const d = this._toDate(e.date || e.created_at || e.createdAt);
        return d && d.getFullYear()===mo.y && d.getMonth()===mo.m;
      }).reduce((s,e)=>s+(+e[field]||0),0)
    );

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tc = isDark ? '#B0BBC8' : '#4A5568';
    const gc = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    this._charts.monthly = new Chart(canvas, {
      type:'bar',
      data: {
        labels: months.map(m=>m.label),
        datasets: [
          { label: i18n.getLang()==='fr'?'Revenus reçus':'Revenue', data: sum(invoices,'paid'), backgroundColor:'rgba(34,197,94,0.75)', borderRadius:5 },
          { label: i18n.getLang()==='fr'?'Dépenses':'Expenses',    data: sum(expenses,'amount'), backgroundColor:'rgba(201,151,42,0.75)', borderRadius:5 }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:ctx=>` ${Format.currency(ctx.raw,Prefs.getCurrency())}`}} },
        scales: { x:{ticks:{color:tc,font:{size:11}},grid:{color:gc}}, y:{ticks:{color:tc,font:{size:11},callback:v=>Format.currency(v,Prefs.getCurrency())},grid:{color:gc}} }
      }
    });
  },

  _renderProjects(projects, expenses, tasks) {
    const el = document.getElementById('dash-projects-list');
    if (!el) return;
    if (!projects.length) {
      el.innerHTML = `<div class="empty-state" style="padding:32px"><p class="empty-description" style="margin:0">${i18n.getLang()==='fr'?'Aucun projet pour le moment.':'No projects yet.'}</p></div>`;
      return;
    }
    const statusClasses = { active:'badge-active', done:'badge-done', paused:'badge-paused' };
    const statusLabels  = { active:i18n.t('project_active'), done:i18n.t('project_done'), paused:i18n.t('project_paused') };
    el.innerHTML = projects.map(p => {
      const spent = expenses.filter(e=>e.projectId===p.id).reduce((s,e)=>s+(+e.amount||0),0);
      const pct   = p.budget ? Math.min(100, Math.round(spent/+p.budget*100)) : 0;
      const tCount = tasks.filter(t=>t.projectId===p.id).length;
      return `
        <div class="dash-row" onclick="App._loadPage('/projects')" style="padding:14px 20px;border-bottom:1px solid var(--divider);cursor:pointer;transition:background .15s">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:600;font-size:.87rem;color:var(--navy)">${Format.truncate(p.name||'—',30)}</span>
            <span class="badge ${statusClasses[p.status]||'badge-low'}">${statusLabels[p.status]||p.status}</span>
          </div>
          <div class="progress-bar" style="margin-bottom:6px"><div class="progress-fill ${pct>=100?'danger':pct>=80?'warning':''}" style="width:${pct}%"></div></div>
          <div style="display:flex;gap:12px;font-size:.72rem;color:var(--text-muted)">
            <span>${pct}% ${i18n.getLang()==='fr'?'utilisé':'used'}</span>
            <span>${tCount} ${i18n.t('nav_tasks').toLowerCase()}</span>
            ${p.budget?`<span>${Format.currency(+p.budget,Prefs.getCurrency())}</span>`:''}
          </div>
        </div>`;
    }).join('');
    el.querySelectorAll('.dash-row').forEach(r=>{
      r.addEventListener('mouseenter',()=>r.style.background='var(--bg-hover)');
      r.addEventListener('mouseleave',()=>r.style.background='');
    });
  },

  _renderTasks(tasks) {
    const el = document.getElementById('dash-tasks-list');
    if (!el) return;
    const now = new Date();
    const upcoming = tasks
      .filter(t=>t.status!=='done')
      .map(t=>({ ...t, _due: this._toDate(t.dueDate) }))
      .sort((a,b)=> (a._due||new Date(9999,0)) - (b._due||new Date(9999,0)))
      .slice(0,6);

    if (!upcoming.length) {
      el.innerHTML = `<div class="empty-state" style="padding:32px"><p class="empty-description" style="margin:0">${i18n.getLang()==='fr'?'Aucune tâche en cours.':'No pending tasks.'}</p></div>`;
      return;
    }
    const dotColor = { todo:'var(--text-light)', inprogress:'var(--info)', blocked:'var(--danger)', done:'var(--success)' };
    el.innerHTML = upcoming.map(t=>{
      const overdue = t._due && t._due < now;
      return `
        <div style="padding:12px 20px;border-bottom:1px solid var(--divider);display:flex;align-items:center;gap:12px">
          <div style="width:8px;height:8px;border-radius:50%;background:${dotColor[t.status]||'var(--text-light)'};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:500;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Format.truncate(t.title||'—',35)}</div>
            ${t._due?`<div style="font-size:.72rem;color:${overdue?'var(--danger)':'var(--text-muted)'}">${overdue?'⚠️ ':''}${Format.date(t._due)}</div>`:''}
          </div>
          <span class="badge badge-${t.priority==='high'?'high':t.priority==='medium'?'medium':'low'}" style="font-size:.65rem;flex-shrink:0">${t.priority||'—'}</span>
        </div>`;
    }).join('');
  },

  _renderActivityFeed() {
    const el = document.getElementById('dash-activity-feed');
    if (!el) return;
    const logs = ActivityLog.get();
    const badge = document.getElementById('activity-count-badge');
    if (badge) badge.textContent = logs.length;
    if (!logs.length) {
      el.innerHTML = `<div class="activity-item"><p style="color:var(--text-muted);font-size:.82rem;padding:16px 0">${i18n.t('dash_no_activity')}</p></div>`;
      return;
    }
    const dotColors = {
      task_created:'var(--info)', task_updated:'var(--gold)', task_deleted:'var(--danger)',
      project_created:'var(--success)', project_updated:'var(--gold)', project_archived:'var(--text-muted)',
      project_duplicated:'var(--info)', project_deleted:'var(--danger)',
      document_created:'var(--info)', default:'var(--text-muted)'
    };
    el.innerHTML = logs.slice(0, 20).map(log => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${dotColors[log.type]||dotColors.default}"></div>
        <div class="activity-content">
          <div class="activity-text">${escapeHtml(log.message)}</div>
          <div class="activity-time">${this._timeAgo(new Date(log.ts))}</div>
        </div>
      </div>`).join('');
  },

  _renderTeamPerf(members, tasks) {
    const el = document.getElementById('dash-team-perf');
    if (!el) return;
    if (!members.length) {
      el.innerHTML = `<p style="color:var(--text-muted);font-size:.82rem;text-align:center;padding:24px 0">${i18n.getLang()==='fr'?'Aucun membre dans l\'équipe.':'No team members yet.'}</p>`;
      return;
    }
    const membersWithStats = members.map(m => {
      const myTasks   = tasks.filter(t => t.assigneeId === m.id);
      const doneTasks = myTasks.filter(t => t.status === 'done').length;
      const activeTasks = myTasks.filter(t => t.status !== 'done').length;
      const perf      = myTasks.length ? Math.round(doneTasks / myTasks.length * 100) : 0;
      return { ...m, doneTasks, activeTasks, totalTasks: myTasks.length, perf };
    }).sort((a, b) => b.perf - a.perf);

    el.innerHTML = membersWithStats.map(m => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider)">
        <div style="width:34px;height:34px;border-radius:50%;background:${m.avatarColor||'#C9972A'};display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:white;flex-shrink:0">
          ${Format.initials(m.name)}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.84rem;font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.name)}</div>
          <div style="font-size:.7rem;color:var(--text-muted)">${m.activeTasks} tâche(s) active(s) · ${m.doneTasks} faite(s)</div>
          <div style="height:3px;background:var(--border);border-radius:99px;overflow:hidden;margin-top:4px">
            <div style="width:${m.perf}%;height:100%;background:${m.perf>=70?'var(--status-active)':m.perf>=40?'var(--status-pending)':'var(--status-blocked)'};border-radius:99px"></div>
          </div>
        </div>
        <div style="font-size:.82rem;font-weight:700;color:var(--navy);flex-shrink:0">${m.perf}%</div>
      </div>`).join('');
  },

  _timeAgo(date) {
    const L     = i18n.getLang();
    const now   = new Date();
    const diff  = Math.floor((now - date) / 1000);
    if (diff < 60)   return L==='fr' ? 'À l\'instant' : 'Just now';
    if (diff < 3600) return L==='fr' ? `Il y a ${Math.floor(diff/60)} min` : `${Math.floor(diff/60)} min ago`;
    if (diff < 86400)return L==='fr' ? `Il y a ${Math.floor(diff/3600)} h` : `${Math.floor(diff/3600)} h ago`;
    return Format.date(date);
  },

  _renderExpenses(expenses) {
    const el = document.getElementById('dash-expenses-list');
    if (!el) return;
    if (!expenses.length) {
      el.innerHTML = `<div class="empty-state" style="padding:32px"><p class="empty-description" style="margin:0">${i18n.getLang()==='fr'?'Aucune dépense.':'No expenses.'}</p></div>`;
      return;
    }
    const cur = Prefs.getCurrency();
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>${i18n.getLang()==='fr'?'Libellé':'Description'}</th>
            <th>${i18n.getLang()==='fr'?'Catégorie':'Category'}</th>
            <th>${i18n.getLang()==='fr'?'Date':'Date'}</th>
            <th>${i18n.getLang()==='fr'?'Montant':'Amount'}</th>
          </tr></thead>
          <tbody>
            ${expenses.map(e=>`
              <tr>
                <td><span style="font-weight:500">${Format.truncate(e.title||e.description||'—',30)}</span></td>
                <td><span class="badge badge-low">${e.category||'—'}</span></td>
                <td style="color:var(--text-muted)">${Format.date(this._toDate(e.date||e.createdAt))}</td>
                <td><strong style="color:var(--navy)">${Format.currency(+e.amount||0,cur)}</strong></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
};
