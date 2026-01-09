# Auto-Cursor Web Interface

Web-based UI for Auto-Cursor, similar to Auto-Claude's desktop interface.

## Features

- **Kanban Board** - Visual task management
- **Project Management** - Create and manage projects
- **Real-time Updates** - Auto-refresh every 3 seconds
- **Memory Viewer** - View project insights and patterns
- **Plan Creation** - Create plans from the web interface

## Quick Start

### Option 1: Using auto-cursor command

```bash
# Start web interface (default port 8765)
auto-cursor web

# Or specify a custom port
auto-cursor web 9000
```

### Option 2: Direct Python

```bash
cd web
pip3 install -r requirements.txt
python3 server.py
```

## Access

Once started, open your browser to:
- **Default**: http://localhost:8765
- **Custom port**: http://localhost:<port>

## Port

Default port is **8765** (uncommon to avoid conflicts). You can change it:
- Via command: `auto-cursor web <port>`
- Via environment: `PORT=9000 auto-cursor web`

## Features

### Projects Tab
- View all projects
- Create new projects
- Quick actions (Create Plan, Start, View Board)

### Kanban Board Tab
- Visual task management
- Real-time status updates
- Task cards with details
- Auto-refresh every 3 seconds

### Memory Tab
- View project memory
- Successful patterns
- Project type and tech stack
- Build statistics

## API Endpoints

- `GET /api/projects` - List all projects
- `GET /api/projects/<id>` - Get project details
- `GET /api/projects/<id>/status` - Get project status
- `POST /api/projects` - Create new project
- `POST /api/projects/<id>/plan` - Create plan
- `POST /api/projects/<id>/start` - Start execution
- `POST /api/projects/<id>/merge` - Merge tasks

## Development

The web interface uses:
- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript
- **Styling**: Custom CSS

To modify:
- Templates: `web/templates/index.html`
- Styles: `web/static/css/style.css`
- JavaScript: `web/static/js/app.js`
- Server: `web/server.py`
