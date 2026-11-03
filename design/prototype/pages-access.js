/* Users, connected agents, the audit log, your account, sign-in and first run. */
const ROLES = [
  ['Administrator', 'Everything, including users, the root key and recovery.'],
  ['Operator', 'Routes, certificates, redirects and backups. Not users.'],
  ['Viewer', 'Reads everything except secrets. Changes nothing.'],
];
const admins = () => D.users.filter(u => u.role === 'Administrator' && u.status === 'active');
const inviteLink = () => `https://apiary.internal.example.com/invite/${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

route('/users', () => ({
  title: 'Users',
  html: `${pageHead({ title: 'Users', sub: 'Everyone with access to this cluster. Give each person the least access they need.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-invite data-write>${icon('user-plus')}Invite someone</button>` })}
${D.users.some(u => u.status === 'active' && !u.twofa) ? banner('warn', `${plural(D.users.filter(u => u.status === 'active' && !u.twofa).length, 'person')} sign${D.users.filter(u => u.status === 'active' && !u.twofa).length === 1 ? 's' : ''} in without two-step sign-in`, 'A stolen password is enough to get into their account. Ask them to turn it on in Security.') : ''}
<section class="ap-panel"><div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Users</caption><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Two-step sign-in</th><th scope="col">Last signed in</th><th scope="col">Status</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.users.map(u => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="ap-avatar" aria-hidden="true" style="width:28px;height:28px;font-size:0.6875rem;background:${u.status === 'active' ? 'var(--sunken)' : 'none'};color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line)">${u.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span><div class="ap-cell-main"><span style="font-weight:500">${esc(u.name)}${u.id === D.me.id ? ' <span class="ap-tag">You</span>' : ''}</span><span class="ap-caption">${esc(u.email)}</span></div></div></td>
<td>${u.role}</td><td>${u.status === 'invited' ? '<span class="ap-muted">–</span>' : u.twofa ? status('ok', 'On') : status('warn', 'Off')}</td><td class="ap-muted">${u.last ? ago(u.last) : 'Never'}</td>
<td>${u.status === 'active' ? status('ok', 'Active') : u.status === 'invited' ? status('info', `Invited, link expires ${ago(u.invited + 3 * DAY)}`) : status('off', 'Disabled')}</td>
<td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for ${esc(u.name)}" aria-haspopup="menu" aria-expanded="false" data-umenu="${u.id}">${icon('ellipsis')}</button></td></tr>`).join('')}
</tbody></table></div></section>
<section class="ap-panel" aria-labelledby="ro-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="ro-t">Roles</h2></div><div class="ap-panel-body"><dl class="ap-kv">${ROLES.map(([r, t]) => `<dt>${r}</dt><dd>${t}</dd>`).join('')}</dl></div></section>`,
  mount(el) {
    $$('[data-invite]', el).forEach(b => b.addEventListener('click', inviteDialog));
    $$('[data-umenu]', el).forEach(b => b.addEventListener('click', () => userMenu(b, D.users.find(u => u.id === b.dataset.umenu))));
  },
}));
function userMenu(anchor, u) {
  const self = u.id === D.me.id;
  const lastAdmin = u.role === 'Administrator' && admins().length === 1;
  if (u.status === 'invited') {
    return menu(anchor, [
      { icon: 'link', label: 'Make a new invite link', write: true, run: () => showInvite(u, true) },
      '-',
      { icon: 'x', label: 'Revoke invite…', danger: true, write: true, run: () => confirmDialog({ title: `Revoke the invite for ${esc(u.email)}?`, text: 'The link stops working at once.', confirm: 'Revoke invite', busy: 'Revoking…', onConfirm: async () => { await api(); D.users.splice(D.users.indexOf(u), 1); refresh(); toast('Invite revoked.'); } }) },
    ], { label: 'Actions for ' + u.name });
  }
  menu(anchor, [
    { icon: 'user-cog', label: 'Change role…', write: true, run: () => (lastAdmin ? lastAdminAlert(u, 'change the role of') : roleDialog(u)) },
    { icon: 'smartphone', label: 'Reset two-step sign-in…', write: true, disabled: !u.twofa, why: `${u.name} hasn't turned on two-step sign-in.`, run: () => confirmDialog({ title: `Reset two-step sign-in for ${esc(u.name)}?`, tone: 'danger', mark: ['warn', 'smartphone'], text: 'Use this when they lost their phone. They sign in with their password only, once, and must set it up again right away. Check it’s really them first.', confirm: 'Reset two-step sign-in', busy: 'Resetting…', onConfirm: async () => { await api(); u.twofa = false; refresh(); toast(`${u.name} sets up two-step sign-in at their next sign-in.`); } }) },
    u.status === 'disabled'
      ? { icon: 'user-check', label: 'Enable', write: true, run: async () => { try { await api(); u.status = 'active'; refresh(); toast(`${u.name} can sign in again.`); } catch (err) { toast(err.detail, { tone: 'error', title: err.title }); } } }
      : { icon: 'user-x', label: 'Disable…', write: true, disabled: self, why: "You can't disable your own account. Ask another administrator.", run: () => (lastAdmin ? lastAdminAlert(u, 'disable') : confirmDialog({ title: `Disable ${esc(u.name)}?`, tone: 'danger', mark: ['warn', 'user-x'], text: "They're signed out everywhere and can't sign in. Agents they connected stop working. Their history stays in the audit log.", confirm: 'Disable user', busy: 'Disabling…', onConfirm: async () => { await api(); u.status = 'disabled'; refresh(); toast(`${u.name} disabled.`, { action: 'Undo', onAction: () => { u.status = 'active'; refresh(); } }); } })) },
    '-',
    { icon: 'trash-2', label: 'Delete…', danger: true, write: true, disabled: self, why: "You can't delete your own account. Ask another administrator.", run: () => (lastAdmin ? lastAdminAlert(u, 'delete') : confirmDialog({ title: `Delete ${esc(u.name)}?`, text: 'Their account and connected agents are deleted. The audit log keeps their actions, under their email address, until the events expire.', type: u.email, confirm: 'Delete user', busy: 'Deleting…', onConfirm: async () => { await api(); D.users.splice(D.users.indexOf(u), 1); refresh(); toast(`${u.name} deleted.`); } })) },
  ], { label: 'Actions for ' + u.name });
}
function lastAdminAlert(u, verb) {
  dialog({ title: `You can't ${verb} the only administrator`, mark: ['warn', 'triangle-alert'], role: 'alertdialog', describe: true, body: `<p style="margin:0">${esc(u.name)} is the only active administrator. Without one, nobody could manage users or recover the cluster. Make someone else an administrator first.</p>`, foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>OK</button>' });
}
const roleRadios = (cur, name = 'role') => `<fieldset class="ap-field" data-field="${name}" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Role</legend><div class="ap-stack" style="gap:10px">${ROLES.map(([r, t]) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="${name}" value="${r}"${cur === r ? ' checked' : ''}><span class="ap-choice-text"><span>${r}</span><span class="ap-help">${t}</span></span></label>`).join('')}</div><span class="ap-error" id="e-${name}" hidden></span></fieldset>`;
function roleDialog(u) {
  const d = dialog({ title: `Change the role of ${esc(u.name)}`, backdrop: false, body: `<form id="rl-form" class="ap-form" novalidate>${roleRadios(u.role)}</form>`, foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rl-form" data-write>Change role</button>`, initial: 'input:checked' });
  form($('#rl-form', d.el), { role: v => (v === u.role ? `${u.name} is already ${/^[AEIOU]/.test(v) ? 'an' : 'a'} ${v}. Choose another role, or cancel.` : null) }, {
    submit: async v => { await api(); u.role = v.role; d.close(); refresh(); toast(`${u.name} is now ${/^[AEIOU]/.test(v.role) ? 'an' : 'a'} ${v.role}. It applies at their next request.`); },
  });
}
function inviteDialog() {
  const d = dialog({
    title: 'Invite someone', backdrop: false,
    body: `<form id="iv-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>${field({ name: 'name', label: 'Name', attrs: 'autocomplete="off"' })}${field({ name: 'email', label: 'Email', type: 'email', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'Their sign-in name. Apiary doesn’t send email: you share the invite link.' })}${roleRadios('Viewer')}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="iv-form" data-busy="Creating…" data-write>Create invite</button>`,
  });
  form($('#iv-form', d.el), {
    name: v => V.required(v, 'their name'),
    email: v => V.email(v) || (D.users.some(u => u.email === String(v).trim().toLowerCase()) ? `${String(v).trim()} already has an account.` : null),
  }, {
    verb: 'create the invite',
    submit: async v => {
      await api();
      const u = { id: 'u' + Date.now().toString(36), name: v.name.trim(), email: v.email.trim().toLowerCase(), role: v.role, twofa: false, last: null, status: 'invited', invited: NOW };
      D.users.push(u);
      refresh();
      d.close();
      showInvite(u);
    },
  });
}
function showInvite(u, renewed) {
  dialog({
    title: renewed ? 'New invite link' : `Invite ${esc(u.name)}`, mark: ['ok', 'link'], initial: '[data-copy]',
    body: `<p style="margin:0">Send this link to ${esc(u.email)} over a channel you trust. Anyone with it can create the account, and it works once, for 72 hours.</p><div class="ap-copy"><code>${inviteLink()}</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>${renewed ? '<p class="ap-caption" style="margin:0">The previous link no longer works.</p>' : ''}`,
    foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>Done</button>',
  });
}

route('/agents', () => ({
  title: 'Connected agents',
  html: `${pageHead({ title: 'Connected agents', sub: 'AI agents that manage Apiary through MCP. Each acts with the permissions of the person who connected it.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-connect>${icon('plug')}Connect an agent</button>` })}
${banner('info', 'Agents ask before they change anything', 'Your agent shows each change and waits for you to approve it, like the confirmations in this interface. Every call is in the audit log.')}
<section class="ap-panel">${D.agents.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Connected agents</caption><thead><tr><th scope="col">Agent</th><th scope="col">On behalf of</th><th scope="col">Connected</th><th scope="col">Last used</th><th scope="col" class="ap-num">Calls, 30 days</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.agents.map(a => `<tr><td><div class="ap-cell-main"><span style="font-weight:500">${esc(a.name)}</span><span class="ap-caption">${esc(a.client)}</span></div></td><td class="ap-muted">${esc(a.user)}</td><td class="ap-data">${fmtDate(a.connected, false)}</td><td class="ap-muted">${ago(a.last)}</td><td class="ap-num">${a.calls}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm" type="button" data-revoke="${a.id}" data-write>Revoke</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No agents connected', 'Connect Claude Code or another MCP client to query and manage Apiary from your terminal.', `<button class="ap-btn ap-btn-primary" type="button" data-connect>${icon('plug')}Connect an agent</button>`)}</section>`,
  mount(el) {
    $$('[data-connect]', el).forEach(b => b.addEventListener('click', () => dialog({
      title: 'Connect an agent', size: 'lg', initial: '[data-copy]',
      body: `<ol class="ap-stack" style="gap:12px;margin:0;padding-left:20px"><li>Add this MCP server to your agent:<div class="ap-copy" style="margin-top:8px"><code>https://apiary.internal.example.com/mcp</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div></li><li>Your agent opens Apiary in a browser. Sign in as yourself, and approve the connection.</li><li>It appears here, and acts with your role: ${D.me.role}.</li></ol>
${banner('warn', 'Only on the internal network', 'Like this interface, MCP answers only on the internal port. Agents outside your network can’t connect.')}`,
      foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>Done</button>',
    })));
    $$('[data-revoke]', el).forEach(b => b.addEventListener('click', () => {
      const a = D.agents.find(x => x.id === b.dataset.revoke);
      confirmDialog({ title: `Revoke ${esc(a.name)}?`, text: `It loses access at once, including any task it's running. ${esc(a.user)} can connect it again.`, confirm: 'Revoke access', busy: 'Revoking…', onConfirm: async () => { await api(); D.agents.splice(D.agents.indexOf(a), 1); refresh(); toast(`${a.name} can no longer reach Apiary.`); } });
    }));
  },
}));

/* Audit log: filters, including a custom date and time range, checked like any form */
const auditFilter = { range: '7d', from: null, to: null, who: '', via: 'all', denied: false, q: '' };
route('/audit', () => {
  const f = auditFilter;
  return {
    title: 'Audit log',
    html: `${pageHead({ title: 'Audit log', sub: 'Who changed what, from where, and through which interface. Events are kept for 1 year.', actions: `<button class="ap-btn" type="button" data-export>${icon('download')}Export…</button>` })}
<section class="ap-panel"><div class="ap-panel-head"><h2 class="ap-h ap-h-3 ap-sr">Filters</h2></div>
<div class="ap-toolbar" style="padding-top:4px">
<div class="ap-seg" role="group" aria-label="Time range" data-range>${[['24h', 'Last 24 h'], ['7d', '7 days'], ['30d', '30 days'], ['custom', 'Custom…']].map(([v, t]) => `<button type="button" aria-pressed="${f.range === v}" data-v="${v}">${t}</button>`).join('')}</div>
${select('f-who', [['', 'Everyone'], ...D.users.map(u => [u.email, u.name]), ['System', 'System']], f.who, 'aria-label="Person" data-who')}
<div class="ap-seg" role="group" aria-label="Through" data-via>${[['all', 'All'], ['UI', 'Interface'], ['MCP', 'Agents'], ['System', 'System']].map(([v, t]) => `<button type="button" aria-pressed="${f.via === v}" data-v="${v}">${t}</button>`).join('')}</div>
<label class="ap-choice" style="font-size:0.875rem"><input class="ap-switch" type="checkbox" data-denied${f.denied ? ' checked' : ''}>Denied and failed only</label>
</div>
<form id="rg-form" class="ap-toolbar" novalidate style="align-items:flex-start"${f.range === 'custom' ? '' : ' hidden'}>
<div style="flex:1 1 240px">${dtpField({ name: 'from', label: 'From', value: f.from ?? NOW - 7 * DAY, min: NOW - 365 * DAY, max: NOW })}</div>
<div style="flex:1 1 240px">${dtpField({ name: 'to', label: 'To', value: f.to ?? NOW, min: NOW - 365 * DAY, max: NOW })}</div>
<button class="ap-btn ap-btn-primary" type="submit" style="margin-top:24px" data-busy="Applying…">Apply</button></form>
<div class="ap-panel-body" style="padding-top:0" data-events aria-live="polite"></div></section>
<p class="ap-caption" style="margin:0">The audit log includes email and IP addresses, which are personal data. They're kept for 1 year, then deleted; an administrator can change this under Settings.</p>`,
    mount(el) {
      const box = $('[data-events]', el);
      const span = () => (f.range === 'custom' ? [f.from ?? NOW - 7 * DAY, f.to ?? NOW] : [NOW - { '24h': 1, '7d': 7, '30d': 30 }[f.range] * DAY, NOW]);
      function draw() {
        const [a, b] = span();
        const list = D.audit.filter(e => e.at >= a && e.at <= b && (!f.who || e.actor === f.who) && (f.via === 'all' || e.via === f.via) && (!f.denied || e.denied));
        if (!list.length) { box.innerHTML = emptyState('No events match', `Nothing between ${fmtDate(a)} and ${fmtDate(b)} UTC with these filters.`, '<button class="ap-btn" type="button" data-reset>Clear filters</button>'); paint(); return; }
        const days = [...new Set(list.map(e => dayStart(e.at)))];
        box.innerHTML = days.map(d => `<h3 class="ap-overline" style="margin:18px 0 0">${d === dayStart(NOW) ? 'Today' : d === dayStart(NOW - DAY) ? 'Yesterday' : longDay(d)}</h3>${auditList(list.filter(e => dayStart(e.at) === d))}`).join('');
        paint();
      }
      box.addEventListener('click', e => { if (e.target.closest('[data-reset]')) { Object.assign(f, { range: '7d', from: null, to: null, who: '', via: 'all', denied: false }); refresh(); } });
      const pick = (sel, key, after) => $(sel, el).addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        $$('button', e.currentTarget).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        f[key] = b.dataset.v;
        after && after();
        draw();
      });
      pick('[data-range]', 'range', () => { const show = f.range === 'custom'; $('#rg-form', el).hidden = !show; if (show) $('#f-from', el).focus(); });
      pick('[data-via]', 'via');
      $('[data-who]', el).addEventListener('change', e => { f.who = e.target.value; draw(); });
      $('[data-denied]', el).addEventListener('change', e => { f.denied = e.target.checked; draw(); });
      form($('#rg-form', el), {
        from: v => V.date(v) || (parseDate(v) < NOW - 365 * DAY ? `The audit log keeps 1 year. Choose a start after ${fmtDate(NOW - 365 * DAY)}.` : parseDate(v) > NOW ? 'Choose a start that isn’t in the future.' : null),
        to: (v, all) => V.date(v) || (parseDate(all.from) !== null && parseDate(v) <= parseDate(all.from) ? 'Choose an end after the start.' : null),
      }, { links: { from: ['to'] }, summary: false, submit: async v => { await wait(300); f.from = parseDate(v.from); f.to = parseDate(v.to); draw(); } });
      $('[data-export]', el).addEventListener('click', () => {
        const [a, b] = span();
        const d = dialog({
          title: 'Export the audit log', backdrop: false,
          body: `<p style="margin:0">Events from <span class="ap-data">${fmtDate(a)}</span> to <span class="ap-data">${fmtDate(b)}</span> UTC, with the filters you set.</p>
<form id="ex-form" class="ap-form" novalidate><fieldset class="ap-field" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Format</legend><div class="ap-row" style="gap:20px"><label class="ap-choice"><input class="ap-radio" type="radio" name="fmt" value="csv" checked>CSV, for spreadsheets</label><label class="ap-choice"><input class="ap-radio" type="radio" name="fmt" value="json">JSON Lines, for tools</label></div></fieldset></form>
${banner('warn', 'The file contains personal data', 'Email and IP addresses. Store and share it only as your data protection rules allow, and delete it when you’re done.')}`,
          foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="ex-form" data-busy="Preparing…">Export</button>`,
        });
        form($('#ex-form', d.el), {}, { submit: async v => { await api('read', 1200); d.close(); toast(`audit-${fmtDate(a, false)}-to-${fmtDate(b, false)}.${v.fmt === 'csv' ? 'csv' : 'jsonl'} is downloading. The export is in the audit log too.`, { tone: 'info' }); } });
      });
      draw();
    },
  };
});

/* Your account */
const accountTabs = cur => `<nav class="ap-tabs" aria-label="Account">${[['/account', 'Profile'], ['/account/security', 'Security'], ['/account/sessions', 'Active sessions']].map(([p, t]) => `<a class="ap-tab" href="#${p}"${cur === p ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
route('/account', () => ({
  title: 'Your account',
  html: `${pageHead({ title: 'Your account' })}${accountTabs('/account')}
<form class="ap-panel" id="pf-form" novalidate aria-labelledby="pf-t" style="max-width:640px"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="pf-t">Profile</h2></div><div class="ap-panel-body ap-stack"><div data-summary></div>
${field({ name: 'name', label: 'Name', value: D.me.name, attrs: 'autocomplete="name"' })}
${field({ name: 'email', label: 'Email', type: 'email', value: D.me.email, attrs: 'autocomplete="email" spellcheck="false"', help: 'You sign in with it.' })}
<dl class="ap-kv"><dt>Role</dt><dd>${D.me.role}. Another administrator can change it.</dd><dt>Time zone</dt><dd>Apiary shows every time in UTC, so everyone on call reads the same times.</dd></dl></div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit">Save profile</button></div></form>`,
  mount(el) {
    form($('#pf-form', el), {
      name: v => V.required(v, 'your name'),
      email: v => V.email(v) || (D.users.some(u => u.id !== D.me.id && u.email === String(v).trim().toLowerCase()) ? 'Someone else already uses this email.' : null),
    }, { submit: async v => { await api('read'); Object.assign(D.me, { name: v.name.trim(), email: v.email.trim().toLowerCase() }); toast('Profile saved.'); } });
  },
}));

function passwordRules(pw, email) {
  const local = String(email || '').split('@')[0].toLowerCase();
  return [
    [pw.length >= 12, 'At least 12 characters'],
    [!!pw && !/^(password|apiary|123456|qwerty)/i.test(pw) && !/(.)\1{3,}/.test(pw), 'Not a common password or repeated characters'],
    [!!pw && !(local.length >= 3 && pw.toLowerCase().includes(local)), 'Doesn’t contain your email name'],
  ];
}
function passwordField(name, label, { checklist, autocomplete = 'new-password', help = '' } = {}) {
  return field({ name, label, help, control: `<div class="ap-affix"><input class="ap-input" id="f-${name}" name="${name}" type="password" autocomplete="${autocomplete}" aria-describedby="h-${name} e-${name}${checklist ? ' ck-' + name : ''}"><span class="ap-affix-text" style="padding:0 3px"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-reveal aria-pressed="false" aria-label="Show ${esc(label.toLowerCase())}" style="height:26px;padding:0 8px">Show</button></span></div>${checklist ? `<ul class="ap-checklist" id="ck-${name}" aria-label="Password rules"></ul>` : ''}` });
}
function bindPasswords(el, emailOf) {
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-reveal]');
    if (!b) return;
    const input = b.closest('.ap-affix').querySelector('input'), on = input.type === 'password';
    input.type = on ? 'text' : 'password';
    b.textContent = on ? 'Hide' : 'Show';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $$('.ap-checklist', el).forEach(list => {
    const input = $('#' + list.id.replace('ck-', 'f-'), el);
    const draw = () => { list.innerHTML = passwordRules(input.value, emailOf()).map(([ok, t]) => `<li${ok ? ' data-met' : ''}>${icon(ok ? 'circle-check' : 'circle')}${t}<span class="ap-sr">${ok ? ', done' : ', not yet'}</span></li>`).join(''); paint(); };
    input.addEventListener('input', draw);
    draw();
  });
}
const newPasswordRule = emailOf => v => { const bad = passwordRules(String(v), emailOf()).find(([ok]) => !ok); return !v ? 'Enter a new password.' : bad ? `Choose a password that meets every rule: ${bad[1].toLowerCase()}.` : null; };

route('/account/security', () => ({
  title: 'Security',
  html: `${pageHead({ crumbs: [['Your account', '#/account']], title: 'Security' })}${accountTabs('/account/security')}
<form class="ap-panel" id="pw-form" novalidate aria-labelledby="pw-t" style="max-width:640px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="pw-t">Password</h2><p class="ap-panel-desc">Changing it signs you out of your other sessions.</p></div></div><div class="ap-panel-body ap-stack"><div data-summary></div>
${passwordField('current', 'Current password', { autocomplete: 'current-password', help: 'Prototype: "wrong" is never right.' })}
${passwordField('next', 'New password', { checklist: true })}
${passwordField('again', 'New password again')}</div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-busy="Changing…">Change password</button></div></form>
<section class="ap-panel" aria-labelledby="tf-t" style="max-width:640px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="tf-t">Two-step sign-in</h2><p class="ap-panel-desc">A code from an app on your phone, asked after your password.</p></div>${status('ok', 'On')}</div><div class="ap-panel-body"><div class="ap-list">
<div class="ap-list-row"><div class="ap-list-text"><strong>Authenticator app</strong><span class="ap-muted">Set up on 2026-08-14</span></div><button class="ap-btn" type="button" data-totp>Set up again…</button></div>
<div class="ap-list-row"><div class="ap-list-text"><strong>Backup codes</strong><span class="ap-muted">8 of 10 left. Each works once, if you lose your phone.</span></div><button class="ap-btn" type="button" data-codes>Make new codes…</button></div></div></div></section>`,
  mount(el) {
    const f = $('#pw-form', el);
    bindPasswords(f, () => D.me.email);
    form(f, {
      current: v => V.required(v, 'your current password'),
      next: (v, all) => newPasswordRule(() => D.me.email)(v) || (v && v === all.current ? 'Choose a password different from the current one.' : null),
      again: (v, all) => (!v ? 'Enter the new password again.' : v !== all.next ? "The passwords don't match." : null),
    }, {
      links: { next: ['again'], current: ['next'] },
      verb: 'change your password',
      submit: async v => {
        await api('read');
        if (v.current === 'wrong') throw { field: 'current', message: "That isn't your current password." };
        f.reset();
        $$('.ap-checklist', f).forEach(l => $('#' + l.id.replace('ck-', 'f-'), f).dispatchEvent(new Event('input')));
        toast('You stay signed in here. Your 2 other sessions were signed out.', { title: 'Password changed' });
      },
    });
    $('[data-totp]', el).addEventListener('click', totpDialog);
    $('[data-codes]', el).addEventListener('click', () => confirmDialog({
      title: 'Make new backup codes?', tone: 'primary', mark: ['info', 'key-round'], text: 'Your 8 remaining codes stop working, and you get 10 new ones. Store them somewhere safe, apart from your phone.', confirm: 'Make new codes', busy: 'Making…',
      onConfirm: async d => {
        await api('read');
        setTimeout(() => dialog({ title: 'Your new backup codes', mark: ['ok', 'key-round'], initial: '[data-copy]', body: `<p style="margin:0">Each works once. You won't see them again.</p><div class="ap-copy" style="align-items:flex-start"><code style="white-space:pre;line-height:1.6">${Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6)).join('\n')}</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>`, foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>I saved them</button>' }));
      },
    }));
  },
}));
function totpDialog() {
  const qr = Array.from({ length: 21 * 21 }, (_, i) => { const x = i % 21, y = Math.floor(i / 21); const finder = (a, b) => x >= a && x < a + 7 && y >= b && y < b + 7 && (x === a || x === a + 6 || y === b || y === b + 6 || (x >= a + 2 && x <= a + 4 && y >= b + 2 && y <= b + 4)); return finder(0, 0) || finder(14, 0) || finder(0, 14) || (!(x < 8 && y < 8) && !(x > 12 && y < 8) && !(x < 8 && y > 12) && ((x * 7 + y * 13 + x * y) % 3 === 0)) ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''; }).join('');
  const d = dialog({
    title: 'Set up two-step sign-in again', backdrop: false,
    body: `<p style="margin:0">Scan the code with your authenticator app, then enter the 6-digit code it shows. Your current setup keeps working until you finish.</p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><svg viewBox="-2 -2 25 25" width="132" height="132" role="img" aria-label="QR code for your authenticator app" style="background:#fff;border-radius:10px;fill:#000;flex:none">${qr}</svg>
<div class="ap-stack" style="gap:6px;flex:1;min-width:180px"><span class="ap-caption">Can't scan it? Enter this key:</span><div class="ap-copy"><code>JBSW Y3DP EHPK 3PXP</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div></div></div>
<form id="tt-form" class="ap-form" novalidate>${field({ name: 'code', label: 'Code from the app', data: true, attrs: 'inputmode="numeric" autocomplete="one-time-code" maxlength="7"', help: 'Prototype: 000000 is always wrong.' })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="tt-form" data-busy="Checking…">Turn on</button>`,
    initial: '#f-code',
  });
  $('#f-code', d.el).classList.add('ap-otp');
  form($('#tt-form', d.el), { code: v => (!/^\d{6}$/.test(String(v).replace(/\s/g, '')) ? 'Enter the 6 digits the app shows.' : null) }, {
    submit: async v => {
      await api('read');
      if (v.code.replace(/\s/g, '') === '000000') throw { field: 'code', message: "That code didn't work. Check that your phone's clock is right, then try the newest code." };
      d.close();
      toast('Use the new entry in your app from now on; delete the old one.', { title: 'Two-step sign-in set up' });
    },
  });
}

route('/account/sessions', () => ({
  title: 'Active sessions',
  html: `${pageHead({ crumbs: [['Your account', '#/account']], title: 'Active sessions' })}${accountTabs('/account/sessions')}
<section class="ap-panel" aria-labelledby="se-t" style="max-width:760px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="se-t">Where you're signed in</h2><p class="ap-panel-desc">If you don't recognize one, sign it out and change your password.</p></div>${D.sessions.length > 1 ? '<button class="ap-btn ap-btn-sm" type="button" data-all>Sign out of all others…</button>' : ''}</div><div class="ap-panel-body"><div class="ap-list">
${D.sessions.map(s => `<div class="ap-list-row"><div style="display:flex;gap:12px;align-items:flex-start;flex:1 1 300px"><span class="ap-project-mark">${icon(/iPhone/.test(s.device) ? 'smartphone' : 'monitor')}</span><div class="ap-list-text"><strong>${esc(s.device)}${s.current ? ' <span class="ap-tag ap-tag-honey">This browser</span>' : ''}</strong><span class="ap-muted"><span class="ap-data">${s.ip}</span> · signed in ${fmtDate(s.started)} UTC · active ${ago(s.last)}</span></div></div>${s.current ? '' : `<button class="ap-btn ap-btn-sm" type="button" data-out="${s.id}">Sign out</button>`}</div>`).join('')}
</div></div></section>`,
  mount(el) {
    $$('[data-out]', el).forEach(b => b.addEventListener('click', () => quick(b, 'Signing out…', () => api('read'), () => { const s = D.sessions.find(x => x.id === b.dataset.out); D.sessions.splice(D.sessions.indexOf(s), 1); refresh(); toast(`${s.device} is signed out.`); })));
    const all = $('[data-all]', el);
    if (all) all.addEventListener('click', () => confirmDialog({ title: 'Sign out of all other sessions?', tone: 'primary', mark: ['info', 'log-out'], text: `${plural(D.sessions.length - 1, 'other session')} end at once. You stay signed in here.`, confirm: 'Sign out others', busy: 'Signing out…', onConfirm: async () => { await api('read'); D.sessions = D.sessions.filter(s => s.current); refresh(); toast('Only this browser is signed in now.'); } }));
  },
}));

/* Sign-in and first run: outside the shell, with the attribution */
const authFoot = () => `<div class="ap-attribution"><span style="color:var(--ink-2)">${$('.ap-side-foot .ap-attribution a').innerHTML}</span><span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span></div>`;
route('/sign-in', () => ({
  title: 'Sign in',
  html: `<main class="ap-auth" id="main-bare"><div class="ap-panel ap-auth-card"><div class="ap-auth-brand"><span class="ap-brand-mark" aria-hidden="true"></span><div><h1 class="ap-h ap-h-2">Sign in to Apiary</h1><p class="ap-muted" style="margin:4px 0 0;font-size:0.875rem">${esc(D.cluster.name)}</p></div></div>
<div data-step><form id="si-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'email', label: 'Email', type: 'email', value: D.me.email, attrs: 'autocomplete="username" spellcheck="false" autocapitalize="none"' })}
${passwordField('password', 'Password', { autocomplete: 'current-password' })}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Signing in…">Sign in</button>
<p class="ap-caption" style="margin:0;text-align:center">Prototype: any password works except "wrong".</p></form></div></div>${authFoot()}</main>`,
  mount(el) {
    const f = $('#si-form', el);
    bindPasswords(f, () => '');
    $('#f-password', f).focus();
    form(f, { email: V.email, password: v => V.required(v, 'your password') }, {
      summary: false,
      submit: async v => {
        await api('read');
        if (v.password === 'wrong') {
          f.elements.password.value = '';
          throw new ApiError("The email or password isn't right", 'Check both and try again. After 5 tries, sign-in pauses for 15 minutes.');
        }
        codeStep(el);
      },
    });
  },
}), { bare: true });
function codeStep(el) {
  const box = $('[data-step]', el);
  box.innerHTML = `<form id="cd-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div><p class="ap-muted" style="margin:0;text-align:center;font-size:0.875rem">Enter the code from your authenticator app.</p>
${field({ name: 'code', label: 'Code', data: true, attrs: 'inputmode="numeric" autocomplete="one-time-code" maxlength="7"' })}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Checking…">Continue</button>
<div class="ap-row" style="justify-content:space-between"><a href="#/sign-in" class="ap-caption" style="color:var(--honey-text)">Back</a><button class="ap-link ap-caption" type="button" data-backup style="color:var(--honey-text)">Use a backup code</button></div></form>`;
  paint();
  const input = $('#f-code', box);
  input.classList.add('ap-otp');
  input.focus();
  let backup = false;
  $('[data-backup]', box).addEventListener('click', e => { backup = !backup; e.target.textContent = backup ? 'Use the app instead' : 'Use a backup code'; $('label[for="f-code"]', box).textContent = backup ? 'Backup code' : 'Code'; input.classList.toggle('ap-otp', !backup); input.removeAttribute('maxlength'); input.placeholder = backup ? 'xxxx-xxxx' : ''; input.focus(); });
  form($('#cd-form', box), { code: v => (backup ? (!/^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(String(v).trim()) ? 'Enter a backup code like k3f9-2mxa.' : null) : !/^\d{6}$/.test(String(v).replace(/\s/g, '')) ? 'Enter the 6 digits from the app.' : null) }, {
    summary: false,
    submit: async v => {
      await api('read');
      if (v.code.replace(/\s/g, '') === '000000') throw new ApiError("That code didn't work", "Check that your phone's clock is right, then try the newest code.");
      go('/');
      toast(`Welcome back, ${D.me.name.split(' ')[0]}.`);
    },
  });
}
route('/setup', () => ({
  title: 'Create the first administrator',
  html: `<main class="ap-auth"><div class="ap-panel ap-auth-card" style="width:min(460px,100%)"><div class="ap-auth-brand"><span class="ap-brand-mark" aria-hidden="true"></span><div><h1 class="ap-h ap-h-2">Welcome to Apiary</h1><p class="ap-muted" style="margin:4px 0 0;font-size:0.875rem">Create the first administrator for ${esc(D.cluster.name)}.</p></div></div>
${banner('info', '', 'This page works only until the first account exists, and only from the internal network. Finish it now.')}
<form id="su-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Your name', attrs: 'autocomplete="name"' })}
${field({ name: 'email', label: 'Email', type: 'email', attrs: 'autocomplete="username" spellcheck="false" autocapitalize="none"' })}
${passwordField('password', 'Password', { checklist: true })}
${passwordField('again', 'Password again')}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Creating…">Create administrator</button></form></div>${authFoot()}</main>`,
  mount(el) {
    const f = $('#su-form', el);
    bindPasswords(f, () => f.elements.email.value);
    $('#f-name', f).focus();
    form(f, {
      name: v => V.required(v, 'your name'),
      email: V.email,
      password: newPasswordRule(() => f.elements.email.value),
      again: (v, all) => (!v ? 'Enter the password again.' : v !== all.password ? "The passwords don't match." : null),
    }, {
      verb: 'create the administrator',
      links: { password: ['again'], email: ['password'] },
      submit: async () => { await api('read', 900); go('/'); toast('Next, set up two-step sign-in in Security.', { title: 'You’re the first administrator' }); },
    });
  },
}), { bare: true });
