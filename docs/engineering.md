# Engineering

How Apiary's code is organized and written. The conventions follow each platform's own guidance; where we add or change a rule, it says so and why. The architecture these rules serve is in [architecture.md](architecture.md).

Researched against the official documentation on 2026-11-03, for .NET 10 with C# 14 and Angular 22.2. Check this file again before each major upgrade.

## Repository layout

```
src/
  Datapoint.Apiary/                The executable: hosting, Kestrel and YARP, the admin API, MCP, CLI commands; serves the UI
  Datapoint.Apiary.Cluster/        Raft, the replicated state, snapshots, leader forwarding, the transaction context
  Datapoint.Apiary.Management/     Datapoint.Mediator commands and queries: validation, authorization, audit
  Datapoint.Apiary.Proxy/          Route configuration from the state, stream routes, health checks
  Datapoint.Apiary.Certificates/   ACME, renewal, certificate selection
  Datapoint.Apiary.Security/       Root key, encryption at rest, password hashing, OAuth tokens
  web/                             The Angular workspace
    projects/apiary-ui/            @datapoint/apiary-ui: the design system's components, tokens and styles
    projects/apiary/               The admin interface
tests/
  Datapoint.Apiary.*.Tests/        One test project per project in src/
  Datapoint.Apiary.Architecture.Tests/   Checks the dependency rules below
deploy/                            Compose and stack files
design/                            The published design system and the prototype (see design/prototype/README.md)
docs/  branding/
Datapoint.Apiary.slnx  Directory.Build.props  Directory.Packages.props  global.json  .editorconfig
```

- **Few projects, each with one reason to change.** A new project needs a dependency rule it enforces; otherwise the code goes into an existing one.
- **Inside a project, group by feature** (`Routes/`, `Certificates/`, `Users/`), not by kind (`Handlers/`, `Validators/`).
- **Names:** projects and namespaces start with `Datapoint.Apiary`, matching the folder.

### Dependency rules

- `Security` depends on no Apiary project.
- `Cluster` depends on `Security`, to encrypt the state at rest.
- `Proxy` reads the state through `Cluster`'s interfaces. It never depends on `Management`: every request passes through the proxy, and management code must not be able to slow it down or break it.
- `Certificates` depends on `Cluster` and `Security`.
- `Management` depends on `Cluster`, `Certificates` and `Security`. Business rules, validation and authorization live only here.
- `Datapoint.Apiary` (the host) references everything and is referenced by nothing but tests.

`Datapoint.Apiary.Architecture.Tests` fails the build when a project reference breaks these rules.

### The design system and its styles

`@datapoint/apiary-ui` owns the tokens and the component styles. `design/tools/build.py` reads them from the library to build the published design system, so the two can't drift apart. Until the library exists, `design/project/components/bundle.css` and `tokens.json` are the source; they move into the library when it's created.

## .NET

### Code conventions

We follow Microsoft's conventions:

- [C# identifier names](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names):
  - PascalCase for types, members and constants, and an `I` prefix for interfaces.
  - `_camelCase` for private and internal instance fields, and `s_camelCase` for static fields.
  - camelCase for parameters and locals, and for primary constructor parameters of classes and structs. Records' primary constructor parameters are PascalCase.
- [C# coding conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions):
  - `var` only when the type is obvious from the right-hand side (`new`, a cast or a literal).
  - File-scoped namespaces, with `using` directives outside them.
  - Collection expressions, raw string literals, and `required` properties rather than constructors that only set fields.
- The [Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/) for public APIs, including the `Async` suffix.
- From the [.NET runtime's own style](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/coding-style.md):
  - Visibility modifiers always written, and first.
  - No `this.`.
  - Classes `sealed`, or `static`, unless something derives from them.

Files:

- **One top-level type per file,** named after the type: `RouteValidator.cs` holds `RouteValidator`. Nested types stay in their parent's file.
- **The only exception is generic types.** A generic type's file is named without its type parameters, and a type extended by a generic one of the same name shares its file: `Result.cs` holds both `Result` and `Result<T> : Result`.
- **A partial type split across files** uses `Type.Purpose.cs`, such as `RouteHandler.Logging.cs` for its `[LoggerMessage]` methods.
- Enforced by [Meziantou.Analyzer](https://github.com/meziantou/Meziantou.Analyzer) (MIT) rule MA0048, which reports every top-level type whose name doesn't match its file.

[Primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/instance-constructors#primary-constructors):

- **Records:** positional records for commands, queries and results.
- **Classes:** a primary constructor for injected services. Use its parameters directly, rather than copying them into `_fields`.
- **Never assign to a primary constructor parameter.** Unlike a `readonly` field, nothing stops it from changing, so a reassigned dependency would be a silent bug.
- **A normal constructor** when it validates arguments or does more than receive them.
- IDE0290 (use a primary constructor) is a warning, so the style stays consistent. A parameter captured twice, in a field initializer and in a member, triggers CS9124, which fails the build.

C# 14 features we use: `field`-backed properties, null-conditional assignment (`a?.B = x`), extension members, and `nameof` with unbound generic types. See [What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14).

### Enforcement

- `.editorconfig` starts from [the dotnet/docs repository's](https://github.com/dotnet/docs/blob/main/.editorconfig). Our changes to it are marked with a comment that says why.
- `Directory.Build.props`:
  - `Nullable` and `TreatWarningsAsErrors` are on.
  - `AnalysisLevel` is pinned to `10.0-recommended`, so an SDK update can't change the rules silently.
  - `EnforceCodeStyleInBuild` is on.
- Meziantou.Analyzer runs in every project, with its rules at warning severity for those we adopt, starting with MA0048.
- `dotnet format --verify-no-changes` runs in CI. See [code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview).
- `BannedSymbols.txt` fails the build on APIs we don't use (see below).

### Build and packages

- `.slnx` solution.
- `global.json` pins the SDK and selects Microsoft.Testing.Platform as the test runner.
- Central package management in `Directory.Packages.props`, with lock files, restore in locked mode in CI, and NuGet audit of transitive packages. See [central package management](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management).
- **No Native AOT or trimming.** YARP supports Native AOT, but DotNext's cluster and Datapoint.Mediator haven't been verified with it, and trimming turns HTTP/3 off. Trimming analyzers stay on as warnings, so we know the cost if we revisit this.
- **The container image is our own,** based on Microsoft's Ubuntu runtime image, because HTTP/3 needs `libmsquic`, which the chiseled images don't reliably include. Kestrel falls back to HTTP/2 silently without it, so a test checks that HTTP/3 is actually served. The image runs as a non-root user.

### ASP.NET Core

- Minimal APIs, as [Microsoft recommends for new projects](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis). Endpoints come from Datapoint.Mediator's actions; we don't write them by hand.
- Errors are [ProblemDetails](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api).
- `TimeProvider` for every clock, and `FakeTimeProvider` in tests. Times are stored and shown in UTC.
- `[LoggerMessage]` source-generated logging. Metrics come from `IMeterFactory`, with OpenTelemetry names (`apiary.routes.requests`) and UCUM units.
- System.Text.Json with source generation. Admin API and MCP input uses the [`JsonSerializerOptions.Strict`](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries) preset, so unknown and duplicate properties are refused.
- `BackgroundService.ExecuteAsync` [runs entirely in the background](https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/10.0/backgroundservice-executeasync-task) in .NET 10: startup that must finish first goes in `StartAsync`.
- Forwarded headers use `KnownIPNetworks`. `KnownNetworks` is obsolete in .NET 10.

### Validation

Commands and queries are validated with [FluentValidation](https://docs.fluentvalidation.net/) (Apache-2.0), through [Datapoint.Mediator.FluentValidation](https://github.com/datapoint-software/mediator/blob/main/docs/validation.md). It runs before every handler, so the admin UI, MCP agents and CLI commands all get the same checks. ASP.NET Core's `AddValidation()` would cover HTTP endpoints only, so we don't use it.

- **One validator per command or query,** in the same feature folder: `CreateRouteValidator` next to `CreateRoute`.
- **Rules shared by several commands are extension methods,** written and tested once:
  - `.Hostname()`.
  - `.Port()`.
  - `.Target()`, which refuses loopback and link-local addresses.
  - `.IpRange()`.
- **Rules that need the current state run on the leader,** such as "this hostname and path are already a route". The leader validates against the latest state, as [architecture.md](architecture.md#writes) describes.
- **The server decides.** Forms repeat the simple checks for instant feedback, but every rule is enforced by its validator.

### Errors are codes, not messages

No text written in .NET reaches a client: not validation messages, and not exception messages. The API returns error codes; the UI turns them into words, so it can be translated without changing the API.

- **Every failure has a code,** with parameters when the text needs them, such as `{ "field": "timeout", "code": "range", "params": { "min": 1, "max": 120 } }`.
  - Validators set codes with FluentValidation's `WithErrorCode`.
  - Expected failures elsewhere are codes too: `route.notFound`, `route.duplicate`, `cluster.noQuorum`, `auth.forbidden`.
- **Codes are a contract.**
  - Lowercase words separated by dots, stable once released.
  - A code is never renamed or reused; one that's no longer produced is marked deprecated.
  - They're defined in one place in `Management` and published in the OpenAPI document, so the generated client knows them.
- **Validation failures** are a 400 ProblemDetails with an `errors` list of `{ field, code, params }`. Field names match the form's, so `@datapoint/apiary-ui` attaches each error to its field and lists them in the error summary.
- **Other failures** are a ProblemDetails with a `code` and the matching status: 404, 409, 403, or 503 while writes are paused.
- **Unexpected exceptions** are a 500 with the code `internal` and the request's trace ID. The exception's message and stack trace go to the log only.
- **No human text in ProblemDetails:** `title` and `detail` are left out.
- **Never echo the attempted value.** It's untrusted input: responses and logs carry the field and the code, never what was sent.

Where the words come from:

- **The UI** has a message catalog that maps each code and its parameters to text, written as the prototype words it: say what to do, with an example ("Enter a hostname, such as shop.example.com", not "Invalid hostname"). The catalog is ready for Angular's internationalization when translations come. An unknown code shows a generic message with the code, so a newer server never leaves an error blank.
- **MCP** agents have no UI, so the MCP adapter adds an English description of each code from its own catalog, next to the code and parameters. It's never an exception message, and it can later share the UI's translations.
- **A test** enumerates every code and fails when one is missing from the UI's or the MCP catalog.

**Gap in Datapoint.Mediator 4.0.0-beta.3:** its adapters still produce English text in three places:

- An argument that fails to bind (malformed JSON, a wrong type) returns a 400 with the exception's message.
- 401 and 403 have English titles.
- The MCP adapter passes the same message to agents.

FluentValidation's exceptions go through `MapException`, so Apiary maps those to codes itself. For the rest, Datapoint.Mediator needs a change: codes and field paths for argument errors, and a way to shape its 400, 401 and 403 responses. We make that change in the Mediator repository, not here.

### Security APIs

- Certificates load through `X509CertificateLoader`. The `X509Certificate2` constructors that take bytes or paths are obsolete ([SYSLIB0057](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0057)).
- Passwords are hashed with `Rfc2898DeriveBytes.Pbkdf2` and a salt from `RandomNumberGenerator`. The class's constructors are obsolete ([SYSLIB0060](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0060)).
- Banned, so the build fails if they're used:
  - `System.Random` for anything security-related.
  - ASP.NET Core Data Protection. It expects one key ring shared by every replica, and our secrets come from the root key instead.
  - `BinaryFormatter`.
  - The obsolete certificate and key-derivation constructors.
- Post-quantum algorithms are experimental in .NET 10 and need OpenSSL 3.5; we don't use them yet.

### Tests

- [xUnit v3](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform) on Microsoft.Testing.Platform, with xUnit's own assertions. No FluentAssertions, which is now commercial.
- Coverage with Microsoft.Testing.Extensions.CodeCoverage.
- `WebApplicationFactory` for the admin API and MCP.
- Raft runs as several in-process replicas, so failures, elections and recovery are tested without Docker.
- Test method names are sentences with underscores (`Rejects_a_loopback_target`). CA1707 is turned off for test projects only.

## Angular

### Code conventions

We follow the [Angular style guide](https://angular.dev/style-guide) and [Angular's best practices](https://angular.dev/assets/context/best-practices.md). Several are defaults since v22 and need no code: standalone components, OnPush change detection, zoneless, and strict TypeScript and templates.

- **Files** have no type suffix (`route-list.ts`, `route-list.html`, `route-list.spec.ts`). Folders follow features, which follow the sidebar: `routes/`, `certificates/`, `users/`…
- **Components:**
  - `input()`, `output()` and `model()`, and signal queries.
  - The `host` object instead of `@HostBinding` and `@HostListener`.
  - `inject()` instead of constructor parameters.
  - `@if`, `@for`, `@switch` and `@defer`.
  - Members used only by the template are `protected`; properties Angular sets are `readonly`.
- **State:** signals, `computed` and `linkedSignal`. `effect` is only for side effects outside Angular, never to copy state. Data is loaded with `httpResource`.
- **Services:** the `@Service` decorator, introduced in v22, rather than `@Injectable({ providedIn: 'root' })`.
- **Forms:** [Signal Forms](https://angular.dev/api/forms/signals/form), stable since v22. The library adds the validation behavior the prototype settled (see the Validation card): check a field when you leave it, then as you type, and show an error summary on submit. It builds these on the forms' `touched()` and `errors()` signals.
- **Routing:** lazy-loaded feature routes. Unsaved changes are guarded with a functional `CanDeactivateFn`.
- **HTTP:** a client generated from the admin API's OpenAPI document, so the UI and the API can't drift apart. Uploads with progress use `withXhr()`; fetch is the default.

### The component library

- `@datapoint/apiary-ui` is built with ng-packagr, and its selectors use the `ap` prefix: `<ap-button>`, `<ap-date-picker>`.
- It has one component for each design system card. Apiary-specific pieces (ProjectCard, ClusterMap, Split) stay in the app.
- It holds the shared behavior too: validation and the error summary, toasts, confirmations, menus, and focus handling.
- **Accessibility primitives:**
  - [Angular Aria](https://angular.dev/guide/aria/overview), stable since v22, for menus, tabs, select and listbox.
  - The CDK for dialogs, overlays, focus traps and announcements. Aria has no dialog.
- **Styles:** the default emulated encapsulation; never `::ng-deep`. Tokens ship as a CSS file of custom properties, listed in the package's `exports`, and components use them through `var()`. Themes and display settings switch the same `data-theme`, `data-text`, `data-contrast` and `data-motion` attributes as the prototype.

### Tools and tests

- The `@angular/build` builder.
- [angular-eslint](https://github.com/angular-eslint/angular-eslint) and Prettier.
- [Vitest](https://angular.dev/guide/testing) for unit tests, with component harnesses for library components.
- Playwright with axe-core for end-to-end and accessibility tests, reusing the prototype's flows.
- Avoid what the style guide replaced: NgModules, zone.js, `@Input`/`@Output`, `*ngIf`/`*ngFor`, `ngClass`/`ngStyle`, the webpack builders and Karma.
