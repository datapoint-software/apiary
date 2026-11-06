"""Writes components/<Name>/preview.html and README.md for the Apiary Design System."""
import os
import sys

ROOT = sys.argv[1]
LUCIDE = "https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"


def icon(name):
    return f'<i data-lucide="{name}" class="ap-icon" aria-hidden="true"></i>'


def page(name, group, height, body, extra_style="", width=None, subtitle=None):
    attrs = f'group="{group}" height={height}'
    if width:
        attrs += f" width={width}"
    if subtitle:
        attrs += f' subtitle="{subtitle}"'
    return f"""<!-- @dsCard {attrs} -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{name} — preview</title>
<style>
html, body {{ margin: 0; }}
body {{ background: var(--ground); }}
.pv {{ padding: 20px; display: flex; flex-direction: column; gap: 16px; }}
{extra_style}
</style>
</head>
<body class="ap">
<div class="pv">
{body}
</div>
<script src="{LUCIDE}"></script>
<script>if (window.lucide) lucide.createIcons();</script>
</body>
</html>
"""


C = {}

C["Button"] = ("Actions", 150, f"""
<div class="ap-row">
  <button class="ap-btn ap-btn-primary" type="button">{icon("plus")}Add route</button>
  <button class="ap-btn" type="button">Export backup</button>
  <button class="ap-btn ap-btn-ghost" type="button">Cancel</button>
  <button class="ap-btn ap-btn-danger" type="button">{icon("trash-2")}Delete route</button>
  <button class="ap-btn ap-btn-icon ap-btn-ghost" type="button" aria-label="Refresh">{icon("refresh-cw")}</button>
</div>
<div class="ap-row">
  <button class="ap-btn ap-btn-sm" type="button">Purge cache</button>
  <button class="ap-btn ap-btn-lg ap-btn-primary" type="button">Create administrator</button>
  <button class="ap-btn" type="button" disabled>Renew now</button>
  <span class="ap-caption">Renewal is paused while the cluster has no majority.</span>
</div>
<div class="ap-row">
  <button class="ap-btn ap-btn-primary" type="button" disabled aria-busy="true">Saving…</button>
  <button class="ap-btn ap-btn-danger" type="button">Start recovery…</button>
</div>
""", """# Button

Buttons start an action; their label says exactly what happens.

- **Shape:** every button is a pill (`radius-pill`), filled, with no border.
- **Primary** (`ap-btn ap-btn-primary`): honey fill, `on-honey` text. At most one per view: the action the page exists for (**Add route**, **Save changes**).
- **Secondary** (`ap-btn`): a `sunken` fill, for everything else that changes something.
- **Ghost** (`ap-btn ap-btn-ghost`): text in `honey-text` with no fill, for Cancel, Close and links that act; icon-only toolbar buttons.
- **Danger** (`ap-btn ap-btn-danger`): the destructive action itself, in a confirmation dialog, or a button in a danger zone that opens one ("Start recovery…", ending in "…").
- **Sizes:** `ap-btn-sm` (28px) in tables and filter bars, default 36px, `ap-btn-lg` (44px) on sign-in and setup screens.
- **Icon only** (`ap-btn-icon`): needs `aria-label` and a tooltip.
- **Busy:** while its action runs, a button is disabled with `aria-busy="true"` and its label says what is happening: "Saving…", "Working…", "Checking…".

**Copy:** verb plus object, sentence case: **Add route**, **Rotate root key**, **Delete route**. Never "OK", "Submit" or "Yes" on their own.

**Disabled:** use `disabled` and always explain why in a caption or tooltip next to it.

**In the library:** the `apButton` directive on a `<button>` or `<a>`: `apButton="primary"`, `"ghost"` or `"danger"`, and `size="small"`. Large buttons add `ap-btn-lg` themselves.

**The consumer provides:** the label, an optional Lucide icon placed before it, and the handler.
""")

C["Menu"] = ("Actions", 280, f"""
<div class="ap-row" style="align-items:flex-start;gap:24px">
  <div class="ap-menu" role="menu" aria-label="Account" style="min-width:240px">
    <div class="ap-menu-head"><span class="ap-avatar ap-avatar-lg" aria-hidden="true">AS</span><span><strong>Ana Silva</strong><span class="ap-secondary">ana@example.com</span><span class="ap-secondary">Administrator</span></span></div>
    <div class="ap-menu-sep" role="separator"></div>
    <a class="ap-menu-item" role="menuitem" href="#">{icon("user-round")}Your account</a>
    <a class="ap-menu-item" role="menuitem" href="#">{icon("shield-check")}Security</a>
    <a class="ap-menu-item" role="menuitem" href="#">{icon("monitor-smartphone")}Active sessions</a>
    <div class="ap-menu-sep" role="separator"></div>
    <button class="ap-menu-item" role="menuitem" type="button">{icon("log-out")}Sign out</button>
  </div>
  <div class="ap-menu" role="menu" aria-label="Route actions">
    <button class="ap-menu-item" role="menuitem" type="button">{icon("pencil")}Edit route</button>
    <button class="ap-menu-item" role="menuitem" type="button">{icon("eraser")}Purge cache<span class="ap-kbd">P</span></button>
    <div class="ap-menu-sep" role="separator"></div>
    <button class="ap-menu-item ap-menu-danger" role="menuitem" type="button">{icon("trash-2")}Delete route…</button>
  </div>
</div>
""", """# Menu

A menu lists actions or places, opened from a button: in the app, the account menu behind the avatar in the top bar.

- Menus (`ap-menu`) are a solid `surface` with `shadow-float`: they float above content, and nothing shows through. The highlighted item fills with honey, like a macOS menu.
- The account menu starts with a head (`ap-menu-head`): a large avatar, the name, the email and the role.
- Items are links when they go somewhere (`a.ap-menu-item`) and buttons when they act. Order by frequency; Sign out goes last, after a separator.
- Destructive items go last, after a separator, in `ap-menu-danger`, and end with "…" because they open a confirmation.
- Menus close on Escape, on selection and on a click outside; arrow keys move between items. The app uses the Angular CDK menu (`cdkMenu`, `cdkMenuItem`).
- The search results in the top bar reuse `ap-menu` as a `listbox`.
- **Not used in the app yet:** a ⋯ menu per row (tables use inline icon buttons), keyboard shortcuts (`ap-kbd`) and the tooltip (`ap-tooltip`).

**The consumer provides:** the items, their handlers, and the anchor button with `aria-haspopup="menu"`.
""")

C["Field"] = ("Forms", 330, f"""
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
  <div class="ap-field">
    <label class="ap-label" for="f1">Hostname</label>
    <input class="ap-input ap-data" id="f1" value="shop.example.com">
    <span class="ap-help">The name clients use. Wildcards need an uploaded certificate.</span>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f2">Target</label>
    <div class="ap-affix"><span class="ap-affix-text">http://</span><input class="ap-input ap-data" id="f2" value="shop" aria-label="Target host"><span class="ap-affix-text">:8080</span></div>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f3">Certificate</label>
    <select class="ap-select" id="f3"><option>Automatic (Let's Encrypt)</option><option>*.example.com (uploaded)</option></select>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f4">Path prefix <span class="ap-optional">(optional)</span></label>
    <input class="ap-input ap-data" id="f4" placeholder="/api">
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f5">Target port</label>
    <input class="ap-input ap-data" id="f5" value="80800" aria-invalid="true" aria-describedby="e5">
    <span class="ap-error" id="e5">{icon("circle-alert")}Ports go from 1 to 65535.</span>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f6">Node</label>
    <input class="ap-input ap-data" id="f6" value="edge-2" disabled>
    <span class="ap-help">Set by Swarm. Change the placement in the compose file.</span>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f7">Password</label>
    <div class="ap-affix"><input class="ap-input" id="f7" type="password" value="amber-orchid-river"><span class="ap-affix-text"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" aria-label="Show password" aria-pressed="false">Show</button></span></div>
  </div>
  <div class="ap-field">
    <label class="ap-label" for="f8">Allowed addresses <span class="ap-optional">(optional)</span></label>
    <textarea class="ap-textarea ap-data" id="f8" rows="3">10.0.0.0/8
2001:db8::/32</textarea>
    <span class="ap-help">One address or range per line. Anyone else gets a 403.</span>
  </div>
</div>
""", """# Field

A field is a label, a control and, when needed, help or an error, stacked in that order.

- The label (`ap-label`) is always visible above the control. A placeholder never replaces it.
- Mark optional fields with `<span class="ap-optional">(optional)</span>`; required fields get no asterisk.
- Technical values (hostnames, IPs, ports, paths) use `ap-input ap-data` so they render in the data face.
- Prefixes and suffixes (`ap-affix`) show fixed parts of a value, such as a scheme, a port or a unit ("a minute"). A small ghost button can sit in a suffix, such as a password's **Show** (`ap-password-reveal`, `aria-pressed`).
- Lists of values, one per line, use `ap-textarea` with the data face.
- Errors follow Validation: shown once you've left the field, then updated as you type. The error (`ap-error`) goes below the help, says what is wrong and how to fix it, and the input gets `aria-invalid="true"` and `aria-describedby`.
- Disabled fields explain why in their help text.
- Help is usually plain text. When it points somewhere the person may need to go, such as the page that changes how the field behaves, it can hold a link; keep it to one, at the end of the help.
- One field per row under 640px; two columns at most on wider screens, only for natural pairs.

**In the library:** `<ap-field label help optional summaryLabel [field]>` wraps one control. It generates the ids, links label, help and error, shows "Checking…" while a server check runs, and gives the error summary its label (`summaryLabel`, when the visible label is ambiguous). Help that needs markup, such as a link, goes in an element marked `apFieldHelp` inside the field; it follows any `help` text and is linked to the control the same way.

**The consumer provides:** the label, the control, its help text (or `apFieldHelp` content) and the form field it binds to.
""")

C["Choice"] = ("Forms", 170, f"""
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
  <label class="ap-choice"><input class="ap-switch" type="checkbox" checked><span class="ap-choice-text"><span>Sticky sessions</span><span class="ap-help">Keeps each client on the group it first got.</span></span></label>
  <label class="ap-choice"><input class="ap-switch" type="checkbox"><span class="ap-choice-text"><span>Compression</span><span class="ap-help">Off by default. Only for public, static content.</span></span></label>
  <div class="ap-stack" style="gap:8px">
    <label class="ap-choice"><input class="ap-check" type="checkbox" checked>HTTP/2</label>
    <label class="ap-choice"><input class="ap-check" type="checkbox" checked>HTTP/3</label>
    <label class="ap-choice"><input class="ap-check" type="checkbox">WebSockets</label>
  </div>
  <div class="ap-stack" style="gap:8px" role="radiogroup" aria-label="Certificate source">
    <label class="ap-choice"><input class="ap-radio" type="radio" name="src" checked>Automatic</label>
    <label class="ap-choice"><input class="ap-radio" type="radio" name="src">Uploaded certificate</label>
  </div>
</div>
""", """# Choice

Checkboxes, radio buttons and switches for options a person turns on or picks.

- **Switch** (`ap-switch`): a setting that takes effect when saved, such as a per-route feature. Pair it with a one-line help text that says what it does and, for risky options, when not to use it.
- **Checkbox** (`ap-check`): several independent options from a list.
- **Radio** (`ap-radio`): one option from two to five; more than five becomes a select.
- The whole label is clickable: wrap control and text in `<label class="ap-choice">`.
- Checked boxes and radios fill with `honey`; switches turn `ok` green when on, like iOS.

**The consumer provides:** the name, label, optional help text, and the checked state.
""")

C["Segmented"] = ("Forms", 90, """
<div class="ap-row" style="gap:16px">
  <div class="ap-seg" role="group" aria-label="Time range">
    <button type="button" aria-pressed="false">1 h</button>
    <button type="button" aria-pressed="true">24 h</button>
    <button type="button" aria-pressed="false">7 d</button>
    <button type="button" aria-pressed="false">30 d</button>
  </div>
  <div class="ap-seg" role="group" aria-label="Protocol">
    <button type="button" aria-pressed="true">HTTP</button>
    <button type="button" aria-pressed="false">TCP</button>
    <button type="button" aria-pressed="false">UDP</button>
  </div>
</div>
""", """# Segmented

A segmented control switches a view between two to five short options, such as a time range or a filter.

- It changes what is shown, never data: switching it saves nothing.
- Labels are one or two words. Units are spelled the same everywhere: `1 h`, `24 h`, `7 d`.
- The selected option has `aria-pressed="true"`.

**The consumer provides:** the options and the selected one.
""")

C["Status"] = ("Status", 120, """
<div class="ap-row" style="gap:20px">
  <span class="ap-status ap-status-ok"><span class="ap-dot" aria-hidden="true"></span>Healthy</span>
  <span class="ap-status ap-status-warn"><span class="ap-dot" aria-hidden="true"></span>Expires in 9 days</span>
  <span class="ap-status ap-status-critical"><span class="ap-dot" aria-hidden="true"></span>Down</span>
  <span class="ap-status ap-status-info"><span class="ap-dot" aria-hidden="true"></span>Catching up</span>
  <span class="ap-status ap-status-off"><span class="ap-dot" aria-hidden="true"></span>Disabled</span>
  <span class="ap-status ap-status-honey"><span class="ap-dot" aria-hidden="true"></span>Leader</span>
</div>
<div class="ap-row" style="gap:20px">
  <span class="ap-status ap-status-ok"><span class="ap-dot ap-dot-ring" aria-hidden="true"></span>Pending approval</span>
</div>
""", """# Status

A status is a small dot and a word.

- Always both: the dot for scanning, the word for meaning. `ok` and `critical` have similar lightness, so color alone is never enough.
- Tones: `ap-status-ok` (Healthy, Valid, Approved), `ap-status-warn` (Degraded, Expires in N days, In maintenance), `ap-status-critical` (Down, Failed, Refused), `ap-status-info` (Catching up, Joining), `ap-status-off` (Disabled, Not configured).
- Words describe the state from the user's side: "Expires in 9 days", not "WARN".
- **Not used in the app yet:** `ap-status-honey` (for the leader) and the ring (`ap-dot-ring`, not yet in effect: pending approval, waiting for a deploy). The styles exist; the `<ap-status>` component's tones don't include them.

**In the library:** `<ap-status tone="ok">Healthy</ap-status>`, with the tones `ok`, `info`, `warn`, `critical` and `off`.

**The consumer provides:** the tone and the word.
""")

C["Tag"] = ("Status", 90, """
<div class="ap-row">
  <span class="ap-tag">HTTP/2</span>
  <span class="ap-tag">HTTP/3</span>
  <span class="ap-tag">WebSockets</span>
  <span class="ap-tag">TCP 10022</span>
  <span class="ap-tag ap-tag-honey">Canary 10%</span>
  <span class="ap-tag">Sticky</span>
</div>
""", """# Tag

Tags list short facts about an object, such as a route's protocols or enabled features.

- A word or two on a `sunken` fill, no sentence.
- `ap-tag-honey` marks the one fact that changes how traffic flows right now (a canary split). Use at most one per row.
- Tags are not buttons and not statuses. A state uses Status.

**The consumer provides:** the text.
""")

C["Banner"] = ("Status", 330, f"""
<div class="ap-banner ap-banner-critical" role="alert">{icon("circle-alert")}<div class="ap-banner-body"><span class="ap-banner-title">Writes are paused</span><span>Only 1 of 3 voters is reachable, so route, user and certificate changes can't be saved. Traffic keeps flowing with the last known routes.</span><div class="ap-banner-actions"><a href="#">What to do when the majority is lost</a></div></div></div>
<div class="ap-banner ap-banner-warn">{icon("triangle-alert")}<div class="ap-banner-body"><span class="ap-banner-title">2 certificates expire in less than 14 days</span><span>Automatic renewal failed for <span class="ap-code">legacy.example.com</span>: the HTTP-01 challenge got a 404.</span></div></div>
<div class="ap-banner ap-banner-info">{icon("info")}<div class="ap-banner-body"><span>Rotating the root key: 2 of 3 replicas run the new key.</span></div></div>
<div class="ap-banner ap-banner-ok">{icon("circle-check")}<div class="ap-banner-body"><span>Backup exported. It contains private keys: store it encrypted.</span></div></div>
""", """# Banner

A banner reports a condition that affects the whole page or cluster and stays until the condition ends.

- **Critical:** something is not working (writes paused, a replica down, an action that failed). Give it `role="alert"` when it appears after the page loaded, so screen readers announce it.
- **Warn:** something will stop working unless someone acts (certificates expiring, rotation stalled).
- **Info:** a process is running (rotation in progress, an update rolling out).
- **Ok:** a lasting confirmation that needs a follow-up, such as how to store a backup. A short confirmation is a Toast instead.
- Title says what is happening; the body says the consequence and what still works; an optional link says what to do.
- At most two banners per page, most severe first. Inside a dialog, a critical banner reports why its action failed.
- The icon follows the tone: Lucide `circle-alert`, `triangle-alert`, `info` and `circle-check`.

**In the library:** `<ap-banner tone heading role>` picks the icon; actions go in an element marked `bannerActions`.

**The consumer provides:** the tone, the title, body, optional actions and, when it should be announced, the role.
""")

C["Toast"] = ("Status", 200, f"""
<div class="ap-toast ap-toast-ok" role="status">{icon("circle-check")}<span class="ap-toast-text"><span class="ap-toast-title">Route saved</span>Applied on 4 of 5 replicas.</span><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon ap-toast-close" type="button" aria-label="Dismiss">{icon("x")}</button></div>
<div class="ap-toast ap-toast-info" role="status">{icon("info")}<span class="ap-toast-text">shop.example.com disabled.</span><button class="ap-btn ap-btn-sm" type="button">Undo</button><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon ap-toast-close" type="button" aria-label="Dismiss">{icon("x")}</button></div>
<div class="ap-toast ap-toast-error" role="alert">{icon("circle-alert")}<span class="ap-toast-text"><span class="ap-toast-title">Couldn't reach the leader</span>edge-2 didn't answer within 5 seconds. Nothing was changed.</span><button class="ap-btn ap-btn-sm" type="button">Try again</button><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon ap-toast-close" type="button" aria-label="Dismiss">{icon("x")}</button></div>
""", """# Toast

A toast reports the result of an action that didn't open a form or dialog: a save, a purge, a quick action from a menu.

- **Success** (`ap-toast-ok`) repeats the verb in the past tense ("Route saved") and adds the fact that matters in a cluster: how many replicas applied it. Closes after 5 seconds, 8 with an action.
- **Info** (`ap-toast-info`) for neutral news, often with **Undo** for a reversible change.
- **Error** (`ap-toast-error`, `role="alert"`) only for quick actions that failed. It stays until dismissed and offers **Try again**. Errors in a form appear in the form instead, so what was typed is kept next to the problem.
- At most one action, and always a close button. Hovering or focusing a toast pauses its timer; it starts again once neither the pointer nor focus is on it.
- Stack bottom-right in `ap-toasts`, newest last, inside a polite live region.

**The consumer provides:** the tone, an optional title, the message and an optional action.
""")

C["Meter"] = ("Status", 200, """
<div class="ap-meter">
  <div class="ap-meter-head"><span class="ap-data">shop.example.com</span><span class="ap-status ap-status-ok"><span class="ap-dot" aria-hidden="true"></span>61 days left</span></div>
  <div class="ap-meter-track" role="meter" aria-valuemin="0" aria-valuemax="90" aria-valuenow="61" aria-label="Days left on certificate"><div class="ap-meter-fill" style="width:68%"></div></div>
</div>
<div class="ap-meter ap-meter-warn">
  <div class="ap-meter-head"><span class="ap-data">legacy.example.com</span><span class="ap-status ap-status-warn"><span class="ap-dot" aria-hidden="true"></span>9 days left</span></div>
  <div class="ap-meter-track" role="meter" aria-valuemin="0" aria-valuemax="90" aria-valuenow="9" aria-label="Days left on certificate"><div class="ap-meter-fill" style="width:10%"></div></div>
</div>
<div class="ap-meter ap-meter-info">
  <div class="ap-meter-head"><span>Root key rotation</span><span class="ap-data">2 of 3 replicas</span></div>
  <div class="ap-meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="2" aria-label="Replicas on the new root key"><div class="ap-meter-fill" style="width:66.6%"></div></div>
</div>
""", """# Meter

A meter shows how much of something is left or done: days until a certificate expires, replicas on a new key.

- The number is always written next to the bar; the bar is for comparing rows at a glance.
- Tone follows the status: `ok` with more than 30 days left, `ap-meter-warn` under 30, `ap-meter-critical` under 7. Progress uses `ap-meter-info`.
- Use `role="meter"` for amounts and `role="progressbar"` for processes, with the `aria-value*` attributes.

**The consumer provides:** the label, the value, its maximum and the tone.
""")


def spark(values, w=220, h=36):
    lo, hi = min(values), max(values)
    pad = 3
    xs = [round(i * (w / (len(values) - 1)), 1) for i in range(len(values))]
    ys = [round(h - pad - (v - lo) / (hi - lo) * (h - 2 * pad), 1) for v in values]
    line = "M" + " L".join(f"{x},{y}" for x, y in zip(xs, ys))
    area = line + f" L{w},{h} L0,{h} Z"
    return (f'<svg class="ap-spark" viewBox="0 0 {w} {h}" preserveAspectRatio="none" aria-hidden="true">'
            f'<line class="ap-spark-grid" x1="0" y1="{h}" x2="{w}" y2="{h}"/>'
            f'<path class="ap-spark-area" d="{area}"/><path class="ap-spark-line" d="{line}" vector-effect="non-scaling-stroke"/>'
            f'<circle class="ap-spark-end" cx="{xs[-1]}" cy="{ys[-1]}" r="3.5"/></svg>')


REQ = [9.1, 9.4, 9.0, 8.7, 9.3, 10.2, 11.0, 11.6, 12.1, 11.8, 12.4, 12.9, 12.2, 12.48]
LAT = [41, 39, 44, 42, 40, 38, 47, 52, 45, 43, 41, 40, 42, 39]
ERR = [0.4, 0.3, 0.5, 0.3, 0.2, 0.3, 0.9, 1.4, 0.6, 0.4, 0.3, 0.3, 0.2, 0.2]

STATS = f"""
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
  <div class="ap-panel ap-stat"><span class="ap-overline">Requests</span><span class="ap-stat-value">12 480<span class="ap-stat-unit">/min</span></span><span class="ap-stat-delta">Up 18% on the previous 24 h</span>{spark(REQ)}</div>
  <div class="ap-panel ap-stat"><span class="ap-overline">p95 latency</span><span class="ap-stat-value">39<span class="ap-stat-unit">ms</span></span><span class="ap-stat-delta">Peak 52 ms at 09:00 UTC</span>{spark(LAT)}</div>
  <div class="ap-panel ap-stat"><span class="ap-overline">5xx responses</span><span class="ap-stat-value">0.2<span class="ap-stat-unit">%</span></span><span class="ap-stat-delta">Peak 1.4% at 08:00 UTC</span>{spark(ERR)}</div>
</div>
"""

C["Stat"] = ("Data", 190, STATS, """# Stat

A stat shows one current number, what it is compared with, and its recent trend.

- Label in `overline`, value in `data-lg` (the display face, tabular figures), unit after the value in `ink-3`, comparison in one plain sentence.
- The sparkline draws the selected time range on one scale: a honey line over a `honey-soft` area, a baseline, and a dot on the latest value. No axes: the sentence carries the scale.
- Use stats only where the number is the point: traffic, latency, errors. Not for counts that a table already shows.
- Three or four per row at most.

**The consumer provides:** label, value, unit, comparison sentence and the series.
""")

ROUTES = [
    ("Shop", [
        ("shop.example.com", "/", "shop-v1:8080, shop-v2:8080 · canary", "ok", "Healthy", "Automatic", "1 284", "2 h ago by ana@example.com"),
        ("checkout.example.com", "/", "checkout:8080", "ok", "Healthy", "Automatic", "6 921", "3 days ago by ana@example.com")]),
    ("Internal tools", [
        ("grafana.internal.example.com", "/", "grafana:3000, grafana-b:3000", "warn", "1 target down", "Uploaded", "312", "1 week ago by rui@example.com")]),
    ("Legacy", [
        ("legacy.example.com", "/", "legacy:8081", "off", "Disabled", "Automatic", "–", "Yesterday by marta@example.com")]),
]


def routes_table(selected=("shop.example.com", "checkout.example.com")):
    bodies = []
    for project, rows_data in ROUTES:
        rpm = sum(int(r[6].replace(" ", "")) for r in rows_data if r[6].replace(" ", "").isdigit())
        n = len(rows_data)
        rows = [f'''<tr class="ap-group"><td colspan="8"><span class="ap-group-title">{project}<span class="ap-group-meta">{n} route{"s" if n != 1 else ""} · {rpm:,} req/min</span></span></td></tr>'''.replace(",", " ")]
        for host, path, target, tone, word, cert, r, changed in rows_data:
            sel = ' aria-selected="true"' if host in selected else ' aria-selected="false"'
            chk = " checked" if host in selected else ""
            toggle = (icon("play"), f"Enable {host}") if tone == "off" else (icon("pause"), f"Disable {host}")
            act = (f'<td class="ap-col-actions"><div class="ap-row" style="gap:2px;justify-content:flex-end">'
                   f'<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="{toggle[1]}">{toggle[0]}</button>'
                   f'<button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Delete {host}">{icon("trash-2")}</button></div></td>')
            rows.append(f"""<tr{sel}><td class="ap-col-check"><input class="ap-check" type="checkbox" aria-label="Select {host}"{chk}></td>
<td><div class="ap-cell-main"><a class="ap-data" href="#">{host}</a><span class="ap-caption ap-data">{path}</span></div></td>
<td class="ap-data ap-muted">{target}</td>
<td><span class="ap-status ap-status-{tone}"><span class="ap-dot" aria-hidden="true"></span>{word}</span></td>
<td class="ap-muted">{cert}</td><td class="ap-num">{r}</td><td class="ap-muted">{changed}</td>{act}</tr>""")
        bodies.append(f'<tbody>{"".join(rows)}</tbody>')
    return f"""<div class="ap-table-wrap"><table class="ap-table">
<caption class="ap-sr">Routes, grouped by project</caption>
<thead><tr><th class="ap-col-check" scope="col"><input class="ap-check" type="checkbox" aria-label="Select all routes shown"></th>
<th scope="col">Hostname</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Certificate</th><th scope="col" class="ap-num">Req/min</th><th scope="col">Changed</th><th scope="col" class="ap-col-actions"><span class="ap-sr">Actions</span></th></tr></thead>
{"".join(bodies)}</table></div>"""


TOOLBAR = f"""<div class="ap-toolbar" role="search" aria-label="Filter routes" style="padding-top:4px"><div class="ap-filter">{icon("search")}<input class="ap-input" type="search" placeholder="Filter by hostname or target" aria-label="Filter by hostname or target"></div>
<div class="ap-seg" role="group" aria-label="Status"><button type="button" aria-pressed="true">All</button><button type="button" aria-pressed="false">Needs attention</button><button type="button" aria-pressed="false">Disabled</button></div>
<select class="ap-select" aria-label="Project"><option>All projects</option></select></div>"""

SELECTBAR = f"""<div class="ap-selectbar" role="region" aria-label="Selected routes"><strong>2 selected</strong><button class="ap-btn ap-btn-sm" type="button">{icon("eraser")}Purge cache</button><button class="ap-btn ap-btn-sm" type="button">{icon("folder-input")}Move to project…</button><button class="ap-btn ap-btn-sm" type="button" style="color:var(--critical)">{icon("trash-2")}Delete…</button><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button" style="margin-left:auto;background:none">Clear selection</button></div>"""

C["Table"] = ("Data", 520, f"""<div class="ap-panel">{TOOLBAR}{SELECTBAR}{routes_table()}</div>""", """# Table

Tables list objects of one kind (routes, certificates, users) so people can scan, filter, select and act on them.

- The table sits flush inside a panel. Header labels are small and `ink-3`, with no fill; rows divide with hairline `line`; no zebra stripes.
- **Filters** sit above the table in a toolbar (`ap-toolbar`, `role="search"`): a text filter (`ap-filter`, with a search icon), a Segmented control for status and a select for the project. Filters only change what's shown.
- **Grouped by project:** when every project is shown, each project starts with a group row (`ap-group`) with its name and a summary ("2 routes · 8 205 req/min").
- The first column names the object in the data face, as the link to its page (`ap-cell-main`), with its secondary detail under it in `caption`.
- Numbers align right in `ap-num` (data face, tabular figures). Missing values show "–". Changes show when and who: "2 h ago by ana@example.com".
- Status columns use Status, never color alone.
- **Selection:** a checkbox column, only for people who can act on the rows; selected rows get `aria-selected="true"` and `honey-soft`. A selection bar (`ap-selectbar`) appears above the table with the count, the bulk actions and **Clear selection**.
- **Row actions** are up to three ghost icon buttons in the last column (`ap-col-actions`), each with an `aria-label` naming the object: disable or enable, purge, delete.
- Under 640px the table scrolls inside `ap-table-wrap`.
- **Not used in the app yet:** sortable headers (`ap-sort`, `aria-sort`), collapsible groups, a ⋯ menu per row and pagination (`ap-pager`).

**The consumer provides:** columns, rows, filters, selection and the row actions.
""")


PROJECTS = [
    ("Shop", "shopping-bag", "ok", "Healthy", 9, "8 205", "Storefront, checkout and their APIs.", 2),
    ("Payments API", "credit-card", "ok", "Healthy", 6, "3 410", "Card and SEPA payment endpoints.", 0),
    ("Internal tools", "wrench", "warn", "1 target down", 14, "640", "Grafana, MQTT and staff tools.", 1),
    ("Legacy", "archive", "critical", "1 route down", 4, "0", "Old sites kept until migration.", 0),
]


def project_cards(limit=None):
    out = []
    for name, ic, tone, word, routes, rpm, desc, redirects in PROJECTS[:limit]:
        extra = f'<span><b>{redirects}</b> redirect{"s" if redirects != 1 else ""}</span>' if redirects else ""
        out.append(f"""<a class="ap-panel ap-project" href="#"><div class="ap-project-head"><span class="ap-project-mark">{icon(ic)}</span><span class="ap-status ap-status-{tone}"><span class="ap-dot" aria-hidden="true"></span>{word}</span></div>
<div><h3 class="ap-h ap-h-3">{name}</h3><p class="ap-caption" style="margin:2px 0 0;font-size:13px;line-height:18px">{desc}</p></div>
<div class="ap-project-facts"><span><b>{routes}</b> routes</span><span><b>{rpm}</b> req/min</span>{extra}</div></a>""")
    return f'<div class="ap-projects">{"".join(out)}</div>'


C["ProjectCard"] = ("Apiary", 260, project_cards(), """# ProjectCard

A project card summarizes one project: its health, how many routes it has, and its traffic. Cards link to the project's routes.

- A project groups routes, stream routes, redirects and uploaded certificates for organizing and filtering. It is not an access boundary: roles apply to the whole cluster.
- Head: a Lucide icon chosen for the project on a `sunken` tile, and the project's worst status as a Status ("1 route down").
- Name in `title-3`, a one-line description, then the counts in `ink`: routes, traffic, and redirects when there are any.
- The whole card is the link; it lifts slightly on hover.
- Cards sit in a grid (`ap-projects`) that fills the width with cards at least 260px wide.

**The consumer provides:** name, icon, worst status, description, route and redirect counts, and traffic.
""")

C["KeyValue"] = ("Data", 220, """
<div class="ap-panel ap-panel-body">
<dl class="ap-kv">
  <dt>Member ID</dt><dd><span class="ap-data">edge-2 (a3f9c41e)</span></dd>
  <dt>Role</dt><dd><span class="ap-status ap-status-honey"><span class="ap-dot" aria-hidden="true"></span>Leader</span></dd>
  <dt>Applied index</dt><dd class="ap-data">184 223</dd>
  <dt>Root key</dt><dd><span class="ap-data">apiary_root_key_2</span> <span class="ap-caption">since 2026-10-28 09:12 UTC</span></dd>
  <dt>Version</dt><dd class="ap-data">0.4.0</dd>
</dl>
</div>
""", """# KeyValue

A key-value list shows the properties of one object in a detail view or side panel.

- Keys in `ink-2`, values in `ink`. Technical values in the data face.
- Values may be Status, Tags or a link; keep each to one line where possible.
- Order by what people check first: identity, state, then details.
- Times are absolute and in UTC in detail views (`2026-10-28 09:12 UTC`); relative times ("12 minutes ago") belong in lists.

**The consumer provides:** the pairs, already formatted.
""")

EVENTS = [
    ("", "ana@example.com changed route <span class=\"ap-data\">shop.example.com</span>", "Weights 100/0 → 90/10 · from 10.0.4.21 · UI", "14:32"),
    ("ap-event-agent", "Agent “ops-assistant” for marta@example.com purged the cache of <span class=\"ap-data\">api.example.com</span>", "From 10.0.4.88 · MCP", "14:05"),
    ("ap-event-denied", "Denied: rui@example.com tried to delete user marta@example.com", "Role Operator can't manage users · from 10.0.7.3 · UI", "13:47"),
    ("", "Certificate for <span class=\"ap-data\">api.example.com</span> renewed", "Let's Encrypt · leader edge-2", "11:20"),
]


def timeline():
    items = "".join(f'<li class="ap-event {c}"><span class="ap-dot" aria-hidden="true"></span><div><div>{t}</div><div class="ap-event-meta">{m}</div></div><time datetime="2026-11-02T{tm}Z">{tm}</time></li>' for c, t, m, tm in EVENTS)
    return f'<ol class="ap-timeline">{items}</ol>'


C["Timeline"] = ("Data", 300, f'<div class="ap-panel ap-panel-body" style="padding-block:8px">{timeline()}</div>', """# Timeline

The timeline lists audit log entries: who did what, from where, through which surface, and when.

- One entry per line: actor, verb in the past tense, object (in the data face), then a meta line with the change, source IP and surface (UI, MCP, CLI).
- Dot tones: `line-strong` for changes, `info` (`ap-event-agent`) for actions by agents, `critical` (`ap-event-denied`) for denied actions.
- Never show an action's arguments beyond what the audit log stores: no passwords, keys or tokens.
- Times in the data face, UTC, newest first; group by day with an `overline` heading when a list spans days.

**The consumer provides:** the entries, already formatted.
""")

C["Tabs"] = ("Navigation", 150, """
<nav class="ap-tabs" aria-label="Account">
  <a class="ap-tab" href="#" aria-current="page">Profile</a>
  <a class="ap-tab" href="#">Security</a>
  <a class="ap-tab" href="#">Active sessions</a>
</nav>
<div class="ap-tabs" role="tablist" aria-label="Certificate" style="margin-top:16px">
  <button class="ap-tab" role="tab" aria-selected="true" type="button">Details</button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">Routes <span class="ap-count">3</span></button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">History</button>
</div>
""", """# Tabs

Tabs split one object's settings or one area into views of the same level.

- **Link tabs** (`nav.ap-tabs` with `a.ap-tab`) when each view has its own URL, as in Account: Profile, Security, Active sessions. The current one has `aria-current="page"`.
- **Panel tabs** (`role="tablist"`, `button.ap-tab[role=tab]`) when the views share one page; the selected tab has `aria-selected="true"`.
- The current tab is `ink`, semibold, with a 2px `ink` underline; others are `ink-2`.
- Two to six tabs, named with nouns. A count (`ap-count`) only when it helps decide where to look.
- Tabs never hide unsaved changes: switching keeps what was typed.
- Under 640px the tab row scrolls sideways.

**The consumer provides:** the tab labels, the current tab and the links or panels (`role="tabpanel"`).
""")

C["Steps"] = ("Navigation", 120, """
<ol class="ap-steps" aria-label="Root key rotation">
  <li class="ap-step ap-step-done">New key created</li>
  <li class="ap-step" aria-current="step">Rolling update</li>
  <li class="ap-step">Old key forgotten</li>
</ol>
<ol class="ap-steps" aria-label="Setup">
  <li class="ap-step ap-step-done">Administrator</li>
  <li class="ap-step" aria-current="step">Authenticator app</li>
  <li class="ap-step">Recovery codes</li>
</ol>
""", """# Steps

Steps show where a multi-stage process stands: first-access setup, root key rotation.

- Two to five steps, named for what happens ("Rolling update"), never "Step 2".
- Steps are numbered circles: done steps show a check on `ink`, the current one is `honey` with `aria-current="step"`, the rest `sunken`.
- Steps show progress; they are not navigation. Going back is a button in the step's content.

**The consumer provides:** the step names and the current step.
""")

C["Dialog"] = ("Overlays", 330, f"""
<div class="ap-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dt" aria-describedby="dd" style="margin:0 auto">
  <div class="ap-dialog-head"><span class="ap-dialog-mark ap-dialog-mark-critical">{icon("trash-2")}</span><h2 class="ap-h ap-h-2" id="dt">Delete route shop.example.com?</h2></div>
  <div class="ap-dialog-body" id="dd">
    <p style="margin:0">Requests to <span class="ap-code">shop.example.com</span> will get a 404 on every replica as soon as you confirm. Its automatic certificate is kept, in case you add the route again.</p>
    <div class="ap-field"><label class="ap-label" for="cf">Type <span class="ap-data">shop.example.com</span> to confirm</label><input class="ap-input ap-data" id="cf" autocomplete="off" spellcheck="false"></div>
  </div>
  <div class="ap-dialog-foot"><button class="ap-btn ap-btn-ghost" type="button">Cancel</button><button class="ap-btn ap-btn-danger" type="button" disabled>Delete route</button></div>
</div>
""", """# Dialog

A dialog asks for a decision that must be made before going on, usually confirming a destructive change, or collects a few fields for one action (upload a certificate, invite someone).

- Title is the question, with the object: "Delete route shop.example.com?". A confirmation has a tone mark (`ap-dialog-mark`, critical for destructive actions) before the title; a non-destructive decision has none.
- Body says what happens, when, and what is kept. For changes that are hard to undo, ask the person to type the object's name ("Type shop.example.com to confirm"); the action stays disabled until it matches.
- Buttons, right-aligned: **Cancel** as a ghost button, then the action, named for what it does ("Delete route"), in `ap-btn-danger`, or primary for non-destructive decisions. While it runs, the action shows its busy label ("Deleting…").
- If the action fails, the dialog stays open and a critical Banner inside it says why, so the person can try again or cancel.
- A solid `surface` sheet (`ap-dialog`, `role="alertdialog"` for confirmations) over `scrim`, `shadow-float`, 460px wide (`ap-dialog-lg` for forms), rising in over 280ms. Escape and Cancel close it; focus starts on Cancel, or on the first field of a form, and stays inside.
- Actions that need a password again (new recovery codes, a new authenticator app) ask for it in their dialog.
- Never stack dialogs, and never use one for information a Toast or Banner can give.

**In the library:** `Confirmer.confirm({ heading, text, confirm, busy, tone, typeToConfirm, action })` opens the confirmation and runs the action; it resolves when the action succeeds or the person cancels.

**The consumer provides:** the question, consequences, optional confirmation text, the action's label and what it does.
""")

NODES = [("edge-1", "voter", "Voter", "0 behind"), ("edge-2", "leader", "Leader", "Index 184 223"), ("edge-3", "voter", "Voter", "2 behind"), ("edge-4", "follower", "Follower", "Catching up"), ("edge-5", "down", "Missing 4 min", "Removal in 11 min")]


def cluster():
    items = "".join(f'<div class="ap-node ap-node-{k}"><span class="ap-node-hex">{n.split("-")[1]}</span><span class="ap-node-name">{n}</span><span class="ap-node-role">{r}<br>{d}</span></div>' for n, k, r, d in NODES)
    return f'<div class="ap-cluster" role="list" aria-label="Replicas">{items}</div>'


C["ClusterMap"] = ("Apiary", 200, cluster(), """# ClusterMap

The cluster map shows every replica as a hexagon, so the leader, the voters, followers and missing members read at a glance.

- The hexagon is reserved for replicas, the brand mark and empty states.
- **Leader:** `honey` fill. Exactly one, or none while an election runs.
- **Voter:** `ink` fill. **Follower:** outlined in `ink-2`. **Missing:** `critical-soft` inside a `critical` outline.
- Under each hexagon: the node name in the data face, the role, and one fact (how far behind, or when a missing member is removed).
- Order: voters by node name, then followers, then missing members.
- Each hexagon opens the member's detail (KeyValue). The map never offers actions directly.

**The consumer provides:** the members, their roles and one fact each.
""")

C["Split"] = ("Apiary", 140, """
<div class="ap-stack" style="gap:8px">
  <div class="ap-split" role="img" aria-label="Traffic split: shop-v1 90 percent, shop-v2 10 percent"><span style="flex:90">shop-v1 · 90%</span><span style="flex:10">10%</span></div>
  <span class="ap-caption">Sticky sessions on. Testers reach shop-v2 with the header <span class="ap-code">X-Canary: true</span>.</span>
</div>
<div class="ap-split" role="img" aria-label="Traffic split: blue 50, green 30, legacy 20 percent"><span style="flex:50">blue · 50%</span><span style="flex:30">green · 30%</span><span style="flex:20">legacy · 20%</span></div>
""", """# Split

A split bar shows how a route's traffic is divided between target groups by weight.

**Not used in the app yet:** the route editor shows the split as a line of text in a field labeled "Split" ("shop-v1 90% · shop-v2 10%"). The bar is kept for a future overview of a route.

- Segment widths match the weights exactly. The first group is `ink`, the canary `honey`, a third `line-strong`; more than three groups are listed, not drawn.
- Label each segment with the group and its share; when a segment is too narrow, keep only the share.
- Give the bar `role="img"` and an `aria-label` with every group and share.
- A caption below names anything else that changes who goes where: sticky sessions, header or cookie selection.

**The consumer provides:** the groups and their weights.
""")

C["CopyField"] = ("Forms", 250, f"""
<div class="ap-field">
  <span class="ap-label">Create the new key on a manager node</span>
  <div class="ap-copy"><code>(umask 077 &amp;&amp; docker run --rm datapointsoftware/apiary:0.1.0 secrets init &gt; apiary_root_key_2) &amp;&amp; docker secret create apiary_root_key_2 apiary_root_key_2</code><button class="ap-btn ap-btn-sm" type="button">{icon("copy")}<span>Copy</span></button></div>
  <span class="ap-help">Then copy the file's content into your secret store, and delete the file.</span>
</div>
<div class="ap-field">
  <span class="ap-label">Recovery codes</span>
  <div class="ap-copy" style="align-items:flex-start"><code style="white-space:pre;line-height:1.6">7KQ2-M9XD
P4TR-8WCN
H3JF-Q6ZB</code><button class="ap-btn ap-btn-sm" type="button">{icon("check")}<span>Copied</span></button></div>
</div>
""", """# CopyField

A copy field shows a command or value that people run or paste elsewhere, with a Copy button.

- The full text is visible and selectable. A command stays on one line and scrolls inside the field; a list (recovery codes) is multiline.
- The label says where to run it or what it is; the help text says what it does or what to do next.
- The button shows a check and "Copied" for 2 seconds. If the clipboard is refused, select the text instead.
- Secrets appear only when the person must save them themselves, once: an authenticator app's key, recovery codes. Say where to keep them. Commands that create secrets write them to a file only the user can read (`umask 077`), for the person to move into a secret store.

**In the app:** `<ap-copy-text text multiline>`.

**The consumer provides:** the label, the text and the help text.
""")

C["EmptyState"] = ("Layout", 250, f"""
<div class="ap-panel"><div class="ap-empty">
  <div class="ap-empty-mark" aria-hidden="true"></div>
  <h2 class="ap-h ap-h-2">No stream routes yet</h2>
  <p>Stream routes forward raw TCP or UDP, such as MQTT or SMTP, from a port in the range your compose file publishes (10000–10099).</p>
  <button class="ap-btn ap-btn-primary" type="button">{icon("plus")}Add stream route</button>
</div></div>
""", """# EmptyState

An empty state explains what a list will hold and how to add the first item.

- Title names what is missing ("No stream routes yet"); one or two sentences say what it is for and any precondition; one primary button adds the first item.
- One `sunken` hexagon (`ap-empty-mark`) is the only illustration.
- For an empty search result, say what was searched and offer to clear the filter instead.

**The consumer provides:** title, explanation and the action.
""")


def calendar():
    """November 2026, Monday first, with today (2) and the selection (5) marked."""
    rows, day = [], 26
    for w in range(6):
        cells = []
        for d in range(7):
            n = w * 7 + d
            if n < 6:
                cells.append(f'<td><button class="ap-day" type="button" data-outside disabled>{26 + n}</button></td>')
            elif n - 5 <= 30:
                k = n - 5
                attrs = ' aria-current="date"' if k == 2 else ' aria-pressed="true"' if k == 5 else ''
                cells.append(f'<td><button class="ap-day" type="button"{attrs}>{k}</button></td>')
            else:
                cells.append(f'<td><button class="ap-day" type="button" data-outside>{n - 35}</button></td>')
        rows.append("<tr>" + "".join(cells) + "</tr>")
    head = "".join(f"<th>{d}</th>" for d in ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"])
    return f"""<div class="ap-popover ap-cal-pop" role="dialog" aria-label="Choose starts" style="position:static">
<div class="ap-cal-head"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Previous month">{icon("chevron-left")}</button><span class="ap-cal-title">November 2026</span><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Next month">{icon("chevron-right")}</button></div>
<table class="ap-cal" role="presentation"><thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>
<div class="ap-cal-time"><label class="ap-label" for="cal-h">Time</label><select class="ap-select" id="cal-h"><option>22</option></select>:<select class="ap-select" aria-label="Minutes"><option>00</option></select><span>UTC</span></div>
<div class="ap-cal-foot"><button class="ap-btn ap-btn-sm ap-btn-ghost" type="button">Today</button><button class="ap-btn ap-btn-sm ap-btn-primary" type="button">Done</button></div></div>"""


C["PageHead"] = ("Layout", 170, f"""
<div class="ap-stack" style="gap:4px">
  <nav class="ap-crumbs" aria-label="Breadcrumb"><a href="#">Routes</a><span aria-hidden="true">/</span><span aria-current="page">shop.example.com</span></nav>
  <div class="ap-page-head">
    <div style="min-width:0"><h1 class="ap-h ap-h-1">shop.example.com</h1><p class="ap-sub">Shop · 2 targets · changed 2 h ago by ana@example.com</p></div>
    <div class="ap-row" style="gap:12px"><button class="ap-btn" type="button">{icon("eraser")}Purge cache</button><button class="ap-btn ap-btn-primary" type="button">{icon("plus")}New route</button></div>
  </div>
</div>
""", """# PageHead

Every page starts with a page head: where you are, what this page is, and its main actions.

- Breadcrumbs (`ap-crumbs`, a `nav` labeled "Breadcrumb") lead from the area to the page; the last crumb is the page itself, with `aria-current="page"`, not a link.
- One `h1` per page, in `title-1`. A subtitle (`ap-sub`) with the one or two facts people check first.
- Actions sit on the right, the primary one last. They wrap below the heading on narrow screens.
- In the library: `<ap-page-head heading [crumbs]>`, with content in `pageSub` and `pageActions`.

**The consumer provides:** the heading, the crumbs, the subtitle and the actions.
""")

C["Panel"] = ("Layout", 470, f"""
<div class="ap-stack" style="gap:16px">
<section class="ap-panel" aria-labelledby="pn1">
  <div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="pn1">Signing out</h2><p class="ap-panel-desc">People are signed out after this long without activity.</p></div></div>
  <div class="ap-panel-body"><div class="ap-field" style="max-width:220px"><label class="ap-label" for="pn2">Idle timeout</label><div class="ap-affix"><input class="ap-input ap-data" id="pn2" value="60" inputmode="numeric"><span class="ap-affix-text">minutes</span></div><span class="ap-help">5 to 720 minutes.</span></div></div>
  <div class="ap-panel-foot"><div class="ap-row" style="justify-content:flex-end"><button class="ap-btn ap-btn-primary" type="button">Save</button></div></div>
</section>
<section class="ap-panel ap-panel-danger" aria-labelledby="pn3">
  <div class="ap-panel-head"><div><h2 class="ap-h ap-h-3" id="pn3">Danger zone</h2></div></div>
  <div class="ap-panel-body ap-list">
    <div class="ap-list-row"><div class="ap-list-text"><strong>Recover from a lost majority</strong><span class="ap-muted">Only when most voters are gone for good. This replica becomes the only voter, and anything only the lost voters had is lost.</span></div><button class="ap-btn ap-btn-danger" type="button">Start recovery…</button></div>
  </div>
</section>
</div>
""", """# Panel

A panel groups one topic on a page: a settings section, a list, a table.

- `ap-panel` is a `surface` card with `shadow-card`. Give it a `section` with `aria-labelledby` pointing at its heading.
- **Head** (`ap-panel-head`): an `h2` in `title-3` and an optional description (`ap-panel-desc`, at most two lines); panel-level actions sit on the right.
- **Body** (`ap-panel-body`) for content with padding; tables sit flush, without a body.
- **Foot** (`ap-panel-foot`) for the panel's own Save, aligned right, when the panel saves on its own.
- **Lists** (`ap-list`, `ap-list-row`): one setting or action per row, its text (`ap-list-text`, a bold name and a `muted` sentence) on the left and its control on the right.
- **Danger zone** (`ap-panel-danger`, a faint critical ring): the last panel on a page, titled "Danger zone", for actions that can't be undone. Each is a list row with a danger button that ends in "…" and opens a confirmation.

**The consumer provides:** the heading, the description and the content.
""")

C["Loading"] = ("Status", 150, f"""
<div class="ap-panel" style="padding:24px" aria-busy="true" aria-label="Loading"><span class="ap-skel" style="width:60%;height:14px"></span><span class="ap-skel" style="width:40%;height:14px;margin-top:10px"></span></div>
<div class="ap-row" style="gap:16px;margin-top:16px"><button class="ap-btn ap-btn-primary" type="button" disabled aria-busy="true">Saving…</button><span class="ap-row ap-muted" style="gap:8px"><span class="ap-spinner" aria-hidden="true"></span>Restoring the backup…</span></div>
""", """# Loading

How the app shows that something is on its way.

- **Skeleton** (`ap-skel`): grey bars where a list or panel will appear, while its first load runs. The container gets `aria-busy="true"` and `aria-label="Loading"`. Two bars are enough; never imitate the exact layout.
- **Busy button:** the button that started the work says what is happening ("Saving…", "Checking…") and is disabled with `aria-busy="true"` until it ends.
- **Spinner** (`ap-spinner`): for long operations that aren't tied to a button, next to a sentence saying what is running. It inherits the text color.
- Show nothing for the first 200 ms, so fast answers don't flash.
- Reduced motion stops the shimmer and the spin.

**The consumer provides:** where the content will appear and what is running.
""")

C["SaveBar"] = ("Forms", 130, f"""
<div class="ap-savebar" style="position:static"><span class="ap-muted">Unsaved changes</span><div class="ap-row" style="gap:8px"><a class="ap-btn ap-btn-ghost" href="#">Cancel</a><button class="ap-btn ap-btn-primary" type="submit">Save route</button></div></div>
""", """# SaveBar

The save bar sits at the bottom of a long form, like the route editor, and stays visible while you scroll.

- `ap-savebar` is sticky, 16px above the bottom of the window, a `surface` with `shadow-float`.
- Cancel is a ghost link back to where you came from; the primary button is last and names the result: "Create route" for a new object, "Save route" for an existing one, "Saving…" while it runs.
- Short forms end with their buttons in the panel foot instead.

**The consumer provides:** the labels and the submit and cancel handlers.
""")

C["CodeInput"] = ("Forms", 170, """
<div class="ap-field" style="max-width:280px"><label class="ap-label" for="otp1">Code</label><input class="ap-input ap-otp" id="otp1" inputmode="numeric" autocomplete="one-time-code" spellcheck="false" value="482 913"><span class="ap-help">Enter the code from your authenticator app.</span></div>
""", """# CodeInput

A one-time code field for two-step verification: in sign-in, setup, accepting an invite and the recovery dialog.

- One input, not one box per digit: paste and password managers work, and screen readers read one field.
- `ap-otp` makes it large and centered, in the data face with wide spacing.
- `inputmode="numeric"` and `autocomplete="one-time-code"`, so phones offer the code from the authenticator or a message.
- Recovery codes (`xxxx-xxxx-xxxx-xxxx`) use a plain input instead, with no `ap-otp` and no numeric keyboard.
- The submit button says "Checking…" while the code is verified; a wrong code gets a field error and keeps focus in the field.

**The consumer provides:** the label and the help text.
""")

C["DatePicker"] = ("Forms", 520, f"""
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
<div class="ap-field" style="width:300px"><label class="ap-label" for="dt1">Starts</label><div class="ap-dtp"><div class="ap-affix"><input class="ap-input ap-data" id="dt1" value="2026-11-05 22:00"><span class="ap-affix-text">UTC</span></div><button class="ap-btn ap-btn-icon ap-dtp-btn" type="button" aria-label="Choose starts on a calendar" aria-haspopup="dialog" aria-expanded="true">{icon("calendar")}</button></div><span class="ap-help">At most 7 days before it ends.</span></div>
{calendar()}</div>
""", """# DatePicker

A date and time field: type it, or choose it on a calendar.

- The text field takes `YYYY-MM-DD HH:MM` and stays the source of truth; the calendar button beside it opens a popover (`ap-cal-pop`, `role="dialog"`) that writes into it. In the library, `<ap-calendar-button [target]="input" label>` attaches to any input.
- Minutes move in 5-minute steps. When the field is empty, the calendar starts at the next full hour.
- **Every time is UTC**, and the field says so with a `UTC` suffix. Everyone on call reads the same times, and the audit log, logs and Raft agree.
- Weeks start on Monday. Today is in `honey-text`, the selection is a honey disc, days outside the allowed range are disabled.
- Keyboard: arrows move by day and week, Page Up and Page Down by month (with Shift, by year), Home and End to the week's start and end, Enter selects, Escape closes and returns focus to the button.
- With time, picking a day keeps the popover open for the time; **Done** closes it. Date only: picking a day closes it.
- Validated like any field: an impossible date ("2026-02-31") or the wrong format gets an error that shows the expected format; ranges check that the end is after the start.

**The consumer provides:** label, value, whether it has a time, and the earliest and latest allowed dates.
""")

C["Validation"] = ("Forms", 560, f"""
<div class="ap-banner ap-banner-critical ap-error-summary" role="alert">{icon("circle-alert")}<div class="ap-banner-body"><span class="ap-banner-title">Fix 2 problems to add this route</span><ul><li><a href="#v1">Hostname: Enter a hostname, such as shop.example.com.</a></li><li><a href="#v3">Weights: The weights add up to 110%. Make them add up to 100%.</a></li></ul></div></div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
<div class="ap-field"><label class="ap-label" for="v1">Hostname</label><input class="ap-input ap-data" id="v1" aria-invalid="true" value="shop..example.com"><span class="ap-error">{icon("circle-alert")}A hostname has no empty parts: check for two dots in a row.</span></div>
<div class="ap-field"><label class="ap-label" for="v2">Hostname</label><input class="ap-input ap-data" id="v2" value="docs.example.com"><span class="ap-help" aria-live="polite">Checking…</span></div>
<div class="ap-field"><label class="ap-label" for="v4">Hostname</label><input class="ap-input ap-data" id="v4" value="shop.example.com" aria-invalid="true"><span class="ap-error">{icon("circle-alert")}Another route already uses this hostname and path.</span></div>
<div class="ap-field"><label class="ap-label" for="v6">New password</label><input class="ap-input" id="v6" type="password" value="hunter2hunter2"><ul class="ap-checklist"><li>{icon("circle")}At least 15 characters</li><li data-met>{icon("circle-check")}Not a common password or repeated characters</li><li data-met>{icon("circle-check")}Doesn’t contain your email name</li></ul></div>
</div>
""", """# Validation

How forms tell people what to fix.

- **When:** a field is checked when you leave it, then again as you type, so a fixed error clears at once. Nothing turns red while you type in a field for the first time.
- **On submit,** every field is checked. Forms with more than one problem list them at the top in an error summary (`ap-error-summary`, `role="alert"`), in page order, each a link that moves focus to its field. With one problem, focus moves straight to that field.
- **Field errors** (`ap-error`, under the help text, linked with `aria-describedby`) set `aria-invalid`, which turns the border `critical`. Messages say what to do, with an example: "Enter a hostname, such as shop.example.com", not "Invalid hostname".
- **Checks that need the server** (a hostname another route uses, an email someone has) run 400 ms after typing stops and show "Checking…" in a polite live region under the field; a problem then shows as an ordinary field error.
- **Rules that must all hold,** such as password rules, are a live checklist (`ap-checklist`, from `<ap-password-checklist>`).
- **Cross-field rules** (weights that add up to 100%, an end after the start) attach to the group or the second field.
- **Server errors** come back as codes. Errors for a field appear on that field; others at the top of the form. What was typed is kept.
- **Submit buttons stay enabled** until pressed: pressing one is how people find out what's missing. While the request runs, the button is busy ("Saving…").
- **Not used in the app yet:** the spinner (`ap-checking`), a quiet confirmation (`ap-valid`) and the counter (`ap-counter`, which turns `critical` past a limit).

**The consumer provides:** the rules and their messages.
""")

C["FileDrop"] = ("Forms", 330, f"""
<div class="ap-stack" style="max-width:480px;gap:16px">
<div class="ap-field"><label class="ap-label" for="fd1">Certificate and chain</label><textarea class="ap-textarea ap-data" id="fd1" rows="4" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----"></textarea><span class="ap-help">PEM, leaf certificate first, then the intermediates.</span></div>
<label class="ap-drop" style="margin-top:-8px">{icon("file")}<span><strong>Choose a file</strong> or drop it here</span><span class="ap-caption">.pem, .crt or .cer</span><input type="file" accept=".pem,.crt,.cer"></label>
</div>
""", """# FileDrop

A text field for a certificate or key, with a zone under it that fills the field from a file (`ap-drop`).

- Pasting is the main path: people often have a certificate in a terminal, not a file. The textarea is the source of truth; choosing or dropping a file reads it into the textarea, where it can be checked and edited.
- The whole zone is the file input's label, so it's one click and works with the keyboard; it highlights in `honey-soft` while a file is dragged over it.
- The zone names the accepted types; the field's help says what the content must be.
- Checked by the server (a key that doesn't match its certificate, an encrypted key), with the error on the field.
- **Not used in the app yet:** the chosen-file row (`ap-file`).

**In the app:** the `apFileDrop` directive on the `ap-drop` label, next to the field it fills.

**The consumer provides:** label, accepted types, help and the field it fills.
""")

for name, (group, height, body, readme) in C.items():
    d = os.path.join(ROOT, "components", name)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "preview.html"), "w").write(page(name, group, height, body.strip()))
    open(os.path.join(d, "README.md"), "w").write(readme.strip() + "\n")

print("written", len(C))
