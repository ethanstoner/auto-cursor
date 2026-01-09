# Auto-Cursor: Improvement Plan (Based on Auto-Claude)

## Overview

This document outlines improvements we can make to Auto-Cursor based on features from Auto-Claude's develop branch. The goal is to make Auto-Cursor more powerful, user-friendly, and feature-complete.

---

## 🔴 High Priority Features (Missing from Auto-Cursor)

### 1. **Interactive Planning Mode**
**Auto-Claude**: `--interactive` flag for spec creation
**Auto-Cursor**: Currently only supports goal-based planning

**Implementation**:
- Add `auto-cursor plan <project-id> --interactive`
- Interactive prompts to refine the goal
- Step-by-step goal refinement with AI assistance
- Preview plan before finalizing

**Benefits**:
- Better planning quality
- User can refine goals iteratively
- More control over task breakdown

---

### 2. **Complexity Override**
**Auto-Claude**: `--complexity simple|standard|complex` flag
**Auto-Cursor**: Complexity is auto-detected, no override

**Implementation**:
- Add `auto-cursor plan <project-id> "goal" --complexity simple`
- Force specific complexity tier regardless of AI assessment
- Useful for testing or when you know the complexity

**Benefits**:
- Faster iteration for simple tasks
- Override AI when it misjudges complexity
- Better control over planning depth

---

### 3. **File-Based Pause/Resume (PAUSE file)**
**Auto-Claude**: Create `PAUSE` file to pause after current session
**Auto-Cursor**: No pause mechanism (only Ctrl+C)

**Implementation**:
- Check for `PAUSE` file in worktree directory
- When detected, pause agent after current iteration
- Agent reads `HUMAN_INPUT.md` if present
- Resume by deleting `PAUSE` file

**Usage**:
```bash
# Pause after current iteration
touch .auto-cursor/worktrees/auto-cursor-project-task/PAUSE

# Add instructions
echo "Focus on fixing the login bug first" > .auto-cursor/worktrees/auto-cursor-project-task/HUMAN_INPUT.md

# Resume
rm .auto-cursor/worktrees/auto-cursor-project-task/PAUSE
```

**Benefits**:
- Non-destructive pause (doesn't kill agent)
- Can add instructions while agent is running
- Better for long-running tasks

---

### 4. **Human Input File (HUMAN_INPUT.md)**
**Auto-Claude**: Agent reads `HUMAN_INPUT.md` for instructions
**Auto-Cursor**: No way to inject instructions mid-execution

**Implementation**:
- Agent checks for `HUMAN_INPUT.md` in worktree directory
- Reads and incorporates instructions into next iteration
- Clear file after reading (or keep for reference)
- Works with PAUSE file for better control

**Usage**:
```bash
# Add instructions
echo "Focus on fixing the login bug first" > .auto-cursor/worktrees/auto-cursor-project-task/HUMAN_INPUT.md

# Agent will read and incorporate in next iteration
```

**Benefits**:
- Inject guidance without stopping agent
- Course correction during execution
- Better collaboration between human and AI

---

### 5. **Plan/Spec Validation**
**Auto-Claude**: `validate_spec.py --spec-dir` with checkpoints
**Auto-Cursor**: No validation of generated plans

**Implementation**:
- Add `auto-cursor validate <project-id>`
- Validate plan structure, dependencies, completeness
- Check for circular dependencies
- Validate task descriptions and complexity assignments
- Auto-fix common issues

**Usage**:
```bash
# Validate plan
auto-cursor validate my-project

# Validate and auto-fix
auto-cursor validate my-project --auto-fix
```

**Benefits**:
- Catch planning errors early
- Ensure plans are valid before execution
- Better reliability

---

### 6. **Plan Review & Editing**
**Auto-Claude**: Can review and edit specs before execution
**Auto-Cursor**: Plan is generated and immediately used

**Implementation**:
- Add `auto-cursor plan-review <project-id>` - Show generated plan
- Add `auto-cursor plan-edit <project-id>` - Interactive editing
- Add `auto-cursor task-add <project-id> <description>` - Add custom task
- Add `auto-cursor task-remove <project-id> <task-id>` - Remove task
- Add `auto-cursor task-modify <project-id> <task-id>` - Modify task

**Usage**:
```bash
# Review plan
auto-cursor plan-review my-project

# Edit plan interactively
auto-cursor plan-edit my-project

# Add custom task
auto-cursor task-add my-project "Add unit tests for auth module"

# Remove task
auto-cursor task-remove my-project analyze-codebase
```

**Benefits**:
- User control over planning
- Add domain knowledge
- Remove unnecessary tasks
- Better planning quality

---

### 7. **Enhanced Progress Tracking**
**Auto-Claude**: Detailed progress with time estimates, ETA
**Auto-Cursor**: Basic progress (X/Y tasks completed)

**Implementation**:
- Show estimated vs actual time per task
- Calculate ETA based on remaining tasks
- Progress percentage with visual bar
- Resource usage tracking (optional)

**Usage**:
```bash
# Enhanced status with time estimates
auto-cursor status my-project --detailed

# Progress bar
auto-cursor progress my-project
```

**Benefits**:
- Better visibility into progress
- Time management
- Set expectations

---

### 8. **Memory Layer Integration in Planning**
**Auto-Claude**: Uses Graphiti memory layer for better planning
**Auto-Cursor**: Memory layer exists but not used in planning

**Implementation**:
- Use memory to inform planning prompts
- Learn from past successful plans
- Remember common patterns
- Avoid repeating mistakes
- Suggest optimizations based on history

**Benefits**:
- Smarter planning over time
- Better task breakdowns
- Avoid known pitfalls

---

## 🟡 Medium Priority Features

### 9. **Spec/Plan Phases (Like Auto-Claude)**
**Auto-Claude**: Multi-phase spec creation (discovery, requirements, context, spec, planning, validation)
**Auto-Cursor**: Single-step planning

**Implementation**:
- Break planning into phases:
  - Discovery: Analyze project structure
  - Requirements: Gather requirements from goal
  - Context: Understand codebase context
  - Planning: Generate task breakdown
  - Validation: Validate plan
- Complexity-based phase selection (simple = 3 phases, complex = 8 phases)

**Benefits**:
- Better planning quality
- More thorough analysis
- Adapts to complexity

---

### 10. **Recovery & Retry Enhancements**
**Auto-Claude**: Smart recovery from interruptions
**Auto-Cursor**: Basic retry (reset to pending)

**Implementation**:
- Track retry count and reason
- Automatic retry with backoff for transient failures
- Recovery from partial completion
- Resume from last checkpoint

**Benefits**:
- Better reliability
- Handle interruptions gracefully
- Reduce manual intervention

---

### 11. **Task Cancellation & Pause**
**Auto-Claude**: Can pause/cancel specific tasks
**Auto-Cursor**: Can only stop all agents

**Implementation**:
- Add `auto-cursor pause <project-id> <task-id>`
- Add `auto-cursor cancel <project-id> <task-id>`
- Pause specific task without affecting others
- Cancel and mark as failed

**Usage**:
```bash
# Pause specific task
auto-cursor pause my-project task-1

# Cancel specific task
auto-cursor cancel my-project task-1
```

**Benefits**:
- Fine-grained control
- Don't stop all work for one issue
- Better resource management

---

### 12. **Better Error Messages & Debugging**
**Auto-Claude**: Detailed error messages with context
**Auto-Cursor**: Basic error messages

**Implementation**:
- More descriptive error messages
- Stack traces for debugging
- Context about what failed and why
- Suggestions for fixing issues

**Benefits**:
- Easier troubleshooting
- Faster issue resolution
- Better user experience

---

## 🟢 Nice-to-Have Features

### 13. **GitHub/GitLab Integration**
**Auto-Claude**: Import issues, create PRs, investigate with AI
**Auto-Cursor**: No integration

**Implementation**:
- Import GitHub issues as goals
- Create PRs from completed worktrees
- AI-powered issue investigation
- Sync with project management tools

**Benefits**:
- Workflow integration
- Better project management
- Automated PR creation

---

### 14. **Linear Integration**
**Auto-Claude**: Sync tasks with Linear
**Auto-Cursor**: No integration

**Implementation**:
- Sync Auto-Cursor tasks with Linear
- Update Linear when tasks complete
- Import Linear tasks as goals

**Benefits**:
- Team collaboration
- Project management integration
- Better tracking

---

### 15. **Desktop UI (Like Auto-Claude)**
**Auto-Claude**: Electron desktop app with Kanban board
**Auto-Cursor**: CLI only

**Implementation**:
- Electron-based desktop app
- Visual Kanban board
- Agent terminal views
- Progress visualization
- Better UX for non-CLI users

**Benefits**:
- Better UX
- Visual progress tracking
- Easier for non-technical users

---

## 📋 Implementation Priority

### Phase 1: Core Features (High Priority)
1. ✅ Interactive Planning Mode
2. ✅ Complexity Override
3. ✅ File-Based Pause/Resume (PAUSE file)
4. ✅ Human Input File (HUMAN_INPUT.md)
5. ✅ Plan/Spec Validation

### Phase 2: Planning Enhancements
6. ✅ Plan Review & Editing
7. ✅ Memory Layer Integration in Planning
8. ✅ Spec/Plan Phases

### Phase 3: Control & Reliability
9. ✅ Enhanced Progress Tracking
10. ✅ Recovery & Retry Enhancements
11. ✅ Task Cancellation & Pause
12. ✅ Better Error Messages & Debugging

### Phase 4: Integrations (Future)
13. GitHub/GitLab Integration
14. Linear Integration
15. Desktop UI

---

## 🎯 Quick Wins (Easy to Implement)

1. **Complexity Override** - Simple flag addition
2. **PAUSE file** - File existence check in agent loop
3. **HUMAN_INPUT.md** - File read in agent prompt
4. **Plan Validation** - JSON schema validation + dependency check
5. **Enhanced Progress** - Time tracking in tasks.json

---

## 📝 Notes

- Auto-Cursor already has many features from Auto-Claude (review, discard, continue, skip-qa)
- Focus on missing high-priority features first
- Some features (Desktop UI, GitHub integration) are large projects - consider them separately
- Memory layer exists but needs integration into planning
- Most features can be implemented incrementally

---

## 🚀 Next Steps

1. **Review this plan** - Prioritize features
2. **Start with Quick Wins** - Complexity override, PAUSE file, HUMAN_INPUT.md
3. **Implement Phase 1** - Core high-priority features
4. **Test thoroughly** - Ensure features work well together
5. **Iterate** - Add Phase 2 and 3 features based on feedback

---

## 📚 Reference

- Auto-Claude Repository: https://github.com/AndyMik90/Auto-Claude/tree/develop
- Auto-Claude CLI Docs: `/tmp/auto-claude-develop/guides/CLI-USAGE.md`
- Auto-Cursor Current Features: `/home/ethan/AUTO_CURSOR_CLI_FEATURES.md`
