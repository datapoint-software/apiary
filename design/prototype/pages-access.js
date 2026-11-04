/* Users, single sign-on, connected agents, the audit log, your account, sign-in, invites and first run. */
const ROLES = [
  ['Administrator', 'Everything, including users, the root key and recovery.'],
  ['Operator', 'Routes, certificates, redirects and backups. Not users.'],
  ['Viewer', 'Reads everything except secrets. Changes nothing.'],
];
const admins = () => D.users.filter(u => u.role === 'Administrator' && u.status === 'active');
const inviteLink = () => `https://apiary.internal.example.com/invite/${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
const APIARY_URL = 'https://apiary.internal.example.com';
const CODE_INVALID = "That code didn't work. Check that your phone's clock is right, then try the newest code.";

/* Data only these pages use, added the first time one of them opens */
function access() {
  if (D.sso) return D;
  const sample = Proto.state.data !== 'empty';
  D.sso = sample
    ? { enabled: true, displayName: 'Keycloak', issuer: 'https://login.example.com/realms/staff', clientId: 'apiary', hasSecret: true, groupsClaim: 'groups', administrators: ['apiary-admins'], operators: ['platform-team', 'sre'], viewers: ['developers'], changed: at(9, '11:30') }
    : { enabled: false, displayName: '', issuer: '', clientId: '', hasSecret: false, groupsClaim: 'groups', administrators: [], operators: [], viewers: [], changed: null };
  D.sessionPolicy = { idle: 15 };
  D.trustedSites = sample ? ['https://agents.example.com'] : [];
  D.me.codesLeft = 8;
  const marta = D.users.find(u => u.id === 'u3');
  if (marta) Object.assign(marta, { sso: true, twofa: false });
  [['se2', at(0, '09:15')], ['se3', at(0, '06:30')]].forEach(([id, t]) => { const s = D.sessions.find(x => x.id === id); if (s) s.started = t; });
  return D;
}

const copyText = (text, multiline) => `<div class="ap-copy"${multiline ? ' style="align-items:flex-start"' : ''}><code${multiline ? ' style="white-space:pre;line-height:1.6"' : ''}>${esc(text)}</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>`;
function qrCode() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => { const x = i % 21, y = Math.floor(i / 21); const finder = (a, b) => x >= a && x < a + 7 && y >= b && y < b + 7 && (x === a || x === a + 6 || y === b || y === b + 6 || (x >= a + 2 && x <= a + 4 && y >= b + 2 && y <= b + 4)); return finder(0, 0) || finder(14, 0) || finder(0, 14) || (!(x < 8 && y < 8) && !(x > 12 && y < 8) && !(x < 8 && y > 12) && ((x * 7 + y * 13 + x * y) % 3 === 0)) ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''; }).join('');
  return `<svg viewBox="-2 -2 25 25" width="148" height="148" role="img" aria-label="QR code for your authenticator app" style="background:#fff;border-radius:10px;fill:#000;flex:none">${cells}</svg>`;
}
const twoStepSetup = () => `<div class="ap-stack" style="gap:16px"><p style="margin:0">Scan the code with your authenticator app, then enter the 6-digit code it shows.</p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">${qrCode()}<div class="ap-stack" style="gap:6px;flex:1;min-width:180px"><span class="ap-caption">Can’t scan it? Enter this key:</span>${copyText('JBSW Y3DP EHPK 3PXP\nDEMO DEMO DEMO DEMO', true)}</div></div></div>`;
const codeField = (help = 'Prototype: 000000 is always wrong.') => field({ name: 'code', label: 'Code from the app', help, control: `<input class="ap-input ap-otp" id="f-code" name="code" inputmode="numeric" autocomplete="one-time-code" aria-describedby="h-code e-code">` });
const codeRule = v => (!/^\d{6}$/.test(String(v).replace(/\s/g, '')) ? 'Enter the 6 digits the app shows.' : null);
const checkCode = v => { if (String(v).replace(/\s/g, '') === '000000') throw { field: 'code', message: CODE_INVALID }; };
const sampleCodes = () => Array.from({ length: 10 }, (_, i) => `demo-code-fake-${String(i + 1).padStart(4, '0')}`);
const recoveryCodes = () => `<div class="ap-stack" style="gap:16px"><p style="margin:0">If you lose your phone, each of these codes signs you in once. Store them somewhere safe, apart from your phone. You won’t see them again.</p>${copyText(sampleCodes().join('\n'), true)}<button class="ap-btn ap-btn-primary ap-btn-lg" type="button" data-codes-done>I saved them</button></div>`;
function showCodes(box, done) {
  box.innerHTML = recoveryCodes();
  paint();
  const b = $('[data-codes-done]', box);
  b.addEventListener('click', done);
  b.focus();
}

route('/users', () => {
  access();
  const unset = D.users.filter(u => u.status === 'active' && !u.twofa && !u.sso).length;
  const twoStep = u => (u.status === 'invited' ? '<span class="ap-muted">–</span>' : u.sso ? '<span class="ap-muted">At the identity provider</span>' : u.twofa ? status('ok', 'On') : status('warn', 'Not set up'));
  return {
    title: 'Users',
    html: `${pageHead({ title: 'Users', sub: 'Everyone with access to this cluster. Give each person the least access they need.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-invite data-write>${icon('user-plus')}Invite someone</button>` })}
${unset ? banner('warn', unset === 1 ? '1 person must set up two-step sign-in' : `${unset} people must set up two-step sign-in`, 'Their two-step sign-in was reset. They set it up again at their next sign-in.') : ''}
<section class="ap-panel"><div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Users</caption><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Two-step sign-in</th><th scope="col">Last signed in</th><th scope="col">Status</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.users.map(u => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="ap-avatar" aria-hidden="true" style="width:28px;height:28px;font-size:0.6875rem;background:${u.status === 'active' ? 'var(--sunken)' : 'none'};color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line)">${u.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span><div class="ap-cell-main"><span style="font-weight:500">${esc(u.name)}${u.id === D.me.id ? ' <span class="ap-tag">You</span>' : ''}${u.sso ? ' <span class="ap-tag">Single sign-on</span>' : ''}</span><span class="ap-caption">${esc(u.email)}</span></div></div></td>
<td>${u.role}</td><td>${twoStep(u)}</td><td class="ap-muted">${u.last ? ago(u.last) : 'Never'}</td>
<td>${u.status === 'active' ? status('ok', 'Active') : u.status === 'invited' ? status('info', `Invited, link expires ${ago(u.invited + 3 * DAY)}`) : status('off', 'Disabled')}</td>
<td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for ${esc(u.name)}" aria-haspopup="menu" aria-expanded="false" data-umenu="${u.id}">${icon('ellipsis')}</button></td></tr>`).join('')}
</tbody></table></div></section>
<section class="ap-panel" aria-labelledby="ro-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="ro-t">Roles</h2></div><div class="ap-panel-body"><dl class="ap-kv">${ROLES.map(([r, t]) => `<dt>${r}</dt><dd>${t}</dd>`).join('')}</dl></div></section>
<form class="ap-panel" id="sp-form" novalidate aria-labelledby="sp-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="sp-t">Signing out</h2><p class="ap-panel-desc">People are signed out after this long without using Apiary, and after 12 hours in any case. Pages left open don’t count as use. Connected agents aren’t affected.</p></div></div>
<div class="ap-panel-body ap-stack"><div data-summary></div><div style="max-width:300px">${field({ name: 'idle', label: 'Sign out after', type: 'number', value: D.sessionPolicy.idle, data: true, after: 'minutes', attrs: 'inputmode="numeric"', help: 'From 5 to 720 minutes without activity.' })}</div></div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-busy="Saving…" data-write>Save</button></div></form>`,
    mount(el) {
      $$('[data-invite]', el).forEach(b => b.addEventListener('click', inviteDialog));
      $$('[data-umenu]', el).forEach(b => b.addEventListener('click', () => userMenu(b, D.users.find(u => u.id === b.dataset.umenu))));
      form($('#sp-form', el), { idle: v => { const s = String(v).trim(); return /^\d+$/.test(s) && +s >= 5 && +s <= 720 ? null : 'Enter a number from 5 to 720.'; } }, {
        verb: 'save it',
        submit: async v => { await api(); D.sessionPolicy.idle = +v.idle; toast(`People are signed out after ${+v.idle} minutes without activity.`, { title: 'Saved' }); },
      });
    },
  };
});
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
    { icon: 'user-cog', label: 'Change role…', write: true, disabled: u.sso, why: `${u.name}’s role comes from their groups at the identity provider.`, run: () => (lastAdmin ? lastAdminAlert(u, 'change the role of') : roleDialog(u)) },
    { icon: 'smartphone', label: 'Reset two-step sign-in…', write: true, disabled: !u.twofa, why: u.sso ? `${u.name} sets up two-step sign-in at the identity provider.` : `${u.name} hasn't set up two-step sign-in yet.`, run: () => confirmDialog({ title: `Reset two-step sign-in for ${esc(u.name)}?`, tone: 'danger', mark: ['warn', 'smartphone'], text: 'Use this when they lost their phone. They’re signed out everywhere, their agents are disconnected, and they set it up again at their next sign-in. Check it’s really them first.', confirm: 'Reset two-step sign-in', busy: 'Resetting…', onConfirm: async () => { await api(); u.twofa = false; D.agents = D.agents.filter(a => a.user !== u.email); refresh(); toast(`${u.name} sets up two-step sign-in at their next sign-in.`); } }) },
    u.status === 'disabled'
      ? { icon: 'user-check', label: 'Enable', write: true, run: async () => { try { await api(); u.status = 'active'; refresh(); toast(`${u.name} can sign in again.`); } catch (err) { toast(err.detail, { tone: 'error', title: err.title }); } } }
      : { icon: 'user-x', label: 'Disable…', write: true, disabled: self, why: "You can't disable your own account. Ask another administrator.", run: () => (lastAdmin ? lastAdminAlert(u, 'disable') : confirmDialog({ title: `Disable ${esc(u.name)}?`, tone: 'danger', mark: ['warn', 'user-x'], text: 'They’re signed out everywhere and can’t sign in. Their history stays in the audit log.', confirm: 'Disable user', busy: 'Disabling…', onConfirm: async () => { await api(); u.status = 'disabled'; refresh(); toast(`${u.name} disabled.`); } })) },
    '-',
    { icon: 'trash-2', label: 'Delete…', danger: true, write: true, disabled: self, why: "You can't delete your own account. Ask another administrator.", run: () => (lastAdmin ? lastAdminAlert(u, 'delete') : confirmDialog({ title: `Delete ${esc(u.name)}?`, text: 'Their account is deleted and they’re signed out everywhere. The audit log keeps their actions, under their email address, until the entries expire.', type: u.email, confirm: 'Delete user', busy: 'Deleting…', onConfirm: async () => { await api(); D.users.splice(D.users.indexOf(u), 1); refresh(); toast(`${u.name} deleted.`); } })) },
  ], { label: 'Actions for ' + u.name });
}
function lastAdminAlert(u, verb) {
  dialog({ title: `You can't ${verb} the only administrator`, mark: ['warn', 'triangle-alert'], role: 'alertdialog', describe: true, body: `<p style="margin:0">${esc(u.name)} is the only active administrator. Without one, nobody could manage users or recover the cluster. Make someone else an administrator first.</p>`, foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>OK</button>' });
}
const roleRadios = (cur, name = 'role') => `<fieldset class="ap-field" data-field="${name}" style="border:0;margin:0;padding:0"><legend class="ap-label" style="margin-bottom:8px">Role</legend><div class="ap-stack" style="gap:10px">${ROLES.map(([r, t]) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="${name}" value="${r}"${cur === r ? ' checked' : ''}><span class="ap-choice-text"><span>${r}</span><span class="ap-help">${t}</span></span></label>`).join('')}</div><span class="ap-error" id="e-${name}" hidden></span></fieldset>`;
function roleDialog(u) {
  const d = dialog({ title: `Change the role of ${esc(u.name)}`, backdrop: false, body: `<form id="rl-form" class="ap-form" novalidate>${roleRadios(u.role)}</form>`, foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="rl-form" data-write>Change role</button>`, initial: 'input:checked' });
  form($('#rl-form', d.el), { role: v => (v === u.role ? 'They already have this role. Choose another role, or cancel.' : null) }, {
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
    email: v => V.email(v) || (D.users.some(u => u.email === String(v).trim().toLowerCase()) ? 'Someone already uses this email.' : null),
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
  const link = inviteLink();
  dialog({
    title: renewed ? 'New invite link' : `Invite ${esc(u.name)}`, mark: ['ok', 'link'], initial: '[data-copy]',
    body: `<p style="margin:0">Send this link to ${esc(u.email)} over a channel you trust. Anyone with it can create the account, and it works once, for 72 hours.</p>${copyText(link)}${renewed ? '<p class="ap-caption" style="margin:0">The previous link no longer works.</p>' : ''}<p class="ap-caption" style="margin:0">Prototype: <a href="#/invite/${link.split('/').pop()}" data-close>open the link</a> to see what ${esc(u.name)} sees.</p>`,
    foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>Done</button>',
  });
}

/* Single sign-on, with OpenID Connect */
route('/single-sign-on', () => {
  const s = access().sso;
  const groupsField = (name, label, value) => field({ name, label, optional: true, control: textarea(name, value.join('\n'), 'rows="2" spellcheck="false"') });
  return {
    title: 'Single sign-on',
    html: `${pageHead({ title: 'Single sign-on', sub: `Let people sign in through your identity provider, with OpenID Connect. ${s.changed ? 'Changed ' + ago(s.changed) : 'Not set up yet'}` })}
<form id="sso-form" class="ap-form" novalidate style="max-width:800px"><div data-summary></div>
<section class="ap-panel" aria-labelledby="sso-p"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="sso-p">Identity provider</h2><p class="ap-panel-desc">Register Apiary at your provider as a confidential web client first, with this redirect URI.</p></div></div><div class="ap-panel-body ap-stack">
<div class="ap-field"><span class="ap-label">Redirect URI</span>${copyText(APIARY_URL + '/auth/sso/callback')}<span class="ap-help">Use the address people open Apiary at. Each address needs its own redirect URI at the provider.</span></div>
<div class="ap-grid-2">${field({ name: 'displayName', label: 'Name on the sign-in button', value: s.displayName, help: 'Such as Entra ID or Keycloak.', attrs: 'autocomplete="off"' })}${field({ name: 'groupsClaim', label: 'Groups claim', value: s.groupsClaim, data: true, help: 'The ID token claim that lists groups.', attrs: 'autocomplete="off" spellcheck="false"' })}</div>
${field({ name: 'issuer', label: 'Issuer', value: s.issuer, data: true, placeholder: 'https://login.example.com/realms/staff', help: 'Apiary reads its configuration from /.well-known/openid-configuration under this address.', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}
<div class="ap-grid-2">${field({ name: 'clientId', label: 'Client id', value: s.clientId, data: true, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}${field({ name: 'clientSecret', label: 'Client secret', type: 'password', data: true, optional: s.hasSecret, help: s.hasSecret ? 'Saved. Leave it empty to keep it.' : 'Stored encrypted, and never shown again.', attrs: 'autocomplete="new-password"' })}</div>
</div></section>
<section class="ap-panel" aria-labelledby="sso-g"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="sso-g">Roles from groups</h2><p class="ap-panel-desc">One group per line, as the provider names it. Someone in several groups gets the highest role; someone in none can’t sign in.</p></div></div><div class="ap-panel-body ap-stack">
${groupsField('administrators', 'Administrators', s.administrators)}${groupsField('operators', 'Operators', s.operators)}${groupsField('viewers', 'Viewers', s.viewers)}
${banner('info', 'Keep a password account', 'Keep at least one Administrator who signs in with a password, for when the provider is down or misconfigured. Apiary never links a single sign-on identity to an existing password account.')}
</div></section>
<section class="ap-panel" aria-labelledby="sso-e"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="sso-e">Sign-in page</h2></div></div><div class="ap-panel-body"><label class="ap-choice"><input class="ap-switch" type="checkbox" name="enabled"${s.enabled ? ' checked' : ''}><span class="ap-choice-text"><span>Offer single sign-on</span><span class="ap-help">Turning it off, or changing the issuer, signs out everyone who signed in through it.</span></span></label></div></section>
<div class="ap-savebar"><button class="ap-btn ap-btn-primary" type="submit" data-busy="Saving…" data-write>Save single sign-on</button></div></form>`,
    mount(el) {
      const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
      form($('#sso-form', el), {
        displayName: v => V.required(v, 'the name on the sign-in button'),
        groupsClaim: v => V.required(v, 'the groups claim'),
        issuer: v => { const t = String(v || '').trim(); if (!t) return 'Enter the issuer.'; try { if (new URL(t).protocol === 'https:') return null; } catch (e) { /* not a URL */ } return 'Enter the provider’s issuer as an HTTPS address, such as https://login.example.com/realms/staff.'; },
        clientId: v => V.required(v, 'the client id'),
        clientSecret: v => (s.hasSecret ? null : V.required(v, 'the client secret')),
        administrators: (v, all) => (!lines(v).length && !lines(all.operators).length && !lines(all.viewers).length ? 'Map at least one group to a role, or nobody could sign in.' : null),
      }, {
        verb: 'save single sign-on',
        links: { operators: ['administrators'], viewers: ['administrators'] },
        submit: async v => {
          await api();
          Object.assign(s, { enabled: v.enabled, displayName: v.displayName.trim(), issuer: v.issuer.trim(), clientId: v.clientId.trim(), groupsClaim: v.groupsClaim.trim(), administrators: lines(v.administrators), operators: lines(v.operators), viewers: lines(v.viewers), hasSecret: s.hasSecret || !!v.clientSecret, changed: NOW });
          refresh();
          toast(s.enabled ? 'Single sign-on saved. The sign-in page offers it now.' : 'Single sign-on saved. It’s off.');
        },
      });
    },
  };
});

/* Connected agents */
const agentEnds = a => a.ends ?? a.connected + 90 * DAY;
const isOrigin = v => { try { const u = new URL(v); return u.protocol === 'https:' && u.pathname === '/' && !u.search && !u.hash && !u.username; } catch (e) { return false; } };
route('/agents', () => {
  access();
  const admin = D.me.role === 'Administrator';
  const list = admin ? D.agents : D.agents.filter(a => a.user === D.me.email);
  const mcp = APIARY_URL + '/mcp';
  return {
    title: 'Connected agents',
    html: `${pageHead({ title: 'Connected agents', sub: 'AI agents that manage Apiary through MCP. Each acts with the permissions of the person who connected it.' })}
${banner('info', 'Agents ask before they change anything', 'Apiary tells agents to show each change and wait for your approval. Every change they make is in the audit log, under your name and the agent’s.')}
<section class="ap-panel" aria-labelledby="ag-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="ag-t">${admin ? 'Everyone’s agents' : 'Your agents'}</h2></div></div>${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Connected agents</caption><thead><tr><th scope="col">Agent</th><th scope="col">On behalf of</th><th scope="col">Connected</th><th scope="col">Last active</th><th scope="col">Connected until</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map(a => `<tr><td><span style="font-weight:500">${esc(a.name)}</span></td><td class="ap-muted">${a.user === D.me.email ? 'You' : esc(a.user)}</td><td class="ap-data">${fmtDate(a.connected)} UTC</td><td class="ap-muted">${ago(a.last)}</td><td class="ap-data">${fmtDate(agentEnds(a))} UTC</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm" type="button" data-disconnect="${a.id}" data-write>Disconnect…</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No agents connected', 'Connect Claude Code or another MCP client to query and manage Apiary from your terminal.')}</section>
<section class="ap-panel" style="max-width:760px" aria-labelledby="cn-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="cn-t">Connect an agent</h2><p class="ap-panel-desc">Like this interface, MCP answers only on the internal port.</p></div></div><div class="ap-panel-body ap-stack">
<ol class="ap-stack" style="gap:12px;margin:0;padding-left:20px"><li class="ap-stack" style="gap:8px"><span>Add this MCP server to your agent. In Claude Code, run:</span>${copyText(`claude mcp add --transport http apiary ${mcp}`)}<span class="ap-muted">Other agents need the address: <span class="ap-data">${mcp}</span></span></li><li>Your agent opens Apiary in your browser. Sign in as yourself, and approve the connection.</li><li>It appears here, and acts with your role: ${D.me.role}. After 90 days, connect it again.</li></ol>
<p class="ap-caption" style="margin:0">Prototype: see what your browser shows when an agent connects from <a href="#/connect">this computer</a>, from <a href="#/connect/web">a website</a>, or with <a href="#/connect/invalid">a request that isn’t valid</a>.</p></div></section>
${admin ? `<form class="ap-panel" id="ts-form" novalidate style="max-width:760px" aria-labelledby="ts-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="ts-t">Web-based agents</h2><p class="ap-panel-desc">Agents like Claude Code run on your own computer, and always can. An agent that runs on a website can only connect if its site is listed here, so nobody can send you a link that hands your access to a site of their own.</p></div></div>
<div class="ap-panel-body ap-stack"><div data-summary></div>${field({ name: 'sites', label: 'Trusted sites', optional: true, help: 'One HTTPS address per line, without a path, such as https://agents.example.com. At most 20. Removing a site disconnects the agents that run there.', control: textarea('sites', D.trustedSites.join('\n'), 'rows="3" placeholder="https://agents.example.com" spellcheck="false"') })}</div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-busy="Saving…" data-write>Save</button></div></form>` : ''}`,
    mount(el) {
      $$('[data-disconnect]', el).forEach(b => b.addEventListener('click', () => {
        const a = D.agents.find(x => x.id === b.dataset.disconnect);
        confirmDialog({ title: `Disconnect ${esc(a.name)}?`, text: `It loses access at once, including any task it’s running. ${a.user === D.me.email ? 'You' : esc(a.user)} can connect it again.`, confirm: 'Disconnect', busy: 'Disconnecting…', onConfirm: async () => { await api(); D.agents.splice(D.agents.indexOf(a), 1); refresh(); toast(`${a.name} can no longer reach Apiary.`); } });
      }));
      const ts = $('#ts-form', el);
      if (!ts) return;
      const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
      form(ts, { sites: v => (lines(v).length > 20 ? 'List 20 sites at most.' : !lines(v).every(isOrigin) ? 'Enter HTTPS addresses without a path, one per line, such as https://agents.example.com.' : null) }, {
        verb: 'save them',
        submit: async v => {
          await api();
          D.trustedSites = lines(v.sites).map(x => new URL(x).origin);
          D.agents = D.agents.filter(a => !a.site || D.trustedSites.includes(a.site));
          refresh();
          toast(D.trustedSites.length ? 'Agents can connect from the sites listed, and from people’s own computers.' : 'Agents can only connect from people’s own computers.', { title: 'Saved' });
        },
      });
    },
  };
});

/* What the browser shows when an agent asks to connect: outside the shell, like sign-in */
function connectPage(kind) {
  access();
  const web = kind === 'web';
  const client = web ? { name: 'Team assistant', returnsTo: 'agents.example.com', site: 'https://agents.example.com' } : { name: 'Claude Code', returnsTo: '127.0.0.1:33418' };
  const problem = kind === 'invalid' ? 'The agent’s request is missing its security check (PKCE with S256). Update the agent, or use another one.'
    : web && !D.trustedSites.includes(client.site) ? 'This agent runs on a site Apiary doesn’t trust. An Administrator can add the site on the Connected agents page.' : null;
  if (problem) return { title: 'Connect an agent', html: authPage('This agent can’t connect', banner('critical', 'The request isn’t valid', problem), { wide: true }) };
  return {
    title: 'Connect an agent',
    html: authPage(`Connect ${esc(client.name)}?`, `<div class="ap-stack" style="gap:16px"><ul class="ap-stack" style="gap:8px;margin:0;padding-left:20px;font-size:0.875rem"><li>It acts as <strong>${esc(D.me.email)}</strong>, with your role: ${D.me.role}.</li><li>It can view and change everything you can, except handling private keys and backups.</li><li>Everything it changes is in the audit log. You can disconnect it at any time from Connected agents.</li></ul>
<p class="ap-muted" style="margin:0;font-size:0.875rem">After you approve, your browser returns to <span class="ap-data">${client.returnsTo}</span>.</p>
${web ? banner('warn', 'It returns to a website', `This agent runs on <span class="ap-data">${client.returnsTo}</span>, a site your Administrators trust, not on this computer. Connect it only if you started connecting it yourself.`) : ''}<div data-fail></div>
<div class="ap-row" style="justify-content:flex-end;gap:8px"><button class="ap-btn ap-btn-ghost" type="button" data-deny>Don’t allow</button><button class="ap-btn ap-btn-primary" type="button" data-approve>Connect</button></div></div>`, { sub: 'An AI agent asks to manage Apiary for you.', wide: true }),
    mount(el) {
      const approve = $('[data-approve]', el), deny = $('[data-deny]', el);
      approve.focus();
      deny.addEventListener('click', () => { go('/agents'); toast(`${client.name} wasn’t connected. Your browser went back to it.`, { tone: 'info' }); });
      approve.addEventListener('click', async () => {
        $('[data-fail]', el).innerHTML = '';
        deny.disabled = true;
        try {
          await run(approve, 'Connecting…', () => api());
          D.agents.unshift({ id: 'g' + Date.now().toString(36), name: client.name, client: client.name, user: D.me.email, connected: NOW, last: NOW, calls: 0, site: client.site });
          go('/agents');
          toast(`${client.name} is connected. Your browser went back to it.`);
        } catch (err) {
          deny.disabled = false;
          $('[data-fail]', el).innerHTML = banner('critical', 'Couldn’t connect it', esc(err.detail));
          paint();
        }
      });
    },
  };
}
route('/connect', () => connectPage('local'), { bare: true });
route('/connect/:kind', kind => connectPage(kind), { bare: true });

/* Audit log: filters, including a custom date and time range, checked like any form */
const auditFilter = { range: '7d', from: null, to: null, who: '', via: 'all', failed: false, q: '' };
const outcomeOf = e => e.outcome || (e.denied ? (e.actor === 'System' ? 'failed' : 'denied') : 'succeeded');
const auditEvents = list => `<div>${list.map(e => { const o = outcomeOf(e); return `<div class="ap-event${o !== 'succeeded' ? ' ap-event-denied' : ''}${e.agent ? ' ap-event-agent' : ''}"><span class="ap-dot" aria-hidden="true"></span><div><div>${e.agent ? `Agent “${esc(e.agent)}” for ` : ''}<strong>${esc(e.actor)}</strong> ${e.text.replace(/<code>/g, '<span class="ap-data">').replace(/<\/code>/g, '</span>')}${o === 'denied' ? ' <span class="ap-tag">Denied</span>' : o === 'failed' ? ' <span class="ap-tag">Failed</span>' : ''}</div><div class="ap-event-meta">${esc(e.meta)}${e.agent ? ' · through MCP' : ''}</div></div><time datetime="${new Date(e.at).toISOString()}">${fmtTime(e.at)} UTC</time></div>`; }).join('')}</div>`;
route('/audit', () => {
  const f = auditFilter;
  const people = [...new Set(D.audit.map(e => e.actor).filter(a => a !== 'System'))].sort();
  return {
    title: 'Audit log',
    html: `${pageHead({ title: 'Audit log', sub: 'Who changed what, from where. Entries are kept for 1 year.' })}
<section class="ap-panel"><div class="ap-panel-head"><h2 class="ap-h ap-h-3 ap-sr">Filters</h2></div>
<div class="ap-toolbar" style="padding-top:4px">
<div class="ap-seg" role="group" aria-label="Time range" data-range>${[['24h', 'Last 24 h'], ['7d', '7 days'], ['30d', '30 days'], ['365d', '1 year'], ['custom', 'Custom…']].map(([v, t]) => `<button type="button" aria-pressed="${f.range === v}" data-v="${v}">${t}</button>`).join('')}</div>
${select('f-who', [['', 'Everyone'], ...people], f.who, 'aria-label="Person" data-who')}
<div class="ap-seg" role="group" aria-label="Through" data-via>${[['all', 'All'], ['UI', 'People'], ['MCP', 'Agents'], ['System', 'System']].map(([v, t]) => `<button type="button" aria-pressed="${f.via === v}" data-v="${v}">${t}</button>`).join('')}</div>
<div class="ap-search" style="flex:1 1 220px">${icon('search')}<input class="ap-input" type="search" aria-label="Search the audit log" placeholder="Search actions, people, addresses…" value="${esc(f.q)}" data-q></div>
<label class="ap-choice" style="font-size:0.875rem"><input class="ap-switch" type="checkbox" data-failed${f.failed ? ' checked' : ''}>Denied and failed only</label>
</div>
<form id="rg-form" class="ap-toolbar" novalidate style="align-items:flex-start"${f.range === 'custom' ? '' : ' hidden'}>
<div style="flex:1 1 240px">${dtpField({ name: 'from', label: 'From', value: f.from ?? NOW - 7 * DAY, min: NOW - 365 * DAY, max: NOW })}</div>
<div style="flex:1 1 240px">${dtpField({ name: 'to', label: 'To', value: f.to ?? NOW, min: NOW - 365 * DAY, max: NOW })}</div>
<button class="ap-btn ap-btn-primary" type="submit" style="margin-top:24px" data-busy="Applying…">Apply</button></form>
<div class="ap-panel-body" style="padding-top:0" data-events aria-live="polite"></div></section>
<p class="ap-caption" style="margin:0">The audit log includes email and IP addresses, which are personal data. They’re kept for 1 year, then deleted.</p>`,
    mount(el) {
      const box = $('[data-events]', el);
      const span = () => (f.range === 'custom' ? [f.from ?? NOW - 7 * DAY, f.to ?? NOW] : [NOW - { '24h': 1, '7d': 7, '30d': 30, '365d': 365 }[f.range] * DAY, NOW]);
      const matches = e => { const t = f.q.toLowerCase(); return !t || [e.actor, e.agent, e.text.replace(/<[^>]+>/g, ''), e.meta].join(' ').toLowerCase().includes(t); };
      function draw() {
        const [a, b] = span();
        const list = D.audit.filter(e => e.at >= a && e.at <= b && (!f.who || e.actor === f.who) && (f.via === 'all' || e.via === f.via) && (!f.failed || outcomeOf(e) !== 'succeeded') && matches(e));
        if (!list.length) { box.innerHTML = emptyState('No entries match', 'Nothing in this range with these filters.', '<button class="ap-btn" type="button" data-reset>Clear filters</button>'); paint(); return; }
        const days = [...new Set(list.map(e => dayStart(e.at)))];
        box.innerHTML = days.map(d => `<h3 class="ap-overline" style="margin:18px 0 0">${d === dayStart(NOW) ? 'Today' : d === dayStart(NOW - DAY) ? 'Yesterday' : fmtDate(d, false)}</h3>${auditEvents(list.filter(e => dayStart(e.at) === d))}`).join('');
        paint();
      }
      box.addEventListener('click', e => { if (e.target.closest('[data-reset]')) { Object.assign(f, { range: '7d', from: null, to: null, who: '', via: 'all', failed: false, q: '' }); refresh(); } });
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
      $('[data-failed]', el).addEventListener('change', e => { f.failed = e.target.checked; draw(); });
      let timer;
      $('[data-q]', el).addEventListener('input', e => { clearTimeout(timer); timer = setTimeout(() => { f.q = e.target.value.trim(); draw(); }, 300); });
      const dateRule = v => (parseDate(v) === null ? 'Enter a date and time like 2026-11-03 14:00, in UTC.' : null);
      form($('#rg-form', el), {
        from: v => dateRule(v) || (parseDate(v) < NOW - 365 * DAY ? 'The audit log keeps 1 year. Choose a later start.' : null),
        to: (v, all) => dateRule(v) || (parseDate(all.from) !== null && parseDate(v) <= parseDate(all.from) ? 'Choose an end after the start.' : null),
      }, { links: { from: ['to'] }, summary: false, submit: async v => { await wait(300); f.from = parseDate(v.from); f.to = parseDate(v.to); draw(); } });
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
${field({ name: 'email', label: 'Email', type: 'email', value: D.me.email, attrs: 'autocomplete="email" spellcheck="false" autocapitalize="none"', help: 'You sign in with it.' })}
<dl class="ap-kv"><dt>Role</dt><dd>${D.me.role}. Another administrator can change it.</dd><dt>Time zone</dt><dd>Apiary shows every time in UTC, so everyone on call reads the same times.</dd></dl></div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit">Save profile</button></div></form>`,
  mount(el) {
    form($('#pf-form', el), {
      name: v => V.required(v, 'your name'),
      email: v => V.email(v) || (D.users.some(u => u.id !== D.me.id && u.email === String(v).trim().toLowerCase()) ? 'Someone already uses this email.' : null),
    }, { verb: 'save your profile', submit: async v => { await api('read'); Object.assign(D.me, { name: v.name.trim(), email: v.email.trim().toLowerCase() }); toast('Profile saved.'); } });
  },
}));

const repeats = pw => { const l = pw.toLowerCase(); for (let n = 1; n <= 4; n++) if (l.length > n && [...l].every((c, i) => c === l[i % n])) return true; return false; };
const emailName = email => String(email || '').split('@')[0].trim().toLowerCase();
function passwordRules(pw, email) {
  const local = emailName(email);
  return [
    [pw.length >= 15, 'At least 15 characters'],
    [!!pw && !repeats(pw), 'Not a common password or repeated characters'],
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
const newPasswordRule = emailOf => v => {
  const s = String(v || ''), local = emailName(emailOf());
  if (!s) return 'Enter a new password.';
  if (s.length < 15) return 'Use at least 15 characters.';
  if (s.length > 256) return 'Use at most 256 characters.';
  if (repeats(s)) return 'This password is too easy to guess. Try a few unrelated words.';
  return local.length >= 3 && s.toLowerCase().includes(local) ? 'Don’t use your email name in your password.' : null;
};
const checkBreached = (name, v) => { if (/password|apiary|123456|qwerty/i.test(v)) throw { field: name, message: 'This password appeared in a data breach, so attackers try it first. Choose another.' }; };
const againRule = other => (v, all) => (!v ? 'Enter the password again.' : v !== all[other] ? "The passwords don't match." : null);

route('/account/security', () => {
  access();
  return {
    title: 'Security',
    html: `${pageHead({ crumbs: [['Your account', '#/account']], title: 'Security' })}${accountTabs('/account/security')}
<form class="ap-panel" id="pw-form" novalidate aria-labelledby="pw-t" style="max-width:640px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="pw-t">Password</h2><p class="ap-panel-desc">Changing it signs you out of your other sessions.</p></div></div><div class="ap-panel-body ap-stack"><div data-summary></div>
${passwordField('current', 'Current password', { autocomplete: 'current-password', help: 'Prototype: "wrong" is never right.' })}
${passwordField('next', 'New password', { checklist: true })}
${passwordField('again', 'New password again')}</div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-busy="Changing…" data-write>Change password</button></div></form>
<section class="ap-panel" aria-labelledby="tf-t" style="max-width:640px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="tf-t">Two-step sign-in</h2><p class="ap-panel-desc">A code from an app on your phone, asked after your password. Every account needs it.</p></div>${status('ok', 'On')}</div><div class="ap-panel-body"><div class="ap-list">
<div class="ap-list-row"><div class="ap-list-text"><strong>Authenticator app</strong><span class="ap-muted">Set up on 2026-08-14</span></div><button class="ap-btn" type="button" data-totp data-write>Set up again…</button></div>
<div class="ap-list-row"><div class="ap-list-text"><strong>Recovery codes</strong><span class="ap-muted">${D.me.codesLeft} of 10 left. Each works once, if you lose your phone.</span></div><button class="ap-btn" type="button" data-codes data-write>Make new codes…</button></div></div></div></section>`,
    mount(el) {
      const f = $('#pw-form', el);
      bindPasswords(f, () => D.me.email);
      form(f, {
        current: v => V.required(v, 'your current password'),
        next: (v, all) => newPasswordRule(() => D.me.email)(v) || (v && v === all.current ? 'Choose a password different from the current one.' : null),
        again: againRule('next'),
      }, {
        links: { next: ['again'], current: ['next'] },
        verb: 'change your password',
        submit: async v => {
          await api();
          if (v.current === 'wrong') throw { field: 'current', message: 'That isn’t your current password.' };
          checkBreached('next', v.next);
          const others = D.sessions.filter(s => !s.current).length, agents = D.agents.filter(a => a.user === D.me.email).length;
          D.sessions = D.sessions.filter(s => s.current);
          D.agents = D.agents.filter(a => a.user !== D.me.email);
          f.reset();
          $$('.ap-checklist', f).forEach(l => $('#' + l.id.replace('ck-', 'f-'), f).dispatchEvent(new Event('input')));
          toast(`You stay signed in here.${others ? ` Your ${others === 1 ? 'other session was' : `${others} other sessions were`} signed out.` : ''}${agents ? ` ${agents === 1 ? 'Your agent was' : `${agents} agents were`} disconnected; connect them again.` : ''}`, { title: 'Password changed' });
        },
      });
      $('[data-totp]', el).addEventListener('click', totpDialog);
      $('[data-codes]', el).addEventListener('click', newCodesDialog);
    },
  };
});
function totpDialog() {
  const d = dialog({
    title: 'Set up two-step sign-in again', backdrop: false,
    body: `<form id="tt-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>${twoStepSetup()}<p class="ap-caption" style="margin:0">Your current setup keeps working until you finish.</p>
${codeField()}${passwordField('password', 'Your password', { autocomplete: 'current-password', help: 'Prototype: "wrong" is never right.' })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="tt-form" data-busy="Checking…">Turn on</button>`,
    initial: '#f-code',
  });
  const f = $('#tt-form', d.el);
  bindPasswords(f, () => D.me.email);
  form(f, { code: codeRule, password: v => V.required(v, 'your password') }, {
    verb: 'turn it on',
    submit: async v => {
      await api();
      checkCode(v.code);
      if (v.password === 'wrong') throw { field: 'password', message: 'That isn’t your current password.' };
      d.close();
      toast('Use the new entry in your app from now on, and delete the old one.', { title: 'Two-step sign-in set up' });
    },
  });
}
function newCodesDialog() {
  const d = dialog({
    title: 'Make new recovery codes?', backdrop: false,
    body: `<form id="nc-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div><p style="margin:0">Your ${D.me.codesLeft} remaining codes stop working, and you get 10 new ones. Store them somewhere safe, apart from your phone.</p>${passwordField('password', 'Your password', { autocomplete: 'current-password', help: 'Prototype: "wrong" is never right.' })}</form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="nc-form" data-busy="Making…">Make new codes</button>`,
    initial: '#f-password',
  });
  const f = $('#nc-form', d.el);
  bindPasswords(f, () => D.me.email);
  form(f, { password: v => V.required(v, 'your password') }, {
    verb: 'make new codes',
    submit: async v => {
      await api();
      if (v.password === 'wrong') throw { field: 'password', message: 'That isn’t your current password.' };
      d.close();
      D.me.codesLeft = 10;
      refresh();
      const c = dialog({ title: 'Your new recovery codes', body: '<div data-codes-box></div>' });
      showCodes($('[data-codes-box]', c.el), () => c.close());
    },
  });
}

route('/account/sessions', () => {
  access();
  return {
    title: 'Active sessions',
    html: `${pageHead({ crumbs: [['Your account', '#/account']], title: 'Active sessions' })}${accountTabs('/account/sessions')}
<section class="ap-panel" aria-labelledby="se-t" style="max-width:760px"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="se-t">Where you’re signed in</h2><p class="ap-panel-desc">If you don’t recognize one, sign it out and change your password. Sessions end after 12 hours.</p></div>${D.sessions.length > 1 ? '<button class="ap-btn ap-btn-sm" type="button" data-all data-write>Sign out of all others…</button>' : ''}</div><div class="ap-panel-body"><div class="ap-list">
${D.sessions.map(s => `<div class="ap-list-row"><div style="display:flex;gap:12px;align-items:flex-start;flex:1 1 300px"><span class="ap-project-mark">${icon(/iPhone/.test(s.device) ? 'smartphone' : 'monitor')}</span><div class="ap-list-text"><strong>${esc(s.device)}${s.current ? ' <span class="ap-tag ap-tag-honey">This browser</span>' : ''}</strong><span class="ap-muted"><span class="ap-data">${s.ip}</span> · signed in ${fmtDate(s.started)} UTC</span></div></div>${s.current ? '' : `<button class="ap-btn ap-btn-sm" type="button" data-out="${s.id}" data-write>Sign out</button>`}</div>`).join('')}
</div></div></section>`,
    mount(el) {
      $$('[data-out]', el).forEach(b => b.addEventListener('click', () => quick(b, 'Signing out…', () => api(), () => { const s = D.sessions.find(x => x.id === b.dataset.out); D.sessions.splice(D.sessions.indexOf(s), 1); refresh(); toast(`${s.device} is signed out.`); })));
      const all = $('[data-all]', el);
      if (all) all.addEventListener('click', () => confirmDialog({ title: 'Sign out of all other sessions?', tone: 'primary', mark: ['info', 'log-out'], text: `${plural(D.sessions.length - 1, 'other session')} end at once. You stay signed in here.`, confirm: 'Sign out others', busy: 'Signing out…', onConfirm: async () => { await api(); D.sessions = D.sessions.filter(s => s.current); refresh(); toast('Only this browser is signed in now.'); } }));
    },
  };
});

/* Sign-in, invites, agent approval and first run: outside the shell, with the attribution */
const authFoot = () => `<div class="ap-attribution"><span style="color:var(--ink-2)">${$('[data-dp-logo]').innerHTML}</span><span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span><span>Version ${D.cluster.version} · <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL-3.0</a> · <a href="#">Source</a></span></div>`;
const authPage = (heading, body, { sub = '', wide = false } = {}) => `<main class="ap-auth" id="main-bare"><div class="ap-panel ap-auth-card"${wide ? ' style="width:min(460px,100%)"' : ''}><div class="ap-auth-brand"><span class="ap-brand-mark" aria-hidden="true"></span><div><h1 class="ap-h ap-h-2">${heading}</h1>${sub ? `<p class="ap-muted" style="margin:4px 0 0;font-size:0.875rem">${sub}</p>` : ''}</div></div>${body}</div>${authFoot()}</main>`;
const authLink = (text, attr) => `<button class="ap-link ap-caption" type="button" ${attr} style="color:var(--honey-text)">${text}</button>`;
function welcome(name, first) {
  go('/');
  toast(first ? `Welcome to Apiary, ${name.split(' ')[0]}.` : `Welcome back, ${name.split(' ')[0]}.`);
}

route('/sign-in', () => {
  const s = access().sso;
  return {
    title: 'Sign in',
    html: authPage('Sign in to Apiary', `<div class="ap-stack" style="gap:16px" data-step>${s.enabled ? `<a class="ap-btn ap-btn-primary ap-btn-lg" href="#/" data-sso>Sign in with ${esc(s.displayName)}</a><div class="ap-divider-text" role="separator"><span>or with your Apiary password</span></div>` : ''}
<form id="si-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'email', label: 'Email', type: 'email', value: D.me.email, attrs: 'autocomplete="username" spellcheck="false" autocapitalize="none"' })}
${passwordField('password', 'Password', { autocomplete: 'current-password' })}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Signing in…">Sign in</button>
<p class="ap-caption" style="margin:0;text-align:center">Prototype: any password works except "wrong". Sign in as ines@example.com to set up two-step sign-in, as after a reset.</p></form></div>`),
    mount(el) {
      const f = $('#si-form', el);
      bindPasswords(f, () => '');
      $('#f-password', f).focus();
      const sso = $('[data-sso]', el);
      if (sso) sso.addEventListener('click', e => { e.preventDefault(); welcome(D.me.name); });
      form(f, { email: V.email, password: v => V.required(v, 'your password') }, {
        verb: 'sign in',
        submit: async v => {
          await api('read');
          if (v.password === 'wrong') {
            f.elements.password.value = '';
            throw new ApiError("The email or password isn't right", 'Check both and try again. After 5 tries, sign-in pauses for 15 minutes.');
          }
          const u = D.users.find(x => x.email === v.email.trim().toLowerCase() && x.status === 'active' && !x.sso) || D.users.find(x => x.id === D.me.id);
          codeStep(el, u, !u.twofa);
        },
      });
    },
  };
}, { bare: true });
function codeStep(el, u, enroll) {
  const box = $('[data-step]', el);
  box.innerHTML = `<form id="cd-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${enroll ? `<p class="ap-muted" style="margin:0;font-size:0.875rem">Your account needs two-step sign-in. Set it up now to continue.</p>${twoStepSetup()}` : '<p class="ap-muted" style="margin:0;text-align:center;font-size:0.875rem" data-hint>Enter the code from your authenticator app.</p>'}
${field({ name: 'code', label: 'Code', help: 'Prototype: 000000 is always wrong.', control: '<input class="ap-input ap-otp" id="f-code" name="code" inputmode="numeric" autocomplete="one-time-code" spellcheck="false" autocapitalize="none" aria-describedby="h-code e-code">' })}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Checking…">Continue</button>
<div class="ap-row" style="justify-content:space-between">${authLink('Back', 'data-back')}${enroll ? '' : authLink('Use a recovery code', 'data-recovery')}</div></form>`;
  paint();
  const input = $('#f-code', box);
  input.focus();
  let recovery = false;
  $('[data-back]', box).addEventListener('click', refresh);
  const toggle = $('[data-recovery]', box);
  if (toggle) toggle.addEventListener('click', () => {
    recovery = !recovery;
    toggle.textContent = recovery ? 'Use the app instead' : 'Use a recovery code';
    $('label[for="f-code"]', box).textContent = recovery ? 'Recovery code' : 'Code';
    $('[data-hint]', box).textContent = recovery ? 'Enter one of your recovery codes.' : 'Enter the code from your authenticator app.';
    input.classList.toggle('ap-otp', !recovery);
    if (recovery) input.removeAttribute('inputmode'); else input.setAttribute('inputmode', 'numeric');
    input.placeholder = recovery ? 'xxxx-xxxx-xxxx-xxxx' : '';
    input.value = '';
    input.focus();
  });
  form($('#cd-form', box), { code: v => (recovery ? (!String(v).trim() ? 'Enter one of your recovery codes.' : null) : codeRule(v)) }, {
    verb: 'continue',
    submit: async v => {
      await api('read');
      checkCode(v.code);
      if (!enroll) return welcome(u.name);
      u.twofa = true;
      showCodes(box, () => welcome(u.name));
    },
  });
}

route('/invite/:token', token => {
  access();
  const u = token === 'expired' ? null : D.users.find(x => x.status === 'invited');
  if (!u) return { title: 'Join', html: authPage('Join Apiary', banner('warn', 'This invite link doesn’t work', 'It was already used, revoked or replaced by a newer link, or it expired. Ask an administrator for a new one.', '<a class="ap-btn ap-btn-sm" href="#/sign-in">Sign in</a>'), { wide: true }) };
  return {
    title: 'Join',
    html: authPage('Join Apiary', `<div class="ap-stack" style="gap:16px" data-step><form id="ia-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
<dl class="ap-kv"><dt>Email</dt><dd>${esc(u.email)}. You sign in with it.</dd></dl>
${passwordField('password', 'Password', { checklist: true })}
${passwordField('again', 'Password again')}
${twoStepSetup()}${codeField()}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Creating…">Create account</button></form></div>`, { sub: `Set up your account, ${esc(u.name)}.`, wide: true }),
    mount(el) {
      const f = $('#ia-form', el);
      bindPasswords(f, () => u.email);
      $('#f-password', f).focus();
      form(f, { password: newPasswordRule(() => u.email), again: againRule('password'), code: codeRule }, {
        verb: 'create your account',
        links: { password: ['again'] },
        submit: async v => {
          await api();
          checkBreached('password', v.password);
          checkCode(v.code);
          Object.assign(u, { status: 'active', twofa: true, last: NOW });
          showCodes($('[data-step]', el), () => welcome(u.name, true));
        },
      });
    },
  };
}, { bare: true });

route('/setup', () => ({
  title: 'Welcome',
  html: authPage('Welcome to Apiary', '<div class="ap-stack" style="gap:16px" data-step></div>', { sub: 'Create the first administrator.', wide: true }),
  mount(el) {
    const box = $('[data-step]', el);
    const draft = { name: '', email: '', password: '', again: '' };
    function details() {
      box.innerHTML = `${banner('info', '', `Whoever finishes this page first becomes the administrator. It works until ${fmtTime(NOW + 15 * MIN)} UTC, and only from the internal network.`)}
<form id="su-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'name', label: 'Your name', value: draft.name, attrs: 'autocomplete="name"' })}
${field({ name: 'email', label: 'Email', type: 'email', value: draft.email, help: 'You sign in with it.', attrs: 'autocomplete="username" spellcheck="false" autocapitalize="none"' })}
${passwordField('password', 'Password', { checklist: true })}
${passwordField('again', 'Password again')}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Checking…">Continue</button></form>
<p class="ap-caption" style="margin:0;text-align:center">Moving from another Apiary with the same root key? <input type="file" accept=".backup" class="ap-sr" id="setup-backup" tabindex="-1"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-restore>Restore a backup instead</button></p><div data-restore-fail></div>`;
      paint();
      const f = $('#su-form', box);
      f.elements.password.value = draft.password;
      f.elements.again.value = draft.again;
      bindPasswords(f, () => f.elements.email.value);
      $('#f-name', f).focus();
      form(f, {
        name: v => V.required(v, 'your name'),
        email: V.email,
        password: newPasswordRule(() => f.elements.email.value),
        again: againRule('password'),
      }, {
        verb: 'continue',
        links: { password: ['again'], email: ['password'] },
        submit: async v => { await api('read'); checkBreached('password', v.password); Object.assign(draft, v); enroll(); },
      });
      const file = $('#setup-backup', box), restore = $('[data-restore]', box);
      restore.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const chosen = file.files[0];
        file.value = '';
        if (!chosen) return;
        const fail = $('[data-restore-fail]', box);
        fail.innerHTML = '';
        try {
          await run(restore, 'Restoring…', async () => { await api('read', 1200); if (!/\.backup$/i.test(chosen.name)) throw new ApiError('', 'This file isn’t a backup this cluster can open. Choose a file Apiary exported, from a cluster with the same root key.'); });
          const s = seedData();
          go('/sign-in');
          toast(`${s.users.length} users, ${s.routes.length} routes and ${s.certs.length} certificates are back. Sign in as before.`, { title: 'Backup restored' });
        } catch (err) {
          fail.innerHTML = `<div role="alert">${banner('critical', '', esc(err.detail))}</div>`;
          paint();
        }
      });
    }
    function enroll() {
      box.innerHTML = `<form id="en-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>${twoStepSetup()}${codeField()}
<button class="ap-btn ap-btn-primary ap-btn-lg" type="submit" data-busy="Creating…">Create administrator</button>${authLink('Back', 'data-back')}</form>`;
      paint();
      $('#f-code', box).focus();
      $('[data-back]', box).addEventListener('click', details);
      form($('#en-form', box), { code: codeRule }, {
        verb: 'create the administrator',
        submit: async v => {
          await api('read', 900);
          checkCode(v.code);
          showCodes(box, () => { go('/'); toast('Next, invite the people who run Apiary with you, in Users.', { title: 'You’re the first administrator' }); });
        },
      });
    }
    details();
  },
}), { bare: true });
