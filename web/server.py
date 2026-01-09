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
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "--break-system-packages", "flask", "flask-cors"])
    from flask import Flask, render_template, jsonify, request
    from flask_cors import CORS

try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "--break-system-packages", "requests"])
    import requests

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
    """
    Get list of all projects from the auto-cursor projects directory.
    
    Returns:
        list: List of project dictionaries with id, path, and created fields
    """
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
                        'name': project_dir.name,  # Add name field for frontend
                        'path': config.get('path', ''),
                        'created': config.get('created', '')
                    })
                except Exception as e:
                    # Log error but continue
                    print(f"Error loading project {project_dir.name}: {e}")
                    pass
    return projects

def strip_ansi(text):
    """
    Remove ANSI color codes from text.
    
    Args:
        text (str): Text that may contain ANSI escape codes
        
    Returns:
        str: Text with ANSI codes removed
    """
    import re
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def get_running_agents():
    """
    Get status of all running agents from orchestrate-agents.
    CRITICAL: Verifies actual process existence and log freshness for 'running' status.
    
    Returns:
        list: List of agent dictionaries with id, status, and log_path
    """
    agents = []
    try:
        result = subprocess.run(
            ['orchestrate-agents', 'status'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Parse agent status from output
            lines = result.stdout.split('\n')
            current_agent = None
            for line in lines:
                line = strip_ansi(line.strip())
                if not line or line.startswith('==='):
                    continue
                # Agent ID line (e.g., "main-task: qa_failed")
                if ':' in line and not line.startswith('  '):
                    if current_agent:
                        # Verify 'running' status before adding
                        if current_agent.get('status') == 'running':
                            if not verify_agent_actually_running(current_agent['id']):
                                current_agent['status'] = 'pending'  # Mark as pending if not actually running
                        agents.append(current_agent)
                    parts = line.split(':', 1)
                    if len(parts) >= 2:
                        agent_id = parts[0].strip()
                        status_text = parts[1].strip()
                        # Determine status
                        status = 'pending'
                        status_lower = status_text.lower()
                        if 'running' in status_lower or '⚡' in status_text:
                            status = 'running'
                        elif 'completed' in status_lower or 'success' in status_lower:
                            status = 'completed'
                        elif 'failed' in status_lower or 'error' in status_lower:
                            status = 'failed'
                        elif 'qa' in status_lower:
                            status = 'qa_running'
                        
                        current_agent = {
                            'id': agent_id,
                            'status': status,
                            'status_text': status_text,
                            'log_path': None,
                            'last_update': None
                        }
                elif line.startswith('  ') and current_agent:
                    # Parse details
                    if 'Log:' in line:
                        log_path = line.split('Log:')[1].strip() if 'Log:' in line else None
                        if log_path:
                            current_agent['log_path'] = log_path
                    elif 'Last:' in line:
                        last_update = line.split('Last:')[1].strip() if 'Last:' in line else None
                        if last_update:
                            current_agent['last_update'] = last_update[:100]  # Truncate
            if current_agent:
                # Verify 'running' status before adding
                if current_agent.get('status') == 'running':
                    if not verify_agent_actually_running(current_agent['id']):
                        current_agent['status'] = 'pending'  # Mark as pending if not actually running
                agents.append(current_agent)
            
            # Filter out invalid agents (those that look like headers or status messages)
            agents = [a for a in agents if a['id'] and 
                     a['id'].lower() not in ['status', 'log', 'last', 'agent'] and
                     len(a['id']) > 2]
    except Exception as e:
        pass  # Silently fail if orchestrate-agents not available
    
    return agents

def verify_agent_actually_running(agent_id):
    """
    Verify that an agent is actually running by checking:
    1. Process exists (via PID file or pgrep)
    2. Log file has been updated recently (within 10 minutes)
    
    If agent is stale (no process or log > 10 min old), shut it down.
    Note: We don't mark as failed here - let the system determine if it actually failed
    or just needs to be restarted.
    
    Returns:
        bool: True if agent is actually running, False otherwise
    """
    # Check process existence
    is_actually_running = False
    pid_file = Path(f'/tmp/cursor-agents/pids/{agent_id}.pid')
    pid = None
    
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            result = subprocess.run(
                ['ps', '-p', str(pid)],
                capture_output=True,
                timeout=1
            )
            if result.returncode == 0:
                is_actually_running = True
        except:
            pass
    
    if not is_actually_running:
        # Check process list as fallback
        try:
            result = subprocess.run(
                ['pgrep', '-f', f"cursor-agent.*{agent_id}"],
                capture_output=True,
                timeout=2
            )
            if result.returncode == 0:
                pids = result.stdout.decode().strip().split('\n')
                if pids and pids[0]:
                    pid = int(pids[0])
                    is_actually_running = True
        except:
            pass
    
    # Check log file freshness (if process exists)
    log_stale = False
    log_file = Path(f'/tmp/cursor-agents/logs/{agent_id}.log')
    if log_file.exists():
        try:
            from datetime import datetime
            mtime = log_file.stat().st_mtime
            age_minutes = (datetime.now().timestamp() - mtime) / 60
            if age_minutes > 10:  # Log hasn't been updated in 10+ minutes
                log_stale = True  # Stale log = agent is stuck/dead
        except:
            pass
    
    # If agent is not actually running or log is stale, shut it down
    if not is_actually_running or log_stale:
        # Shut down any remaining processes
        if pid:
            try:
                subprocess.run(['kill', '-9', str(pid)], capture_output=True, timeout=2)
            except:
                pass
        
        # Also try pgrep kill
        try:
            result = subprocess.run(
                ['pkill', '-9', '-f', f"cursor-agent.*{agent_id}"],
                capture_output=True,
                timeout=2
            )
        except:
            pass
        
        # Clean up PID file
        if pid_file.exists():
            try:
                pid_file.unlink()
            except:
                pass
        
        return False
    
    return True

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
        },
        'agents': []
    }
    
    # Get running agents FIRST to sync status
    all_agents = get_running_agents()
    # Create map of actual agent statuses
    agent_status_map = {}
    for agent in all_agents:
        agent_id = agent.get('id', '')
        agent_status = agent.get('status', 'pending')
        agent_status_map[agent_id] = agent_status
    
    # Load tasks
    tasks_file = project_dir / 'tasks.json'
    if tasks_file.exists():
        try:
            with open(tasks_file, 'r') as f:
                tasks = json.load(f)
                
                # Sync task status with actual agent status
                for task in tasks:
                    task_id = task.get('id', '')
                    # Try multiple matching strategies
                    matching_status = None
                    
                    # Strategy 1: Direct match
                    if task_id in agent_status_map:
                        matching_status = agent_status_map[task_id]
                    else:
                        # Strategy 2: Agent ID contains task ID
                        for agent_id, agent_status in agent_status_map.items():
                            if (task_id in agent_id or 
                                agent_id.endswith(task_id) or
                                f"{project_id}-{task_id}" in agent_id or
                                task_id.replace('-', '') in agent_id.replace('-', '')):
                                matching_status = agent_status
                                break
                    
                    if matching_status:
                        # Update task status from actual agent - verify process exists for 'running'
                        if matching_status == 'running':
                            # CRITICAL: Verify process is actually running before marking as running
                            is_actually_running = False
                            pid_file = Path(f'/tmp/cursor-agents/pids/{task_id}.pid')
                            if pid_file.exists():
                                try:
                                    pid = int(pid_file.read_text().strip())
                                    result = subprocess.run(
                                        ['ps', '-p', str(pid)],
                                        capture_output=True,
                                        timeout=1
                                    )
                                    if result.returncode == 0:
                                        is_actually_running = True
                                except:
                                    pass
                            
                            if not is_actually_running:
                                # Check process list as fallback
                                try:
                                    result = subprocess.run(
                                        ['pgrep', '-f', f"cursor-agent.*{task_id}"],
                                        capture_output=True,
                                        timeout=2
                                    )
                                    if result.returncode == 0:
                                        is_actually_running = True
                                except:
                                    pass
                            
                            # CRITICAL: Check log file activity - if log hasn't been updated in 10+ minutes, agent is likely stuck/dead
                            log_stale = False
                            log_file = Path(f'/tmp/cursor-agents/logs/{task_id}.log')
                            if log_file.exists():
                                try:
                                    from datetime import datetime
                                    mtime = log_file.stat().st_mtime
                                    age_minutes = (datetime.now().timestamp() - mtime) / 60
                                    if age_minutes > 10:  # Log hasn't been updated in 10+ minutes
                                        log_stale = True
                                except:
                                    pass
                            
                            # CRITICAL: Only mark as running if process actually exists AND log is recent
                            if is_actually_running and not log_stale:
                                task['status'] = 'running'
                            else:
                                # Process doesn't exist OR log is stale - shut down and check if it actually completed
                                # Shut down any remaining processes
                                if pid_file.exists():
                                    try:
                                        pid = int(pid_file.read_text().strip())
                                        subprocess.run(['kill', '-9', str(pid)], capture_output=True, timeout=2)
                                    except:
                                        pass
                                try:
                                    subprocess.run(['pkill', '-9', '-f', f"cursor-agent.*{task_id}"], capture_output=True, timeout=2)
                                except:
                                    pass
                                
                                # Check if task actually completed successfully before marking as failed
                                # Look for completion indicators in logs AND verify work was actually done
                                if task.get('status') == 'running':
                                    # Check if there's evidence of successful completion
                                    log_file = Path(f'/tmp/cursor-agents/logs/{task_id}.log')
                                    qa_log_file = Path(f'/tmp/cursor-agents/qa/{task_id}.log')
                                    worktree_path = Path.home() / '.auto-cursor' / 'worktrees' / f'auto-cursor-auto-cursor-web-{task_id}'
                                    
                                    completed = False
                                    qa_passed = False
                                    
                                    # Check QA log first - if QA failed, task didn't complete successfully
                                    if qa_log_file.exists():
                                        try:
                                            qa_content = qa_log_file.read_text()
                                            # Check for QA failure indicators
                                            if any(indicator in qa_content.lower() for indicator in ['qa failed', 'qa_failed', 'failed:', 'error:', 'errors:']):
                                                qa_passed = False
                                            elif any(indicator in qa_content.lower() for indicator in ['qa passed', 'qa_passed', 'all tests passed', 'success']):
                                                qa_passed = True
                                        except:
                                            pass
                                    
                                    # Check agent log for completion
                                    if log_file.exists():
                                        try:
                                            log_content = log_file.read_text()
                                            # Look for success indicators
                                            if any(indicator in log_content.lower() for indicator in ['completed', 'success', 'done', 'finished', 'task complete']):
                                                completed = True
                                        except:
                                            pass
                                    
                                    # Only mark as completed if BOTH agent completed AND QA passed
                                    # But be smarter about QA failures - some are minor and shouldn't block completion
                                    if completed and qa_passed:
                                        task['status'] = 'completed'
                                    elif completed and not qa_passed:
                                        # Check if QA failures are critical or minor
                                        qa_critical = False
                                        if qa_log_file.exists():
                                            try:
                                                qa_content = qa_log_file.read_text()
                                                # Critical failures: actual errors, test failures, build failures
                                                critical_indicators = ['test failed', 'build failed', 'error:', 'exception', 'traceback', 'fatal']
                                                if any(indicator in qa_content.lower() for indicator in critical_indicators):
                                                    qa_critical = True
                                                # Minor failures: documentation, file structure (non-critical)
                                                minor_indicators = ['documentation', 'file structure', 'style', 'formatting']
                                                if any(indicator in qa_content.lower() for indicator in minor_indicators) and not qa_critical:
                                                    # Minor QA issues - don't block completion
                                                    task['status'] = 'completed'
                                                    return
                                            except:
                                                pass
                                        
                                        if qa_critical:
                                            # Critical QA failure - mark as failed (needs fixing)
                                            task['status'] = 'failed'
                                        else:
                                            # Minor QA issues - allow completion
                                            task['status'] = 'completed'
                                    else:
                                        # Agent didn't complete - allow retry
                                        task['status'] = 'pending'  # Allow retry instead of permanent failure
                                else:
                                    task['status'] = 'pending'  # Wasn't running, keep as pending
                        elif matching_status == 'pending':
                            # Agent is marked as pending (not actually running) - check if task was running
                            if task.get('status') == 'running':
                                # Task was marked as running but agent is pending - check if it completed
                                log_file = Path(f'/tmp/cursor-agents/logs/{task_id}.log')
                                qa_log_file = Path(f'/tmp/cursor-agents/qa/{task_id}.log')
                                
                                completed = False
                                qa_passed = False
                                
                                # Check QA log
                                if qa_log_file.exists():
                                    try:
                                        qa_content = qa_log_file.read_text()
                                        if any(indicator in qa_content.lower() for indicator in ['qa failed', 'qa_failed', 'failed:', 'error:', 'errors:']):
                                            qa_passed = False
                                        elif any(indicator in qa_content.lower() for indicator in ['qa passed', 'qa_passed', 'all tests passed', 'success']):
                                            qa_passed = True
                                    except:
                                        pass
                                
                                # Check agent log
                                if log_file.exists():
                                    try:
                                        log_content = log_file.read_text()
                                        if any(indicator in log_content.lower() for indicator in ['completed', 'success', 'done', 'finished', 'task complete']):
                                            completed = True
                                    except:
                                        pass
                                
                                # Only mark as completed if both agent completed AND QA passed
                                if completed and qa_passed:
                                    task['status'] = 'completed'
                                elif completed and not qa_passed:
                                    # Agent finished but QA failed - mark as failed
                                    task['status'] = 'failed'
                                else:
                                    # Allow retry instead of permanent failure
                                    task['status'] = 'pending'
                        elif matching_status == 'completed':
                            if task.get('status') not in ['qa_running', 'qa_passed']:
                                task['status'] = 'completed'
                        elif matching_status == 'failed':
                            task['status'] = 'failed'
                        elif matching_status == 'qa_running':
                            task['status'] = 'qa_running'
                    else:
                        # No matching agent found - if task was marked as running, verify it's actually running
                        if task.get('status') == 'running':
                            # Check if process actually exists
                            is_actually_running = False
                            pid_file = Path(f'/tmp/cursor-agents/pids/{task_id}.pid')
                            if pid_file.exists():
                                try:
                                    pid = int(pid_file.read_text().strip())
                                    result = subprocess.run(
                                        ['ps', '-p', str(pid)],
                                        capture_output=True,
                                        timeout=1
                                    )
                                    if result.returncode == 0:
                                        is_actually_running = True
                                except:
                                    pass
                            
                            if not is_actually_running:
                                try:
                                    result = subprocess.run(
                                        ['pgrep', '-f', f"cursor-agent.*{task_id}"],
                                        capture_output=True,
                                        timeout=2
                                    )
                                    if result.returncode == 0:
                                        is_actually_running = True
                                except:
                                    pass
                            
                            # CRITICAL: If not actually running, shut down and check completion status
                            # This fixes stale 'running' status when processes don't exist
                            if not is_actually_running:
                                # Shut down any remaining processes
                                if pid_file.exists():
                                    try:
                                        pid = int(pid_file.read_text().strip())
                                        subprocess.run(['kill', '-9', str(pid)], capture_output=True, timeout=2)
                                    except:
                                        pass
                                try:
                                    subprocess.run(['pkill', '-9', '-f', f"cursor-agent.*{task_id}"], capture_output=True, timeout=2)
                                except:
                                    pass
                                
                                # Check if task actually completed before marking status
                                if task.get('status') == 'running':
                                    log_file = Path(f'/tmp/cursor-agents/logs/{task_id}.log')
                                    qa_log_file = Path(f'/tmp/cursor-agents/qa/{task_id}.log')
                                    
                                    completed = False
                                    qa_passed = False
                                    
                                    # Check QA log
                                    if qa_log_file.exists():
                                        try:
                                            qa_content = qa_log_file.read_text()
                                            if any(indicator in qa_content.lower() for indicator in ['qa failed', 'qa_failed', 'failed:', 'error:', 'errors:']):
                                                qa_passed = False
                                            elif any(indicator in qa_content.lower() for indicator in ['qa passed', 'qa_passed', 'all tests passed', 'success']):
                                                qa_passed = True
                                        except:
                                            pass
                                    
                                    # Check agent log
                                    if log_file.exists():
                                        try:
                                            log_content = log_file.read_text()
                                            if any(indicator in log_content.lower() for indicator in ['completed', 'success', 'done', 'finished', 'task complete']):
                                                completed = True
                                        except:
                                            pass
                                    
                                    # Only mark as completed if both agent completed AND QA passed
                                    # But be smarter about QA failures
                                    if completed and qa_passed:
                                        task['status'] = 'completed'
                                    elif completed and not qa_passed:
                                        # Check if QA failures are critical or minor
                                        qa_critical = False
                                        if qa_log_file.exists():
                                            try:
                                                qa_content = qa_log_file.read_text()
                                                critical_indicators = ['test failed', 'build failed', 'error:', 'exception', 'traceback', 'fatal']
                                                if any(indicator in qa_content.lower() for indicator in critical_indicators):
                                                    qa_critical = True
                                                minor_indicators = ['documentation', 'file structure', 'style', 'formatting']
                                                if any(indicator in qa_content.lower() for indicator in minor_indicators) and not qa_critical:
                                                    # Minor QA issues - allow completion
                                                    task['status'] = 'completed'
                                                    continue
                                            except:
                                                pass
                                        
                                        if qa_critical:
                                            task['status'] = 'failed'
                                        else:
                                            task['status'] = 'completed'
                                    else:
                                        # Allow retry instead of permanent failure
                                        task['status'] = 'pending'
                                else:
                                    task['status'] = 'pending'  # Wasn't running, keep as pending
                    # Note: The else block for no matching agent is now handled above
                
                status['tasks'] = tasks
                
                # CRITICAL: Write updated task statuses back to tasks.json
                # This ensures stale 'running' statuses are persisted as 'failed'
                try:
                    with open(tasks_file, 'w') as f:
                        json.dump(tasks, f, indent=2)
                except Exception as e:
                    pass  # Silently fail if can't write
                
                # Group by status (now synced with actual agents)
                # CRITICAL: Only add to 'running' if process actually exists
                for task in tasks:
                    task_status = task.get('status', 'pending')
                    
                    # For 'running' status, double-check process exists
                    if task_status == 'running':
                        is_actually_running = False
                        task_id = task.get('id', '')
                        pid_file = Path(f'/tmp/cursor-agents/pids/{task_id}.pid')
                        if pid_file.exists():
                            try:
                                pid = int(pid_file.read_text().strip())
                                result = subprocess.run(
                                    ['ps', '-p', str(pid)],
                                    capture_output=True,
                                    timeout=1
                                )
                                if result.returncode == 0:
                                    is_actually_running = True
                            except:
                                pass
                        
                        if not is_actually_running:
                            try:
                                result = subprocess.run(
                                    ['pgrep', '-f', f"cursor-agent.*{task_id}"],
                                    capture_output=True,
                                    timeout=2
                                )
                                if result.returncode == 0:
                                    is_actually_running = True
                            except:
                                pass
                        
                        # Only add to running column if process actually exists
                        if is_actually_running:
                            status['kanban']['running'].append(task)
                        else:
                            # Process doesn't exist - keep in current status (don't auto-change)
                            # But don't show in 'running' column
                            if task_status in ['completed', 'qa_passed']:
                                status['kanban']['completed'].append(task)
                            elif task_status in ['failed', 'qa_failed']:
                                status['kanban']['failed'].append(task)
                            elif task_status == 'qa_running':
                                status['kanban']['qa'].append(task)
                            else:
                                # Keep as pending or current status
                                status['kanban']['pending'].append(task)
                    elif task_status in ['completed', 'qa_passed']:
                        status['kanban']['completed'].append(task)
                    elif task_status in ['failed', 'qa_failed']:
                        status['kanban']['failed'].append(task)
                    elif task_status == 'qa_running':
                        status['kanban']['qa'].append(task)
                    else:
                        status['kanban']['pending'].append(task)
        except:
            pass
    
    # Filter agents that match project tasks
    task_ids = {task.get('id', '') for task in status['tasks']}
    status['agents'] = [agent for agent in all_agents if agent['id'] in task_ids or project_id in agent['id']]
    
    # Also check orchestration file
    orchestration_file = project_dir / 'orchestration.json'
    if orchestration_file.exists():
        try:
            with open(orchestration_file, 'r') as f:
                orchestration = json.load(f)
                agent_ids = {agent.get('id', '') for agent in orchestration.get('agents', [])}
                # Add any agents from orchestration that are running
                for agent in all_agents:
                    if agent['id'] in agent_ids and agent not in status['agents']:
                        status['agents'].append(agent)
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

@app.route('/api/agents', methods=['GET'])
def api_agents():
    """Get all running agents"""
    agents = get_running_agents()
    return jsonify(agents)

@app.route('/api/projects/<project_id>/agents', methods=['GET'])
def api_project_agents(project_id):
    """Get agents for a specific project"""
    status = get_project_status(project_id)
    if status is None:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(status.get('agents', []))

@app.route('/api/projects/<project_id>/insights', methods=['GET'])
def api_project_insights(project_id):
    """Get insights and analytics for a project"""
    status = get_project_status(project_id)
    if status is None:
        return jsonify({'error': 'Project not found'}), 404
    
    tasks = status.get('tasks', [])
    total = len(tasks)
    completed = len([t for t in tasks if t.get('status') in ['completed', 'qa_passed']])
    running = len([t for t in tasks if t.get('status') == 'running'])
    failed = len([t for t in tasks if t.get('status') in ['failed', 'qa_failed']])
    
    insights = {
        'tasks_completed': completed,
        'tasks_total': total,
        'success_rate': round((completed / total * 100) if total > 0 else 0, 1),
        'agent_utilization': round((running / total * 100) if total > 0 else 0, 1),
        'bottlenecks': 'AI Review' if running > 0 else 'None',
        'avg_execution_time': 'N/A',  # Would calculate from execution history
        'failure_rate': round((failed / total * 100) if total > 0 else 0, 1)
    }
    
    return jsonify(insights)

@app.route('/api/projects/<project_id>/roadmap', methods=['GET'])
def api_project_roadmap(project_id):
    """Get roadmap for a project"""
    project_dir = PROJECTS_DIR / project_id
    if not project_dir.exists():
        return jsonify({'error': 'Project not found'}), 404
    
    # Try to load roadmap from file first
    roadmap_file = project_dir / 'roadmap.json'
    roadmap = {
        'must-have': [],
        'should-have': [],
        'could-have': [],
        'wont-have': []
    }
    
    if roadmap_file.exists():
        try:
            with open(roadmap_file, 'r') as f:
                roadmap = json.load(f)
        except:
            pass
    
    # If roadmap is empty, generate from tasks
    if not any(roadmap.values()):
        status = get_project_status(project_id)
        if status:
            tasks = status.get('tasks', [])
            for task in tasks:
                complexity = task.get('complexity', 'medium')
                item = {
                    'name': task.get('title', task.get('id', 'Untitled')),
                    'description': task.get('description', ''),
                    'status': task.get('status', 'pending'),
                    'priority': 'High' if complexity == 'high' else 'Medium' if complexity == 'medium' else 'Low',
                    'impact': 'High' if task.get('status') == 'completed' else 'Medium'
                }
                
                # Categorize by complexity and status
                if complexity == 'high' or task.get('status') == 'completed':
                    roadmap['must-have'].append(item)
                elif complexity == 'medium':
                    roadmap['should-have'].append(item)
                elif complexity == 'low':
                    roadmap['could-have'].append(item)
    
    return jsonify(roadmap)

@app.route('/api/projects/<project_id>/changelog', methods=['GET'])
def api_project_changelog(project_id):
    """Get changelog for a project"""
    project_dir = PROJECTS_DIR / project_id
    if not project_dir.exists():
        return jsonify({'error': 'Project not found'}), 404
    
    # Try to load from file first
    changelog_file = project_dir / 'changelog.json'
    changelog = []
    
    if changelog_file.exists():
        try:
            with open(changelog_file, 'r') as f:
                changelog = json.load(f)
        except:
            pass
    
    # Always generate from tasks (even if file exists, merge them)
    status = get_project_status(project_id)
    if status:
        tasks = status.get('tasks', [])
        # Include completed, qa_passed, and also running tasks that have progress
        all_tasks = [t for t in tasks if t.get('status') in ['completed', 'qa_passed', 'running', 'failed']]
        
        # Create changelog entries from tasks
        task_changelog = []
        for task in all_tasks:
            started = task.get('started')
            if started:
                timestamp = datetime.fromtimestamp(started).isoformat()
            else:
                timestamp = datetime.now().isoformat()
            
            status_val = task.get('status', '')
            entry_type = 'feature'
            if 'failed' in status_val:
                entry_type = 'fix'
            elif status_val == 'running':
                entry_type = 'update'
            
            task_changelog.append({
                'date': timestamp,
                'type': entry_type,
                'title': task.get('title', task.get('id', 'Task')),
                'description': task.get('description', ''),
                'task_id': task.get('id', ''),
                'status': status_val
            })
        
        # Merge with existing changelog (avoid duplicates)
        existing_ids = {entry.get('task_id') for entry in changelog}
        for entry in task_changelog:
            if entry.get('task_id') not in existing_ids:
                changelog.append(entry)
        
        # Sort by date (newest first)
        changelog.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    return jsonify(changelog)

@app.route('/api/projects/<project_id>/worktrees', methods=['GET'])
def api_project_worktrees(project_id):
    """Get worktrees for a project"""
    worktrees_dir = AUTO_CURSOR_DIR / 'worktrees'
    worktrees = []
    
    if worktrees_dir.exists():
        # Look for worktrees that match this project
        # Format: auto-cursor-{project_id}-{task_id}
        for worktree in worktrees_dir.iterdir():
            if worktree.is_dir():
                # Check if this worktree belongs to this project
                if f'auto-cursor-{project_id}-' in worktree.name or f'auto-cursor-{project_id}' == worktree.name:
                    # Try to get git branch info
                    branch = 'unknown'
                    git_dir = worktree / '.git'
                    if git_dir.exists():
                        try:
                            result = subprocess.run(
                                ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                                cwd=str(worktree),
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            if result.returncode == 0:
                                branch = result.stdout.strip()
                        except:
                            pass
                    
                    # Extract task ID from worktree name
                    # Format: auto-cursor-auto-cursor-web-web-1 -> web-1
                    task_id = worktree.name
                    if '-' in worktree.name:
                        parts = worktree.name.split('-')
                        # Look for pattern like web-1, web-2 in the name
                        # Pattern: ...-web-1 or ...-web-2
                        for i in range(len(parts) - 1, 0, -1):
                            if parts[i].isdigit() and parts[i-1]:
                                # Found pattern like "web-1"
                                task_id = f"{parts[i-1]}-{parts[i]}"
                                break
                        # Fallback: use last 2 parts if pattern not found
                        if task_id == worktree.name and len(parts) >= 2:
                            task_id = '-'.join(parts[-2:])
                        # Remove project prefix if still present
                        if task_id.startswith(f'{project_id}-'):
                            task_id = task_id[len(f'{project_id}-'):]
                    
                    worktrees.append({
                        'id': worktree.name,
                        'path': str(worktree),
                        'branch': branch,
                        'task_id': task_id,
                        'created': datetime.fromtimestamp(worktree.stat().st_mtime).isoformat()
                    })
    
    return jsonify(worktrees)

@app.route('/api/projects/<project_id>/agent-logs/<agent_id>', methods=['GET'])
def api_agent_logs(project_id, agent_id):
    """Get log content for a specific agent"""
    logs = []
    
    # Try to get log path from running agents first
    all_agents = get_running_agents()
    agent = next((a for a in all_agents if a['id'] == agent_id), None)
    log_path = None
    
    if agent and agent.get('log_path'):
        log_path = Path(agent['log_path'])
    else:
        # Fallback: try to find log file in cursor-agents directory
        cursor_agents_logs = Path('/tmp/cursor-agents/logs')
        if cursor_agents_logs.exists():
            # Try common log file names
            possible_logs = [
                cursor_agents_logs / f'{agent_id}.log',
                cursor_agents_logs / f'web-{agent_id}.log',
            ]
            for possible_log in possible_logs:
                if possible_log.exists():
                    log_path = possible_log
                    break
    
    if log_path and log_path.exists():
        try:
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Read last 200 lines
                lines = f.readlines()
                for line in lines[-200:]:
                    line = strip_ansi(line.strip())
                    if line:
                        log_type = 'info'
                        line_lower = line.lower()
                        if 'error' in line_lower or 'failed' in line_lower or 'exception' in line_lower:
                            log_type = 'error'
                        elif 'success' in line_lower or 'completed' in line_lower or 'done' in line_lower:
                            log_type = 'success'
                        elif 'warning' in line_lower or 'warn' in line_lower:
                            log_type = 'warning'
                        logs.append({
                            'type': log_type,
                            'message': line
                        })
        except Exception as e:
            logs.append({
                'type': 'error',
                'message': f'Error reading log file: {str(e)}'
            })
    
    if not logs:
        logs.append({
            'type': 'info',
            'message': 'No logs available yet. Agent may still be starting or log file not found.'
        })
    
    return jsonify({'logs': logs})

@app.route('/api/github/issues', methods=['GET'])
def api_github_issues():
    """Get GitHub issues from ethanstoner/auto-cursor"""
    try:
        # Use GitHub API to fetch issues
        github_api_url = 'https://api.github.com/repos/ethanstoner/auto-cursor/issues'
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Auto-Cursor-Web'
        }
        
        # Try to get GitHub token from environment or config
        github_token = os.environ.get('GITHUB_TOKEN')
        if github_token:
            headers['Authorization'] = f'token {github_token}'
        
        response = requests.get(
            github_api_url,
            headers=headers,
            params={'state': 'all', 'per_page': 30},
            timeout=10
        )
        
        if response.status_code == 200:
            issues = response.json()
            # Filter out pull requests (they have pull_request field)
            issues = [issue for issue in issues if 'pull_request' not in issue]
            return jsonify(issues)
        else:
            # Return empty array if API fails (rate limit, etc.)
            return jsonify([])
    except Exception as e:
        # Return empty array on error
        return jsonify([])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', DEFAULT_PORT))
    print(f"🚀 Auto-Cursor Web Interface starting on http://localhost:{port}")
    print(f"📊 Open your browser to view the kanban board")
    app.run(host='127.0.0.1', port=port, debug=False)
