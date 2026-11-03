/* Shared behaviour: formatting, toasts, dialogs, menus, busy buttons, form validation and the date and time picker. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<i data-lucide="${name}" class="ap-icon${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const paint = () => { if (window.lucide) lucide.createIcons(); };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('apiary.' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('apiary.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

/* Formatting. Every time in Apiary is UTC, and says so. */
const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pad = n => String(n).padStart(2, '0');
const plural = (n, one, many = one + 's') => `${num(n)} ${n === 1 ? one : many}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function fmtDate(ts, time = true) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` + (time ? ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : '');
}
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const dayStart = ts => { const d = new Date(ts); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
function longDay(ts) {
  const d = new Date(ts);
  return `${WEEKDAYS[(d.getUTCDay() + 6) % 7]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function ago(ts) {
  const s = Math.round((NOW - ts) / 1000), future = s < 0, a = Math.abs(s);
  let t;
  if (a < 60) return future ? 'in a moment' : 'just now';
  if (a < 3600) t = plural(Math.round(a / 60), 'minute');
  else if (a < 86400) t = plural(Math.round(a / 3600), 'hour');
  else t = plural(Math.round(a / 86400), 'day');
  return future ? 'in ' + t : t + ' ago';
}
/* Accepts "2026-11-03 14:00" (or a T between) and "2026-11-03"; rejects dates that don't exist. */
function parseDate(str, withTime = true) {
  const m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?\s*$/.exec(str || '');
  if (!m || (withTime && m[4] === undefined)) return null;
  const [y, mo, d, h = 0, mi = 0] = m.slice(1).map(x => (x === undefined ? undefined : Number(x)));
  const ts = Date.UTC(y, mo - 1, d, h || 0, mi || 0);
  const c = new Date(ts);
  if (c.getUTCFullYear() !== y || c.getUTCMonth() !== mo - 1 || c.getUTCDate() !== d || (h || 0) > 23 || (mi || 0) > 59) return null;
  return ts;
}

/* Small markup helpers */
const status = (tone, text) => `<span class="ap-status ap-status-${tone}"><span class="ap-dot" aria-hidden="true"></span>${esc(text)}</span>`;
const banner = (tone, title, text = '', actions = '', ic) => `<div class="ap-banner ap-banner-${tone}">${icon(ic || { info: 'info', ok: 'circle-check', warn: 'triangle-alert', critical: 'circle-alert' }[tone])}<div class="ap-banner-body">${title ? `<span class="ap-banner-title">${title}</span>` : ''}${text ? `<span>${text}</span>` : ''}${actions ? `<div class="ap-banner-actions">${actions}</div>` : ''}</div></div>`;
function pageHead({ crumbs = [], title, sub = '', actions = '' }) {
  const sep = '<span aria-hidden="true">/</span>';
  const trail = [[D.cluster.name, '#/'], ...crumbs].map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join(sep);
  return `<div class="ap-stack" style="gap:4px"><nav class="ap-crumbs" aria-label="Breadcrumb">${trail}${sep}<span aria-current="page">${esc(title)}</span></nav>
<div class="ap-page-head"><div style="min-width:0"><h1 class="ap-h ap-h-1">${esc(title)}</h1>${sub ? `<p class="ap-sub">${sub}</p>` : ''}</div>${actions ? `<div class="ap-row" style="gap:12px">${actions}</div>` : ''}</div></div>`;
}
function sparkline(values, h = 36, w = 220) {
  const max = 33, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(v / max * h).toFixed(1)}`);
  const line = 'M' + pts.join(' L'), last = pts[pts.length - 1].split(',');
  return `<svg class="ap-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><line class="ap-spark-grid" x1="0" y1="${h}" x2="${w}" y2="${h}"/><path class="ap-spark-area" d="${line} L${w},${h} L0,${h} Z"/><path class="ap-spark-line" d="${line}" vector-effect="non-scaling-stroke"/><circle class="ap-spark-end" cx="${last[0]}" cy="${last[1]}" r="3.5"/></svg>`;
}
function emptyState(title, text, action = '') {
  return `<div class="ap-empty"><div class="ap-empty-mark" aria-hidden="true"></div><h2 class="ap-h ap-h-2">${title}</h2><p>${text}</p>${action}</div>`;
}

/* Focus stays inside dialogs and drawers */
function trap(container, e) {
  if (e.key !== 'Tab') return;
  const items = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

/* Toasts: success and info close on their own; errors stay until dismissed and are announced at once. */
function toast(text, { tone = 'ok', title, action, onAction } = {}) {
  const t = document.createElement('div');
  t.className = `ap-toast ap-toast-${tone}`;
  t.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  t.innerHTML = `${icon({ ok: 'circle-check', error: 'circle-alert', info: 'info' }[tone])}<span class="ap-toast-text">${title ? `<span class="ap-toast-title">${esc(title)}</span>` : ''}${esc(text)}</span>${action ? `<button class="ap-btn ap-btn-sm" type="button" data-t-act>${esc(action)}</button>` : ''}<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon ap-toast-close" type="button" aria-label="Dismiss">${icon('x')}</button>`;
  $('#toasts').appendChild(t);
  paint();
  let timer;
  const close = () => { clearTimeout(timer); t.remove(); };
  const arm = () => { if (tone !== 'error') timer = setTimeout(close, action ? 8000 : 5000); };
  t.querySelector('.ap-toast-close').onclick = close;
  if (action) t.querySelector('[data-t-act]').onclick = () => { close(); onAction && onAction(); };
  t.addEventListener('mouseenter', () => clearTimeout(timer));
  t.addEventListener('mouseleave', arm);
  t.addEventListener('focusin', () => clearTimeout(timer));
  arm();
}

/* A pretend server. Writes need a quorum; the prototype controls can make it slow or fail. */
class ApiError extends Error { constructor(title, detail) { super(title); this.title = title; this.detail = detail; } }
async function api(kind = 'write', ms) {
  await wait(ms ?? (Proto.state.network === 'slow' ? 2200 : 650));
  if (kind === 'write' && Proto.state.cluster === 'quorum') throw new ApiError('Changes are paused', "Only 1 of 3 voters can be reached, so the cluster can't agree on changes. Nothing was changed.");
  if (Proto.state.network === 'failing') throw new ApiError("Couldn't reach the leader", "edge-2 didn't answer within 5 seconds. Nothing was changed; try again.");
}
/* Runs an action from a button: spinner and label while it works, and the button can't be pressed twice. */
async function run(btn, label, fn) {
  const html = btn.innerHTML, width = btn.offsetWidth;
  btn.setAttribute('aria-busy', 'true');
  btn.style.minWidth = width + 'px';
  btn.innerHTML = `<span class="ap-spinner" aria-hidden="true"></span>${esc(label)}`;
  const dlg = btn.closest('.ap-scrim');
  if (dlg) dlg.dataset.busy = '';
  try { return await fn(); }
  finally {
    if (dlg) delete dlg.dataset.busy;
    if (btn.isConnected) { btn.removeAttribute('aria-busy'); btn.style.minWidth = ''; btn.innerHTML = html; }
  }
}
/* Quick actions that fail say so in a toast with a way to try again. */
async function quick(btn, label, work, done) {
  try { await run(btn, label, work); done(); }
  catch (err) { toast(err.detail, { tone: 'error', title: err.title, action: 'Try again', onAction: () => btn.isConnected && btn.click() }); }
}

/* Dialogs. Forms don't close when the scrim is clicked, so a stray click can't lose what was typed. */
const Dialogs = [];
function dialog({ title, body, foot = '', size = '', mark, role = 'dialog', backdrop = true, initial, describe = false, onClose }) {
  const id = 'd' + Math.random().toString(36).slice(2, 8);
  const scrim = document.createElement('div');
  scrim.className = 'ap-scrim';
  scrim.innerHTML = `<div class="ap-dialog${size ? ' ap-dialog-' + size : ''}" role="${role}" aria-modal="true" aria-labelledby="${id}-t"${describe ? ` aria-describedby="${id}-b"` : ''}>
<div class="ap-dialog-head">${mark ? `<span class="ap-dialog-mark ap-dialog-mark-${mark[0]}">${icon(mark[1])}</span>` : ''}<h2 class="ap-h ap-h-2" id="${id}-t">${title}</h2></div>
<div class="ap-dialog-body" id="${id}-b">${body}</div>${foot ? `<div class="ap-dialog-foot">${foot}</div>` : ''}</div>`;
  const opener = document.activeElement;
  $('#overlays').appendChild(scrim);
  const d = {
    el: scrim, box: scrim.firstElementChild, backdrop,
    close() {
      if (!scrim.isConnected) return;
      scrim.remove();
      Dialogs.splice(Dialogs.indexOf(d), 1);
      if (opener && opener.isConnected) opener.focus(); else $('#main').focus();
      onClose && onClose();
    },
    body(html) { $('.ap-dialog-body', scrim).innerHTML = html; paint(); },
    foot(html) { $('.ap-dialog-foot', scrim).innerHTML = html; paint(); },
  };
  scrim.addEventListener('keydown', e => trap(scrim, e));
  scrim.addEventListener('mousedown', e => { if (e.target === scrim && backdrop && !('busy' in scrim.dataset)) d.close(); });
  scrim.addEventListener('click', e => { if (e.target.closest('[data-close]') && !('busy' in scrim.dataset)) d.close(); });
  Dialogs.push(d);
  paint();
  const target = (initial && $(initial, scrim)) || $(FOCUSABLE, $('.ap-dialog-body', scrim)) || $(FOCUSABLE, scrim);
  if (target) target.focus();
  return d;
}
/* Confirmation, for anything that can't be undone or affects every replica. Focus starts on the safe choice. */
function confirmDialog({ title, text, confirm, busy = 'Working…', cancel = 'Cancel', tone = 'danger', mark, type, typeLabel, check, onConfirm }) {
  const body = `<p style="margin:0">${text}</p><div data-dlg-alert></div>
${type ? `<div class="ap-field"><label class="ap-label" for="cf-in">${typeLabel || `Type <span class="ap-data">${esc(type)}</span> to confirm`}</label><input class="ap-input ap-data" id="cf-in" autocomplete="off" spellcheck="false"></div>` : ''}
${check ? `<label class="ap-choice"><input class="ap-check" type="checkbox" id="cf-check"><span>${check}</span></label>` : ''}`;
  const foot = `<button class="ap-btn ap-btn-ghost" type="button" data-close>${esc(cancel)}</button><button class="ap-btn ap-btn-${tone}" type="button" data-ok${type || check ? ' disabled' : ''} data-write>${esc(confirm)}</button>`;
  const d = dialog({ title, body, foot, mark: mark || (tone === 'danger' ? ['critical', 'triangle-alert'] : null), role: 'alertdialog', describe: true, initial: type ? '#cf-in' : '[data-close]' });
  const ok = $('[data-ok]', d.el), input = $('#cf-in', d.el), box = $('#cf-check', d.el);
  const update = () => { ok.disabled = (input && input.value.trim() !== type) || (box && !box.checked); };
  input && input.addEventListener('input', update);
  box && box.addEventListener('change', update);
  applyWriteLock(d.el);
  ok.addEventListener('click', async () => {
    try { await run(ok, busy, () => onConfirm(d)); d.close(); }
    catch (err) { $('[data-dlg-alert]', d.el).innerHTML = banner('critical', esc(err.title), esc(err.detail)); paint(); }
  });
  return d;
}

/* Menus, anchored to the button that opened them */
let openMenuState = null;
function menu(anchor, items, { label = 'Actions', head = '', align = 'end' } = {}) {
  const reopen = openMenuState && openMenuState.anchor === anchor;
  closeMenu(false);
  if (reopen) return;
  const m = document.createElement('div');
  m.className = 'ap-menu' + (head ? ' ap-account' : '');
  m.setAttribute('role', 'menu');
  m.setAttribute('aria-label', label);
  m.style.cssText = 'position:fixed;z-index:40;animation:ap-rise 160ms cubic-bezier(.2,.8,.2,1)';
  m.innerHTML = head + items.map((it, i) => (it === '-' ? '<div class="ap-menu-sep" role="separator"></div>'
    : `<button class="ap-menu-item${it.danger ? ' ap-menu-danger' : ''}" role="menuitem" type="button" tabindex="-1" data-i="${i}"${it.disabled ? ' aria-disabled="true"' : ''}${it.write ? ' data-write' : ''}>${icon(it.icon)}${esc(it.label)}</button>`)).join('');
  $('#overlays').appendChild(m);
  paint();
  const r = anchor.getBoundingClientRect();
  let top = r.bottom + 6;
  if (top + m.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 6);
  const left = align === 'end' ? r.right - m.offsetWidth : r.left;
  m.style.top = top + 'px';
  m.style.left = Math.min(Math.max(8, left), innerWidth - m.offsetWidth - 8) + 'px';
  m.style.right = 'auto';
  anchor.setAttribute('aria-expanded', 'true');
  const btns = $$('.ap-menu-item', m);
  btns[0].focus();
  m.addEventListener('keydown', e => {
    const i = btns.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
    if (next !== undefined) { e.preventDefault(); btns[(next + btns.length) % btns.length].focus(); }
    if (e.key === 'Tab') closeMenu(false);
    if (e.key === 'Escape') { e.stopPropagation(); closeMenu(true); }
  });
  m.addEventListener('click', e => {
    const b = e.target.closest('.ap-menu-item');
    if (!b) return;
    const it = items[b.dataset.i];
    if (it.disabled) { if (it.why) toast(it.why, { tone: 'info' }); return; }
    if (b.getAttribute('aria-disabled') === 'true') return;
    closeMenu(true);
    it.run && it.run(anchor);
  });
  openMenuState = { m, anchor };
}
function closeMenu(refocus) {
  if (!openMenuState) return;
  const { m, anchor } = openMenuState;
  openMenuState = null;
  m.remove();
  anchor.setAttribute('aria-expanded', 'false');
  if (refocus && anchor.isConnected) anchor.focus();
}
document.addEventListener('mousedown', e => { if (openMenuState && !openMenuState.m.contains(e.target) && !openMenuState.anchor.contains(e.target)) closeMenu(false); });
addEventListener('resize', () => closeMenu(false));

/* Writes are locked while the cluster has no quorum: the controls stay visible and say why. */
const LOCK_WHY = "Changes are paused while the cluster can't reach a majority of voters.";
function applyWriteLock(root = document) {
  const locked = Proto.state.cluster === 'quorum';
  $$('[data-write]', root).forEach(b => {
    if (locked) { b.setAttribute('aria-disabled', 'true'); b.dataset.lockTitle = b.title || ''; b.title = LOCK_WHY; }
    else if (b.dataset.lockTitle !== undefined) { b.removeAttribute('aria-disabled'); b.title = b.dataset.lockTitle; delete b.dataset.lockTitle; }
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-write][aria-disabled="true"]');
  if (!b) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  toast(LOCK_WHY + ' Routing continues with the last configuration.', { tone: 'info', title: 'Changes are paused' });
}, true);

/* Fields. Every control has a label, optional help, and an error slot that screen readers hear with it. */
function field({ name, label, value = '', type = 'text', help = '', optional, data, placeholder = '', before, after, attrs = '', control, counter }) {
  const ctl = control || `<input class="ap-input${data ? ' ap-data' : ''}" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} aria-describedby="h-${name} e-${name}" ${attrs}>`;
  const wrapped = before || after ? `<div class="ap-affix">${before ? `<span class="ap-affix-text">${before}</span>` : ''}${ctl}${after ? `<span class="ap-affix-text">${after}</span>` : ''}</div>` : ctl;
  const foot = counter ? `<div class="ap-field-foot"><span class="ap-help" id="h-${name}">${help}</span><span class="ap-counter" data-counter="${name}" data-max="${counter}" aria-hidden="true"></span></div>` : help ? `<span class="ap-help" id="h-${name}">${help}</span>` : '';
  return `<div class="ap-field" data-field="${name}"><label class="ap-label" for="f-${name}">${label}${optional ? ' <span class="ap-optional">(optional)</span>' : ''}</label>${wrapped}${foot}<span class="ap-note" data-note="${name}" hidden></span><span class="ap-error" id="e-${name}" hidden></span></div>`;
}
const textarea = (name, value, attrs = '', data = true) => `<textarea class="ap-textarea${data ? ' ap-data' : ''}" id="f-${name}" name="${name}" aria-describedby="h-${name} e-${name}" ${attrs}>${esc(value)}</textarea>`;
const select = (name, options, value, attrs = '') => `<select class="ap-select" id="f-${name}" name="${name}" aria-describedby="h-${name} e-${name}" ${attrs}>${options.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
function dtpField({ name, label, value, help = '', optional, time = true, min, max }) {
  const ctl = `<div class="ap-dtp" data-time="${time ? 1 : 0}"${min ? ` data-min="${min}"` : ''}${max ? ` data-max="${max}"` : ''} data-label="${esc(label)}"><div class="ap-affix"><input class="ap-input ap-data" id="f-${name}" name="${name}" value="${value ? fmtDate(value, time) : ''}" placeholder="${time ? 'YYYY-MM-DD HH:MM' : 'YYYY-MM-DD'}" autocomplete="off" spellcheck="false" aria-describedby="h-${name} e-${name}">${time ? '<span class="ap-affix-text">UTC</span>' : ''}</div><button class="ap-btn ap-btn-icon ap-dtp-btn" type="button" aria-label="Choose ${esc(label.toLowerCase())} on a calendar" aria-haspopup="dialog" aria-expanded="false" data-dtp>${icon('calendar')}</button></div>`;
  return field({ name, label, help, optional, control: ctl });
}

/* Common rules. Each returns the message to show, or nothing. Messages say what to do, not only what's wrong. */
const V = {
  required: (v, what) => (!String(v ?? '').trim() ? `Enter ${what}.` : null),
  hostname(v, { wildcard = true } = {}) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return 'Enter a hostname, such as shop.example.com.';
    if (/^https?:\/\//.test(s)) return 'Enter the hostname only, without http:// or https://.';
    if (/[/:]/.test(s)) return 'Enter the hostname only. Add a path in the Path field.';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return "Use a hostname, not an IP address: certificates can't be issued for IP addresses.";
    if (s.length > 253) return 'A hostname can be at most 253 characters long.';
    const labels = s.split('.');
    if (labels.length < 2) return 'Enter a full hostname, such as shop.example.com.';
    if (s.startsWith('*.') && !wildcard) return "Wildcards aren't allowed here.";
    const bad = labels.find((l, i) => !(i === 0 && l === '*' && wildcard) && !/^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(l));
    if (bad !== undefined) return bad === '' ? 'A hostname has no empty parts: check for two dots in a row.' : `"${bad}" isn't valid: use letters, digits and hyphens, not starting or ending with a hyphen.`;
    return null;
  },
  port(v, label = 'a port') {
    const s = String(v ?? '').trim();
    if (!s) return `Enter ${label}.`;
    if (!/^\d+$/.test(s) || +s < 1 || +s > 65535) return 'Enter a port from 1 to 65535.';
    return null;
  },
  /* Apiary refuses loopback and link-local targets, so a route can't reach the proxy's own host. */
  target(v) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return 'Enter a target, such as the service name shop-v1.';
    if (/:\d+$/.test(s)) return 'Enter the port in the Port field.';
    if (s === 'localhost' || /^127\./.test(s) || s === '::1' || s === '[::1]') return "Apiary doesn't route to loopback addresses. Use the service's name on the shared network, such as shop-v1.";
    if (/^169\.254\./.test(s) || /^\[?fe80:/.test(s)) return "Apiary doesn't route to link-local addresses. Use the service's name on the shared network.";
    if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(s) && !/^\[[0-9a-f:]+\]$/.test(s)) return 'Use a service name, hostname or IP address.';
    return null;
  },
  cidr(line) {
    const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(line);
    if (v4) return v4.slice(1, 5).every(n => +n <= 255) && (v4[5] === undefined || +v4[5] <= 32);
    const v6 = /^([0-9a-f:]+)(?:\/(\d{1,3}))?$/i.exec(line);
    return !!v6 && v6[1].includes(':') && (v6[1].match(/::/g) || []).length <= 1 && (v6[2] === undefined || +v6[2] <= 128);
  },
  email(v) {
    const s = String(v || '').trim();
    if (!s) return 'Enter an email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Enter an email address like name@example.com.';
    return null;
  },
  date(v, { time = true, required = true } = {}) {
    if (!String(v || '').trim()) return required ? `Enter a date${time ? ' and time' : ''}.` : null;
    return parseDate(v, time) === null ? `Enter a date like ${time ? '2026-11-03 14:00' : '2026-11-03'}.` : null;
  },
};

/* Form validation:
   - A field is checked when you leave it, then again as you type, so a fixed error clears at once.
   - Nothing turns red while you type in a field for the first time.
   - On submit every field is checked. Long forms list the problems at the top, with links; short ones focus the first.
   - Server errors appear at the top of the form; what was typed is kept. */
function form(el, rules, { submit, summary = true, verb = 'continue', links = {} } = {}) {
  const getRules = typeof rules === 'function' ? rules : () => rules;
  const touched = new Set();
  const timers = {};
  const values = () => {
    const v = {};
    for (const c of el.elements) {
      if (!c.name) continue;
      if (c.type === 'checkbox') v[c.name] = c.checked;
      else if (c.type === 'radio') { if (c.checked) v[c.name] = c.value; else if (!(c.name in v)) v[c.name] = null; }
      else if (c.type === 'file') v[c.name] = c.files && c.files[0];
      else v[c.name] = c.value;
    }
    return v;
  };
  const slot = name => el.querySelector(`[data-field="${name}"]`);
  function note(name, kind, text) {
    const n = el.querySelector(`[data-note="${name}"]`);
    if (!n) return;
    if (!kind) { n.hidden = true; n.className = 'ap-note'; n.innerHTML = ''; return; }
    n.hidden = false;
    n.className = 'ap-note ap-' + kind;
    n.innerHTML = (kind === 'checking' ? '<span class="ap-spinner" aria-hidden="true"></span>' : icon('circle-check')) + esc(text);
    paint();
  }
  function show(name, msg) {
    const f = slot(name);
    if (!f) return;
    const err = f.querySelector(':scope > .ap-error');
    const controls = $$(`[name="${name}"]`, el);
    if (msg) {
      err.innerHTML = icon('circle-alert') + esc(msg);
      err.hidden = false;
      controls.forEach(c => c.setAttribute('aria-invalid', 'true'));
      const drop = f.querySelector('.ap-drop');
      if (drop) drop.setAttribute('aria-invalid', 'true');
      paint();
    } else {
      err.hidden = true;
      err.textContent = '';
      controls.forEach(c => c.removeAttribute('aria-invalid'));
      const drop = f.querySelector('.ap-drop');
      if (drop) drop.removeAttribute('aria-invalid');
    }
  }
  async function check(name) {
    const rule = getRules()[name];
    if (!rule) return null;
    const vals = values();
    let res = rule(vals[name], vals);
    if (res && typeof res.then === 'function') { show(name, null); note(name, 'checking', 'Checking…'); res = await res; }
    const msg = res && typeof res === 'object' ? null : res;
    show(name, msg || null);
    note(name, res && typeof res === 'object' ? 'valid' : null, res && res.ok);
    return msg || null;
  }
  const linked = n => (typeof links === 'function' ? links(n) : links[n]) || [];
  function recheck(name) {
    const deps = [name, ...linked(name)].filter(n => touched.has(n) || slot(n)?.querySelector(':scope > .ap-error:not([hidden])'));
    deps.forEach(n => { clearTimeout(timers[n]); timers[n] = setTimeout(() => check(n), 250); });
  }
  const nameOf = t => t.name || (t.closest('[data-field]') && t.closest('[data-field]').dataset.field);
  el.addEventListener('focusout', e => {
    const n = nameOf(e.target);
    if (!n || !getRules()[n] || e.target.closest('.ap-cal-pop')) return;
    if (el.contains(e.relatedTarget) && e.relatedTarget && e.relatedTarget.closest(`[data-field="${n}"]`)) return;
    touched.add(n);
    clearTimeout(timers[n]);
    check(n);
    linked(n).filter(x => touched.has(x)).forEach(x => check(x));
  });
  el.addEventListener('input', e => { const n = nameOf(e.target); if (n) recheck(n); counters(); });
  el.addEventListener('change', e => { const n = nameOf(e.target); if (n) { touched.add(n); recheck(n); } });
  function counters() {
    $$('[data-counter]', el).forEach(c => {
      const ctl = el.elements[c.dataset.counter], max = +c.dataset.max, len = ctl.value.length;
      c.textContent = `${len}/${max}`;
      c.classList.toggle('ap-counter-over', len > max);
    });
  }
  counters();
  const sumEl = () => el.querySelector('[data-summary]');
  function report(errs) {
    const s = sumEl();
    if (!summary || !s || errs.length === 1) {
      if (s) s.innerHTML = '';
      const [n] = errs[0];
      focusField(n);
      return;
    }
    s.innerHTML = `<div class="ap-banner ap-banner-critical ap-error-summary" tabindex="-1" role="alert">${icon('circle-alert')}<div class="ap-banner-body"><span class="ap-banner-title">Fix ${plural(errs.length, 'problem')} to ${verb}</span><ul>${errs.map(([n, m]) => { const lbl = slot(n).querySelector('.ap-label'); const t = slot(n).dataset.label || (lbl ? lbl.childNodes[0].textContent.trim() : ''); return `<li><a href="#f-${n}" data-goto="${n}">${esc(t ? t + ': ' : '')}${esc(m)}</a></li>`; }).join('')}</ul></div></div>`;
    paint();
    const b = s.firstElementChild;
    b.scrollIntoView({ block: 'center', behavior: 'smooth' });
    b.focus({ preventScroll: true });
  }
  function focusField(n) {
    const c = el.querySelector(`[name="${n}"]:not([type="hidden"])`) || slot(n).querySelector(FOCUSABLE);
    if (c) { c.focus({ preventScroll: true }); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  el.addEventListener('click', e => { const a = e.target.closest('[data-goto]'); if (a) { e.preventDefault(); focusField(a.dataset.goto); } });
  function fail(err) {
    const s = sumEl();
    const html = `<div class="ap-banner ap-banner-critical ap-error-summary" tabindex="-1" role="alert">${icon('circle-alert')}<div class="ap-banner-body"><span class="ap-banner-title">${esc(err.title)}</span><span>${esc(err.detail)} What you entered is kept.</span></div></div>`;
    if (s) { s.innerHTML = html; paint(); s.firstElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' }); s.firstElementChild.focus({ preventScroll: true }); }
    else toast(err.detail, { tone: 'error', title: err.title });
  }
  el.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter || el.querySelector('[type="submit"]');
    if (btn && btn.getAttribute('aria-disabled') === 'true') return;
    const names = Object.keys(getRules());
    names.forEach(n => touched.add(n));
    const results = await Promise.all(names.map(check));
    const errs = names.map((n, i) => [n, results[i]]).filter(x => x[1] && slot(x[0]))
      .sort((a, b) => (slot(a[0]).compareDocumentPosition(slot(b[0])) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (errs.length) return report(errs);
    if (sumEl()) sumEl().innerHTML = '';
    if (!submit) return;
    try { await run(btn, btn.dataset.busy || 'Saving…', () => submit(values())); }
    catch (err) { if (err instanceof ApiError) fail(err); else if (err && err.field) { show(err.field, err.message); focusField(err.field); } else throw err; }
  });
  return { values, check, show, fail, touched };
}

/* Date and time picker: type the date, or choose it on a calendar. Arrow keys move by day and week,
   Page Up and Page Down by month, Home and End to the start and end of the week. */
function openCalendar(btn) {
  const wrap = btn.closest('.ap-dtp');
  const input = $('input', wrap);
  const withTime = wrap.dataset.time === '1';
  const min = wrap.dataset.min ? dayStart(+wrap.dataset.min) : null;
  const max = wrap.dataset.max ? dayStart(+wrap.dataset.max) : null;
  const parsed = parseDate(input.value, withTime);
  const base = parsed ?? Math.ceil(NOW / HOUR) * HOUR;
  let sel = parsed === null ? null : dayStart(parsed);
  let focus = dayStart(base);
  let hh = new Date(base).getUTCHours(), mm = Math.floor(new Date(base).getUTCMinutes() / 5) * 5;
  let month = new Date(focus);
  const pop = document.createElement('div');
  pop.className = 'ap-popover ap-cal-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Choose ' + wrap.dataset.label.toLowerCase());
  const allowed = ts => (min === null || ts >= min) && (max === null || ts <= max);
  function write() {
    if (sel === null) return;
    input.value = fmtDate(sel + (withTime ? hh * HOUR + mm * MIN : 0), withTime);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function draw(keepFocus) {
    const y = month.getUTCFullYear(), m = month.getUTCMonth();
    const first = Date.UTC(y, m, 1), lead = (new Date(first).getUTCDay() + 6) % 7;
    const start = first - lead * DAY;
    let rows = '';
    for (let w = 0; w < 6; w++) {
      rows += '<tr>';
      for (let d = 0; d < 7; d++) {
        const ts = start + (w * 7 + d) * DAY, dt = new Date(ts);
        rows += `<td><button class="ap-day" type="button" data-ts="${ts}" tabindex="${ts === focus ? 0 : -1}" aria-label="${longDay(ts)}"${ts === sel ? ' aria-pressed="true"' : ''}${ts === dayStart(NOW) ? ' aria-current="date"' : ''}${dt.getUTCMonth() !== m ? ' data-outside' : ''}${allowed(ts) ? '' : ' disabled'}>${dt.getUTCDate()}</button></td>`;
      }
      rows += '</tr>';
    }
    const opts = (n, step) => Array.from({ length: n / step }, (_, i) => i * step);
    pop.innerHTML = `<div class="ap-cal-head"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" data-step="-1" aria-label="Previous month">${icon('chevron-left')}</button><span class="ap-cal-title" aria-live="polite">${MONTHS[m]} ${y}</span><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" data-step="1" aria-label="Next month">${icon('chevron-right')}</button></div>
<table class="ap-cal" role="presentation"><thead><tr>${WEEKDAYS.map(w => `<th scope="col"><abbr title="${w}" style="text-decoration:none">${w.slice(0, 2)}</abbr></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
${withTime ? `<div class="ap-cal-time"><label class="ap-label" for="cal-h">Time</label><select class="ap-select" id="cal-h" aria-label="Hour">${opts(24, 1).map(h => `<option${h === hh ? ' selected' : ''}>${pad(h)}</option>`).join('')}</select>:<select class="ap-select" id="cal-m" aria-label="Minutes">${opts(60, 5).map(x => `<option${x === mm ? ' selected' : ''}>${pad(x)}</option>`).join('')}</select><span>UTC</span></div>` : ''}
<div class="ap-cal-foot"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-today>Today</button><button class="ap-btn ap-btn-sm ap-btn-primary" type="button" data-done>Done</button></div>`;
    paint();
    if (keepFocus) $(`[data-ts="${focus}"]`, pop)?.focus();
  }
  function moveTo(ts) {
    focus = ts;
    const d = new Date(ts);
    if (d.getUTCMonth() !== month.getUTCMonth() || d.getUTCFullYear() !== month.getUTCFullYear()) month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    draw(true);
  }
  const addMonths = (ts, n) => { const d = new Date(ts); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d.getUTCDate(), last)); };
  function close(refocus = true) {
    pop.remove();
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', outside, true);
    if (refocus) btn.focus();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const outside = e => { if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(false); };
  pop.addEventListener('click', e => {
    const day = e.target.closest('[data-ts]'), step = e.target.closest('[data-step]');
    if (day && !day.disabled) { sel = focus = +day.dataset.ts; write(); if (!withTime) return close(); draw(true); }
    if (step) { month = new Date(addMonths(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1), +step.dataset.step)); focus = addMonths(focus, +step.dataset.step); draw(false); }
    if (e.target.closest('[data-today]')) { sel = focus = dayStart(NOW); month = new Date(focus); write(); draw(true); }
    if (e.target.closest('[data-done]')) close();
  });
  pop.addEventListener('change', e => {
    if (e.target.id === 'cal-h') hh = +e.target.value;
    if (e.target.id === 'cal-m') mm = +e.target.value;
    if (sel === null) sel = focus;
    write();
  });
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); return close(); }
    trap(pop, e);
    if (!e.target.closest('[data-ts]')) return;
    const d = new Date(focus), wd = (d.getUTCDay() + 6) % 7;
    const to = { ArrowLeft: focus - DAY, ArrowRight: focus + DAY, ArrowUp: focus - 7 * DAY, ArrowDown: focus + 7 * DAY, Home: focus - wd * DAY, End: focus + (6 - wd) * DAY, PageUp: addMonths(focus, e.shiftKey ? -12 : -1), PageDown: addMonths(focus, e.shiftKey ? 12 : 1) }[e.key];
    if (to !== undefined) { e.preventDefault(); moveTo(to); }
  });
  draw(false);
  $('#overlays').appendChild(pop);
  const r = wrap.getBoundingClientRect();
  let top = r.bottom + 6;
  if (top + pop.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - pop.offsetHeight - 6);
  pop.style.top = top + 'px';
  pop.style.left = Math.min(Math.max(8, r.right - pop.offsetWidth), innerWidth - pop.offsetWidth - 8) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  document.addEventListener('mousedown', outside, true);
  $(`[data-ts="${focus}"]`, pop).focus();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-dtp]'); if (b) openCalendar(b); });
