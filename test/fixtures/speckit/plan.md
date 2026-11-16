# Implementation Plan: Todo List JSON Output Flag

**Branch**: `001-todo-list-json-flag` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-todo-list-json-flag/spec.md`

## Summary

Add `--json` to the `list` command of a tiny todo CLI. With the flag, print all items as one bare JSON array of `{id, text, done}` via `json.dumps`; without it, output is unchanged. Python 3 standard library only (`argparse`, `json`, `unittest`). The repo contains no CLI yet, so the plan includes a minimal baseline (`add`, `list`) that the flag extends.

## Technical Context

**Language/Version**: Python 3.8+ (standard library only, per user input)

**Primary Dependencies**: None (stdlib: `argparse`, `json`, `sys`, `unittest`)

**Storage**: A JSON file (default `todos.json` in the current directory, override via `TODO_FILE` env var)

**Testing**: `unittest` (stdlib), run with `python3 -m unittest`

**Target Platform**: Any OS with Python 3 (developed on Linux)

**Project Type**: CLI

**Performance Goals**: N/A (small lists)

**Constraints**: stdout carries only the JSON document under `--json`; errors go to stderr with non-zero exit; no partial JSON on failure

**Scale/Scope**: Dozens of items; one command flag

## Constitution Check

The constitution (`.specify/memory/constitution.md`) is an unfilled template with no ratified principles, so there are no gates. Applying the template's spirit anyway: text I/O (stdout/stderr split), tests first, simplicity. **Result: PASS.** Re-check after design: still PASS (no extra projects, no dependencies).

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-list-json-flag/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cli.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
todo.py                  # single-file CLI: argparse, load/save, list/add
tests/
└── test_todo.py         # unittest, runs the CLI via subprocess
```

**Structure Decision**: Single file and one test module. A package would add structure with no benefit for a two-command tool.

## Complexity Tracking

No violations.
