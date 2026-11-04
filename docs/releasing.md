# Releasing Apiary

How a version gets from `main` to Docker Hub, and how to try a pre-release on a development Swarm. Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html); see [CLAUDE.md](../CLAUDE.md#versions).

## What CI does

| Workflow | Runs on | What it does |
| --- | --- | --- |
| [`ci.yml`](../.github/workflows/ci.yml) | Every push to `main` and every pull request | Restores in locked mode, builds, checks formatting and third-party notices, and runs the server tests with coverage; checks translations, lints, unit-tests and builds the web app; runs the end-to-end and accessibility tests against a real server; builds the image for `linux/amd64` without pushing it |
| [`release.yml`](../.github/workflows/release.yml) | A tag such as `1.0.0-alpha.1` or `1.0.0` | Runs the same checks, checks the tag matches the version in the code, then builds the image for `linux/amd64` and `linux/arm64` and pushes it to [`datapointsoftware/apiary`](https://hub.docker.com/r/datapointsoftware/apiary) |

Only a tag publishes an image. To rehearse a release, run the Release workflow by hand from **Actions → Release → Run workflow**: it runs every step for both platforms, but doesn't sign in to Docker Hub or push, so it needs no secrets. A release tags the image with its version; a final release (no `-`) also moves `latest`, a pre-release never does. Each image carries a build provenance attestation and an SBOM, which `docker buildx imagetools inspect datapointsoftware/apiary:<version> --format '{{ json .SBOM }}'` shows.

Actions are pinned by commit SHA, with the version in a comment, so a moved tag upstream can't change what runs. Every Monday, [Dependabot](../.github/dependabot.yml) opens one pull request that updates them, SHA and comment together, and CI runs it before it's merged.

## Set up publishing (once)

1. On Docker Hub, create a [personal access token](https://docs.docker.com/security/access-tokens/) for an account that can push to `datapointsoftware/apiary`, with **Read & Write** scope. Name it after its use, e.g. "GitHub Actions apiary release".
2. On GitHub, in the repository's **Settings → Environments**, create an environment named `docker-hub` and add two secrets to it: `DOCKERHUB_USERNAME` (the account's name) and `DOCKERHUB_TOKEN` (the token). Restrict its deployment tags to the version pattern, and add required reviewers if a release should need a second person's approval.
3. Keep the token only there. If it leaks, revoke it on Docker Hub and create another.

## Release a version

1. Choose the version from the commits since the last release: a breaking change raises `MAJOR`, `feat` raises `MINOR`, `fix` raises `PATCH`. Before `1.0.0`, count pre-releases up: `1.0.0-alpha.1`, `1.0.0-alpha.2`, then `1.0.0-beta.1`, `1.0.0-rc.1`.
2. Set it in both places, in one commit on `main` (`chore: raise the version to <version>`):
   - `<Version>` in [`Directory.Build.props`](../Directory.Build.props);
   - `version` in [`src/web/projects/apiary/src/app/version.ts`](../src/web/projects/apiary/src/app/version.ts).
3. Wait for CI to pass on that commit.
4. Tag it with the bare version, no `v`, and push the tag:

   ```bash
   git tag -a <version> -m "<version>"
   git push origin <version>
   ```

5. Follow the Release workflow under **Actions**. It fails without publishing anything if the tag doesn't match both versions.

A published version is never changed. To fix one, release the next version. A tag that failed before publishing can be deleted and pushed again.

## Try a pre-release on a development Swarm

Follow [deploying.md](deploying.md), with these differences:

- **Fewer nodes.** One edge node is enough to try it. With fewer than 3, set `replicas:` in your copy of the stack file to the number of labeled nodes, since each runs at most one replica.
- **Let's Encrypt's staging service.** It's the default, so leave `Apiary__Acme__DirectoryUrl` unset: its certificates aren't trusted by browsers, but its rate limits are far higher, so trying things doesn't lock out a hostname.
- **A key of its own.** Create a separate root key for the development cluster and never reuse it in production.

Deploy a version by naming it (manager):

```bash
APIARY_VERSION=1.0.0-alpha.1 docker stack deploy -c deploy/stack.yaml apiary
```

To upgrade, run the same command with the new version; Swarm replaces one replica at a time and rolls back if one fails to start. `docker service ps apiary_apiary` shows each replica's version and state.

Pre-releases can change anything, including how state is stored. Treat a development cluster's data as disposable, and back it up before upgrading if you want to keep it.
