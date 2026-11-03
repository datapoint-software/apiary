# Review notes

Decisions made and findings noted while building the milestones without review, for the team to confirm, change or move into the other documents. Each says what was done, why, and what would change it.

## Deviations from engineering.md

- **The admin API uses reflection-based JSON**, not source generation. Mediator maps the actions and serializes their results itself. The replicated state and the access logs use source generation.
- **The UI's API client is written by hand** (`src/web/projects/apiary/src/app/api/api.ts`), not generated from the OpenAPI document. Every action is a `POST /api/<area>/<action>` with a JSON body, so a generator would add little for now. Revisit when the API stabilizes.
- **Component styles are global**, in `@datapoint/apiary-ui`'s `apiary.css`, as the design system ships them, instead of per-component styles. Moving them into components would split the design system's single stylesheet.
- **Expected failures in handlers throw `ActionFailedException`** with an error code and a kind (not found, conflict, unavailable, forbidden, throttled, invalid), mapped to ProblemDetails in one place. Field-specific failures throw FluentValidation's `ValidationException` instead, so they reach the right field.
- **Mediator action names are lowercase with hyphens** (`users.change-role`), because Mediator only accepts those.

## Product decisions

- **Route timeout:** 1 to 120 seconds, 30 by default.
- **Loopback is in the default admin allowlist**, besides the private ranges, so `docker compose` with the admin port bound to `127.0.0.1` works, and so does `apiary users create-admin` from inside the container.
- **Password minimum is 15 characters**, as architecture.md says. The prototype said 12.
- **Sessions last 12 hours**, with no idle timeout yet. They live in the replicated state, so signing out or disabling a user ends them on every replica. Signing in therefore needs a majority of voters; reads with an existing session don't.
- **Signing in has two steps.** The password step changes nothing; the code step starts the session. A short-lived challenge, encrypted with AES-GCM, carries the account between them.
- **Failed sign-ins are throttled per account and IP address**, in memory: free for 3 tries, then 2, 4, 8 seconds and so on, up to 15 minutes. The 5th failure in a row is audited.
- **Requests from other sites to the admin API are refused** using `Sec-Fetch-Site` and `Origin`, besides the `SameSite=Strict` cookie. Same-site requests are refused too, since apps routed by Apiary on sibling subdomains are same-site.
- **`apiary users create-admin` needs `--email` as well as `--name`**, since the email is the sign-in name. It reaches the running server with a token that Apiary writes to `{data}/operator-token`, readable only by its own user, and accepts only over loopback.
- **Users list:** Administrators only, since it lists everyone's email. The audit log stays readable by every role, as architecture.md says.

## Security findings to resolve before 1.0

- **The challenge key is random per process** until milestone 3 derives it from the root key. A sign-in whose two steps reach different replicas, or straddle a restart, fails and has to start again.
- **TOTP secrets and recovery-code hashes are stored unencrypted** in the state until milestone 3's envelope encryption. Recovery codes are hashed with SHA-256; they have about 40 bits of entropy, so a stolen state file would let an attacker find them offline. Encrypting the state at rest closes this; a slow hash would too.
- **The common-password list is short**, plus checks for repeated characters and keyboard or alphabet runs. Replace it with a real list (e.g. common passwords of 15 characters or more) before release.
- **The admin port is plain HTTP** until milestone 3, so the session cookie isn't marked `Secure` yet. It is once the request arrives over HTTPS.

## Regulatory findings

- **AGPL section 13.** The UI's "Source" link points to `sources.internal`, which people using a deployment outside Datapoint can't reach. The AGPL requires offering the source to every user who interacts with the software over a network, so the link needs a public URL before release (or a setting for each deployment).
- **Personal data:** the audit log shows email and IP addresses to every role, as the architecture allows, and the audit page says so.

## Known issues

- **Mediator's known issue (English messages in error responses) is fixed for HTTP** by stripping title and detail in `ProblemDetailsCodes`. It remains for MCP until milestone 9.
- **The public 404 page's colors** are hard-coded rather than taken from the design tokens.
- **`ng-package.json`** doesn't list the library's styles as assets yet, so a published package wouldn't include them. The app builds from source, so this doesn't matter until the library is published.
