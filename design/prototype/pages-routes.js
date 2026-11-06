/* Routes: the list, with filters and bulk actions, and the route editor. */
const routeLabel = r => r.host + (r.path === '/' ? '' : r.path);
function routeStatus(r) {
  if (r.disabled) return ['off', 'Disabled'];
  if (r.maintenance && r.maintenance.start <= NOW && NOW < r.maintenance.end) return ['info', 'In maintenance'];
  return [r.status, r.statusText || 'Healthy'];
}
const needsAttention = r => !r.disabled && r.status !== 'ok';
const targetLabel = r => (r.targets.length === 1 ? `${r.targets[0].host}:${r.targets[0].port}` : r.targets.map(t => `${t.host} ${t.weight}%`).join(' · ') + (r.canary ? ' · canary' : ''));
function changedOf(r) {
  if (!r.changed) {
    const i = D.routes.indexOf(r) + 1, who = D.users.filter(u => u.status === 'active');
    r.changed = [NOW - (i * 7 + 2) * HOUR, (who[i % who.length] || D.me).email];
  }
  return r.changed;
}
function canaryOf(r) {
  if (!r.canary) return { source: 'none', name: 'X-Canary', value: 'true' };
  if (typeof r.canary === 'object') return r.canary;
  const [name, value = 'true'] = r.canary.split(':').map(s => s.trim());
  return { source: 'header', name, value };
}

/* Routes, stream routes and redirects declared in a stack: a tag in lists, and the fields their labels set locked in editors */
const stackTag = name => `<span class="ap-caption ap-stack-tag">${icon('layers')}Declared in stack <a class="ap-data" href="#/stacks/${esc(name)}">${esc(name)}</a></span>`;
const lockNote = name => `<span class="ap-caption ap-stack-tag" data-lock>${icon('lock')}Set in stack <a class="ap-data" href="#/stacks/${esc(name)}">${esc(name)}</a></span>`;
function lockFields(form, names, stack, rowsAt) {
  const notes = new Set();
  [...form.elements].filter(c => c.name && names.some(n => (n.endsWith('-') ? c.name.startsWith(n) : c.name === n))).forEach(c => {
    if (['checkbox', 'radio'].includes(c.type) || c.tagName === 'SELECT') c.disabled = true; else c.readOnly = true;
    const row = rowsAt && /^t-/.test(c.name);
    const at = row ? rowsAt : c.closest('.ap-field, .ap-choice, fieldset');
    if (at && !notes.has(at)) { notes.add(at); at.insertAdjacentHTML(row ? 'beforebegin' : 'beforeend', lockNote(stack)); }
  });
  paint();
}
const fromStackBanner = (stack, service, text) => banner('info', `Declared in stack <a href="#/stacks/${esc(stack)}">${esc(stack)}</a>`, `Fields with a ${icon('lock')} come from the labels of <span class="ap-data">${esc(service)}</span>: change them in the stack file${text}`, '', 'layers');
const ROUTE_FIELDS = {
  host: ['host'], path: ['path'], project: ['project'], targets: ['t-host-', 't-port-', 't-weight-', 'canarySource', 'canaryName', 'canaryValue', 'sticky'],
  timeout: ['timeout'], rateLimit: ['rateLimited', 'rateLimit'],
};

function routeRow(r) {
  const [tone, text] = routeStatus(r);
  const label = esc(routeLabel(r)), [at, by] = changedOf(r);
  const upcoming = r.maintenance && NOW < r.maintenance.start ? `<span class="ap-caption">Maintenance ${fmtDate(r.maintenance.start)} UTC</span>` : '';
  const act = (ic, aria, key) => `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="${aria}" data-ract="${key}" data-id="${r.id}" data-write>${icon(ic)}</button>`;
  const actions = canOperate() ? (r.disabled ? act('play', 'Enable ' + label, 'enable') : act('pause', 'Disable ' + label, 'disable'))
    + (r.caching ? act('eraser', 'Purge the cache of ' + label, 'purge') : '') + (r.stack ? '' : act('trash-2', 'Delete ' + label, 'delete')) : '';
  return `<tr data-id="${r.id}"${canOperate() ? ' aria-selected="false"' : ''}>${canOperate() ? `<td class="ap-col-check"><input class="ap-check" type="checkbox" aria-label="Select ${label}" data-sel="${r.id}"></td>` : ''}
<td><div class="ap-cell-main"><a class="ap-data" href="#/routes/${r.id}">${esc(r.host)}</a>${r.stack ? stackTag(r.stack.name) : ''}<span class="ap-caption ap-data">${esc(r.path)}</span>${r.gate ? `<span class="ap-caption ap-gate-tag">${icon('lock')}Needs a password</span>` : ''}</div></td>
<td class="ap-data ap-muted">${esc(targetLabel(r))}</td><td><div class="ap-cell-main">${status(tone, text)}${upcoming}</div></td>
<td class="ap-muted">${r.cert !== 'uploaded' ? 'Automatic' : (D.certs.find(c => c.host === r.certId) || {}).source === 'auto' ? 'Wildcard' : 'Uploaded'}</td><td class="ap-num">${r.disabled ? '–' : num(r.rpm)}</td>
<td class="ap-muted">${ago(at)}${by ? ` by ${esc(by)}` : ''}</td><td class="ap-col-actions">${actions}</td></tr>`;
}
function routesTable(list, { grouped = true } = {}) {
  const ops = canOperate();
  const headRow = `<thead><tr>${ops ? '<th class="ap-col-check" scope="col"><input class="ap-check" type="checkbox" aria-label="Select all routes shown" data-selall></th>' : ''}<th scope="col">Hostname</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Certificate</th><th scope="col" class="ap-num">Req/min</th><th scope="col">Changed</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead>`;
  const sorted = [...list].sort((a, b) => routeLabel(a).localeCompare(routeLabel(b)));
  const body = grouped
    ? D.projects.filter(p => sorted.some(r => r.project === p.id)).map(p => {
      const rs = sorted.filter(r => r.project === p.id);
      return `<tbody><tr class="ap-group"><td colspan="${ops ? 8 : 7}"><span class="ap-group-title">${esc(p.name)}<span class="ap-group-meta">${plural(rs.length, 'route')} · ${num(rs.reduce((a, r) => a + (r.disabled ? 0 : r.rpm), 0))} req/min</span></span></td></tr>${rs.map(routeRow).join('')}</tbody>`;
    }).join('')
    : `<tbody>${sorted.map(routeRow).join('')}</tbody>`;
  return `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Routes${grouped ? ', grouped by project' : ''}</caption>${headRow}${body}</table></div>`;
}
function bindRoutesTable(el, onSelect = () => {}) {
  const boxes = $$('[data-sel]', el), all = $('[data-selall]', el);
  const sync = () => {
    const n = boxes.filter(b => b.checked).length;
    boxes.forEach(b => b.closest('tr').setAttribute('aria-selected', b.checked ? 'true' : 'false'));
    if (all) { all.checked = n > 0 && n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; }
    onSelect(boxes.filter(b => b.checked).map(b => b.dataset.sel));
  };
  boxes.forEach(b => b.addEventListener('change', sync));
  if (all) all.addEventListener('change', () => { boxes.forEach(b => { b.checked = all.checked; }); sync(); });
  $$('[data-ract]', el).forEach(b => b.addEventListener('click', () => {
    const r = D.routes.find(x => x.id === b.dataset.id);
    ({ enable: () => setDisabled(r, false), disable: () => setDisabled(r, true), purge: () => purge([r]), delete: () => deleteRoutes([r]) })[b.dataset.ract]();
  }));
}
async function purge(rs) {
  const cached = rs.filter(r => r.caching);
  if (!cached.length) { toast(rs.length === 1 ? 'Caching is off for this route, so there’s nothing to purge.' : 'None of these routes has caching on.', { tone: 'error' }); return false; }
  try {
    await api();
    toast(cached.length === 1 ? `Cache of ${routeLabel(cached[0])} purged on every replica.` : `Cache of ${cached.length} routes purged on every replica.`);
    return true;
  } catch (err) { toast(err.detail, { tone: 'error', title: err.title, action: 'Try again', onAction: () => purge(rs) }); return false; }
}
function setDisabled(r, off) {
  const label = routeLabel(r);
  const apply = async () => { await api(); r.disabled = off; r.changed = [NOW, D.me.email]; refresh(); };
  if (!off) return apply().then(() => toast(`${label} enabled. Traffic flows again.`)).catch(err => toast(err.detail, { tone: 'error', title: err.title }));
  confirmDialog({
    title: `Disable ${esc(label)}?`, tone: 'danger', mark: ['warn', 'pause'],
    text: 'Visitors get a 503 until you enable it again. Its settings and certificate are kept.',
    confirm: 'Disable route', busy: 'Disabling…',
    onConfirm: async () => { await apply(); toast(`${label} disabled.`, { action: 'Undo', onAction: () => setDisabled(r, false) }); },
  });
}
function deleteRoutes(rs, after) {
  const one = rs.length === 1;
  confirmDialog({
    title: one ? `Delete route ${esc(routeLabel(rs[0]))}?` : `Delete ${rs.length} routes?`,
    text: one ? 'Requests to this hostname and path get a 404 on every replica as soon as you confirm.'
      : `Requests to these hostnames get a 404 on every replica as soon as you confirm: ${rs.map(r => `<span class="ap-data">${esc(routeLabel(r))}</span>`).join(', ')}.`,
    type: one ? rs[0].host : `delete ${rs.length} routes`, confirm: one ? 'Delete route' : `Delete ${rs.length} routes`, busy: 'Deleting…',
    onConfirm: async () => {
      await api();
      D.routes = D.routes.filter(r => !rs.includes(r));
      toast(one ? `${routeLabel(rs[0])} deleted.` : `${rs.length} routes deleted.`);
      after ? after() : refresh();
    },
  });
}

route('/routes', () => {
  const add = canOperate() ? `<a class="ap-btn ap-btn-primary" href="#/routes/new" data-write>${icon('plus')}Add route</a>` : '';
  if (!D.routes.length) {
    return { title: 'All routes', html: `${pageHead({ title: 'All routes', sub: 'Every HTTP route in the cluster, grouped by project.', actions: add })}<section class="ap-panel">${emptyState('No routes yet', 'A route sends requests for a hostname, such as shop.example.com, to a service on the shared network.', add)}</section>${sizeDefaultPanel()}`, mount: mountSizeDefault };
  }
  return {
    title: 'All routes',
    html: `${pageHead({ title: 'All routes', sub: 'Every HTTP route in the cluster, grouped by project.', actions: add })}
<section class="ap-panel" aria-labelledby="rl-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-2 ap-sr" id="rl-t">Routes</h2></div>
<div class="ap-toolbar" role="search" aria-label="Filter routes" style="padding-top:4px">
<div class="ap-filter">${icon('search')}<input class="ap-input" type="search" placeholder="Filter by hostname or target" aria-label="Filter by hostname or target" data-f="q"></div>
<div class="ap-seg" role="group" aria-label="Status" data-f="status"><button type="button" aria-pressed="true" data-v="all">All</button><button type="button" aria-pressed="false" data-v="attention">Needs attention</button><button type="button" aria-pressed="false" data-v="disabled">Disabled</button></div>
${select('f-project', [['', 'All projects'], ...D.projects.map(p => [p.id, p.name])], '', 'aria-label="Project" data-f="project"')}</div>
<div data-selbar></div><div data-table></div>
<div class="ap-panel-foot"><div class="ap-pager"><span data-count aria-live="polite"></span></div></div></section>
${sizeDefaultPanel()}`,
    mount(el) {
      mountSizeDefault(el);
      const f = { q: '', project: '', status: 'all' };
      let selected = [];
      const box = $('[data-table]', el);
      function draw() {
        const t = f.q.trim().toLowerCase();
        const list = D.routes.filter(r => (!f.project || r.project === f.project)
          && (!t || (r.host + r.path + ' ' + r.targets.map(x => x.host).join(' ')).includes(t))
          && (f.status === 'all' || (f.status === 'disabled' ? r.disabled : needsAttention(r))));
        box.innerHTML = list.length ? routesTable(list) : emptyState('No routes match', 'Try another word, or clear the filters to see every route.', '<button class="ap-btn" type="button" data-clear>Clear filters</button>');
        $('[data-count]', el).textContent = `${list.length} of ${plural(D.routes.length, 'route')}`;
        paint();
        applyWriteLock(box);
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
      $('[data-selbar]', el).addEventListener('click', async e => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        const rs = D.routes.filter(r => selected.includes(r.id));
        const declared = rs.filter(r => r.stack);
        if (declared.length && (b.dataset.b === 'delete' || b.dataset.b === 'move')) { toast(`${declared.length === 1 ? `${routeLabel(declared[0])} is` : `${declared.length} of them are`} declared in a stack file. Change ${declared.length === 1 ? 'it' : 'them'} there, or select only routes not from a stack.`, { tone: 'info' }); return; }
        if (b.dataset.b === 'clear') draw();
        if (b.dataset.b === 'purge' && await purge(rs)) draw();
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
  const count = plural(rs.length, 'route');
  const d = dialog({
    title: `Move ${count}`, backdrop: false,
    body: `<p style="margin:0">Moving changes only where the routes are listed. Traffic isn’t affected.</p><form id="mv-form" class="ap-form" novalidate>${field({ name: 'to', label: 'Project', control: select('to', [['', 'Choose a project'], ...D.projects.map(p => [p.id, p.name])], '') })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="mv-form" data-busy="Moving…" data-write>Move routes</button>`,
  });
  form($('#mv-form', d.el), { to: v => (!v ? 'Choose a project.' : null) }, {
    verb: 'move them',
    submit: async v => { await api(); rs.forEach(r => { r.project = v.to; }); d.close(); toast(`${count} moved to ${projectOf(v.to).name}.`); refresh(); },
  });
}

/* The route editor. One page with sections, so nothing is hidden behind a tab when it has an error.
   Messages follow the app's codes (route-rules.ts and the message catalogs). */
const RM = {
  required: 'Fill this in.',
  range: (min, max) => `Enter a number from ${min} to ${max}.`,
  tooLong: max => `Use at most ${max} characters.`,
  'gate.passwordRequired': 'Enter a password, or generate one.',
  'gate.passwordShort': 'Use at least 12 characters. A generated one is easier to share and harder to guess.',
  'hostname.required': 'Enter a hostname, such as shop.example.com.',
  'hostname.scheme': 'Enter the hostname only, without http:// or https://.',
  'hostname.path': 'Enter the hostname only. Add a path in the Path field.',
  'hostname.address': 'Use a hostname, not an IP address: certificates can’t be issued for IP addresses.',
  'hostname.tooLong': 'A hostname can be at most 253 characters long.',
  'hostname.notFull': 'Enter a full hostname, such as shop.example.com.',
  'hostname.consecutiveDots': 'A hostname has no empty parts: check for two dots in a row.',
  'hostname.label': 'Use letters, digits and hyphens in each part of the hostname, not starting or ending with a hyphen.',
  'path.invalid': 'Enter a path that starts with /, such as /api, without ? or #.',
  'port.required': 'Enter a port, such as 8080.',
  'target.required': 'Enter a target, such as the service name shop-v1.',
  'target.invalid': 'Use a service name, hostname or IP address.',
  'target.port': 'Enter the port in the Port field.',
  'target.loopback': 'Apiary doesn’t route to loopback addresses. Use the service’s name on the shared network, such as shop-v1.',
  'target.linkLocal': 'Apiary doesn’t route to link-local addresses or cloud metadata endpoints. Use the service’s name on the shared network.',
  'target.unspecified': 'Use the service’s own address, not 0.0.0.0 or ::.',
  'ipRange.invalid': 'Enter an IPv4 or IPv6 address or range, such as 10.0.0.0/8.',
  'ipRange.tooMany': 'Use 100 addresses or ranges at most. Combine neighbors into a wider range.',
  'dateTime.format': 'Enter a date and time like 2026-11-03 14:00, in UTC.',
  'maintenance.endBeforeStart': 'Choose an end after the start.',
  'maintenance.tooLong': 'A maintenance window can last at most 7 days.',
  'maintenance.ended': 'This window has already ended. Choose an end in the future, or turn maintenance off.',
  'project.notFound': 'Choose a project.',
  'route.duplicate': 'Another route already uses this hostname and path. Change one of them.',
  'route.redirectExists': 'This hostname redirects elsewhere. A hostname can be a route or a redirect, not both: delete the redirect first.',
  'route.pathRedirected': 'A redirect answers this path first, so the route would get no requests. Delete the redirect, or choose another path.',
  'route.canaryName': 'Use letters, digits and hyphens, such as X-Canary.',
  'certificate.choose': 'Choose a certificate.',
  'certificate.providerDoesNotCover': 'This DNS provider doesn’t prove the hostname. Choose one that does, or a file on port 80.',
  'certificate.doesNotCover': 'This certificate doesn’t cover the hostname. Choose one that does, or use an automatic certificate.',
  'route.bodySize': 'Enter a whole number from 1 MB to 100 GB.',
};
function checkHost(v) {
  const s = String(v || '').trim();
  if (!s) return RM['hostname.required'];
  if (/^https?:\/\//i.test(s)) return RM['hostname.scheme'];
  if (/[/:]/.test(s)) return RM['hostname.path'];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return RM['hostname.address'];
  if (s.length > 253) return RM['hostname.tooLong'];
  if (!s.includes('.')) return RM['hostname.notFull'];
  if (s.split('.').some(p => p === '')) return RM['hostname.consecutiveDots'];
  return s.split('.').every(p => /^[a-z0-9-]{0,63}$/i.test(p) && !p.startsWith('-') && !p.endsWith('-')) ? null : RM['hostname.label'];
}
function checkTarget(v) {
  const s = String(v || '').trim().toLowerCase(), v6 = /^\[?[0-9a-f:]+\]?$/i;
  if (!s) return RM['target.required'];
  if (/:\d+$/.test(s) && !v6.test(s)) return RM['target.port'];
  if (s === 'localhost' || s.endsWith('.localhost')) return RM['target.loopback'];
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s), bare = s.replace(/^\[|\]$/g, '');
  if (v4) {
    if (+v4[1] === 127) return RM['target.loopback'];
    if ((+v4[1] === 169 && +v4[2] === 254) || s === '100.100.100.200') return RM['target.linkLocal'];
    if (s === '0.0.0.0') return RM['target.unspecified'];
  } else {
    if (bare === '::1') return RM['target.loopback'];
    if (/^fe80:/i.test(bare) || /^fd00:ec2::254$/i.test(bare)) return RM['target.linkLocal'];
    if (bare === '::') return RM['target.unspecified'];
  }
  return /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i.test(s) || v6.test(s) ? null : RM['target.invalid'];
}
const rtWhole = (min, max) => val => (String(val).trim() === '' || !Number.isInteger(+val) || +val < min || +val > max ? RM.range(min, max) : null);
const certCovers = (c, h) => c === h || (c.startsWith('*.') && h.endsWith(c.slice(1)) && h.split('.').length === c.split('.').length);
const withLabel = (html, label) => html.replace('class="ap-field"', `class="ap-field" data-label="${label}"`);
const rtChoice = (name, checked, title, help, cls = 'ap-switch', style = '') => `<label class="ap-choice"${style ? ` style="${style}"` : ''}><input class="${cls}" type="checkbox" name="${name}"${checked ? ' checked' : ''}><span class="ap-choice-text"><span>${title}</span><span class="ap-help">${help}</span></span></label>`;
const MAX_TARGETS = 10;

/* Request size limits, in decimal MB like Docker shows them. A route without `size` uses the cluster default. */
const MAX_SIZE_MB = 100000;
const fmtSize = mb => (mb === 'none' ? 'No limit' : mb >= 1000 && mb % 1000 === 0 ? `${num(mb / 1000)} GB` : `${num(mb)} MB`);
const toMb = (value, unit) => +value * (unit === 'GB' ? 1000 : 1);
const usesDefaultSize = r => r.size === undefined;
const checkSize = (value, unit) => {
  const s = String(value).trim();
  return !/^\d+$/.test(s) || toMb(s, unit) < 1 || toMb(s, unit) > MAX_SIZE_MB ? RM['route.bodySize'] : null;
};
function sizeFields(prefix, mb, help) {
  const [value, unit] = mb >= 1000 && mb % 1000 === 0 ? [mb / 1000, 'GB'] : [mb, 'MB'];
  return `<div class="ap-row" style="gap:12px;align-items:flex-start;flex-wrap:wrap;max-width:420px">
<div style="flex:2 1 160px">${field({ name: prefix + 'Value', label: 'Largest request', type: 'number', value, data: true, attrs: 'inputmode="numeric" min="1"', help })}</div>
<div style="flex:1 1 90px">${field({ name: prefix + 'Unit', label: 'Unit', control: select(prefix + 'Unit', ['MB', 'GB'], unit) })}</div></div>`;
}
function sizeChoices(size) {
  const mode = size === undefined ? 'default' : size === 'none' ? 'none' : 'custom';
  const choice = (value, title, help) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="sizeMode" value="${value}"${value === mode ? ' checked' : ''}><span class="ap-choice-text"><span>${title}</span><span class="ap-help">${help}</span></span></label>`;
  return `<fieldset class="ap-field" style="border:0;margin:0;padding:0"><legend class="ap-label">Request size limit</legend><div class="ap-stack" style="gap:10px">
${choice('default', `Cluster default, <span class="ap-data">${fmtSize(D.sizeDefault)}</span>`, 'Follows the default on the All routes page, so it changes when an Administrator changes the default.')}
${choice('custom', 'Custom', 'For routes that take large uploads, such as a container registry, or should only take small ones.')}
<div style="margin-left:30px" data-size-custom${mode === 'custom' ? '' : ' hidden'}>${sizeFields('size', typeof size === 'number' ? size : D.sizeDefault, 'From 1 MB to 100 GB. Larger requests get a 413 and never reach the target.')}</div>
${choice('none', 'No limit', 'Anyone who can reach this route can send it uploads of any size. Use it only when the target checks who is uploading, as a container registry does, or with allowed addresses.')}
</div></fieldset><div data-size-warn></div>`;
}

/* The default on All routes. Administrators change it; everyone sees which routes set their own limit. */
function sizeDefaultPanel() {
  const using = D.routes.filter(usesDefaultSize).length, own = D.routes.filter(r => !usesDefaultSize(r));
  const used = using === D.routes.length ? 'Every route uses it' : `${using} of ${plural(D.routes.length, 'route')} use it`;
  return `<form class="ap-panel" id="rd-form" novalidate aria-labelledby="rd-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="rd-t">Request size limit</h2><p class="ap-panel-desc">The largest request a route accepts, unless it sets its own. Larger requests get a 413 and never reach the target.</p></div></div>
<div class="ap-panel-body ap-stack"><div data-summary></div>
${isAdmin() ? sizeFields('default', D.sizeDefault, `From 1 MB to 100 GB. ${used}.`)
    : `<dl class="ap-kv"><dt>Default</dt><dd><span class="ap-data">${fmtSize(D.sizeDefault)}</span>. ${used}. Only Administrators can change it.</dd></dl>`}
${own.length ? `<div class="ap-stack" style="gap:4px"><span class="ap-label">Routes with their own limit</span><div class="ap-list">${own.map(r => `<div class="ap-list-row"><div class="ap-list-text"><a class="ap-data" href="#/routes/${r.id}">${esc(routeLabel(r))}</a></div>${r.size !== 'none' ? `<span class="ap-data">${fmtSize(r.size)}</span>` : r.allow && r.allow.length ? '<span class="ap-tag">No limit</span>' : status('warn', 'No limit, open to everyone')}</div>`).join('')}</div></div>` : ''}
</div>
${isAdmin() ? '<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn" type="submit" data-busy="Saving…" data-write>Save default</button></div>' : ''}</form>`;
}
function mountSizeDefault(el) {
  if (!isAdmin()) return;
  const using = D.routes.filter(usesDefaultSize).length;
  form($('#rd-form', el), { defaultValue: (v, all) => checkSize(v, all.defaultUnit) }, {
    verb: 'save it',
    links: { defaultUnit: ['defaultValue'] },
    submit: async v => {
      const mb = toMb(v.defaultValue, v.defaultUnit), old = D.sizeDefault;
      if (mb === old) { toast(`The default is already ${fmtSize(mb)}.`, { tone: 'info' }); return; }
      const save = async () => {
        await api();
        D.sizeDefault = mb;
        toast(`${using ? `${plural(using, 'route')} now accept` : 'New routes accept'} requests up to ${fmtSize(mb)}, on every replica.`, { title: 'Default saved' });
        refresh();
      };
      if (!using) return save();
      confirmDialog({
        title: `Change the limit on ${plural(using, 'route')}?`,
        text: `${using === 1 ? 'One route uses' : `${num(using)} routes use`} the cluster default. ${using === 1 ? 'It' : 'They'} will accept requests up to <span class="ap-data">${fmtSize(mb)}</span> instead of <span class="ap-data">${fmtSize(old)}</span>, on every replica as soon as you save.${mb < old ? ' Uploads larger than that start failing with a 413.' : ''} Routes with their own limit don’t change.`,
        confirm: 'Change the default', busy: 'Saving…', tone: mb < old ? 'danger' : 'primary', mark: mb < old ? ['warn', 'triangle-alert'] : ['info', 'info'],
        onConfirm: save,
      });
    },
  });
}

route('/routes/new', () => routeEditor(null));
route('/routes/new/:project', p => routeEditor(null, p));
route('/routes/:id', id => { const r = D.routes.find(x => x.id === id); return r ? routeEditor(r) : notFound(); });

/* Four random words and a number: long enough not to be guessed, short enough to read out on a call. */
const PASS_WORDS = ['amber', 'anchor', 'aspen', 'basil', 'birch', 'canyon', 'cedar', 'cobalt', 'coral', 'delta', 'ember', 'fern', 'flint', 'garnet', 'harbor', 'hazel', 'indigo', 'juniper', 'lantern', 'linden', 'maple', 'meadow', 'nectar', 'olive', 'orchard', 'pebble', 'quartz', 'raven', 'river', 'saffron', 'spruce', 'thistle', 'tundra', 'velvet', 'willow', 'zephyr'];
function passphrase() {
  const pool = [...PASS_WORDS], words = [], n = new Uint32Array(5);
  crypto.getRandomValues(n);
  for (let i = 0; i < 4; i++) words.push(pool.splice(n[i] % pool.length, 1)[0]);
  return words.join('-') + '-' + (10 + n[4] % 90);
}

const linkKey = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' })[c]);
const gateLink = r => `https://${r.host}${r.path}?apiary-key=${r.gate.link.key}`;
/* After saving, the new password and sign-in link are shown once, to copy. */
function showGateAccess(r, { password, link }) {
  const both = password && link;
  dialog({
    title: `${esc(routeLabel(r))} saved`, mark: ['ok', 'lock'], initial: '[data-copy]',
    body: `<p style="margin:0">${both ? 'Visitors need the password now, or the sign-in link. Copy them: they’re shown only this once.' : link ? 'Here’s the new sign-in link. Copy it: it’s shown only this once, and the old one no longer works.' : 'Visitors need the password now. Copy it: it’s shown only this once.'}</p>
${link ? `<div class="ap-field" data-gate-share><span class="ap-label">Sign-in link</span>${copyText(gateLink(r))}</div>` : ''}${password ? `<div class="ap-field"><span class="ap-label">Password</span>${copyText(password)}</div>` : ''}
<p class="ap-caption" style="margin:0">Send ${both ? 'them' : 'it'} over a channel you trust. Anyone who has ${both ? 'either' : 'it'} gets in until you set a new password${r.gate.link ? ' or make a new link' : ''}.</p>
<p class="ap-caption" style="margin:0">Prototype: see what a visitor sees with <a href="#/public/link" data-close>the link</a> or <a href="#/public/password" data-close>the password</a>.</p>`,
    foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>Done</button>',
  });
}

function routeEditor(r, projectId) {
  const isNew = !r;
  const src = r || { host: '', path: '/', project: projectId || (D.projects.length === 1 ? D.projects[0].id : ''), targets: [{ host: '', port: 8080, weight: 100 }], cert: 'auto', timeout: 30, allow: [] };
  let targets = src.targets.map(t => ({ ...t }));
  const canary = canaryOf(src);
  const named = D.certs.filter(c => c.source === 'uploaded' || certIsWildcard(c));
  const certId = src.cert === 'uploaded' ? src.certId || (named.find(c => certCovers(c.host, src.host)) || {}).host || '' : '';
  const own = r && D.certs.find(c => c.source === 'auto' && c.host === r.host);
  const challenge = own ? certChallenge(own) : 'http-01';
  const [tone, text] = r ? routeStatus(r) : [];
  const m = src.maintenance;
  const ops = canOperate();
  const html = `${pageHead({
    crumbs: [['All routes', '#/routes']], title: isNew ? 'New route' : routeLabel(r),
    sub: isNew ? 'Send requests for a hostname to services on the shared network.' : `${status(tone, text)} &nbsp;·&nbsp; ${num(r.rpm)} req/min &nbsp;·&nbsp; Changed ${ago(changedOf(r)[0])}${r.changed[1] ? ` by ${esc(r.changed[1])}` : ''}`,
  })}
${ops ? '' : banner('info', 'You can view this route', 'Changing it needs the Operator role. Ask an Administrator if you need it.')}
${r && r.stack ? fromStackBanner(r.stack.name, r.stack.service, `, and the next apply updates this route.${stackOf(r.stack.name) && stackOf(r.stack.name).applied ? ` Last applied ${ago(stackOf(r.stack.name).applied)} by pipeline <span class="ap-data">${esc(stackOf(r.stack.name).token)}</span>, commit <span class="ap-data">${esc(stackOf(r.stack.name).commit)}</span>.` : ''} You can still disable the route or schedule maintenance here.`) : ''}
<form class="ap-form" id="rt-form" novalidate style="max-width:800px">
<div data-summary></div>
<section class="ap-panel" aria-labelledby="s1"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s1">Requests</h2><p class="ap-panel-desc">Which requests this route answers.</p></div></div><div class="ap-panel-body ap-stack">
<div class="ap-grid-2" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">${field({ name: 'host', label: 'Hostname', value: src.host, data: true, placeholder: 'shop.example.com', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Point its DNS at your edge nodes first, so the certificate can be issued.' })}
${field({ name: 'path', label: 'Path', value: src.path, data: true, help: 'Most routes use /.', attrs: 'autocomplete="off" spellcheck="false"' })}</div>
${field({ name: 'project', label: 'Project', control: select('project', [['', 'Choose a project'], ...D.projects.map(p => [p.id, p.name])], src.project), help: 'Only for grouping: it doesn’t change who can edit the route.' })}
</div></section>

<section class="ap-panel" aria-labelledby="s2"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s2">Targets</h2><p class="ap-panel-desc">Services that receive the traffic, by their name on the shared network. With two or more, the weights split the traffic.</p></div></div><div class="ap-panel-body ap-stack">
<div class="ap-stack" data-rows></div>
<div data-split></div>
<button class="ap-btn ap-btn-sm" type="button" style="align-self:flex-start" data-add-target>${icon('plus')}Add target</button>
<div class="ap-stack" data-many>
${field({ name: 'canarySource', label: 'Canary', optional: true, control: select('canarySource', [['none', 'No canary'], ['header', 'By header'], ['cookie', 'By cookie']], canary.source), help: '<span data-canary-help></span>' })}
<div class="ap-grid-2" data-canary-fields>${withLabel(field({ name: 'canaryName', label: 'Name', value: canary.name, data: true, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' }), 'Canary name')}${withLabel(field({ name: 'canaryValue', label: 'Value', value: canary.value, data: true, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' }), 'Canary value')}</div>
${rtChoice('sticky', src.sticky, 'Sticky sessions', 'Keeps each visitor on the target they first reached, for 1 hour, with a cookie.')}
</div>
</div></section>

${r ? pathRedirectsPanel(r) : ''}
<section class="ap-panel" aria-labelledby="s3"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s3">Certificate</h2></div></div><div class="ap-panel-body ap-stack">
<fieldset class="ap-field" style="border:0;margin:0;padding:0"><legend class="ap-sr">Certificate source</legend><div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-radio" type="radio" name="cert" value="auto"${src.cert !== 'uploaded' ? ' checked' : ''}><span class="ap-choice-text"><span>Automatic</span><span class="ap-help">From Let’s Encrypt, renewed for you. Checked with a file on port 80, or a DNS record for internal hostnames and closed port 80.</span></span></label>
<div data-challenge style="margin:-2px 0 4px 30px">${field({ name: 'challenge', label: 'Checked with', control: select('challenge', [['http-01', 'A file on port 80 (HTTP-01)'], ...D.dnsProviders.map(p => [p.id, `A DNS record through ${p.name}`])], challenge), help: '&nbsp;' })}</div>
<label class="ap-choice"><input class="ap-radio" type="radio" name="cert" value="uploaded"${src.cert === 'uploaded' ? ' checked' : ''}><span class="ap-choice-text"><span>A certificate from the list</span><span class="ap-help">An uploaded one, or a wildcard Apiary renews with a DNS record.</span></span></label></div></fieldset>
<div data-upl>${field({ name: 'certId', label: 'Certificate', control: select('certId', [['', 'Choose a certificate'], ...named.map(c => [c.host, c.source === 'auto' ? `${certHosts(c).join(', ')} (renewed automatically)` : `${c.host} (expires ${fmtDate(c.expires, false)})`])], certId), help: 'Upload a certificate, or request a wildcard, on the Certificates page if yours isn’t listed.' })}</div>
</div></section>

<section class="ap-panel" aria-labelledby="s4"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s4">Traffic rules</h2></div></div><div class="ap-panel-body ap-stack">
<div style="max-width:220px">${field({ name: 'timeout', label: 'Timeout', type: 'number', value: src.timeout, data: true, after: 'seconds', attrs: 'inputmode="numeric"', help: 'From 1 to 3600. Counts only time without any data moving, so a long upload that keeps sending isn’t cut off.' })}</div>
${sizeChoices(src.size)}
${rtChoice('compression', src.compression, 'Compression', 'Off by default. Turn it on only for public, static content: compressing pages that mix secrets with text visitors can change lets attackers guess the secrets.')}
${rtChoice('caching', src.caching, 'Caching', 'Stores only what the target allows with Cache-Control, in memory on each replica.')}
${rtChoice('hsts', src.hsts, 'HTTPS only (HSTS)', 'Off by default. Browsers that visit this hostname over HTTPS then refuse plain HTTP to it, on any port, for a year. Hard to undo: turning it off doesn’t reach browsers that already have it.')}
<div data-hsts${src.hsts ? '' : ' hidden'}>${rtChoice('hstsSub', src.hstsSub, 'Include subdomains', 'Also covers every subdomain of this hostname. Only turn it on when they all serve HTTPS.', 'ap-check', 'margin-left:40px')}</div>
</div></section>

<section class="ap-panel" aria-labelledby="s5"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s5">Access</h2></div></div><div class="ap-panel-body ap-stack">
${field({ name: 'allow', label: 'Allowed addresses', optional: true, control: textarea('allow', (src.allow || []).join('\n'), 'rows="3" placeholder="10.0.0.0/8" spellcheck="false"'), help: `One address or range per line, IPv4 or IPv6. Leave empty to allow everyone; anyone else gets a 403.${D.trustedProxies.length ? ' Behind a <a href="#/trusted-proxies">trusted proxy</a>, Apiary checks the client’s address from X-Forwarded-For.' : ''}` })}
${rtChoice('rateLimited', src.rateLimit != null, 'Limit requests per visitor', 'Counts requests from each address, or each /64 network for IPv6, on each replica. Beyond the limit, visitors get a 429 page until they slow down.')}
<div style="max-width:280px;margin-left:40px" data-rate${src.rateLimit != null ? '' : ' hidden'}>${field({ name: 'rateLimit', label: 'Rate limit', type: 'number', value: src.rateLimit ?? 600, data: true, after: 'a&nbsp;minute', attrs: 'inputmode="numeric"', help: 'From 1 to 100,000.' })}</div>
${rtChoice('gated', !!src.gate, 'Ask visitors for a password', 'For demos and previews that aren’t ready to be public. Visitors enter it once, on a page Apiary shows, and stay signed in on that browser. Everyone shares the same password, so it doesn’t tell people apart.')}
<div class="ap-stack" style="margin-left:40px" data-gate${src.gate ? '' : ' hidden'}>
${src.gate ? `<div class="ap-list-row" data-gate-current style="padding:0"><div class="ap-list-text"><strong>Password set ${ago(src.gate.set)}</strong><span class="ap-muted">By ${esc(src.gate.by)}. Apiary keeps only a hash, so it can’t show it again.</span></div><button class="ap-btn" type="button" data-gate-new data-write${ops ? '' : ' disabled'}>Set a new password…</button></div>` : ''}
<div class="ap-stack" data-gate-pw${src.gate ? ' hidden' : ''}>
${field({ name: 'gatePassword', label: 'Password', value: src.gate ? '' : passphrase(), data: true, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', after: '<button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-gate-gen>Generate another</button>', help: '<span data-gate-help>Shown once more after you save, to copy. Then Apiary keeps only a hash.</span>' })}
</div>
${rtChoice('gateLink', src.gate ? !!src.gate.link : true, 'Also make a sign-in link', 'Opens the site without typing the password. Visitors still click Continue, so link previews and email scanners don’t sign in. Anyone with the link gets in, so share it like the password.', 'ap-check')}
${src.gate && src.gate.link ? `<div class="ap-list-row" data-link-current style="padding:0 0 0 30px"><div class="ap-list-text"><strong>Sign-in link made ${ago(src.gate.link.made)}</strong><span class="ap-muted">Shown once, like the password.</span></div><button class="ap-btn" type="button" data-link-new data-write${ops ? '' : ' disabled'}>Make a new link</button></div>` : ''}
${field({ name: 'gateMessage', label: 'Message on the password page', optional: true, value: src.gate ? src.gate.message : '', placeholder: 'Preview of the new website for Example Lda.', help: 'Up to 120 characters. Anyone who opens the address sees it, so name nothing you’d rather keep private.' })}
<div style="max-width:280px">${field({ name: 'gateDays', label: 'Keep visitors signed in for', control: select('gateDays', [['1', '1 day'], ['7', '7 days'], ['30', '30 days']], String(src.gate ? src.gate.days : 7)), help: 'A new password signs everyone out at once.' })}</div>
</div>
</div></section>

<section class="ap-panel" aria-labelledby="s6"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s6">Maintenance window</h2><p class="ap-panel-desc">During the window, visitors get a 503 page with your message.</p></div></div><div class="ap-panel-body ap-stack">
<label class="ap-choice"><input class="ap-switch" type="checkbox" name="maint"${m ? ' checked' : ''}><span>Schedule maintenance</span></label>
<div class="ap-stack" data-maint${m ? '' : ' hidden'}>
<div class="ap-grid-2">${dtpField({ name: 'mStart', label: 'Starts', value: m && m.start, min: Math.floor(NOW / HOUR) * HOUR, help: 'In UTC, like every time in Apiary.' })}${dtpField({ name: 'mEnd', label: 'Ends', value: m && m.end, min: Math.floor(NOW / HOUR) * HOUR, help: 'At most 7 days after it starts.' })}</div>
${field({ name: 'mMsg', label: 'Message for visitors', optional: true, control: textarea('mMsg', m ? m.message : '', 'rows="2" placeholder="We’re upgrading the shop. Back by 00:30 UTC."', false), help: 'Up to 200 characters.' })}
</div></div></section>

${isNew ? '' : `<section class="ap-panel ap-panel-danger" aria-labelledby="s7"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="s7">Danger zone</h2></div></div><div class="ap-panel-body ap-list">
<div class="ap-list-row"><div class="ap-list-text"><strong>${r.disabled ? 'Enable' : 'Disable'} this route</strong><span class="ap-muted">${r.disabled ? 'Traffic flows again with the saved settings.' : 'Visitors get a 503. Settings and certificate are kept.'}</span></div><button class="ap-btn" type="button" data-disable data-write${ops ? '' : ' disabled'}>${r.disabled ? 'Enable route' : 'Disable route…'}</button></div>
${r.stack ? `<div class="ap-list-row"><div class="ap-list-text"><strong>Delete this route</strong><span class="ap-muted">Remove it from the stack file instead. The next apply of ${esc(r.stack.name)} deletes it.</span></div><button class="ap-btn" type="button" disabled>Delete route…</button></div>`
  : `<div class="ap-list-row"><div class="ap-list-text"><strong>Delete this route</strong><span class="ap-muted">Requests to it get a 404 on every replica.</span></div><button class="ap-btn" type="button" style="color:var(--critical)" data-delete data-write${ops ? '' : ' disabled'}>Delete route…</button></div>`}</div></section>`}
${ops ? `<div class="ap-savebar"><a class="ap-btn ap-btn-ghost" href="#/routes">Cancel</a><button class="ap-btn ap-btn-primary" type="submit" data-busy="Saving…" data-write>${isNew ? 'Create route' : 'Save route'}</button></div>` : ''}
</form>`;

  function mount(el) {
    const f = $('#rt-form', el);
    const rowsEl = $('[data-rows]', el);
    const syncTargets = () => { targets = targets.map((t, i) => ({ host: f.elements['t-host-' + i]?.value ?? t.host, port: f.elements['t-port-' + i]?.value ?? t.port, weight: f.elements['t-weight-' + i]?.value ?? t.weight })); };
    const many = () => targets.length > 1;
    const lastTarget = () => (f.elements['t-host-' + (targets.length - 1)]?.value || '').trim() || 'the last target';
    function drawRows() {
      rowsEl.innerHTML = targets.map((t, i) => `<div class="ap-row" style="gap:12px;align-items:flex-start;flex-wrap:wrap">
<div style="flex:2 1 220px">${withLabel(field({ name: 't-host-' + i, label: 'Service or host', value: t.host, data: true, placeholder: 'shop-v1', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' }), 'Target')}</div>
<div style="flex:1 1 100px">${withLabel(field({ name: 't-port-' + i, label: 'Port', type: 'number', value: t.port, data: true, attrs: 'inputmode="numeric"' }), 'Target port')}</div>
${many() ? `<div style="flex:1 1 100px">${withLabel(field({ name: 't-weight-' + i, label: 'Weight', type: 'number', value: t.weight, data: true, after: '%', attrs: 'inputmode="numeric"' }), 'Target weight')}</div>
<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" style="margin-top:26px" data-remove="${i}" aria-label="Remove target ${i + 1}">${icon('x')}</button>` : ''}</div>`).join('');
      $('[data-add-target]', el).hidden = targets.length >= MAX_TARGETS;
      $('[data-many]', el).hidden = !many();
      paint();
      drawSplit();
      drawCanary();
    }
    function drawSplit() {
      const box = $('[data-split]', el);
      if (!many()) { box.innerHTML = ''; return; }
      const line = targets.map((t, i) => `${(f.elements['t-host-' + i]?.value ?? t.host).trim() || 'target'} ${String(f.elements['t-weight-' + i]?.value ?? t.weight).trim() || 0}%`).join(' · ');
      const err = $('#e-weights', box);
      if (err) { $('[data-split-line]', box).textContent = line; return; }
      box.innerHTML = `<div class="ap-field" data-field="weights" data-label="Weights"><span class="ap-label">Split</span><span class="ap-data ap-muted" data-split-line>${esc(line)}</span><span class="ap-error" id="e-weights" hidden></span></div>`;
    }
    function drawCanary() {
      $('[data-canary-help]', el).textContent = `Requests with this header or cookie always reach ${lastTarget()}, so testers reach it on purpose.`;
      $('[data-canary-fields]', el).hidden = f.elements.canarySource.value === 'none';
    }
    drawRows();
    $('[data-add-target]', el).addEventListener('click', () => {
      syncTargets();
      if (targets.length === 1 && +targets[0].weight === 100) targets = [{ ...targets[0], weight: 90 }, { host: '', port: targets[0].port, weight: 10 }];
      else targets.push({ host: '', port: targets[0].port, weight: 0 });
      drawRows();
      f.elements['t-host-' + (targets.length - 1)].focus();
      dirtyCheck();
    });
    rowsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      syncTargets();
      targets.splice(+b.dataset.remove, 1);
      if (targets.length === 1) targets[0].weight = 100;
      drawRows();
      f.elements['t-host-' + Math.max(0, +b.dataset.remove - 1)].focus();
      if (many()) v.check('weights');
      dirtyCheck();
    });
    rowsEl.addEventListener('input', e => { if (/^t-(weight|host)-/.test(e.target.name)) { drawSplit(); drawCanary(); } });
    const showUpl = () => {
      $('[data-upl]', el).hidden = f.elements.cert.value !== 'uploaded';
      $('[data-challenge]', el).hidden = f.elements.cert.value !== 'auto';
      const h = String(f.elements.host.value || '').trim().toLowerCase(), p = dnsProvider(f.elements.challenge.value), fit = h && bestProvider([h]);
      $('#h-challenge', el).innerHTML = p && p.delegate && h && providerCovers(p, h) ? `Needs the CNAME <span class="ap-data">${esc(challengeName(h))}</span> → <span class="ap-data">${esc(h + '.' + p.delegate)}</span>.`
        : !p && fit ? `${esc(fit.name)} proves <span class="ap-data">${esc(h)}</span>: choose it if Let’s Encrypt can’t reach this hostname on port 80.` : '';
    };
    showUpl();
    const showSize = () => {
      $('[data-size-custom]', el).hidden = f.elements.sizeMode.value !== 'custom';
      const open = f.elements.sizeMode.value === 'none' && !f.elements.allow.value.trim();
      $('[data-size-warn]', el).innerHTML = open ? banner('warn', 'Anyone can upload any amount to this route', 'The route allows every address and has no size limit. Make sure the target checks who is uploading, or add allowed addresses under Access.') : '';
      paint();
    };
    showSize();
    f.addEventListener('input', e => { if (e.target.name === 'allow') showSize(); if (e.target.name === 'host') showUpl(); });
    f.addEventListener('change', e => {
      const n = e.target.name;
      if (n === 'cert' || n === 'challenge') showUpl();
      if (n === 'sizeMode') showSize();
      if (n === 'canarySource') drawCanary();
      if (n === 'hsts') $('[data-hsts]', el).hidden = !e.target.checked;
      if (n === 'rateLimited') $('[data-rate]', el).hidden = !e.target.checked;
      if (n === 'gated') $('[data-gate]', el).hidden = !e.target.checked;
      if (n === 'gateLink' && $('[data-link-current]', el)) $('[data-link-current]', el).hidden = !e.target.checked;
      if (n === 'maint') $('[data-maint]', el).hidden = !e.target.checked;
    });

    let newPassword = !src.gate;
    $('[data-gate-new]', el)?.addEventListener('click', () => {
      newPassword = true;
      $('[data-gate-current]', el).hidden = true;
      $('[data-gate-pw]', el).hidden = false;
      f.elements.gatePassword.value = passphrase();
      $('[data-gate-help]', el).textContent = 'Shown once more after you save, to copy. Saving signs out everyone who used the old one.';
      f.elements.gatePassword.focus();
      dirtyCheck();
    });
    let newLink = false;
    $('[data-link-new]', el)?.addEventListener('click', e => {
      newLink = true;
      const row = $('[data-link-current]', el);
      $('strong', row).textContent = 'A new link is made when you save';
      $('.ap-muted', row).textContent = 'The current one stops working then.';
      e.currentTarget.disabled = true;
      dirtyCheck();
    });
    $('[data-gate-gen]', el).addEventListener('click', () => { f.elements.gatePassword.value = passphrase(); v.check('gatePassword'); dirtyCheck(); });

    const v = form(f, () => {
      const rules = {
        host: (val, all) => {
          const msg = checkHost(val);
          if (msg) return msg;
          const h = String(val).trim().toLowerCase(), p = String(all.path || '/').trim();
          return api('read', 400).then(() => {
            if (D.redirects.some(x => x.host === h && x.path === '/')) return RM['route.redirectExists'];
            if (D.redirects.some(x => x.host === h && pathUnder(p, x.path))) return RM['route.pathRedirected'];
            return D.routes.some(x => x !== r && x.host === h && x.path === p) ? RM['route.duplicate'] : null;
          }).catch(() => null);
        },
        path: val => {
          const s = String(val).trim();
          if (!s) return RM.required;
          return s.startsWith('/') && !/[?#\s]|\.\.|\/\//.test(s) ? null : RM['path.invalid'];
        },
        project: val => (!val ? RM['project.notFound'] : null),
        canaryName: (val, all) => (!many() || all.canarySource === 'none' || /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$/.test(String(val).trim()) ? null : RM['route.canaryName']),
        canaryValue: (val, all) => {
          if (!many() || all.canarySource === 'none') return null;
          const s = String(val).trim();
          return !s ? RM.required : s.length > 200 ? RM.tooLong(200) : null;
        },
        challenge: (val, all) => {
          const p = all.cert === 'auto' && dnsProvider(val), h = String(all.host).trim().toLowerCase();
          return p && h && !providerCovers(p, h) ? RM['certificate.providerDoesNotCover'] : null;
        },
        certId: (val, all) => {
          if (all.cert !== 'uploaded') return null;
          if (!val) return RM['certificate.choose'];
          const h = String(all.host).trim().toLowerCase();
          return h && !certCovers(val.toLowerCase(), h) ? RM['certificate.doesNotCover'] : null;
        },
        timeout: rtWhole(1, 3600),
        sizeValue: (val, all) => (all.sizeMode === 'custom' ? checkSize(val, all.sizeUnit) : null),
        allow: val => {
          const lines = String(val).split('\n').map(s => s.trim()).filter(Boolean);
          if (lines.length > 100) return RM['ipRange.tooMany'];
          return lines.some(l => !V.cidr(l)) ? RM['ipRange.invalid'] : null;
        },
        rateLimit: (val, all) => (all.rateLimited ? rtWhole(1, 100000)(val) : null),
        gatePassword: (val, all) => {
          if (!all.gated || !newPassword) return null;
          const s = String(val);
          return !s.trim() ? RM['gate.passwordRequired'] : s.length < 12 ? RM['gate.passwordShort'] : s.length > 128 ? RM.tooLong(128) : null;
        },
        gateMessage: (val, all) => (all.gated && String(val).length > 120 ? RM.tooLong(120) : null),
        mStart: (val, all) => (all.maint && parseDate(val) === null ? RM['dateTime.format'] : null),
        mEnd: (val, all) => {
          if (!all.maint) return null;
          const e = parseDate(val), s = parseDate(all.mStart);
          if (e === null) return RM['dateTime.format'];
          if (s === null) return null;
          if (e <= s) return RM['maintenance.endBeforeStart'];
          if (e - s > 7 * DAY) return RM['maintenance.tooLong'];
          return e <= NOW ? RM['maintenance.ended'] : null;
        },
        mMsg: (val, all) => (all.maint && String(val).length > 200 ? RM.tooLong(200) : null),
      };
      targets.forEach((_, i) => {
        rules['t-host-' + i] = checkTarget;
        rules['t-port-' + i] = val => (String(val).trim() === '' ? RM['port.required'] : rtWhole(1, 65535)(val));
        if (many()) rules['t-weight-' + i] = rtWhole(0, 100);
      });
      rules.weights = (_, all) => {
        if (!many()) return null;
        const total = targets.reduce((a, t, i) => a + (parseInt(all['t-weight-' + i], 10) || 0), 0);
        return total !== 100 ? `The weights add up to ${total}%. Make them add up to 100%.` : null;
      };
      return rules;
    }, {
      verb: 'save',
      links: n => (n.startsWith('t-weight-') ? ['weights'] : n === 'host' ? ['certId', 'challenge'] : n === 'path' ? ['host'] : n === 'mStart' ? ['mEnd'] : n === 'cert' ? ['certId', 'challenge'] : n === 'canarySource' ? ['canaryName', 'canaryValue'] : n === 'sizeMode' || n === 'sizeUnit' ? ['sizeValue'] : []),
      submit: async val => {
        await api();
        syncTargets();
        const oldLink = src.gate && src.gate.link;
        const next = {
          host: val.host.trim().toLowerCase(), path: val.path.trim(), project: val.project,
          targets: targets.map(t => ({ host: String(t.host).trim(), port: +t.port, weight: many() ? +t.weight : 100 })),
          canary: many() && val.canarySource !== 'none' ? { source: val.canarySource, name: val.canaryName.trim(), value: val.canaryValue.trim() } : null,
          sticky: many() && val.sticky, compression: val.compression, caching: val.caching, hsts: val.hsts, hstsSub: val.hsts && val.hstsSub,
          cert: val.cert, certId: val.cert === 'uploaded' ? val.certId : null, timeout: +val.timeout,
          size: val.sizeMode === 'default' ? undefined : val.sizeMode === 'none' ? 'none' : toMb(val.sizeValue, val.sizeUnit),
          allow: val.allow.split('\n').map(s => s.trim()).filter(Boolean), rateLimit: val.rateLimited ? +val.rateLimit : null,
          gate: !val.gated ? null : {
            password: newPassword ? val.gatePassword : src.gate.password, set: newPassword ? NOW : src.gate.set, by: newPassword ? D.me.email : src.gate.by,
            message: val.gateMessage.trim(), days: +val.gateDays,
            link: !val.gateLink ? null : newLink || !(src.gate && src.gate.link) ? { key: linkKey(), made: NOW } : src.gate.link,
          },
          maintenance: val.maint ? { start: parseDate(val.mStart), end: parseDate(val.mEnd), message: val.mMsg.trim() } : null,
          changed: [NOW, D.me.email],
        };
        setGuard(null);
        if (isNew) {
          D.routes.push(Object.assign({ id: 'r' + Date.now().toString(36), status: 'ok', rpm: 0 }, next));
          if (next.cert === 'auto' && !D.certs.some(c => c.host === next.host)) D.certs.push({ host: next.host, source: 'auto', challenge: val.challenge, issuer: "Let's Encrypt R11", issued: NOW, expires: NOW + 90 * DAY, status: 'ok', note: 'Issued just now' });
        } else Object.assign(r, next);
        const own = next.cert === 'auto' && D.certs.find(c => c.source === 'auto' && c.host === next.host);
        if (own) own.challenge = val.challenge;
        go('/routes');
        const fresh = next.gate && { password: newPassword ? next.gate.password : null, link: next.gate.link && next.gate.link !== oldLink ? next.gate.link : null };
        if (fresh && (fresh.password || fresh.link)) showGateAccess(next, fresh);
        else toast(`${routeLabel(next)} saved. It applies on every replica now.`);
      },
    });

    if (r) mountPathRedirects(el, r);
    if (r && r.stack) {
      lockFields(f, r.stack.fields.flatMap(k => ROUTE_FIELDS[k] || []), r.stack.name, rowsEl);
      if (r.stack.fields.includes('targets')) { $('[data-add-target]', el).remove(); $$('[data-remove]', rowsEl).forEach(b => b.remove()); }
    }
    const snap = () => JSON.stringify(v.values());
    const initial = snap();
    let dirty = false;
    function dirtyCheck() { dirty = snap() !== initial; }
    setGuard(() => dirty);
    f.addEventListener('input', dirtyCheck);
    f.addEventListener('change', dirtyCheck);
    el.addEventListener('click', e => {
      if (e.target.closest('[data-delete]')) deleteRoutes([r], () => { setGuard(null); go('/routes'); });
      if (e.target.closest('[data-disable]')) setDisabled(r, !r.disabled);
    });
  }
  return { title: isNew ? 'New route' : routeLabel(r), html, mount };
}
