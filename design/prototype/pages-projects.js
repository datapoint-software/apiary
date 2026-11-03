/* Overview and projects. Projects only group routes and certificates; they don't limit who can see or change them. */
const PROJECT_ICONS = ['shopping-bag', 'credit-card', 'wrench', 'archive', 'megaphone', 'globe', 'server', 'database', 'cloud', 'boxes', 'flask-conical', 'heart-pulse'];

function projectCards(list) {
  return `<div class="ap-projects">${list.map(p => {
    const [tone, text] = projectHealth(p.id);
    return `<a class="ap-panel ap-project" href="#/projects/${p.id}"><div class="ap-project-head"><span class="ap-project-mark">${icon(p.icon)}</span>${status(tone, text)}</div>
<div><h3 class="ap-h ap-h-3">${esc(p.name)}</h3><p class="ap-caption" style="margin:2px 0 0;font-size:13px;line-height:18px">${esc(p.desc || 'No description')}</p></div>
<div class="ap-project-facts"><span><b>${routesOf(p.id).length}</b> routes</span><span><b>${num(rpmOf(p.id))}</b> req/min</span></div></a>`;
  }).join('')}</div>`;
}
function statCards() {
  const total = D.routes.reduce((a, r) => a + r.rpm, 0);
  const stat = (label, value, unit, delta, series) => `<div class="ap-panel ap-stat"><span class="ap-overline">${label}</span><span class="ap-stat-value">${value}<span class="ap-stat-unit">${unit}</span></span><span class="ap-stat-delta">${delta}</span>${sparkline(series)}</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
${stat('Requests', num(total), '/min', 'Up 18% on the previous 24 h', D.activity.rpm)}${stat('p95 latency', '39', 'ms', 'Peak 52 ms at 09:00 UTC', D.activity.p95)}${stat('5xx responses', '0.2', '%', 'Peak 1.4% at 08:00 UTC', D.activity.err)}</div>`;
}
function clusterMap() {
  const down = Proto.state.cluster === 'quorum' ? ['edge-1', 'edge-3'] : Proto.state.cluster === 'degraded' ? ['edge-3'] : [];
  return `<div class="ap-cluster" role="list" aria-label="Replicas">${D.replicas.map((r, i) => {
    const isDown = r.role === 'down' || down.includes(r.name);
    const cls = isDown ? 'down' : r.role;
    const role = isDown ? (r.role === 'down' ? `Missing 4 min<br>${r.note}` : 'Voter<br>Unreachable') : r.role === 'leader' ? `Leader<br>Index ${num(r.index)}` : r.role === 'voter' ? `Voter<br>${r.lag} behind` : `Follower<br>${r.note}`;
    return `<div class="ap-node ap-node-${cls}" role="listitem"><span class="ap-node-hex" aria-hidden="true">${i + 1}</span><span class="ap-node-name">${r.name}</span><span class="ap-node-role">${role}</span></div>`;
  }).join('')}</div>`;
}
function certMeter(c) {
  const left = Math.round((c.expires - NOW) / DAY), life = Math.round((c.expires - c.issued) / DAY);
  const tone = certTone(c);
  const pct = Math.max(2, Math.min(100, Math.round(left / life * 100)));
  return `<div class="ap-meter${tone === 'ok' ? '' : ' ap-meter-' + tone}"><div class="ap-meter-head"><a class="ap-data" href="#/certificates/${encodeURIComponent(c.host)}" style="color:var(--ink)">${esc(c.host)}</a>${status(tone, left + ' days left')}</div>
<div class="ap-meter-track" role="meter" aria-valuemin="0" aria-valuemax="${life}" aria-valuenow="${left}" aria-label="Days left for ${esc(c.host)}"><div class="ap-meter-fill" style="width:${pct}%"></div></div><span class="ap-caption">${esc(c.note || (c.source === 'auto' ? 'Automatic' : 'Uploaded'))}</span></div>`;
}
function auditList(events) {
  return `<ol class="ap-timeline">${events.map(e => `<li class="ap-event${e.denied ? ' ap-event-denied' : e.via === 'MCP' ? ' ap-event-agent' : ''}"><span class="ap-dot" aria-hidden="true"></span><div><div>${e.denied && e.actor !== 'System' ? 'Denied: ' : ''}${e.agent ? `Agent “${esc(e.agent)}” for ` : ''}${esc(e.actor)} ${e.text.replace(/<code>/g, '<span class="ap-data">').replace(/<\/code>/g, '</span>')}</div><div class="ap-event-meta">${esc(e.meta)} · ${e.via}</div></div><time datetime="${new Date(e.at).toISOString()}">${dayStart(e.at) === dayStart(NOW) ? fmtTime(e.at) : fmtDate(e.at)}</time></li>`).join('')}</ol>`;
}

route('/', () => {
  if (!D.routes.length && !D.projects.length) return welcome();
  const failing = D.certs.filter(c => certTone(c) !== 'ok');
  const down = D.routes.filter(r => r.status === 'critical');
  const alerts = [
    ...failing.map(c => banner('warn', `1 certificate expires in ${Math.round((c.expires - NOW) / DAY)} days`, `Automatic renewal failed for <span class="ap-code">${esc(c.host)}</span>: its DNS doesn't point at your edge nodes, so Let's Encrypt can't check it. Apiary retries every 6 hours.`, `<a href="#/certificates/${encodeURIComponent(c.host)}">See the renewal log</a>`)),
    ...down.map(r => banner('critical', `${esc(r.host)} is down`, `None of its targets answer health checks, so visitors get a 502. Check that <span class="ap-code">${esc(r.targets[0].host)}</span> is running on the shared network.`, `<a href="#/routes/${r.id}">Open the route</a>`)),
  ].slice(0, 2).join('');
  return {
    title: 'Overview',
    html: `<div class="ap-stack" style="gap:4px"><nav class="ap-crumbs" aria-label="Breadcrumb"><a href="#/">${esc(D.cluster.name)}</a><span aria-hidden="true">/</span><span aria-current="page">Overview</span></nav>
<div class="ap-page-head"><h1 class="ap-h ap-h-1">Good afternoon, ${esc(D.me.name.split(' ')[0])}</h1>
<div class="ap-row" style="gap:12px"><div class="ap-seg" role="group" aria-label="Time range" data-seg><button type="button" aria-pressed="false">1 h</button><button type="button" aria-pressed="true">24 h</button><button type="button" aria-pressed="false">7 d</button></div>
<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a></div></div></div>
${alerts}
${statCards()}
<section class="ap-section" aria-labelledby="pj-t"><div class="ap-section-head"><h2 class="ap-h ap-h-2" id="pj-t">Projects</h2><a href="#/projects" style="font-size:14px">See all ${D.projects.length}</a></div>${projectCards(D.projects.slice(0, 3))}</section>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="cl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="cl-t">Replicas</h2><a href="#/replicas" class="ap-caption" style="color:var(--honey-text)">Manage replicas</a></div>
<div class="ap-panel-body ap-stack">${clusterMap()}<dl class="ap-kv"><dt>Leader</dt><dd><span class="ap-data">edge-2 (a3f9c41e)</span></dd><dt>Voters</dt><dd>${{ healthy: '3 of 3', degraded: '2 of 3', quorum: '1 of 3' }[Proto.state.cluster]} reachable</dd><dt>Last backup</dt><dd>${D.backups.length ? status(NOW - D.backups[0].at > 7 * DAY ? 'warn' : 'ok', ago(D.backups[0].at)) : status('warn', 'Never')}</dd></dl></div></section>
<section class="ap-panel" aria-labelledby="ce-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="ce-t">Certificates</h2><a href="#/certificates" class="ap-caption" style="color:var(--honey-text)">All ${D.certs.length}</a></div>
<div class="ap-panel-body ap-stack">${[...D.certs].sort((a, b) => a.expires - b.expires).slice(0, 4).map(certMeter).join('')}</div></section></div>
<section class="ap-panel" aria-labelledby="au-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="au-t">Recent activity</h2><a href="#/audit" class="ap-caption" style="color:var(--honey-text)">Open the audit log</a></div>
<div class="ap-panel-body" style="padding-block:4px">${auditList(D.audit.slice(0, 4))}</div></section>`,
    mount(el) { segs(el); },
  };
});
function segs(el) {
  $$('[data-seg]', el).forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', seg).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    seg.dispatchEvent(new CustomEvent('seg', { detail: b.dataset.v || b.textContent }));
  }));
}
function welcome() {
  const step = (n, title, text, action, done) => `<div class="ap-list-row"><div style="display:flex;gap:14px;align-items:flex-start;flex:1 1 300px"><span class="ap-step${done ? ' ap-step-done' : ''}" style="counter-reset:step ${n - 1}"></span><div class="ap-list-text"><strong>${title}</strong><span class="ap-muted">${text}</span></div></div>${action}</div>`;
  return {
    title: 'Welcome',
    html: `${pageHead({ title: 'Welcome to Apiary', sub: 'Your cluster is running and ready for traffic. Four steps get it serving your sites.' })}
<section class="ap-panel" aria-labelledby="st-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="st-t">Get started</h2><span class="ap-caption">1 of 4 done</span></div><div class="ap-panel-body"><div class="ap-list">
${step(1, 'Create your administrator', 'Done: you are signed in as the first administrator.', status('ok', 'Done'), true)}
${step(2, 'Create a project', 'Projects group routes and certificates, such as one per site or team.', `<button class="ap-btn" type="button" data-new-project data-write>${icon('plus')}New project</button>`)}
${step(3, 'Add your first route', "Point a hostname at a service on the shared network. Apiary gets its certificate automatically.", `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>`)}
${step(4, 'Invite your team', 'Give each person their own account, with the least access they need.', `<a class="ap-btn" href="#/users">Invite people</a>`)}
</div></div></section>
${banner('info', 'Back up before you go further', 'Backups are taken on demand. Take one after your first changes, and before every upgrade.', '<a href="#/backups">Go to backups</a>')}`,
  };
}

route('/projects', () => ({
  title: 'Projects',
  html: `${pageHead({ title: 'Projects', sub: "Projects group routes and certificates so they're easier to find. They don't change who can see or edit them.", actions: `<button class="ap-btn ap-btn-primary" type="button" data-new-project data-write>${icon('plus')}New project</button>` })}
${D.projects.length ? projectCards(D.projects) : `<section class="ap-panel">${emptyState('No projects yet', 'Create a project for each site, team or customer, then add routes to it.', `<button class="ap-btn ap-btn-primary" type="button" data-new-project data-write>${icon('plus')}New project</button>`)}</section>`}`,
}));

route('/projects/:id', id => {
  const p = projectOf(id);
  if (!p) return notFound();
  const rs = routesOf(id);
  const [tone, text] = projectHealth(id);
  const certs = D.certs.filter(c => rs.some(r => r.host === c.host));
  return {
    title: p.name,
    html: `${pageHead({ crumbs: [['Projects', '#/projects']], title: p.name, sub: esc(p.desc), actions: `<button class="ap-btn ap-btn-icon" type="button" aria-label="More actions for ${esc(p.name)}" aria-haspopup="menu" aria-expanded="false" data-pmenu>${icon('ellipsis')}</button><a class="ap-btn ap-btn-primary" href="#/routes/new/${id}" data-write>${icon('plus')}Add route</a>` })}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
<div class="ap-panel ap-stat"><span class="ap-overline">Health</span><span style="margin-top:10px">${status(tone, text)}</span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Routes</span><span class="ap-stat-value">${rs.length}</span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Requests</span><span class="ap-stat-value">${num(rpmOf(id))}<span class="ap-stat-unit">/min</span></span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Certificates</span><span class="ap-stat-value">${certs.length}</span><span class="ap-stat-delta">${certs.filter(c => certTone(c) !== 'ok').length ? status('warn', 'Renewal failing') : 'All renewing'}</span></div></div>
<section class="ap-panel" aria-labelledby="pr-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="pr-t">Routes</h2></div>
${rs.length ? routesTable(rs, { grouped: false }) : emptyState('No routes in this project', `Add a route to send a hostname to a service. It appears in ${esc(p.name)} and in All routes.`, `<a class="ap-btn ap-btn-primary" href="#/routes/new/${id}" data-write>${icon('plus')}Add route</a>`)}</section>`,
    mount(el) {
      bindRoutesTable(el);
      $('[data-pmenu]', el).addEventListener('click', e => menu(e.currentTarget, [
        { icon: 'pencil', label: 'Edit project', write: true, run: () => newProject(p) },
        '-',
        { icon: 'trash-2', label: 'Delete project…', danger: true, write: true, run: () => deleteProject(p) },
      ], { label: 'Project actions' }));
    },
  };
});

/* New and edit project: a short form in a dialog */
function newProject(p) {
  const editing = !!p;
  const d = dialog({
    title: editing ? 'Edit project' : 'New project', backdrop: false,
    body: `<form class="ap-form" id="pj-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: p ? p.name : '', attrs: 'autocomplete="off" maxlength="60"', counter: 40 })}
${field({ name: 'desc', label: 'Description', optional: true, value: p ? p.desc : '', counter: 120, help: 'Shown on the project card.' })}
<fieldset class="ap-field" data-field="icon" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:6px">Icon</legend><div class="ap-icon-pick">${PROJECT_ICONS.map((ic, i) => `<label><input type="radio" name="icon" value="${ic}" aria-label="${ic.replace(/-/g, ' ')}"${(p ? p.icon === ic : i === 5) ? ' checked' : ''}><span>${icon(ic)}</span></label>`).join('')}</div><span class="ap-error" id="e-icon" hidden></span></fieldset>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="pj-form" data-busy="${editing ? 'Saving…' : 'Creating…'}" data-write>${editing ? 'Save project' : 'Create project'}</button>`,
  });
  applyWriteLock(d.el);
  form($('#pj-form', d.el), {
    name: v => {
      const s = String(v).trim();
      if (!s) return 'Enter a name for the project.';
      if (s.length > 40) return 'Use 40 characters or fewer.';
      if (D.projects.some(x => x !== p && x.name.toLowerCase() === s.toLowerCase())) return `There's already a project called ${s}. Choose another name.`;
    },
    desc: v => (String(v).length > 120 ? `Use 120 characters or fewer: it's ${String(v).length} now.` : null),
  }, {
    submit: async v => {
      await api();
      if (editing) Object.assign(p, { name: v.name.trim(), desc: v.desc.trim(), icon: v.icon });
      else {
        let id = v.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
        while (projectOf(id)) id += '-2';
        D.projects.push({ id, name: v.name.trim(), desc: v.desc.trim(), icon: v.icon });
        p = projectOf(id);
      }
      d.close();
      toast(editing ? `${p.name} saved.` : `${p.name} created. Add its first route next.`);
      if (editing || here === '/projects/' + p.id) refresh(); else go('/projects/' + p.id);
    },
  });
}
function deleteProject(p) {
  const rs = routesOf(p.id), others = D.projects.filter(x => x !== p);
  if (!rs.length) {
    return confirmDialog({ title: `Delete ${esc(p.name)}?`, text: "The project is empty, so nothing else changes.", confirm: 'Delete project', busy: 'Deleting…', onConfirm: async () => { await api(); D.projects.splice(D.projects.indexOf(p), 1); toast(`${p.name} deleted.`); go('/projects'); } });
  }
  const d = dialog({
    title: `Delete ${esc(p.name)}?`, role: 'alertdialog', mark: ['critical', 'triangle-alert'], backdrop: false,
    body: `<p style="margin:0">${esc(p.name)} has ${plural(rs.length, 'route')}. Routes keep working: choose the project they move to.</p>
<form id="dp-form" class="ap-form" novalidate style="gap:16px">${field({ name: 'to', label: 'Move its routes to', control: select('to', [['', 'Choose a project'], ...others.map(o => [o.id, o.name])], '') })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-danger" type="submit" form="dp-form" data-busy="Deleting…" data-write>Move routes and delete</button>`,
  });
  applyWriteLock(d.el);
  form($('#dp-form', d.el), { to: v => (!v ? 'Choose where the routes go.' : null) }, {
    submit: async v => {
      await api();
      rs.forEach(r => { r.project = v.to; });
      D.projects.splice(D.projects.indexOf(p), 1);
      d.close();
      toast(`${p.name} deleted. ${plural(rs.length, 'route')} moved to ${projectOf(v.to).name}.`);
      go('/projects/' + v.to);
    },
  });
}

route('/nowhere', () => notFound());
route('*', () => notFound(), { notFound: true });
function notFound() {
  return {
    title: 'Page not found',
    html: `<section class="ap-panel" style="margin-top:40px">${emptyState('This page doesn’t exist', 'The link may be old, or what it pointed to was deleted. Everything else is where you left it.', '<a class="ap-btn ap-btn-primary" href="#/">Go to the overview</a>')}</section>`,
  };
}
