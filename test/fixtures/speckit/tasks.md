---

description: "Task list for Todo List JSON Output Flag"
---

# Tasks: Todo List JSON Output Flag

**Input**: Design documents from `/specs/001-todo-list-json-flag/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, quickstart.md

**Tests**: Included (plan.md specifies `unittest` + subprocess tests in `tests/test_todo.py`).

**Organization**: Single user story (US1, P1). The repo has no CLI yet, so the baseline `add`/`list` commands live in Foundational.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single project at repo root: `todo.py`, `tests/test_todo.py`.

## Phase 1: Setup

- [ ] T001 Create `tests/` directory and an empty `tests/__init__.py` at the repo root (stdlib only; no dependency files needed)

---

## Phase 2: Foundational (Baseline CLI that `--json` extends)

**Purpose**: Minimal `add` and human-format `list` so there is data and existing behavior to preserve.

**⚠️ CRITICAL**: US1 cannot start until this is complete.

- [ ] T002 Create `todo.py` with `main()` using `argparse` subparsers `add TEXT` and `list`; reconfigure stdout to UTF-8 (`sys.stdout.reconfigure(encoding="utf-8")`); guard with `if __name__ == "__main__": sys.exit(main())`
- [ ] T003 In `todo.py`, implement `load()`/`save()`: store path is `os.environ.get("TODO_FILE", "todos.json")`; a missing file returns `[]`; invalid JSON or non-list shape raises `ValueError`; items are `{"id": int, "text": str, "done": bool}`
- [ ] T004 In `todo.py`, implement `add`: reject empty `text` ("Non-empty on `add`"); `id` = max existing id + 1, starting at 1; `done` defaults to `false`; save; print nothing; exit 0
- [ ] T005 In `todo.py`, implement human-format `list`: one line per item as `[x] 1 text` (done) / `[ ] 2 text` (not done); nothing printed for an empty list
- [ ] T006 In `todo.py` `main()`, catch `OSError` and `ValueError` (includes `json.JSONDecodeError`), print `error: <message>` to stderr, return exit code 1

**Checkpoint**: `python3 todo.py add x && python3 todo.py list` works in human format.

---

## Phase 3: User Story 1 - Machine-readable todo listing (Priority: P1) 🎯 MVP

**Goal**: `todo.py list --json` prints all items as one bare JSON array of `{id, text, done}`.

**Independent Test**: Run `list --json` against a known store and confirm stdout parses with `json.loads` and contains every item; run `list` without the flag and confirm output is unchanged.

### Tests for User Story 1

> Write first; confirm they FAIL before T014.

- [ ] T007 [US1] Create `tests/test_todo.py` with a helper that runs `python3 todo.py ...` via `subprocess.run` (capture stdout/stderr, `TODO_FILE` set to a per-test temp file, cleaned up in `tearDown`) and returns `(returncode, stdout, stderr)`
- [ ] T008 [US1] In `tests/test_todo.py`, add test: three items added, `list --json` stdout parses to a list of 3 dicts with exactly keys `id`, `text`, `done` (acceptance 1, FR-002/FR-003)
- [ ] T009 [US1] In `tests/test_todo.py`, add test: `list` without `--json` output equals exactly the human format `[ ] 1 text` lines (acceptance 2, FR-005/SC-003)
- [ ] T010 [US1] In `tests/test_todo.py`, add test: empty/missing store with `--json` gives stdout `[]` and exit 0 (acceptance 3, FR-004)
- [ ] T011 [US1] In `tests/test_todo.py`, add test: text containing `"`, a newline, and `café` round-trips through `json.loads(stdout)` unchanged (FR-006/SC-001)
- [ ] T012 [US1] In `tests/test_todo.py`, add test: store file containing `not json` with `--json` gives empty stdout, non-empty stderr, exit 1 (FR-007)
- [ ] T013 [US1] In `tests/test_todo.py`, add test: `list --help` stdout contains `--json` (FR-008)

### Implementation for User Story 1

- [ ] T014 [US1] In `todo.py`, add `--json` (`action="store_true"`, `help="Print items as a JSON array of {id, text, done} instead of the human-readable format"`) to the `list` subparser; when set, build `json.dumps(items, ensure_ascii=False)` fully before printing, then print it with a trailing newline (nothing else on stdout); otherwise keep the T005 behavior untouched

**Checkpoint**: `python3 -m unittest discover -s tests` passes.

---

## Phase 4: Polish

- [ ] T015 Run the full validation script in `specs/001-todo-list-json-flag/quickstart.md` and confirm each "expect" line holds

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T002 → T003 → T004/T005 → T006, all in `todo.py`, sequential) → Phase 3 → Phase 4.
- T007 before T008–T013 (same file, sequential). Tests T007–T013 before T014 (they should fail first).
- T014 depends on T005 and T006.

### Parallel Opportunities

Almost none: everything touches `todo.py` or `tests/test_todo.py`. The only parallel split is writing tests (T007–T013, `tests/test_todo.py`) alongside the foundational work (T002–T006, `todo.py`) by two people.

## Implementation Strategy

MVP = the whole feature (one story): Setup → Foundational → tests → T014 → quickstart validation.

## Notes

- Constraints to preserve: stdout carries only the JSON under `--json`; errors go to stderr with exit 1; no partial JSON on failure.
