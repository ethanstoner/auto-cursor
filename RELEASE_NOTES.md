# Auto-Cursor Release Notes

## Version 10.0.1

### New Command: `auto-cursor cleanup <project-id>`

**What it does:**
- Removes worktrees for tasks in terminal states (`completed` or `failed`) only
- Requires explicit `yes` confirmation before deletion
- Lists all worktrees that will be removed before prompting

**Safety guarantees:**
- Never deletes worktrees for active tasks (`pending`, `running`, `qa_running`, `fix_running`)
- Never kills processes
- Only affects terminal-state worktrees for the specified project

**Edge cases covered:**
- Unknown project ID: Errors cleanly with helpful message, exit code 1
- No terminal-state worktrees: Prints message and exits 0 (no prompt)
- Non-"yes" input: Cancels safely
- Active tasks exist: Ignores their worktrees completely

**Example usage:**
```bash
$ auto-cursor cleanup my-project
Terminal-state worktrees for project: my-project

  • task-a (status: completed)
    → ~/.auto-cursor/worktrees/auto-cursor-my-project-task-a

This will remove the worktrees listed above.
Continue? (yes/no): yes

Cleaning up worktrees...
Discarded task-a

Cleanup complete
```

**Safety note:** Only terminal-state worktrees; requires explicit `yes` confirmation.

---

## Release Checklist

- [x] doctor passes
- [x] dry-run works
- [x] real mode proven previously
- [x] cleanup validated
