# dev-exp

How we build software with coding agents at Algorisys. Copy `AGENTS.md`, `LOOPS.md`, `CLAUDE.md`
and `HANDOFF.md` into a repo's root, and fill in the **This project** section at the bottom of
`AGENTS.md`. Copy `golangci.yml` to the Go module root as `.golangci.yml`, and `eslint.config.js`
to the frontend root.

| File | What it's for |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The company standard for any agent (Claude Code, Codex, Cursor, Copilot): our stack (Go + Fiber, Postgres, Redis, RabbitMQ, SolidJS + zen-ui, YappyDraw diagrams), the spec → tests → code workflow, the gates that define "done", and when to stop and get a developer. |
| [`LOOPS.md`](LOOPS.md) | How we work: 39 rules covering scope, test-driven development, defensive programming, simple abstractions, production readiness and review. |
| [`CLAUDE.md`](CLAUDE.md) | A shim so Claude Code loads `AGENTS.md`, `LOOPS.md` and `HANDOFF.md`. |
| [`HANDOFF.md`](HANDOFF.md) | Template for where the last session stopped (LOOPS XXXV). `CLAUDE.md` loads it, so every repo needs one. |
| [`golangci.yml`](golangci.yml) | Shared Go lint config (golangci-lint v2): the standard linters plus security, SQL, error-handling, copy-paste and complexity checks. |
| [`eslint.config.js`](eslint.config.js) | Shared frontend lint config for SolidJS + TypeScript, including the zen-ui checks: no `style=` on components, no hard-coded colours, no other component libraries, no `fetch` outside the API client. |

Everyone builds with agents here, including colleagues who aren't developers. These files are
written so the agent does the explaining and the gates do the judging, and a developer always
reviews before anything merges.

Security, privacy and money checks come from [algorisys-oss/skills](https://github.com/algorisys-oss/skills).

## Why the lint configs

Rules written in `AGENTS.md` are followed most of the time. Lint rules are followed every time,
and their messages tell the agent what to do instead (LOOPS XXXVIII). On the first project to use
these configs (InterGold PPC), the zen-ui checks found four `style=` overrides and a hard-coded
colour, all written by an agent that had the written rule in front of it.

[`@shadcn/lint`](https://github.com/shadcn-ui/lint) does this well for React, Vue and Svelte on
Tailwind v4, with per-component allow-lists. It doesn't read SolidJS (Solid uses `class`, not
`className`) or zen-ui's own utilities, so it can't run on our stack yet. The checks in
`eslint.config.js` are the stopgap. The fuller fix is a `no-restyle` rule shipped with zen-ui,
with per-component contracts in the same style.
