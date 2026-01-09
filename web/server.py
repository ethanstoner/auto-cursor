#!/usr/bin/env python3
"""
Auto-Cursor Web Interface Server
Provides a web-based UI similar to Auto-Claude's desktop interface
"""

import os
import sys
import json
import subprocess
import threading
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from flask import Flask, render_template, jsonify, request
    from flask_cors import CORS
except ImportError:
    print("Error: Flask not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "flask", "flask-cors"])
    from flask import Flask, render_template, jsonify, request
    from flask_cors import CORS

from datetime import datetime

# Default port - uncommon to avoid conflicts
DEFAULT_PORT = 8765

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')
CORS(app)

# Auto-Cursor directories
AUTO_CURSOR_DIR = Path.home() / '.auto-cursor'
PROJECTS_DIR = AUTO_CURSOR_DIR / 'projects'

def get_projects():
    """Get list of all projects"""
    projects = []
    if not PROJECTS_DIR.exists():
        return projects
    
    for project_dir in PROJECTS_DIR.iterdir():
        if project_dir.is_dir():
            config_file = project_dir / 'config.json'
            if config_file.exists():
                try:
                    with open(config_file, 'r') as f:
                        config = json.load(f)
                    projects.append({
                        'id': project_dir.name,
                        'path': config.get('path', ''),
                        'created': config.get('created', '')
                    })
                except:
                    pass
    return projects

def get_project_status(project_id):
    """Get status for a specific project"""
    project_dir = PROJECTS_DIR / project_id
    if not project_dir.exists():
        return None
    
    status = {
        'id': project_id,
        'tasks': [],
        'kanban': {
            'pending': [],
            'running': [],
            'qa': [],
            'completed': [],
            'failed': []
        }
    }
    
    # Load tasks
    tasks_file = project_dir / 'tasks.json'
    if tasks_file.exists():
        try:
            with open(tasks_file, 'r') as f:
                tasks = json.load(f)
                status['tasks'] = tasks
                
                # Group by status
                for task in tasks:
                    task_status = task.get('status', 'pending')
                    if task_status in ['completed', 'qa_passed']:
                        status['kanban']['completed'].append(task)
                    elif task_status == 'qa_failed':
                        status['kanban']['failed'].append(task)
                    elif task_status == 'qa_running':
                        status['kanban']['qa'].append(task)
                    elif task_status == 'running':
                        status['kanban']['running'].append(task)
                    else:
                        status['kanban']['pending'].append(task)
        except:
            pass
    
    # Load memory
    memory_file = project_dir / 'memory.json'
    if memory_file.exists():
        try:
            with open(memory_file, 'r') as f:
                status['memory'] = json.load(f)
        except:
            pass
    
    return status

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/projects', methods=['GET'])
def api_projects():
    """Get all projects"""
    return jsonify(get_projects())

@app.route('/api/projects/<project_id>', methods=['GET'])
def api_project(project_id):
    """Get project details"""
    status = get_project_status(project_id)
    if status is None:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(status)

@app.route('/api/projects/<project_id>/status', methods=['GET'])
def api_project_status(project_id):
    """Get project status (for polling)"""
    status = get_project_status(project_id)
    if status is None:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(status)

@app.route('/api/projects/<project_id>/plan', methods=['POST'])
def api_create_plan(project_id):
    """Create a plan for a project"""
    data = request.json
    goal = data.get('goal', '')
    if not goal:
        return jsonify({'error': 'Goal required'}), 400
    
    try:
        result = subprocess.run(
            ['auto-cursor', 'plan', project_id, goal],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Plan created'})
        else:
            return jsonify({'error': result.stderr}), 400
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Planning timed out'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>/start', methods=['POST'])
def api_start_project(project_id):
    """Start execution for a project"""
    try:
        result = subprocess.run(
            ['auto-cursor', 'start', project_id],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Execution started'})
        else:
            return jsonify({'error': result.stderr}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>/merge', methods=['POST'])
def api_merge_project(project_id):
    """Merge tasks for a project"""
    data = request.json
    task_id = data.get('task_id', 'all')
    
    try:
        result = subprocess.run(
            ['auto-cursor', 'merge', project_id, task_id],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Merge completed'})
        else:
            return jsonify({'error': result.stderr}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def api_create_project():
    """Create a new project"""
    data = request.json
    project_path = data.get('path', '')
    project_id = data.get('id', '')
    
    if not project_path or not project_id:
        return jsonify({'error': 'Path and ID required'}), 400
    
    try:
        result = subprocess.run(
            ['auto-cursor', 'init', project_path, project_id],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return jsonify({'success': True, 'project': {'id': project_id, 'path': project_path}})
        else:
            return jsonify({'error': result.stderr}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', DEFAULT_PORT))
    print(f"🚀 Auto-Cursor Web Interface starting on http://localhost:{port}")
    print(f"📊 Open your browser to view the kanban board")
    app.run(host='127.0.0.1', port=port, debug=False)
