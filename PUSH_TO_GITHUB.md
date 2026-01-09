# Push Auto-Cursor to GitHub

## Repository is Ready

All files are prepared in `/tmp/auto-cursor-repo`

## Option 1: Create Repository via GitHub Web UI

1. Go to https://github.com/new
2. Repository name: `auto-cursor`
3. Description: `Autonomous Multi-Agent Coding Framework for Cursor CLI`
4. Visibility: **Public**
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

Then push:
```bash
cd /tmp/auto-cursor-repo
git remote add origin https://github.com/ethanstoner/auto-cursor.git
git push -u origin main
```

## Option 2: Use GitHub CLI (if installed)

```bash
cd /tmp/auto-cursor-repo
gh repo create auto-cursor --public --description "Autonomous Multi-Agent Coding Framework for Cursor CLI" --source=. --remote=origin --push
```

## Option 3: Create with New Token

If the token is expired, create a new one:
1. Go to https://github.com/settings/tokens
2. Generate new token (classic) with `repo` scope
3. Use it in the commands below

```bash
cd /tmp/auto-cursor-repo

# Create repo
curl -X POST -H "Authorization: token YOUR_NEW_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{"name":"auto-cursor","description":"Autonomous Multi-Agent Coding Framework for Cursor CLI","private":false}'

# Push
git remote add origin https://YOUR_TOKEN@github.com/ethanstoner/auto-cursor.git
git push -u origin main
```

## What's Included

✅ README.md (with logo reference)
✅ All scripts (auto-cursor, auto-cursor-planner, etc.)
✅ Documentation (INSTALL.md, LICENSE)
✅ Logo (logo.png if available)
✅ All docs in docs/ folder

## After Pushing

The repository will be available at:
**https://github.com/ethanstoner/auto-cursor**
