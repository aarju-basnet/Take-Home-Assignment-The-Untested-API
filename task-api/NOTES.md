# Notes: The Untested API

## Test coverage

43 tests pass (unit tests for `taskService.js` and Supertest tests for all routes).

| Metric | Coverage |
|---|---|
| Statements | 98.76% |
| Branches | 98.95% |
| Functions | 96.87% |
| Lines | 98.63% |

All of `routes`, `services` and `utils` are at 100%. The only uncovered lines
are in `app.js` (lines 36-37): the server startup code. The tests import `app`
without starting a real server, so I left that block untested on purpose.

Run with: `npm run coverage`

## Bug report

I found these by reading the code and then confirming with tests.

| # | Where | Expected | What actually happens | Fix | Status |
|---|---|---|---|---|---|
| 1 | `taskService.getPaginated` | `?page=1` returns the first tasks | Page 1 skips the first `limit` tasks, because `offset = page * limit` | Use `(page - 1) * limit` | **Fixed** |
| 2 | `taskService.getByStatus` | `?status=todo` returns only todo tasks | `?status=do` also matches `todo` and `done`, because `includes()` is a substring match | Use `===` | **Fixed** |
| 3 | `taskService.completeTask` | Completing a task keeps its priority | Priority is always reset to `medium` | Remove the `priority: 'medium'` line | **Fixed** |
| 4 | `taskService.update` (PUT) | Client can only change allowed fields | Client can overwrite `id`, `createdAt`, `completedAt` because the whole body is spread onto the task | Only copy allowed fields | Not fixed |
| 5 | `taskService.update` (PUT) | Setting `status: "done"` sets `completedAt` | `completedAt` stays null, while `completeTask` sets it | Set `completedAt` when status becomes `done` | Not fixed |
| 6 | `app.js` error handler | Broken JSON returns 400 | Returned 500 because the handler ignored the error's status | Use the error's own status (`err.status \|\| 500`), so broken JSON now returns 400 | **Fixed** |
| 7 | `routes/tasks.js` GET `/` | `?status=done&page=2` filters and paginates | Pagination is ignored when `status` is given (early return) | Filter first, then paginate | Not fixed |
| 8 | `routes/tasks.js` GET `/` | `page=-1` or `limit=0` handled safely | Negative values give strange results | `Math.max(1, ...)` | **Fixed** |
| 9 | `validators.js` | `status: ""` is rejected | It skips validation because an empty string is falsy | Check `!== undefined` | Not fixed |

## Extra
- Added `GET /health` (returns `{ "status": "ok" }`) so the hosting service can check the app is alive.

**How I found them:** I read each function and wrote tests for the expected behavior.
Bugs 1, 2 and 3 were caught by tests failing on the original code.

**Why I fixed 1, 2, 3, 6 and 8:** 1, 2, 3 and 8 return wrong data without any error,
which is the hardest kind of bug to notice. Bug 6 was a small change that also made
the error handler testable.

**Documentation mismatch:** the README lists statuses as `pending / in-progress / completed`,
but the code and ASSIGNMENT.md use `todo / in_progress / done`. I followed the code.

## New feature: `PATCH /tasks/:id/assign`

Body: `{ "assignee": "string" }`. Returns the updated task.

Design decisions:
- **404** if the task does not exist. I check this first, so a missing task is reported before body problems.
- **400** if `assignee` is missing, not a string, empty, or only spaces.
- **400** if the name is longer than 100 characters, so nobody can store huge values.
- The name is **trimmed** before saving, so `"  Asha "` is stored as `"Asha"`.
- **Reassigning is allowed** and overwrites the old assignee, because changing owners is normal in task tools. The alternative is a 409 Conflict if the team wants an explicit "unassign first" step.
- New tasks now start with `assignee: null`.

## What I would test next
- The known bugs (4, 5, 7, 9), as failing tests first and then fixed.
- Overdue logic around exact times and time zones.
- Behavior when many tasks exist (pagination performance).

## What surprised me
- Bugs 1 and 2 looked correct at a glance and only showed up with specific inputs.
- The README and the code disagree on status names.
- `completeTask` quietly changing priority was hidden in an object spread.

## Questions before shipping to production
- Should `assignee` be a free-text name or a real user id from a users table?
- Should PUT be allowed to set `status: done` directly?
- The data is in memory and resets on restart. Which database will we use?
- Do we need authentication, and rate limiting?