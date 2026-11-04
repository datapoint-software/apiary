# Contributing

Thank you for helping with Apiary. This guide explains how to propose a change and get it merged. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

To report a vulnerability, don't open an issue: follow the [security policy](SECURITY.md).

## Before you start

- **Bugs and small fixes:** open a pull request directly, or an [issue](https://github.com/datapoint-software/apiary/issues/new/choose) first if you aren't sure it's a bug.
- **New features and larger changes:** open an issue first and describe the problem you want to solve. Apiary's scope and design are written down in [README.md](README.md) and the documents it links to, and some changes affect how a production cluster keeps its state. Agreeing on the approach first saves you from rewriting a pull request.
- **Sign the [Contributor License Agreement](CLA.md).** On your first pull request, the CLA Assistant bot comments with a link: sign it once and it covers all your future contributions. We can't merge a pull request until every author has signed. [CLA.md](CLA.md) explains why Datapoint asks for it.

## Setting up

You need:

- The .NET SDK named in [global.json](global.json) (10.0.300 or a later feature band). On macOS, use runtime 10.0.14 or later.
- Node.js 24, for the web app in `src/web`.
- Docker, to try Apiary as it runs in production.

Then:

```bash
dotnet build Datapoint.Apiary.slnx
cd src/web && npm ci
```

[README.md](README.md#try-it) explains how to run Apiary with Docker Compose, on a local Swarm, or with `dotnet run` and `npm start`.

## Making a change

Read [docs/engineering.md](docs/engineering.md) before writing code: it covers the repository layout, the dependency rules between projects, and the .NET and Angular conventions, including tests, validation, error codes and translations. Read [docs/risks.md](docs/risks.md) before changing how Apiary stores state, handles secrets or is exposed to the network.

Branches, commits and versions follow the rules in [CLAUDE.md](CLAUDE.md#branches-commits-and-merge-requests). In short:

- **Branch names** follow [Conventional Branch](https://conventionalbranch.org/v1.1.0/): `feat/…`, `fix/…`, `hotfix/…`, `release/…` or `chore/…`, in lowercase with hyphens, such as `fix/session-timeout`.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `fix(auth): reject expired tokens`, in the imperative mood and lowercase, 72 characters at most on the first line. Add a body that explains why when the first line doesn't.
- **One commit per self-contained change.** Each commit does one thing and leaves the repository working.
- **Write in American English**, and add the European Portuguese translation of any interface text you add or change, in the same commit.
- **Add or update tests** for every change in behavior.

## Checking your change

CI runs these on every pull request. Running them first saves a round trip:

```bash
dotnet format Datapoint.Apiary.slnx --verify-no-changes
python3 tools/third-party-notices.py --check
dotnet test --solution Datapoint.Apiary.slnx --max-parallel-test-modules 2
```

In `src/web`:

```bash
npm run check:translations && npm run lint
npx ng test apiary-ui --watch=false && npx ng test apiary --watch=false
npm run build && npm run e2e
```

`npm run e2e` starts a real server on throwaway data. The first run needs `npx playwright install chromium`. Some server tests need the machine to have a routable IPv4 address, such as a private one: [docs/engineering.md](docs/engineering.md) explains why.

`tools/third-party-notices.py --check` fails when a NuGet package the server ships isn't in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). Run it without `--check` to update the file. Only add dependencies whose license is compatible with the AGPL-3.0.

## Opening a pull request

- Target `main`, and give the pull request a title formatted like a commit's first line.
- Fill in the template's headings: Summary, Why, Testing and Related issues. Under Testing, say what you didn't test as well as what you did.
- Keep it focused. Unrelated changes go in a pull request of their own.
- A maintainer reviews it once CI passes. Reply to the comments with new commits rather than rewriting the branch, so the review can follow what changed.

## License

By contributing, you agree that your contributions are licensed under the [AGPL-3.0](LICENSE) and the [Contributor License Agreement](CLA.md).
