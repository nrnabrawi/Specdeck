# ROADMAP

One branch per milestone. Gate = typecheck + lint + tests green, summary (done / deviations / risks), drift check vs SPEC, then your go-ahead. Adapter tests use real fixtures captured from the CLIs.

| # | Milestone | AC scope | Exit criteria | Gate |
|---|---|---|---|---|
| M0 | Scaffold | AC-004 (baseline), AC-111 | Electron+Vite+React+Tailwind+shadcn run; light/dark; CI scripts (typecheck, lint, test); node-pty/better-sqlite3 rebuild works on Windows + Linux | Packaged dev app launches; you approve stack |
| M1 | Shell + storage + OpenSpec read | AC-001, 002, 010, 011, 013, 014, 020, 021, 030 (read), 031 (read), 040, 041, 042, 043, 110, 112 | Add projects, detect, switch; OpenSpec adapter lists units/specs/deltas from real fixtures; Dashboard, Board (read-only), Spec browser | Adapter tests on real `openspec` output; manual check on a real repo |
| M2 | Run actions + terminal (OpenSpec) | AC-003, 012, 032, 033, 080, 081, 082 (OpenSpec), 100, 101, 102 | Confirm-then-run init and stage commands; Claude Code/Codex in embedded PTY; run records; Add-ons page for OpenSpec | One real propose and apply run per agent, recorded |
| M3 | Spec Kit adapter | AC-010 to 014, 030 to 042, 080 to 082 (Spec Kit) for Spec Kit | Spec Kit parity behind same adapter; open Unverified items (feature dir, converge markers) resolved from real runs | Real `specify` fixtures + feature run; board shows features |
| M4 | Activity + Stats | AC-022, 060, 070, 071 | Feed and stats from recorded runs/events + file-derived events; empty states | Numbers reconcile with Run/Event tables |
| M5 | Wizard | AC-050, 051, 052, 053 | Both framework variants; write scope enforced | Writes limited to §10 verified by test |
| M6 | Tray quick panel | AC-090, 091 | Tray panel with live current change; window-closed operation | Manual on Windows + Linux |
| M7 | Hardening + release | AC-004, 111 full pass | WCAG 2.1 AA checks, e2e smoke (Playwright), MIT license file, installers for Windows + Linux, name/trademark check ("Specdeck") | Full drift check; you approve release |
