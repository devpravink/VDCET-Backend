const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB for seeding');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Seed data
const seedData = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@college.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@college.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedData();
