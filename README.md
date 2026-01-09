<div align="center">

<img src="logo.png" alt="Auto-Cursor Logo" width="150" height="150">

# Auto-Cursor

**Autonomous Multi-Agent Coding Framework**

*Plan, build, and validate software with AI agents working in parallel*

</div>

Auto-Cursor lets you describe what you want to build, and it figures out how to build it. It breaks down your goal into tasks, runs multiple AI agents in parallel to work on different parts, and automatically merges everything back together when they're done.

## What it does

You give it a high-level goal like "add user authentication" or "create a landing page with React and Tailwind". Auto-Cursor:

1. Plans - Analyzes your project and breaks the goal into specific tasks
2. Executes - Runs multiple agents in parallel (they work on different tasks simultaneously)
3. Validates - Automatically runs QA checks when tasks complete
4. Integrates - Merges everything back to your main branch, handling conflicts automatically

Each task runs in its own git worktree, so your main branch stays safe. Agents can work on independent tasks at the same time, which speeds things up significantly.

## Requirements

You'll need:
- Cursor CLI with `cursor-agent` installed and working
- Git (your project needs to be a git repo)
- `jq` for JSON processing (`sudo apt-get install jq` on Linux/WSL, `brew install jq` on Mac)
- `tmux` is optional but helps with agent session management

## Quick start

First, install the scripts. The actual code lives in `~/.local/bin/` - you'll need `auto-cursor`, `auto-cursor-planner`, `auto-cursor-merge`, and `orchestrate-agents` available in your PATH.

```bash
# Initialize a project
cd ~/my-project
auto-cursor init ~/my-project my-project-id

# Create a plan
auto-cursor plan my-project-id "Add user authentication with JWT"

# Start execution
auto-cursor start my-project-id

# Check progress
auto-cursor status my-project-id

# When done, review and merge
auto-cursor review my-project-id all
auto-cursor merge my-project-id all
```

The planning step analyzes your project structure, figures out what needs to be done, and creates a task breakdown with dependencies. When you start execution, agents begin working in parallel (respecting dependencies), and QA runs automatically when each task finishes.

## Commands

**Project management:**
```bash
auto-cursor init <project-path> [project-id]  # Initialize a project
auto-cursor list                               # List all projects
```

**Planning and execution:**
```bash
auto-cursor plan <project-id> <goal>                    # Create a plan
auto-cursor start <project-id> [--skip-qa]             # Start execution
auto-cursor continue <project-id>                       # Continue if interrupted
```

**Monitoring:**
```bash
auto-cursor status <project-id>        # Show kanban board
auto-cursor board <project-id>         # Interactive board (auto-refresh)
auto-cursor tasks <project-id>         # List all tasks
auto-cursor logs <project-id> [task-id] # View logs
```

**Review and integration:**
```bash
auto-cursor review <project-id> [task-id|all]  # Review changes
auto-cursor diff <project-id> <task-id>        # Show diff
auto-cursor merge <project-id> [task-id|all]   # Merge to main
auto-cursor discard <project-id> [task-id|all] # Discard without merging
```

**Utilities:**
```bash
auto-cursor retry <project-id> [task-id|all]  # Retry failed tasks
auto-cursor memory <project-id>               # View project insights
auto-cursor clean <project-id>                 # Clean up worktrees
```

## How it works

When you run `auto-cursor plan`, it looks at your project structure (detects backend/, frontend/, api/ directories, etc.) and uses `cursor-agent` to break your goal into tasks. It figures out which tasks depend on others and creates a dependency graph.

When you run `auto-cursor start`, each task gets its own git worktree. Agents start working in parallel - if task B depends on task A, it waits for A to finish first. A background monitor watches for completion and automatically runs QA when agents finish. No manual steps needed.

When you're ready to merge, `auto-cursor merge` checks for conflicts and uses AI to resolve them automatically, then merges everything back to main and cleans up the worktrees.

## Architecture

The main components are:
- `auto-cursor` - Main CLI tool
- `auto-cursor-planner` - Handles task planning
- `auto-cursor-merge` - Handles merge conflict resolution
- `orchestrate-agents` - Manages multiple agents

Data is stored in `~/.auto-cursor/`:
- `projects/<project-id>/` - Project configs, plans, tasks, memory
- `worktrees/` - Git worktrees for each task
- `memory/` - Global insights

## Examples

**Building a website:**
```bash
auto-cursor init ~/my-website my-website
auto-cursor plan my-website "Create a modern landing page with React, Tailwind CSS, and a hero section"
auto-cursor start my-website
auto-cursor merge my-website all
```

**Building an API:**
```bash
auto-cursor init ~/my-api my-api
auto-cursor plan my-api "Create REST API with Express.js, MongoDB, and user authentication endpoints"
auto-cursor start my-api
auto-cursor merge my-api all
```

It works with pretty much any project type - web apps, APIs, full-stack, mobile, desktop, data science, DevOps, games, CLI tools. The planner adapts to your project structure.

## Comparison with Auto-Claude

This is inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude) but built for Cursor CLI agents instead. It has all the same core features (planning, multi-agent orchestration, worktrees, QA, merge, memory, kanban board) plus a few improvements:

- Project-specific cleanup (only stops agents for that project)
- Automatic background monitoring (QA runs without manual steps)
- Real-time status updates
- Project-aware planning

## Safety

Each task runs in an isolated git worktree, so your main branch is never touched until you explicitly merge. Agents can't conflict with each other because they're working in separate directories. QA runs automatically to catch issues before integration, and merge conflicts are resolved automatically using AI.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for details. If you find bugs or have feature ideas, open an issue.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude). Built for [Cursor CLI](https://cursor.sh/) agents.
