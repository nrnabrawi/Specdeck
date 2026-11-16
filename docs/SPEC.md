# Specdeck SPEC (contract)

Anything not here is out of scope → `BACKLOG.md`. If mockups and this file disagree, this file wins. Mockup data is placeholder and never ships.

## 1. Goals
- One desktop app that is a control center for spec-driven development, adapting to **OpenSpec** and **GitHub Spec Kit**.
- Read the framework's files, run its CLI, launch the user's agents (Claude Code, Codex) in an embedded terminal.
- Calm, passive, low-setup feel: dashboard, activity feed, add-ons, tray quick panel.
- Multi-project; light + dark; shadcn/ui.

## 2. Non-goals
No cloud, accounts or sync. No LLM calls by Specdeck (agents run via the user's CLIs). No frameworks beyond OpenSpec and Spec Kit. No mixed frameworks in one repo (if both `openspec/` and `.specify/` exist: show a warning, user picks one). No editing framework internals beyond their files and CLI. No pages beyond 0-8. No telemetry. No OpenSpec Stores. No agent first-class mapping beyond Claude Code and Codex. No git operations.

## 3. Personas
- **Solo dev (primary):** uses OpenSpec or Spec Kit with Claude Code/Codex, wants status at a glance and one-click stage actions.
- **Tech lead:** juggles several repos, wants progress and what is ready to archive/implement.

## 4. User stories
US1 Pick/confirm framework per project. US2 See all in-flight units and task progress. US3 Move a unit to its next stage with my agent. US4 Read specs and deltas. US5 Draft a new change/feature. US6 Watch agent runs live and see history. US7 Manage agents and framework maintenance. US8 Act from the tray without opening the window.

## 5. Acceptance criteria (v1: pages 0-8)
Shell (applies to all pages)
- AC-001 Sidebar with project switcher and nav; breadcrumb; ⌘/Ctrl+K command palette; light/dark toggle; toasts.
- AC-002 All UI strings and stage names come from the active adapter, not hardcoded per page.
- AC-003 Every CLI/agent command is shown verbatim and needs user confirmation before running; Specdeck never runs a command it did not display.
- AC-004 Keyboard-operable, visible focus, WCAG 2.1 AA contrast in both themes.

Page 0 Framework picker
- AC-010 Add project via folder picker; detect `openspec/` → OpenSpec, `.specify/` → Spec Kit; pre-select and confirm.
- AC-011 Both markers present → warning alert, user must choose one.
- AC-012 No marker → offer init: `openspec init --tools <list>` or `specify init --here --force --non-interactive --integration <key>`, after confirm.
- AC-013 Framework changeable later in project settings (re-runs detect, keeps project).
- AC-014 Onboarding steps Framework → Project → Agents; "Skip for now" allowed.

Page 1 Dashboard
- AC-020 Cards: active units, tasks done/total, specs count (+requirements if available), agent runs this week.
- AC-021 Active units table (name, stage, task progress, last agent) and recent activity list.
- AC-022 Tasks-completed chart for 14/30 days from Specdeck's run/progress history; empty state when no data.

Page 2 Board
- AC-030 Columns per adapter (OpenSpec: Explore, Propose, Apply, Archive; Spec Kit: Specify, Plan, Tasks, Implement, Converge; constitution as project banner).
- AC-031 Cards show name, summary, task progress, last agent, primary stage action; Board/List toggle and filter.
- AC-032 Stage action runs the adapter's stage command for the chosen agent (confirm per AC-003). Drag between columns only triggers the same confirmed action; it never moves files itself.
- AC-033 Stage inferred from files/CLI output, not stored by Specdeck.

Page 3 Spec browser + delta diff
- AC-040 Tree of specs (and per-unit artifacts); search.
- AC-041 OpenSpec: spec view, deltas view (ADDED/MODIFIED/REMOVED with WHEN/THEN scenarios), changes touching a spec. Spec Kit: spec/plan/tasks of a feature.
- AC-042 Markdown rendered read-only; parse failures fall back to raw text.
- AC-043 History tab = archived changes touching the spec (OpenSpec); Spec Kit shows git-less file list only.

Page 4 Proposal / spec wizard
- AC-050 Stepper Proposal → Specs → Design → Tasks (OpenSpec); Spec Kit variant maps to specify/plan/tasks steps.
- AC-051 Name validated kebab-case; Write/Preview; target path shown.
- AC-052 "Save draft" writes only the framework doc under the unit folder (allowed scope §10); drafts of not-yet-created units live in app data.
- AC-053 "Propose with agent" runs the stage command (AC-003).

Page 5 Activity
- AC-060 Feed grouped by day from Specdeck-recorded events plus file-derived events; filters All/Proposals/Tasks/Agent runs/Archives, time range, agent.

Page 6 Stats
- AC-070 Cards: median cycle time, tasks/week, spec coverage, agent success rate; computed only from real recorded data, labelled with the data window.
- AC-071 Cycle-time line, tasks/week bars, by-agent table; empty state when insufficient data. No "sample data" shipped.

Page 7 Add-ons & agents
- AC-080 Agent list (Claude Code, Codex): detected/not-found via PATH, enable toggle, command preview per adapter.
- AC-081 Other detected tools shown as detected-only (not launchable).
- AC-082 OpenSpec: CLI installed/version, profile display, `openspec update`, telemetry toggle (`openspec config`). Spec Kit: `specify` installed/version, `specify integration list`, extension list/add. Every action per AC-003.

Page 8 Menu-bar quick panel
- AC-090 Tray icon opens panel: current unit, progress, next task, run-next-task/pause, running agent with stop, New change, Open board, Archive ready, Switch project, Open Specdeck.
- AC-091 Works with main window closed (app lives in tray).

Embedded terminal (agent console)
- AC-100 Agents launch in an embedded PTY terminal (xterm.js) with working directory = project root; output is live; user can type and stop.
- AC-101 Run lifecycle recorded (start, end, exit code, agent, unit, stage) for activity/stats.
- AC-102 One active run per project in v1.

Cross-cutting
- AC-110 Project registry persisted locally; file watching refreshes UI within 2 s of change.
- AC-111 No network calls from Specdeck itself.
- AC-112 Adapter tests use real CLI output/fixtures (see §7).

## 6. Data model
- `Project {id, path, name, framework: 'openspec'|'speckit', addedAt}`
- `Unit {id, name, stage, summary, tasks:{done,total,items[]}, artifacts[], lastModified}` (OpenSpec change / Spec Kit feature; derived, not persisted)
- `Spec {id, path, requirements[]}`; `Delta {spec, op: ADDED|MODIFIED|REMOVED|RENAMED, requirement, scenarios[]}`
- `Agent {key:'claude'|'codex', binPath?, version?, detected, enabled}`
- `Run {id, projectId, agent, unitId?, stage, command, startedAt, endedAt?, exitCode?}` (persisted)
- `Event {id, projectId, ts, kind: created|tasks|done|archived, unitId, text, n}` (persisted for Specdeck-observed; `n` = tasks completed for kind `tasks`; file-derived archive events and run events are computed, runs stay in `Run`). Recorded by diffing unit snapshots on each file change (and at startup), so changes made while Specdeck was closed are stamped when it next looks. Cycle time = first seen → all tasks done; spec coverage = share of units with ≥1 requirement/FR; agent success = finished runs exiting 0 (decided at M4).
Persistence: SQLite in app-data dir (Run, Event, Project, settings). Repo files are never the source of Specdeck state.

## 7. Framework adapter interface
```ts
interface FrameworkAdapter {
  id: 'openspec'|'speckit'; label: string; unitName: string
  stages: {id:string; label:string}[]
  detect(root): Promise<{found:boolean; evidence:string}>
  initCommand(root, opts): Command            // shown + confirmed, then run
  listUnits(root): Promise<Unit[]>
  listSpecs(root): Promise<Spec[]>
  readSpec(root, id): Promise<SpecDoc>
  readDeltas(root, unitId): Promise<Delta[]>  // OpenSpec; Spec Kit returns []
  deltasForSpec(root, specId): Promise<Delta[]>  // incl. archived (History tab); added M1
  searchSpecs(root, query): Promise<string[]>    // added M1 (AC-040)
  taskProgress(root, unitId): Promise<Tasks>
  stageCommand(root, unitName, stage, agent, input?): Command   // verified syntax per agent; optional one-line input after the unit name; throws if skill not installed
  maintenance(root): MaintenanceInfo          // add-ons page facts + actions (M2)
  maintenanceCommand(root, actionId): Command
}
type Command = { bin: string; args: string[]; cwd: string; display: string }
```
Verified facts (probed 2026-11-16 with openspec 1.12.0, specify 1.0.7, claude 2.1.325, codex-cli 0.156.1):
- OpenSpec init creates `openspec/{config.yaml,specs/,changes/archive/}` plus agent skills (`.claude/skills/openspec-*`, `.agents/skills/openspec-*` for Codex). CLI gives JSON: `openspec list --json`, `list --specs --json`, `status --change <n>|--all --json`, `show <n> --json --deltas-only`, `validate <n> --json`. Adapter prefers CLI JSON, falls back to parsing files (tasks `- [x]`).
- OpenSpec agent syntax **differs from REFERENCE**: with `delivery: skills` it is `/openspec-propose` (Claude) and `$openspec-propose` (Codex); `/opsx:*` applies to other profiles/deliveries. Adapter reads `openspec config list` (profile, delivery, workflows) and installed skill folders; never hardcodes.
- Spec Kit: `.specify/` (with `init-options.json`, `integration.json`, `memory/constitution.md`, `templates/`) is created by init; **no feature folder until `/speckit-specify`**. Skills are `.claude/skills/speckit-{constitution,specify,clarify,plan,tasks,analyze,checklist,implement,converge,taskstoissues}`; invoke separator stored in `integration.json` (`"-"` for claude). Per-feature file names `spec.md`, `plan.md`, `tasks.md` (from `common.sh`).
- Agent launch (verified M2, real runs): `claude '/openspec-propose <name>'` and `codex '$openspec-explore <name>'` start interactive sessions in a PTY and run the skill. Skill names: `openspec-{explore,propose,apply-change,archive-change}`; Claude reads `.claude/skills`, Codex `.agents/skills`. `/opsx:*` (commands delivery) is not supported in v1; the adapter reports the skill as not installed. Archive uses the CLI (`openspec archive <name> --yes`), not an agent.
- Command confirmation: renderer previews a command, main returns a single-use token, `commands:run` runs only that command.
- Spec Kit feature runs (verified M3, specify 1.0.7 + claude 2.1.325, real `/speckit-specify|plan|tasks|implement|converge` runs): features live in `specs/<NNN>-<name>/` (`spec.md`, `plan.md`, `tasks.md`, plus research/data-model/contracts/checklists); `.specify/feature.json` holds only the last created feature. Skills resolve the feature from it, so Specdeck passes `Feature directory: specs/<name>` as the skill argument; the agent then used `SPECIFY_FEATURE_DIRECTORY` for that feature (verified with two features). Stage is inferred from files (no status markers exist): no/unclear `spec.md` (`[NEEDS CLARIFICATION`) → specify (runs `speckit-clarify`), no `plan.md` → plan, no `tasks.md` → tasks, unchecked tasks → implement, all checked → converge. Converge leaves `tasks.md` unchanged when converged, else appends a `## Phase N: Convergence` section of unchecked tasks (moving the feature back to implement). Codex uses `.agents/skills/speckit-*`; the `$speckit-*` form is by analogy with OpenSpec and was not run.
- Spec Kit browsing: no cross-feature specs or deltas; the Specs page lists each feature's spec/plan/tasks (ids `<feature>:<file>`), no History tab (AC-043). Extension add is not built (see BACKLOG).

Wizard (M5): OpenSpec steps use structured fields and write only `proposal.md`, `specs/<cap>/spec.md`, `design.md`, `tasks.md` into an existing, non-archived `openspec/changes/<name>/` (enforced in `src/main/wizard.ts`; generated files pass the real `openspec validate`). Before the change exists, Save draft keeps the draft in app data only; "Propose with agent" runs `/openspec-propose <name> Why: …; What changes: …` (inline text verified with a real Claude run). Spec Kit documents are agent-authored, so its wizard writes no files: Specify runs `/speckit-specify <description>` (stage `create`), Plan/Tasks run `/speckit-plan|tasks Feature directory: specs/<feature> <notes>`; drafts stay in app data. "Start from an existing change" loads an OpenSpec change's files into the form (M5 fix). Files left unchanged in the form are never rewritten; replacing a file that holds content the form cannot show (extra sections, checked tasks) needs an explicit confirm.

## 8. Architecture
Electron main process (adapters, FS watch via chokidar, CLI exec, node-pty, SQLite, tray) ⇄ typed IPC (zod-validated) ⇄ React renderer (shadcn, TanStack Query, Zustand). Renderer has no Node access (contextIsolation on). Adapters are pure-ish modules in main behind the interface; UI consumes only the interface.

## 9. Security notes
- Renderer sandboxed, no remote content, strict CSP, IPC allowlist.
- Commands built from adapter templates with args arrays (no shell string interpolation); user-edited values (unit names) validated kebab-case.
- Shows exact command before running; one confirm per launch.
- Agent run permissions are the agent's own; Specdeck does not pass `--dangerously-skip-permissions` or equivalents.
- No telemetry; framework telemetry toggle only on explicit user action.

## 10. Write scope
Specdeck may write only: (a) via framework CLI it runs on confirm; (b) markdown artifacts inside the unit folder (`openspec/changes/<name>/`, Spec Kit feature dir) from the wizard; (c) its own app-data dir. Never: source code, git state, agent skill/command dirs directly, `.env`, anything outside the project root.
