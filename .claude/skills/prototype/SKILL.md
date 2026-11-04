---
name: prototype
description: Try a new feature idea quickly before committing to it. Checks the idea against Apiary's architecture and code (read-only), then builds one to three clickable variants on top of the design prototype in design/ideas/<slug>/, ignored by Git, with no tests, branches or commits. Ends with promoting the chosen variant into design/prototype and the docs, parking it, or dropping it. Propose it whenever a contributor asks for a new feature, page or workflow, rather than starting to implement it.
---

# Prototype an idea

Use this to try a feature idea before anyone builds it: check that it fits Apiary, then click through it in the prototype, in more than one shape if it isn't obvious which is best. Nothing here touches `src/`, runs tests or needs a branch. Ideas live in `design/ideas/<slug>/`, which Git ignores, so trying an idea and throwing it away costs nothing. Only an idea that is chosen moves into the spec (`design/prototype/` and `docs/`), through the usual branch and merge request.

## When to propose it

When a contributor asks for a new feature, page or workflow (not a bug fix or a small change to something that exists), propose prototyping it first instead of implementing it. Explain the steps below in a few sentences, say that nothing is committed until they choose a variant, and let them decide. If they want to go straight to implementation, do that.

## Steps

Tell the contributor which step you're on. Ask before moving from one step to the next.

### 1. Find the goal

Ask what problem the idea solves, for whom (operator, administrator, viewer, agent over MCP) and in which situation. The request is often a guess at a solution; write the goal down separately from it. Pick a short slug for the idea (lowercase, hyphens, e.g. `bulk-route-edit`).

### 2. Check that it fits

Read, don't change. Start with the docs, then the code they point to:

- [docs/architecture.md](../../../docs/architecture.md), [docs/failure-modes.md](../../../docs/failure-modes.md) and [docs/risks.md](../../../docs/risks.md)
- [docs/open-decisions.md](../../../docs/open-decisions.md), [docs/review-notes.md](../../../docs/review-notes.md) and [docs/implementation-plan.md](../../../docs/implementation-plan.md), in case the idea is already decided, planned or ruled out
- [design/project/README.md](../../../design/project/README.md) for the interface's principles and voice
- the parts of `src/` the idea would touch

Write `design/ideas/<slug>/IDEA.md`, about one page:

```markdown
# <Idea, in sentence case>

## Goal
Who needs it, in which situation, and what they can't do today.

## Fit
Fits / fits with changes / conflicts, and why in a sentence or two.

## What it would change
API, replicated state (new log entries or snapshots), MCP tools, permissions and roles, audit log, admin pages. Name files or areas.

## Risks
Behavior when replicas, nodes or quorum are lost; security; personal data (GDPR); anything in docs/risks.md it affects.

## Open questions
What needs a decision, and whether it needs someone with authority.

## Variants
One line per variant, what it tries.

## Log
Dated notes as the idea changes, ending with the decision.
```

If the idea conflicts with the architecture or a recorded decision, say so before building anything and suggest what would fit instead. Raise security, privacy and production concerns as you find them.

### 3. Build the variants

Build one to three variants when the shape isn't obvious, for example a page against a dialog, or one step against several. Each idea is a set of scripts and styles that load on top of the prototype:

```text
design/ideas/<slug>/
  IDEA.md        the fit check and log
  idea.js        any *.js, loaded in name order after the prototype's scripts
  idea.css       any *.css, appended to the prototype's styles (optional)
  preview.html   built, don't edit
```

Build it with `python3 design/prototype/build.py --idea <slug>`. Each script runs in its own scope after the prototype and before the first render, with all of its globals available (`D`, `Proto`, `route`, `Routes`, `go`, `refresh`, `dialog`, `toast`, `esc`, `icon` and the rest). To change the prototype, assign to its functions, never edit `design/prototype/` while trying an idea:

```js
// Variants, switched from the dashed Prototype controls button. ideaVariant() returns the current key.
IDEA = { title: 'Bulk edit', variants: [['page', 'Page'], ['dialog', 'Dialog']] };

// Extra sample data. Reseed, because the prototype seeded D before this script ran.
const baseSeed = seedData;
seedData = () => Object.assign(baseSeed(), { drafts: [] });
D = Proto.state.data === 'empty' ? emptyData() : seedData();

// A sidebar entry. Groups are [title, [[icon, label, href, count, warn], ...]].
const baseNav = navGroups;
navGroups = voters => { const g = baseNav(voters); g[2][1].push(['list-checks', 'Bulk edit', '#/bulk']); return g; };

// A new page, or a replacement for an existing one: the first matching route wins, so move it to the front.
route('/bulk', () => ({ title: 'Bulk edit', html: ideaVariant() === 'page' ? '…' : '…', mount: el => { /* events */ } }));
Routes.unshift(Routes.pop());
```

Follow the prototype's patterns and [design/project/README.md](../../../design/project/README.md): one primary action per page, validation, confirmations, writes locked without quorum, times in UTC. Reuse the components in `design/project/components/` rather than inventing new ones; if a variant needs a new component, say so, as it's a design system change. Write in English only: Portuguese comes when the idea is promoted. Add a sentence on what to try in each variant to `IDEA.md`.

Don't run tests, linters or builds of `src/`. Do check that the page loads without errors in the console.

### 4. Let them try it

Open the build locally for the contributor (`open design/ideas/<slug>/preview.html`) and tell them where to look: the page or button to start from, and the Prototype controls for switching variants and scenarios (no quorum, slow server, new install). Change it as they react, rebuild, and keep the log in `IDEA.md` current.

To show it to others, offer to publish `preview.html` as a private Artifact, only after the contributor has tried it locally and agreed. Ideas aren't in Git, so this is how a reviewer sees one.

### 5. Decide

Ask the contributor to choose, and record the decision in the log:

- **Promote** the chosen variant. On a `feat/` branch from an up-to-date trunk, following [CLAUDE.md](../../../CLAUDE.md):
  1. Move the code into the right `design/prototype/pages-*.js` (and `data.js`, `shell.js`, `prototype.css`) as plain prototype code: no `IDEA`, no variants and no overrides, written the way those files are written.
  2. Add the Portuguese strings to `design/prototype/i18n-pt.js`, and what to try to `design/prototype/README.md`.
  3. Rebuild with `python3 design/tools/build.py` and check the prototype.
  4. Add the feature to [docs/implementation-plan.md](../../../docs/implementation-plan.md), move what's still unsettled into [docs/open-decisions.md](../../../docs/open-decisions.md), and record the reasoning and the variants that lost in [docs/review-notes.md](../../../docs/review-notes.md). Update [docs/architecture.md](../../../docs/architecture.md) or [docs/risks.md](../../../docs/risks.md) if the fit check found something they should say.
  5. Commit in self-contained steps and, when asked, open a merge request. Building the feature in `src/`, with tests, is the normal development work that follows.
- **Park** it: leave the folder as it is. `IDEA.md` says where it stopped.
- **Drop** it: delete `design/ideas/<slug>/`. If the reason is worth keeping, for example a conflict with the architecture, offer to add it to [docs/review-notes.md](../../../docs/review-notes.md) so nobody tries it again blind.
