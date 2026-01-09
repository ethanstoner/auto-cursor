// Auto-Cursor Web Interface - Complete Overhaul
const API_BASE = '/api';

// Global function to manually trigger project load (for debugging)
window.forceLoadProjects = function() {
    console.log('🔧 Manual project load triggered');
    loadProjectsForSidebar();
};

// Direct project injection - bypasses all async logic
async function directInjectProjects() {
    console.log('🚀 Direct project injection starting...');
    try {
        const response = await fetch('/api/projects', {cache: 'no-cache'});
        if (!response.ok) {
            console.error('❌ Direct injection failed:', response.status);
            return;
        }
        const projects = await response.json();
        console.log('✅ Direct injection got projects:', projects);
        
        // Try to find select element with multiple strategies
        let select = document.getElementById('sidebar-project-select');
        if (!select) {
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 100));
            select = document.getElementById('sidebar-project-select');
        }
        
        if (select) {
            console.log('✅ Found select in direct injection');
            // Clear and populate
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Select project...';
            select.appendChild(defaultOpt);
            
            if (projects && projects.length > 0) {
                projects.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id || p.name;
                    opt.textContent = p.name || p.id;
                    select.appendChild(opt);
                    console.log(`   ✅ Direct injected: ${opt.value}`);
                });
                console.log(`✅ Direct injection complete: ${select.options.length} options`);
            }
        } else {
            console.error('❌ Select not found in direct injection');
        }
    } catch (error) {
        console.error('❌ Direct injection error:', error);
    }
}

// MutationObserver to watch for select element
const projectSelectObserver = new MutationObserver((mutations, observer) => {
    const select = document.getElementById('sidebar-project-select');
    if (select && select.options.length <= 1) {
        console.log('👀 MutationObserver detected select element, loading projects...');
        observer.disconnect();
        loadProjectsForSidebar();
        directInjectProjects();
    }
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const select = document.getElementById('sidebar-project-select');
        if (select) {
            projectSelectObserver.observe(select.parentElement, { childList: true, subtree: true });
        }
        // Also try direct injection
        setTimeout(directInjectProjects, 100);
    });
} else {
    const select = document.getElementById('sidebar-project-select');
    if (select) {
        projectSelectObserver.observe(select.parentElement, { childList: true, subtree: true });
    }
    setTimeout(directInjectProjects, 100);
}

// State Management
let currentProjectId = null;
let currentView = 'kanban';
let refreshIntervals = {};
let draggedTask = null;

// Stale-while-revalidate data cache (prevents black flashing)
let dataCache = {
    kanban: null,
    agents: null,
    stats: null,
    lastFetch: {}
};

// Smooth content update helper to prevent black flash during refreshes
function smoothUpdate(element, newHTML) {
    if (!element) return;
    if (element.innerHTML === newHTML) return; // No change needed
    
    // Fade out slightly, update content, fade back in
    element.style.opacity = '0.7';
    element.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
        element.innerHTML = newHTML;
        element.style.opacity = '1';
    }, 100);
}

// Initialize - Use both DOMContentLoaded and immediate execution for reliability
function initializeApp() {
    console.log('🚀 Auto-Cursor Web UI initializing...');
    try {
        initializeSidebar();
        initializeViews();
        initializeModals();
        initializeDragDrop();
        // CRITICAL: Wait for loadInitialData to complete before starting refresh
        loadInitialData().then(() => {
            console.log('✅ Initial data loaded');
            startGlobalRefresh();
            // Force reload projects after a short delay to ensure DOM is ready
            setTimeout(() => {
                console.log('🔄 Force reloading projects after initialization...');
                loadProjectsForSidebar().catch(err => console.error('Error in force reload:', err));
            }, 500);
        }).catch(err => {
            console.error('❌ Error loading initial data:', err);
            // Still start refresh even if initial load fails
            startGlobalRefresh();
            // Try loading projects again
            setTimeout(() => {
                loadProjectsForSidebar().catch(e => console.error('Error in retry:', e));
            }, 1000);
        });
        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        console.error('Error stack:', error.stack);
    }
}

// Try immediate execution if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded, execute immediately
    initializeApp();
}

// Also ensure projects load after a short delay as final fallback
setTimeout(() => {
    const select = document.getElementById('sidebar-project-select');
    console.log('🔄 Final fallback check (3s)...');
    console.log('Select element:', select ? 'found' : 'NOT FOUND');
    if (select) {
        console.log(`Current options: ${select.options.length}`);
        Array.from(select.options).forEach((opt, idx) => {
            console.log(`  [${idx}] "${opt.value}" = "${opt.textContent}"`);
        });
    }
    if (select && (select.options.length <= 1 || (select.options.length === 1 && select.options[0].value === ''))) {
        console.log('🔄 Final fallback: Ensuring projects are loaded...');
        if (typeof loadProjectsForSidebar === 'function') {
            loadProjectsForSidebar().catch(err => console.error('Final fallback error:', err));
        } else {
            console.error('❌ loadProjectsForSidebar function not found!');
        }
    } else if (select && select.options.length > 1) {
        console.log('✅ Projects already loaded in fallback check');
    }
}, 3000);

// Also try after a short delay as fallback
setTimeout(() => {
    const select = document.getElementById('sidebar-project-select');
    if (select && select.options.length <= 1) {
        console.log('⚠️ Fallback: Project selector not populated, retrying...');
        if (typeof loadProjectsForSidebar === 'function') {
            loadProjectsForSidebar().catch(err => console.error('Fallback error:', err));
        }
        if (typeof refreshStats === 'function') {
            refreshStats().catch(err => console.error('Fallback stats error:', err));
        }
    }
}, 2000); // Reduced from 5000 to 2000 for faster retry

// Sidebar Management
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const projectSelect = document.getElementById('sidebar-project-select');
    const mainContent = document.getElementById('main-content');
    
    // Hamburger menu removed - sidebar is always visible
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    // Project selector
    projectSelect?.addEventListener('change', (e) => {
        currentProjectId = e.target.value;
        if (currentProjectId) {
            loadViewData(currentView);
        }
    });
    
    // New Task button
    document.getElementById('new-task-btn')?.addEventListener('click', () => {
        document.getElementById('new-task-modal').style.display = 'block';
    });
}

// View Management
function initializeViews() {
    // All views start hidden, kanban is active by default
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('view-kanban')?.classList.add('active');
}

function switchView(viewName) {
    // Update sidebar active state with animation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        // Animate active state
        activeItem.style.transform = 'scale(0.98)';
        setTimeout(() => {
            activeItem.style.transform = '';
        }, 150);
    }
    
    // Update view visibility with fade transition
    document.querySelectorAll('.view').forEach(view => {
        if (view.classList.contains('active')) {
            view.style.opacity = '0';
            view.style.transform = 'translateY(10px)';
            setTimeout(() => {
                view.classList.remove('active');
            }, 200);
        }
    });
    
    // Show new view with animation
    setTimeout(() => {
        const newView = document.getElementById(`view-${viewName}`);
        if (newView) {
            newView.classList.add('active');
            newView.style.opacity = '0';
            newView.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
                newView.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                newView.style.opacity = '1';
                newView.style.transform = 'translateY(0)';
            });
        }
    }, 200);
    
    currentView = viewName;
    loadViewData(viewName);
}

function loadViewData(viewName) {
    switch(viewName) {
        case 'kanban':
            loadKanban();
            startRefresh('kanban', () => loadKanban(), 2000); // Refresh every 2 seconds for real-time updates
            break;
        case 'agents':
            loadAgentTerminals();
            startRefresh('agents', () => loadAgentTerminals(), 3000); // Refresh every 3 seconds for smooth updates
            break;
        case 'insights':
            loadInsights();
            startRefresh('insights', () => loadInsights(), 5000);
            startRefresh('github-issues', () => loadGitHubIssues(), 10000);
            break;
        case 'roadmap':
            loadRoadmap();
            break;
        case 'ideation':
            loadIdeation();
            break;
        case 'changelog':
            loadChangelog();
            break;
        case 'context':
            loadContext();
            startRefresh('context', () => loadContext(), 5000);
            break;
        case 'github-issues':
            loadGitHubIssues();
            startRefresh('github-issues', () => loadGitHubIssues(), 10000);
            break;
        case 'worktrees':
            loadWorktrees();
            startRefresh('worktrees', () => loadWorktrees(), 5000);
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Kanban Board - Stale-while-revalidate pattern (no black flashing)
async function loadKanban() {
    if (!currentProjectId) {
        const board = document.getElementById('kanban-board');
        if (board && !dataCache.kanban) {
            board.innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project from the sidebar to view the kanban board</p></div>';
        }
        return;
    }
    
    // Show subtle updating indicator (only if we have cached data)
    const isRefreshing = dataCache.kanban !== null;
    if (isRefreshing) {
        showUpdatingIndicator('kanban');
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/status`, {cache: 'no-cache'});
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const status = await response.json();
        
        // Map old statuses to new columns with automatic state transitions
        const tasks = status.tasks || [];
        
        // Enhanced task processing with progress calculation
        const processedTasks = tasks.map(task => {
            // Calculate progress based on status
            let progress = 0;
            if (task.status === 'pending') progress = 0;
            else if (task.status === 'running') progress = 50;
            else if (task.status === 'qa_running') progress = 75;
            else if (task.status === 'completed' || task.status === 'qa_passed') progress = 100;
            else if (task.status === 'failed') progress = 0;
            
            // Add timestamp if missing
            if (!task.timestamp) {
                task.timestamp = 'Just now';
            }
            
            return { ...task, progress };
        });
        
        // Map to new columns
        const columnMapping = {
            'planning': processedTasks.filter(t => t.status === 'pending'),
            'in-progress': processedTasks.filter(t => t.status === 'running'),
            'ai-review': processedTasks.filter(t => t.status === 'qa_running'),
            'human-review': [], // Would be populated from human review status
            'done': processedTasks.filter(t => t.status === 'completed' || t.status === 'qa_passed' || t.status === 'failed' || t.status === 'qa_failed')
        };
        
        // Update column counts with smooth animation (no remounting)
        Object.keys(columnMapping).forEach(column => {
            const count = columnMapping[column].length;
            const countEl = document.getElementById(`count-${column}`);
            if (countEl) {
                const oldCount = parseInt(countEl.textContent) || 0;
                if (oldCount !== count) {
                    // Animate count change with smooth transition
                    countEl.style.transform = 'scale(1.3)';
                    countEl.style.color = 'var(--text-primary-light)';
                    setTimeout(() => {
                        countEl.textContent = count;
                        countEl.style.transform = 'scale(1)';
                        setTimeout(() => {
                            countEl.style.color = '';
                        }, 300);
                    }, 200);
                } else {
                    countEl.textContent = count;
                }
            }
        });
        
        // CRITICAL: Incremental DOM updates (no innerHTML replacement)
        // Only update/add/remove individual cards, never clear entire column
        Object.keys(columnMapping).forEach(column => {
            const columnEl = document.getElementById(`${column}-column`);
            if (!columnEl) return;
            
            const newTasks = columnMapping[column];
            const newTaskIds = new Set(newTasks.map(t => t.id));
            
            // Get existing cards (stable keys)
            const existingCards = Array.from(columnEl.querySelectorAll('.task-card'));
            const existingTaskIds = new Set(existingCards.map(card => card.dataset.taskId));
            
            // Remove cards that no longer exist
            existingCards.forEach(card => {
                const taskId = card.dataset.taskId;
                if (!newTaskIds.has(taskId)) {
                    // Animate out before removing
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    setTimeout(() => {
                        if (card.parentNode) {
                            card.remove();
                        }
                    }, 200);
                }
            });
            
            // Update existing cards or add new ones
            newTasks.forEach(task => {
                let cardEl = columnEl.querySelector(`[data-task-id="${task.id}"]`);
                
                if (cardEl) {
                    // Update existing card (incremental update, no remount)
                    updateTaskCard(cardEl, task);
                } else {
                    // Add new card (with fade-in animation)
                    const newCardHtml = renderTaskCard(task);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newCardHtml;
                    const newCard = tempDiv.firstElementChild;
                    
                    // Start invisible, then fade in
                    newCard.style.opacity = '0';
                    newCard.style.transform = 'translateY(10px)';
                    columnEl.appendChild(newCard);
                    
                    // Animate in
                    requestAnimationFrame(() => {
                        newCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        newCard.style.opacity = '1';
                        newCard.style.transform = 'translateY(0)';
                    });
                }
            });
            
            // Handle empty state (only if no tasks and no existing content)
            if (newTasks.length === 0 && existingCards.length === 0) {
                if (!columnEl.querySelector('.empty-state')) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state';
                    emptyState.style.cssText = 'padding: 20px; color: #999; font-size: 0.875rem;';
                    emptyState.textContent = 'No tasks';
                    columnEl.appendChild(emptyState);
                }
            } else {
                // Remove empty state if tasks exist
                const emptyState = columnEl.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.remove();
                }
            }
        });
        
        // Cache the data for next refresh
        dataCache.kanban = { tasks: processedTasks, columnMapping, timestamp: Date.now() };
        dataCache.lastFetch.kanban = Date.now();
        
        // Hide updating indicator
        hideUpdatingIndicator('kanban');
        
        // Re-initialize drag-drop (only for new cards)
        initializeTaskDragDrop();
        
    } catch (error) {
        console.error('Error loading kanban:', error);
        hideUpdatingIndicator('kanban');
        // Keep cached data on error - don't clear UI
        if (!dataCache.kanban) {
            const board = document.getElementById('kanban-board');
            if (board) {
                board.innerHTML = `<div class="empty-state"><h3>Error loading kanban</h3><p>${escapeHtml(error.message)}</p></div>`;
            }
        }
    }
}

// Update existing task card without remounting
function updateTaskCard(cardEl, task) {
    if (!cardEl) return;
    
    // Update status attribute
    cardEl.dataset.status = task.status;
    
    // Update progress bar (smooth transition)
    const progressBar = cardEl.querySelector('.progress-bar');
    const progressText = cardEl.querySelector('.progress-text');
    if (progressBar && progressText) {
        const newProgress = task.progress || 0;
        progressBar.style.transition = 'width 0.3s ease';
        progressBar.style.width = `${newProgress}%`;
        progressText.textContent = `${newProgress}%`;
    }
    
    // Update status dot and text
    const statusDot = cardEl.querySelector('.status-dot');
    const statusText = cardEl.querySelector('.task-status');
    if (statusDot && statusText) {
        const statusColors = {
            'pending': 'rgba(0, 122, 255, 1)',
            'running': 'rgba(255, 193, 7, 1)',
            'qa_running': 'rgba(88, 86, 214, 1)',
            'completed': 'rgba(52, 199, 89, 1)',
            'failed': 'rgba(255, 59, 48, 1)',
            'qa_passed': 'rgba(52, 199, 89, 1)',
            'qa_failed': 'rgba(255, 59, 48, 1)'
        };
        const statusLabels = {
            'pending': 'Pending',
            'running': 'Running',
            'qa_running': 'QA Running',
            'completed': 'Completed',
            'failed': 'Failed',
            'qa_passed': 'QA Passed',
            'qa_failed': 'QA Failed'
        };
        const status = task.status || 'pending';
        const statusColor = statusColors[status] || statusColors['pending'];
        statusDot.style.background = statusColor;
        statusText.textContent = statusLabels[status] || status;
        statusText.style.color = statusColor;
    }
    
    // Update timestamp - use completed time for completed tasks
    const timeEl = cardEl.querySelector('.task-time');
    const elapsedEl = cardEl.querySelector('.task-elapsed');
    
    if (timeEl) {
        let timeDisplay = '';
        let elapsedTime = '';
        
        if (task.completed && (task.status === 'completed' || task.status === 'qa_passed')) {
            // For completed tasks, show when it was completed
            const completed = typeof task.completed === 'number' ? new Date(task.completed * 1000) : new Date(task.completed);
            const now = new Date();
            const diffMs = now - completed;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) timeDisplay = 'Just now';
            else if (diffMins < 60) timeDisplay = `${diffMins}m ago`;
            else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) {
                    timeDisplay = `${diffHours}h ago`;
                } else {
                    const diffDays = Math.floor(diffHours / 24);
                    timeDisplay = `${diffDays}d ago`;
                }
            }
            
            // Calculate elapsed time (start to completion)
            if (task.started) {
                const started = typeof task.started === 'string' ? new Date(task.started) : new Date(task.started * 1000);
                const elapsedMs = completed - started;
                const elapsedMins = Math.floor(elapsedMs / 60000);
                if (elapsedMins < 1) elapsedTime = '< 1m';
                else if (elapsedMins < 60) elapsedTime = `${elapsedMins}m`;
                else {
                    const elapsedHours = Math.floor(elapsedMins / 60);
                    elapsedTime = `${elapsedHours}h ${elapsedMins % 60}m`;
                }
            }
        } else if (task.started && (task.status === 'running' || task.status === 'qa_running')) {
            // For running tasks, show how long it's been running
            const started = typeof task.started === 'string' ? new Date(task.started) : new Date(task.started * 1000);
            const now = new Date();
            const diffMs = now - started;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) timeDisplay = 'Just started';
            else if (diffMins < 60) timeDisplay = `Running ${diffMins}m`;
            else {
                const diffHours = Math.floor(diffMins / 60);
                timeDisplay = `Running ${diffHours}h ${diffMins % 60}m`;
            }
            elapsedTime = timeDisplay;
        } else {
            timeDisplay = 'Just now';
        }
        
        timeEl.textContent = timeDisplay;
        
        // Update elapsed time if element exists
        if (elapsedEl && elapsedTime) {
            elapsedEl.textContent = elapsedTime;
            elapsedEl.style.display = 'inline';
        } else if (elapsedEl) {
            elapsedEl.style.display = 'none';
        }
    }
}

// Show subtle updating indicator
function showUpdatingIndicator(view) {
    const viewEl = document.getElementById(`view-${view}`);
    if (!viewEl) return;
    
    let indicator = viewEl.querySelector('.updating-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'updating-indicator';
        indicator.innerHTML = '<span class="updating-spinner"></span><span>Updating...</span>';
        indicator.style.cssText = 'position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #999; z-index: 10;';
        viewEl.style.position = 'relative';
        viewEl.appendChild(indicator);
    }
    indicator.style.opacity = '1';
}

// Hide updating indicator
function hideUpdatingIndicator(view) {
    const viewEl = document.getElementById(`view-${view}`);
    if (!viewEl) return;
    
    const indicator = viewEl.querySelector('.updating-indicator');
    if (indicator) {
        indicator.style.transition = 'opacity 0.3s ease';
        indicator.style.opacity = '0';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 300);
    }
}

function renderTaskCard(task) {
    const complexity = task.complexity || 'unknown';
    const complexityColors = {
        'simple': 'rgba(52, 199, 89, 0.15)',
        'medium': 'rgba(255, 193, 7, 0.15)',
        'high': 'rgba(255, 59, 48, 0.15)',
        'unknown': 'rgba(142, 142, 147, 0.15)'
    };
    
    const complexityLabels = {
        'simple': 'Simple',
        'medium': 'Medium',
        'high': 'High',
        'unknown': 'Unknown'
    };
    
    const statusColors = {
        'pending': 'rgba(0, 122, 255, 1)',
        'running': 'rgba(255, 193, 7, 1)',
        'qa_running': 'rgba(88, 86, 214, 1)',
        'completed': 'rgba(52, 199, 89, 1)',
        'failed': 'rgba(255, 59, 48, 1)',
        'qa_passed': 'rgba(52, 199, 89, 1)',
        'qa_failed': 'rgba(255, 59, 48, 1)'
    };
    
    const statusLabels = {
        'pending': 'Pending',
        'running': 'Running',
        'qa_running': 'QA Running',
        'completed': 'Completed',
        'failed': 'Failed',
        'qa_passed': 'QA Passed',
        'qa_failed': 'QA Failed'
    };
    
    const status = task.status || 'pending';
    const statusColor = statusColors[status] || statusColors['pending'];
    const complexityColor = complexityColors[complexity] || complexityColors['unknown'];
    
    // Calculate progress
    let progress = task.progress || 0;
    if (status === 'pending') progress = 0;
    else if (status === 'running') progress = 50;
    else if (status === 'qa_running') progress = 75;
    else if (status === 'completed' || status === 'qa_passed') progress = 100;
    else if (status === 'failed' || status === 'qa_failed') progress = 0;
    
    // Format timestamp - use completed time for completed tasks, started time for running tasks
    let timeDisplay = '';
    let elapsedTime = '';
    
    if (task.completed && (status === 'completed' || status === 'qa_passed')) {
        // For completed tasks, show when it was completed
        const completed = typeof task.completed === 'number' ? new Date(task.completed * 1000) : new Date(task.completed);
        const now = new Date();
        const diffMs = now - completed;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) timeDisplay = 'Just now';
        else if (diffMins < 60) timeDisplay = `${diffMins}m ago`;
        else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                timeDisplay = `${diffHours}h ago`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                timeDisplay = `${diffDays}d ago`;
            }
        }
        
        // Calculate elapsed time (start to completion)
        if (task.started) {
            const started = typeof task.started === 'string' ? new Date(task.started) : new Date(task.started * 1000);
            const elapsedMs = completed - started;
            const elapsedMins = Math.floor(elapsedMs / 60000);
            if (elapsedMins < 1) elapsedTime = '< 1m';
            else if (elapsedMins < 60) elapsedTime = `${elapsedMins}m`;
            else {
                const elapsedHours = Math.floor(elapsedMins / 60);
                elapsedTime = `${elapsedHours}h ${elapsedMins % 60}m`;
            }
        }
    } else if (task.started && (status === 'running' || status === 'qa_running')) {
        // For running tasks, show how long it's been running
        const started = typeof task.started === 'string' ? new Date(task.started) : new Date(task.started * 1000);
        const now = new Date();
        const diffMs = now - started;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) timeDisplay = 'Just started';
        else if (diffMins < 60) timeDisplay = `Running ${diffMins}m`;
        else {
            const diffHours = Math.floor(diffMins / 60);
            timeDisplay = `Running ${diffHours}h ${diffMins % 60}m`;
        }
        elapsedTime = timeDisplay;
    } else if (task.timestamp) {
        timeDisplay = task.timestamp;
    } else {
        timeDisplay = 'Just now';
    }
    
    return `
        <div class="task-card" data-task-id="${escapeHtml(task.id)}" data-status="${escapeHtml(status)}" draggable="true">
            <div class="task-header">
                <h4>${escapeHtml(task.title || task.id)}</h4>
                <div class="task-badges">
                    <span class="task-complexity" style="background: ${complexityColor}; border: 1px solid ${complexityColor.replace('0.15', '0.3')}">${escapeHtml(complexityLabels[complexity])}</span>
                </div>
            </div>
            <div class="task-body">
                ${task.description ? `<p class="task-description">${escapeHtml(task.description.substring(0, 120))}${task.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="task-progress-container">
                    <div class="task-progress">
                        <div class="progress-bar" style="width: ${progress}%; background: ${statusColor}; opacity: 0.9">
                            <div class="progress-bar-shine"></div>
                        </div>
                    </div>
                    <div class="progress-info">
                        <span class="progress-text">${progress}%</span>
                        ${elapsedTime ? `<span class="task-elapsed">${elapsedTime}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="task-footer">
                <div class="task-status-info">
                    <span class="status-dot" style="background: ${statusColor}"></span>
                    <span class="task-status" style="color: ${statusColor}">${escapeHtml(statusLabels[status])}</span>
                </div>
                <div class="task-time-info">
                    ${timeDisplay ? `<span class="task-time" title="${task.completed ? 'Completed' : task.started ? 'Started' : ''}">${timeDisplay}</span>` : ''}
                </div>
            </div>
            ${task.status === 'running' ? `
                <div class="task-actions">
                    <button class="btn-view-logs" onclick="viewTaskLogs('${escapeHtml(task.id)}')">
                        <img src="https://unpkg.com/lucide-static@latest/icons/terminal.svg" alt="Logs" class="btn-icon-small">
                        View Logs
                    </button>
                </div>
            ` : ''}
            ${task.status === 'qa_running' ? `
                <div class="task-actions">
                    <span class="qa-indicator">
                        <span class="status-dot running"></span>
                        QA in progress...
                    </span>
                </div>
            ` : ''}
        </div>
    `;
}

function getTaskBadges(task) {
    const badges = [];
    if (task.needs_review) badges.push('<span class="task-badge needs-review">Needs Review</span>');
    if (task.status === 'completed') badges.push('<span class="task-badge completed">Completed</span>');
    if (task.high_impact) badges.push('<span class="task-badge high-impact">High Impact</span>');
    if (task.performance) badges.push('<span class="task-badge performance">Performance</span>');
    return badges.join('');
}

function getTaskCardClass(task) {
    if (task.status === 'running') return 'running';
    if (task.status === 'completed' || task.status === 'qa_passed') return 'completed';
    if (task.status === 'failed' || task.status === 'qa_failed') return 'failed';
    return '';
}

// Drag and Drop
function initializeDragDrop() {
    // Will be called after tasks are rendered
}

function initializeTaskDragDrop() {
    const taskCards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.kanban-column');
    
    taskCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedTask = card;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedTask = null;
        });
    });
    
    columns.forEach(column => {
        const columnContent = column.querySelector('.column-content');
        
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            columnContent.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', () => {
            columnContent.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            columnContent.classList.remove('drag-over');
            
            if (draggedTask) {
                const taskId = draggedTask.dataset.taskId;
                const newColumn = column.dataset.column;
                
                // Animate task movement
                draggedTask.style.opacity = '0.5';
                draggedTask.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    // Move task visually
                    columnContent.appendChild(draggedTask);
                    
                    // Animate back
                    draggedTask.style.transition = 'all 0.3s ease';
                    draggedTask.style.opacity = '1';
                    draggedTask.style.transform = 'scale(1)';
                    
                    // Update task status (would call API in real implementation)
                    updateTaskStatus(taskId, newColumn);
                }, 100);
            }
        });
    });
}

async function updateTaskStatus(taskId, newColumn) {
    // Map column to status
    const statusMap = {
        'planning': 'pending',
        'in-progress': 'running',
        'ai-review': 'qa_running',
        'human-review': 'qa_running',
        'done': 'completed'
    };
    
    const newStatus = statusMap[newColumn] || 'pending';
    
    // In a real implementation, this would call the API
    console.log(`Updating task ${taskId} to status ${newStatus}`);
}

// Agent Terminals - with smooth updates
let agentLogIntervals = {};
let agentLogStreams = {}; // Track SSE connections
let agentSearchFilter = '';
let agentStatusFilter = 'all';

async function loadAgentTerminals() {
    // Stale-while-revalidate: keep old agents visible
    const cachedAgents = dataCache.agents;
    const isRefreshing = cachedAgents !== null;
    
    if (isRefreshing) {
        showUpdatingIndicator('agents');
    }
    
    try {
        // Get agents for current project if available, otherwise all agents
        let agents = [];
        if (currentProjectId) {
            try {
                const projectResponse = await fetch(`${API_BASE}/projects/${currentProjectId}/agents`, {cache: 'no-cache'});
                if (projectResponse.ok) {
                    agents = await projectResponse.json();
                }
            } catch (e) {
                // Fallback to all agents
            }
        }
        
        // Fallback to all agents if project agents empty
        if (agents.length === 0) {
            const response = await fetch(`${API_BASE}/agents`, {cache: 'no-cache'});
            agents = await response.json();
        }
        
        const container = document.getElementById('agents-terminals');
        if (!container) return;
        
        // Cache agents
        dataCache.agents = agents;
        dataCache.lastFetch.agents = Date.now();
        
        if (agents.length === 0) {
            // Only show empty state if no cached data
            if (!cachedAgents || cachedAgents.length === 0) {
                smoothUpdate(container, '<div class="empty-state"><h3>No agents running</h3><p>Start a project to see agents in action</p></div>');
            }
            hideUpdatingIndicator('agents');
            return;
        }
        
        // Only update if agents changed (prevent full refresh)
        const currentAgentIds = Array.from(container.querySelectorAll('.agent-terminal')).map(el => el.dataset.agentId);
        const newAgentIds = agents.map(a => a.id);
        
        // Apply filters
        let filteredAgents = agents;
        if (agentSearchFilter) {
            filteredAgents = filteredAgents.filter(agent => 
                agent.id.toLowerCase().includes(agentSearchFilter.toLowerCase()) ||
                (agent.last_update && agent.last_update.toLowerCase().includes(agentSearchFilter.toLowerCase()))
            );
        }
        if (agentStatusFilter !== 'all') {
            filteredAgents = filteredAgents.filter(agent => agent.status === agentStatusFilter);
        }
        
        // Update existing terminals or add new ones (incremental updates)
        filteredAgents.forEach(agent => {
            let terminalEl = container.querySelector(`[data-agent-id="${agent.id}"]`);
            if (!terminalEl) {
                // Add new terminal (with fade-in)
                const newTerminalHtml = renderAgentTerminal(agent);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newTerminalHtml;
                const newTerminal = tempDiv.firstElementChild;
                newTerminal.style.opacity = '0';
                newTerminal.style.transform = 'translateY(10px)';
                container.appendChild(newTerminal);
                
                requestAnimationFrame(() => {
                    newTerminal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    newTerminal.style.opacity = '1';
                    newTerminal.style.transform = 'translateY(0)';
                });
                
                terminalEl = newTerminal;
            }
            
            // Update status (incremental, no remount)
            const statusEl = terminalEl.querySelector('.agent-status');
            if (statusEl) {
                const statusClass = agent.status === 'running' ? 'running' : 
                                   agent.status === 'completed' ? 'idle' :
                                   agent.status === 'failed' ? 'error' : 'waiting';
                const statusText = agent.status_text || agent.status;
                
                // Only update if changed
                const currentText = statusEl.textContent.trim();
                if (currentText !== statusText) {
                    statusEl.innerHTML = `
                        <span class="status-dot ${statusClass}"></span>
                        <span>${escapeHtml(statusText)}</span>
                    `;
                }
            }
        });
        
        // Remove terminals for agents that are no longer running or filtered out (with fade-out)
        const filteredAgentIds = filteredAgents.map(a => a.id);
        currentAgentIds.forEach(agentId => {
            if (!filteredAgentIds.includes(agentId)) {
                const terminalEl = container.querySelector(`[data-agent-id="${agentId}"]`);
                if (terminalEl) {
                    terminalEl.style.opacity = '0';
                    terminalEl.style.transform = 'translateY(-10px)';
                    terminalEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    setTimeout(() => {
                        if (terminalEl.parentNode) {
                            terminalEl.remove();
                        }
                        // Clear interval and stream
                        if (agentLogIntervals[agentId]) {
                            clearInterval(agentLogIntervals[agentId]);
                            delete agentLogIntervals[agentId];
                        }
                        if (agentLogStreams[agentId]) {
                            stopAgentLogStream(agentId);
                        }
                    }, 300);
                }
            }
        });
        
        // Load/update terminal logs for each agent (with live streaming for running agents)
        agents.forEach(agent => {
            // Load initial logs immediately
            if (currentProjectId) {
                loadAgentLogsFromAPI(currentProjectId, agent.id);
            }
            
            // Set up live streaming for running agents
            if (agent.status === 'running') {
                if (!agentLogStreams[agent.id]) {
                    startAgentLogStream(currentProjectId, agent.id);
                }
            } else {
                // Stop streaming for non-running agents
                if (agentLogStreams[agent.id]) {
                    stopAgentLogStream(agent.id);
                }
                // Also clear any polling intervals
                if (agentLogIntervals[agent.id]) {
                    clearInterval(agentLogIntervals[agent.id]);
                    delete agentLogIntervals[agent.id];
                }
            }
        });
        
        hideUpdatingIndicator('agents');
        
    } catch (error) {
        console.error('Error loading agents:', error);
        hideUpdatingIndicator('agents');
        // Keep cached agents on error
        if (!cachedAgents) {
            const container = document.getElementById('agents-terminals');
            if (container) {
                smoothUpdate(container, `<div class="empty-state"><h3>Error loading agents</h3><p>${escapeHtml(error.message)}</p></div>`);
            }
        }
    }
}

async function loadAgentLogsFromAPI(projectId, agentId) {
    const terminalEl = document.getElementById(`terminal-${agentId}`);
    if (!terminalEl) return;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/agent-logs/${agentId}`, {cache: 'no-cache'});
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        if (data.logs && data.logs.length > 0) {
            // First load - show all logs
            if (terminalEl.children.length === 0 || terminalEl.innerHTML.includes('Loading logs') || terminalEl.innerHTML.includes('No logs')) {
                const allContent = data.logs.map(log => 
                    `<div class="log-line ${log.type || 'info'}">${escapeHtml(log.message || log)}</div>`
                ).join('');
                terminalEl.innerHTML = allContent;
                
                // Auto-scroll to bottom on first load
                requestAnimationFrame(() => {
                    terminalEl.scrollTop = terminalEl.scrollHeight;
                });
            }
        } else {
            // Only show "no logs" if container is empty
            if (terminalEl.children.length === 0 || terminalEl.innerHTML.includes('Loading logs')) {
                terminalEl.innerHTML = '<div class="log-line info">No logs available yet. Agent may still be starting...</div>';
            }
        }
    } catch (error) {
        console.error('Error loading agent logs:', error);
        // Only show error if no logs exist
        if (terminalEl.children.length === 0 || terminalEl.innerHTML.includes('Loading logs') || terminalEl.innerHTML.includes('No logs')) {
            terminalEl.innerHTML = `<div class="log-line error">Error loading logs: ${escapeHtml(error.message)}</div>`;
        }
    }
}

function startAgentLogStream(projectId, agentId) {
    // Close existing stream if any
    if (agentLogStreams[agentId]) {
        stopAgentLogStream(agentId);
    }
    
    const terminalEl = document.getElementById(`terminal-${agentId}`);
    if (!terminalEl) return;
    
    try {
        const eventSource = new EventSource(`${API_BASE}/projects/${projectId}/agent-logs/${agentId}/stream`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const wasAtBottom = terminalEl.scrollHeight - terminalEl.scrollTop < terminalEl.clientHeight + 100;
                
                // Append new log line
                const logLine = document.createElement('div');
                logLine.className = `log-line ${data.type || 'info'}`;
                logLine.textContent = data.message;
                logLine.style.opacity = '0';
                terminalEl.appendChild(logLine);
                
                // Fade in new log line
                requestAnimationFrame(() => {
                    logLine.style.transition = 'opacity 0.2s ease';
                    logLine.style.opacity = '1';
                });
                
                // Auto-scroll to bottom if user was already at bottom
                if (wasAtBottom) {
                    requestAnimationFrame(() => {
                        terminalEl.scrollTop = terminalEl.scrollHeight;
                    });
                }
                
                // Limit to last 1000 lines to prevent memory issues
                const logLines = terminalEl.querySelectorAll('.log-line');
                if (logLines.length > 1000) {
                    logLines[0].remove();
                }
            } catch (e) {
                console.error('Error parsing SSE message:', e);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('SSE error for agent', agentId, error);
            // Reconnect after a delay
            setTimeout(() => {
                if (agentLogStreams[agentId]) {
                    stopAgentLogStream(agentId);
                    startAgentLogStream(projectId, agentId);
                }
            }, 3000);
        };
        
        agentLogStreams[agentId] = eventSource;
    } catch (error) {
        console.error('Error starting log stream:', error);
        // Fallback to polling
        if (!agentLogIntervals[agentId]) {
            agentLogIntervals[agentId] = setInterval(() => {
                loadAgentLogsFromAPI(projectId, agentId);
            }, 2000);
        }
    }
}

function stopAgentLogStream(agentId) {
    if (agentLogStreams[agentId]) {
        agentLogStreams[agentId].close();
        delete agentLogStreams[agentId];
    }
}

function renderAgentTerminal(agent) {
    const statusClass = agent.status === 'running' ? 'running' : 
                       agent.status === 'completed' ? 'idle' :
                       agent.status === 'failed' ? 'error' : 'waiting';
    
    // Clean up agent ID for display (remove project prefix if present)
    let displayId = agent.id;
    if (currentProjectId && displayId.startsWith(`${currentProjectId}-`)) {
        displayId = displayId.substring(currentProjectId.length + 1);
    }
    
    const statusIcons = {
        'running': 'https://unpkg.com/lucide-static@latest/icons/play-circle.svg',
        'completed': 'https://unpkg.com/lucide-static@latest/icons/check-circle.svg',
        'failed': 'https://unpkg.com/lucide-static@latest/icons/x-circle.svg',
        'pending': 'https://unpkg.com/lucide-static@latest/icons/clock.svg',
        'qa_running': 'https://unpkg.com/lucide-static@latest/icons/loader.svg'
    };
    
    const statusLabels = {
        'running': 'Running',
        'completed': 'Completed',
        'failed': 'Failed',
        'pending': 'Pending',
        'qa_running': 'QA Running'
    };
    
    const statusColors = {
        'running': 'rgba(255, 193, 7, 1)',
        'completed': 'rgba(52, 199, 89, 1)',
        'failed': 'rgba(255, 59, 48, 1)',
        'pending': 'rgba(142, 142, 147, 1)',
        'qa_running': 'rgba(88, 86, 214, 1)'
    };
    
    return `
        <div class="agent-terminal" data-agent-id="${escapeHtml(agent.id)}" data-status="${escapeHtml(agent.status)}">
            <div class="agent-terminal-header">
                <div class="agent-terminal-title">
                    <h3>
                        <img src="${statusIcons[agent.status] || statusIcons.pending}" alt="${agent.status}" class="status-icon-small">
                        <span>${escapeHtml(displayId)}</span>
                    </h3>
                </div>
                <div class="agent-status">
                    <span class="status-dot ${statusClass}"></span>
                    <span>${escapeHtml(statusLabels[agent.status] || agent.status)}</span>
                </div>
            </div>
            <div id="terminal-${escapeHtml(agent.id)}" class="agent-terminal-output" data-agent-id="${escapeHtml(agent.id)}">
                <div class="log-line info">Loading logs...</div>
            </div>
        </div>
    `;
}

async function loadAgentLogs(agentId, logPath) {
    // Try to load logs via API first
    if (currentProjectId) {
        await loadAgentLogsFromAPI(currentProjectId, agentId);
    } else {
        // Fallback: show error message
        const terminalEl = document.getElementById(`terminal-${agentId}`);
        if (terminalEl) {
            terminalEl.innerHTML = '<div class="log-line error">No project selected. Select a project to view logs.</div>';
        }
    }
}

// Insights
async function loadInsights() {
    const container = document.getElementById('insights-content');
    if (!container) return;
    
    if (!currentProjectId) {
        container.innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view insights</p></div>';
        return;
    }
    
    try {
        // Try to get insights from dedicated endpoint
        let insights;
        try {
            const insightsResponse = await fetch(`${API_BASE}/projects/${currentProjectId}/insights`);
            if (insightsResponse.ok) {
                insights = await insightsResponse.json();
            } else {
                throw new Error('Insights endpoint failed');
            }
        } catch (e) {
            // Fallback to status endpoint
            const response = await fetch(`${API_BASE}/projects/${currentProjectId}/status`);
            const status = await response.json();
            
            const tasks = status.tasks || [];
            const completed = tasks.filter(t => t.status === 'completed' || t.status === 'qa_passed').length;
            const total = tasks.length;
            const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const running = tasks.filter(t => t.status === 'running').length;
            const agentUtil = total > 0 ? Math.round((running / total) * 100) : 0;
            const failed = tasks.filter(t => t.status === 'failed' || t.status === 'qa_failed').length;
            const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;
            
            insights = {
                tasks_completed: completed,
                tasks_total: total,
                success_rate: successRate,
                agent_utilization: agentUtil,
                failure_rate: failureRate,
                bottlenecks: running > 0 ? 'AI Review' : 'None',
                avg_execution_time: 'N/A'
            };
        }
        
        // Update insight values - ensure elements exist
        const tasksCompletedEl = document.getElementById('insight-tasks-completed');
        const successRateEl = document.getElementById('insight-success-rate');
        const agentUtilEl = document.getElementById('insight-agent-util');
        const bottlenecksEl = document.getElementById('insight-bottlenecks');
        const avgTimeEl = document.getElementById('insight-avg-time');
        
        if (tasksCompletedEl) {
            tasksCompletedEl.textContent = insights.tasks_completed || 0;
            // Add total if available
            if (insights.tasks_total !== undefined && insights.tasks_total > 0) {
                const parent = tasksCompletedEl.parentElement;
                let totalSpan = parent.querySelector('.insight-total');
                if (!totalSpan) {
                    totalSpan = document.createElement('div');
                    totalSpan.className = 'insight-total';
                    totalSpan.style.fontSize = '12px';
                    totalSpan.style.color = 'var(--text-secondary-light)';
                    totalSpan.style.marginTop = '4px';
                    parent.appendChild(totalSpan);
                }
                totalSpan.textContent = `of ${insights.tasks_total} total`;
            }
        }
        
        if (successRateEl) successRateEl.textContent = `${insights.success_rate || 0}%`;
        if (agentUtilEl) agentUtilEl.textContent = `${insights.agent_utilization || 0}%`;
        if (bottlenecksEl) bottlenecksEl.textContent = insights.bottlenecks || 'None';
        if (avgTimeEl) avgTimeEl.textContent = insights.avg_execution_time || 'N/A';
        
        // Insights view updates individual elements, not innerHTML - no smoothUpdate needed here
    } catch (error) {
        console.error('Error loading insights:', error);
        smoothUpdate(container, `<div class="empty-state"><h3>Error loading insights</h3><p>${escapeHtml(error.message)}</p></div>`);
    }
}

// Roadmap
async function loadRoadmap() {
    if (!currentProjectId) {
        document.getElementById('roadmap-content').innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view roadmap</p></div>';
        return;
    }
    
    try {
        // Try to load roadmap from API
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/roadmap`);
        let roadmap;
        if (response.ok) {
            roadmap = await response.json();
        } else {
            // Fallback to placeholder
            roadmap = {
                'must-have': [],
                'should-have': [],
                'could-have': [],
                'wont-have': []
            };
        }
        
    Object.keys(roadmap).forEach(category => {
        const container = document.getElementById(`roadmap-${category}`);
        if (!container) return;
            
            const items = roadmap[category] || [];
            if (items.length === 0) {
                container.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No items</p></div>';
            } else {
                container.innerHTML = items.map(item => `
                    <div class="roadmap-item">
                        <h4>${escapeHtml(item.name || item.title || 'Untitled')}</h4>
                        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
                        <div class="roadmap-item-meta">
                            ${item.impact ? `<span class="roadmap-impact">${escapeHtml(item.impact)} impact</span>` : ''}
                            ${item.priority ? `<span class="roadmap-impact">${escapeHtml(item.priority)}</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        });
    } catch (error) {
        console.error('Error loading roadmap:', error);
    }
}

// Context & Memory
async function loadContext() {
    if (!currentProjectId) {
        document.getElementById('context-content').innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view context</p></div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}`);
        const project = await response.json();
        
        const memory = project.memory || {};
        const status = project.kanban || {};
        
        // Build context display
        let contextHtml = '<div class="context-section">';
        contextHtml += `<h3>Project Path</h3><p>${escapeHtml(project.path || 'No path')}</p>`;
        contextHtml += '</div>';
        
        if (Object.keys(memory).length > 0) {
            contextHtml += '<div class="context-section">';
            contextHtml += '<h3>Memory</h3>';
            contextHtml += `<pre class="context-memory">${escapeHtml(JSON.stringify(memory, null, 2))}</pre>`;
            contextHtml += '</div>';
        }
        
        // Recent decisions from completed tasks
        const completed = (status.completed || []).slice(0, 5);
        if (completed.length > 0) {
            contextHtml += '<div class="context-section">';
            contextHtml += '<h3>Recent Decisions</h3>';
            contextHtml += '<ul class="context-list">';
            completed.forEach(task => {
                contextHtml += `<li>${escapeHtml(task.title || task.id)} - ${escapeHtml(task.status)}</li>`;
            });
            contextHtml += '</ul>';
            contextHtml += '</div>';
        }
        
        // Task summary
        const total = (status.pending || []).length + (status.running || []).length + (status.completed || []).length;
        if (total > 0) {
            contextHtml += '<div class="context-section">';
            contextHtml += '<h3>Task Summary</h3>';
            contextHtml += `<p>Total: ${total} | Running: ${(status.running || []).length} | Completed: ${(status.completed || []).length}</p>`;
            contextHtml += '</div>';
        }
        
        const container = document.getElementById('context-content');
        if (container) {
            container.innerHTML = contextHtml || '<div class="empty-state"><p>No context available</p></div>';
        }
        
    } catch (error) {
        console.error('Error loading context:', error);
    }
}

// Other Views
async function loadIdeation() {
    if (!currentProjectId) {
        document.getElementById('ideation-content').innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view ideation</p></div>';
        return;
    }
    
    try {
        // Get project status to generate ideas from tasks
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/status`);
        const status = await response.json();
        
        const tasks = status.tasks || [];
        const pending = tasks.filter(t => t.status === 'pending');
        const ideas = [];
        
        // Generate ideas from pending tasks
        pending.forEach(task => {
            ideas.push({
                title: task.title || task.id,
                description: task.description || 'No description',
                priority: task.complexity === 'high' ? 'High' : task.complexity === 'medium' ? 'Medium' : 'Low',
                status: 'pending'
            });
        });
        
        const container = document.getElementById('ideation-content');
        if (!container) return;
        
        if (ideas.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No ideas yet</h3><p>Ideas will appear here based on pending tasks</p></div>';
        } else {
            container.innerHTML = ideas.map(idea => `
                <div class="ideation-item">
                    <h4>${escapeHtml(idea.title)}</h4>
                    <p>${escapeHtml(idea.description)}</p>
                    <div class="ideation-meta">
                        <span class="ideation-priority ${idea.priority.toLowerCase()}">${escapeHtml(idea.priority)} Priority</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading ideation:', error);
    }
}

async function loadChangelog() {
    const timeline = document.getElementById('changelog-timeline');
    if (!timeline) return;
    
    if (!currentProjectId) {
        timeline.innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view changelog</p></div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/changelog`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const changelog = await response.json();
        
        const newContent = (!changelog || changelog.length === 0)
            ? '<div class="empty-state"><h3>No changelog entries</h3><p>Changelog will appear here as tasks are completed</p></div>'
            : changelog.map(entry => {
                const date = new Date(entry.date || Date.now());
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                const typeClass = entry.type || 'feature';
                const statusBadge = entry.status ? `<span class="changelog-status ${entry.status}">${escapeHtml(entry.status)}</span>` : '';
                return `
                    <div class="changelog-entry ${typeClass}">
                        <div class="changelog-date">${escapeHtml(dateStr)} ${statusBadge}</div>
                        <div class="changelog-content">
                            <h4>${escapeHtml(entry.title || 'Update')}</h4>
                            ${entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ''}
                            ${entry.task_id ? `<div class="changelog-task-id">Task: ${escapeHtml(entry.task_id)}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        smoothUpdate(timeline, newContent);
    } catch (error) {
        console.error('Error loading changelog:', error);
        smoothUpdate(timeline, `<div class="empty-state"><h3>Error loading changelog</h3><p>${escapeHtml(error.message)}</p></div>`);
    }
}

async function loadGitHubIssues() {
    const container = document.getElementById('github-issues-content');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE}/github/issues`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const issues = await response.json();
        
        const newContent = (!issues || issues.length === 0)
            ? `
                <div class="empty-state">
                    <h3>No issues found</h3>
                    <p>Issues from <a href="https://github.com/ethanstoner/auto-cursor" target="_blank">ethanstoner/auto-cursor</a> will appear here</p>
                </div>
            `
            : `
                <div class="github-issues-list">
                    ${issues.map(issue => `
                        <div class="github-issue-item ${issue.state}">
                            <div class="issue-header">
                                <h4>
                                    <a href="${escapeHtml(issue.html_url)}" target="_blank">${escapeHtml(issue.title)}</a>
                                    ${issue.state === 'open' ? '<span class="issue-badge open">Open</span>' : '<span class="issue-badge closed">Closed</span>'}
                                </h4>
                                <span class="issue-number">#${issue.number}</span>
                            </div>
                            ${issue.body ? `<p class="issue-body">${escapeHtml(issue.body.substring(0, 200))}${issue.body.length > 200 ? '...' : ''}</p>` : ''}
                            <div class="issue-meta">
                                <span>${escapeHtml(issue.user?.login || 'Unknown')}</span>
                                <span>${new Date(issue.created_at).toLocaleDateString()}</span>
                                ${issue.labels && issue.labels.length > 0 ? `
                                    <div class="issue-labels">
                                        ${issue.labels.map(label => `<span class="issue-label" style="background: #${label.color || '666'}">${escapeHtml(label.name)}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        smoothUpdate(container, newContent);
    } catch (error) {
        console.error('Error loading GitHub issues:', error);
        smoothUpdate(container, `
            <div class="empty-state">
                <h3>Error loading issues</h3>
                <p>${escapeHtml(error.message)}</p>
                <p><a href="https://github.com/ethanstoner/auto-cursor/issues" target="_blank">View on GitHub</a></p>
            </div>
        `);
    }
}

async function loadWorktrees() {
    if (!currentProjectId) {
        const list = document.getElementById('worktrees-list');
        if (list) {
            list.innerHTML = '<div class="empty-state"><h3>Select a project</h3><p>Choose a project to view worktrees</p></div>';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/worktrees`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const worktrees = await response.json();
        
        const list = document.getElementById('worktrees-list');
        if (!list) return;
        
        const newContent = (!worktrees || worktrees.length === 0)
            ? '<div class="empty-state"><h3>No worktrees</h3><p>Worktrees will appear here when tasks are running</p></div>'
            : worktrees.map(wt => {
                const date = new Date(wt.created || Date.now());
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                // Extract task ID from worktree name (e.g., "auto-cursor-auto-cursor-web-web-1" -> "web-1")
                let taskId = wt.task_id || wt.id;
                // Extract task ID from worktree name
                // Format: auto-cursor-auto-cursor-web-web-1 -> web-1
                if (taskId && taskId.includes('-')) {
                    const parts = taskId.split('-');
                    // Look for pattern like "web-1", "web-2" in the parts
                    for (let i = parts.length - 1; i >= 0; i--) {
                        if (/^[a-z]+-\d+$/.test(parts[i])) {
                            taskId = parts[i];
                            break;
                        }
                    }
                    // If not found, try to extract from end
                    if (taskId === wt.task_id || taskId === wt.id) {
                        const lastParts = parts.slice(-2);
                        if (lastParts.length === 2 && /^\d+$/.test(lastParts[1])) {
                            taskId = `${lastParts[0]}-${lastParts[1]}`;
                        }
                    }
                }
                return `
                    <div class="worktree-item">
                        <div class="worktree-header">
                            <h4>${escapeHtml(taskId)}</h4>
                            <span class="worktree-branch">${escapeHtml(wt.branch || 'unknown')}</span>
                        </div>
                        <div class="worktree-meta">
                            <span>Created: ${escapeHtml(dateStr)}</span>
                            <span class="worktree-path">${escapeHtml(wt.path || '')}</span>
                        </div>
                    </div>
                `;
            }).join('');
        
        smoothUpdate(list, newContent);
    } catch (error) {
        console.error('Error loading worktrees:', error);
        const list = document.getElementById('worktrees-list');
        if (list) {
            smoothUpdate(list, `<div class="empty-state"><h3>Error loading worktrees</h3><p>${escapeHtml(error.message)}</p></div>`);
        }
    }
}

function loadSettings() {
    // Load settings from localStorage or API
    const refreshInterval = localStorage.getItem('refreshInterval') || '3';
    const defaultProject = localStorage.getItem('defaultProject') || '';
    
    const intervalInput = document.getElementById('setting-refresh-interval');
    if (intervalInput) intervalInput.value = refreshInterval;
    
    // Load projects for default project select
    loadProjectsForSettings();
}

async function loadProjectsForSettings() {
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const projects = await response.json();
        
        const select = document.getElementById('setting-default-project');
        if (select) {
            select.innerHTML = '<option value="">None</option>' +
                projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.id)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading projects for settings:', error);
    }
}

// Modals
function initializeModals() {
    // Close buttons
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', () => {
            close.closest('.modal').style.display = 'none';
        });
    });
    
    // Close on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // New project form
    document.getElementById('new-project-form')?.addEventListener('submit', async (e) => {
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
                loadProjectsForSidebar();
                if (!currentProjectId) {
                    currentProjectId = id;
                    document.getElementById('sidebar-project-select').value = id;
                    loadViewData(currentView);
                }
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
    
    // Plan form
    document.getElementById('plan-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goal = document.getElementById('plan-goal').value;
        
        if (!currentProjectId || !goal) {
            alert('Please select a project and provide a goal');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        try {
            const response = await fetch(`${API_BASE}/projects/${currentProjectId}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal })
            });
            
            if (response.ok) {
                document.getElementById('plan-modal').style.display = 'none';
                document.getElementById('plan-goal').value = '';
                loadKanban();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Plan';
        }
    });
    
    // New task form
    document.getElementById('new-task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Placeholder - would create task via API
        alert('Task creation will be implemented with backend API');
        document.getElementById('new-task-modal').style.display = 'none';
    });
}

// Project Management
async function loadProjectsForSidebar() {
    console.log('📋 Loading projects for sidebar...');
    try {
        console.log('📋 Loading projects from API...');
        console.log(`API_BASE: ${API_BASE}`);
        
        // Use absolute URL to avoid any path issues
        const apiUrl = `${API_BASE}/projects`;
        console.log(`Fetching from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-cache'
        });
        
        console.log(`Response status: ${response.status}, ok: ${response.ok}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API error: ${response.status} - ${errorText}`);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const projects = await response.json();
        console.log(`✅ API returned ${projects ? projects.length : 0} projects:`, JSON.stringify(projects, null, 2));
        
        // Wait for DOM to be ready
        let select = document.getElementById('sidebar-project-select');
        let retries = 0;
        const maxRetries = 10;
        
        while (!select && retries < maxRetries) {
            console.log(`⏳ Waiting for select element (attempt ${retries + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            select = document.getElementById('sidebar-project-select');
            retries++;
        }
        
        if (!select) {
            console.error('❌ Project select element not found in DOM after retries');
            // Try one more time with a longer delay
            setTimeout(() => {
                const retrySelect = document.getElementById('sidebar-project-select');
                if (retrySelect) {
                    console.log('✅ Found select element on final retry');
                    populateProjectSelect(retrySelect, projects);
                } else {
                    console.error('❌ Still not found after all retries');
                }
            }, 500);
            return;
        }
        
        console.log('✅ Found select element, populating...');
        console.log('Select element details:', {
            id: select.id,
            className: select.className,
            optionsLength: select.options.length,
            parentElement: select.parentElement?.tagName
        });
        populateProjectSelect(select, projects);
        
        // Verify it worked
        setTimeout(() => {
            const verifySelect = document.getElementById('sidebar-project-select');
            if (verifySelect) {
                console.log(`✅ Verification: Select now has ${verifySelect.options.length} options`);
                Array.from(verifySelect.options).forEach((opt, idx) => {
                    console.log(`   Option ${idx}: value="${opt.value}", text="${opt.textContent}"`);
                });
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        const select = document.getElementById('sidebar-project-select');
        if (select) {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = `Error: ${error.message}`;
            errorOption.disabled = true;
            select.innerHTML = '';
            select.appendChild(errorOption);
        }
    }
}

function populateProjectSelect(select, projects) {
    if (!select) {
        console.error('❌ Select element is null in populateProjectSelect');
        return;
    }
    
    console.log(`📋 populateProjectSelect called with ${projects ? projects.length : 0} projects`);
    console.log('Projects data:', JSON.stringify(projects, null, 2));
    console.log('Select element:', select);
    console.log('Select parent:', select.parentElement);
    
    // Clear existing options - use removeChild for better compatibility
    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select project...';
    select.appendChild(defaultOption);
    
    // Add projects
    if (projects && Array.isArray(projects) && projects.length > 0) {
        projects.forEach((project, index) => {
            const option = document.createElement('option');
            const projectId = project.id || project.name || `project-${index}`;
            const projectName = project.name || project.id || 'Unknown Project';
            option.value = projectId;
            option.textContent = projectName;
            select.appendChild(option);
            console.log(`   ✅ Added option ${index + 1}: value="${projectId}", text="${projectName}"`);
        });
        
        console.log(`✅ Populated ${projects.length} projects in selector`);
        console.log(`Select now has ${select.options.length} total options`);
        
        // Force a visual update with multiple methods
        select.style.display = 'none';
        void select.offsetHeight; // Trigger reflow
        select.style.display = '';
        
        // Also trigger change event to ensure UI updates
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Set current project if available
        if (currentProjectId) {
            select.value = currentProjectId;
            console.log(`   Set current project to: ${currentProjectId}`);
        } else if (projects.length === 1) {
            // Auto-select if only one project
            const singleProjectId = projects[0].id || projects[0].name;
            select.value = singleProjectId;
            currentProjectId = singleProjectId;
            console.log(`   Auto-selected single project: ${currentProjectId}`);
            // Load view data for auto-selected project
            setTimeout(() => {
                loadViewData(currentView);
            }, 100);
        }
        
        // Final verification
        console.log(`✅ Final check: Select has ${select.options.length} options`);
        console.log(`   Selected value: "${select.value}"`);
        Array.from(select.options).forEach((opt, idx) => {
            console.log(`   [${idx}] "${opt.value}" = "${opt.textContent}"`);
        });
    } else {
        // No projects found
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No projects found';
        option.disabled = true;
        select.appendChild(option);
        console.warn('⚠️ No projects found in API response (empty array or null)');
        console.warn('Projects value:', projects);
        console.warn('Projects type:', typeof projects);
        console.warn('Is array?', Array.isArray(projects));
    }
}

// Stats Management - Smooth updates without flashing
function updateStats(projects, agents, running, completed) {
    console.log(`Updating stats: projects=${projects}, agents=${agents}, running=${running}, completed=${completed}`);
    
    const projectsEl = document.getElementById('stat-projects');
    const agentsEl = document.getElementById('stat-agents');
    const runningEl = document.getElementById('stat-running');
    const completedEl = document.getElementById('stat-completed');
    
    // Update with smooth transitions (no innerHTML, just textContent)
    // ALWAYS update, even if value is 0
    if (projectsEl) {
        const newValue = projects !== null && projects !== undefined ? String(projects) : '0';
        projectsEl.style.transform = 'scale(1.1)';
        projectsEl.textContent = newValue;
        setTimeout(() => {
            projectsEl.style.transform = 'scale(1)';
            projectsEl.style.transition = 'transform 0.2s ease';
        }, 50);
    }
    
    if (agentsEl) {
        const newValue = agents !== null && agents !== undefined ? String(agents) : '0';
        agentsEl.style.transform = 'scale(1.1)';
        agentsEl.textContent = newValue;
        setTimeout(() => {
            agentsEl.style.transform = 'scale(1)';
            agentsEl.style.transition = 'transform 0.2s ease';
        }, 50);
    }
    
    if (runningEl) {
        const newValue = running !== null && running !== undefined ? String(running) : '0';
        runningEl.style.transform = 'scale(1.1)';
        runningEl.textContent = newValue;
        setTimeout(() => {
            runningEl.style.transform = 'scale(1)';
            runningEl.style.transition = 'transform 0.2s ease';
        }, 50);
    }
    
    if (completedEl) {
        const newValue = completed !== null && completed !== undefined ? String(completed) : '0';
        completedEl.style.transform = 'scale(1.1)';
        completedEl.textContent = newValue;
        setTimeout(() => {
            completedEl.style.transform = 'scale(1)';
            completedEl.style.transition = 'transform 0.2s ease';
        }, 50);
    }
}

async function refreshStats() {
    // Stale-while-revalidate: keep old stats visible while fetching
    const cachedStats = dataCache.stats;
    let isRefreshing = cachedStats !== null;
    
    try {
        console.log('📊 Refreshing stats...');
        
        // Get projects
        const projectsRes = await fetch(`${API_BASE}/projects`, {cache: 'no-cache'});
        if (!projectsRes.ok) {
            throw new Error(`Projects API returned ${projectsRes.status}`);
        }
        const projects = await projectsRes.json();
        
        // Get agents - use all agents for stats (but filter by project for display)
        let agents = [];
        let running = 0;
        let completed = 0;
        
        // Always get all agents for stats display
        const agentsRes = await fetch(`${API_BASE}/agents`, {cache: 'no-cache'});
        if (agentsRes.ok) {
            agents = await agentsRes.json();
        }
        
        // If project selected, get project-specific counts
        if (currentProjectId) {
            const statusRes = await fetch(`${API_BASE}/projects/${currentProjectId}/status`, {cache: 'no-cache'});
            if (statusRes.ok) {
                const status = await statusRes.json();
                const tasks = status.tasks || [];
                running = tasks.filter(t => t.status === 'running').length;
                completed = tasks.filter(t => t.status === 'completed').length;
                // Use task count for agents count when project is selected
                agents = tasks; // Show tasks as "agents" for current project
            }
        } else {
            // No project selected - use all agents
            running = agents.filter(a => a.status === 'running').length;
            completed = agents.filter(a => a.status === 'completed').length;
        }
        
        // Cache stats
        const projectsCount = projects ? projects.length : 0;
        const agentsCount = agents ? agents.length : 0;
        dataCache.stats = { projects: projectsCount, agents: agentsCount, running, completed };
        dataCache.lastFetch.stats = Date.now();
        
        console.log(`✅ Loaded ${projectsCount} projects, ${agentsCount} agents for current project`);
        console.log(`Stats: ${projectsCount} projects, ${agentsCount} agents, ${running} running, ${completed} completed`);
        
        // Update stats (smooth transition, no flash) - ALWAYS update
        updateStats(projectsCount, agentsCount, running, completed);
    } catch (error) {
        console.error('❌ Error refreshing stats:', error);
        console.error('Error details:', error.stack);
        
        // On error, keep cached stats if available, otherwise show 0
        if (cachedStats) {
            updateStats(cachedStats.projects, cachedStats.agents, cachedStats.running, cachedStats.completed);
        } else {
            updateStats(0, 0, 0, 0);
        }
    }
}

// Refresh Management
function startRefresh(name, callback, interval) {
    stopRefresh(name);
    // Call immediately, then set interval
    try {
        callback();
    } catch (error) {
        console.error(`Error in initial callback for ${name}:`, error);
    }
    refreshIntervals[name] = setInterval(() => {
        try {
            callback();
        } catch (error) {
            console.error(`Error in refresh for ${name}:`, error);
        }
    }, interval);
}

function stopRefresh(name) {
    if (refreshIntervals[name]) {
        clearInterval(refreshIntervals[name]);
        delete refreshIntervals[name];
    }
}

function startGlobalRefresh() {
    // Refresh stats every 10 seconds
    setInterval(refreshStats, 10000);
    
    // Initial load (async, but don't block)
    refreshStats();
    // Projects already loaded in loadInitialData, but refresh periodically
    setInterval(() => {
        loadProjectsForSidebar().catch(err => console.error('Error loading projects:', err));
    }, 30000); // Refresh projects every 30 seconds
}

// Initial Data Load
async function loadInitialData() {
    console.log('📊 Loading initial data...');
    try {
        // Load projects first (await to ensure they're loaded)
        console.log('Loading projects...');
        await loadProjectsForSidebar();
        console.log('Loading stats...');
        await refreshStats();
        console.log('✅ Initial data loaded');
        
        // Load current view
        if (currentProjectId) {
            console.log(`Loading view data for project: ${currentProjectId}`);
            loadViewData(currentView);
        }
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateElement(id, content) {
    const el = document.getElementById(id);
    if (el) el.textContent = content;
}

// Task Actions
async function startTask(taskId) {
    if (!currentProjectId) return;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${currentProjectId}/start`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadKanban();
            loadAgentTerminals();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function viewTaskLogs(taskId) {
    // Switch to agents view and highlight this agent
    switchView('agents');
    // Scroll to the agent terminal for this task
    setTimeout(() => {
        const agentTerminal = document.querySelector(`[data-agent-id="${taskId}"]`);
        if (agentTerminal) {
            agentTerminal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            agentTerminal.style.border = '2px solid rgba(255, 193, 7, 0.8)';
            setTimeout(() => {
                agentTerminal.style.border = '';
            }, 3000);
        }
    }, 500);
}

// Global functions for onclick handlers
window.createPlan = function(projectId) {
    currentProjectId = projectId;
    document.getElementById('sidebar-project-select').value = projectId;
    document.getElementById('plan-modal').style.display = 'block';
};

window.startProject = async function(projectId) {
    currentProjectId = projectId;
    document.getElementById('sidebar-project-select').value = projectId;
    await startTask(null);
};

window.viewKanban = function(projectId) {
    currentProjectId = projectId;
    document.getElementById('sidebar-project-select').value = projectId;
    switchView('kanban');
};

// Refresh buttons
document.getElementById('refresh-kanban-btn')?.addEventListener('click', () => {
    loadKanban();
});

document.getElementById('refresh-agents-btn')?.addEventListener('click', () => {
    loadAgentTerminals();
});

// Agent search and filter
document.getElementById('agent-search-input')?.addEventListener('input', (e) => {
    agentSearchFilter = e.target.value;
    loadAgentTerminals();
});

document.getElementById('agent-filter-status')?.addEventListener('change', (e) => {
    agentStatusFilter = e.target.value;
    loadAgentTerminals();
});

// Roadmap view selector
document.getElementById('roadmap-view-select')?.addEventListener('change', (e) => {
    // Would filter roadmap by view type
    console.log('Roadmap view:', e.target.value);
});

// Settings handlers
document.getElementById('setting-refresh-interval')?.addEventListener('change', (e) => {
    localStorage.setItem('refreshInterval', e.target.value);
    // Restart refresh with new interval
    if (refreshIntervals[currentView]) {
        const callback = refreshIntervals[currentView].callback;
        startRefresh(currentView, callback, parseInt(e.target.value) * 1000);
    }
});

document.getElementById('setting-default-project')?.addEventListener('change', (e) => {
    localStorage.setItem('defaultProject', e.target.value);
});
