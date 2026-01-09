<div align="center">

<img src="logo.png" alt="Auto-Cursor Logo" width="150" height="150">

# Auto-Cursor

**Autonomous multi-agent coding framework that plans, builds, and validates software for you.**

[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![GitHub](https://img.shields.io/github/stars/ethanstoner/auto-cursor?style=flat-square)](https://github.com/ethanstoner/auto-cursor)
[![GitHub Issues](https://img.shields.io/github/issues/ethanstoner/auto-cursor?style=flat-square)](https://github.com/ethanstoner/auto-cursor/issues)

</div>

<div align="center">

[Quick Start](#quick-start) • [Commands](#commands) • [Examples](#examples) • [Troubleshooting](#troubleshooting)

</div>

---

## Installation

### Quick Install

```bash
# Clone the repository
git clone https://github.com/ethanstoner/auto-cursor.git
cd auto-cursor

# Make scripts executable
chmod +x bin/*

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(pwd)/bin"
```

### Verify Installation

```bash
which auto-cursor
which auto-cursor-planner
which auto-cursor-merge
which orchestrate-agents
```

---

## Requirements

- **Cursor CLI** - `cursor-agent` must be installed and working
- **Git repository** - Your project must be initialized as a git repo
- **jq** - For JSON processing: `sudo apt-get install jq` (Linux) or `brew install jq` (Mac)

---

## Quick Start

1. **Initialize a project** - Select a git repository folder
2. **Create a plan** - Describe what you want to build
3. **Start execution** - Agents work autonomously
4. **Review and merge** - Integrate changes back to main

```bash
# 1. Initialize a project
cd ~/my-project
auto-cursor init ~/my-project my-project-id

# 2. Create a plan
auto-cursor plan my-project-id "Add user authentication with JWT"

# 3. Start execution
auto-cursor start my-project-id

# 4. Monitor progress
auto-cursor status my-project-id

# 5. Review and merge when done
auto-cursor review my-project-id all
auto-cursor merge my-project-id all
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Autonomous Tasks** | Describe your goal; agents handle planning, implementation, and validation |
| **Parallel Execution** | Run multiple agents simultaneously with dependency management |
| **Isolated Workspaces** | All changes happen in git worktrees - your main branch stays safe |
| **Self-Validating QA** | Built-in quality assurance loop catches issues before you review |
| **AI-Powered Merge** | Automatic conflict resolution when integrating back to main |
| **Memory Layer** | Agents retain insights across sessions for smarter builds |
| **Kanban Board** | Visual task management from planning through completion |
| **Interactive Planning** | Step-by-step goal refinement with AI assistance |
| **Plan Validation** | Validate plan structure and dependencies before execution |
| **Task Management** | Add, remove, and modify tasks in plans |

---

## Commands

### Project Management

```bash
auto-cursor init <project-path> [project-id]  # Initialize a new project
auto-cursor list                               # List all projects
```

### Planning & Execution

```bash
auto-cursor plan <project-id> <goal>          # Create a plan for a goal
  --interactive                                # Interactive goal refinement
  --complexity <level>                         # Override complexity (simple/medium/complex)
auto-cursor start <project-id>                 # Start executing the current plan
  --skip-qa                                    # Skip automatic QA validation
auto-cursor continue <project-id>              # Continue interrupted execution
```

### Planning & Validation

```bash
auto-cursor validate <project-id>              # Validate plan structure and dependencies
  --auto-fix                                   # Auto-fix common issues
auto-cursor plan-review <project-id>           # Review generated plan
auto-cursor plan-edit <project-id>             # Edit plan interactively
auto-cursor task-add <project-id> <desc>       # Add custom task to plan
auto-cursor task-remove <project-id> <id>      # Remove task from plan
auto-cursor task-modify <project-id> <id>      # Modify task in plan
```

### Monitoring

```bash
auto-cursor status <project-id>                # Show kanban board status
  --detailed                                   # Show detailed progress with time estimates
auto-cursor board <project-id>                 # Interactive kanban board (auto-refresh)
auto-cursor tasks <project-id>                 # List all tasks with details
auto-cursor logs <project-id> [task-id]        # View agent logs (use 'all' for all tasks)
```

### Task Control

```bash
auto-cursor pause <project-id> <task-id>       # Pause specific task
auto-cursor cancel <project-id> <task-id>      # Cancel specific task
auto-cursor retry <project-id> [task-id]       # Retry failed task (use 'all' for all failed)
```

### Review & Integration

```bash
auto-cursor review <project-id> [task-id]      # Review changes in worktree (use 'all' for all)
auto-cursor diff <project-id> <task-id>         # Show diff before merge
auto-cursor merge <project-id> [task-id]       # Merge worktree back to main (use 'all' for all tasks)
auto-cursor discard <project-id> [task-id]     # Discard worktree without merging
```

### Utilities

```bash
auto-cursor memory <project-id>                # View memory/insights
auto-cursor clean <project-id>                 # Clean up worktrees and agents
```

---

## How It Works

### Planning Phase

When you run `auto-cursor plan`, the system:
- Analyzes your project structure (backend, frontend, etc.)
- Uses AI to break down your goal into specific tasks
- Identifies dependencies between tasks
- Estimates complexity and time

### Execution Phase

When you run `auto-cursor start`, the system:
- Creates isolated git worktrees for each task
- Starts agents in parallel (respecting dependencies)
- Each agent works in its own isolated workspace
- Agents automatically run QA when complete

### Integration Phase

When you run `auto-cursor merge`, the system:
- Merges each worktree back to the main branch
- Uses AI to resolve conflicts automatically
- Preserves all changes safely

---

## Project Structure

```
~/.auto-cursor/
├── projects/
│   └── <project-id>/
│       ├── config.json          # Project configuration
│       ├── plan.json            # Generated plan
│       ├── tasks.json           # Task status tracking
│       ├── memory.json          # Cross-session insights
│       └── orchestration.json   # Agent orchestration config
└── worktrees/
    └── auto-cursor-<project-id>-<task-id>/  # Isolated workspaces
```

---

## Kanban Board

The kanban board shows tasks in columns:
- **PENDING** - Tasks waiting to start
- **RUNNING** - Tasks currently being worked on
- **QA** - Tasks in quality assurance
- **COMPLETED** - Tasks that passed QA
- **FAILED** - Tasks that failed QA

---

## Memory Layer

The memory layer stores:
- Insights from previous builds
- Common patterns and solutions
- Project-specific knowledge
- Best practices learned over time

View memory with:
```bash
auto-cursor memory <project-id>
```

---

## Examples

### Building a Website

```bash
auto-cursor init ~/my-website my-website
auto-cursor plan my-website "Create a modern landing page with React, Tailwind CSS, and a hero section"
auto-cursor start my-website
auto-cursor merge my-website all
```

### Building an API

```bash
auto-cursor init ~/my-api my-api
auto-cursor plan my-api "Create REST API with Express.js, MongoDB, and user authentication endpoints"
auto-cursor start my-api
auto-cursor review my-api all
auto-cursor merge my-api all
```

### Full-Stack Application

```bash
auto-cursor init ~/my-app my-app
auto-cursor plan my-app "Create full-stack todo app with React frontend and Node.js backend"
auto-cursor start my-app
auto-cursor status my-app
auto-cursor merge my-app all
```

---

## Troubleshooting

### Planning Fails

```bash
# Check if cursor-agent is available
which cursor-agent

# Check orchestration status
orchestrate-agents status
```

### Agents Not Starting

```bash
# Check orchestration status
orchestrate-agents status

# Check logs
auto-cursor logs <project-id> all
```

### Merge Conflicts

The system automatically resolves conflicts using AI. If manual resolution is needed:
1. Check git status: `cd <project-path> && git status`
2. Resolve conflicts manually
3. Complete merge: `git commit`

### Worktrees Not Cleaning Up

```bash
# Manual cleanup
auto-cursor clean <project-id>

# Or remove manually
rm -rf ~/.auto-cursor/worktrees/auto-cursor-<project-id>-*
```

---

## Comparison with Auto-Claude

| Feature | Auto-Claude | Auto-Cursor |
|---------|-------------|-------------|
| AI Model | Claude (Anthropic) | Cursor Agent (any model) |
| Interface | Desktop GUI | CLI |
| Worktrees | ✅ | ✅ |
| QA Loop | ✅ | ✅ |
| Memory Layer | ✅ | ✅ |
| Parallel Agents | ✅ (up to 12) | ✅ (unlimited) |
| Kanban Board | GUI | CLI |
| Git Integration | ✅ | ✅ |
| AI Merge | ✅ | ✅ |

---

## Best Practices

1. **Start Small**: Begin with simple goals to understand the system
2. **Review Plans**: Always review the generated plan before starting
3. **Monitor Progress**: Use `auto-cursor board` to watch progress
4. **Review Before Merge**: Check completed work before merging
5. **Use Memory**: Let the system learn from previous builds
6. **Clean Regularly**: Clean up old worktrees to save space

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
