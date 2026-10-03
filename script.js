// MERN Stack Chat App with Username Authentication and Task Tagging
let socket;
let currentUser = null;
let messages = [];
let tasks = [];
let users = [];
let username = null;
let token = null;

// Initialize the app
function init() {
    // Check if user is logged in
    username = localStorage.getItem('chat_username');
    token = localStorage.getItem('chat_token');
    
    if (!username || !token) {
        // Redirect to login if not authenticated
        window.location.href = '/login.html';
        return;
    }
    
    connectToServer();
    setupEventListeners();
    setupLogout();
    loadUsers();
}

// Connect to Socket.io server with token
function connectToServer() {
    socket = io({
        query: { token: token }
    });
    
    // When connected, receive user info from server
    socket.on('user_info', (user) => {
        currentUser = user;
        updateUserInfo();
        loadTasks(); // Only load tasks once currentUser.userId is actually available
    });
    
    // Receive chat history
    socket.on('chat_history', (history) => {
        messages = history;
        renderMessages();
    });
    
    // Receive updated users list
    socket.on('users_list', (users) => {
        renderOnlineUsers(users);
    });
    
    // Receive new chat messages
    socket.on('chat_message', (message) => {
        messages.push(message);
        renderMessages();
    });
    
    // Receive system messages (join/leave notifications)
    socket.on('system_message', (data) => {
        addSystemMessage(data.message);
    });
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        addSystemMessage('Connection error. Please refresh the page.');
    });
    
    // Handle server errors
    socket.on('error', (data) => {
        console.error('Server error:', data);
        if (data.message === 'Authentication required' || data.message === 'User not found') {
            // Clear invalid session and redirect to login
            localStorage.removeItem('chat_username');
            window.location.href = '/login.html';
        } else {
            addSystemMessage('Error: ' + data.message);
        }
    });
    
    // Task-related socket events
    socket.on('new_task', (task) => {
        tasks.push(task);
        renderTasks();
    });
    
    socket.on('task_updated', (task) => {
        const index = tasks.findIndex(t => t._id === task._id);
        if (index !== -1) {
            tasks[index] = task;
            renderTasks();
        }
    });
    
    socket.on('task_deleted', (taskId) => {
        tasks = tasks.filter(t => t._id !== taskId);
        renderTasks();
    });
}

// Setup logout functionality
function setupLogout() {
    const chatHeaderContent = document.querySelector('.chat-header-content');
    
    // Add logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 5px 15px;
        border-radius: 3px;
        cursor: pointer;
        margin-left: auto;
        font-size: 12px;
    `;
    
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('chat_username');
        localStorage.removeItem('chat_token');
        if (socket) {
            socket.disconnect();
        }
        window.location.href = '/login.html';
    });
    
    chatHeaderContent.appendChild(logoutBtn);
}

// Update user info in the UI
function updateUserInfo() {
    const chatHeader = document.querySelector('.chat-header p');
    if (currentUser) {
        const roleText = currentUser.role === 'admin' ? '(Admin)' : '';
        chatHeader.textContent = `Welcome to the chat! You are logged in as ${currentUser.username} ${roleText}.`;
    }
}

// Render online users
function renderOnlineUsers(users) {
    const onlineUsersContainer = document.getElementById('onlineUsers');
    
    if (!users || users.length === 0) {
        onlineUsersContainer.innerHTML = '<div class="empty-state">Connecting...</div>';
        return;
    }
    
    onlineUsersContainer.innerHTML = '';
    
    // Add you first
    if (currentUser) {
        const userElement = document.createElement('div');
        userElement.className = `user ${currentUser.role}`;
        userElement.dataset.user = currentUser.username;
        userElement.innerHTML = `
            <span class="status"></span>
            <span class="username">${currentUser.username} (You)</span>
        `;
        onlineUsersContainer.appendChild(userElement);
    }
    
    // Add other users
    users.forEach(user => {
        if (user.username !== currentUser?.username) {
            const userElement = document.createElement('div');
            userElement.className = `user ${user.role}`;
            userElement.dataset.user = user.username;
            userElement.innerHTML = `
                <span class="status"></span>
                <span class="username">${user.username}</span>
            `;
            onlineUsersContainer.appendChild(userElement);
        }
    });
}

// Render messages
function renderMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="empty-state">No messages yet. Start the conversation!</div>';
        return;
    }
    
    messagesContainer.innerHTML = messages.map(msg => {
        const isSent = msg.senderId === currentUser?.userId;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageId = msg._id || msg.id;
        
        // Check if this message is already tagged as a task
        const isTagged = tasks.some(task => task.messageId && task.messageId.toString() === messageId.toString());
        
        // Safe escape for onclick attributes
        const safeContent = escapeHtml(msg.content).replace(/'/g, "\\'").replace(/"/g, '\\"');
        const safeSender = escapeHtml(msg.senderName).replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="sender">${msg.senderName}</div>
                <div class="content">${escapeHtml(msg.content)}</div>
                <div class="timestamp">${time}</div>
                ${!isTagged ? `<button class="tag-btn" onclick="openTaskModal('${messageId}', '${safeContent}', '${safeSender}')">📌 Tag as Task</button>` : '<span class="tag-btn tagged">✓ Tagged</span>'}
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add system message (join/leave notifications)
function addSystemMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Remove empty state if it exists
    const emptyState = messagesContainer.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const systemElement = document.createElement('div');
    systemElement.className = 'system-message';
    systemElement.textContent = message;
    messagesContainer.appendChild(systemElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
function sendMessage(content) {
    if (!content.trim() || !socket) return;
    
    socket.emit('chat_message', {
        content: content.trim()
    });
}

// Setup event listeners
function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    sendButton.addEventListener('click', () => {
        sendMessage(messageInput.value);
        messageInput.value = '';
        messageInput.focus();
    });
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value);
            messageInput.value = '';
        }
    });
    
    // Setup modal event listeners
    setupModalListeners();
}

// Setup modal listeners
function setupModalListeners() {
    const modal = document.getElementById('taskModal');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.btn-cancel');
    const confirmBtn = document.querySelector('.btn-confirm');
    const selectAllUsers = document.getElementById('selectAllUsers');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const messageId = confirmBtn.dataset.messageId;
            const messageText = document.getElementById('modalMessageText').textContent;
            const senderName = confirmBtn.dataset.senderName;
            tagMessage(messageId, messageText, senderName);
        });
    }
    
    // Setup select all functionality
    if (selectAllUsers) {
        selectAllUsers.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Open task assignment modal
function openTaskModal(messageId, messageText, senderName) {
    const modal = document.getElementById('taskModal');
    const modalMessageText = document.getElementById('modalMessageText');
    const userCheckboxes = document.getElementById('userCheckboxes');
    const selectAllUsers = document.getElementById('selectAllUsers');
    const confirmBtn = document.querySelector('.btn-confirm');
    
    // Set message text
    modalMessageText.textContent = messageText;
    
    // Set data for task creation
    confirmBtn.dataset.messageId = messageId;
    confirmBtn.dataset.senderName = senderName;
    
    // Populate user checkboxes
    userCheckboxes.innerHTML = users.map(user => {
        const isCurrentUser = user._id === currentUser.userId;
        return `
            <div class="user-checkbox-item ${isCurrentUser ? 'current-user' : ''}">
                <input type="checkbox" 
                       class="user-checkbox" 
                       value="${user._id}" 
                       ${isCurrentUser ? 'checked' : ''}>
                <label>${user.username}${isCurrentUser ? ' (You)' : ''}</label>
            </div>
        `;
    }).join('');
    
    // Show modal
    modal.style.display = 'block';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load tasks from API
async function loadTasks() {
    try {
        const response = await fetch(`/api/tasks?userId=${currentUser.userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        tasks = data;
        renderTasks();
        renderMessages(); // Update tag buttons
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Load users for task assignment
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        users = data;
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Render tasks in sidebar
function renderTasks() {
    const taskList = document.getElementById('taskList');
    
    if (tasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks yet</div>';
        return;
    }
    
    taskList.innerHTML = tasks.map(task => {
        const statusClass = task.status;
        const statusText = task.status.charAt(0).toUpperCase() + task.status.slice(1);
        const time = new Date(task.createdAt).toLocaleDateString();
        
        // Get assignee names
        const assigneeNames = task.assignedTo && task.assignedTo.length > 0 
            ? task.assignedTo.map(u => u.username).join(', ')
            : 'Unassigned';
        
        // Check if current user is the creator
        const isCreator = task.taggedBy && task.taggedBy._id === currentUser.userId;
        
        return `
            <div class="task" data-task-id="${task._id}">
                <div class="task-header">
                    <span class="task-status ${statusClass}">${statusText}</span>
                </div>
                <div class="task-text">${escapeHtml(task.messageText)}</div>
                <div class="task-meta">
                    <span>From: ${task.senderName}</span>
                    <span>Assigned: ${assigneeNames}</span>
                </div>
                <div class="task-meta">
                    <span>${time}</span>
                </div>
                <div class="task-actions">
                    ${task.status === 'open' ? 
                        `<button class="task-btn complete" onclick="updateTaskStatus('${task._id}', 'done')">Complete</button>` :
                        `<button class="task-btn complete" onclick="updateTaskStatus('${task._id}', 'open')">Reopen</button>`
                    }
                    ${isCreator ? `<button class="task-btn delete" onclick="deleteTask('${task._id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Tag a message as a task
async function tagMessage(messageId, messageText, senderName) {
    try {
        // Get selected assignees from checkboxes
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const selectedAssignees = Array.from(checkboxes).map(checkbox => checkbox.value);
        
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messageId,
                messageText,
                senderName,
                taggedBy: currentUser.userId,
                assignedTo: selectedAssignees
            })
        });
        
        if (response.ok) {
            const task = await response.json();
            console.log('Task created:', task);
            // Reload tasks
            loadTasks();
            // Close the modal
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.style.display = 'none';
            }
        } else {
            const error = await response.json();
            console.error('Error creating task:', error);
            alert(error.error || 'Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task');
    }
}

// Update task status
async function updateTaskStatus(taskId, status) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            const task = await response.json();
            const index = tasks.findIndex(t => t._id === taskId);
            if (index !== -1) {
                tasks[index] = task;
                renderTasks();
            }
        } else {
            const error = await response.json();
            console.error('Error updating task:', error);
            alert(error.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task');
    }
}

// Delete a task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            tasks = tasks.filter(t => t._id !== taskId);
            renderTasks();
        } else {
            const error = await response.json();
            console.error('Error deleting task:', error);
            alert(error.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
    }
}

// Make functions globally available
window.tagMessage = tagMessage;
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;
window.openTaskModal = openTaskModal;

init();