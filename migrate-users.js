// Migration script to handle users without passwords
// Run this with: node migrate-users.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Simple User schema for migration
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function migrateUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find users without passwords
    const usersWithoutPassword = await User.find({ password: { $exists: false } });
    console.log(`Found ${usersWithoutPassword.length} users without passwords`);
    
    if (usersWithoutPassword.length === 0) {
      console.log('No migration needed. All users have passwords.');
      process.exit(0);
    }
    
    // Option 1: Delete old users (recommended for security)
    console.log('\nOptions:');
    console.log('1. Delete all old users without passwords (RECOMMENDED)');
    console.log('2. Set a default password for all old users (NOT SECURE)');
    console.log('3. List old users and decide manually');
    
    // For simplicity, let's just delete them
    const deleteResult = await User.deleteMany({ password: { $exists: false } });
    console.log(`Deleted ${deleteResult.deletedCount} old users without passwords`);
    console.log('Please create new accounts with passwords.');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateUsers();