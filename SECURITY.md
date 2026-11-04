# Security policy

Apiary sits in front of other services, terminates TLS and signs people in, so a vulnerability in it can expose everything behind it. Thank you for reporting one privately.

## Reporting a vulnerability

Don't open a public issue, pull request or discussion for a vulnerability.

- **Preferred:** report it through GitHub's [private vulnerability reporting](https://github.com/datapoint-software/apiary/security/advisories/new), on the repository's **Security** tab. Only the maintainers see it, and we can work on the fix and the advisory with you there.
- **Without a GitHub account:** email `hello@datapoint.software` with "Security" in the subject.

Include what you can of:

- The affected version (`docker image inspect` on the image, or the commit) and how Apiary is deployed: Swarm, a one-node Swarm or Docker Compose.
- What an attacker can do, and what they need first, such as network access to the admin port or a signed-in account.
- Steps or a proof of concept that reproduce it.

Never include real credentials, root keys or other people's data. If your proof of concept needs them, describe them instead.

## What happens next

- We confirm we received the report within 5 working days.
- We tell you whether we can reproduce it and how we plan to fix it within 15 working days, and keep you updated until it's fixed.
- We publish a GitHub security advisory with the release that fixes it, and request a CVE when one applies. We credit you in the advisory unless you ask us not to.
- Please give us 90 days from your report before disclosing it publicly, or less if we've released the fix. If a vulnerability is being exploited, tell us and we'll agree on a shorter timeline.

## Supported versions

Apiary is in development, before `1.0.0`. Fixes go into the next release only: upgrade to the latest version to get them. This section will list the supported versions once `1.0.0` is released.

## Scope

In scope: the code in this repository and the `datapointsoftware/apiary` images built from it.

Out of scope, unless Apiary makes them worse: vulnerabilities in Docker, the .NET runtime, Let's Encrypt or other dependencies, which you should report to their maintainers; denial of service by sheer traffic volume; and deployments that ignore [Deploying](docs/deploying.md), such as an admin port exposed to the internet. The known risks are in [Risks and considerations](docs/risks.md).
