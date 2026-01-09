<div align="center">

<img src="logo.png" alt="Auto-Cursor Logo" width="150" height="150">

# Auto-Cursor

**Autonomous Multi-Agent Coding Framework**

*Plan, build, and validate software with AI agents working in parallel*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/ethanstoner/auto-cursor?style=social)](https://github.com/ethanstoner/auto-cursor)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples)

</div>

---

## 📑 Table of Contents

- [What is Auto-Cursor?](#-what-is-auto-cursor)
  - [Key Features](#-key-features)
- [Requirements](#-requirements)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
  - [Commands](#commands)
- [Examples](#-examples)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Comparison with Auto-Claude](#-comparison-with-auto-claude)
- [Project Types Supported](#-project-types-supported)
- [Workflow](#-workflow)
- [Safety Features](#-safety-features)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 What is Auto-Cursor?

Auto-Cursor is an autonomous multi-agent coding framework that takes your high-level goals and automatically:

- **Plans** - AI breaks down goals into specific, actionable tasks
- **Executes** - Multiple agents work in parallel with dependency management
- **Validates** - Automatic QA runs after each task completes
- **Integrates** - AI-powered merge resolves conflicts automatically

Think of it as having a team of AI developers working on different parts of your project simultaneously, with automatic quality checks and safe integration.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Autonomous Planning** | AI analyzes your goal and creates a detailed task breakdown |
| 🔀 **Multi-Agent Orchestration** | Multiple agents work in parallel, respecting dependencies |
| 🌳 **Isolated Worktrees** | Each task gets its own git worktree - your main branch stays safe |
| ✅ **Self-Validating QA** | Automatic quality assurance runs after task completion |
| 🤝 **AI-Powered Merge** | Automatic conflict resolution when integrating back to main |
| 🧠 **Memory Layer** | Agents retain insights across sessions for smarter builds |
| 📊 **Kanban Board** | Visual task management from planning through completion |
| 🔍 **Project-Aware** | Detects project structure and adapts planning accordingly |

---

## 📋 Requirements

- **Cursor CLI** - `cursor-agent` must be installed and working
- **Git** - Your project must be initialized as a git repository
- **jq** - For JSON processing: `sudo apt-get install jq` (Linux) or `brew install jq` (Mac)
- **tmux** (optional) - For better agent session management

---

## 🚀 Quick Start

### 1. Install Auto-Cursor

```bash
# Clone the repository
git clone https://github.com/ethanstoner/auto-cursor.git
cd auto-cursor

# Make scripts executable
chmod +x scripts/*.sh

# Add to PATH (optional)
export PATH="$PATH:$(pwd)/scripts"
```

### 2. Initialize a Project

```bash
# Navigate to your project
cd ~/my-project

# Initialize with Auto-Cursor
auto-cursor init ~/my-project my-project-id
```

### 3. Plan a Goal

```bash
# Create a plan for a feature
auto-cursor plan my-project-id "Add user authentication with JWT"
```

This will:
- Analyze your project structure
- Break down the goal into specific tasks
- Identify dependencies between tasks
- Estimate complexity and time

### 4. Start Execution

```bash
# Start all agents working on the plan
auto-cursor start my-project-id
```

This will:
- Create git worktrees for each task
- Start agents in parallel (respecting dependencies)
- Run QA validation automatically
- Update task status in real-time

### 5. Monitor Progress

```bash
# View kanban board
auto-cursor status my-project-id

# Interactive board (auto-refresh)
auto-cursor board my-project-id
```

### 6. Review and Merge

```bash
# Review changes before merging
auto-cursor review my-project-id all

# Merge all completed tasks back to main
auto-cursor merge my-project-id all

# Or merge a specific task
auto-cursor merge my-project-id task-1
```

---

## 📚 Documentation

### Commands

#### Project Management

```bash
# Initialize a new project
auto-cursor init <project-path> [project-id]

# List all projects
auto-cursor list
```

#### Planning & Execution

```bash
# Create a plan for a goal
auto-cursor plan <project-id> <goal>

# Start executing the current plan
auto-cursor start <project-id> [--skip-qa] [--max-iterations N]

# Continue interrupted execution
auto-cursor continue <project-id>
```

#### Monitoring

```bash
# Show kanban board status
auto-cursor status <project-id>

# Interactive kanban board (auto-refresh)
auto-cursor board <project-id>

# List all tasks with details
auto-cursor tasks <project-id>

# Show agent working on task
auto-cursor agent <project-id> <task-id>

# View agent logs
auto-cursor logs <project-id> [task-id|all]
```

#### Review & Integration

```bash
# Review changes in worktree
auto-cursor review <project-id> [task-id|all]

# Show diff before merge
auto-cursor diff <project-id> <task-id>

# Merge worktree back to main
auto-cursor merge <project-id> [task-id|all]

# Discard worktree without merging
auto-cursor discard <project-id> [task-id|all]
```

#### Utilities

```bash
# Retry failed task
auto-cursor retry <project-id> [task-id|all]

# View memory/insights
auto-cursor memory <project-id>

# Clean up worktrees and agents (only project agents)
auto-cursor clean <project-id>
```

---

## 🎯 Examples

### Example 1: Website Development

```bash
# Initialize
auto-cursor init ~/my-website my-website

# Plan
auto-cursor plan my-website "Create a modern landing page with React, Tailwind CSS, and a hero section"

# Start
auto-cursor start my-website

# Monitor
auto-cursor board my-website

# Review and merge
auto-cursor review my-website all
auto-cursor merge my-website all
```

### Example 2: API Development

```bash
# Initialize
auto-cursor init ~/my-api my-api

# Plan
auto-cursor plan my-api "Create REST API with Express.js, MongoDB, and user authentication endpoints"

# Start
auto-cursor start my-api

# Review changes
auto-cursor review my-api all

# Merge
auto-cursor merge my-api all
```

### Example 3: Full-Stack Application

```bash
# Initialize
auto-cursor init ~/my-app my-app

# Plan
auto-cursor plan my-app "Create full-stack todo app with React frontend and Node.js backend"

# Start
auto-cursor start my-app

# Monitor progress
auto-cursor status my-app

# Review and merge
auto-cursor review my-app all
auto-cursor merge my-app all
```

---

## 🏗️ How It Works

### Phase 1: Planning

When you run `auto-cursor plan`, the system:

1. **Analyzes Project Structure** - Detects backend/, frontend/, api/ directories
2. **AI Goal Breakdown** - Uses `cursor-agent` to break down your goal into tasks
3. **Dependency Graph** - Identifies which tasks depend on others
4. **Plan Storage** - Saves plan with task details, dependencies, and estimates

### Phase 2: Execution

When you run `auto-cursor start`:

1. **Worktree Creation** - Each task gets its own isolated git worktree
2. **Agent Orchestration** - Agents start in parallel, respecting dependencies
3. **Background Monitor** - Monitors agent completion automatically
4. **Automatic QA** - QA runs when agents complete (no manual steps needed)

### Phase 3: Integration

When you run `auto-cursor merge`:

1. **Conflict Detection** - Checks for merge conflicts
2. **AI Resolution** - Uses AI to resolve conflicts automatically
3. **Safe Integration** - Merges worktrees back to main branch
4. **Cleanup** - Removes worktrees and branches

---

## 🔧 Architecture

### Components

- **`auto-cursor`** - Main CLI tool for project management
- **`auto-cursor-planner`** - AI-powered task planning
- **`auto-cursor-merge`** - AI-powered merge conflict resolution
- **`orchestrate-agents`** - Multi-agent orchestration framework

### Data Structure

```
~/.auto-cursor/
├── projects/
│   └── <project-id>/
│       ├── config.json      # Project configuration
│       ├── plan.json         # Original plan
│       ├── tasks.json        # Tasks with status
│       ├── memory.json       # Project insights
│       └── orchestration.json # Agent orchestration config
├── worktrees/               # Git worktrees for tasks
└── memory/                  # Global memory/insights
```

---

## 🆚 Comparison with Auto-Claude

Auto-Cursor is inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude) but built for Cursor CLI agents.

### Feature Parity

✅ **All core features implemented:**
- Autonomous task planning
- Multi-agent orchestration
- Isolated git worktrees
- Self-validating QA
- AI-powered merge
- Memory layer
- Kanban board

✅ **All CLI features implemented:**
- Review, discard, continue
- Skip QA, max iterations
- Logs, diff, retry
- Status, board, tasks

### Enhancements

- **Project-Specific Cleanup** - Only stops agents for the specific project
- **Automatic Background Monitor** - QA runs automatically without manual steps
- **Real-Time Status Updates** - Tasks.json updates automatically
- **Project-Aware Planning** - Detects project structure and adapts

---

## 🛠️ Project Types Supported

Auto-Cursor works with **any project type**:

- ✅ **Web Development** (React, Vue, Next.js, static sites)
- ✅ **Backend/API** (Express, FastAPI, Flask, GraphQL)
- ✅ **Full-Stack Applications**
- ✅ **Mobile Development** (React Native, Flutter)
- ✅ **Desktop Applications** (Electron, Tauri)
- ✅ **Data Science / ML** (Python, Jupyter, TensorFlow)
- ✅ **DevOps / Infrastructure** (Docker, Kubernetes, Terraform)
- ✅ **Game Development** (Unity, Godot, Web games)
- ✅ **CLI Tools** (Shell scripts, Python CLI)

The planner automatically detects your project structure and adapts accordingly.

---

## 📖 Workflow

### Complete Workflow

```bash
# 1. Initialize
auto-cursor init ~/my-project my-project

# 2. Plan
auto-cursor plan my-project "Your goal here"

# 3. Start (QA runs automatically)
auto-cursor start my-project

# 4. Monitor (optional - everything happens automatically)
auto-cursor board my-project

# 5. Review
auto-cursor review my-project all

# 6. Merge or discard
auto-cursor merge my-project all
# OR
auto-cursor discard my-project all
```

### What Happens Automatically

When you run `auto-cursor start`:
1. ✅ Agents start in parallel
2. ✅ Background monitor starts automatically
3. ✅ Monitor watches for completion
4. ✅ QA runs automatically when agents finish
5. ✅ Status updates automatically
6. ✅ **Zero manual intervention needed**

---

## 🔒 Safety Features

- **Isolated Worktrees** - Each task works in its own git worktree
- **Project-Specific Cleanup** - Only stops agents for the specific project
- **Safe Parallel Execution** - No conflicts between tasks
- **Automatic QA** - Catches issues before integration
- **AI Conflict Resolution** - Handles merge conflicts automatically

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

- 🐛 [Report a Bug](https://github.com/ethanstoner/auto-cursor/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/ethanstoner/auto-cursor/issues/new?template=feature_request.md)
- 📝 [Submit a Pull Request](https://github.com/ethanstoner/auto-cursor/compare)

---

## 🙏 Acknowledgments

- Inspired by [Auto-Claude](https://github.com/AndyMik90/Auto-Claude)
- Built for [Cursor CLI](https://cursor.sh/) agents

---

## 📧 Contact

- **GitHub**: [@ethanstoner](https://github.com/ethanstoner)
- **Repository**: [auto-cursor](https://github.com/ethanstoner/auto-cursor)

---

<div align="center">

**Made with ❤️ for autonomous software development**

[⭐ Star on GitHub](https://github.com/ethanstoner/auto-cursor) • [📖 Documentation](#documentation) • [🚀 Quick Start](#-quick-start)

</div>
