# Installation Guide

## Quick Install

```bash
# Clone the repository
git clone https://github.com/ethanstoner/auto-cursor.git
cd auto-cursor

# Make scripts executable
chmod +x bin/*

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(pwd)/bin"
```

## System Requirements

- **Cursor CLI** - `cursor-agent` must be installed and working
- **Git** - Version control system
- **jq** - JSON processor
  - Linux: `sudo apt-get install jq`
  - Mac: `brew install jq`
  - Windows (WSL): `sudo apt-get install jq`
- **tmux** (optional) - For better agent session management
  - Linux: `sudo apt-get install tmux`
  - Mac: `brew install tmux`

## Verify Installation

```bash
# Check if scripts are executable
ls -la bin/

# Test auto-cursor
auto-cursor --help

# Test planner
auto-cursor-planner "Test" .

# Test orchestrate-agents
orchestrate-agents --help
```

## Troubleshooting

### Scripts not found

If `auto-cursor` command is not found:

```bash
# Add to PATH permanently
echo 'export PATH="$PATH:/path/to/auto-cursor/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Permission denied

```bash
# Make scripts executable
chmod +x bin/*
```

### jq not found

```bash
# Install jq
sudo apt-get install jq  # Linux/WSL
brew install jq          # Mac
```
