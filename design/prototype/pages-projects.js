/* Overview and projects. Projects only group routes and certificates; they don't limit who can see or change them. */
const PROJECT_ICONS = ['folder', 'shopping-bag', 'credit-card', 'wrench', 'archive', 'megaphone', 'globe', 'server', 'database', 'cloud', 'boxes', 'flask-conical', 'heart-pulse'];

const redirectsOf = id => D.redirects.filter(x => x.project === id);
const projectContents = id => [[routesOf(id).length, 'route'], [redirectsOf(id).length, 'redirect'], [D.streams.filter(x => x.project === id).length, 'stream route'], [D.certs.filter(c => c.source !== 'auto' && c.project === id).length, 'uploaded certificate']];
function projectCards(list) {
  return `<div class="ap-projects">${list.map(p => {
    const [tone, text] = projectHealth(p.id), redirects = redirectsOf(p.id).length;
    return `<a class="ap-panel ap-project" href="#/projects/${p.id}"><div class="ap-project-head"><span class="ap-project-mark">${icon(p.icon)}</span>${status(tone, text)}</div>
<div><h3 class="ap-h ap-h-3">${esc(p.name)}</h3><p class="ap-caption" style="margin:2px 0 0;font-size:13px;line-height:18px">${esc(p.desc || 'No description')}</p></div>
<div class="ap-project-facts"><span><b>${routesOf(p.id).length}</b> ${routesOf(p.id).length === 1 ? 'route' : 'routes'}</span><span><b>${num(rpmOf(p.id))}</b> req/min</span>${redirects ? `<span><b>${redirects}</b> ${redirects === 1 ? 'redirect' : 'redirects'}</span>` : ''}</div></a>`;
  }).join('')}</div>`;
}

/* Activity: 1 h in 5-minute points, 24 h in hourly points, ending now */
const activity = () => (D.activityPoints ??= (() => {
  if (!D.routes.length) return { hour: { minutesPerPoint: 5, points: [] }, day: { minutesPerPoint: 60, points: [] } };
  const build = (mins, rpm, p95, err, start) => ({ minutesPerPoint: mins, p95: p95[p95.length - 1], points: rpm.map((r, i) => ({ at: start + i * mins * MIN, requests: r * mins, errors: r * mins * err[i] / 100, p95: p95[i] })) });
  const hourStart = Math.floor(NOW / HOUR) * HOUR;
  const byHour = [3900, 3300, 2900, 2700, 2800, 3500, 5200, 8100, 11600, 15800, 14900, 14300, 13900, 14600, 14275, 13800, 13200, 12400, 11000, 9600, 8300, 7100, 5900, 4700];
  const p95ByHour = [31, 30, 29, 29, 30, 32, 35, 41, 48, 52, 46, 43, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 32, 31];
  const errByHour = [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.6, 1.4, 0.4, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
  const hours = Array.from({ length: 24 }, (_, i) => new Date(hourStart - (23 - i) * HOUR).getUTCHours());
  return {
    hour: build(5, [13900, 14200, 14050, 14600, 14400, 14800, 15100, 14700, 14300, 14500, 14250, 14275], [38, 40, 39, 41, 44, 47, 45, 42, 40, 39, 39, 39], [0.2, 0.1, 0.2, 0.3, 0.2, 0.6, 0.4, 0.2, 0.1, 0.2, 0.2, 0.2], NOW - 12 * 5 * MIN),
    day: Object.assign(build(60, hours.map(h => byHour[h]), hours.map(h => p95ByHour[h]), hours.map(h => errByHour[h]), hourStart - 23 * HOUR), { p95: 39 }),
  };
})());
let overviewRange = 'day';
function statNumber(v) {
  if (v > 0 && v < 0.1) return '<0.1';
  return v < 10 ? String(Math.round(v * 10) / 10) : num(v);
}
function activitySpark(values) {
  if (values.length < 2) return '';
  const w = 220, h = 36, max = Math.max(...values) || 1, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - v / max * h).toFixed(1)}`);
  const line = 'M' + pts.join(' L'), last = pts[pts.length - 1].split(',');
  return `<svg class="ap-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><line class="ap-spark-grid" x1="0" y1="${h}" x2="${w}" y2="${h}"/><path class="ap-spark-area" d="${line} L${w},${h} L0,${h} Z"/><path class="ap-spark-line" d="${line}" vector-effect="non-scaling-stroke"/><circle class="ap-spark-end" cx="${last[0]}" cy="${last[1]}" r="3.5"/></svg>`;
}
function statCards() {
  const { minutesPerPoint: mpp, points, p95 } = activity()[overviewRange];
  const quiet = overviewRange === 'hour' ? 'No requests in the last hour' : 'No requests in the last 24 h';
  const requests = points.reduce((a, x) => a + x.requests, 0), errors = points.reduce((a, x) => a + x.errors, 0);
  const elapsed = points.length ? Math.max(1, (NOW - points[0].at) / MIN) : 1;
  const share = x => (x.requests ? x.errors / x.requests * 100 : 0);
  const peak = f => points.reduce((best, x) => (f(x) > (best ? f(best) : 0) ? x : best), undefined);
  const busiest = peak(x => x.requests), slowest = peak(x => x.p95), worst = peak(share);
  const at = x => fmtTime(x.at) + ' UTC';
  const stat = (label, value, unit, note, series) => `<div class="ap-panel ap-stat"><span class="ap-overline">${label}</span><span class="ap-stat-value">${value}<span class="ap-stat-unit">${unit}</span></span><span class="ap-stat-delta">${note}</span>${activitySpark(series)}</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px" data-stats>
${stat('Requests', statNumber(requests / elapsed), '/min', busiest ? `Peak ${statNumber(busiest.requests / mpp)}/min at ${at(busiest)}` : quiet, points.map(x => x.requests / mpp))}${stat('p95 latency', p95 === undefined ? '–' : statNumber(p95), p95 === undefined ? '' : 'ms', slowest ? `Peak ${statNumber(slowest.p95)} ms at ${at(slowest)}` : quiet, points.map(x => x.p95))}${stat('5xx responses', requests ? statNumber(errors / requests * 100) : '–', '%', worst ? `Peak ${statNumber(share(worst))}% at ${at(worst)}` : requests ? 'None so far' : quiet, points.map(share))}</div>`;
}
function replicaPanel() {
  const voters = clusterVoters(), leader = voters.find(v => v.role === 'leader');
  const nodes = voters.map((v, i) => `<div class="ap-node ap-node-${v.reachable ? v.role : 'down'}" role="listitem"><span class="ap-node-hex" aria-hidden="true">${i + 1}</span><span class="ap-node-name">${esc(v.name)}</span><span class="ap-node-role">${v.reachable ? (v.role === 'leader' ? 'Leader' : 'Voter') : 'Unreachable'}</span></div>`).join('');
  const backup = D.backups.length ? status(NOW - D.backups[0].at > 7 * DAY ? 'warn' : 'ok', ago(D.backups[0].at)) : status('warn', 'Never');
  return `<section class="ap-panel" aria-labelledby="cl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="cl-t">Replicas</h2><a href="#/replicas" class="ap-caption" style="color:var(--honey-text)">Manage replicas</a></div>
<div class="ap-panel-body ap-stack"><div class="ap-cluster" role="list" aria-label="Replicas">${nodes}</div><dl class="ap-kv"><dt>Leader</dt><dd><span class="ap-data">${leader ? esc(leader.name) : 'None'}</span></dd><dt>Voters</dt><dd>${voters.filter(v => v.reachable).length} of ${voters.length} reachable</dd>${isAdmin() ? `<dt>Last backup</dt><dd>${backup}</dd>` : ''}</dl></div></section>`;
}
function certMeter(c) {
  const left = c.expires ? Math.max(0, Math.round((c.expires - NOW) / DAY)) : 0, life = Math.max(1, Math.round(((c.expires || NOW) - (c.issued || NOW)) / DAY));
  const tone = certTone(c), days = left === 1 ? '1 day left' : left + ' days left';
  const text = { pending: 'Requesting from Let’s Encrypt', failing: c.expires ? 'Renewal failing, ' + days : 'Not issued yet', expiring: 'Expires soon, ' + days, expired: 'Expired' }[certPhase(c)] || days;
  const pct = Math.max(2, Math.min(100, Math.round(left / life * 100)));
  return `<div class="ap-meter${tone === 'ok' ? '' : ' ap-meter-' + tone}"><div class="ap-meter-head"><a class="ap-data" href="#/certificates/${encodeURIComponent(c.host)}" style="color:var(--ink)">${esc(c.host)}</a>${status(tone, text)}</div>
<div class="ap-meter-track" role="meter" aria-valuemin="0" aria-valuemax="${life}" aria-valuenow="${left}" aria-label="Days left for ${esc(c.host)}"><div class="ap-meter-fill" style="width:${pct}%"></div></div><span class="ap-caption">${c.source === 'auto' ? 'Automatic' : 'Uploaded'}</span></div>`;
}
function auditList(events) {
  if (!events.length) return '<ol class="ap-timeline"><li class="ap-muted" style="padding:12px 0">Nothing in the last 7 days.</li></ol>';
  return `<ol class="ap-timeline">${events.map(e => `<li class="ap-event${e.denied ? ' ap-event-denied' : ''}"><span class="ap-dot" aria-hidden="true"></span><div><div>${e.denied && e.actor !== 'System' ? 'Denied: ' : ''}${esc(e.actor)} ${e.text.replace(/<code>/g, '<span class="ap-data">').replace(/<\/code>/g, '</span>')}</div><div class="ap-event-meta">${esc(e.meta)}</div></div><time datetime="${new Date(e.at).toISOString()}">${ago(e.at)}</time></li>`).join('')}</ol>`;
}
function getStarted() {
  const hasProjects = D.projects.length > 0, hasTeam = D.users.length > 1;
  const step = (title, text, done, action) => `<li class="ap-list-row"><div class="ap-row" style="gap:14px;align-items:flex-start;flex:1 1 300px"><span class="ap-step${done ? ' ap-step-done' : ''}" aria-hidden="true"></span><div class="ap-list-text"><strong>${title}</strong><span class="ap-muted">${text}</span></div></div>${done ? status('ok', 'Done') : action}</li>`;
  return `<section class="ap-panel" aria-labelledby="st-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="st-t">Get started</h2><span class="ap-caption">${1 + hasProjects + hasTeam} of 4 done</span></div><div class="ap-panel-body"><ol class="ap-list" style="margin:0;padding:0;list-style:none;counter-reset:step">
${step('Create your administrator', 'Done: you’re signed in as an Administrator.', true)}
${step('Create a project', 'Routes start in Default. Projects group them with their certificates, such as one per site or team.', hasProjects, `<button class="ap-btn" type="button" data-new-project data-write>${icon('plus')}New project</button>`)}
${step('Add your first route', 'Point a hostname at a service on a network Apiary shares. Apiary gets its certificate automatically.', false, `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>`)}
${step('Invite your team', 'Give each person their own account, with the least access they need.', hasTeam, '<a class="ap-btn" href="#/users">Invite people</a>')}
</ol></div></section>
${banner('info', 'Back up before you go further', 'Backups are taken on demand. Take one after your first changes, and before every upgrade.', '<a href="#/backups">Go to backups</a>')}`;
}

route('/', () => {
  const voters = clusterVoters(), unreachable = voters.filter(v => !v.reachable).length;
  const hour = new Date(NOW).getUTCHours(), hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = D.me.name.split(/\s+/)[0];
  const down = D.routes.filter(r => !r.disabled && r.status === 'critical').slice(0, 2);
  const failing = D.certs.filter(certNeedsAttention).slice(0, 2);
  const alerts = [
    unreachable ? banner('critical', unreachable === 1 ? '1 replica is unreachable' : `${unreachable} replicas are unreachable`, 'The others keep serving traffic. Check the replica’s node in Docker.', '<a href="#/replicas">See the replicas</a>') : '',
    ...down.map(r => banner('critical', `${esc(r.host)} is down`, `None of its targets answer health checks, so visitors get an error. Check that ${esc(r.targets[0].host)} is running and on a network Apiary can reach.`, `<a href="#/routes/${r.id}">Open the route</a>`)),
    ...failing.map(c => banner('warn', `The certificate for ${esc(c.host)} needs attention`, `${c.expires ? `It expires in ${Math.max(0, Math.round((c.expires - NOW) / DAY))} days.` : 'It hasn’t been issued yet.'} Its renewal log says what went wrong.`, `<a href="#/certificates/${encodeURIComponent(c.host)}">See the renewal log</a>`)),
  ].join('');
  const ranges = [['hour', '1 h'], ['day', '24 h']];
  return {
    title: 'Overview',
    html: `${pageHead({ title: first ? `${hello}, ${first}` : hello, actions: `<div class="ap-seg" role="group" aria-label="Time range" data-seg>${ranges.map(([v, t]) => `<button type="button" aria-pressed="${overviewRange === v}" data-v="${v}">${t}</button>`).join('')}</div>${canOperate() ? `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>` : ''}` })}
${alerts}
${isAdmin() && !D.routes.length ? getStarted() : statCards()}
<section class="ap-section" aria-labelledby="pj-t"><div class="ap-section-head"><h2 class="ap-h ap-h-2" id="pj-t">Projects</h2><a href="#/projects" style="font-size:14px">See all ${D.projects.length}</a></div>${projectCards(D.projects.slice(0, 3))}</section>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start">
${replicaPanel()}
<section class="ap-panel" aria-labelledby="ce-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="ce-t">Certificates</h2><a href="#/certificates" class="ap-caption" style="color:var(--honey-text)">All ${D.certs.length}</a></div>
<div class="ap-panel-body ap-stack">${D.certs.length ? [...D.certs].sort((a, b) => (a.expires || NOW) - (b.expires || NOW)).slice(0, 4).map(certMeter).join('') : '<p class="ap-muted" style="margin:0">No certificates yet. Each route gets one automatically.</p>'}</div></section></div>
<section class="ap-panel" aria-labelledby="au-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="au-t">Recent activity</h2><a href="#/audit" class="ap-caption" style="color:var(--honey-text)">Open the audit log</a></div>
<div class="ap-panel-body" style="padding-block:4px">${auditList(D.audit.filter(e => NOW - e.at <= 7 * DAY).slice(0, 4))}</div></section>`,
    mount(el) {
      segs(el);
      const seg = $('[data-seg]', el);
      seg.addEventListener('seg', e => {
        overviewRange = e.detail;
        const stats = $('[data-stats]', el);
        if (stats) { stats.outerHTML = statCards(); paint(); }
      });
    },
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

route('/projects', () => ({
  title: 'Projects',
  html: `${pageHead({ title: 'Projects', sub: 'Projects group routes and certificates so they’re easier to find. They don’t change who can see or edit them.', actions: canOperate() ? `<button class="ap-btn ap-btn-primary" type="button" data-new-project data-write>${icon('plus')}New project</button>` : '' })}
${D.projects.length ? projectCards(D.projects) : `<section class="ap-panel">${emptyState('No projects yet', 'Create a project for each site, team or customer, then add routes to it.')}</section>`}`,
}));

route('/projects/:id', id => {
  const p = projectOf(id);
  if (!p) return notFound();
  const rs = routesOf(id), hosts = new Set(rs.map(r => r.host));
  const [tone, text] = projectHealth(id);
  const covers = (c, h) => c === h || (c.startsWith('*.') && h.endsWith(c.slice(1)) && !h.slice(0, -c.length + 1).includes('.'));
  const certs = D.certs.filter(c => (c.project ? c.project === id : c.source === 'auto' ? hosts.has(c.host) : rs.some(r => covers(c.host, r.host))));
  const disabled = rs.filter(r => r.disabled).length;
  const add = `<a class="ap-btn ap-btn-primary" href="#/routes/new/${id}" data-write>${icon('plus')}Add route</a>`;
  return {
    title: p.name,
    html: `${pageHead({ crumbs: [['Projects', '#/projects']], title: p.name, sub: esc(p.desc), actions: canOperate() ? `<span class="ap-row" style="gap:8px"><button class="ap-btn ap-btn-ghost ap-btn-icon" type="button" aria-label="Edit project" data-pedit data-write>${icon('pencil')}</button><button class="ap-btn ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete project" data-pdel data-write>${icon('trash-2')}</button>${add}</span>` : '' })}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
<div class="ap-panel ap-stat"><span class="ap-overline">Health</span><span style="margin-top:10px">${status(tone, text)}</span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Routes</span><span class="ap-stat-value">${rs.length}</span>${disabled ? `<span class="ap-stat-delta">${disabled} disabled</span>` : ''}</div>
<div class="ap-panel ap-stat"><span class="ap-overline">Requests</span><span class="ap-stat-value">${num(rpmOf(id))}<span class="ap-stat-unit">/min</span></span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Redirects</span><span class="ap-stat-value">${redirectsOf(id).length}</span></div>
<div class="ap-panel ap-stat"><span class="ap-overline">Certificates</span><span class="ap-stat-value">${certs.length}</span></div></div>
<section class="ap-panel" aria-labelledby="pr-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2" id="pr-t">Routes</h2></div>
${rs.length ? routesTable(rs, { grouped: false }) : emptyState('No routes in this project', `Add a route to send a hostname to a service. It appears in ${esc(p.name)} and in All routes.`, canOperate() ? add : '')}</section>`,
    mount(el) {
      bindRoutesTable(el);
      const edit = $('[data-pedit]', el), del = $('[data-pdel]', el);
      edit && edit.addEventListener('click', () => newProject(p));
      del && del.addEventListener('click', () => deleteProject(p));
    },
  };
});

/* New and edit project: a short form in a dialog */
function newProject(p) {
  const editing = !!p;
  const d = dialog({
    title: editing ? 'Edit project' : 'New project', backdrop: false,
    body: `<form class="ap-form" id="pj-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: p ? p.name : '', attrs: 'autocomplete="off"' })}
${field({ name: 'desc', label: 'Description', optional: true, value: p ? p.desc : '', attrs: 'autocomplete="off"', help: 'Shown on the project card.' })}
<fieldset class="ap-field" data-field="icon" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:6px">Icon</legend><div class="ap-icon-pick">${PROJECT_ICONS.map(ic => `<label><input type="radio" name="icon" value="${ic}" aria-label="${ic.replace(/-/g, ' ')}"${(p ? p.icon === ic : ic === 'globe') ? ' checked' : ''}><span>${icon(ic)}</span></label>`).join('')}</div><span class="ap-error" id="e-icon" hidden></span></fieldset>
</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="pj-form" data-busy="${editing ? 'Saving…' : 'Creating…'}" data-write>${editing ? 'Save project' : 'Create project'}</button>`,
  });
  applyWriteLock(d.el);
  form($('#pj-form', d.el), {
    name: v => {
      const s = String(v).trim();
      if (!s) return 'Fill this in.';
      if (s.length > 40) return 'Use at most 40 characters.';
      if (D.projects.some(x => x !== p && x.name.toLowerCase() === s.toLowerCase())) return 'There’s already a project with this name. Choose another.';
    },
    desc: v => (String(v).trim().length > 120 ? 'Use at most 120 characters.' : null),
  }, {
    verb: editing ? 'save it' : 'create it',
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
  const others = D.projects.filter(x => x !== p), parts = projectContents(p.id).filter(([n]) => n > 0);
  if (!parts.length) {
    return confirmDialog({
      title: `Delete ${esc(p.name)}?`, text: 'The project is empty, so nothing else changes.', confirm: 'Delete project', busy: 'Deleting…',
      onConfirm: async () => {
        await api();
        if (!others.length) throw { title: '', detail: 'This is the only project. Create another before you delete it.' };
        D.projects.splice(D.projects.indexOf(p), 1); toast(`${p.name} deleted.`); go('/projects');
      },
    });
  }
  const d = dialog({
    title: `Delete ${esc(p.name)}?`, role: 'alertdialog', backdrop: false, describe: true,
    body: `<form id="dp-form" class="ap-form" novalidate style="gap:16px"><p style="margin:0">${esc(p.name)} has ${parts.map(([n, one]) => plural(n, one)).join(', ')}. They keep working: choose the project they move to.</p><div data-summary></div>
${field({ name: 'to', label: 'Move them to', control: select('to', [['', 'Choose a project'], ...others.map(o => [o.id, o.name])], '') })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-danger" type="submit" form="dp-form" data-busy="Deleting…" data-write>Move and delete</button>`,
    initial: '#f-to',
  });
  applyWriteLock(d.el);
  form($('#dp-form', d.el), { to: v => (!v ? 'Choose where they go.' : null) }, {
    verb: 'delete it',
    submit: async v => {
      await api();
      [...routesOf(p.id), ...redirectsOf(p.id), ...D.streams.filter(x => x.project === p.id), ...D.certs.filter(c => c.project === p.id)].forEach(x => { x.project = v.to; });
      D.projects.splice(D.projects.indexOf(p), 1);
      d.close();
      toast(`${p.name} deleted. What it held moved to ${projectOf(v.to).name}.`);
      go('/projects/' + v.to);
    },
  });
}

route('/nowhere', () => notFound());
route('*', () => notFound(), { notFound: true });
function notFound() {
  return {
    title: 'Page not found',
    html: `<section class="ap-panel">${emptyState('This page doesn’t exist', 'The link may be old, or the item was deleted.', '<a class="ap-btn ap-btn-primary" href="#/">Go to the overview</a>')}</section>`,
  };
}

/* What visitors see when Apiary answers instead of a site: plain pages with the design tokens and no scripts */
const PUBLIC_PAGES = [
  ['not-found', 404, 'Not found', "There's nothing here", 'No site is set up at this address. If you expected one, check the address, or contact whoever runs it.'],
  ['starting', 503, 'Starting', 'This server is starting', "It isn't ready to serve this site yet. Try again in a minute."],
  ['unavailable', 503, 'Unavailable', 'This site is unavailable', "It's turned off for now. If you expected it to work, contact whoever runs it."],
  ['not-allowed', 403, 'Not allowed', "You can't open this site from here", 'It only accepts visitors from certain networks. If you need it, contact whoever runs it.'],
  ['too-many-requests', 429, 'Too many requests', 'Too many requests', 'This site got too many requests from your network. Wait a moment, then try again.'],
  ['maintenance', 503, 'Maintenance', 'Down for maintenance', null],
  ['password', 401, 'Password', 'Restricted access', null],
  ['link', 200, 'Sign-in link', null, null],
  ['link-old', 401, 'Old sign-in link', null, null],
];
/* Idea being tried: a route can ask visitors for a password, or a sign-in link with its own key. Plain pages with
   forms that post to the same address, no scripts; the prototype checks them in place. After 5 wrong tries from an
   address, Apiary answers 429 for 5 minutes. A link only signs in after Continue, so link previews and email
   scanners don't; then Apiary sets the cookie and redirects to the address without the key. */
let gateTries = 0;
const PUB_H1 = 'font:600 1.5rem/1.25 var(--font-display);margin:0 0 var(--space-2)';
const PUB_SMALL = 'margin:var(--space-5) 0 0;font-size:0.875rem;color:var(--ink-3)';
const PUB_PROTO = 'margin:var(--space-6) 0 0;font-size:0.8125rem;color:var(--ink-3);border-top:1px dashed var(--line);padding-top:var(--space-3)';
/* target: 'cluster' or a project ID to preview with that brand; otherwise the brand of the route the page is about. */
const brandFor = (target, r) => (target === 'cluster' ? D.brand || null : target ? brandOf(target) : brandOf(r && r.project));
function passwordPage(mode, target) {
  const gated = D.routes.filter(x => x.gate).sort((a, b) => b.gate.set - a.gate.set);
  const r = (target && target !== 'cluster' && gated.find(x => x.project === target)) || gated[0] || { host: 'preview.example.com', path: '/', gate: { password: '', message: '', days: 7 } };
  const g = r.gate, brand = brandFor(target, r);
  const box = 'font:inherit;padding:10px 12px;border-radius:var(--radius-2);border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);width:100%;box-sizing:border-box';
  const stay = `You stay signed in on this browser for ${plural(g.days, 'day')}.`;
  const t = target ? '/' + target : '';
  const signedIn = el => {
    gateTries = 0;
    $('[data-visitor-body]', el).innerHTML = `<h1 style="${PUB_H1}">${esc(r.host)}</h1><p style="margin:0;color:var(--ink-2)">Prototype: Apiary sets a cookie for this hostname and sends the visitor back to the page they asked for${mode === 'link' ? ', without the key in the address' : ''}, now served by the site itself. The site never sees the password, the key or the cookie.</p><p style="margin:var(--space-4) 0 0"><a href="#/public/password${t}">See the password page</a> · <a href="#/public/link${t}">See the sign-in link page</a> · <a href="#/">Back to Apiary</a></p>`;
  };
  if (mode === 'link' && g.link) return {
    title: r.host,
    html: visitorPage(brand, `<h1 style="${PUB_H1}" class="ap-data">${esc(r.host)}</h1>
<p style="margin:0;color:var(--ink-2)">${g.message ? esc(g.message) : 'Someone shared this site with you.'}</p>
<form method="post" style="margin-top:var(--space-5);display:grid"><button type="submit" style="${visitorButton(brand)}">Continue</button></form>
<p style="${PUB_SMALL}">${stay}</p>`, { note: `<p style="${PUB_PROTO}">Prototype: you opened <span class="ap-data" style="word-break:break-all">${esc(gateLink(r))}</span>. A link preview or an email scanner that opens it gets only this page.</p>` }),
    mount(el) { document.title = r.host; $('form', el).addEventListener('submit', e => { e.preventDefault(); signedIn(el); }); },
  };
  const old = mode === 'link-old';
  return {
    title: 'Password',
    html: visitorPage(brand, `<h1 style="${PUB_H1}">Restricted access</h1>
<p style="margin:0;color:var(--ink-2)">${old ? 'This sign-in link no longer works. Enter the password, or ask whoever sent it for a new link.' : g.message ? esc(g.message) : 'Enter the password you were given.'}</p>
<form method="post" novalidate style="margin-top:var(--space-5);display:grid;gap:var(--space-2)">
<label for="gate-pw" style="font-weight:600;font-size:0.875rem">Password</label>
<input id="gate-pw" name="password" type="password" autocomplete="current-password" required aria-describedby="gate-err" style="${box}">
<p id="gate-err" role="alert" style="margin:0;color:var(--critical);font-size:0.875rem" hidden></p>
<button type="submit" style="${visitorButton(brand)}">Continue</button>
</form>
<p style="${PUB_SMALL}">${stay} No password? Ask whoever sent you the link.</p>`, { note: `<p style="${PUB_PROTO}">Prototype: this is <span class="ap-data">${esc(r.host)}</span>, and its password is <span class="ap-data">${esc(g.password)}</span>.</p>` }),
    mount(el) {
      document.title = brand ? `Password · ${brand.name}` : 'Password';
      const f = $('form', el), input = $('#gate-pw', el), err = $('#gate-err', el);
      const say = text => { err.textContent = text; err.hidden = !text; input.setAttribute('aria-invalid', text ? 'true' : 'false'); };
      f.addEventListener('submit', e => {
        e.preventDefault();
        if (gateTries >= 5) return;
        if (!input.value) { say('Enter the password.'); input.focus(); return; }
        if (input.value === g.password) { signedIn(el); return; }
        gateTries++;
        input.value = '';
        input.focus();
        if (gateTries >= 5) {
          say('Too many tries from your network. Wait 5 minutes, then try again.');
          input.disabled = true;
          $('button', f).disabled = true;
          $('button', f).style.opacity = '0.5';
        } else say('That password isn’t right. Check it, or ask whoever sent you the link.');
      });
    },
  };
}
function publicPage(key, target) {
  if (['password', 'link', 'link-old'].includes(key)) return passwordPage(key, target);
  const page = PUBLIC_PAGES.find(x => x[0] === key);
  /* Any other address is one Apiary has no route for: the branded 404, as in the real proxy. */
  if (!page) return publicPage('not-found', target);
  const [, , title, heading, fixed] = page;
  const mr = D.routes.find(r => r.maintenance), w = (mr || {}).maintenance;
  const text = fixed || (w && w.message ? w.message : `This site is being worked on. Try again after ${fmtDate(w ? w.end : NOW + HOUR)} UTC.`);
  /* An unknown address has no route, so it gets the cluster brand; the others get their route's project brand. */
  const brand = brandFor(target, key === 'maintenance' ? mr : null);
  return {
    title,
    html: visitorPage(brand, `<h1 style="${PUB_H1}">${esc(heading)}</h1><p style="margin:0;color:var(--ink-2)">${esc(text)}</p>`, { width: '32rem' }),
    mount() { document.title = brand ? `${title} · ${brand.name}` : title; },
  };
}
route('/public/:page', key => publicPage(key), { bare: true });
route('/public/:page/:target', (key, target) => publicPage(key, target), { bare: true });
