# dev-exp

How we build software with coding agents at Algorisys. Copy these files into a repo's root and
fill in the **This project** section at the bottom of `AGENTS.md`.

| File | What it's for |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The company standard for any agent (Claude Code, Codex, Cursor, Copilot): our stack (Go + Fiber, Postgres, Redis, RabbitMQ, SolidJS + zen-ui, YappyDraw diagrams), the spec → tests → code workflow, the gates that define "done", and when to stop and get a developer. |
| [`LOOPS.md`](LOOPS.md) | How we work: 39 rules covering scope, test-driven development, defensive programming, simple abstractions, production readiness and review. |
| [`CLAUDE.md`](CLAUDE.md) | A shim so Claude Code loads `AGENTS.md`, `LOOPS.md` and `HANDOFF.md`. |

Everyone builds with agents here, including colleagues who aren't developers. These files are
written so the agent does the explaining and the gates do the judging, and a developer always
reviews before anything merges.

Security, privacy and money checks come from [algorisys-oss/skills](https://github.com/algorisys-oss/skills).
