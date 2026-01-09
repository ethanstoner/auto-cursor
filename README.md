<div align="center">

<img src="logo.png" alt="Auto-Cursor Logo" width="150" height="150">

# Auto-Cursor

**Autonomous Multi-Agent Coding Framework**

*Plan, build, and validate software with AI agents working in parallel*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/ethanstoner/auto-cursor?style=social)](https://github.com/ethanstoner/auto-cursor)

</div>

<div align="center">

[Quick Start](#quick-start) • [Commands](#commands) • [Examples](#examples) • [Troubleshooting](#troubleshooting)

</div>

---

Auto-Cursor lets you describe what you want to build, and it figures out how to build it. It breaks down your goal into tasks, runs multiple AI agents in parallel to work on different parts, and automatically merges everything back together when they're done.

## What it does

You give it a high-level goal like "add user authentication" or "create a landing page with React and Tailwind". Auto-Cursor handles the rest:

| Step | Description |
|------|-------------|
| **Plans** | Analyzes your project and breaks the goal into specific tasks |
| **Executes** | Runs multiple agents in parallel (they work on different tasks simultaneously) |
| **Validates** | Automatically runs QA checks when tasks complete |
| **Integrates** | Merges everything back to your main branch, handling conflicts automatically |

Each task runs in its own git worktree, so your main branch stays safe. Agents can work on independent tasks at the same time, which speeds things up significantly.

## Features

| Feature | Benefit |
|--------|---------|
| **Autonomous Planning** | AI analyzes your goal and creates a detailed task breakdown with dependencies |
| **Parallel Execution** | Multiple agents work simultaneously on different tasks, respecting dependencies |
| **Isolated Worktrees** | Each task gets its own git worktree - your main branch stays untouched |
| **Automatic QA** | Quality assurance runs automatically when tasks complete |
| **AI-Powered Merge** | Automatic conflict resolution when integrating back to main |
| **Memory Layer** | Agents retain insights across sessions for smarter builds |
| **Kanban Board** | Visual task management from planning through completion |
| **Project-Aware** | Detects project structure and adapts planning accordingly |

---

## Requirements

| Requirement | Description |
|------------|-------------|
| **Cursor CLI** | `cursor-agent` must be installed and working |
| **Git** | Your project needs to be a git repository |
| **jq** | For JSON processing<br>Linux/WSL: `sudo apt-get install jq`<br>Mac: `brew install jq` |
| **tmux** | Optional - Helps with agent session management |

---

## Installation

The scripts need to be installed in `~/.local/bin/` and available in your PATH. You'll need:

- `auto-cursor` - Main CLI tool
- `auto-cursor-planner` - Task planning
- `auto-cursor-merge` - Merge conflict resolution
- `orchestrate-agents` - Multi-agent orchestration

Make sure these are executable and in your PATH:

```bash
# Check if scripts are available
which auto-cursor
which auto-cursor-planner
which auto-cursor-merge
which orchestrate-agents

# If not in PATH, add to ~/.bashrc or ~/.zshrc
export PATH="$PATH:$HOME/.local/bin"
```

---

## Quick Start

```bash
# 1. Initialize a project
cd ~/my-project
auto-cursor init ~/my-project my-project-id

# 2. Create a plan
auto-cursor plan my-project-id "Add user authentication with JWT"

# 3. Start execution
auto-cursor start my-project-id

# 4. Check progress
auto-cursor status my-project-id

# 5. Review and merge when done
auto-cursor review my-project-id all
auto-cursor merge my-project-id all
```

> **Note:** The planning step analyzes your project structure, figures out what needs to be done, and creates a task breakdown with dependencies. When you start execution, agents begin working in parallel (respecting dependencies), and QA runs automatically when each task finishes.

---

## Commands

### Project Management

```bash
auto-cursor init <project-path> [project-id]  # Initialize a project
auto-cursor list                               # List all projects
```

### Planning & Execution

```bash
auto-cursor plan <project-id> <goal>          # Create a plan
auto-cursor start <project-id> [--skip-qa]   # Start execution
auto-cursor continue <project-id>              # Continue if interrupted
```

### Monitoring

```bash
auto-cursor status <project-id>                # Show kanban board
auto-cursor board <project-id>                 # Interactive board (auto-refresh)
auto-cursor tasks <project-id>                 # List all tasks
auto-cursor logs <project-id> [task-id]        # View logs
```

### Review & Integration

```bash
auto-cursor review <project-id> [task-id|all]  # Review changes
auto-cursor diff <project-id> <task-id>       # Show diff
auto-cursor merge <project-id> [task-id|all]  # Merge to main
auto-cursor discard <project-id> [task-id|all] # Discard without merging
```

### Utilities

```bash
auto-cursor retry <project-id> [task-id|all]   # Retry failed tasks
auto-cursor memory <project-id>                # View project insights
auto-cursor clean <project-id>                 # Clean up worktrees
```

---

## How It Works

### Planning Phase

When you run `auto-cursor plan`, it:

- Analyzes your project structure (detects `backend/`, `frontend/`, `api/` directories, etc.)
- Uses `cursor-agent` to break your goal into tasks
- Identifies dependencies between tasks
- Creates a dependency graph
- Estimates complexity and time

**Output:** A plan file with tasks, dependencies, and estimates stored in `~/.auto-cursor/projects/<project-id>/plan.json`

### Execution Phase

When you run `auto-cursor start`:

1. **Worktree Creation** - Each task gets its own isolated git worktree
2. **Agent Orchestration** - Agents start working in parallel
3. **Dependency Management** - If task B depends on task A, it waits for A to finish first
4. **Background Monitoring** - A monitor watches for completion
5. **Automatic QA** - QA runs automatically when agents finish
6. **Status Updates** - Task status updates in real-time

**No manual steps needed** - everything happens automatically.

### Integration Phase

When you're ready to merge:

1. **Conflict Detection** - `auto-cursor merge` checks for conflicts
2. **AI Resolution** - Uses AI to resolve conflicts automatically
3. **Safe Integration** - Merges everything back to main
4. **Cleanup** - Removes worktrees and branches

---

## Architecture

### Components

| Component | Description |
|-----------|-------------|
| `auto-cursor` | Main CLI tool for project management |
| `auto-cursor-planner` | AI-powered task planning and breakdown |
| `auto-cursor-merge` | AI-powered merge conflict resolution |
| `orchestrate-agents` | Multi-agent orchestration framework |

### Data Structure

Data is stored in `~/.auto-cursor/`:

```
~/.auto-cursor/
├── projects/
│   └── <project-id>/
│       ├── config.json          # Project configuration
│       ├── plan.json            # Original plan
│       ├── tasks.json           # Tasks with status
│       ├── memory.json          # Project insights
│       └── orchestration.json   # Agent orchestration config
├── worktrees/                   # Git worktrees for tasks
└── memory/                      # Global insights
```

### Workflow Diagram

```
User Goal
    ↓
Planning (auto-cursor plan)
    ↓
Task Breakdown + Dependencies
    ↓
Execution (auto-cursor start)
    ↓
Parallel Agents (in isolated worktrees)
    ↓
Automatic QA
    ↓
Review (auto-cursor review)
    ↓
Merge (auto-cursor merge)
    ↓
Main Branch Updated
```

---

## Examples

### Building a Website

```bash
# Initialize
auto-cursor init ~/my-website my-website

# Plan
auto-cursor plan my-website "Create a modern landing page with React, Tailwind CSS, and a hero section"

# Execute
auto-cursor start my-website

# Monitor progress
auto-cursor board my-website

# Merge when done
auto-cursor merge my-website all
```

### Building an API

```bash
# Initialize
auto-cursor init ~/my-api my-api

# Plan
auto-cursor plan my-api "Create REST API with Express.js, MongoDB, and user authentication endpoints"

# Execute
auto-cursor start my-api

# Review changes
auto-cursor review my-api all

# Merge
auto-cursor merge my-api all
```

### Full-Stack Application

```bash
# Initialize
auto-cursor init ~/my-app my-app

# Plan
auto-cursor plan my-app "Create full-stack todo app with React frontend and Node.js backend"

# Execute
auto-cursor start my-app

# Monitor
auto-cursor status my-app

# Review and merge
auto-cursor review my-app all
auto-cursor merge my-app all
```

> **Tip:** It works with pretty much any project type - web apps, APIs, full-stack, mobile, desktop, data science, DevOps, games, CLI tools. The planner adapts to your project structure automatically.

---

## Best Practices

### Planning

- **Be specific** - Clear goals lead to better task breakdowns
- **Start small** - Test with simple goals before complex ones
- **Review plans** - Check the generated plan before starting execution

### Execution

- **Monitor progress** - Use `auto-cursor board` to watch progress
- **Let it run** - Don't interrupt agents unless necessary
- **Check logs** - Use `auto-cursor logs` if something seems stuck

### Integration

- **Review before merge** - Always review changes with `auto-cursor review`
- **Test after merge** - Verify everything works after merging
- **Clean up** - Use `auto-cursor clean` to remove old worktrees

### Project Management

- **Use descriptive IDs** - Project IDs should be clear and memorable
- **One project per repo** - Each git repository should be one project
- **Keep main clean** - Only merge when you're confident in the changes

---

## Troubleshooting

### Planning fails

**Problem:** `auto-cursor plan` doesn't generate a plan

**Solutions:**
- Check that `cursor-agent` is installed: `which cursor-agent`
- Verify `jq` is installed: `which jq`
- Try a simpler goal to test
- Check project is a git repository: `git status`

### Agents not starting

**Problem:** Agents don't start when running `auto-cursor start`

**Solutions:**
- Check orchestration status: `orchestrate-agents status`
- Verify project is initialized: `auto-cursor list`
- Check logs: `auto-cursor logs <project-id> all`
- Ensure project is a git repo with at least one commit

### Merge conflicts

**Problem:** Merge conflicts that AI can't resolve

**Solutions:**
- Review conflicts manually: `auto-cursor diff <project-id> <task-id>`
- Merge tasks one at a time instead of all at once
- Check the worktree directly: `cd ~/.auto-cursor/worktrees/auto-cursor-<project-id>-<task-id>/`

### QA failures

**Problem:** QA fails after task completion

**Solutions:**
- Check QA logs in the project directory
- Review the task output: `auto-cursor logs <project-id> <task-id>`
- Retry the task: `auto-cursor retry <project-id> <task-id>`
- Consider skipping QA for that task: `auto-cursor start <project-id> --skip-qa`

### Scripts not found

**Problem:** `auto-cursor: command not found`

**Solutions:**
- Check scripts are in PATH: `echo $PATH | grep .local/bin`
- Add to PATH: `export PATH="$PATH:$HOME/.local/bin"`
- Make scripts executable: `chmod +x ~/.local/bin/auto-cursor*`
- Verify installation: `ls -la ~/.local/bin/auto-cursor*`

---

## Comparison with Auto-Claude

This is inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude) but built for Cursor CLI agents instead.

### Feature Parity

| Feature | Auto-Claude | Auto-Cursor |
|---------|------------|-------------|
| Autonomous Planning | ✅ | ✅ |
| Multi-Agent Orchestration | ✅ | ✅ |
| Isolated Git Worktrees | ✅ | ✅ |
| Self-Validating QA | ✅ | ✅ |
| AI-Powered Merge | ✅ | ✅ |
| Memory Layer | ✅ | ✅ |
| Kanban Board | ✅ | ✅ |

### Enhancements

Auto-Cursor includes several improvements:

- **Project-specific cleanup** - Only stops agents for that project
- **Automatic background monitoring** - QA runs without manual steps
- **Real-time status updates** - Tasks.json updates automatically
- **Project-aware planning** - Detects project structure and adapts

---

## Safety

Auto-Cursor is designed with safety in mind:

| Safety Feature | Description |
|----------------|-------------|
| **Isolated Worktrees** | Each task runs in its own git worktree - main branch never touched |
| **No Conflicts** | Agents work in separate directories, can't conflict with each other |
| **Automatic QA** | Catches issues before integration |
| **AI Conflict Resolution** | Handles merge conflicts automatically |
| **Review Before Merge** | Always review changes before merging to main |

Your main branch is protected - nothing gets merged until you explicitly run `auto-cursor merge`.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

**Ways to contribute:**
- 🐛 [Report a Bug](https://github.com/ethanstoner/auto-cursor/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/ethanstoner/auto-cursor/issues/new?template=feature_request.md)
- 📝 [Submit a Pull Request](https://github.com/ethanstoner/auto-cursor/compare)
- 📖 Improve Documentation

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude)
- Built for [Cursor CLI](https://cursor.sh/) agents

---

<div align="center">

**Made with ❤️ for autonomous software development**

[⭐ Star on GitHub](https://github.com/ethanstoner/auto-cursor) • [📖 Documentation](#table-of-contents) • [🚀 Quick Start](#quick-start)

</div>
