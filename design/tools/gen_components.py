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
""", """# Button

Buttons start an action; their label says exactly what happens.

- **Shape:** every button is a pill (`radius-pill`), filled, with no border.
- **Primary** (`ap-btn ap-btn-primary`): honey fill, `on-honey` text. At most one per view: the action the page exists for (**Add route**, **Save changes**).
- **Secondary** (`ap-btn`): a `sunken` fill, for everything else that changes something.
- **Ghost** (`ap-btn ap-btn-ghost`): text in `honey-text` with no fill, for Cancel, Close and links that act; icon-only toolbar buttons.
- **Danger** (`ap-btn ap-btn-danger`): only inside a confirmation dialog, for the destructive action itself.
- **Sizes:** `ap-btn-sm` (28px) in tables and filter bars, default 36px, `ap-btn-lg` (44px) on setup screens and touch layouts.
- **Icon only** (`ap-btn-icon`): needs `aria-label` and a tooltip.

**Copy:** verb plus object, sentence case: **Add route**, **Rotate root key**, **Delete route**. Never "OK", "Submit" or "Yes" on their own.

**Disabled:** use `disabled` and always explain why in a caption or tooltip next to it.

**The consumer provides:** the label, an optional Lucide icon placed before it, and the handler.
""")

C["Menu"] = ("Actions", 230, f"""
<div class="ap-row" style="align-items:flex-start;gap:24px">
  <div class="ap-menu" role="menu" aria-label="Route actions">
    <button class="ap-menu-item" role="menuitem" type="button">{icon("pencil")}Edit route</button>
    <button class="ap-menu-item" role="menuitem" type="button">{icon("copy")}Duplicate</button>
    <button class="ap-menu-item" role="menuitem" type="button">{icon("eraser")}Purge cache<span class="ap-kbd">P</span></button>
    <div class="ap-menu-sep" role="separator"></div>
    <button class="ap-menu-item ap-menu-danger" role="menuitem" type="button">{icon("trash-2")}Delete route…</button>
  </div>
  <span class="ap-tooltip" role="tooltip">Writes are paused: 1 of 3 voters is reachable</span>
</div>
""", """# Menu

A menu lists actions on one object, opened from a row's ⋯ button; the tooltip explains a control in one sentence.

- Menus (`ap-menu`) are a solid `surface` with `shadow-float`: they float above content, and nothing shows through. The highlighted item fills with honey, like a macOS menu.
- Order items by frequency; destructive items go last, after a separator, in `ap-menu-danger`, and end with "…" because they open a confirmation.
- Show a keyboard shortcut with `ap-kbd` only when one exists.
- Menus close on Escape, on selection and on a click outside; arrow keys move between items.
- **Tooltip** (`ap-tooltip`): for icon-only buttons and disabled controls. One sentence, no actions inside, never the only place important information lives.

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
</div>
""", """# Field

A field is a label, a control and, when needed, help or an error, stacked in that order.

- The label (`ap-label`) is always visible above the control. A placeholder never replaces it.
- Mark optional fields with `<span class="ap-optional">(optional)</span>`; required fields get no asterisk.
- Technical values (hostnames, IPs, ports, paths) use `ap-input ap-data` so they render in the data face.
- Prefixes and suffixes (`ap-affix`) show fixed parts of a value, such as a scheme or a port.
- Validate when the field loses focus, never while typing. The error (`ap-error`) goes below the control, says what is wrong and how to fix it, and the input gets `aria-invalid="true"` and `aria-describedby`.
- Disabled fields explain why in their help text.
- One field per row under 640px; two columns at most on wider screens, only for natural pairs.

**The consumer provides:** a unique `id` linking label and control, the value, and the validation message.
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
- Tones: `ap-status-ok` (Healthy, Valid, Approved), `ap-status-warn` (Degraded, Expires in N days), `ap-status-critical` (Down, Failed, Refused), `ap-status-info` (Catching up, Follower), `ap-status-off` (Disabled, Not configured), `ap-status-honey` (Leader only).
- A ring (`ap-dot-ring`) instead of a dot means not yet in effect: pending approval, draft, waiting for a deploy.
- Words describe the state from the user's side: "Expires in 9 days", not "WARN".

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
<div class="ap-banner ap-banner-critical" role="alert">{icon("octagon-alert")}<div class="ap-banner-body"><span class="ap-banner-title">Writes are paused</span><span>Only 1 of 3 voters is reachable, so route, user and certificate changes can't be saved. Traffic keeps flowing with the last known routes.</span><div class="ap-banner-actions"><a href="#">What to do when the majority is lost</a></div></div></div>
<div class="ap-banner ap-banner-warn">{icon("triangle-alert")}<div class="ap-banner-body"><span class="ap-banner-title">2 certificates expire in less than 14 days</span><span>Automatic renewal failed for <span class="ap-code">legacy.example.com</span>: the HTTP-01 challenge got a 404.</span></div></div>
<div class="ap-banner ap-banner-info">{icon("info")}<div class="ap-banner-body"><span>Rotating the root key: 2 of 3 replicas run the new key.</span></div></div>
<div class="ap-banner ap-banner-ok">{icon("circle-check")}<div class="ap-banner-body"><span>Backup exported. It contains private keys: store it encrypted.</span></div></div>
""", """# Banner

A banner reports a condition that affects the whole page or cluster and stays until the condition ends.

- **Critical:** something is not working (writes paused, a replica down). Use `role="alert"`.
- **Warn:** something will stop working unless someone acts (certificates expiring, rotation stalled).
- **Info:** a process is running (rotation in progress, an update rolling out).
- **Ok:** a lasting confirmation that needs a follow-up, such as how to store a backup. A short confirmation is a Toast instead.
- Title says what is happening; the body says the consequence and what still works; an optional link says what to do.
- At most two banners per page, most severe first. Banners never stack inside panels.

**The consumer provides:** the tone, an icon (Lucide `octagon-alert`, `triangle-alert`, `info`, `circle-check`), the title, body and optional actions.
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
- At most one action, and always a close button. Hovering or focusing a toast pauses its timer.
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
    ("Shop", "shopping-bag", [
        ("shop.example.com", "/", "shop-v1 90% · shop-v2 10%", ["HTTP/2", "HTTP/3"], "ok", "Healthy", "Automatic", "1 284"),
        ("checkout.example.com", "/", "checkout:8080", ["HTTP/2"], "ok", "Healthy", "Automatic", "6 921")]),
    ("Internal tools", "wrench", [
        ("grafana.internal.example.com", "/", "grafana:3000", ["HTTP/2"], "warn", "1 of 2 targets down", "*.internal (uploaded)", "312"),
        ("mqtt.example.com", "TCP 10022", "mosquitto:1883", ["TCP"], "ok", "Healthy", "Passthrough", "—")]),
    ("Legacy", "archive", [
        ("legacy.example.com", "/", "host.docker.internal:8081", ["HTTP/1.1"], "critical", "Down", "Automatic", "0")]),
]


def routes_table(selected=("shop.example.com",), actions=True):
    bodies = []
    cols = 8 if actions else 7
    for project, _, rows_data in ROUTES:
        rpm = sum(int(r[7].replace(" ", "")) for r in rows_data if r[7].replace(" ", "").isdigit())
        n = len(rows_data)
        rows = [f'''<tr class="ap-group"><td colspan="{cols}"><button class="ap-group-title" type="button" aria-expanded="true">{icon("chevron-down")}{project}<span class="ap-group-meta">{n} route{"s" if n != 1 else ""} · {rpm:,} req/min</span></button></td></tr>'''.replace(",", " ")]
        for host, path, target, protos, tone, word, cert, r in rows_data:
            sel = ' aria-selected="true"' if host in selected else ""
            chk = " checked" if host in selected else ""
            tags = "".join(f'<span class="ap-tag">{p}</span>' for p in protos)
            if "10%" in target:
                tags += '<span class="ap-tag ap-tag-honey">Canary 10%</span>'
            act = (f'<td class="ap-col-actions"><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Actions for {host}" aria-haspopup="menu" aria-expanded="false" aria-controls="row-menu" data-menu>{icon("ellipsis")}</button></td>') if actions else ""
            rows.append(f"""<tr{sel}><td class="ap-col-check"><input class="ap-check" type="checkbox" aria-label="Select {host}"{chk}></td>
<td><div style="display:flex;flex-direction:column;gap:2px"><span class="ap-data" style="font-weight:500">{host}</span><span class="ap-caption ap-data">{path}</span></div></td>
<td class="ap-data ap-muted">{target}</td><td><div class="ap-row" style="gap:4px">{tags}</div></td>
<td><span class="ap-status ap-status-{tone}"><span class="ap-dot" aria-hidden="true"></span>{word}</span></td>
<td class="ap-muted">{cert}</td><td class="ap-num">{r}</td>{act}</tr>""")
        bodies.append(f'<tbody data-group>{"".join(rows)}</tbody>')
    head_act = '<th scope="col" class="ap-col-actions"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Actions</span></th>' if actions else ""
    return f"""<div class="ap-table-wrap"><table class="ap-table">
<caption class="ap-sr">Routes, grouped by project</caption>
<thead><tr><th class="ap-col-check" scope="col"><input class="ap-check" type="checkbox" aria-label="Select all routes"></th>
<th scope="col" aria-sort="ascending"><button class="ap-sort" type="button">Hostname {icon("arrow-up")}</button></th><th scope="col">Target</th><th scope="col">Protocols</th><th scope="col">Status</th><th scope="col">Certificate</th><th scope="col" class="ap-num">Req/min</th>{head_act}</tr></thead>
{"".join(bodies)}</table></div>"""


PAGER = """<div class="ap-pager"><span>5 of 42 routes, in 3 of 6 projects</span><div class="ap-row"><button class="ap-btn ap-btn-sm" type="button" disabled>Previous</button><button class="ap-btn ap-btn-sm" type="button">Next</button></div></div>"""

C["Table"] = ("Data", 440, f"""<div class="ap-panel">{routes_table()}<div class="ap-panel-foot">{PAGER}</div></div>""", """# Table

Tables list objects of one kind (routes, certificates, users) so people can scan, sort, select and act on them.

- The table sits flush inside a card. Header labels are small and `ink-3`, with no fill; rows divide with hairline `line`; no zebra stripes.
- **Grouped by project:** each project starts with a group row (`ap-group`) holding a disclosure button (`ap-group-title`, `aria-expanded`), the project name and a summary ("2 routes · 8 205 req/min"). Collapsing a group hides its rows.
- The first column names the object in the data face (a hostname), with its secondary detail under it in `caption`.
- Numbers align right in `ap-num` (data face, tabular figures). Missing values show "—".
- Status columns use Status, never color alone. Feature lists use Tags.
- Selection: a checkbox column; selected rows get `aria-selected="true"` and `honey-soft`. Bulk actions appear above the table when something is selected.
- Row actions sit in a last ⋯ column opening a Menu. Clicking the row itself opens the object's detail.
- Sortable headers use `ap-sort` with `aria-sort`.
- Pagination (`ap-pager`) below, as "1–5 of 42 routes". Under 640px the table scrolls inside `ap-table-wrap`; long lists become cards (name, status, one key value).

**The consumer provides:** columns, rows, sort state, selection and the row actions.
""")


PROJECTS = [
    ("Shop", "shopping-bag", "ok", "Healthy", 9, "8 205", "Storefront, checkout and their APIs."),
    ("Payments API", "credit-card", "ok", "Healthy", 6, "3 410", "Card and SEPA payment endpoints."),
    ("Internal tools", "wrench", "warn", "1 target down", 14, "640", "Grafana, MQTT and staff tools."),
    ("Legacy", "archive", "critical", "1 route down", 4, "0", "Old sites kept until migration."),
]


def project_cards(limit=None):
    out = []
    for name, ic, tone, word, routes, rpm, desc in PROJECTS[:limit]:
        out.append(f"""<a class="ap-panel ap-project" href="#"><div class="ap-project-head"><span class="ap-project-mark">{icon(ic)}</span><span class="ap-status ap-status-{tone}"><span class="ap-dot" aria-hidden="true"></span>{word}</span></div>
<div><h3 class="ap-h ap-h-3">{name}</h3><p class="ap-caption" style="margin:2px 0 0;font-size:13px;line-height:18px">{desc}</p></div>
<div class="ap-project-facts"><span><b>{routes}</b> routes</span><span><b>{rpm}</b> req/min</span></div></a>""")
    return f'<div class="ap-projects">{"".join(out)}</div>'


C["ProjectCard"] = ("Apiary", 260, project_cards(), """# ProjectCard

A project card summarises one project: its health, how many routes it has, and its traffic. Cards link to the project's routes.

- A project groups routes, stream routes, redirects and uploaded certificates for organising and filtering. It is not an access boundary: roles apply to the whole cluster.
- Head: a Lucide icon chosen for the project on a `sunken` tile, and the project's worst status as a Status ("1 route down").
- Name in `title-3`, a one-line description, then the counts in `ink`.
- The whole card is the link; it lifts slightly on hover.
- Cards sit in a grid (`ap-projects`) that fills the width with cards at least 260px wide.

**The consumer provides:** name, icon, worst status, description, route count and traffic.
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

C["Tabs"] = ("Navigation", 110, """
<div class="ap-tabs" role="tablist" aria-label="Route sections">
  <button class="ap-tab" role="tab" aria-selected="true" type="button">Targets</button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">Traffic rules</button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">Certificate</button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">Access <span class="ap-count">3</span></button>
  <button class="ap-tab" role="tab" aria-selected="false" type="button">History</button>
</div>
""", """# Tabs

Tabs split one object's settings or one list into views of the same level.

- The selected tab is `ink`, semibold, with a 2px `ink` underline and `aria-selected="true"`; others are `ink-2`.
- Two to six tabs, named with nouns. A count (`ap-count`) only when it helps decide where to look.
- Tabs never hide unsaved changes: switching keeps what was typed.
- Under 640px the tab row scrolls sideways.

**The consumer provides:** the tab labels, the selected tab and the panels (`role="tabpanel"`).
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
<div class="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="dt" style="margin:0 auto">
  <div class="ap-dialog-head"><h2 class="ap-h ap-h-2" id="dt">Delete route shop.example.com?</h2></div>
  <div class="ap-dialog-body">
    <p style="margin:0">Requests to <span class="ap-code">shop.example.com</span> will get a 404 on all 3 replicas as soon as you confirm. Its automatic certificate is kept for 30 days in case you add the route again.</p>
    <div class="ap-field"><label class="ap-label" for="cf">Type the hostname to confirm</label><input class="ap-input ap-data" id="cf" placeholder="shop.example.com"></div>
  </div>
  <div class="ap-dialog-foot"><button class="ap-btn ap-btn-ghost" type="button">Keep route</button><button class="ap-btn ap-btn-danger" type="button">Delete route</button></div>
</div>
""", """# Dialog

A dialog asks for a decision that must be made before going on, usually confirming a destructive change.

- Title is the question, with the object: "Delete route shop.example.com?".
- Body says what happens, when, and what is kept. For changes that are hard to undo, ask the person to type the object's name.
- Buttons: the safe choice as a ghost button that names itself ("Keep route"), the action in `ap-btn-danger` (or primary for non-destructive decisions), right-aligned.
- A solid `surface` sheet (`ap-dialog`) over `scrim`, `shadow-float`, 460px wide, rising in over 280ms. Escape and the safe button close it; focus starts on the first field or the safe button and stays inside.
- Never stack dialogs, and never use one for information a Toast or Banner can give.

**The consumer provides:** the question, consequences, optional confirmation field, and the two actions.
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

- Segment widths match the weights exactly. The first group is `ink`, the canary `honey`, a third `line-strong`; more than three groups are listed, not drawn.
- Label each segment with the group and its share; when a segment is too narrow, keep only the share.
- Give the bar `role="img"` and an `aria-label` with every group and share.
- A caption below names anything else that changes who goes where: sticky sessions, header or cookie selection.

**The consumer provides:** the groups and their weights.
""")

C["CopyField"] = ("Apiary", 140, f"""
<div class="ap-field">
  <span class="ap-label">Create the root key on a manager node</span>
  <div class="ap-copy"><code>docker run --rm datapoint/apiary:0.4.0 secrets init | docker secret create apiary_root_key_2 -</code><button class="ap-btn ap-btn-sm" type="button">{icon("copy")}Copy</button></div>
  <span class="ap-help">The key goes straight into Swarm's encrypted store and never touches disk.</span>
</div>
""", """# CopyField

A copy field shows a command or value that people run or paste elsewhere, with a Copy button.

- The full text is visible and selectable; long lines scroll inside the field, never wrap.
- The label says where to run it; the help text says what it does.
- The button changes to "Copied" for 2 seconds. If the clipboard is refused, select the text instead.
- Never put secrets in a copy field. Commands that create secrets pipe them straight to their destination.

**The consumer provides:** the label, the text and the help text.
""")

C["EmptyState"] = ("Apiary", 250, f"""
<div class="ap-panel"><div class="ap-empty">
  <div class="ap-empty-mark" aria-hidden="true"></div>
  <h3 class="ap-h ap-h-2">No stream routes yet</h3>
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


C["DatePicker"] = ("Forms", 520, f"""
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
<div class="ap-field" style="width:300px"><label class="ap-label" for="dt1">Starts</label><div class="ap-dtp"><div class="ap-affix"><input class="ap-input ap-data" id="dt1" value="2026-11-05 22:00"><span class="ap-affix-text">UTC</span></div><button class="ap-btn ap-btn-icon ap-dtp-btn" type="button" aria-label="Choose starts on a calendar" aria-haspopup="dialog" aria-expanded="true">{icon("calendar")}</button></div><span class="ap-help">At most 7 days before it ends.</span></div>
{calendar()}</div>
""", """# DatePicker

A date and time field: type it, or choose it on a calendar.

- The text field takes `YYYY-MM-DD HH:MM` and stays the source of truth; the calendar button beside it opens a popover (`ap-cal-pop`, `role="dialog"`) that writes into it.
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
<div class="ap-field"><label class="ap-label" for="v2">Hostname</label><input class="ap-input ap-data" id="v2" value="docs.example.com"><span class="ap-note ap-checking"><span class="ap-spinner" aria-hidden="true"></span>Checking…</span></div>
<div class="ap-field"><label class="ap-label" for="v4">Hostname</label><input class="ap-input ap-data" id="v4" value="docs.example.com"><span class="ap-note ap-valid">{icon("circle-check")}No other route uses this hostname and path.</span></div>
<div class="ap-field"><label class="ap-label" for="v5">Description <span class="ap-optional">(optional)</span></label><input class="ap-input" id="v5" value="Storefront, checkout and their APIs, plus the old mobile endpoints"><div class="ap-field-foot"><span class="ap-help">Shown on the project card.</span><span class="ap-counter ap-counter-over">130/120</span></div></div>
<div class="ap-field"><label class="ap-label" for="v6">New password</label><input class="ap-input" id="v6" type="password" value="hunter2hunter"><ul class="ap-checklist"><li data-met>{icon("circle-check")}At least 12 characters</li><li data-met>{icon("circle-check")}Not a common password or repeated characters</li><li>{icon("circle")}Doesn't contain your email name</li></ul></div>
</div>
""", """# Validation

How forms tell people what to fix.

- **When:** a field is checked when you leave it, then again as you type, so a fixed error clears at once. Nothing turns red while you type in a field for the first time.
- **On submit,** every field is checked. Forms with more than one problem list them at the top in an error summary (`ap-error-summary`, `role="alert"`), in page order, each a link that moves focus to its field. With one problem, focus moves straight to that field.
- **Field errors** (`ap-error`, under the help text, linked with `aria-describedby`) set `aria-invalid`, which turns the border `critical`. Messages say what to do, with an example: "Enter a hostname, such as shop.example.com", not "Invalid hostname".
- **Checks that need the server** show "Checking…" (`ap-checking`) and, when it helps, a quiet confirmation (`ap-valid`).
- **Limits** show a counter (`ap-counter`) that turns `critical` past the limit; the field still accepts the text so nothing is cut off silently.
- **Rules that must all hold,** such as password rules, are a live checklist (`ap-checklist`).
- **Cross-field rules** (weights that add up to 100%, an end after the start) attach to the group or the second field.
- **Server errors** appear at the top of the form; what was typed is kept. Submit buttons stay enabled: pressing one is how people find out what's missing.

**The consumer provides:** the rules and their messages.
""")

C["FileDrop"] = ("Forms", 250, f"""
<div class="ap-field" style="max-width:480px"><span class="ap-label">Certificate and chain</span><label class="ap-drop">{icon("upload")}<span><strong>Choose a file</strong> or drop it here</span><span class="ap-caption">.pem, .crt or .cer, leaf certificate first</span><input type="file"></label></div>
<div class="ap-field" style="max-width:480px"><span class="ap-label">Private key</span><div class="ap-file">{icon("file-key")}<span>wildcard-example-net.key</span><span class="ap-caption" style="flex:none">1.7 KB</span><button class="ap-btn ap-btn-sm ap-btn-ghost ap-btn-icon" type="button" aria-label="Remove wildcard-example-net.key">{icon("x")}</button></div></div>
""", """# FileDrop

A file field you can click or drop onto (`ap-drop`), for certificates and keys.

- The whole zone is the file input's label, so it's one click and works with the keyboard; it highlights in `honey-soft` while a file is dragged over it.
- Once chosen, the file shows as a row (`ap-file`) with its name, size and a remove button.
- Checked in the browser first (type and content, such as a PEM header), then by the server (a key that doesn't match its certificate), with the error under the zone.
- Always offer a "Paste text" alternative next to it: people often have a certificate in a terminal, not a file.

**The consumer provides:** label, accepted types and help.
""")

for name, (group, height, body, readme) in C.items():
    d = os.path.join(ROOT, "components", name)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "preview.html"), "w").write(page(name, group, height, body.strip()))
    open(os.path.join(d, "README.md"), "w").write(readme.strip() + "\n")

print("written", len(C))
