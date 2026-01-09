// Auto-Cursor Web Interface
const API_BASE = '/api';

let currentProjectId = null;
let refreshInterval = null;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab data
    if (tabName === 'projects') {
        loadProjects();
    } else if (tabName === 'kanban') {
        loadProjectsForSelect();
    } else if (tabName === 'memory') {
        loadProjectsForMemory();
    }
}

// Load projects
async function loadProjects() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '<div class="loading">Loading projects...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const projects = await response.json();
        
        if (projects.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No projects yet</h3><p>Create your first project to get started</p></div>';
            return;
        }
        
        container.innerHTML = projects.map(project => `
            <div class="project-card">
                <h3>${project.id}</h3>
                <p>${project.path}</p>
                <div class="project-actions">
                    <button class="btn btn-primary btn-small" onclick="createPlan('${project.id}')">Create Plan</button>
                    <button class="btn btn-secondary btn-small" onclick="startProject('${project.id}')">Start</button>
                    <button class="btn btn-secondary btn-small" onclick="viewKanban('${project.id}')">View Board</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
    }
}

// Load projects for select dropdown
async function loadProjectsForSelect() {
    const select = document.getElementById('project-select');
    const memorySelect = document.getElementById('memory-project-select');
    
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const projects = await response.json();
        
        select.innerHTML = '<option value="">Select a project...</option>' +
            projects.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
        
        memorySelect.innerHTML = '<option value="">Select a project...</option>' +
            projects.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
        
        if (currentProjectId) {
            select.value = currentProjectId;
            loadKanban(currentProjectId);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load kanban board
async function loadKanban(projectId) {
    if (!projectId) return;
    
    currentProjectId = projectId;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/status`);
        const status = await response.json();
        
        // Clear columns
        ['pending', 'running', 'qa', 'completed', 'failed'].forEach(col => {
            document.getElementById(`${col}-column`).innerHTML = '';
        });
        
        // Populate columns
        Object.keys(status.kanban).forEach(statusKey => {
            const column = document.getElementById(`${statusKey}-column`);
            const tasks = status.kanban[statusKey];
            
            if (tasks.length === 0) {
                column.innerHTML = '<div class="empty-state" style="padding: 20px; color: #999;">No tasks</div>';
            } else {
                column.innerHTML = tasks.map(task => `
                    <div class="task-card">
                        <h4>${task.id}</h4>
                        <p>${task.description || 'No description'}</p>
                        <div class="task-meta">
                            <span>${task.complexity || 'unknown'}</span>
                            <span>${task.estimated_hours ? task.estimated_hours + 'h' : ''}</span>
                        </div>
                    </div>
                `).join('');
            }
        });
        
        // Start auto-refresh
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => loadKanban(projectId), 3000);
        
    } catch (error) {
        console.error('Error loading kanban:', error);
    }
}

// Load memory
async function loadMemory(projectId) {
    if (!projectId) return;
    
    const container = document.getElementById('memory-content');
    container.innerHTML = '<div class="loading">Loading memory...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        const project = await response.json();
        
        if (!project.memory || Object.keys(project.memory).length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No memory yet</h3><p>Complete some tasks to build memory</p></div>';
            return;
        }
        
        const memory = project.memory;
        container.innerHTML = `
            <div class="memory-section">
                <h3>Successful Patterns</h3>
                ${(memory.successful_patterns || []).map(p => `<div class="memory-item">${p}</div>`).join('') || '<p>No patterns yet</p>'}
            </div>
            <div class="memory-section">
                <h3>Project Type</h3>
                <div class="memory-item">${memory.project_type || 'Not detected'}</div>
            </div>
            <div class="memory-section">
                <h3>Tech Stack</h3>
                ${(memory.tech_stack || []).map(t => `<div class="memory-item">${t}</div>`).join('') || '<p>Not detected</p>'}
            </div>
            <div class="memory-section">
                <h3>Statistics</h3>
                <div class="memory-item">Total Successful Builds: ${memory.total_successful_builds || 0}</div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
    }
}

// Project select handlers
document.getElementById('project-select').addEventListener('change', (e) => {
    loadKanban(e.target.value);
});

document.getElementById('memory-project-select').addEventListener('change', (e) => {
    loadMemory(e.target.value);
});

// New project modal
document.getElementById('new-project-btn').addEventListener('click', () => {
    document.getElementById('new-project-modal').style.display = 'block';
});

document.getElementById('new-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const path = document.getElementById('project-path').value;
    const id = document.getElementById('project-id').value;
    
    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, id })
        });
        
        if (response.ok) {
            document.getElementById('new-project-modal').style.display = 'none';
            loadProjects();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Plan modal
function createPlan(projectId) {
    currentProjectId = projectId;
    document.getElementById('plan-modal').style.display = 'block';
    document.getElementById('plan-form').dataset.projectId = projectId;
}

document.getElementById('plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = e.target.dataset.projectId;
    const goal = document.getElementById('plan-goal').value;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal })
        });
        
        if (response.ok) {
            document.getElementById('plan-modal').style.display = 'none';
            document.getElementById('plan-goal').value = '';
            alert('Plan created successfully!');
            loadProjects();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Start project
async function startProject(projectId) {
    if (!confirm('Start execution for this project?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/start`, {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('Execution started!');
            viewKanban(projectId);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// View kanban
function viewKanban(projectId) {
    switchTab('kanban');
    document.getElementById('project-select').value = projectId;
    loadKanban(projectId);
}

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
    if (currentProjectId) {
        loadKanban(currentProjectId);
    }
});

// Close modals
document.querySelectorAll('.close').forEach(close => {
    close.addEventListener('click', () => {
        close.closest('.modal').style.display = 'none';
    });
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Load projects for memory select
async function loadProjectsForMemory() {
    const select = document.getElementById('memory-project-select');
    
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const projects = await response.json();
        
        select.innerHTML = '<option value="">Select a project...</option>' +
            projects.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Initial load
loadProjects();
loadProjectsForSelect();
loadProjectsForMemory();
