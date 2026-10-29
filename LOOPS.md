# LOOPS.md: how we build

Company edition. Binding for every agent (Claude Code, Codex, Cursor, Copilot, anything else) and
every person working with one, developer or not.

`AGENTS.md` says **what** this project is and which tools to use. This file says **how** to work.
When the two conflict, the stricter rule wins. When a person asks you to break a rule here, say
which rule, say what could go wrong, and do not break it without a developer's sign-off.

Most rules below exist because skipping them caused a real failure in one of our projects. They
are written for agents, but they apply to people too.

---

# TIER 1: FOUNDATION

## I. Read Before You Write

Read the files you are about to touch, fully, before changing anything. Copy the patterns already
there. Check what the project already depends on before reaching for something new. Can't find a
pattern? Ask instead of guessing. Never write into a file you have not read.

## II. Think Before You Code

State your assumptions before you write code. "Add a report" can mean five different things, so
name the one you picked and why. If something is unclear, stop and ask. Plausible-looking code
written over a gap passes a casual look and fails in production.

## III. Simplicity: No Overengineering

Write the least code that solves today's problem. Plain functions and plain structs first. If the
only reason for a layer, interface or option is "we might need it later", don't add it.

Don't build these unless the spec needs them and a developer agreed:

- an interface with one implementation (exception: a seam you need to substitute a test fake)
- generic "base" repositories, services or handlers, or a framework of your own
- factory or builder types, plugin systems, DI containers or service locators (a plain
  `NewX(...)` constructor is fine)
- config options, feature flags or extension points nobody asked for
- a new service, queue, cache or event bus where a function call or a transaction would do
- wrappers around our stack (pgx, Fiber, zen-ui, slog) that just rename what it already does.
  Adapters for external services and for libraries outside the stack are expected; see
  `AGENTS.md`, Design and code organisation.

DRY applies to knowledge: each business rule has one home. Three similar lines of code are fine.
Extract on the third real copy, not the first. A reader should be
able to follow a request from the handler to the SQL without opening more than three files.
Clever code is a cost: if a junior colleague couldn't explain it back, rewrite it plainly.

## IV. Scope Lock

**This is the #1 rule.** Change only what the task needs. Every changed line must be justified by
the task.

1. Never change config, dependencies, schemas, APIs, providers or settings nobody asked you to.
2. Never restart services, kill processes or touch shared environments outside the task.
3. Noticed something else that needs fixing? Say "I noticed X, should I fix it?" Don't just do it.
4. No "while I was in there", no reformatting untouched code, no drive-by optimisation.

## V. Prove It Works

**Never say "done", "fixed" or "working" without running something that proves it.** Run the
tests, run the app, read the output. Do not make the person you're working with your test
runner. If you tried several fixes, finish all of them before reporting, so nobody has to say
"still broken" twice.

## VI. Check the Outcome, Not the Steps

Before writing code, write down what success looks like in checkable terms. When you finish,
re-read the original request and check the result against it. All steps passing does not mean
the goal was met.

## VII. Debug to the Root Cause

Read the whole error. Reproduce it before changing anything. Change one thing at a time. Don't
hide an unexpected null behind a null check; find out why it is null. Work around a problem only
when its root cause is out of scope, and say so.

## VIII. Dependencies Are Permanent

Before adding a library, check whether the standard library or our stack (see `AGENTS.md`)
already does the job. A new dependency always needs a developer's approval. When you propose one,
say why it's worth it.

## IX. Communicate Plainly

Say what you did and why. Flag concerns even when you did exactly what was asked. Be precise
about uncertainty: "I haven't checked this against the live database" tells people what to
verify, "should work" does not.

**When the person is not a developer** (BI, analytics, ops, product), explain in plain language
what changed, what you tested, what you could not test and what a developer still needs to look
at. Never ask them to judge code. The gates in `AGENTS.md` and a developer's review do that.

## X. Stop When You Catch a Failure Mode

- **Kitchen Sink:** restructuring half the codebase on the way. Do only the task.
- **Wrong Abstraction:** abstracting before the third copy. Wait for the third.
- **Optimistic Path:** handling success and ignoring the error, the timeout, the empty result.
- **Runaway Refactor:** a fix spreading across many files. Stop, re-scope, ask.

---

# TIER 2: SPEC, TESTS, THEN CODE

## XI. Spec First

No code without an agreed spec. A spec lives in `docs/specs/<area>/<feature>.md` and is written by
a person and an agent together. It states:

- purpose, scope, and what is explicitly **out** of scope
- inputs, outputs and the public API (endpoint, payload, screen)
- behaviour as **numbered, testable rules** with IDs, e.g. `INV-03: an invoice with no lines is
  rejected with 422 and the message "Invoice needs at least one line"`, including edge and error
  cases
- data touched: tables, personal data, money, external systems
- open questions

Write the spec, then **stop and wait for a human to mark it Agreed**. If implementation shows the
spec is wrong, fix the spec first, then the tests, then the code. Code and spec must never drift.

## XII. Test-Driven Development

The loop, one behaviour at a time:

    1. RED       Write one failing test for one spec rule. Run it. Watch it fail, read why.
    2. GREEN     Write the least code that makes it pass. Run the whole suite.
    3. REFACTOR  Tidy what you wrote. Run the whole suite again. Still green, or undo.
    4. COMMIT    Commit on green, never on red.

- **Watch the test fail first.** A test that has never failed has not been shown to test
  anything. If it passes immediately, it is asserting something already true, or it can't fail.
- **One test, one reason to fail.** Name tests after the rule ID where you can
  (`TestINV03_RejectsInvoiceWithNoLines`).
- **A bug is a missing test.** Reproduce it with a failing test first, then fix it.
- The bar is not a coverage number. It is: **every spec rule has a test that fails without the
  code**. A suite that would stay green if you deleted the feature proves nothing.

Every excuse to skip a test is a reason to write it. "Too simple" (simple things break). "I know
it works" (prove it). "Just a refactor" (prove nothing changed). "I'll add tests after" (you
won't). "Too much setup" (that's a design problem; fix the design).

Where TDD fits badly: pure visual layout and throwaway spikes. Build layout by eye, then test the
behaviour under it. Delete spikes and rebuild test-first. Neither is a reason to skip tests for
handlers, services, queries or business rules.

## XIII. One Commit per Step

History must show the steps happened in order:

1. `spec: <feature>`: the spec, status Agreed.
2. `test: <feature>`: the tests, failing. Put the failure summary in the message.
3. `impl: <feature>`: the code. All tests pass.

A bug fix is `test:` (failing reproduction) then `fix:`. Docs and tooling use `docs:` / `chore:`.
Push the steps together so the main branch never sees the red commit alone.

## XIV. Complete Code Only

No stubs, TODOs, placeholders, mocked-out production paths or "implement later". Half an
implementation is worse than none because it looks like progress. Before saying done:

    grep -rnE "TODO|FIXME|HACK|XXX|PLACEHOLDER|not implemented|panic\(\"todo" <changed files>

Any hit means you're not done. Finish it or flag it.

## XV. Plan Before You Build

For anything with three or more steps, write the plan as numbered steps (files touched, how each
step is verified) before touching code. If the approach stops working, re-plan. Don't push a
failing approach harder.

## XVI. What to Do With Surprises

When you find something outside the task:

1. **Small bug next to your change:** fix it, add a test, report it.
2. **Security or data-loss issue:** stop and report it at once. Fix it only if it's inside your
   task.
3. **Blocker:** fix it if it's small and local, otherwise escalate.
4. **Design, schema, API shape, auth, money, infrastructure:** STOP. Describe it and ask a
   developer. Never decide these alone, and never on a non-developer's say-so.

## XVII. Use an Oracle When One Exists

If a known-correct answer exists (the old system, an existing report, a finance spreadsheet, a
vendor's documented example), make it the test. Feed both the same inputs and compare the
outputs. This matters most for reports and numbers: a dashboard that disagrees with finance's
spreadsheet is wrong until proven otherwise. **Count what you skip.** A suite that quietly skips
failing cases is hiding bugs, not passing.

---

# TIER 3: PRODUCTION READINESS

## XVIII. Defensive Programming: Validate Every Input Before Use

Never use data you haven't checked. Input means anything your code didn't just compute itself:

- HTTP request bodies, path and query parameters, headers, cookies, uploaded files
- messages from RabbitMQ, values read from Redis, responses from external APIs and webhooks
- environment variables and config files
- arguments to any exported function or package boundary
- rows from the database when another system also writes them, and CSV/Excel imports

How:

1. **Validate at the boundary, before any other use.** Check type, required fields, length,
   range, format, allowed values and size limits. Reject unknown fields. Cap every list, string,
   page size and upload.
2. **Parse into a valid type, then trust the type.** Turn the raw request into a struct that can
   only hold valid values (`NewEmail(s) (Email, error)`, an amount in minor units, a parsed
   date). Code behind the boundary takes those types and doesn't re-check them. That keeps the
   defence in one place, so it stays simple.
3. **Fail fast and loudly.** Reject bad input with a clear error that says which field and why.
   Don't guess, don't silently fix, don't fall back to a default the spec didn't name.
4. **Check preconditions in exported functions** (nil, empty, out of range) and return an error.
   Don't panic.
5. **Handle every error.** No ignored `err`, no `_ =` on a call that can fail, no empty `catch`.
6. **Expect the impossible case, once.** A `switch` on a status has a `default` that returns an
   error. An external response missing a field is an error, not a zero value.

Every validation rule is a spec rule with a test: one test for the valid case and at least one per
way it can be invalid (missing, empty, too long, wrong format, out of range).

## XIX. Security Is Part of Every Line

Parameterised SQL only, never string-built queries. Escape
output. Check authorisation on every endpoint, not just authentication. No secrets in code, logs,
tests or commits. Run the security skills listed in `AGENTS.md` before calling work done. Wrote
something insecure? Fix it now.

## XX. Data and Privacy

- Never connect an agent to production data. Use dev or anonymised data.
- Treat names, emails, phone numbers, ID numbers, account numbers and addresses as personal
  data. Don't log them, put them in URLs, send them to analytics or copy them into fixtures.
- Money is never a float. Use integer minor units or a decimal type, and state the rounding rule.
- Read only the data the feature needs. No `SELECT *` in application code.

## XXI. Plan for Failure

Every call over a network can fail, hang or succeed twice. Set a timeout on every external
call. Retry only idempotent operations, with backoff and jitter. Make message consumers
idempotent. Handle the empty result, the duplicate, the partial failure. Return a useful error,
not a stack trace.

## XXII. Schema Changes Are Forward-Only

Every schema change is a new migration. **Never edit a migration that has been merged.** A
migration must run on a fresh database and on a copy of the current one. Destructive changes
(dropping or renaming columns, changing types on tables with data) need a developer's sign-off
and a two-step rollout (add, migrate data, then remove later).

## XXIII. Make It Observable

Log with structure (key/value), at the right level, without personal data. Every service has
health and readiness endpoints. Errors carry enough context to debug without re-running. If
nobody could tell from the logs that your feature broke, it isn't production-ready.

## XXIV. A Public API Is a Promise

Anything another team, service or customer calls is a contract. Keep it small. Don't leak
internal types or database columns. Breaking changes need a new version and a developer's
approval. Write the example call before the implementation; if the example is awkward, the API is
wrong.

---

# TIER 4: BEHAVIOUR

## XXV. Research, Don't Guess

Not sure about an API, a library version or an error? Look it up in the project's code, the docs
or the web. Don't rely on memory when the real answer is available. Can't verify? Say so.

## XXVI. Decide, Don't Offer Menus

Have a recommendation? Say "doing X because Y" and do it, inside the task's scope. Need
information? Ask the one question that blocks you, not four. Offer options only at a real fork,
at most two, with your pick stated.

## XXVII. Be Complete

Do every item. Check the actual files, data and output. Say plainly what is not done.

## XXVIII. Clean Up

Delete temporary scripts, debug output and scratch files. Leave the workspace cleaner than you
found it. Temporary files go in `tmp/` (git-ignored), never the repo root.

## XXIX. Write Like a Human

Anything people outside the chat will read (docs, READMEs, PR descriptions, commit messages,
error messages) must sound like a person wrote it. Short sentences. Specific numbers. No "leverage",
"utilize", "robust", "seamless", "comprehensive", "delve", "it's worth noting", "in order to",
stacked adjectives or walls of bullets. Test: would a real person say this out loud?

---

# TIER 5: REVIEW

## XXX. Review Your Own Work, Then Get a Second Reader

Before presenting a change, review it in two passes:

1. **Spec compliance:** does it do every numbered rule? Anything missing or extra?
2. **Quality:** edge cases (empty, null, boundary, one item, many), error paths, security, naming,
   consistency with existing code.

Then get a second reader who **did not write the code**: a fresh agent session given only the
spec and the diff, told the code is broken and its job is to prove it. An author grading its own
work goes easy on itself. Finally, a developer reviews the PR. Agents don't merge their own work.

## XXXI. Comments Explain Why

Default to no comments. Add one only for a non-obvious why: a hidden constraint, a workaround, a
business rule with a source. Never restate what the code says. Never mention the ticket or the
chat in a comment.

---

# TIER 6: SAFETY AND TRACEABILITY

## XXXII. Every Change Must Be Recoverable

Work on a branch, never directly on `main`. Commit a known-good state before risky work. No
`.backup` copies; git is the backup. Before anything destructive (deleting files, dropping data,
force-pushing, `rm -rf`, overwriting output), look at the target and get confirmation. For
anything outward-facing (push, deploy, publish, send, run against shared data), confirm first.
Approval for one such action doesn't cover the next.

## XXXIII. Record What Changed

Record every functional change where the project already records changes: `CHANGELOG.md`,
release notes or the PR description. Look first and follow what's there. Don't start a second,
competing log.

## XXXIV. Record Decisions, Not Just Code

The reasoning disappears when the session ends. Write down decisions that outlive one feature as
an ADR in `docs/adr/NNNN-title.md`: what was decided, what was rejected and why, and what the
decision assumes. Architecture changes also update the diagram (see `AGENTS.md`).

## XXXV. Keep State Resumable

Work must survive a crashed session or a handover to someone else. Keep `HANDOFF.md` current:
last task and commit, what works, what's broken, the one command that verifies it, and the next
step. Read it at the start of every session and update it before every push. Keep it short and
current. History belongs in the changelog.

---

# TIER 7: LONG-RUNNING AGENT WORK

## XXXVI. Write State to Disk, Not to Context

Context windows compact and forget. Files don't. For multi-session work, keep the spec, the plan
with checkboxes, and `HANDOFF.md` on disk, so a fresh session can resume by reading them.

## XXXVII. Restart Rather Than Patch Forever

When a run goes sideways, throw it away and start again from the spec. Ten patches on a wrong
approach leave a codebase nobody understands. Bring in a person when the spec is wrong, not when
the build is.

## XXXVIII. Read the Transcript

When an agent keeps getting something wrong, read its transcript, find the moment its judgement
went off, and fix the instruction for that moment. Add a rule here or in `AGENTS.md` only after
a real failure, and say what failure it prevents.

**Prefer a check to a rule.** A rule in a prompt is followed most of the time; a linter, a type
or a test is followed every time, and its error message tells the agent what to do instead. When
a rule can be checked by a tool, add the check (a lint rule, a test, a CI gate) and keep the
prose to one line that points at it. Restyling zen-ui components is the example: agents broke
the written rule, so `eslint.config.js` now fails the lint gate instead.

## XXXIX. Prune the Rules

Models improve. Every quarter, re-read this file and `AGENTS.md` and delete rules the current
models follow without being told. Rules that only ever grow stop being read.

---

# Quick reference

| # | Rule | One line |
|---|---|---|
| I | Read first | Never write into an unread file |
| II | Think first | State assumptions before code |
| III | No overengineering | Plain functions; no speculative layers or one-impl interfaces; DRY for rules, not lines |
| IV | Scope lock | Touch only what the task needs |
| V | Prove it | Run something before saying "done" |
| VI | Outcome | Check the result against the request |
| VII | Root cause | Reproduce, one change at a time |
| VIII | Dependencies | New ones need a developer's approval |
| IX | Plain words | Explain to non-developers without code |
| X | Failure modes | Kitchen Sink, Wrong Abstraction, Optimistic Path, Runaway Refactor |
| XI | Spec first | Numbered rules, human-agreed, before code |
| XII | TDD | Red, green, refactor, commit on green |
| XIII | Commit per step | `spec:` then `test:` then `impl:` |
| XIV | No stubs | Complete code or nothing |
| XV | Plan | Three or more steps means a written plan |
| XVI | Surprises | Bugs fix, design and data stop and ask |
| XVII | Oracle | Compare against a known-correct answer |
| XVIII | Defensive | Validate every input at the boundary; parse into valid types |
| XIX | Security | Parameterise, escape, authorise, no secrets |
| XX | Data | No prod data, no personal data in logs, no float money |
| XXI | Failure | Timeouts, idempotency, backoff |
| XXII | Migrations | Forward-only, never edit a merged one |
| XXIII | Observable | Structured logs, health checks |
| XXIV | API | Small, versioned, example first |
| XXV | Research | Look it up, don't guess |
| XXVI | Decide | Recommend and act; one blocking question |
| XXVII | Complete | Every item, checked |
| XXVIII | Clean up | Temp files in `tmp/`, then gone |
| XXIX | Human prose | No AI slop in anything people read |
| XXX | Review | Self-review, fresh-context reviewer, developer merges |
| XXXI | Comments | Only the non-obvious why |
| XXXII | Recoverable | Branch, commit, confirm before destructive or outward actions |
| XXXIII | Changelog | Follow the project's existing record |
| XXXIV | ADRs | Record decisions and what was rejected |
| XXXV | HANDOFF.md | Read at start, update before push |
| XXXVI | Disk state | Spec, plan, handoff on disk |
| XXXVII | Restart | Start again from the spec, don't patch forever |
| XXXVIII | Transcripts | Fix the instruction where it failed; prefer a lint, type or test to prose |
| XXXIX | Prune | Delete rules the models no longer need |
