/* Replicas, backups and the root key. */
function replicaState(r) {
  const lost = Proto.state.cluster === 'quorum' ? ['edge-1', 'edge-3'] : Proto.state.cluster === 'degraded' ? ['edge-3'] : [];
  if (r.role === 'down') return ['critical', `Missing for 4 min`];
  if (lost.includes(r.name)) return ['critical', 'Unreachable'];
  if (r.role === 'follower') return ['info', r.note];
  return ['ok', r.lag ? `${r.lag} behind` : 'In sync'];
}
route('/replicas', () => ({
  title: 'Replicas',
  html: `${pageHead({ title: 'Replicas', sub: 'Every edge node runs one replica. The 3 voters agree on each change; followers copy them and serve traffic.' })}
<section class="ap-panel" aria-labelledby="rp-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rp-t">Cluster</h2><span class="ap-caption">Leader edge-2 · term 14</span></div><div class="ap-panel-body">${clusterMap()}</div>
<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Replicas</caption><thead><tr><th scope="col">Replica</th><th scope="col">Node</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col" class="ap-num">Log index</th><th scope="col">Version</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.replicas.map(r => { const [tone, text] = replicaState(r); return `<tr><td><div class="ap-cell-main"><span class="ap-data" style="font-weight:500">${r.name}</span><span class="ap-caption ap-data">${r.id}</span></div></td><td class="ap-data ap-muted">${r.node}</td><td>${r.role === 'down' ? 'Follower' : r.role[0].toUpperCase() + r.role.slice(1)}</td><td>${status(tone, text)}${r.role === 'down' ? `<div class="ap-caption">${r.note}</div>` : ''}</td><td class="ap-num">${num(r.index)}</td><td class="ap-data">${r.version}</td><td class="ap-col-actions">${r.role === 'down' ? `<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for ${r.name}" aria-haspopup="menu" aria-expanded="false" data-rep="${r.id}">${icon('ellipsis')}</button>` : ''}</td></tr>`; }).join('')}
</tbody></table></div></section>
<form class="ap-panel" id="mb-form" novalidate aria-labelledby="mb-t"><div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="mb-t">Membership</h2><p class="ap-panel-desc">New replicas join as followers on their own. A replica that stays missing is removed, so it doesn't count against the cluster.</p></div></div>
<div class="ap-panel-body"><div style="max-width:300px">${field({ name: 'removal', label: 'Remove missing replicas after', value: D.cluster.removalMinutes, data: true, after: 'minutes', attrs: 'inputmode="numeric"', help: 'From 5 to 1440 minutes. Voters are never removed on their own.' })}</div></div>
<div class="ap-panel-foot ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="submit" data-write>Save</button></div></form>
<section class="ap-panel ap-panel-danger" aria-labelledby="fr-t"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="fr-t">Danger zone</h2></div><div class="ap-panel-body"><div class="ap-list"><div class="ap-list-row"><div class="ap-list-text"><strong>Recover from a lost majority</strong><span class="ap-muted">Only when 2 of the 3 voters are gone for good. The surviving replica becomes the only voter; anything only the lost voters had is lost.</span></div><button class="ap-btn ap-btn-danger" type="button" data-recover>Start recovery…</button></div></div></div></section>`,
  mount(el) {
    form($('#mb-form', el), { removal: v => (!/^\d+$/.test(String(v).trim()) || +v < 5 || +v > 1440 ? 'Enter a whole number of minutes from 5 to 1440.' : null) }, {
      submit: async v => { await api(); D.cluster.removalMinutes = +v.removal; toast(`Missing replicas are removed after ${plural(+v.removal, 'minute')}.`, { title: 'Membership saved' }); },
    });
    $$('[data-rep]', el).forEach(b => b.addEventListener('click', () => {
      const r = D.replicas.find(x => x.id === b.dataset.rep);
      menu(b, [{ icon: 'user-minus', label: 'Remove now…', danger: true, write: true, run: () => confirmDialog({ title: `Remove ${r.name} now?`, text: `It has been missing for 4 minutes and would be removed in 11. If ${r.node} comes back, its replica joins again as a new follower.`, confirm: 'Remove replica', busy: 'Removing…', onConfirm: async () => { await api(); D.replicas.splice(D.replicas.indexOf(r), 1); refresh(); toast(`${r.name} removed from the cluster.`); } }) }], { label: 'Actions for ' + r.name });
    }));
    $('[data-recover]', el).addEventListener('click', recoverWizard);
  },
}));

/* Forced recovery: explained, checked and typed, because it can lose data */
function recoverWizard() {
  if (Proto.state.cluster !== 'quorum') {
    return dialog({ title: "Recovery isn't needed", mark: ['info', 'info'], role: 'alertdialog', describe: true, body: `<p style="margin:0">${Proto.state.cluster === 'healthy' ? 'All 3 voters' : '2 of 3 voters'} can be reached, so the cluster still agrees on changes. Recovery is only for when a majority is lost for good.</p><p class="ap-caption" style="margin:0">Prototype: set Cluster to "No quorum" to try it.</p>`, foot: '<button class="ap-btn ap-btn-primary" type="button" data-close>OK</button>' });
  }
  const d = dialog({
    title: 'Recover the cluster from edge-2', size: 'lg', role: 'alertdialog', mark: ['critical', 'triangle-alert'], backdrop: false,
    body: `<ol class="ap-steps" aria-label="Recovery"><li class="ap-step" aria-current="step">Check</li><li class="ap-step">Confirm</li><li class="ap-step">Recover</li></ol>
<p style="margin:0">edge-1 and edge-3 can't be reached. If they can come back, wait for them instead: recovery can't be undone.</p>
<div class="ap-stack" style="gap:10px">
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I checked that swarm-node-1 and swarm-node-3 are gone, not only slow or restarting</span></label>
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I understand that changes only edge-1 or edge-3 had are lost</span></label>
<label class="ap-choice"><input class="ap-check" type="checkbox" data-c><span>I have a recent backup, or accept running without one</span></label></div>`,
    foot: `<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-primary" type="button" data-next disabled>Continue</button>`,
  });
  const boxes = $$('[data-c]', d.el), next = $('[data-next]', d.el);
  boxes.forEach(b => b.addEventListener('change', () => { next.disabled = !boxes.every(x => x.checked); }));
  next.addEventListener('click', () => {
    d.body(`<ol class="ap-steps" aria-label="Recovery"><li class="ap-step ap-step-done">Check</li><li class="ap-step" aria-current="step">Confirm</li><li class="ap-step">Recover</li></ol>
<p style="margin:0">edge-2 becomes the only voter, and changes resume. Then add voters back by deploying the stack again on 3 nodes.</p>
<div class="ap-field"><label class="ap-label" for="rc-in">Type <span class="ap-data">${esc(D.cluster.name)}</span> to confirm</label><input class="ap-input ap-data" id="rc-in" autocomplete="off" spellcheck="false"></div><div data-alert></div>`);
    d.foot(`<button class="ap-btn ap-btn-ghost" type="button" data-close>Cancel</button><button class="ap-btn ap-btn-danger" type="button" data-go disabled>Recover cluster</button>`);
    const input = $('#rc-in', d.el), goBtn = $('[data-go]', d.el);
    input.focus();
    input.addEventListener('input', () => { goBtn.disabled = input.value.trim() !== D.cluster.name; });
    goBtn.addEventListener('click', async () => {
      try {
        await run(goBtn, 'Recovering…', async () => { await wait(1600); if (Proto.state.network === 'failing') throw new ApiError("Couldn't reach edge-2", "The recovery didn't start. Nothing changed; try again."); });
        Proto.set('cluster', 'healthy');
        d.close();
        refresh();
        toast('edge-2 is the only voter, and changes are accepted again. Deploy the stack on 3 nodes to add voters back.', { title: 'Cluster recovered' });
      } catch (err) { $('[data-alert]', d.el).innerHTML = banner('critical', esc(err.title), esc(err.detail)); paint(); }
    });
  });
}

route('/backups', () => {
  const last = D.backups[0];
  const old = !last || NOW - last.at > 7 * DAY;
  return {
    title: 'Backups',
    html: `${pageHead({ title: 'Backups', sub: 'A backup holds every route, certificate, user and setting. Take one before each upgrade and after big changes.', actions: `<button class="ap-btn ap-btn-primary" type="button" data-now data-write>${icon('archive')}Back up now</button>` })}
${old ? banner('warn', last ? `The last backup is ${ago(last.at)}` : 'There are no backups yet', 'If the cluster were lost now, every change since then would be lost with it.') : ''}
${banner('info', 'Keep the root key with your backups', "Backups are encrypted with the root key. Without it, a backup can't be restored, so store a copy of the key apart from the cluster.", '<a href="#/root-key">About the root key</a>')}
<section class="ap-panel">${D.backups.length ? `<div class="ap-table-wrap"><table class="ap-table"><caption class="ap-sr">Backups, newest first</caption><thead><tr><th scope="col">Taken</th><th scope="col">Kind</th><th scope="col">By</th><th scope="col" class="ap-num">Size</th><th scope="col" class="ap-num">Log index</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead><tbody>
${D.backups.map(b => `<tr><td><div class="ap-cell-main"><span class="ap-data">${fmtDate(b.at)} UTC</span><span class="ap-caption">${ago(b.at)}</span></div></td><td>${b.kind}</td><td class="ap-muted">${esc(b.by)}</td><td class="ap-num">${b.size.toFixed(1)} MB</td><td class="ap-num">${num(b.index)}</td><td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for the backup of ${fmtDate(b.at)}" aria-haspopup="menu" aria-expanded="false" data-bk="${b.id}">${icon('ellipsis')}</button></td></tr>`).join('')}
</tbody></table></div>` : emptyState('No backups yet', 'Take the first one now. It takes a few seconds and doesn’t interrupt traffic.', `<button class="ap-btn ap-btn-primary" type="button" data-now data-write>${icon('archive')}Back up now</button>`)}</section>`,
    mount(el) {
      $$('[data-now]', el).forEach(btn => btn.addEventListener('click', () => quick(btn, 'Backing up…', () => api('write', Proto.state.network === 'slow' ? 3200 : 1400), () => {
        const b = { id: 'b' + Date.now().toString(36), at: NOW, size: 2.5, by: D.me.email, kind: 'Manual', index: 184223 };
        D.backups.unshift(b);
        refresh();
        toast('2.5 MB, encrypted with the root key.', { title: 'Backup taken', action: 'Download', onAction: () => toast(`apiary-${D.cluster.name}-${fmtDate(NOW, false)}.tar.gz is downloading.`, { tone: 'info' }) });
      })));
      $$('[data-bk]', el).forEach(btn => btn.addEventListener('click', () => {
        const b = D.backups.find(x => x.id === btn.dataset.bk);
        menu(btn, [
          { icon: 'download', label: 'Download', run: () => toast(`apiary-${D.cluster.name}-${fmtDate(b.at, false)}.tar.gz is downloading.`, { tone: 'info' }) },
          { icon: 'rotate-ccw', label: 'Restore…', write: true, run: () => confirmDialog({
            title: `Restore the backup of ${fmtDate(b.at)}?`,
            text: `Every replica goes back to how the cluster was on <strong>${fmtDate(b.at)} UTC</strong>. Routes, certificates and users changed since then go back too; changes made after it are lost. Traffic continues during the restore.`,
            type: D.cluster.name, check: 'I took a backup of the current state first, or don’t need it', confirm: 'Restore backup', busy: 'Restoring…',
            onConfirm: async () => { await api('write', 2000); refresh(); toast(`The cluster is back to ${fmtDate(b.at)} UTC.`, { title: 'Backup restored' }); },
          }) },
          '-',
          { icon: 'trash-2', label: 'Delete…', danger: true, write: true, run: () => confirmDialog({ title: 'Delete this backup?', text: `The backup of ${fmtDate(b.at)} is deleted from the cluster. Copies you downloaded aren't affected.`, confirm: 'Delete backup', busy: 'Deleting…', onConfirm: async () => { await api(); D.backups.splice(D.backups.indexOf(b), 1); refresh(); toast('Backup deleted.'); } }) },
        ], { label: 'Backup actions' });
      }));
    },
  };
});

route('/root-key', () => {
  const k = D.rootKey, rot = k.rotation;
  const steps = ['New key created', 'Rolling update', 'Old key forgotten'];
  return {
    title: 'Root key',
    html: `${pageHead({ title: 'Root key', sub: 'The root key encrypts private keys, passwords and backups at rest. Swarm gives it to every replica as a secret; Apiary never stores it.' })}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px;align-items:start">
<section class="ap-panel" aria-labelledby="rk1"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rk1">Current key</h2>${status('ok', 'In use')}</div><div class="ap-panel-body"><dl class="ap-kv"><dt>Swarm secret</dt><dd class="ap-data">${k.name}</dd><dt>Created</dt><dd><span class="ap-data">${fmtDate(k.created, false)}</span>, ${ago(k.created)}</dd><dt>Replicas using it</dt><dd>${rot ? `${rot.done} of ${rot.of}` : '5 of 5'}</dd></dl></div></section>
<section class="ap-panel" aria-labelledby="rk2"><div class="ap-panel-head"><h2 class="ap-h ap-h-3" id="rk2">Rotation</h2>${rot ? status('info', 'In progress') : status('off', 'Not running')}</div><div class="ap-panel-body ap-stack">
${rot ? `<ol class="ap-steps" aria-label="Root key rotation">${steps.map((s, i) => `<li class="ap-step${i < rot.step ? ' ap-step-done' : ''}"${i === rot.step ? ' aria-current="step"' : ''}>${s}</li>`).join('')}</ol>
${rot.step === 1 ? `<div class="ap-meter ap-meter-info"><div class="ap-meter-head"><span>Replicas on <span class="ap-data">apiary_root_key_3</span></span><span class="ap-data">${rot.done} of ${rot.of}</span></div><div class="ap-meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="${rot.of}" aria-valuenow="${rot.done}" aria-label="Replicas on the new root key"><div class="ap-meter-fill" style="width:${rot.done / rot.of * 100}%"></div></div></div>
<p class="ap-caption" style="margin:0">Swarm is restarting replicas one by one. Traffic continues.</p><div><button class="ap-btn" type="button" data-check>${icon('refresh-cw')}Check again</button></div>`
    : `<p style="margin:0" class="ap-muted">Every replica uses the new key. Forget the old one so nothing can decrypt with it any more.</p><div><button class="ap-btn ap-btn-primary" type="button" data-forget data-write>Forget the old key</button></div>`}`
    : `<p style="margin:0" class="ap-muted">Rotate the key once a year, or at once if it may have leaked.</p>
<div class="ap-field"><span class="ap-label">1. Create the new key on a manager node</span><div class="ap-copy"><code>docker run --rm datapoint/apiary:${D.cluster.version} secrets init | docker secret create apiary_root_key_4 -</code><button class="ap-btn ap-btn-sm" type="button" data-copy>${icon('copy')}<span>Copy</span></button></div><span class="ap-help">2. Change the secret's name in your compose file, then run <span class="ap-code">docker stack deploy</span>. Apiary notices and re-encrypts everything.</span></div>`}
</div></section></div>`,
    mount(el) {
      const c = $('[data-check]', el);
      if (c) c.addEventListener('click', () => quick(c, 'Checking…', () => api('read', 900), () => { rot.done = rot.of; rot.step = 2; refresh(); toast('All replicas use apiary_root_key_3.', { title: 'Rolling update finished' }); }));
      const f = $('[data-forget]', el);
      if (f) f.addEventListener('click', () => confirmDialog({
        title: 'Forget apiary_root_key_2?', text: 'Backups taken before the rotation can then only be restored with a copy of the old key. Remove the old secret from Swarm afterwards.',
        confirm: 'Forget the old key', busy: 'Forgetting…', onConfirm: async () => { await api(); Object.assign(k, { name: 'apiary_root_key_3', created: NOW - 5 * DAY, rotation: null }); refresh(); toast('Run docker secret rm apiary_root_key_2 on a manager node to finish.', { title: 'Rotation finished' }); },
      }));
    },
  };
});
