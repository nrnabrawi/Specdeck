# Feature Specification: Todo List JSON Output Flag

**Feature Branch**: `001-todo-list-json-flag`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Add a --json flag to a tiny CLI that lists todo items. Do not ask clarifying questions; use sensible defaults."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Machine-readable todo listing (Priority: P1)

A user or script runs the list command with `--json` and receives the todo items as structured, machine-readable output instead of the human-friendly format, so it can be piped into other tools.

**Why this priority**: This is the whole feature; it enables scripting and integration.

**Independent Test**: Run the list command with `--json` against a known set of todos and confirm the output parses as valid JSON containing every item.

**Acceptance Scenarios**:

1. **Given** three todo items exist, **When** the user runs the list command with `--json`, **Then** the output is a single valid JSON array of three objects, each with the item's identifier, text, and completion status.
2. **Given** todo items exist, **When** the user runs the list command without `--json`, **Then** the output is unchanged from today's human-readable format.
3. **Given** no todo items exist, **When** the user runs the list command with `--json`, **Then** the output is an empty JSON array (`[]`) and the command succeeds.

---

### Edge Cases

- Todo text containing quotes, newlines, or non-ASCII characters is correctly escaped so the output remains valid JSON.
- With `--json`, nothing but the JSON document is written to standard output (no headers, counts, or decoration); diagnostics go to standard error.
- If listing fails (e.g., the todo store is unreadable), the command exits with a non-zero status and does not emit partial or invalid JSON.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The list command MUST accept a `--json` flag.
- **FR-002**: With `--json`, the command MUST output all todo items as one valid JSON array on standard output.
- **FR-003**: Each item in the JSON output MUST include its identifier, text, and completion status, using the same field names on every run.
- **FR-004**: With `--json`, an empty list MUST produce `[]` and a successful exit status.
- **FR-005**: Without `--json`, the command's output and behavior MUST remain unchanged.
- **FR-006**: With `--json`, special characters in todo text MUST be escaped so output is always parseable.
- **FR-007**: On failure with `--json`, the command MUST exit non-zero and report the error on standard error, not as JSON on standard output.
- **FR-008**: The help text MUST describe the `--json` flag.

### Key Entities

- **Todo item**: A task with an identifier, descriptive text, and a done/not-done status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `--json` outputs across test cases (including empty list and special characters) parse successfully with a standard JSON parser.
- **SC-002**: A user can pipe the list output into a standard JSON tool and extract a field on the first attempt without any text cleanup.
- **SC-003**: Existing non-JSON list behavior shows zero output differences versus before the change.

## Assumptions

- The CLI already has a list command and a persisted set of todo items; only the output format is added.
- Output is a bare JSON array (no wrapper object) with fields `id`, `text`, `done`; this is the conventional default.
- JSON is printed compact or pretty at the implementer's discretion; consumers must not depend on whitespace.
- Filtering, sorting, and other output formats (CSV, YAML) are out of scope.
