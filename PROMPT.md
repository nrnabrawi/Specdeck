# Kickoff prompt for Claude Code (paste as the first message)

Before pasting: create an empty repo, copy `REFERENCE.md` to `docs/REFERENCE.md`, and export the mockups to `docs/design/`.

---

You are building **Specdeck**, a desktop app that is a UI control center for spec-driven development (OpenSpec and GitHub Spec Kit). Read `docs/REFERENCE.md` and look at `docs/design/` fully before doing anything. REFERENCE.md is the source of truth for decisions already made; do not re-ask anything it answers.

## How we work: three phases, hard gates between them

### Phase 0: Interview (no code, no files except notes)
- Interview me with **AskUserQuestion only** (multiple-choice, recommended option first, "(Recommended)" in its label). No open-ended text questions unless a choice list can't capture it.
- Max 4 questions per call, max 3 rounds. Be concise: short labels, one-line descriptions.
- Cover only what REFERENCE.md leaves open:
  1. Stack and packaging: desktop shell (Tauri vs Electron), frontend (React + Vite + TypeScript + Tailwind + shadcn/ui is the expected default), state/data layer, test tools, package manager, target OS for v1.
  2. MVP cut: which of pages 0 to 8 and which actions (read-only, run CLI, launch agents) are in v1 versus later.
  3. Integration boundaries: how agents are launched (PTY/terminal vs headless), file-system scope, what Specdeck must never write, telemetry stance.
  4. Quality bar: tests required per milestone, accessibility target, license.
- Before round 1, research the "Unverified" list in REFERENCE.md section 8 (docs, `--help`, real `init` output in a scratch dir) and ask only what you can't resolve yourself.

### Phase 1: Spec (documents only), then STOP
Write, in `docs/`:
- `SPEC.md`: goals; **non-goals**; personas; user stories; **acceptance criteria with IDs** (AC-001...) per v1 page; data model; the framework-adapter interface (detect, init, list units, read specs/deltas, task progress, stage commands, agent command syntax); architecture; security notes.
- `STACK.md`: every technology, one-line rationale, pinned versions.
- `ROADMAP.md`: ordered milestones, each with scope (AC IDs), exit criteria, and a gate.
- `BACKLOG.md`: empty "parking lot" for out-of-scope ideas.
Keep each file tight. Then **stop and wait for my explicit "approved"**. Do not scaffold the project before that.

### Phase 2: Build, milestone by milestone
- Work only on the current milestone. Every task cites the AC IDs it satisfies.
- At each gate: run typecheck, lint and tests; give me a short summary (done, deviations, risks); stop for my go-ahead.
- Frameworks are built behind the adapter interface. OpenSpec first, Spec Kit second. Write adapter tests from **real** CLI output and repo fixtures, never invented samples.

## Scope-lock rules (apply for the whole project)
1. SPEC.md is the contract. Anything not in it is **out of scope**: append it to BACKLOG.md with one line and move on. Do not build it, even if small.
2. Default non-goals (confirm in the interview): no cloud, accounts or sync; Specdeck makes no LLM calls of its own (agents run through the user's own CLIs); no frameworks beyond OpenSpec and Spec Kit; no editing framework internals beyond their files and CLI; no pages beyond the approved set; no mixed frameworks in one repo.
3. No new dependency, page, setting, or abstraction without asking me first via AskUserQuestion, with a one-line reason.
4. No refactors or "cleanup" outside the current milestone's files.
5. If the mockups and SPEC.md disagree, SPEC.md wins; flag the conflict.
6. If a fact isn't verified (framework file layout, CLI flags, agent syntax), look it up or test it. Never guess. Mockup content and numbers are placeholders and must not be shipped.
7. Drift check at every gate: list what was built that isn't in SPEC.md, and what is in SPEC.md but not built. Fix or ask before proceeding.
8. Ambiguity means ask (AskUserQuestion), not assume.
9. Small, conventional commits. One milestone per branch.
10. Be concise in every message: outcomes, decisions needed, blockers. No recaps.

Start now with Phase 0.
