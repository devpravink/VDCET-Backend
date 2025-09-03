const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect, bothRoles } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth router is working', timestamp: new Date().toISOString() });
});

// Test route to check database and admin count
router.get('/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    res.json({ 
      message: 'Database test', 
      dbStatus,
      adminCount,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database test failed', 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (First admin can register without auth, others need admin auth)
// @access  Public for first admin, Private for others
router.post('/register', [
  [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .isAlphanumeric()
      .withMessage('Username must contain only letters and numbers'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required'),
    body('role')
      .isIn(['admin', 'student'])
      .withMessage('Role must be either admin or student')
  ],
  async (req, res) => {
    try {
      console.log('🔍 Registration request received:', { 
        body: req.body, 
        headers: req.headers,
        method: req.method,
        url: req.url
      });

      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        console.error('❌ Database not connected. Ready state:', mongoose.connection.readyState);
        return res.status(500).json({
          status: 'error',
          message: 'Database connection error'
        });
      }
      console.log('✅ Database connection verified');

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Validation errors:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, firstName, lastName, role } = req.body;

      // Smart authentication logic
      let isFirstAdmin = false;
      
      // Check if this is the first admin user trying to register
      if (role === 'admin') {
        try {
          const adminCount = await User.countDocuments({ role: 'admin' });
          console.log('🔍 Current admin count:', adminCount);
          if (adminCount === 0) {
            isFirstAdmin = true;
            console.log('🔍 First admin user registration detected - allowing without authentication');
          } else {
            console.log('🔍 Admin users already exist, authentication required');
          }
        } catch (error) {
          console.error('🔍 Error checking admin count:', error);
          // If there's an error checking admin count, assume no admins exist
          isFirstAdmin = true;
          console.log('🔍 Error checking admin count, assuming first admin');
        }
      }

      console.log('🔍 isFirstAdmin:', isFirstAdmin, 'role:', role);

      // If not first admin, require authentication and admin role (except for public student registrations)
      if (!isFirstAdmin && role !== 'student') {
        console.log('🔍 Not first admin, checking authentication...');
        // Check if user is authenticated
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
          token = req.headers.authorization.split(' ')[1];
          console.log('🔍 Token found in headers');
        }

        if (!token) {
          console.log('🔍 No token provided for non-first admin registration');
          return res.status(401).json({
            status: 'error',
            message: 'Authentication required to register new users'
          });
        }

        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const currentUser = await User.findById(decoded.id).select('-password');
          
          if (!currentUser || currentUser.role !== 'admin') {
            console.log('🔍 Current user not admin:', currentUser ? currentUser.role : 'No user found');
            return res.status(403).json({
              status: 'error',
              message: 'Only admins can register new users'
            });
          }
          console.log('🔍 Current user is admin, proceeding with registration');
        } catch (error) {
          console.log('🔍 Token verification failed:', error.message);
          return res.status(401).json({
            status: 'error',
            message: 'Invalid authentication token'
          });
        }
      } else {
        console.log('🔍 Public registration allowed (first admin or student role) - skipping authentication check');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        console.log('🔍 User already exists:', { email, username });
        return res.status(400).json({
          status: 'error',
          message: 'User with this email or username already exists'
        });
      }

      console.log('🔍 Creating new user with role:', role);

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role
      });

      await user.save();
      console.log('✅ User created successfully:', user._id);

      // Success message
      if (isFirstAdmin) {
        console.log('✅ First admin user created successfully');
      }

      // If student, create student profile
      if (role === 'student') {
        const studentData = req.body.studentData || {};
        const nonEmpty = (v, fallback) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : fallback);
        const student = new Student({
          userId: user._id,
          studentId: nonEmpty(studentData.studentId, `STU${Date.now()}`),
          dateOfBirth: studentData.dateOfBirth || new Date(),
          gender: nonEmpty(studentData.gender, 'other'),
          phone: nonEmpty(studentData.phone, '0000000000'),
          address: studentData.address || {
            street: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zipCode: '000000',
            country: 'India'
          },
          academicInfo: studentData.academicInfo || {
            department: 'N/A',
            course: 'N/A',
            collegeName: 'N/A',
            year: 1,
            semester: 1,
            cgpa: 0
          },
          guardianInfo: studentData.guardianInfo || {
            name: 'N/A',
            relationship: 'N/A',
            phone: '0000000000',
            email: 'na@example.com'
          },
          emergencyContact: studentData.emergencyContact || {
            name: 'N/A',
            relationship: 'N/A',
            phone: '0000000000'
          }
        });

        await student.save();
        console.log('✅ Student profile created successfully');
      }

      // Generate token
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET is not defined in environment variables');
        return res.status(500).json({
          status: 'error',
          message: 'Server configuration error: JWT_SECRET missing'
        });
      }
      
      const token = generateToken(user._id);
      console.log('✅ JWT token generated');

      const response = {
        status: 'success',
        message: isFirstAdmin ? 'First admin user registered successfully' : 'User registered successfully',
        data: {
          user: user.getPublicProfile(),
          token,
          isFirstAdmin
        }
      };

      console.log('🔍 Sending response:', response);
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error during registration',
        error: error.message
      });
    }
  }
]);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email and include password
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error during login',
        error: error.message
      });
    }
  }
]);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, bothRoles, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, bothRoles, [
  [
    body('firstName')
      .optional()
      .notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName')
      .optional()
      .notEmpty()
      .withMessage('Last name cannot be empty'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { firstName, lastName, email } = req.body;

      // Check if email is being changed and if it's already taken
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            status: 'error',
            message: 'Email is already taken'
          });
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          firstName: firstName || req.user.firstName,
          lastName: lastName || req.user.lastName,
          email: email || req.user.email
        },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.getPublicProfile()
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while updating profile',
        error: error.message
      });
    }
  }
]);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, bothRoles, [
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+password');

      // Check current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while changing password',
        error: error.message
      });
    }
  }
]);

module.exports = router;
