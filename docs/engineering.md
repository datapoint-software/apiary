# Engineering

How Apiary's code is organized and written. The conventions follow each platform's own guidance; where we add or change a rule, it says so and why. The architecture these rules serve is in [architecture.md](architecture.md).

Researched against the official documentation on 2026-11-03, for .NET 10 with C# 14 and Angular 22.2. Check this file again before each major upgrade.

## Language

American English everywhere: our own names in code, documentation, commit messages and the interface's text. It's the language of the frameworks' names (`Color`, `AuthorizeAttribute`) and of the license text in `LICENSE`, which we can't change. The interface is also translated into European Portuguese, from catalogs whose keys are the English text: see [Translations](#translations).

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
  ideas/                           Feature ideas being tried on the prototype, ignored by Git (see .claude/skills/prototype/SKILL.md)
tools/                             Repository scripts, such as the third-party notices generator
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

Nesting and control flow (each level of nesting is one more condition the reader has to hold in mind):

- **At most three levels of nesting inside a method.** Every `if`, loop, `switch`, `try` and lambda body counts as a level.
- **Guard clauses first.** Handle invalid or uninteresting cases at the top and leave, so the rest of the method is the normal case.
- **No `else` after `return`, `throw`, `continue` or `break`.**
- **In loops, skip early with `continue`** instead of wrapping the body in an `if`. A body that still needs real logic becomes a well-named method.
- **`using` declarations** (`using var stream = …;`) instead of `using` blocks.
- **Pattern matching to merge checks,** such as `if (request is not { Host: { Length: > 0 } host }) return …;`, instead of nested ifs.
- **Switch expressions to map one value to another,** instead of `if`/`else if` chains. They're never nested inside each other.
- **No nested conditional operators.** `a ? b : c ? d : e` is easily misread.
- **Name complex conditions** (`var isExpired = …;`) rather than nesting or negating a compound one.
- **Braces always,** even around a single statement.

Analyzers check what they can:

- `else` after a jump: Roslynator RCS1211.
- Nesting that can be reduced: Roslynator RCS1208.
- `using` blocks that can be declarations: IDE0063.
- Braces: IDE0011.
- Complexity: CA1502, with a cyclomatic complexity limit of 10 per method set in `CodeMetricsConfig.txt`. It also catches most deep nesting.

The three-level limit and nested conditional operators are checked in review: no open-source analyzer measures nesting depth, and SonarAnalyzer, which does, isn't open source.

Readability:

- **Names say what things are, in the domain's own words** (`Route`, `LeaderLease`, `RenewalWindow`), as full words. Only the well-known abbreviations, such as `Http`, `Id` and `Tls`, are allowed.
- **Methods are short,** but length isn't a hard limit. Split a method when the new one has a name that stands for real work, not to meet a line count. Two methods that can only be understood together are worse than one.
- **No comments in code.** If code needs a comment to be understood, rename or restructure it until it doesn't. No commented-out code either. This covers XML documentation too: we don't publish libraries for developers outside Datapoint. If we ever do, that package gets XML documentation on its public API.
  - Descriptions that agents and the API document need are data, not comments: `[Action(name, description)]` for commands and queries, and `[Description]` on their properties.
- **No side effects inside expressions:** no assignments, `++` or calls that change state in a condition or an argument. Use parentheses whenever `&&` and `||` are mixed.
- **Interfaces only at real boundaries:** where there are two implementations, or a seam such as the cluster, the clock (`TimeProvider`), the ACME client or the network. Not one interface per class, and no layers that only pass calls through.
- **No mocking library.** Tests use real objects, and small hand-written fakes at those boundaries.
- **Immutable by default:** records for data, `readonly` fields, `init` properties, and `IReadOnlyList<T>` and the like in signatures.
- **LINQ for short transformations without side effects.** Use a loop when the code changes something, exits early, or runs on the proxy's request path, where LINQ's allocations matter.
- **Booleans for states that are and will always be binary;** an enum when there could be a third state, or when several Boolean arguments would make a call unreadable. Literal arguments are named at the call site: `Load(path, validate: true)`.
- **The null-forgiving operator `!`** only where the compiler can't see that a value is set. Prefer restructuring so it isn't needed.
- **Async all the way down,** following [David Fowler's guidance](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md):
  - No `async void`, `.Result` or `.Wait()`.
  - `await` rather than `ContinueWith`.
  - A `CancellationToken` passed through every call that takes one.
  - Async factory methods instead of async work in constructors.
  - Checked by CA2016, CA2012, and VSTHRD100 and VSTHRD002 from [Microsoft.VisualStudio.Threading.Analyzers](https://github.com/microsoft/vs-threading) (MIT).
- **Exceptions for bugs and infrastructure faults only.** Expected failures are error codes (see [Errors are codes, not messages](#errors-are-codes-not-messages)). `catch (Exception)` only at boundaries: the host, background services and the Mediator pipeline. Checked by CA1031.

[Primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/instance-constructors#primary-constructors):

- **Records:** positional records for commands, queries and results.
- **Classes:** a primary constructor for injected services. Use its parameters directly, rather than copying them into `_fields`.
- **Never assign to a primary constructor parameter.** Unlike a `readonly` field, nothing stops it from changing, so a reassigned dependency would be a silent bug.
- **A normal constructor** when it validates arguments or does more than receive them.
- IDE0290 (use a primary constructor) is a warning, so the style stays consistent. A parameter captured twice, in a field initializer and in a member, triggers CS9124, which fails the build.

C# 14 features we use: `field`-backed properties, null-conditional assignment (`a?.B = x`), extension members, and `nameof` with unbound generic types. See [What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14).

### Enforcement

- `.editorconfig` starts from [the dotnet/docs repository's](https://github.com/dotnet/docs/blob/main/.editorconfig). Our changes to it are marked with a comment that says why: configuration files aren't code, and the reason isn't visible anywhere else.
- `Directory.Build.props`:
  - `Nullable` and `TreatWarningsAsErrors` are on.
  - `AnalysisLevel` is pinned to `10.0-recommended`, so an SDK update can't change the rules silently.
  - `EnforceCodeStyleInBuild` is on.
- [Meziantou.Analyzer](https://github.com/meziantou/Meziantou.Analyzer) (MIT) and [Roslynator](https://github.com/dotnet/roslynator) (Apache-2.0) run in every project, with the rules we adopt at warning severity.
- **No SonarAnalyzer.** Version 10 is under the SONAR Source-Available License, which isn't open source.
- `dotnet format --verify-no-changes` runs in CI. See [code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview).
- `BannedSymbols.txt` fails the build on APIs we don't use (see below).

### Build and packages

- `.slnx` solution.
- `global.json` pins the SDK and selects Microsoft.Testing.Platform as the test runner.
- Central package management in `Directory.Packages.props`, with lock files, restore in locked mode in CI, and NuGet audit of transitive packages. See [central package management](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management).
- **Third-party notices are generated.** After adding or upgrading a NuGet package, run `python3 tools/third-party-notices.py` and commit `THIRD-PARTY-NOTICES.txt` with the change; `--check` fails when the file is out of date, for CI. It accepts only the licenses in `tools/licenses/` (MIT and Apache-2.0): a package under another license fails it until someone has reviewed that license, including whether it still lets Datapoint offer Apiary under a commercial license as well as the AGPL, and added its text there. The image ships the file in `/app` with `LICENSE`, `NOTICE` and `TRADEMARKS.md`.
- **No Native AOT or trimming.** YARP supports Native AOT, but DotNext's cluster and Datapoint.Mediator haven't been verified with it, and trimming turns HTTP/3 off. Trimming analyzers stay on as warnings, so we know the cost if we revisit this.
- **The image is published as `datapointsoftware/apiary` on Docker Hub,** tagged with the bare version. Only a Git tag publishes one; see [releasing.md](releasing.md). `latest` follows releases only, never a pre-release.
- **CI runs on every push to `main` and every pull request** (`.github/workflows/ci.yml`): the checks below, the web build and an image build that isn't pushed. Run the same commands locally before pushing.
- **The container image is our own,** based on Microsoft's Ubuntu runtime image, because HTTP/3 needs `libmsquic`, which the chiseled images don't reliably include. Kestrel falls back to HTTP/2 silently without it, so a test checks that HTTP/3 is actually served. The image runs as a non-root user.
- **Base images are pinned by digest** in the `Dockerfile`, after the tag they came from (`aspnet:10.0-noble@sha256:…`), so a build is reproducible and a changed upstream image can't slip in. Patches don't arrive by themselves either: when updating .NET or Node, or monthly for security fixes, get the new digests with `docker buildx imagetools inspect <image:tag>` and update all three. Datapoint's technical support team (`hello@datapoint.software`) owns these updates until CI and an automatic updater take over.

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

The API's contract for errors is codes: the UI turns them into words, so it can be translated without changing the API. Responses may also carry English text for developers and agents, such as a ProblemDetails `title`, but the UI never shows it or relies on it.

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
- **Text is optional and never sensitive.** `title` and `detail` are for whoever reads the raw response: someone using curl or the browser's developer tools, or an agent. Apiary's own errors can leave them out. Any text that reaches a client, whoever wrote it, must never contain what the caller sent, internal names (.NET types, namespaces, file paths, stack traces, hostnames, addresses, connection strings), or anything that tells the caller more than the code does, such as whether a user exists.
- **The UI reads only codes.** It never shows or tests `title`, `detail` or an exception's message, so a translation never misses text from the server.
- **Never echo the attempted value.** It's untrusted input: responses and logs carry the field and the code, never what was sent.

Where the words come from:

- **The UI** has a message catalog that maps each code and its parameters to text, written as the prototype words it: say what to do, with an example ("Enter a hostname, such as shop.example.com", not "Invalid hostname"). There is one catalog per language, and a code missing from a translation falls back to English. An unknown code shows a generic message with the code, so a newer server never leaves an error blank.
- **MCP** agents have no UI, and English is what they need: the model reads it, explains the problem to its user in their language, and often corrects its own call. So the MCP adapter adds an English description of each code from its own catalog, next to the code and parameters, and it can later share the UI's translations. For arguments it can't read, Datapoint.Mediator reports the field at fault, and Apiary turns it into a field error with the code `invalid`, like any other.
- **A test** enumerates every code and fails when one is missing from the UI's or the MCP catalog.
- **Another test** fails when the UI's code reads `title` or `detail` from an error response.

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
- Coverage with Microsoft.Testing.Extensions.CodeCoverage, collected from the product's assemblies only, without generated code (`tests/coverage.config`). CI fails when a project falls below its threshold in `tools/coverage-thresholds.json`; `python3 tools/coverage.py --files` shows what each file misses. Raise a threshold when coverage grows, and never lower one without saying why in the commit.
- `WebApplicationFactory` for the admin API and MCP.
- Raft runs as several in-process replicas, so failures, elections and recovery are tested without Docker. `SwarmReplicas` starts each replica in Swarm mode on its own loopback address (127.0.0.1 to 127.0.0.4), with the same ports, as Swarm tasks have, and a fake of Docker's DNS (`FakePeerNetwork`). macOS has only 127.0.0.1 until the aliases are added (`for n in 2 3 4; do sudo ifconfig lo0 alias 127.0.0.$n up; done`, until the next restart); without them, those tests are skipped. Linux answers on all of 127.0.0.0/8.
- Single sign-on is tested against `FakeIdentityProvider`, which serves a discovery document, keys and a token endpoint, and signs real ID tokens, so the client is checked against OpenID Connect rather than against itself.
- Test method names are sentences with underscores (`Rejects_a_loopback_target`). CA1707 is turned off for test projects only.
- **Tests read as specifications:** one behavior per test, laid out as arrange, act, assert, with no `if` or loops. Data comes from small named builders (`ARoute().WithTarget("127.0.0.1")`), not unexplained literals. Checked in part by xUnit's analyzers.
- One test project per source project, plus:
  - `Datapoint.Apiary.Testing`, shared by all of them: the state builders, test certificates and a test certificate authority, `TemporaryDirectory` and `Eventually`.
  - `Datapoint.Apiary.Architecture.Tests`, which checks the dependency rules above.
- `Datapoint.Apiary.Management.Tests` runs the management actions through `ManagementHost` on a standalone replica, with hand-written fakes in `Fakes/`.
- `Datapoint.Apiary.Tests` starts the real app in-process with `ApiaryApp`, on free ports and a temporary directory, and seeds state with `SeedAsync`. Proxy tests send real traffic to a `Backend` or an `EchoServer`. Since the proxy refuses loopback targets, these listen on the machine's first routable IPv4 address, so those tests need one (any private address does).
- Run everything with `dotnet test --solution Datapoint.Apiary.slnx` (CI adds `--max-parallel-test-modules 2 --coverage --coverage-output-format cobertura --coverage-settings tests/coverage.config`; the multi-replica tests time out when every project runs at once), one project with `dotnet test --project <path>`, one class with `--filter-class "*Name"`.

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
- **Forms:** [Signal Forms](https://angular.dev/api/forms/signals/form), stable since v22; see [Forms](#forms).
- **Routing:** lazy-loaded feature routes. Unsaved changes are guarded with a functional `CanDeactivateFn`.

### Readability

The same rules as in .NET. In TypeScript, ESLint enforces most of them.

| Rule | ESLint rule |
|---|---|
| At most three levels of nesting | `max-depth: 3` |
| A complexity limit per function | `complexity: 10` |
| No `else` after `return` | `no-else-return` |
| No nested conditional operators | `no-nested-ternary` |
| Braces always | `curly` |
| Strict equality | `eqeqeq` |
| One class per file, named after it | `max-classes-per-file: 1` |
| No `any`: use `unknown` and narrow it | `@typescript-eslint/no-explicit-any` |
| No non-null assertion `!` where restructuring removes the need; the rare remaining one is suppressed on its line | `@typescript-eslint/no-non-null-assertion` |
| `readonly` wherever a value doesn't change | `@typescript-eslint/prefer-readonly` |
| Angular's naming: camelCase members, PascalCase types | `@typescript-eslint/naming-convention` |

Short functions, full-word names, no comments, no side effects inside expressions, guard clauses, `continue` in loops and names for complex conditions apply as in .NET, and are checked in review. Like methods, functions have no hard length limit.

**Templates only display:**

- Logic goes into `computed()` signals: a template reads `isExpired()`, never `route.expires < now && !route.disabled`. Checked by `@angular-eslint/template/conditional-complexity` and `template/cyclomatic-complexity`.
- At most two levels of `@if` and `@for` nesting in a template. Anything deeper becomes a child component.
- Built-in control flow (`template/prefer-control-flow`), and self-closing tags for empty elements (`template/prefer-self-closing-tags`).
- Templates in their own `.html` file, except for library components of a few lines.

**Components do one job.** Feature pages load data and handle actions. Library and presentational components take inputs and emit outputs, nothing more. A component class of more than a few hundred lines is doing more than one job.

### Forms

- **One vocabulary of errors.** Client-side validators produce the same codes as the server's validators (`hostname.consecutiveDots`, `target.loopback`, `range`), so the UI's message catalog words both alike, and there's one list to translate.
- **Shared rules live in `@datapoint/apiary-ui`** as Signal Forms rule functions (`hostname()`, `port()`, `target()`, `ipRange()`), mirroring the server's FluentValidation extensions. A test compares the codes on both sides.
- **Each form's rules are in their own file,** apart from the component: `route-editor.ts` and `route-rules.ts`. The rules are tested without rendering anything.
- **The library decides when errors show.** `<ap-field>` shows a field's error when you leave it, then as you type. `<ap-error-summary>` lists them on submit and moves focus. A form never decides that on its own.
- **Fields that don't apply don't validate.** A field that depends on another, like the maintenance window's dates, is marked hidden or disabled in the schema, not only wrapped in `@if`, so it can never block a save.
- **Checks that need the server are async validators,** with debounce and a pending state, shown as "Checking…".
- **Server errors land on fields.** The submit handler maps the ProblemDetails `errors` onto fields by name; errors without a field go to the summary. Server text is never shown, only codes through the catalog.
- **Library controls plug straight in.** Inputs, selects, switches and the date picker implement Signal Forms' custom-control interfaces, so forms bind to them like native inputs.
- **Forms hold no business rules.** They check shape and give quick feedback. Anything that depends on the cluster's state is decided by the server.
- **HTTP:** a client generated from the admin API's OpenAPI document, so the UI and the API can't drift apart. Uploads with progress use `withXhr()`; fetch is the default.

### Translations

The interface is in English and European Portuguese (`pt-PT`). A signed-in user's choice is saved in their profile; before that, the browser's language decides, then English. Visitor pages follow the browser's `Accept-Language`.

- **Runtime catalogs, keyed by the English text,** like gettext. `{{ 'Save route' | t }}` in templates, `i18n.t('Save route')` in code, `{name}` for values (`'Delete {name}?' | t: { name }`). Text without a translation shows in English. One build serves every language, and switching doesn't reload the page. We chose this over Angular's built-in i18n, which builds the app once per language and needs a reload to switch.
- **Plurals go through `i18n.plural(count, one, other)`,** which uses `Intl.PluralRules`. Never build a plural from English words with `count === 1`.
- **Each feature folder has its catalog,** `routes/routes.pt.ts`, registered in `app.config.ts` with `provideTranslations('pt-PT', …)`. apiary-ui carries its own. Error codes have per-language message catalogs (`app-messages.pt.ts`), registered with `provideErrorMessages(catalog, 'pt-PT')`.
- **Whoever owns the text translates it.** A library component translates its built-in words ("Cancel", "Checking…"); the app translates what it passes in (labels, headings, confirmation text, toasts).
- **Dates and numbers use `Intl` with the current language,** never a fixed `'en-US'`.
- **Names, hostnames and technical values aren't translated,** nor is text an operator wrote, such as a maintenance message.
- **`npm run check:translations`** fails when a marked text has no Portuguese, its placeholders differ, or an error code has no Portuguese message. The container build runs it. It only sees literal keys, so text chosen from a table (`'Viewer'`, a status) is translated with `| t` where it's shown, and its keys are kept in the catalog by hand. When you add or change English text, add its translation in the same commit.

### The component library

- `@datapoint/apiary-ui` is built with ng-packagr, and its selectors use the `ap` prefix: `[apButton]`, `<ap-calendar-button>`, `<ap-field>`.
- It has a component where a card has behavior: buttons, fields and the error summary, banners, status, toasts, confirmations, the calendar button, the empty state, the page head and the password checks. Cards that are only styles (panels, tables, tabs, tags) are used as `ap-*` classes from the shared CSS. Apiary-specific pieces (ProjectCard, ClusterMap) stay in the app.
- It holds the shared behavior too: validation and the error summary, toasts, confirmations, and focus handling.
- **Accessibility primitives:**
  - The [Angular CDK](https://material.angular.dev/cdk/categories) for menus (`cdkMenu`), dialogs, overlays, focus traps and announcements.
  - Native elements before custom widgets: `<select>`, not a custom listbox; links for tabs that change the URL.
  - A combobox, like the search box, follows the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) by hand: `role="listbox"` and `aria-activedescendant`.
- **Styles:** the default emulated encapsulation; never `::ng-deep`. Tokens ship as a CSS file of custom properties, listed in the package's `exports`, and components use them through `var()`. Themes and display settings switch the same `data-theme`, `data-text`, `data-contrast` and `data-motion` attributes as the prototype.

### Tools and tests

- The `@angular/build` builder.
- [angular-eslint](https://github.com/angular-eslint/angular-eslint) and typescript-eslint, with the rules under [Readability](#readability) as errors, and Prettier.
- [Vitest](https://angular.dev/guide/testing) for unit tests, with component harnesses for library components where the CDK has them, otherwise by role and label. Specs sit next to their source (`route-model.spec.ts`), with shared builders in `src/app/testing/`. Run them with `npx ng test apiary-ui --watch=false` and `npx ng test apiary --watch=false`. With `--coverage`, as CI runs them, they fail below the `coverageThresholds` in `angular.json`; raise those when coverage grows, as for the server.
- [Playwright](https://playwright.dev/) with [axe-core](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for end-to-end and accessibility tests, in `src/web/e2e`. `npm run build`, then `npm run e2e`: it starts the real server with `dotnet run` on throwaway data, with the admin port on 19443 (`E2E_ADMIN_PORT` changes it) and the next four ports, creates the first administrator through setup, and runs axe on every admin page in both themes. The first run needs `npx playwright install chromium`.
- Avoid what the style guide replaced: NgModules, zone.js, `@Input`/`@Output`, `*ngIf`/`*ngFor`, `ngClass`/`ngStyle`, the webpack builders and Karma.
