// Login/Signup Logic with Password Authentication
let currentTab = 'login';

// Initialize
function init() {
    setupTabs();
    setupForm();
    setupPasswordToggles();
}

// Setup tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            currentTab = tab.dataset.tab;
            updateFormForTab();
        });
    });
}

// Update form based on current tab
function updateFormForTab() {
    const signupFields = document.getElementById('signupFields');
    const submitBtn = document.getElementById('submitBtn');
    const confirmPassword = document.getElementById('confirmPassword');
    const messageDiv = document.getElementById('message');
    
    // Clear error message when switching tabs
    messageDiv.textContent = '';
    messageDiv.className = 'message';
    
    if (currentTab === 'signup') {
        signupFields.classList.remove('hidden');
        submitBtn.textContent = 'Sign Up';
        confirmPassword.required = true;
    } else {
        signupFields.classList.add('hidden');
        submitBtn.textContent = 'Login';
        confirmPassword.required = false;
        confirmPassword.value = '';
    }
}

// Setup form submission
function setupForm() {
    const form = document.getElementById('authForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const messageDiv = document.getElementById('message');
        
        // Clear previous messages
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        
        // Validation
        if (username.length < 3 || username.length > 15) {
            showMessage('Username must be 3-15 characters', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (currentTab === 'signup') {
            // Check if username contains only valid characters
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                showMessage('Username can only contain letters, numbers, and underscores', 'error');
                return;
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            // Attempt signup
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage('Account created! Redirecting to chat...', 'success');
                    setTimeout(() => {
                        localStorage.setItem('chat_token', data.token);
                        localStorage.setItem('chat_username', username);
                        window.location.href = '/index.html';
                    }, 1500);
                } else {
                    showMessage(data.error || 'Signup failed', 'error');
                }
            } catch (error) {
                showMessage('Connection error. Please try again.', 'error');
            }
        } else {
            // Attempt login
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage('Login successful! Redirecting to chat...', 'success');
                    setTimeout(() => {
                        localStorage.setItem('chat_token', data.token);
                        localStorage.setItem('chat_username', username);
                        window.location.href = '/index.html';
                    }, 1500);
                } else {
                    showMessage(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                showMessage('Connection error. Please try again.', 'error');
            }
        }
    });
}

// Show message to user
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
}

// Setup password toggle buttons
function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                button.textContent = '🙈'; // Hide icon
            } else {
                passwordInput.type = 'password';
                button.textContent = '👁️'; // Show icon
            }
        });
    });
}

// Start the app
init();