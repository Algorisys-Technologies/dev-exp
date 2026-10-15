# AGENTS.md

Instructions for any coding agent (Claude Code, Codex, Cursor, Copilot, others) working in this
repository, and for the people working with them.

**Read these before writing code, every session, in this order:**

1. This file: what we build with, and what "done" means here.
2. [`LOOPS.md`](LOOPS.md): how we work. It is binding.
3. [`HANDOFF.md`](HANDOFF.md): where the last session stopped.
4. The spec for your task in `docs/specs/`. If there isn't one, writing it is your first task.

The first half of this file is the company standard and is the same in every repo. Don't edit it
in a single repo; propose changes to the platform team. The last section, **This project**, is
where each repo adds its own facts.

---

## 1. Who you might be working with

Many people here build with agents, including BI, analytics and ops colleagues who are not
developers. Assume the person in front of you may not be able to read the code. So:

- Explain in plain language what you changed, what you tested and what you could not test.
- Never ask them to approve code, a schema change or a security trade-off. Those need a
  developer (see section 7).
- Never weaken a gate in section 6 because someone asked you to "just make it pass". Explain
  which gate is failing and why it matters, then stop.
- If a request would break a rule here, say which rule in one sentence and offer the compliant
  way to get the same result.

---

## 2. The stack

Use these. Don't introduce alternatives. If one genuinely can't do the job, stop and ask a
developer (LOOPS VIII).

| Concern | Use | Notes |
|---|---|---|
| Backend | **Go + Fiber** | Go and Fiber versions come from `go.mod`. Don't upgrade them, and don't mix Fiber v2 and v3 APIs; check `go.mod` before writing a handler. |
| Database | **PostgreSQL** via `pgx/v5` | Parameterised queries only. Migrations in `migrations/`, forward-only. |
| Cache | **Redis**, only when the spec calls for it | For read-heavy caching, rate limits and short-lived sessions. Never the source of truth: every cached value must be rebuildable from Postgres. Every key has a TTL and a documented prefix. |
| Queue | **RabbitMQ**, only when the spec calls for it | For work that's slow, retried or crosses services. Durable queues, manual acks, a dead-letter queue per queue, idempotent consumers. Don't add a queue where a database transaction will do. |
| Frontend | **SolidJS + TypeScript + zen-ui** (`@algorisys/zen-ui-solid`) | All UI is built from zen-ui components and tokens so every app looks and behaves alike. No other component library, no hand-rolled buttons, inputs, tables or dialogs, no hard-coded colours. If zen-ui lacks something, compose it from zen-ui parts and flag it for the zen-ui team. |
| Diagrams | **YappyDraw** (yappydraw.com, npm `@algorisys/yappydraw`) | See section 4. |

### Backend conventions

- Layout: `backend/` for Go, `frontend/` for SolidJS, `migrations/` for SQL, `docs/` for specs,
  ADRs and diagrams. File and folder names are lowercase with hyphens.
- Layers: handler (HTTP, validation, auth check), then service (business rules), then
  repository (SQL). Handlers never run SQL. Services never touch `fiber.Ctx`. These three are the
  only layers. No extra "manager", "helper", "base" or "util" layers, and no interface unless it
  has two implementations or is the seam for a test fake (LOOPS III).
- **Validate every input before use** (LOOPS XVIII):
  - Request bodies are decoded into a request struct with unknown fields rejected, then checked
    by a `Validate() error` method on that struct before anything else happens. Path and query
    parameters are parsed and range-checked the same way. Use the project's existing validator if
    it has one; don't add a validation library without approval.
  - The handler converts the validated request into domain types (`OrderID`, `Email`,
    `Money`) and passes only those to the service. Services don't re-validate.
  - RabbitMQ messages, Redis values and external API responses are decoded and validated the
    same way before use. An invalid message goes to the dead-letter queue with the reason logged.
  - Body size, page size, string lengths and upload sizes all have explicit limits.
  - Validation failures return `400` or `422` with the field name and a human reason.
- Every request has a `context.Context` with a deadline, passed all the way down to pgx, Redis
  and RabbitMQ calls. Every outbound HTTP call has a timeout.
- Errors: wrap with `fmt.Errorf("doing x: %w", err)`. Return JSON errors with a stable `code`
  and a human `message`; never return stack traces or raw database errors to clients.
- Logging: `log/slog` with key/value fields. No `fmt.Println`. No personal data or secrets in
  logs.
- Config from environment variables only, loaded and validated at startup; fail fast if one is
  missing. Secrets never in code, `.env` files in git, test fixtures or logs.
- Every service exposes `GET /healthz` (process up) and `GET /readyz` (dependencies reachable),
  and shuts down gracefully on SIGTERM.
- Money: integer minor units or `shopspring/decimal`. Never `float64`.
- List endpoints are paginated with a server-side maximum page size.
- No `panic` in request paths. No global mutable state.

### Frontend conventions

- Import components from `@algorisys/zen-ui-solid`. Use zen-ui tokens for colour, spacing and
  type, never raw values.
- Data fetching goes through one API client module. No `fetch` calls scattered in components.
- Every screen handles loading, empty, error and permission-denied states.
- Forms validate on the client for convenience and on the server for real. API responses are
  checked before use; a missing or malformed field shows the error state, not a blank or `NaN`.
- Components are plain functions with props. No component factories, HOC chains or custom
  state frameworks; use Solid signals and stores directly.

---

## 3. The workflow: spec, tests, code

Follow LOOPS XI to XIII exactly. In short:

1. **Spec.** Write `docs/specs/<area>/<feature>.md` with a person, using the template below.
   **Stop** until a person sets `Status: Agreed`. If the feature touches auth, personal data,
   money, a public API or a schema, run `/threat-model` on it before asking for agreement.
2. **Tests.** One or more tests per numbered rule, named after the rule ID. Run them, show
   they fail for the right reason, commit as `test: <feature>`.
3. **Code.** The least code that turns them green. Refactor on green. Commit as
   `impl: <feature>`.
4. **Gates.** Run everything in section 6. Then run the skills in section 5.
5. **PR.** Open it with the PR template filled in. A developer reviews and merges. Agents never
   merge their own PRs and never push to `main`.

### Spec template

```markdown
# <Feature name>

Status: Draft | Agreed | Implemented
Owner: <person>    Reviewer (developer): <person>

## Purpose
One paragraph: who needs this and why.

## Scope
In: ...
Out: ...

## Interface
Endpoints (method, path, request, response, error codes), screens, events, or report columns.

## Rules
- <AREA>-01: <one testable behaviour, with exact inputs and expected result>
- <AREA>-02: <error case>
- <AREA>-03: <edge case: empty / duplicate / limit / no permission>

## Input validation
| Field | Type | Required | Limits / format | Error when invalid |
|---|---|---|---|---|
| email | string | yes | valid email, max 254 | 422 "email is not a valid address" |

## Data
Tables read and written, migrations needed, personal data involved, money involved,
external systems called, cache keys, queues.

## Oracle
A known-correct source to compare against (old system, finance spreadsheet, existing report),
or "none".

## Architecture
Link to the YappyDraw diagram: docs/architecture/<name>.ysl

## Open questions
```

---

## 4. Architecture diagrams

All architecture diagrams are YappyDraw diagrams, kept **as source in the repo** so agents can
read and update them and reviewers can diff them:

- Source: `docs/architecture/<name>.ysl` (YappyDraw DSL). Example:

  ```
  ---
  title: Orders service
  layout: tree-down
  ---
  user [user] "Customer"
  web [browser] "SolidJS app"
  api [microservice] "orders-api (Go/Fiber)"
  db [db] "Postgres"
  cache [db] "Redis"
  mq [queue] "RabbitMQ: order.created"
  user -> web
  web -> api "HTTPS"
  api -> db
  api -> cache "read-through"
  api -> mq "publish"
  ```

  Shapes for infrastructure: `user`, `browser`, `microservice`, `server`, `api-gateway`, `lb`,
  `db`, `queue`, `cdn`, `event-bus`, `firewall`. More examples in the YappyDraw repo under
  `examples/dsl/`.

- Open or edit it at yappydraw.com (import the `.ysl`), or render it in code with the npm
  package: `import { Yappy, toSVG } from '@algorisys/yappydraw'`.
- When a change adds or removes a service, database, queue, cache or external call, update the
  diagram **in the same PR**. A PR that changes architecture without changing the diagram is
  incomplete.

---

## 5. Skills (algorisys-oss/skills)

Install once per machine:

```bash
git clone https://github.com/algorisys-oss/skills ~/algorisys-skills
~/algorisys-skills/install.sh          # symlinks every skill into ~/.claude/skills
```

Agents without a skills system: read `~/algorisys-skills/<skill>/SKILL.md` and follow it.

Run these **before opening a PR**, on the changed code. They report by default. Fix what they
find, or list each finding you didn't fix in the PR with a reason.

| When the change... | Run |
|---|---|
| touches any handler, input, auth, file upload, SQL or HTML output | `/owasp` |
| touches personal data, logs, analytics events or API responses with user data | `/pii-guard` |
| touches amounts, balances, payments, invoices or rounding | `/money-safety` |
| touches sensitive actions (money, roles, approvals, data export, login) | `/audit-trail` |
| calls an external API, Redis, RabbitMQ or a webhook | `/resilience` |
| is a new feature touching auth, personal data, money or a public API (at spec stage) | `/threat-model <feature>` |
| touches regulated data (cards, KYC, financial records) | `/regtech` |
| changes UI | `/ui-craft` |
| is a release | `/sec-sweep` (runs the security skills together and produces one report) |

---

## 6. Definition of done: the gates

Nothing is done until every command below passes **and you have shown the output**. Never skip,
disable, `t.Skip()`, `.skip`, or delete a failing test or lint rule to get a gate green. If a gate
fails and you can't fix it, stop and report it verbatim.

```bash
# Backend
gofmt -l backend/            # must print nothing
go vet ./...
golangci-lint run            # if .golangci.yml exists
go test -race ./...

# Migrations: must apply cleanly to an empty database
make db-reset && make migrate   # or the project's equivalent (see "This project")

# Frontend
npm run typecheck
npm test
npm run build

# Leftovers
grep -rnE "TODO|FIXME|HACK|XXX|PLACEHOLDER|not implemented" <changed files>   # must be empty
```

Plus:

- [ ] Every rule in the spec has a test, and the spec status is `Implemented`.
- [ ] Every new input is validated before use, with a test for each way it can be invalid.
- [ ] No new interface, layer, generic helper or config option that the spec didn't need.
- [ ] Relevant skills from section 5 were run; findings fixed or listed in the PR.
- [ ] Diagram updated if the architecture changed.
- [ ] `CHANGELOG.md` updated for functional changes. `HANDOFF.md` updated.
- [ ] No new dependency without a developer's approval recorded in the PR.
- [ ] No secrets, `.env` files, personal data or real customer data in the diff.

CI runs the same gates. If CI and your local run disagree, CI is right.

---

## 7. Stop and get a developer

Stop and hand over to a developer (label the PR `needs-dev-review` and explain in plain words)
before you:

- change authentication, authorisation, roles or permissions
- write or change a migration that drops, renames or retypes anything holding data
- change money calculations, payment flows or anything financial
- add a dependency, a new service, a queue, a cache or an external integration
- change a public API or an event/message format other systems consume
- change CI, deployment, infrastructure, Dockerfiles or environment config
- delete data, force-push, rewrite history or touch any shared environment

Never, for anyone:

- connect to production, or use production data or credentials
- commit secrets, or print them to the terminal
- push to `main`, merge your own PR, deploy or publish
- disable a test, a lint rule, a security check or CI to get a change through

---

## 8. Data and analytics work

For BI and analytics colleagues building reports, dashboards and data features:

- Work against the dev database or an anonymised copy, with a **read-only** role unless the spec
  says the feature writes data.
- Reusable report logic goes in a SQL view or a repository function with tests, not copied into
  several screens.
- Every number on a report needs an oracle test (LOOPS XVII): a fixed dataset and the expected
  totals, ideally checked against the spreadsheet or report people trust today.
- Name the time zone and the date boundary in the spec ("orders created 00:00 to 23:59 IST,
  inclusive"). Off-by-one-day is the most common report bug.
- Aggregate before showing. Never expose row-level personal data in a dashboard unless the spec
  says who may see it and the endpoint checks it.
- Heavy queries: check `EXPLAIN ANALYZE` on realistic data volumes and add indexes through a
  migration, not by hand.

---

## 9. Commits and PRs

- Branch: `feat/<feature>`, `fix/<issue>`. Never commit to `main`.
- Commits: `spec:`, `test:`, `impl:`, `fix:`, `docs:`, `chore:` (LOOPS XIII). Messages say why.
- PR description: link to the spec, what changed, how it was tested (paste the gate output
  summary), skills run and findings, anything a reviewer should look at first, and whether the
  author is a developer.
- Small PRs. One feature per PR.

---

## This project

*Fill in per repo. Keep it short and factual. Facts above this line don't need repeating.*

- **What it is:** <one paragraph>
- **Owner / developer reviewers:** <names>
- **Run locally:** <commands, e.g. `docker compose up -d && make dev`>
- **Reset and migrate DB:** <commands>
- **Uses Redis:** yes / no (key prefixes: ...). **Uses RabbitMQ:** yes / no (queues: ...)
- **Architecture diagram:** `docs/architecture/<name>.ysl`
- **Domain rules agents keep getting wrong:** <add one line per real failure, with the date>
