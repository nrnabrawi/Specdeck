# Specdeck: reference pack

Everything decided or learned before the build started. Treat "Locked decisions" as fixed. Treat "Unverified" as things to check before coding against them.

## 1. Product
**Specdeck** (working name): a desktop control center for spec-driven development (SDD). The user first picks the SDD framework; the whole UI then adapts to it.

Inspiration: Headroom (https://extraheadroom.com/), a desktop app (macOS/Windows/Linux) that runs from the menu bar, works passively, and shows a dashboard, an activity feed, and one-click add-ons. Copy that calm, low-setup feel, not its features.

## 2. Locked decisions (from the interview)
- Deliverable order: design mockups first (done), then the real app.
- Form factor: desktop app with a menu-bar/tray quick panel.
- Frameworks in v1: **OpenSpec** and **GitHub Spec Kit** only.
- Framework picker in three places: first-run onboarding / add project, auto-detect from the repo (pre-select + confirm), per-project setting (switch later).
- UI depth: one adaptive shell. Labels, board columns, spec tree and agent commands change per framework. No separate UI per framework.
- Integration: full control. Read the framework's files, run its CLI, and launch AI agents from the UI.
- Agents: Claude Code, OpenAI Codex, plus any other tool detected (configurable list).
- Projects: multi-project switcher in the sidebar.
- Look: clean modern SaaS, light + dark, built on **shadcn/ui** (https://github.com/shadcn-ui/ui).
- Extras requested: activity feed, add-ons/integrations page, stats/ROI-style metrics, menu-bar quick panel.
- Not chosen: separate UI per framework, mixed frameworks in one repo, BMAD-Method, Kiro, Agent OS (possible later as adapters).

## 3. Pages (approved baseline = 0 to 8)
| # | Page | shadcn components |
|---|---|---|
| 0 | Framework picker (onboarding + detect) | Card, Badge, Alert, Button, Dialog, Command |
| 1 | Dashboard | Card, Badge, Progress, Chart, Table, Avatar, Skeleton, Empty |
| 2 | Change / feature board | Card, Badge, Checkbox, Progress, Tabs, ToggleGroup, DropdownMenu, ScrollArea, Sheet; kanban drag is custom |
| 3 | Spec browser + delta diff | Resizable, ScrollArea, Collapsible, Accordion, Tabs, Badge, Input, Alert; diff view is custom |
| 4 | Proposal / spec wizard | Form/Field, Input, Textarea, Select, Tabs, Checkbox, ButtonGroup, Dialog, Spinner; stepper is custom |
| 5 | Activity feed | Item, Avatar, Badge, ToggleGroup, Select, Popover, ScrollArea |
| 6 | Stats | Chart, Card, Select, Tabs, Table |
| 7 | Add-ons & agents | Card, Switch, Select, Badge, Dialog, Alert, Accordion |
| 8 | Menu-bar quick panel | Popover-style card, Progress, Checkbox, Button |
| 9-11 (not approved, optional) | Agent run console, Settings, Add project | see interview |

Shared shell on every page: Sidebar (project switcher, nav), Breadcrumb, Command palette (⌘K), Tooltip, Sonner toasts, Kbd, light/dark toggle.

## 4. Framework facts
### OpenSpec (https://github.com/Fission-AI/OpenSpec/)
- MIT, spec-driven framework for AI coding assistants. Docs: openspec.dev/docs (not yet read; check for API/file schema).
- Workflow: Explore `/opsx:explore`, Propose `/opsx:propose <name>`, Apply `/opsx:apply`, Archive `/opsx:archive`. Expanded profile (via `openspec config profile`) adds `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`, `/opsx:onboard`.
- Folders: `openspec/specs/` (current specs); `openspec/changes/<name>/` with `proposal.md`, `specs/`, `design.md`, `tasks.md`; `openspec/changes/archive/YYYY-MM-DD-<name>/`.
- Specs are Markdown. Requirements use SHALL; scenarios are WHEN/THEN bullets. The example spec uses `## ADDED Requirements` headers (so MODIFIED/REMOVED likely exist: verify).
- CLI: `openspec init`, `openspec update`, `openspec install`, `openspec config profile`, `openspec config set telemetry.enabled false` (env `OPENSPEC_TELEMETRY=0`, `DO_NOT_TRACK=1`).
- Install: standalone binary, npm (Node 20.19.0+), Homebrew, pnpm, yarn, bun, Nix.
- 30+ supported tools. Slash syntax differs: `/opsx-propose` (Cursor, GitHub Copilot), `@opsx-propose` (Amazon Q), `$openspec-propose` (Codex), `/opsx:propose` (Claude Code form as listed). `openspec init` prints the right form.
- Stores (beta): planning kept in a separate repo with the same `openspec/` layout; cross-repo changes. Out of v1.

### GitHub Spec Kit (https://github.com/github/spec-kit)
- Needs Python 3.11+, `uv`, and a supported agent. Install: `uv tool install specify-cli`. Init: `specify init my-project --integration copilot`.
- Order per project/feature: `/speckit-constitution` (once), then `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`. Repeat implement + converge until converge reports `Converged`; steps specify through converge repeat per feature.
- Extensions: `specify extension add bug` / `assess`; catalog search via `specify extension|preset|workflow|bundle search`.
  - bug: `/speckit-bug-assess`, `-fix`, `-test`; reports in `.specify/bugs/<slug>/`; verdicts verified/partial/failed.
  - assess: `/speckit-assess-intake`, `-research`, `-define`, `-shape`, `-decide`; artifacts in `.specify/assessments/<slug>/`; decisions go / needs-clarification / kill.
- Agents supported through "integration keys"; only Copilot is named on the main page.

## 5. Adapter mapping (UI adapts per framework)
| UI area | OpenSpec | Spec Kit |
|---|---|---|
| Unit name | change | feature |
| Board columns | Explore, Propose, Apply, Archive | Specify, Plan, Tasks, Implement, Converge (constitution is project-level banner) |
| Init action | `openspec init` | `specify init <name> --integration <agent>` |
| Detect | `openspec/` folder | `.specify/` folder (unverified) |
| Spec browser | `specs/` + per-change deltas (ADDED/MODIFIED/REMOVED) | per-feature spec / plan / tasks (layout unverified) |
| Extras | expanded profile, telemetry toggle | extensions (bug, assess), verdict badges, converge loop |
| Add-ons page | CLI profile, `openspec update`, telemetry | extensions/presets/workflows catalog |

## 6. Design tokens (shadcn zinc, as used in the mockups)
Light: background #ffffff, foreground #09090b, card #ffffff, muted #f4f4f5, muted-foreground #71717a, border #e4e4e7, primary #18181b, primary-foreground #fafafa, accent #f4f4f5, sidebar #fafafa, success #15803d, warn #b45309, danger #b91c1c, info #1d4ed8.
Dark: background #09090b, foreground #fafafa, card #0f0f11, muted #27272a, muted-foreground #a1a1aa, border #27272a, primary #fafafa, primary-foreground #18181b, accent #27272a, sidebar #0c0c0e, success #4ade80, warn #fbbf24, danger #f87171, info #60a5fa.
Fonts: Inter (UI), JetBrains Mono (paths, commands). Radii: 8 px controls, 10-12 px cards. Layout: sidebar 248 px, content padded 24x32.

## 7. Mockups
Design canvas: https://claude.ai/artifact/AfYRcZEFYAnG2FoX5zRBhg (9 artboards: Main=picker, Dashboard, Board, Specs, Wizard, Activity, Stats, Addons, QuickPanel). Export to `docs/design/` (Share > Export) or screenshot each. Mockups are plain-HTML recreations of shadcn, with a `framework` and a `dark` switch on each artboard. All data in them is placeholder, not real; never ship it.

## 8. Unverified (check before coding)
1. Files and folders `specify init` actually creates (feature folder, constitution file, spec/plan/tasks names).
2. Whether `.specify/` reliably signals Spec Kit.
3. Full list of Spec Kit integration keys.
4. OpenSpec docs at openspec.dev/docs: file schema, delta format for MODIFIED/REMOVED, any JSON/CLI output usable for parsing.
5. Exact slash-command syntax per agent for both frameworks, and how each agent CLI is launched non-interactively.
6. Names/branding: "Specdeck" is a placeholder; run a trademark/name check before release.
