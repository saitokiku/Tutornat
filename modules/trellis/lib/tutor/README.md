# Tutor engine closure

The check → student-model → report chain imported from `saitokiku/KaizenEdu` at
`20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe` for E1 ([docs/first-build.md](../../docs/first-build.md)).
Which files are verbatim, which carry an import rewrite, which are adapter seams,
and what was deliberately not imported: [tests/engine/closure-manifest.json](../../tests/engine/closure-manifest.json).
Consumers of mastery state, imported or excluded: [tests/engine/consumer-inventory.json](../../tests/engine/consumer-inventory.json).

| Directory | Contents | Adapter seams |
|---|---|---|
| `checks/` | local grading, symbolic equivalence, pending-check constructors, the check service | the live-model grader abstains; diagnose placement is deterministic |
| `model/` | pure student model v0, evidence writer, mastery/misconception service | — |
| `session/` | state shape, state machine, coach heuristics, sitting clock, session row read/write subset | `createSession`/metering excluded |
| `report/` | parent report, weekly lead, row mappers | — |
| `progress/` | learner progress view | — |
| `graph/` | skill graph F1–F12, next-skill, item bank loader/validator | no item bank file is shipped (0 of 118 upstream items are reviewed) |
| `db/` | the `Queryable` interface only | no driver; tests inject `node:sqlite` |

There is no HTTP route, no model provider, no database driver and no UI in this
tree. The streaming turn engine is not imported; its tutor-authored check path is
`checks/prompt.ts#pendingFromTag`, which is.
