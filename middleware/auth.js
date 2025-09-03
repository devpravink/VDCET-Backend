const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify token
const protect = async (req, res, next) => {
  try {
    let token;

    console.log('🔍 Auth Middleware Debug:');
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Authorization Header:', req.headers.authorization);

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔍 Token extracted:', token ? `${token.substring(0, 20)}...` : 'None');
    }

    if (!token) {
      console.log('🔍 No token found in request');
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    try {
      console.log('🔍 Verifying token with JWT_SECRET:', process.env.JWT_SECRET ? 'Present' : 'Missing');
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 Token decoded successfully:', decoded);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      console.log('🔍 User found:', user ? `${user.firstName} ${user.lastName} (${user.role})` : 'None');
      
      if (!user) {
        console.log('🔍 User not found for token');
        return res.status(401).json({
          status: 'error',
          message: 'Token is not valid. User not found.'
        });
      }

      if (!user.isActive) {
        console.log('🔍 User account is deactivated');
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      console.log('🔍 Authentication successful, user added to request');
      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      console.log('🔍 Token verification failed:', error.message);
      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Restrict to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Admin only access
const adminOnly = authorize('admin');

// Student only access
const studentOnly = authorize('student');

// Both admin and student access
const bothRoles = authorize('admin', 'student');

module.exports = {
  protect,
  authorize,
  adminOnly,
  studentOnly,
  bothRoles
};
