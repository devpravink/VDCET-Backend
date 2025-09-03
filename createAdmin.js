const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Create admin user
const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@college.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Password: admin123 (hashed)');
      console.log('👤 Role:', existingAdmin.role);
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

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@college.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

// Run the script
createAdmin();
