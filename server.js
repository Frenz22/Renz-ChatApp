const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectDB = require('./database');
const Message = require('./models/Message');
const User = require('./models/User');
const Task = require('./models/Task');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB
connectDB();

// Store connected users (in-memory for real-time tracking)
const connectedUsers = {};

// Serve login page as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Redirect to login if trying to access chat without auth
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate username
    if (!username || username.length < 3 || username.length > 15) {
      return res.status(400).json({ error: 'Username must be 3-15 characters' });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }
    
    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Determine role (first user becomes admin)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';
    
    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      password,
      role
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id,
        username: newUser.username,
        role: newUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      message: 'User created successfully',
      token,
      user: {
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/auth/guest', async (req, res) => {
  try {
    const username = 'guest';
    const password = '123456';
    let user = await User.findOne({ username });

    if (!user) {
      user = new User({ username, password, role: 'user' });
      await user.save();
    } else if (!await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Guest account credentials are invalid' });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Guest login successful',
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Server error during guest login' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate username
    if (!username || username.length < 3 || username.length > 15) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    
    // Validate password
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if user has password (migration check)
    if (!user.password) {
      console.log(`User ${user.username} has no password - rejecting login`);
      return res.status(401).json({ error: 'Account requires password reset. Please create a new account.' });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ 
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// API endpoint to get chat history
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// API endpoint to get all users (for task assignment)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Task endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const { userId } = req.query;
    
    let tasks;
    if (userId) {
      // Filter tasks: show only where user is tagger or assigned
      tasks = await Task.find({
        $or: [
          { taggedBy: userId },
          { assignedTo: userId }
        ]
      }).sort({ createdAt: -1 }).populate('taggedBy assignedTo', 'username');
    } else {
      tasks = await Task.find().sort({ createdAt: -1 }).populate('taggedBy assignedTo', 'username');
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { messageId, messageText, senderName, taggedBy, assignedTo } = req.body;
    
    // Validate required fields
    if (!messageId || !messageText || !senderName || !taggedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if task already exists for this message
    const existingTask = await Task.findOne({ messageId });
    if (existingTask) {
      return res.status(400).json({ error: 'Task already exists for this message' });
    }
    
    // Create new task
    const newTask = new Task({
      messageId,
      messageText,
      senderName,
      taggedBy,
      assignedTo: assignedTo || [],
      status: 'open'
    });
    
    await newTask.save();
    
    // Populate before broadcasting so clients get full user objects, not just IDs
    await newTask.populate('taggedBy assignedTo', 'username');
    
    // Broadcast new task to all connected clients
    io.emit('new_task', newTask);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Server error during task creation' });
  }
});

app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status !== 'open' && status !== 'done') {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is authorized (must be creator or assignee)
    const isCreator = task.taggedBy.toString() === req.user.userId;
    const isAssignee = task.assignedTo && task.assignedTo.some(id => id.toString() === req.user.userId);
    
    if (!isCreator && !isAssignee) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    
    task.status = status;
    if (status === 'done') {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }
    
    await task.save();
    
    // Populate before broadcasting
    await task.populate('taggedBy assignedTo', 'username');
    
    // Broadcast task update to all connected clients
    io.emit('task_updated', task);
    
    res.json(task);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Server error during task update' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is authorized to delete (only creator can delete)
    if (task.taggedBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the task creator can delete this task' });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    // Broadcast task deletion to all connected clients
    io.emit('task_deleted', req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({ error: 'Server error during task deletion' });
  }
});

// Handle socket connections
io.on('connection', async (socket) => {
  console.log('New socket connection:', socket.id);
  
  // Get token from client
  const token = socket.handshake.query.token;
  
  if (!token) {
    console.log('Connection rejected: No token provided');
    socket.emit('error', { message: 'Authentication required' });
    socket.disconnect();
    return;
  }
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user in database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('Connection rejected: User not found');
      socket.emit('error', { message: 'User not found' });
      socket.disconnect();
      return;
    }
    
    // Store in connected users
    connectedUsers[socket.id] = {
      socketId: socket.id,
      userId: user._id,
      username: user.username,
      role: user.role,
      connectedAt: new Date()
    };
    
    console.log(`User connected: ${user.username} (${user.role})`);
    
    // Send user info to client
    socket.emit('user_info', {
      userId: user._id,
      username: user.username,
      role: user.role
    });
    
    // Send chat history to the new user
    const messageHistory = await Message.find().sort({ timestamp: 1 }).limit(100);
    socket.emit('chat_history', messageHistory);
    
    // Broadcast updated user list to all clients
    const onlineUsers = Object.values(connectedUsers).map(u => ({
      userId: u.userId,
      username: u.username,
      role: u.role
    }));
    io.emit('users_list', onlineUsers);
    
    // Notify others that a user joined
    socket.broadcast.emit('system_message', {
      message: `${user.username} joined the chat`,
      timestamp: new Date()
    });
    
    // Handle incoming messages
    socket.on('chat_message', async (data) => {
      const connectedUser = connectedUsers[socket.id];
      if (connectedUser) {
        try {
          // Save message to database
          const newMessage = new Message({
            senderId: connectedUser.userId,
            senderName: connectedUser.username,
            senderRole: connectedUser.role,
            content: data.content.trim(),
            timestamp: new Date()
          });
          
          await newMessage.save();
          
          // Broadcast message to all clients
          io.emit('chat_message', {
            id: newMessage._id,
            senderId: newMessage.senderId,
            senderName: newMessage.senderName,
            senderRole: newMessage.senderRole,
            content: newMessage.content,
            timestamp: newMessage.timestamp
          });
          
        } catch (error) {
          console.error('Error saving message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      const connectedUser = connectedUsers[socket.id];
      if (connectedUser) {
        console.log(`User disconnected: ${connectedUser.username}`);
        
        // Update last seen in database
        await User.findOneAndUpdate(
          { username: connectedUser.username },
          { lastSeen: new Date() }
        );
        
        // Notify others that user left
        io.emit('system_message', {
          message: `${connectedUser.username} left the chat`,
          timestamp: new Date()
        });
        
        // Remove from connected users
        delete connectedUsers[socket.id];
        
        // Broadcast updated user list
        const remainingUsers = Object.values(connectedUsers).map(u => ({
          username: u.username,
          role: u.role
        }));
        io.emit('users_list', remainingUsers);
      }
    });
    
  } catch (error) {
    console.error('Error handling connection:', error);
    socket.emit('error', { message: 'Connection error' });
    socket.disconnect();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Open this URL in your browser to use the chat app');
});