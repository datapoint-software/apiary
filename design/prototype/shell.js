/* The frame around every page: sidebar, top bar, router, search, account and the prototype controls. */
let D = seedData();
const Proto = {
  state: Object.assign({ cluster: 'healthy', data: 'sample', network: 'fast' }, store.get('proto') || {}),
  set(k, v) { this.state[k] = v; store.set('proto', this.state); },
};
if (Proto.state.data === 'empty') D = emptyData();

const shell = $('#app-shell'), side = $('#side'), main = $('#main');
const projectOf = id => D.projects.find(p => p.id === id);
const routesOf = id => D.routes.filter(r => r.project === id);
const rpmOf = id => routesOf(id).reduce((a, r) => a + r.rpm, 0);
function projectHealth(id) {
  const rs = routesOf(id);
  const bad = rs.filter(r => r.status === 'critical').length, warn = rs.filter(r => r.status === 'warn').length;
  if (!rs.length) return ['off', 'No routes'];
  if (bad) return ['critical', plural(bad, 'route') + ' down'];
  if (warn) return ['warn', rs.find(r => r.status === 'warn').statusText];
  return ['ok', 'Healthy'];
}
const certTone = c => (c.expires - NOW < 14 * DAY || c.status !== 'ok' ? (c.expires < NOW ? 'critical' : 'warn') : 'ok');

/* Router */
const Routes = [];
function route(pattern, fn, opts = {}) {
  const keys = [];
  const re = pattern === '*' ? /(?!)/ : new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  Routes.push({ re, keys, fn, opts });
}
const go = p => { location.hash = '#' + p; };
const currentPath = () => (location.hash.startsWith('#/') ? decodeURIComponent(location.hash.slice(1)) : '/');
let here = null, guard = null;
const setGuard = fn => { guard = fn; };
addEventListener('beforeunload', e => { if (guard && guard()) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('hashchange', () => {
  if (location.hash && !location.hash.startsWith('#/')) return;
  const p = currentPath();
  if (p === here) return;
  if (guard && guard()) {
    history.replaceState(null, '', '#' + here);
    return confirmDialog({
      title: 'Leave without saving?', tone: 'danger', mark: ['warn', 'triangle-alert'],
      text: "Your changes to this page haven't been saved. If you leave, they're lost.",
      cancel: 'Keep editing', confirm: 'Discard changes', busy: 'Leaving…',
      onConfirm: async () => { guard = null; setTimeout(() => go(p)); },
    });
  }
  render(p, true);
});

async function render(p, moved) {
  here = p;
  guard = null;
  closeMenu(false);
  closeSearch();
  if (phone.matches && shell.dataset.drawer === 'open') setDrawer(false, false);
  let m, params;
  for (const r of Routes) { const x = r.re.exec(p); if (x) { m = r; params = x.slice(1).map(decodeURIComponent); break; } }
  if (!m) { m = Routes.find(r => r.opts.notFound); params = []; }
  const bare = !!m.opts.bare;
  shell.hidden = bare;
  $('#bare').hidden = !bare;
  const host = bare ? $('#bare') : main;
  renderNav(p);
  renderStatus();
  if (!bare && moved && Proto.state.network === 'slow') {
    host.innerHTML = skeleton();
    await wait(900);
    if (here !== p) return;
  }
  const out = m.fn(...params);
  if (!out) return;
  host.innerHTML = out.html;
  document.title = `${out.title} · Apiary`;
  paint();
  applyWriteLock(host);
  out.mount && out.mount(host);
  if (moved) {
    scrollTo(0, 0);
    host.focus({ preventScroll: true });
    $('#announcer').textContent = out.title;
  }
}
const refresh = () => render(here, false);
function skeleton() {
  const bar = (w, h = 14) => `<span class="ap-skel" style="width:${w};height:${h}px"></span>`;
  return `<div class="ap-stack" style="gap:10px" aria-busy="true" aria-label="Loading">${bar('180px', 12)}${bar('320px', 32)}</div>
<div class="ap-panel" style="padding:24px;display:flex;flex-direction:column;gap:18px">${[1, 2, 3, 4, 5].map(() => `<div style="display:flex;gap:16px;align-items:center">${bar('22%')}${bar('30%')}${bar('14%')}${bar('10%')}</div>`).join('')}</div>`;
}

/* Sidebar, built from the data so counts and attention dots stay true */
function renderNav(p) {
  const certsBad = D.certs.some(c => certTone(c) !== 'ok');
  const replicasBad = Proto.state.cluster !== 'healthy' || D.replicas.some(r => r.role === 'down');
  const lastBackup = D.backups.length ? NOW - D.backups[0].at : Infinity;
  const groups = [
    ['', [['layout-dashboard', 'Overview', '#/']]],
    ['Projects', [...D.projects.map(pr => { const h = projectHealth(pr.id)[0]; return [pr.icon, pr.name, '#/projects/' + pr.id, h === 'critical' || h === 'warn' ? h : routesOf(pr.id).length || null]; }), ['plus', 'New project', null, null, 'data-new-project data-write']]],
    ['Traffic', [['route', 'All routes', '#/routes', D.routes.length || null], ['cable', 'Stream routes', '#/streams', D.streams.length || null], ['shield-check', 'Certificates', '#/certificates', certsBad ? 'warn' : null], ['corner-up-right', 'Redirects', '#/redirects', D.redirects.length || null]]],
    ['Cluster', [['hexagon', 'Replicas', '#/replicas', replicasBad ? (Proto.state.cluster === 'quorum' ? 'critical' : 'warn') : null], ['archive', 'Backups', '#/backups', lastBackup > 7 * DAY ? 'warn' : null], ['key-round', 'Root key', '#/root-key']]],
    ['Access', [['users', 'Users', '#/users', D.users.length], ['bot', 'Connected agents', '#/agents', D.agents.length || null], ['scroll-text', 'Audit log', '#/audit']]],
  ];
  const all = groups.flatMap(g => g[1]).filter(i => i[2]);
  const best = all.filter(i => i[2] === '#' + p || (i[2] !== '#/' && ('#' + p).startsWith(i[2] + '/'))).sort((a, b) => b[2].length - a[2].length)[0];
  $('#side-nav').innerHTML = groups.map(([title, items]) => `<nav class="ap-nav" aria-label="${title || 'Main'}">${title ? `<span class="ap-overline" aria-hidden="true">${title}</span>` : ''}${items.map(([ic, label, href, badge, attrs]) => {
    let extra = '';
    if (badge === 'warn' || badge === 'critical') extra = `<span class="ap-dot" style="color:var(--${badge})" aria-hidden="true"></span><span class="ap-sr">, needs attention</span>`;
    else if (badge) extra = `<span class="ap-count"><span class="ap-sr">, </span>${badge}</span>`;
    const inner = `${icon(ic)}<span class="ap-nav-label">${esc(label)}</span>${extra}`;
    return href ? `<a class="ap-nav-item" href="${href}" data-label="${esc(label)}"${best && best[2] === href ? ' aria-current="page"' : ''}>${inner}</a>`
      : `<button class="ap-nav-item ap-nav-button" type="button" data-label="${esc(label)}" ${attrs}>${inner}</button>`;
  }).join('')}</nav>`).join('');
  paint();
  applyWriteLock($('#side-nav'));
}

/* Cluster write status in the top bar, and the cluster-wide banner below it */
function renderStatus() {
  const s = Proto.state.cluster;
  const [tone, text, sr] = { healthy: ['ok', '3 of 3 voters', 'writes are accepted'], degraded: ['warn', '2 of 3 voters', 'writes are accepted'], quorum: ['critical', '1 of 3 voters', 'writes are paused'] }[s];
  $('#top-status').innerHTML = `<span class="ap-status ap-status-${tone}"><span class="ap-dot" aria-hidden="true"></span>${text}<span class="ap-sr">, ${sr}</span></span>`;
  $('#global').innerHTML = s === 'quorum'
    ? `<div class="ap-banner ap-banner-critical ap-global" role="alert">${icon('circle-alert')}<div class="ap-banner-body"><span class="ap-banner-title">Changes are paused</span><span>Only 1 of 3 voters can be reached, so the cluster can't agree on changes. Traffic keeps flowing with the last configuration. Bring edge-1 or edge-3 back, or as a last resort, recover the cluster from the surviving replica.</span><div class="ap-banner-actions"><a href="#/replicas">See replicas</a></div></div></div>`
    : s === 'degraded'
      ? `<div class="ap-banner ap-banner-warn ap-global">${icon('triangle-alert')}<div class="ap-banner-body"><span class="ap-banner-title">edge-3 can't be reached</span><span>Changes still work with 2 of 3 voters. If one more voter is lost, changes pause until it's back.</span><div class="ap-banner-actions"><a href="#/replicas">See replicas</a></div></div></div>` : '';
  paint();
}

/* Sidebar: collapses on wide screens, a drawer on phones */
const sideBtn = $('[data-sidebar]');
const phone = matchMedia('(max-width: 639px)');
function sideLabel() {
  const open = phone.matches ? shell.dataset.drawer === 'open' : shell.dataset.collapsed !== 'true';
  const text = phone.matches ? (open ? 'Close navigation' : 'Open navigation') : (open ? 'Collapse sidebar' : 'Expand sidebar');
  sideBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  sideBtn.setAttribute('aria-label', text);
  sideBtn.title = phone.matches ? text : text + ' (Ctrl or ⌘ + B)';
}
function setCollapsed(on, save) { shell.dataset.collapsed = on ? 'true' : 'false'; if (save) store.set('sidebarCollapsed', on); sideLabel(); }
function setDrawer(open, refocus = true) {
  shell.dataset.drawer = open ? 'open' : 'closed';
  sideLabel();
  if (open) { const f = $('.ap-nav-item', side); if (f) setTimeout(() => f.focus(), 50); } else if (refocus) sideBtn.focus();
}
const savedSide = store.get('sidebarCollapsed');
setCollapsed(savedSide === null ? innerWidth < 1024 : savedSide, false);
requestAnimationFrame(() => requestAnimationFrame(() => { shell.dataset.animate = ''; }));
sideBtn.addEventListener('click', () => (phone.matches ? setDrawer(shell.dataset.drawer !== 'open') : setCollapsed(shell.dataset.collapsed !== 'true', true)));
phone.addEventListener('change', sideLabel);
$('[data-drawer-close]').addEventListener('click', () => setDrawer(false));
side.addEventListener('keydown', e => { if (phone.matches && shell.dataset.drawer === 'open') trap(side, e); });
$('[data-skip]').addEventListener('click', e => { e.preventDefault(); main.focus(); });

/* Display and accessibility settings */
const displayBtn = $('[data-display]'), display = $('#display'), root = document.documentElement;
const prefs = store.get('display') || {};
function applyDisplay() {
  ['theme', 'text', 'contrast', 'motion'].forEach(k => {
    const v = prefs[k];
    if (!v || v === 'system' || v === 'default') root.removeAttribute('data-' + k); else root.setAttribute('data-' + k, v);
    const seg = display.querySelector(`[data-setting="${k}"]`);
    const cur = v || seg.querySelector('button').dataset.value;
    $$('button', seg).forEach(b => b.setAttribute('aria-pressed', b.dataset.value === cur ? 'true' : 'false'));
  });
}
applyDisplay();
display.addEventListener('click', e => { const b = e.target.closest('[data-value]'); if (!b) return; prefs[b.parentElement.dataset.setting] = b.dataset.value; store.set('display', prefs); applyDisplay(); });
function setDisplay(open, refocus = true) {
  display.hidden = !open;
  displayBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) display.querySelector('[aria-pressed="true"]').focus(); else if (refocus) displayBtn.focus();
}
displayBtn.addEventListener('click', () => setDisplay(display.hidden));
document.addEventListener('mousedown', e => { if (!display.hidden && !display.contains(e.target) && !displayBtn.contains(e.target)) setDisplay(false, false); });

/* Account */
$('[data-account]').addEventListener('click', e => menu(e.currentTarget, [
  { icon: 'user-round', label: 'Your account', run: () => go('/account') },
  { icon: 'shield-check', label: 'Security', run: () => go('/account/security') },
  { icon: 'monitor-smartphone', label: 'Active sessions', run: () => go('/account/sessions') },
  '-',
  { icon: 'log-out', label: 'Sign out', run: () => go('/sign-in') },
], { label: 'Account', head: `<div class="ap-menu-head"><span class="ap-avatar ap-avatar-lg" aria-hidden="true">${D.me.initials}</span><span><strong>${esc(D.me.name)}</strong><span class="ap-secondary">${esc(D.me.email)}</span><span class="ap-secondary">${D.me.role}</span></span></div><div class="ap-menu-sep" role="separator"></div>` }));

/* About, reachable from the sidebar in every state: the attribution must never be hidden */
$('[data-about]').addEventListener('click', () => {
  const d = dialog({
    title: 'Apiary', initial: '[data-close]', size: 'about',
    body: `<div class="ap-about-credits"><span class="ap-about-logo">${$('.ap-side-foot .ap-attribution a').innerHTML}</span><span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span><span>Free software under the <a href="#">GNU Affero General Public License, version 3</a>, with additional terms. This program comes with no warranty. <a href="#">Source code</a></span></div>`,
    foot: '<button class="ap-btn" type="button" data-close>Close</button>',
  });
  const head = $('.ap-dialog-head', d.el);
  head.insertAdjacentHTML('afterbegin', '<span class="ap-brand-mark ap-about-mark" aria-hidden="true"></span>');
  head.insertAdjacentHTML('beforeend', `<p class="ap-about-version">Version <span class="ap-data">${D.cluster.version}</span></p>`);
});

/* Search: a combobox over pages, projects, routes, certificates and users */
const q = $('#q'), qList = $('#q-list');
let qItems = [], qActive = -1;
function searchIndex() {
  const pages = [['Overview', '/'], ['All routes', '/routes'], ['Stream routes', '/streams'], ['Certificates', '/certificates'], ['Redirects', '/redirects'], ['Replicas', '/replicas'], ['Backups', '/backups'], ['Root key', '/root-key'], ['Users', '/users'], ['Connected agents', '/agents'], ['Audit log', '/audit'], ['Your account', '/account']];
  return [
    ...pages.map(([t, p]) => ({ icon: 'file', title: t, sub: 'Page', path: p })),
    ...D.projects.map(p => ({ icon: p.icon, title: p.name, sub: 'Project · ' + plural(routesOf(p.id).length, 'route'), path: '/projects/' + p.id })),
    ...D.routes.map(r => ({ icon: 'route', title: r.host + (r.path === '/' ? '' : r.path), sub: 'Route · ' + projectOf(r.project).name, path: '/routes/' + r.id })),
    ...D.certs.map(c => ({ icon: 'shield-check', title: c.host, sub: 'Certificate · expires ' + fmtDate(c.expires, false), path: '/certificates/' + encodeURIComponent(c.host) })),
    ...D.users.map(u => ({ icon: 'user-round', title: u.name, sub: 'User · ' + u.email, path: '/users' })),
  ];
}
function closeSearch() { qList.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); qActive = -1; }
function drawSearch() {
  const t = q.value.trim().toLowerCase();
  if (!t) return closeSearch();
  qItems = searchIndex().filter(i => (i.title + ' ' + i.sub).toLowerCase().includes(t)).slice(0, 8);
  qActive = qItems.length ? 0 : -1;
  qList.innerHTML = qItems.length ? qItems.map((i, n) => `<div class="ap-option" role="option" id="q-${n}" aria-selected="${n === qActive}" data-n="${n}">${icon(i.icon)}<span>${esc(i.title)}<small>${esc(i.sub)}</small></span></div>`).join('') : `<div class="ap-search-empty" role="presentation">Nothing matches "${esc(q.value.trim())}".</div>`;
  qList.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  syncActive();
  paint();
}
function syncActive() {
  $$('.ap-option', qList).forEach((o, n) => o.setAttribute('aria-selected', n === qActive ? 'true' : 'false'));
  if (qActive >= 0) { q.setAttribute('aria-activedescendant', 'q-' + qActive); $('#q-' + qActive).scrollIntoView({ block: 'nearest' }); } else q.removeAttribute('aria-activedescendant');
}
function pick(n) { const i = qItems[n]; if (!i) return; q.value = ''; closeSearch(); go(i.path); }
q.addEventListener('input', drawSearch);
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (qList.hidden) drawSearch(); e.preventDefault(); if (qItems.length) { qActive = (qActive + (e.key === 'ArrowDown' ? 1 : -1) + qItems.length) % qItems.length; syncActive(); } }
  else if (e.key === 'Enter') { e.preventDefault(); pick(qActive); }
  else if (e.key === 'Escape') { e.stopPropagation(); if (!qList.hidden) closeSearch(); else { q.value = ''; q.blur(); } }
});
q.addEventListener('blur', () => setTimeout(closeSearch, 150));
qList.addEventListener('mousedown', e => { const o = e.target.closest('[data-n]'); if (o) { e.preventDefault(); pick(+o.dataset.n); } });

/* Keyboard: Escape closes the innermost layer; Ctrl or ⌘ + K searches, + B collapses the sidebar */
document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!shell.hidden) { q.focus(); q.select(); } }
  if (mod && e.key.toLowerCase() === 'b' && !phone.matches && !shell.hidden) { e.preventDefault(); sideBtn.click(); }
  if (e.key !== 'Escape') return;
  if (openMenuState) return closeMenu(true);
  const top = Dialogs[Dialogs.length - 1];
  if (top) { if (!('busy' in top.el.dataset)) top.close(); return; }
  if (!protoPanel.hidden) return setProto(false);
  if (!display.hidden) return setDisplay(false);
  if (shell.dataset.drawer === 'open') return setDrawer(false);
});
document.addEventListener('click', e => { if (e.target.closest('[data-new-project]')) newProject(); });

/* Prototype controls: scenarios to see how alerts, empty states, slow networks and failures look */
const protoBtn = $('[data-proto]');
const protoPanel = document.createElement('div');
protoPanel.className = 'ap-popover pt-panel';
protoPanel.hidden = true;
protoPanel.setAttribute('role', 'dialog');
protoPanel.setAttribute('aria-labelledby', 'pt-t');
document.body.querySelector('.ap').appendChild(protoPanel);
function drawProto() {
  const seg = (k, label, opts) => `<div class="ap-setting"><span class="ap-label" id="pt-${k}">${label}</span><div class="ap-seg" role="group" aria-labelledby="pt-${k}" data-pt="${k}">${opts.map(([v, t]) => `<button type="button" aria-pressed="${Proto.state[k] === v}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  protoPanel.innerHTML = `<div><h2 class="ap-h ap-h-3" id="pt-t">Prototype controls</h2><p class="ap-caption" style="margin:2px 0 0">Not part of Apiary. Switch scenarios to see alerts, empty states and failures.</p></div>
${seg('cluster', 'Cluster', [['healthy', 'Healthy'], ['degraded', '1 voter down'], ['quorum', 'No quorum']])}
${seg('network', 'Server', [['fast', 'Fast'], ['slow', 'Slow'], ['failing', 'Failing']])}
${seg('data', 'Data', [['sample', 'Sample'], ['empty', 'New install']])}
<div class="ap-setting"><span class="ap-label">Screens</span><div class="ap-row"><a class="ap-btn ap-btn-sm" href="#/sign-in">Sign in</a><a class="ap-btn ap-btn-sm" href="#/setup">First run</a><a class="ap-btn ap-btn-sm" href="#/nowhere">Not found</a></div></div>
<button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-pt-reset style="align-self:flex-start">Reset the sample data</button>`;
}
function setProto(open) {
  if (open) drawProto();
  protoPanel.hidden = !open;
  protoBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) $('[aria-pressed="true"]', protoPanel).focus(); else protoBtn.focus();
}
protoBtn.addEventListener('click', () => setProto(protoPanel.hidden));
protoPanel.addEventListener('keydown', e => trap(protoPanel, e));
protoPanel.addEventListener('click', e => {
  const b = e.target.closest('[data-v]');
  if (b) {
    const k = b.parentElement.dataset.pt;
    Proto.set(k, b.dataset.v);
    if (k === 'data') D = b.dataset.v === 'empty' ? emptyData() : seedData();
    drawProto();
    $(`[data-pt="${k}"] [aria-pressed="true"]`, protoPanel).focus();
    refresh();
  }
  if (e.target.closest('[data-pt-reset]')) { D = Proto.state.data === 'empty' ? emptyData() : seedData(); refresh(); toast('The sample data is back to how it started.', { tone: 'info' }); }
  if (e.target.closest('a')) setProto(false);
});
document.addEventListener('mousedown', e => { if (!protoPanel.hidden && !protoPanel.contains(e.target) && !protoBtn.contains(e.target)) { protoPanel.hidden = true; protoBtn.setAttribute('aria-expanded', 'false'); } });
