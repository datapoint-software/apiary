/* Routes: the list, with filters and bulk actions, and the route editor. */
let routeDraft = null;
const routeLabel = r => r.host + (r.path === '/' ? '' : r.path);
function routeStatus(r) {
  if (r.disabled) return ['off', 'Disabled'];
  if (r.maintenance && r.maintenance.start <= NOW && NOW < r.maintenance.end) return ['info', 'In maintenance'];
  return [r.status, r.statusText || 'Healthy'];
}
function routeRow(r) {
  const targets = r.targets.length > 1 ? r.targets.map(t => `${t.host} ${t.weight}%`).join(' · ') : `${r.targets[0].host}:${r.targets[0].port}`;
  const tags = r.protocols.map(p => `<span class="ap-tag">${p}</span>`).join('')
    + (r.targets.length > 1 && r.canary ? `<span class="ap-tag ap-tag-honey">Canary ${Math.min(...r.targets.map(t => t.weight))}%</span>` : '')
    + (r.maintenance && NOW < r.maintenance.start ? `<span class="ap-tag">${icon('calendar')}Maintenance ${fmtDate(r.maintenance.start).slice(5)}</span>` : '');
  const [tone, text] = routeStatus(r);
  return `<tr data-id="${r.id}"><td class="ap-col-check"><input class="ap-check" type="checkbox" aria-label="Select ${esc(routeLabel(r))}" data-sel="${r.id}"></td>
<td><div class="ap-cell-main"><a class="ap-data" href="#/routes/${r.id}">${esc(r.host)}</a><span class="ap-caption ap-data">${esc(r.path)}</span></div></td>
<td class="ap-data ap-muted">${esc(targets)}</td><td><div class="ap-row" style="gap:4px">${tags}</div></td><td>${status(tone, text)}</td>
<td class="ap-muted">${r.cert === 'auto' ? 'Automatic' : 'Uploaded'}</td><td class="ap-num">${r.disabled ? '–' : num(r.rpm)}</td>
<td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for ${esc(routeLabel(r))}" aria-haspopup="menu" aria-expanded="false" data-rmenu="${r.id}">${icon('ellipsis')}</button></td></tr>`;
}
function routesTable(list, { grouped = true } = {}) {
  const headRow = `<thead><tr><th class="ap-col-check" scope="col"><input class="ap-check" type="checkbox" aria-label="Select all routes shown" data-selall></th><th scope="col" aria-sort="ascending"><span class="ap-sort">Hostname ${icon('arrow-up')}</span></th><th scope="col">Target</th><th scope="col">Protocols</th><th scope="col">Status</th><th scope="col">Certificate</th><th scope="col" class="ap-num">Req/min</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead>`;
  const sorted = [...list].sort((a, b) => routeLabel(a).localeCompare(routeLabel(b)));
  const body = grouped
    ? D.projects.filter(p => sorted.some(r => r.project === p.id)).map(p => {
      const rs = sorted.filter(r => r.project === p.id);
      return `<tbody><tr class="ap-group"><td colspan="8"><button class="ap-group-title" type="button" aria-expanded="true">${icon('chevron-down')}${esc(p.name)}<span class="ap-group-meta">${plural(rs.length, 'route')} · ${num(rs.reduce((a, r) => a + r.rpm, 0))} req/min</span></button></td></tr>${rs.map(routeRow).join('')}</tbody>`;
    }).join('')
    : `<tbody>${sorted.map(routeRow).join('')}</tbody>`;
  return `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Routes${grouped ? ', grouped by project' : ''}</caption>${headRow}${body}</table></div>`;
}
function bindRoutesTable(el, onSelect = () => {}) {
  $$('.ap-group-title', el).forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    $$('tr:not(.ap-group)', b.closest('tbody')).forEach(r => { r.hidden = !open; });
  }));
  const boxes = $$('[data-sel]', el), all = $('[data-selall]', el);
  const sync = () => {
    const n = boxes.filter(b => b.checked).length;
    boxes.forEach(b => b.closest('tr').setAttribute('aria-selected', b.checked ? 'true' : 'false'));
    if (all) { all.checked = n > 0 && n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; }
    onSelect(boxes.filter(b => b.checked).map(b => b.dataset.sel));
  };
  boxes.forEach(b => b.addEventListener('change', sync));
  if (all) all.addEventListener('change', () => { boxes.forEach(b => { b.checked = all.checked; }); sync(); });
  $$('[data-rmenu]', el).forEach(b => b.addEventListener('click', () => routeMenu(b, D.routes.find(r => r.id === b.dataset.rmenu))));
}
function routeMenu(anchor, r) {
  menu(anchor, [
    { icon: 'pencil', label: 'Edit route', run: () => go('/routes/' + r.id) },
    { icon: 'copy', label: 'Duplicate', write: true, run: () => { routeDraft = r; go('/routes/new/' + r.project); } },
    { icon: 'eraser', label: 'Purge cache', write: true, disabled: !r.caching, why: `Caching is off for ${routeLabel(r)}, so there's nothing to purge.`, run: () => purge([r]) },
    r.disabled ? { icon: 'play', label: 'Enable route', write: true, run: () => setDisabled(r, false) } : { icon: 'pause', label: 'Disable route…', write: true, run: () => setDisabled(r, true) },
    '-',
    { icon: 'trash-2', label: 'Delete route…', danger: true, write: true, run: () => deleteRoutes([r]) },
  ], { label: 'Actions for ' + routeLabel(r) });
}
async function purge(rs) {
  toast(`Purging the cache of ${rs.length === 1 ? routeLabel(rs[0]) : plural(rs.length, 'route')}…`, { tone: 'info' });
  try { await api(); toast(`Cache purged on ${replicasUp()} replicas.`); }
  catch (err) { toast(err.detail, { tone: 'error', title: err.title, action: 'Try again', onAction: () => purge(rs) }); }
}
const replicasUp = () => ({ healthy: '4 of 5', degraded: '3 of 5', quorum: '2 of 5' }[Proto.state.cluster]);
function setDisabled(r, off) {
  const apply = async () => { await api(); r.disabled = off; refresh(); };
  if (!off) return apply().then(() => toast(`${routeLabel(r)} enabled. Traffic flows again.`)).catch(err => toast(err.detail, { tone: 'error', title: err.title }));
  confirmDialog({
    title: `Disable ${esc(routeLabel(r))}?`, tone: 'danger', mark: ['warn', 'pause'],
    text: 'Visitors get a 503 until you enable it again. Its settings and certificate are kept.',
    confirm: 'Disable route', busy: 'Disabling…',
    onConfirm: async () => { await apply(); toast(`${routeLabel(r)} disabled.`, { action: 'Undo', onAction: () => setDisabled(r, false) }); },
  });
}
function deleteRoutes(rs, after) {
  const one = rs.length === 1;
  confirmDialog({
    title: one ? `Delete route ${esc(routeLabel(rs[0]))}?` : `Delete ${rs.length} routes?`,
    text: one ? `Requests to this hostname get a 404 on every replica as soon as you confirm. Its automatic certificate is kept for 30 days in case you add the route again.`
      : `Requests to these hostnames get a 404 on every replica as soon as you confirm: ${rs.map(r => `<span class="ap-data">${esc(routeLabel(r))}</span>`).join(', ')}.`,
    type: one ? rs[0].host : `delete ${rs.length} routes`, confirm: one ? 'Delete route' : `Delete ${rs.length} routes`, busy: 'Deleting…',
    onConfirm: async () => {
      await api();
      D.routes = D.routes.filter(r => !rs.includes(r));
      toast(`${one ? routeLabel(rs[0]) : plural(rs.length, 'route')} deleted on ${replicasUp()} replicas.`);
      after ? after() : refresh();
    },
  });
}

route('/routes', () => {
  if (!D.routes.length) {
    return { title: 'All routes', html: `${pageHead({ crumbs: [], title: 'All routes' })}<section class="ap-panel">${emptyState('No routes yet', 'A route sends requests for a hostname, such as shop.example.com, to a service on the shared network. Apiary gets its certificate for you.', `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>`)}</section>` };
  }
  return {
    title: 'All routes',
    html: `${pageHead({ title: 'All routes', sub: 'Every HTTP route in the cluster, grouped by project.', actions: `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>` })}
<section class="ap-panel" aria-labelledby="rl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2 ap-sr" id="rl-t">Routes</h2></div>
<div class="ap-toolbar" role="search" aria-label="Filter routes" style="padding-top:4px">
<div class="ap-filter">${icon('search')}<input class="ap-input" type="search" placeholder="Filter by hostname or target" aria-label="Filter by hostname or target" data-f="q"></div>
${select('f-project', [['', 'All projects'], ...D.projects.map(p => [p.id, p.name])], '', 'aria-label="Project" data-f="project"')}
<div class="ap-seg" role="group" aria-label="Status" data-f="status"><button type="button" aria-pressed="true" data-v="all">All</button><button type="button" aria-pressed="false" data-v="attention">Needs attention</button><button type="button" aria-pressed="false" data-v="disabled">Disabled</button></div></div>
<div data-selbar></div><div data-table></div>
<div class="ap-panel-foot"><div class="ap-pager"><span data-count aria-live="polite"></span></div></div></section>`,
    mount(el) {
      const f = { q: '', project: '', status: 'all' };
      let selected = [];
      const box = $('[data-table]', el);
      function draw() {
        const t = f.q.trim().toLowerCase();
        const list = D.routes.filter(r => (!f.project || r.project === f.project)
          && (!t || (r.host + r.path + ' ' + r.targets.map(x => x.host).join(' ')).toLowerCase().includes(t))
          && (f.status === 'all' || (f.status === 'disabled' ? r.disabled : !r.disabled && r.status !== 'ok')));
        box.innerHTML = list.length ? routesTable(list) : emptyState('No routes match', 'Try another word, or clear the filters to see every route.', '<button class="ap-btn" type="button" data-clear>Clear filters</button>');
        $('[data-count]', el).textContent = `${list.length} of ${plural(D.routes.length, 'route')}`;
        paint();
        selected = [];
        selbar();
        bindRoutesTable(box, ids => { selected = ids; selbar(); });
        const c = $('[data-clear]', box);
        if (c) c.addEventListener('click', () => { f.q = ''; f.project = ''; f.status = 'all'; $('[data-f="q"]', el).value = ''; $('[data-f="project"]', el).value = ''; $$('[data-f="status"] button', el).forEach((b, i) => b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false')); draw(); });
      }
      function selbar() {
        const bar = $('[data-selbar]', el);
        if (!selected.length) { bar.innerHTML = ''; return; }
        bar.innerHTML = `<div class="ap-selectbar" role="region" aria-label="Selected routes"><strong>${selected.length} selected</strong><button class="ap-btn ap-btn-sm" type="button" data-b="purge" data-write>${icon('eraser')}Purge cache</button><button class="ap-btn ap-btn-sm" type="button" data-b="move" data-write>${icon('folder-input')}Move to project…</button><button class="ap-btn ap-btn-sm" type="button" data-b="delete" data-write style="color:var(--critical)">${icon('trash-2')}Delete…</button><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-b="clear" style="margin-left:auto;background:none">Clear selection</button></div>`;
        paint();
        applyWriteLock(bar);
      }
      $('[data-selbar]', el).addEventListener('click', e => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        const rs = D.routes.filter(r => selected.includes(r.id));
        if (b.dataset.b === 'clear') draw();
        if (b.dataset.b === 'purge') purge(rs);
        if (b.dataset.b === 'delete') deleteRoutes(rs);
        if (b.dataset.b === 'move') moveRoutes(rs);
      });
      $('[data-f="q"]', el).addEventListener('input', e => { f.q = e.target.value; draw(); });
      $('[data-f="project"]', el).addEventListener('change', e => { f.project = e.target.value; draw(); });
      $('[data-f="status"]', el).addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        $$('button', e.currentTarget).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        f.status = b.dataset.v;
        draw();
      });
      draw();
    },
  };
});
function moveRoutes(rs) {
  const d = dialog({
    title: `Move ${plural(rs.length, 'route')}`, backdrop: false,
    body: `<p style="margin:0">Moving changes only where the routes are listed. Traffic isn't affected.</p><form id="mv-form" class="ap-form" novalidate>${field({ name: 'to', label: 'Project', control: select('to', [['', 'Choose a project'], ...D.projects.map(p => [p.id, p.name])], '') })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="mv-form" data-busy="Moving…" data-write>Move routes</button>`,
  });
  form($('#mv-form', d.el), { to: v => (!v ? 'Choose a project.' : null) }, {
    submit: async v => { await api(); rs.forEach(r => { r.project = v.to; }); d.close(); toast(`${plural(rs.length, 'route')} moved to ${projectOf(v.to).name}.`); refresh(); },
  });
}

/* The route editor. One page with sections, so nothing is hidden behind a tab when it has an error. */
route('/routes/new', () => routeEditor(null));
route('/routes/new/:project', p => routeEditor(null, p));
route('/routes/:id', id => { const r = D.routes.find(x => x.id === id); return r ? routeEditor(r) : notFound(); });

function routeEditor(r, projectId) {
  const isNew = !r;
  const src = r || routeDraft || { host: '', path: '/', project: projectId || '', targets: [{ host: '', port: 8080, weight: 100 }], protocols: ['HTTP/2', 'HTTP/3'], cert: 'auto', timeout: 30, allow: [] };
  const draftFrom = isNew && routeDraft;
  routeDraft = null;
  let targets = src.targets.map(t => ({ ...t }));
  const uploaded = D.certs.filter(c => c.source === 'uploaded');
  const [tone, text] = r ? routeStatus(r) : [];
  const m = src.maintenance;
  const html = `${pageHead({
    crumbs: [['All routes', '#/routes']], title: isNew ? 'New route' : routeLabel(r),
    sub: isNew ? (draftFrom ? `A copy of ${esc(routeLabel(draftFrom))}. Change the hostname or path: two routes can't share both.` : 'Send requests for a hostname to services on the shared network.') : `${status(tone, text)} &nbsp;·&nbsp; ${num(r.rpm)} req/min${r.changed ? ` &nbsp;·&nbsp; Changed by ${esc(r.changed[1])} ${ago(r.changed[0])}` : ''}`,
  })}
<form class="ap-form" id="rt-form" novalidate style="max-width:800px">
<div data-summary></div>
<section class="ap-panel" aria-labelledby="s1"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s1">Requests</h2><p class="ap-panel-desc">Which requests this route answers.</p></div></div><div class="ap-panel-body ap-stack">
<div class="ap-grid-2" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">${field({ name: 'host', label: 'Hostname', value: draftFrom ? '' : src.host, data: true, placeholder: 'shop.example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Point its DNS at your edge nodes first, so the certificate can be issued.' })}
${field({ name: 'path', label: 'Path', value: src.path, data: true, help: 'Most routes use /.', attrs: 'autocomplete="off" spellcheck="false"' })}</div>
${field({ name: 'project', label: 'Project', control: select('project', [['', 'Choose a project'], ...D.projects.map(p => [p.id, p.name])], src.project), help: 'Only for grouping: it doesn’t change who can edit the route.' })}
</div></section>

<section class="ap-panel" aria-labelledby="s2"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s2">Targets</h2><p class="ap-panel-desc">Services that receive the traffic, by their name on the shared network. With two or more, the weights split the traffic.</p></div></div><div class="ap-panel-body ap-stack">
<div data-split></div>
<div class="ap-field" data-field="weights" data-label="Weights"><div class="ap-stack" style="gap:12px" data-rows></div><span class="ap-error" id="e-weights" hidden></span></div>
<div><button class="ap-btn ap-btn-sm" type="button" data-add-target>${icon('plus')}Add target</button></div>
<div data-canary></div>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="sticky"${src.sticky ? ' checked' : ''}><span class="ap-choice-text"><span>Sticky sessions</span><span class="ap-help">Keeps each visitor on the target they first reached, for 1 hour.</span></span></label>
</div></section>

<section class="ap-panel" aria-labelledby="s3"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s3">Traffic rules</h2></div></div><div class="ap-panel-body ap-stack">
<fieldset class="ap-field" data-field="protocols" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Protocols</legend><div class="ap-row" style="gap:20px">${['HTTP/2', 'HTTP/3', 'WebSockets'].map(p => `<label class="ap-choice"><input class="ap-check" type="checkbox" name="proto-${p}"${src.protocols.includes(p) ? ' checked' : ''}>${p}</label>`).join('')}</div><span class="ap-help" style="margin-top:6px">HTTP/1.1 always works.</span><span class="ap-error" id="e-protocols" hidden></span></fieldset>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="compression"${src.compression ? ' checked' : ''}><span class="ap-choice-text"><span>Compression</span><span class="ap-help">Off by default. Turn it on only for public, static content.</span></span></label>
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="caching"${src.caching ? ' checked' : ''}><span class="ap-choice-text"><span>Caching</span><span class="ap-help">Stores only what the target allows with Cache-Control.</span></span></label>
<div style="max-width:220px">${field({ name: 'timeout', label: 'Timeout', value: src.timeout, data: true, after: 'seconds', attrs: 'inputmode="numeric"', help: 'From 1 to 120.' })}</div>
</div></section>

<section class="ap-panel" aria-labelledby="s4"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s4">Certificate</h2></div></div><div class="ap-panel-body ap-stack">
<fieldset class="ap-field" data-field="cert" style="border:0;margin:0;padding:0"><legend class="ap-sr">Certificate source</legend><div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-radio" type="radio" name="cert" value="auto"${src.cert === 'auto' ? ' checked' : ''}><span class="ap-choice-text"><span>Automatic</span><span class="ap-help">From Let's Encrypt, renewed 30 days before it expires. Needs the hostname to reach this cluster on port 80.</span></span></label>
<label class="ap-choice"><input class="ap-radio" type="radio" name="cert" value="uploaded"${src.cert === 'uploaded' ? ' checked' : ''}><span class="ap-choice-text"><span>Uploaded certificate</span><span class="ap-help">For wildcards and internal certificate authorities.</span></span></label></div><span class="ap-error" id="e-cert" hidden></span></fieldset>
<div data-upl>${field({ name: 'certId', label: 'Uploaded certificate', control: select('certId', [['', 'Choose a certificate'], ...uploaded.map(c => [c.host, `${c.host} (expires ${fmtDate(c.expires, false)})`])], src.cert === 'uploaded' ? (uploaded[0] || {}).host : ''), help: '<a href="#/certificates">Upload a certificate</a> first if yours isn’t listed.' })}</div>
</div></section>

<section class="ap-panel" aria-labelledby="s5"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s5">Access</h2></div></div><div class="ap-panel-body ap-stack">
${field({ name: 'allow', label: 'Allowed addresses', optional: true, control: textarea('allow', (src.allow || []).join('\n'), 'rows="3" placeholder="10.0.0.0/8"'), help: 'One address or range per line, IPv4 or IPv6. Leave empty to allow everyone; anyone else gets a 403.' })}
</div></section>

<section class="ap-panel" aria-labelledby="s6"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s6">Maintenance window</h2><p class="ap-panel-desc">During the window, visitors get a 503 page with your message, and health checks pause.</p></div></div><div class="ap-panel-body ap-stack">
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="maint"${m ? ' checked' : ''}><span>Schedule maintenance</span></label>
<div class="ap-stack" data-maint${m ? '' : ' hidden'}>
<div class="ap-grid-2">${dtpField({ name: 'mStart', label: 'Starts', value: m && m.start, min: NOW })}${dtpField({ name: 'mEnd', label: 'Ends', value: m && m.end, min: NOW, help: 'At most 7 days after it starts.' })}</div>
${field({ name: 'mMsg', label: 'Message for visitors', optional: true, control: textarea('mMsg', m ? m.message : '', 'rows="2" placeholder="We’re upgrading the shop. Back by 00:30 UTC."', false), counter: 200 })}
</div></div></section>

${isNew ? `<div class="ap-row" style="justify-content:flex-end"><a class="ap-btn ap-btn-ghost" href="${projectId ? '#/projects/' + projectId : '#/routes'}">Cancel</a><button class="ap-btn ap-btn-primary" type="submit" data-busy="Adding…" data-write>Add route</button></div>`
    : `<section class="ap-panel ap-panel-danger" aria-labelledby="s7"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="s7">Danger zone</h2></div><div class="ap-panel-body"><div class="ap-list">
<div class="ap-list-row"><div class="ap-list-text"><strong>${r.disabled ? 'Enable' : 'Disable'} this route</strong><span class="ap-muted">${r.disabled ? 'Traffic flows again with the saved settings.' : 'Visitors get a 503. Settings and certificate are kept.'}</span></div><button class="ap-btn" type="button" data-disable data-write>${r.disabled ? 'Enable route' : 'Disable route…'}</button></div>
<div class="ap-list-row"><div class="ap-list-text"><strong>Delete this route</strong><span class="ap-muted">Requests get a 404 at once. This can't be undone.</span></div><button class="ap-btn ap-btn-danger" type="button" data-delete data-write>Delete route…</button></div></div></div></section>
<div data-savebar></div>`}
</form>`;

  function mount(el) {
    const f = $('#rt-form', el);
    const rowsEl = $('[data-rows]', el);
    const syncTargets = () => { targets = targets.map((t, i) => ({ host: f.elements['t-host-' + i]?.value ?? t.host, port: f.elements['t-port-' + i]?.value ?? t.port, weight: f.elements['t-weight-' + i]?.value ?? t.weight })); };
    function drawRows() {
      const many = targets.length > 1;
      rowsEl.innerHTML = targets.map((t, i) => `<div class="ap-target-row"${many ? '' : ' style="grid-template-columns:minmax(0,2fr) minmax(84px,1fr) auto"'}>
${field({ name: 't-host-' + i, label: many ? `Target ${i + 1}` : 'Target', value: t.host, data: true, placeholder: 'shop-v1', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}
${field({ name: 't-port-' + i, label: 'Port', value: t.port, data: true, attrs: 'inputmode="numeric"' })}
${many ? field({ name: 't-weight-' + i, label: 'Weight', value: t.weight, data: true, after: '%', attrs: 'inputmode="numeric"' }) : ''}
<button class="ap-btn ap-btn-icon ap-btn-ghost" type="button" data-remove="${i}" aria-label="Remove target ${i + 1}"${many ? '' : ' disabled'}>${icon('x')}</button></div>`).join('');
      $('[data-add-target]', el).hidden = targets.length >= 5;
      $('[data-canary]', el).innerHTML = many ? field({ name: 'canary', label: 'Canary header', optional: true, value: src.canary || '', data: true, placeholder: 'X-Canary: true', help: `Requests with this header always reach ${esc(targets[targets.length - 1].host || 'the last target')}.` }) : '';
      paint();
      drawSplit();
    }
    function drawSplit() {
      const box = $('[data-split]', el);
      if (targets.length < 2) { box.innerHTML = ''; return; }
      const ws = targets.map((t, i) => Math.max(0, parseInt(f.elements['t-weight-' + i]?.value ?? t.weight, 10) || 0));
      const total = ws.reduce((a, b) => a + b, 0) || 1;
      box.innerHTML = `<div class="ap-split" role="img" aria-label="Traffic split: ${targets.map((t, i) => `${esc(t.host || 'target ' + (i + 1))} ${ws[i]} percent`).join(', ')}">${targets.map((t, i) => ws[i] ? `<span style="flex:${ws[i] / total * 100}">${esc(t.host || 'Target ' + (i + 1))} · ${ws[i]}%</span>` : '').join('')}</div>`;
    }
    drawRows();
    $('[data-add-target]', el).addEventListener('click', () => {
      syncTargets();
      const even = Math.floor(100 / (targets.length + 1));
      targets.push({ host: '', port: targets[0].port, weight: targets.length === 1 ? 0 : even });
      if (targets.length === 2 && +targets[0].weight === 100) { targets[0].weight = 90; targets[1].weight = 10; }
      drawRows();
      f.elements['t-host-' + (targets.length - 1)].focus();
    });
    rowsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      syncTargets();
      targets.splice(+b.dataset.remove, 1);
      if (targets.length === 1) targets[0].weight = 100;
      drawRows();
      (f.elements['t-host-' + Math.max(0, +b.dataset.remove - 1)]).focus();
      v.check('weights');
      dirtyCheck();
    });
    rowsEl.addEventListener('input', e => { if (/^t-(weight|host)-/.test(e.target.name)) drawSplit(); });
    f.elements.host.addEventListener('change', e => { e.target.value = e.target.value.trim().toLowerCase(); });
    const showUpl = () => { $('[data-upl]', el).hidden = f.elements.cert.value !== 'uploaded'; };
    showUpl();
    f.addEventListener('change', e => { if (e.target.name === 'cert') showUpl(); if (e.target.name === 'maint') $('[data-maint]', el).hidden = !e.target.checked; });

    const v = form(f, () => {
      const rules = {
        host: (val, all) => {
          const msg = V.hostname(val);
          if (msg) return msg;
          const h = String(val).trim().toLowerCase(), p = String(all.path || '/').trim();
          return api('read', 500).then(() => {
            const clash = D.routes.find(x => x !== r && x.host === h && x.path === p);
            return clash ? `${h}${p === '/' ? '' : p} is already a route in ${projectOf(clash.project).name}. Change the hostname or the path.` : { ok: 'No other route uses this hostname and path.' };
          }).catch(() => null);
        },
        path: val => (!/^\/[^\s?#]*$/.test(String(val).trim()) ? 'Start the path with /, without spaces, ? or #.' : null),
        project: val => (!val ? 'Choose a project.' : null),
        timeout: val => (!/^\d+$/.test(String(val).trim()) || +val < 1 || +val > 120 ? 'Enter a whole number of seconds from 1 to 120.' : null),
        allow: val => {
          const lines = String(val).split('\n').map(s => s.trim());
          const bad = lines.findIndex(l => l && !V.cidr(l));
          return bad >= 0 ? `Line ${bad + 1}, "${lines[bad]}", isn't an address or range. Use the form 10.0.0.0/8 or 2001:db8::/32.` : null;
        },
        protocols: (_, all) => null,
        cert: (val, all) => (val === 'auto' && String(all.host).trim().startsWith('*.') ? "Let's Encrypt can't issue wildcard certificates over HTTP-01. Upload a certificate for this hostname instead." : null),
        certId: (val, all) => {
          if (all.cert !== 'uploaded') return null;
          if (!val) return 'Choose an uploaded certificate.';
          const h = String(all.host).trim().toLowerCase(), c = val.toLowerCase();
          const covers = c === h || (c.startsWith('*.') && h.endsWith(c.slice(1)) && h.split('.').length === c.split('.').length);
          return h && !covers ? `${val} doesn't cover ${h}. Choose a certificate for this hostname.` : null;
        },
        mStart: (val, all) => {
          if (!all.maint) return null;
          const msg = V.date(val);
          if (msg) return msg;
          return parseDate(val) < NOW - 5 * MIN ? 'Choose a start in the future.' : null;
        },
        mEnd: (val, all) => {
          if (!all.maint) return null;
          const msg = V.date(val);
          if (msg) return msg;
          const s = parseDate(all.mStart), e = parseDate(val);
          if (s === null) return null;
          if (e <= s) return 'Choose an end after the start.';
          if (e - s > 7 * DAY) return 'A maintenance window can last at most 7 days.';
          return null;
        },
        mMsg: (val, all) => (all.maint && String(val).length > 200 ? 'Use 200 characters or fewer.' : null),
      };
      targets.forEach((_, i) => {
        rules['t-host-' + i] = V.target;
        rules['t-port-' + i] = val => V.port(val);
        if (targets.length > 1) rules['t-weight-' + i] = val => (!/^\d+$/.test(String(val).trim()) || +val > 100 ? 'Enter 0 to 100.' : null);
      });
      rules.weights = (_, all) => {
        if (targets.length < 2) return null;
        const ws = targets.map((t, i) => parseInt(all['t-weight-' + i], 10));
        if (ws.some(isNaN)) return null;
        const sum = ws.reduce((a, b) => a + b, 0);
        return sum !== 100 ? `The weights add up to ${sum}%. Make them add up to 100%.` : null;
      };
      return rules;
    }, {
      verb: isNew ? 'add this route' : 'save this route',
      links: n => (n.startsWith('t-weight-') ? ['weights'] : n === 'host' ? ['cert', 'certId'] : n === 'path' ? ['host'] : n === 'mStart' ? ['mEnd'] : n === 'cert' ? ['certId'] : []),
      submit: async val => {
        await api();
        syncTargets();
        const next = {
          host: val.host.trim().toLowerCase(), path: val.path.trim(), project: val.project,
          targets: targets.map(t => ({ host: String(t.host).trim(), port: +t.port, weight: targets.length > 1 ? +t.weight : 100 })),
          canary: val.canary || '', sticky: val.sticky, compression: val.compression, caching: val.caching,
          protocols: ['HTTP/2', 'HTTP/3', 'WebSockets'].filter(p => val['proto-' + p]),
          cert: val.cert, timeout: +val.timeout, allow: val.allow.split('\n').map(s => s.trim()).filter(Boolean),
          maintenance: val.maint ? { start: parseDate(val.mStart), end: parseDate(val.mEnd), message: val.mMsg.trim() } : null,
          changed: [NOW, D.me.email],
        };
        setGuard(null);
        if (isNew) {
          const id = 'r' + Date.now().toString(36);
          D.routes.push(Object.assign({ id, status: 'ok', rpm: 0 }, next));
          if (next.cert === 'auto' && !D.certs.some(c => c.host === next.host)) D.certs.push({ host: next.host, source: 'auto', issuer: "Let's Encrypt R11", issued: NOW, expires: NOW + 90 * DAY, status: 'ok', note: 'Issued just now' });
          go('/routes/' + id);
          toast(next.cert === 'auto' ? 'Its certificate is being requested from Let’s Encrypt; until then, the route answers on HTTP only.' : `Live on ${replicasUp()} replicas.`, { title: `${routeLabel(next)} added` });
        } else {
          Object.assign(r, next);
          refresh();
          toast(`Applied on ${replicasUp()} replicas.`, { title: 'Route saved' });
        }
      },
    });

    /* Unsaved changes: a bar appears, and leaving the page asks first */
    const snap = () => JSON.stringify(v.values());
    const initial = snap();
    let dirty = false;
    function dirtyCheck() {
      const now = snap() !== initial;
      if (now === dirty) return;
      dirty = now;
      const bar = $('[data-savebar]', el);
      if (!bar) return;
      bar.innerHTML = dirty ? `<div class="ap-savebar" role="region" aria-label="Unsaved changes"><span>${icon('circle-dot')} You have unsaved changes</span><div class="ap-row"><button class="ap-btn ap-btn-ghost" type="button" data-discard>Discard</button><button class="ap-btn ap-btn-primary" type="submit" data-busy="Saving…" data-write>Save route</button></div></div>` : '';
      paint();
      applyWriteLock(bar);
    }
    setGuard(() => dirty || (isNew && snap() !== initial));
    f.addEventListener('input', dirtyCheck);
    f.addEventListener('change', dirtyCheck);
    el.addEventListener('click', e => {
      if (e.target.closest('[data-discard]')) { setGuard(null); refresh(); toast('Changes discarded.', { tone: 'info' }); }
      if (e.target.closest('[data-delete]')) deleteRoutes([r], () => { setGuard(null); go('/routes'); });
      if (e.target.closest('[data-disable]')) setDisabled(r, !r.disabled);
    });
  }
  return { title: isNew ? 'New route' : routeLabel(r), html, mount };
}
