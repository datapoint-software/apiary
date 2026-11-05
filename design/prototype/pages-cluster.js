/* Replicas, backups and the root key. */
const ROLE_NAMES = { leader: 'Leader', voter: 'Voter', follower: 'Joining', down: 'Voter' };
const LOCAL_REPLICA = 'edge-2';
const membership = () => (D.cluster.membership ??= { mode: 'automatic' });
const pendingReplicas = () => (D.pendingReplicas ??= [{ id: 'e81f5c07', name: 'edge-6', address: '10.0.1.16:7400', since: NOW - 3 * MIN }]);
function replicaInfo(r, i) {
  r.address ??= `10.0.1.${11 + i}:7400`;
  r.joined ??= r.role === 'follower' ? NOW - 6 * MIN : r.role === 'down' ? at(30, '11:20') : at(84, '10:02');
  return r;
}
const lostReplicas = () => Proto.state.cluster === 'quorum' ? ['edge-1', 'edge-3'] : Proto.state.cluster === 'degraded' ? ['edge-3'] : [];
const unreachable = r => r.role === 'down' || lostReplicas().includes(r.name);
const missingFor = r => ago(r.role === 'down' ? r.seen : NOW - 2 * MIN).replace(/ ago$/, '');
function replicaState(r) {
  if (unreachable(r)) return ['critical', `Missing for ${missingFor(r)}`];
  if (r.role === 'follower') return ['info', 'Catching up'];
  return ['ok', 'In sync'];
}
route('/replicas', () => {
  const m = membership(), pending = m.mode === 'manual' ? pendingReplicas() : [];
  const reps = D.replicas.map(replicaInfo).slice().sort((a, b) => a.name.localeCompare(b.name));
  return {
    title: 'Replicas',
    html: `${pageHead({ title: 'Replicas', sub: 'Every replica keeps a copy of the configuration and serves traffic. A majority of them must agree on each change.' })}
${pending.length ? `<section class="ap-panel" aria-labelledby="pd-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="pd-t">Waiting for approval</h2><p class="ap-panel-desc">These replicas have the root key and ask to join. Approve the ones you deployed; the others keep waiting.</p></div></div>
<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Replicas waiting for approval</caption><thead><tr><th scope="col">Replica</th><th scope="col">Address</th><th scope="col">Asking since</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${pending.map(p => `<tr><td><div class="ap-cell-main"><span class="ap-data" style="font-weight:500">${p.name}</span><span class="ap-caption ap-data">${p.id}</span></div></td><td class="ap-data ap-muted">${p.address}</td><td class="ap-muted">${ago(p.since)}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-primary" type="button" data-approve="${p.id}" data-write>Approve</button></td></tr>`).join('')}
</tbody></table></div></section>` : ''}
<section class="ap-panel"><div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Replicas</caption><thead><tr><th scope="col">Replica</th><th scope="col">Address</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${reps.map(r => { const [tone, text] = replicaState(r); return `<tr><td><div class="ap-cell-main"><span class="ap-data" style="font-weight:500">${r.name}${r.name === LOCAL_REPLICA ? ' <span class="ap-muted" style="font-weight:400">(this replica)</span>' : ''}</span><span class="ap-caption ap-data">${r.id}</span></div></td><td class="ap-data ap-muted">${r.address}</td><td>${ROLE_NAMES[r.role]}</td><td>${status(tone, text)}</td><td class="ap-muted">${ago(r.joined)}</td><td class="ap-col-actions">${unreachable(r) ? `<button class="ap-btn ap-btn-ghost" type="button" data-remove="${r.id}" data-write>Remove now…</button>` : ''}</td></tr>`; }).join('')}
</tbody></table></div></section>
<form class="ap-panel" id="mb-form" novalidate aria-labelledby="mb-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="mb-t">Membership</h2><p class="ap-panel-desc">How replicas join and leave. Either way, a replica must prove it has the root key before it can join.</p></div></div>
<div class="ap-panel-body ap-stack"><div data-summary></div>
<fieldset class="ap-field" data-field="mode" style="border:0;margin:0;padding:0"><legend class="ap-sr">Membership</legend><div class="ap-stack" style="gap:10px">
${[['automatic', 'Automatic', 'New replicas join on their own, so the cluster grows and shrinks with the stack.'], ['manual', 'Manual', 'New replicas wait here until an administrator approves them, and missing ones stay until removed.']].map(([v, t, h]) => `<label class="ap-choice"><input class="ap-radio" type="radio" name="mode" value="${v}"${m.mode === v ? ' checked' : ''}><span class="ap-choice-text"><span>${t}</span><span class="ap-help">${h}</span></span></label>`).join('')}
</div></fieldset>
<div style="max-width:300px" data-minutes${m.mode === 'automatic' ? '' : ' hidden'}>${field({ name: 'removal', label: 'Remove missing replicas after', value: D.cluster.removalMinutes, data: true, after: 'minutes', type: 'number', attrs: 'inputmode="numeric"', help: 'From 5 to 1440 minutes.' })}</div></div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-write>Save</button></div></form>
<section class="ap-panel ap-panel-danger" aria-labelledby="fr-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="fr-t">Danger zone</h2></div></div><div class="ap-panel-body ap-list"><div class="ap-list-row"><div class="ap-list-text"><strong>Recover from a lost majority</strong><span class="ap-muted">Only when most voters are gone for good. This replica becomes the only voter, and anything only the lost voters had is lost.</span></div><button class="ap-btn ap-btn-danger" type="button" data-recover>Start recovery…</button></div></div></section>
<p class="ap-caption">Log index ${Math.max(...D.replicas.map(r => r.index))}.</p>`,
    mount(el) {
      const f = $('#mb-form', el), minutes = $('[data-minutes]', el);
      f.addEventListener('change', e => { if (e.target.name === 'mode') minutes.hidden = e.target.value !== 'automatic'; });
      form(f, () => (f.elements.mode.value === 'automatic' ? { removal: v => (!/^\d+$/.test(String(v).trim()) || +v < 5 || +v > 1440 ? 'Enter a number from 5 to 1440.' : null) } : {}), {
        verb: 'save the membership',
        submit: async v => {
          await api();
          m.mode = v.mode;
          if (v.mode === 'automatic') D.cluster.removalMinutes = +v.removal;
          refresh();
          toast(v.mode === 'manual' ? 'New replicas now wait for your approval, and missing ones stay until you remove them.' : `New replicas join on their own, and missing ones are removed after ${D.cluster.removalMinutes} minutes.`, { title: 'Membership saved' });
        },
      });
      $$('[data-approve]', el).forEach(b => b.addEventListener('click', () => {
        const p = pendingReplicas().find(x => x.id === b.dataset.approve);
        quick(b, 'Approving…', () => api(), () => {
          pendingReplicas().splice(pendingReplicas().indexOf(p), 1);
          D.replicas.push({ id: p.id, name: p.name, node: 'swarm-node-6', role: 'follower', index: 0, lag: 0, version: D.cluster.version, seen: NOW, address: p.address, joined: NOW });
          refresh();
          toast(`The replica on ${p.name} joins in a few seconds, then catches up and starts serving traffic.`, { title: 'Replica approved' });
        });
      }));
      $$('[data-remove]', el).forEach(b => b.addEventListener('click', () => {
        const r = D.replicas.find(x => x.id === b.dataset.remove);
        const missing = `It has been missing for ${missingFor(r)}`;
        confirmDialog({
          title: `Remove ${r.name} now?`,
          text: `${m.mode === 'automatic' ? `${missing}, and would be removed on its own after ${D.cluster.removalMinutes} minutes.` : `${missing}.`} Once removed, it no longer counts towards the majority. If ${r.name} comes back, its replica joins again as a new replica.`,
          confirm: 'Remove replica', busy: 'Removing…',
          onConfirm: async () => { await api(); D.replicas.splice(D.replicas.indexOf(r), 1); refresh(); toast(`${r.name} was removed from the cluster.`); },
        });
      }));
      $('[data-recover]', el).addEventListener('click', recoverWizard);
    },
  };
});

/* Forced recovery: checked, confirmed with a password and a code, because it can lose data */
const recoverySteps = n => `<ol class="ap-steps" aria-label="Recovery">${['Check', 'Confirm', 'Recover'].map((s, i) => `<li class="ap-step${i < n ? ' ap-step-done' : ''}"${i === n ? ' aria-current="step"' : ''}>${s}</li>`).join('')}</ol>`;
function recoverWizard() {
  const node = LOCAL_REPLICA, needed = Proto.state.cluster === 'quorum';
  const index = D.replicas.find(r => r.name === node).index;
  const lost = new Intl.ListFormat('en', { type: 'conjunction' }).format(D.replicas.filter(unreachable).map(r => r.name));
  const d = dialog({
    title: `Recover the cluster from ${node}`, size: 'lg', role: 'alertdialog', mark: ['critical', 'triangle-alert'], backdrop: false,
    body: `${recoverySteps(0)}
${needed ? `<p style="margin:0">${lost} can’t be reached. If they can come back, wait for them instead: recovery can’t be undone. This replica has every change up to <span class="ap-data">${index}</span>, the last one at <span class="ap-data">${fmtDate(NOW - 9 * MIN)}</span> UTC.</p>
<div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I checked that the missing replicas’ nodes are gone, not only slow or restarting</span></label>
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I understand that changes only the missing replicas had are lost, and that everyone is signed out</span></label>
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I have a recent backup, or accept running without one</span></label></div>`
    : `${banner('info', 'Recovery isn’t needed', 'A majority of voters can be reached, so the cluster still agrees on changes. Recovery is only for when a majority is lost for good.')}<p class="ap-caption" style="margin:0">Prototype: set Cluster to "No quorum" to try it.</p>`}`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button>${needed ? '<button class="ap-btn ap-btn-primary" type="button" data-next disabled>Continue</button>' : ''}`,
  });
  if (!needed) return;
  const boxes = $$('[data-c]', d.el), next = $('[data-next]', d.el);
  boxes.forEach(b => b.addEventListener('change', () => { next.disabled = !boxes.every(x => x.checked); }));
  next.addEventListener('click', () => {
    d.body(`${recoverySteps(1)}
<p style="margin:0">${node} becomes the only voter, and changes resume. Then add voters back: the other replicas rejoin as new ones when their nodes return, or deploy the stack again on 3 nodes.</p>
<form id="rc-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'node', label: `Type ${node} to confirm`, data: true, attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"' })}
${field({ name: 'password', label: 'Your password', control: `<div class="ap-affix"><input class="ap-input" id="f-password" name="password" type="password" autocomplete="current-password" aria-describedby="h-password e-password"><span class="ap-affix-text" style="padding:0 3px"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-show aria-pressed="false" aria-label="Show your password" style="height:26px;padding:0 8px">Show</button></span></div>` })}
${field({ name: 'code', label: 'Code from your authenticator app', help: 'Recovery codes don’t work here. Prototype: 000000 is always wrong.', attrs: 'inputmode="numeric" autocomplete="one-time-code" spellcheck="false"' })}</form>`);
    d.foot(`<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-danger" type="submit" form="rc-form" data-busy="Recovering…">Recover cluster</button>`);
    $('#f-code', d.el).classList.add('ap-otp');
    $('[data-show]', d.el).addEventListener('click', e => {
      const input = $('#f-password', d.el), on = input.type === 'password';
      input.type = on ? 'text' : 'password';
      e.target.textContent = on ? 'Hide' : 'Show';
      e.target.setAttribute('aria-pressed', String(on));
      e.target.setAttribute('aria-label', `${on ? 'Hide' : 'Show'} your password`);
    });
    $('#f-node', d.el).focus();
    form($('#rc-form', d.el), {
      node: v => (!String(v).trim() ? 'Type the replica’s name to confirm.' : String(v).trim() !== node ? 'That isn’t this replica’s name. Type it exactly as shown.' : null),
      password: v => (!v ? 'Fill this in.' : null),
      code: v => (!String(v).trim() ? 'Fill this in.' : null),
    }, {
      verb: 'recover',
      submit: async v => {
        await api('read', Proto.state.network === 'slow' ? 3200 : 1600);
        if (v.code.replace(/\s/g, '') === '000000') throw { field: 'code', message: 'That code didn’t work. Check that your phone’s clock is right, then try the newest code.' };
        d.body(`${recoverySteps(2)}
<p style="margin:0">When it’s back, in a minute or so, it’s the only voter of a new cluster and accepts changes again. Everyone was signed out.</p>
<ol style="margin:0;padding-left:20px"><li>Sign in again.</li><li>Review users and roles, and redo recent changes that are missing.</li><li>Take a backup.</li></ol>`);
        d.foot('<button class="ap-btn ap-btn-primary" type="button" data-signin>Go to sign-in</button>');
        $('.ap-dialog-mark', d.el).remove();
        $('.ap-dialog-head h2', d.el).textContent = `${node} is restarting`;
        const signIn = $('[data-signin]', d.el);
        signIn.focus();
        signIn.addEventListener('click', () => { Proto.set('cluster', 'healthy'); d.close(); go('/sign-in'); });
      },
    });
  });
}

const backupName = ts => `apiary-${fmtDate(ts, false)}-${fmtTime(ts).replace(':', '')}.backup`;
route('/backups', () => {
  const last = D.backups[0];
  const old = !last || NOW - last.at > 7 * DAY;
  return {
    title: 'Backups',
    html: `${pageHead({ title: 'Backups', sub: 'A backup holds every project, route, certificate, user and the audit log. Take one before each upgrade and after big changes.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-now data-write>${icon('archive')}Back up now</button>` })}
${old ? banner('warn', last ? `The last backup is ${ago(last.at)}` : 'There are no backups yet', 'If the cluster were lost now, every change since then would be lost with it.') : ''}
${banner('info', 'Keep the root key with your backups', 'Backups are encrypted with the root key, and include certificates’ private keys. Without the key a backup can’t be restored, so store a copy of the key apart from the cluster, and the backups where only administrators can read them.')}
<section class="ap-panel" aria-labelledby="bk-last"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="bk-last">Last backup</h2></div><div class="ap-panel-body">
${last ? `<dl class="ap-kv"><dt>Taken</dt><dd><span class="ap-data">${fmtDate(last.at)} UTC</span>, ${ago(last.at)}</dd><dt>By</dt><dd>${esc(last.kind === 'Manual' ? last.by : 'Apiary')}</dd><dt>Changes since</dt><dd>${last.changes ?? 37}</dd></dl>`
    : '<p class="ap-muted" style="margin:0">None yet. Apiary doesn’t keep backups itself: each one is downloaded when you take it.</p>'}</div></section>
<section class="ap-panel" aria-labelledby="bk-restore"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="bk-restore">Restore a backup</h2><p class="ap-panel-desc">Replaces the whole configuration on every replica. Use it to go back after a mistake, or to move a configuration to a new cluster with the same root key.</p></div></div>
<div class="ap-panel-body"><input type="file" accept=".backup" class="ap-sr" id="backup-file" tabindex="-1"><button class="ap-btn" type="button" data-choose data-write>${icon('file-up')}Choose a backup file…</button><p class="ap-caption" style="margin:8px 0 0">Prototype: a file whose name has "unreadable" in it is refused.</p></div></section>`,
    mount(el) {
      $$('[data-now]', el).forEach(btn => btn.addEventListener('click', () => quick(btn, 'Backing up…', () => api('write', Proto.state.network === 'slow' ? 3200 : 1400), () => {
        D.backups.unshift({ id: 'b' + Date.now().toString(36), at: NOW, size: 2.5, by: D.me.email, kind: 'Manual', index: Math.max(...D.replicas.map(r => r.index)), changes: 0 });
        refresh();
        toast(`${backupName(NOW)} is downloading. Store it with the root key, apart from the cluster.`, { title: 'Backup taken' });
      })));
      const input = $('#backup-file', el);
      $('[data-choose]', el).addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files[0];
        input.value = '';
        if (!file) return;
        const unreadable = 'This file isn’t a backup this cluster can open. Choose a file Apiary exported, from a cluster with the same root key.';
        if (file.size > 25 * 1024 * 1024) return toast(unreadable, { tone: 'error' });
        const m = /^apiary-(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})\.backup$/.exec(file.name);
        const taken = m ? parseDate(`${m[1]} ${m[2]}:${m[3]}`) ?? NOW - DAY : last ? last.at : NOW - DAY;
        confirmDialog({
          title: `Restore ${esc(file.name)}?`,
          text: 'Every replica goes back to the routes, certificates and users in this backup. Changes made since it was taken are lost, and everyone is signed out, you included. Traffic keeps flowing.',
          type: 'restore', confirm: 'Restore backup', busy: 'Restoring…',
          onConfirm: async () => {
            await api('write', 2000);
            if (/unreadable/i.test(file.name)) throw new ApiError('Couldn’t restore', unreadable);
            toast(`Back to ${fmtDate(taken)} UTC: ${D.routes.length} routes, ${D.certs.length} certificates, ${D.users.length} users. Sign in again.`, { title: 'Backup restored' });
            setTimeout(() => go('/sign-in'));
          },
        });
      });
    },
  };
});

/* Rotation: each replica reports the key it runs with; Apiary forgets the old key once all of them use the new one */
const ROTATION_STALLED = 30 * MIN;
function rootKey() {
  const k = D.rootKey;
  if (!k.keys) {
    Object.assign(k, { current: 'Hq3vT0xK9aPw', currentSince: k.created, target: 'mR7cZ2e1LwQs', targetSince: NOW - 48 * MIN, keys: {} });
    D.replicas.forEach(r => { k.keys[r.id] = ['edge-1', 'edge-4'].includes(r.name) ? k.target : k.current; });
  }
  return k;
}
route('/root-key', () => {
  const k = rootKey();
  const total = D.replicas.length, keyOf = r => k.keys[r.id];
  const count = id => D.replicas.filter(r => id && keyOf(r) === id).length;
  const behind = k.target ? D.replicas.filter(r => keyOf(r) !== k.target) : [];
  const stalled = k.target && NOW - k.targetSince > ROTATION_STALLED;
  const create = `(umask 077 && docker run --rm datapointsoftware/apiary:${D.cluster.version} secrets init > apiary_root_key_2) && docker secret create apiary_root_key_2 apiary_root_key_2`;
  const copy = text => `<div class="ap-copy"><code>${esc(text)}</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div>`;
  return {
    title: 'Root key',
    html: `${pageHead({ title: 'Root key', sub: 'The root key protects the stored configuration and backups. Swarm gives it to every replica as a secret; Apiary never stores it.' })}
${stalled ? banner('warn', 'The rotation hasn’t finished', `It started ${ago(k.targetSince)}, and ${behind.length} of ${total} replicas still use another key. Check that the stack was deployed with the new secret, and that these replicas restarted: ${behind.map(r => r.name).join(', ')}.`) : ''}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="rk1"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rk1">This replica’s key</h2>${status('ok', 'In use')}</div><div class="ap-panel-body"><dl class="ap-kv"><dt>Key ID</dt><dd class="ap-data">${k.current}</dd><dt>Known since</dt><dd><span class="ap-data">${fmtDate(k.currentSince)} UTC</span>, ${ago(k.currentSince)}</dd><dt>Replicas using it</dt><dd>${count(k.current)} of ${total}</dd></dl></div></section>
<section class="ap-panel" aria-labelledby="rk2"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rk2">Rotation</h2>${k.target ? status('info', 'In progress') : status('off', 'Not running')}</div><div class="ap-panel-body ap-stack">
${k.target ? `<ol class="ap-steps" aria-label="Root key rotation"><li class="ap-step ap-step-done">New key deployed</li><li class="ap-step" aria-current="step">Rolling update</li><li class="ap-step">Old key forgotten</li></ol>
<div class="ap-meter ap-meter-info"><div class="ap-meter-head"><span>Replicas on <span class="ap-data">${k.target}</span></span><span class="ap-data">${count(k.target)} of ${total}</span></div><div class="ap-meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count(k.target)}" aria-label="Replicas on the new root key"><div class="ap-meter-fill" style="width:${total ? count(k.target) / total * 100 : 0}%"></div></div></div>
<p class="ap-caption" style="margin:0">Swarm restarts the replicas one by one. Each fetches the data keys from the others and protects them with the new key. Traffic continues, and Apiary forgets the old key once every replica uses the new one.</p>
<p class="ap-caption" style="margin:0">Prototype: <button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" data-finish>Finish the rolling update</button></p>`
    : `<p class="ap-muted" style="margin:0">Rotate the key if it may have leaked, or as your policy requires.</p>
<div class="ap-field"><span class="ap-label">1. If your secret store doesn’t have the current key, save it from a node running a replica</span>${copy('docker exec <apiary container> cat /run/secrets/apiary_root_key')}</div>
<div class="ap-field"><span class="ap-label">2. Create the new key on a manager node</span>${copy(create)}</div>
<p style="margin:0">3. Copy the file <span class="ap-code">apiary_root_key_2</span> into your secret store, then delete it. Swarm never shows a secret again.</p>
<p style="margin:0">4. Change the secret’s name in the stack file, then run <span class="ap-code">docker stack deploy</span>.</p>
<p style="margin:0">5. Once every replica uses it, Apiary forgets the old key on its own. Remove the old secret with <span class="ap-code">docker secret rm</span>, and export a new backup.</p>
<p class="ap-caption" style="margin:0">Backups can only be restored with the key they were taken with. Keep the old key in your secret store, apart from the backups, for as long as you keep backups taken with it. Rotation needs at least two replicas: a single replica can’t fetch the data keys from another.</p>`}
</div></section></div>
<section class="ap-panel" aria-labelledby="rk3"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rk3">Replicas</h2></div><div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Root key of each replica</caption><thead><tr><th scope="col">Replica</th><th scope="col">Root key</th></tr></thead><tbody>
${D.replicas.slice().sort((a, b) => a.name.localeCompare(b.name)).map(r => `<tr><td class="ap-data" style="font-weight:500">${r.name}</td><td>${!keyOf(r) ? '<span class="ap-muted">Not reported yet; it reports when it restarts</span>' : k.target && keyOf(r) !== k.target ? `<span class="ap-status ap-status-warn"><span class="ap-dot" aria-hidden="true"></span><span class="ap-data">${keyOf(r)}</span> (old)</span>` : `<span class="ap-data">${keyOf(r)}</span>`}</td></tr>`).join('')}
</tbody></table></div></section>`,
    mount(el) {
      const f = $('[data-finish]', el);
      if (f) f.addEventListener('click', () => quick(f, 'Restarting…', () => api('read', 900), () => {
        D.replicas.forEach(r => { k.keys[r.id] = k.target; });
        Object.assign(k, { current: k.target, currentSince: k.targetSince, target: null, targetSince: null });
        refresh();
        toast('Every replica uses the new key, so Apiary forgot the old one. Remove the old secret with docker secret rm, and export a new backup.', { title: 'Rotation finished' });
      }));
    },
  };
});

/* Trusted proxies: load balancers, CDNs and other proxies in front of Apiary. Requests from them keep the client's
   address in X-Forwarded-For and the scheme in X-Forwarded-Proto, and public routes use them. The admin port never does. */
function parseIp(s) {
  s = String(s || '').trim().replace(/^\[|\]$/g, '');
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (v4) return v4.slice(1).every(n => +n <= 255) ? { len: 32, bits: v4.slice(1).reduce((a, n) => (a << 8n) + BigInt(n), 0n) } : null;
  if (!/^[0-9a-f:]+$/i.test(s) || !s.includes(':') || (s.match(/::/g) || []).length > 1) return null;
  const [head, tail] = s.includes('::') ? s.split('::') : [s, null];
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const groups = tail === null ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return { len: 128, bits: groups.reduce((a, g) => (a << 16n) + BigInt('0x' + g), 0n) };
}
function parseRange(line) {
  const [addr, pre] = String(line).trim().split('/');
  const ip = parseIp(addr);
  if (!ip) return null;
  const prefix = pre === undefined ? ip.len : /^\d{1,3}$/.test(pre) ? +pre : -1;
  return prefix < 0 || prefix > ip.len ? null : { ...ip, prefix };
}
const inRange = (ip, r) => ip.len === r.len && ip.bits >> BigInt(r.len - r.prefix) === r.bits >> BigInt(r.len - r.prefix);
const PRIVATE_RANGES = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '100.64.0.0/10', '169.254.0.0/16', 'fc00::/7', '::1/128', 'fe80::/10'].map(parseRange);
const isPublicRange = line => { const r = parseRange(line); return !!r && !PRIVATE_RANGES.some(p => p.len === r.len && r.prefix >= p.prefix && inRange(r, p)); };
// An X-Forwarded-For entry may carry the client's port, as some load balancers add: 203.0.113.9:51234 or [2001:db8::1]:51234.
const hopAddress = s => { const m = /^\[(.+)\](?::\d+)?$/.exec(s) || /^(\d+\.\d+\.\d+\.\d+):\d+$/.exec(s); return m ? m[1] : s; };
const parseHop = s => parseIp(hopAddress(s));
const trustsAddress = ip => D.trustedProxies.some(p => { const r = parseRange(p.range); return r && inRange(ip, r); });
const MAX_PROXIES = 100, MAX_HOPS = 20;
function checkProxyRange(line, others) {
  const s = String(line || '').trim();
  if (!s) return 'Enter an address or range, such as 10.20.30.0/24.';
  const r = parseRange(s);
  if (!r) return 'Enter an IPv4 or IPv6 address or range, such as 10.20.30.0/24.';
  if (r.prefix === 0) return 'This would trust every address, so anyone could claim to be anyone and every allowlist would let them in. Enter only your proxies’ ranges.';
  return others.includes(s) ? 'This range is already on the list.' : null;
}

/* What Apiary does with one request: the client address and scheme routes use, and the headers it sends on.
   It reads X-Forwarded-For from the right, skips trusted addresses and stops at the first one it doesn't trust.
   The scheme is the X-Forwarded-Proto value of the same hop, or the only value when the proxies replace it; anything but
   http or https keeps the connection's own (http here). */
function resolveRequest(conn, forwardedFor, forwardedProto) {
  const c = parseIp(conn);
  if (!c) return null;
  const own = { client: conn.trim(), scheme: 'http', sentFor: conn.trim() };
  const chain = String(forwardedFor || '').split(',').map(s => s.trim()).filter(Boolean);
  const protos = String(forwardedProto || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!trustsAddress(c)) return { ...own, why: chain.length || protos.length ? 'The connection isn’t from a trusted proxy, so Apiary ignores the headers it received and sends new ones.' : 'The connection isn’t from a trusted proxy, so its own address is the client’s.' };
  if (chain.length > MAX_HOPS || chain.some(s => !parseHop(s))) return { ...own, warn: true, why: chain.length > MAX_HOPS ? `X-Forwarded-For has more than ${MAX_HOPS} addresses, so Apiary ignores the headers and uses the proxy’s own address.` : 'X-Forwarded-For has something that isn’t an address, so Apiary ignores the headers and uses the proxy’s own address.' };
  let i = chain.length - 1;
  while (i > 0 && trustsAddress(parseHop(chain[i]))) i--;
  const hop = chain.length ? chain.length - 1 - i : 0;
  const proto = protos.length === 1 ? protos[0] : protos[protos.length - 1 - hop];
  const scheme = proto === 'http' || proto === 'https' ? proto : 'http';
  const odd = proto && proto !== scheme ? ' X-Forwarded-Proto isn’t http or https, so Apiary keeps the connection’s own scheme.' : '';
  if (!chain.length) return { ...own, scheme, why: `The proxy sent no X-Forwarded-For, so Apiary uses the proxy’s own address.${odd}` };
  return {
    client: hopAddress(chain[i]), scheme, sentFor: [...chain, conn.trim()].join(', '),
    why: `The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary ${hop ? `skips ${plural(hop, 'more trusted address', 'more trusted addresses')} and ` : ''}takes the first address it doesn’t trust.${odd}`,
  };
}

const proxyIsQuiet = p => !p.last || NOW - p.last > DAY;
const proxyLastSeen = p => (!p.last ? status('warn', 'No requests yet') : proxyIsQuiet(p) ? status('warn', `Last ${ago(p.last)}`) : `<span class="ap-muted">${ago(p.last)}</span>`);
route('/trusted-proxies', () => {
  const list = D.trustedProxies, admin = isAdmin(), quiet = list.filter(proxyIsQuiet);
  const add = admin ? `<button class="ap-btn ap-btn-primary" type="button" data-add data-write>${icon('plus')}Add proxy</button>` : '';
  return {
    title: 'Trusted proxies',
    html: `${pageHead({ title: 'Trusted proxies', sub: 'Load balancers, CDNs and other proxies in front of Apiary. Requests from them keep the client’s address in X-Forwarded-For and the scheme in X-Forwarded-Proto, and routes use them for allowlists, rate limits, password tries, HTTPS and the access log.', actions: add })}
${banner('info', '', 'Only public routes use this. The admin interface always checks the connection’s own address, so its allowlist can’t be fooled by a header.')}
${quiet.length ? banner('warn', `${plural(quiet.length, 'range hasn’t', 'ranges haven’t')} sent a request for a day`, `${quiet.map(p => `<span class="ap-data">${esc(p.range)}</span>`).join(', ')}. If the provider changed its ranges, requests from the new ones are treated as coming from the proxy itself. Remove ranges that are no longer in use.`) : ''}
<section class="ap-panel" aria-labelledby="tp-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="tp-t">Proxies</h2><p class="ap-panel-desc">${admin ? 'Changes reach every replica within seconds.' : 'Only Administrators can change them.'} Last request is the latest on any replica since it started.</p></div></div>
${list.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Trusted proxies</caption><thead><tr><th scope="col">Address or range</th><th scope="col">What it is</th><th scope="col">Last request</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${list.map((p, i) => `<tr><td><span class="ap-data">${esc(p.range)}</span>${isPublicRange(p.range) ? ' <span class="ap-tag">Public</span>' : ''}</td><td>${p.note ? esc(p.note) : '<span class="ap-muted">No note</span>'}</td><td>${proxyLastSeen(p)}</td><td class="ap-col-actions">${admin ? `<div class="ap-row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap"><button class="ap-btn ap-btn-sm" type="button" data-edit="${i}" data-write>Edit…</button><button class="ap-btn ap-btn-sm" type="button" data-remove="${i}" data-write>Remove…</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>`
    : emptyState('No trusted proxies', 'Apiary uses the address of each connection, and replaces any X-Forwarded-For it receives. Add your load balancer or CDN if one sits in front of Apiary.', add)}</section>
<section class="ap-panel" aria-labelledby="tr-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="tr-t">Try a request</h2><p class="ap-panel-desc">See which address and scheme routes would use for a request, with the list above. Nothing is sent or saved.</p></div></div>
<div class="ap-panel-body ap-stack"><div class="ap-row" style="gap:12px;align-items:flex-start;flex-wrap:wrap">
<div style="flex:1 1 180px">${field({ name: 'tryConn', label: 'Connection from', value: '173.245.48.10', data: true, attrs: 'autocomplete="off" spellcheck="false"', help: 'The address Apiary sees the request come from.' })}</div>
<div style="flex:2 1 260px">${field({ name: 'tryFor', label: 'X-Forwarded-For received', value: '198.51.100.23, 10.20.30.4', data: true, optional: true, attrs: 'autocomplete="off" spellcheck="false"', help: 'Addresses separated by commas, as the proxy sent them.' })}</div>
<div style="flex:1 1 140px">${field({ name: 'tryProto', label: 'X-Forwarded-Proto received', value: 'https', data: true, optional: true, attrs: 'autocomplete="off" spellcheck="false"' })}</div></div>
<div data-try aria-live="polite"></div></div></section>`,
    mount(el) {
      const btn = $('[data-add]', el);
      if (btn) btn.addEventListener('click', () => proxyDialog(null));
      el.addEventListener('click', e => {
        const ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-remove]');
        if (ed) proxyDialog(D.trustedProxies[+ed.dataset.edit]);
        if (rm) removeProxy(D.trustedProxies[+rm.dataset.remove]);
      });
      const out = $('[data-try]', el);
      const draw = () => {
        const conn = $('#f-tryConn', el).value, r = resolveRequest(conn, $('#f-tryFor', el).value, $('#f-tryProto', el).value);
        out.innerHTML = !r ? `<p class="ap-muted" style="margin:0">${conn.trim() ? 'Enter an IPv4 or IPv6 address, such as 173.245.48.10.' : 'Enter the address the connection comes from.'}</p>`
          : `<dl class="ap-kv"><dt>Client address</dt><dd><span class="ap-data">${esc(r.client)}</span></dd><dt>Scheme</dt><dd><span class="ap-data">${r.scheme}</span></dd><dt>X-Forwarded-For sent on</dt><dd><span class="ap-data">${esc(r.sentFor)}</span></dd><dt>Why</dt><dd>${r.warn ? status('warn', r.why) : esc(r.why)}</dd></dl>`;
        paint();
      };
      el.addEventListener('input', e => { if (/^try/.test(e.target.name)) draw(); });
      draw();
    },
  };
});
function proxyDialog(p) {
  const others = D.trustedProxies.filter(x => x !== p).map(x => x.range);
  const d = dialog({
    title: p ? `Edit ${esc(p.range)}` : 'Add a trusted proxy', backdrop: false,
    body: `<form id="tpx-form" class="ap-form" novalidate style="gap:16px"><div data-summary></div>
${field({ name: 'range', label: 'Address or range', value: p ? p.range : '', data: true, placeholder: '10.20.30.0/24', attrs: 'autocomplete="off" spellcheck="false" autocapitalize="none"', help: 'The address your proxy connects to Apiary from, or the range its provider publishes. IPv4 or IPv6.' })}
${field({ name: 'note', label: 'What it is', value: p ? p.note : '', optional: true, placeholder: 'Load balancer in front of the edge nodes', attrs: 'maxlength="100"', help: 'So whoever reads this later knows why it’s trusted.' })}
<div data-public></div>
<p class="ap-caption" style="margin:0">Only add proxies that replace X-Forwarded-For or add to the end of it, and that reach Apiary over HTTPS or a private network: Apiary believes the scheme they report.</p></form>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="submit" form="tpx-form" data-busy="Saving…" data-write>${p ? 'Save' : 'Add proxy'}</button>`,
  });
  const f = $('#tpx-form', d.el);
  const sync = () => {
    const v = f.elements.range.value.trim();
    $('[data-public]', d.el).innerHTML = !checkProxyRange(v, others) && isPublicRange(v) ? banner('warn', `${esc(v)} is a public range`, 'Anyone who can send requests from it can claim any client address and get past route allowlists. For a CDN or WAF, add only the ranges it publishes for its proxies, and keep them up to date when it changes them.') : '';
    paint();
  };
  f.elements.range.addEventListener('input', sync);
  sync();
  form(f, { range: v => checkProxyRange(v, others) || (!p && D.trustedProxies.length >= MAX_PROXIES ? `Use ${MAX_PROXIES} ranges at most. Combine neighbors into a wider range.` : null) }, {
    verb: p ? 'save it' : 'add it',
    submit: async v => {
      await api();
      const range = v.range.trim(), note = v.note.trim();
      if (p) {
        D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `changed trusted proxy <code>${esc(p.range)}</code>`, meta: `${p.range === range ? '' : `${p.range} → ${range} · `}from 10.0.4.21` });
        Object.assign(p, { range, note }, p.range === range ? {} : { last: null });
      } else {
        D.trustedProxies.push({ range, note, last: null });
        D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `added trusted proxy <code>${esc(range)}</code>`, meta: `${note ? note + ' · ' : ''}from 10.0.4.21` });
      }
      d.close();
      toast(`Requests from ${range} now keep their X-Forwarded-For, on every replica.`, { title: p ? 'Saved' : 'Proxy added' });
      refresh();
    },
  });
}
function removeProxy(p) {
  confirmDialog({
    title: `Stop trusting ${esc(p.range)}?`,
    text: `Requests from it will count as coming from the proxy itself: route allowlists see the proxy’s address, everyone behind it shares one rate limit, and Apiary replaces the X-Forwarded-For it sends on.${p.last && NOW - p.last < HOUR ? ` It sent a request ${ago(p.last)}.` : ''}`,
    confirm: 'Remove proxy', busy: 'Removing…',
    onConfirm: async () => {
      await api();
      D.trustedProxies.splice(D.trustedProxies.indexOf(p), 1);
      D.audit.unshift({ at: NOW, actor: D.me.email, via: 'UI', text: `stopped trusting proxy <code>${esc(p.range)}</code>`, meta: 'From 10.0.4.21' });
      refresh();
      toast(`${p.range} is no longer trusted.`);
    },
  });
}
