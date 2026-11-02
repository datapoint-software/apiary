# Claude

This file tells you how to work in this repository: the conventions for branches, commits, merge requests and versions, and how to work with contributors. It is about how we work, not what the project is. For that, start with [README.md](README.md), which describes the project and contains or links to its functional and technical documentation. Read it and the relevant files it links to before making changes, paying attention to any documented risks (e.g. what deploys to production, and when).

## Branches, commits and merge requests

Sections that follow a specification summarize it, so there is no need to fetch it. Some rules deliberately narrow a specification, e.g. which branch types we use; follow them. Otherwise, where a summary and its specification disagree, the specification wins.

### Branch names

Following [Conventional Branch 1.1.0](https://conventionalbranch.org/v1.1.0/).

- Format: `<type>/<description>`, e.g. `feat/user-login`, `fix/session-timeout`, `release/1.2.0`.
- Types:
  - `feat`: new features.
  - `fix`: bug fixes.
  - `hotfix`: urgent production fixes.
  - `release`: release preparation.
  - `chore`: non-code tasks (dependencies, docs, config).
- Don't use the other types the specification allows: `feature` and `bugfix` (we use the shorter aliases, matching the commit types), or AI agent types such as `claude` (we name branches by purpose, whoever does the work).
- Trunk branches (`main`, `master`, `develop`) take no prefix.
- Description: lowercase letters, digits and hyphens, with hyphens between words. Dots are allowed between letters or digits, typically in version numbers. No leading, trailing or consecutive hyphens or dots.
- Validation regex:

  ```regex
  ^(?:main|master|develop|(?:feat|fix|hotfix|release|chore)/[a-z0-9]+(?:\.[a-z0-9]+)*(?:-[a-z0-9]+(?:\.[a-z0-9]+)*)*)$
  ```

### Commit messages

Following [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Commit often, one commit per self-contained change: each commit does one thing, leaves the repository working, and can be reverted on its own. Do not bundle unrelated changes into one commit.

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- `type`: a noun. The specification defines `feat` (new feature) and `fix` (bug fix); we also use `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style` and `test`.
- `scope`: an optional noun in parentheses naming the affected area, e.g. `fix(auth): ...`.
- `description`: a short summary, directly after the colon and space. Write it in the imperative mood, in lowercase, with no trailing period (`fix(auth): reject expired tokens`, not `fix(auth): Rejected expired tokens.`).
- First line: 72 characters at most, including type and scope.
- Body: one blank line after the description, wrapped at 72 characters. Required when the reason for the change isn't obvious from the first line: explain why, and any side effects. Trivial commits may be a single line.
- Footers: one blank line after the body, one per line, as `Token: value` or `Token #value`. Tokens use `-` instead of spaces (e.g. `Refs: #42`, `Reviewed-by: ...`), except `BREAKING CHANGE`.
- Breaking changes: mark with `!` before the colon (e.g. `feat(api)!: ...`), a `BREAKING CHANGE: <description>` footer, or both.
- Case: nothing is case-sensitive except `BREAKING CHANGE`, which must be uppercase. `BREAKING-CHANGE` is a synonym.

### Merge requests

- Title: formatted like a commit's first line (see above), summarizing the whole merge request.
- Description: use these headings, in this order:

  ```markdown
  ## Summary
  What changed, in a few sentences or bullets.

  ## Why
  The problem or goal behind the change, and why this approach.

  ## Testing
  How the change was verified: commands run, environments, results. Say what was not tested.

  ## Related issues
  `Closes #42` for issues the merge request resolves, `Refs #43` for related ones, or "None".
  ```

- Submitting: when asked to open a merge request, use the CLI that matches the `origin` remote (`git remote get-url origin`). The same rules apply to GitHub pull requests.

  | Remote | CLI | Create a merge request |
  | --- | --- | --- |
  | GitLab (gitlab.com or self-hosted) | [`glab`](https://gitlab.com/gitlab-org/cli) | `glab mr create --title "<title>" --description-file <file> --target-branch <trunk> --yes` |
  | GitHub (github.com or Enterprise) | [`gh`](https://cli.github.com/) | `gh pr create --title "<title>" --body-file <file> --base <trunk>` |

  Push the branch first, write the description to a temporary file, and share the resulting link with the contributor. If you can't tell which platform the remote is, ask.

- Setup: if the CLI is missing or not signed in, don't work around it. Ask the contributor to set it up, and guide them through it:
  1. Install it, following the official instructions linked in the table (e.g. `brew install glab` or `brew install gh` on macOS).
  2. Sign in to the remote's host with `glab auth login --hostname <host>` or `gh auth login --hostname <host>`. A personal access token is the simplest choice; `glab` needs the `api` and `write_repository` scopes.
  3. Check with `glab auth status` or `gh auth status`.

  Never ask for, type or store the token yourself: the contributor enters it into the CLI's own prompt.

### Versions

Following [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

- Format: `MAJOR.MINOR.PATCH`, non-negative integers without leading zeros, e.g. `1.4.2`.
- Git tags are the bare version, with no `v` prefix: `1.4.2`, not `v1.4.2`.
- Increment:
  - `MAJOR` for incompatible changes; reset `MINOR` and `PATCH` to 0.
  - `MINOR` for backwards-compatible features; reset `PATCH` to 0.
  - `PATCH` for backwards-compatible fixes.
- Commits decide the increment: a breaking change bumps `MAJOR`, `feat` bumps `MINOR` and `fix` bumps `PATCH`. Other types do not require a release.
- Pre-releases append `-` and dot-separated identifiers (e.g. `1.0.0-rc.1`) and sort before the release they precede.
- Build metadata appends `+` and identifiers (e.g. `1.0.0+20261102`) and is ignored when comparing versions.
- `0.y.z` is initial development, where anything may change; `1.0.0` defines the public API.
- Never modify a released version; any change is a new version.

### Working with Git

- Before changing anything, create a working branch from an up-to-date trunk, named following the rules above.
- Commit freely on your working branch.
- Only when asked: push branches, open or update merge requests, or create tags.
- Never commit or push to a trunk branch (`main`, `master`, `develop`); changes reach it only through a merge request.
- Never add attribution to yourself or any AI tool, anywhere: no `Co-Authored-By` trailers, "Generated with…" lines or similar in commits, merge requests, code, comments or documentation.
- Never commit secrets (tokens, passwords, private keys, `.env` files). Keep them where the README says, such as CI/CD variables or a secret store, and stop and warn the contributor if one is already in the history.
- Never rewrite published history (force-push, rebase or amend pushed commits) without being asked.
- An explicit instruction from the contributor overrides these defaults, e.g. "don't commit yet".

## Working with the contributor

Contributors range from experienced engineers to developers who are new to systems architecture, software development or the regulations that apply to our work. Help them learn as the work gets done, rather than only doing it for them.

- **Gauge experience first.** Infer the contributor's experience from how they write and what they ask; if unsure, ask. Adjust the depth of explanations, and don't lecture someone who clearly knows the subject.
- **Give an opinion before implementing.** When a less experienced contributor asks for a change, treat it as asking whether the change is a good idea. The request is often their guess at a solution, so first find the goal behind it. Then say whether the change achieves that goal, what else it affects, and whether there is a simpler or safer approach. Implement only after they confirm, as asked or adjusted. Trivial, clearly correct changes need no review.
- **Explain the why.** For each meaningful change, say what it does and why it is done that way, in plain language. Name the underlying concept (e.g. "idempotency", "least privilege", "separation of concerns") so they can look it up.
- **Show the trade-offs.** When there is more than one reasonable approach, briefly present the main options and their costs, recommend one, and let the contributor decide.
- **Flag risk before acting.** Point out anything that affects production, security, data or other teams before doing it, including the risks documented in [README.md](README.md) and the files it links to.
- **Highlight security issues as you find them.** Whenever you notice one, in the code you are changing or anywhere else, report it straight away, even if it is unrelated to the task: what it is, what an attacker could do, and how to fix it. Let the contributor decide whether to fix it now or document it as a known risk in [README.md](README.md) or a file it links to. Never leave a security issue unmentioned.
- **Raise regulatory and policy concerns.** Mention them when relevant, e.g. GDPR for personal data (including IP addresses in logs), retention of logs and backups, handling of secrets and credentials, and exposure of admin interfaces. Say when something needs a decision from someone with authority rather than settling it yourself.
- **Teach through review.** When reviewing their work, explain each issue and its consequence instead of silently fixing it, and acknowledge what was done well.
- **Prefer small steps.** Break larger tasks into steps the contributor can follow and verify, and suggest how to check each one (a command to run, what output to expect).
- **Be honest about uncertainty.** Say when you are unsure or guessing, and how to verify. Never present a guess as fact.
- **Point to sources.** Link official documentation for the tools and libraries involved so they can go deeper.
