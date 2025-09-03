const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Apply admin middleware to all routes
router.use(protect, adminOnly);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments();
    const recentStudents = await Student.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        statistics: {
          totalStudents,
          activeStudents,
          totalUsers,
          inactiveStudents: totalStudents - activeStudents
        },
        recentStudents: recentStudents.map(student => ({
          _id: student._id,
          studentId: student.studentId,
          name: `${student.userId.firstName} ${student.userId.lastName}`,
          email: student.userId.email,
          department: student.academicInfo.department,
          status: student.status,
          createdAt: student.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/admin/students
// @desc    Get all students with pagination and filters
// @access  Private (Admin only)
router.get('/students', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('department').optional().isString().withMessage('Department must be a string'),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'graduated']).withMessage('Invalid status'),
  query('year').optional().isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5')
], async (req, res) => {
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { studentId: { $regex: req.query.search, $options: 'i' } },
        { 'userId.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'userId.lastName': { $regex: req.query.search, $options: 'i' } },
        { 'userId.email': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.department) {
      filter['academicInfo.department'] = { $regex: req.query.department, $options: 'i' };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.year) {
      filter['academicInfo.year'] = parseInt(req.query.year);
    }

    // Get students with pagination
    const students = await Student.find(filter)
      .populate('userId', 'firstName lastName email username isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Student.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        students: students.map(student => ({
          _id: student._id,
          studentId: student.studentId,
          userId: student.userId,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          address: student.address,
          academicInfo: student.academicInfo,
          guardianInfo: student.guardianInfo,
          emergencyContact: student.emergencyContact,
          status: student.status,
          enrollmentDate: student.enrollmentDate,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalStudents: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching students',
      error: error.message
    });
  }
});

// @route   GET /api/admin/students/:id
// @desc    Get student by ID
// @access  Private (Admin only)
router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'firstName lastName email username isActive createdAt');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          userId: student.userId,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          address: student.address,
          academicInfo: student.academicInfo,
          guardianInfo: student.guardianInfo,
          emergencyContact: student.emergencyContact,
          documents: student.documents,
          status: student.status,
          enrollmentDate: student.enrollmentDate,
          graduationDate: student.graduationDate,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Student fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching student',
      error: error.message
    });
  }
});

// @route   POST /api/admin/students
// @desc    Create a new student
// @access  Private (Admin only)
router.post('/students', [
  [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters'),
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
    body('studentId')
      .notEmpty()
      .withMessage('Student ID is required'),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('phone')
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('address.street')
      .notEmpty()
      .withMessage('Street address is required'),
    body('address.city')
      .notEmpty()
      .withMessage('City is required'),
    body('address.state')
      .notEmpty()
      .withMessage('State is required'),
    body('address.zipCode')
      .notEmpty()
      .withMessage('ZIP code is required'),
    body('academicInfo.collegeName')
      .notEmpty()
      .withMessage('College name is required'),
    body('academicInfo.department')
      .notEmpty()
      .withMessage('Department is required'),
    body('academicInfo.course')
      .notEmpty()
      .withMessage('Course is required'),
    body('academicInfo.specialization')
      .optional()
      .isString()
      .withMessage('Specialization must be a string'),
    body('academicInfo.year')
      .isInt({ min: 1, max: 5 })
      .withMessage('Year must be between 1 and 5'),
    body('academicInfo.semester')
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8'),
    body('academicInfo.totalCredits')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Total credits must be a positive number'),
    body('academicInfo.earnedCredits')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Earned credits must be a positive number'),
    body('academicInfo.attendancePercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Attendance percentage must be between 0 and 100'),
    body('guardianInfo.name')
      .notEmpty()
      .withMessage('Guardian name is required'),
    body('guardianInfo.relationship')
      .notEmpty()
      .withMessage('Relationship with guardian is required'),
    body('guardianInfo.phone')
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid guardian phone number'),
    body('guardianInfo.email')
      .isEmail()
      .withMessage('Please provide a valid guardian email'),
    body('emergencyContact.name')
      .notEmpty()
      .withMessage('Emergency contact name is required'),
    body('emergencyContact.relationship')
      .notEmpty()
      .withMessage('Relationship with emergency contact is required'),
    body('emergencyContact.phone')
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid emergency contact phone number')
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

      const {
        username, email, password, firstName, lastName,
        studentId, dateOfBirth, gender, phone, address,
        academicInfo, guardianInfo, emergencyContact
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email or username already exists'
        });
      }

      // Check if student ID already exists
      const existingStudent = await Student.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          status: 'error',
          message: 'Student with this ID already exists'
        });
      }

      // Create user first
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role: 'student'
      });

      await user.save();

      // Create student profile
      const student = new Student({
        userId: user._id,
        studentId,
        dateOfBirth,
        gender,
        phone,
        address,
        academicInfo,
        guardianInfo,
        emergencyContact
      });

      await student.save();

      // Populate user data for response
      await student.populate('userId', 'firstName lastName email username');

      res.status(201).json({
        status: 'success',
        message: 'Student created successfully',
        data: {
          student: {
            _id: student._id,
            studentId: student.studentId,
            userId: student.userId,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            phone: student.phone,
            address: student.address,
            academicInfo: student.academicInfo,
            guardianInfo: student.guardianInfo,
            emergencyContact: student.emergencyContact,
            status: student.status,
            enrollmentDate: student.enrollmentDate,
            createdAt: student.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Student creation error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while creating student',
        error: error.message
      });
    }
  }
]);

// @route   PUT /api/admin/students/:id
// @desc    Update student by ID
// @access  Private (Admin only)
router.put('/students/:id', [
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
      .withMessage('Please provide a valid email'),
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('academicInfo.year')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Year must be between 1 and 5'),
    body('academicInfo.semester')
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8'),
    body('academicInfo.cgpa')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('CGPA must be between 0 and 10'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'graduated'])
      .withMessage('Invalid status')
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

      const student = await Student.findById(req.params.id);
      if (!student) {
        return res.status(404).json({
          status: 'error',
          message: 'Student not found'
        });
      }

      const {
        firstName, lastName, email, phone, address,
        academicInfo, guardianInfo, emergencyContact, status
      } = req.body;

      // Update user information
      if (firstName || lastName || email) {
        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.email = email;

        // Check if email is being changed and if it's already taken
        if (email) {
          const existingUser = await User.findOne({ email, _id: { $ne: student.userId } });
          if (existingUser) {
            return res.status(400).json({
              status: 'error',
              message: 'Email is already taken by another user'
            });
          }
        }

        await User.findByIdAndUpdate(student.userId, updateData, { runValidators: true });
      }

      // Update student information
      const studentUpdateData = {};
      if (phone) studentUpdateData.phone = phone;
      if (address) studentUpdateData.address = address;
      if (academicInfo) studentUpdateData.academicInfo = { ...student.academicInfo, ...academicInfo };
      if (guardianInfo) studentUpdateData.guardianInfo = { ...student.guardianInfo, ...guardianInfo };
      if (emergencyContact) studentUpdateData.emergencyContact = { ...student.emergencyContact, ...emergencyContact };
      if (status) studentUpdateData.status = status;

      // Set graduation date if status is changed to graduated
      if (status === 'graduated' && student.status !== 'graduated') {
        studentUpdateData.graduationDate = new Date();
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        req.params.id,
        studentUpdateData,
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email username');

      res.status(200).json({
        status: 'success',
        message: 'Student updated successfully',
        data: {
          student: {
            _id: updatedStudent._id,
            studentId: updatedStudent.studentId,
            userId: updatedStudent.userId,
            dateOfBirth: updatedStudent.dateOfBirth,
            gender: updatedStudent.gender,
            phone: updatedStudent.phone,
            address: updatedStudent.address,
            academicInfo: updatedStudent.academicInfo,
            guardianInfo: updatedStudent.guardianInfo,
            emergencyContact: updatedStudent.emergencyContact,
            status: updatedStudent.status,
            enrollmentDate: updatedStudent.enrollmentDate,
            graduationDate: updatedStudent.graduationDate,
            updatedAt: updatedStudent.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Student update error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while updating student',
        error: error.message
      });
    }
  }
]);

// @route   DELETE /api/admin/students/:id
// @desc    Delete student by ID
// @access  Private (Admin only)
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }

    // Delete student profile
    await Student.findByIdAndDelete(req.params.id);

    // Delete associated user
    await User.findByIdAndDelete(student.userId);

    res.status(200).json({
      status: 'success',
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Student deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting student',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/students/:id/status
// @desc    Update student status
// @access  Private (Admin only)
router.put('/students/:id/status', [
  [
    body('status')
      .isIn(['active', 'inactive', 'suspended', 'graduated'])
      .withMessage('Invalid status')
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

      const { status } = req.body;
      const student = await Student.findById(req.params.id);

      if (!student) {
        return res.status(404).json({
          status: 'error',
          message: 'Student not found'
        });
      }

      const updateData = { status };
      
      // Set graduation date if status is changed to graduated
      if (status === 'graduated' && student.status !== 'graduated') {
        updateData.graduationDate = new Date();
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate('userId', 'firstName lastName email');

      res.status(200).json({
        status: 'success',
        message: 'Student status updated successfully',
        data: {
          student: {
            _id: updatedStudent._id,
            studentId: updatedStudent.studentId,
            name: `${updatedStudent.userId.firstName} ${updatedStudent.userId.lastName}`,
            email: updatedStudent.userId.email,
            status: updatedStudent.status,
            graduationDate: updatedStudent.graduationDate
          }
        }
      });
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while updating student status',
        error: error.message
      });
    }
  }
]);

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        users: users.map(user => user.getPublicProfile())
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users',
      error: error.message
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/users', [
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
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, firstName, lastName, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email or username already exists'
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        isActive: true
      });

      await user.save();

      // Return user data without password
      const userResponse = user.getPublicProfile();

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          user: userResponse
        }
      });
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while creating user',
        error: error.message
      });
    }
  }
]);

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (Admin only)
router.put('/users/:id', [
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
      .withMessage('Please provide a valid email'),
    body('role')
      .optional()
      .isIn(['admin', 'student'])
      .withMessage('Role must be either admin or student'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
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

      const { firstName, lastName, email, role, isActive } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Check if email is being changed and if it already exists
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            status: 'error',
            message: 'User with this email already exists'
          });
        }
      }

      // Update user
      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');

      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: {
          user: updatedUser.getPublicProfile()
        }
      });
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while updating user',
        error: error.message
      });
    }
  }
]);

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete the last admin user'
        });
      }
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // If user was a student, also delete student profile
    if (user.role === 'student') {
      await Student.findOneAndDelete({ userId: userId });
    }

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting user',
      error: error.message
    });
  }
});

// PDF Generation Routes

// @route   GET /api/admin/students/:id/hall-ticket
// @desc    Generate and download hall ticket PDF
// @access  Private (Admin only)
router.get('/students/:id/hall-ticket', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'firstName lastName email');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="hall-ticket-${student.studentId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate Hall Ticket Content
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('HALL TICKET', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName || 'College Name', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' })
      .moveDown(1);

    // Student Information Table
    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Date of Birth:', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'],
      ['Gender:', student.gender],
      ['Phone:', student.phone],
      ['Email:', student.userId.email],
      ['Address:', `${student.address?.street}, ${student.address?.city}, ${student.address?.state} ${student.address?.zipCode}`],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`]
    ];

    // Create table
    let y = 200;
    studentInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Academic Details
    doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC DETAILS', 50, y + 20)
      .moveDown(0.5);

    const academicInfo = [
      ['College Name:', student.academicInfo.collegeName || 'N/A'],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Total Credits:', student.academicInfo.totalCredits || 0],
      ['Earned Credits:', student.academicInfo.earnedCredits || 0],
      ['Current CGPA:', student.academicInfo.cgpa || 0],
      ['Attendance %:', `${student.academicInfo.attendancePercentage || 0}%`],
      ['Enrollment Date:', student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'N/A'],
      ['Status:', student.status]
    ];

    y += 60;
    academicInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Guardian Information
    doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('GUARDIAN INFORMATION', 50, y + 20)
      .moveDown(0.5);

    const guardianInfo = [
      ['Guardian Name:', student.guardianInfo?.name || 'N/A'],
      ['Relationship:', student.guardianInfo?.relationship || 'N/A'],
      ['Phone:', student.guardianInfo?.phone || 'N/A'],
      ['Email:', student.guardianInfo?.email || 'N/A']
    ];

    y += 60;
    guardianInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Additional Information
    doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ADDITIONAL INFORMATION', 50, y + 20)
      .moveDown(0.5);

    const additionalInfo = [
      ['Hostel Status:', student.hostelInfo?.isHostelite ? 'Yes' : 'No'],
      ['Hostel Name:', student.hostelInfo?.isHostelite ? (student.hostelInfo?.hostelName || 'N/A') : 'N/A'],
      ['Room Number:', student.hostelInfo?.isHostelite ? (student.hostelInfo?.roomNumber || 'N/A') : 'N/A'],
      ['Placement Status:', student.placementInfo?.isPlaced ? 'Yes' : 'No'],
      ['Company:', student.placementInfo?.isPlaced ? (student.placementInfo?.companyName || 'N/A') : 'N/A'],
      ['Package (LPA):', student.placementInfo?.isPlaced ? (student.placementInfo?.package || 'N/A') : 'N/A'],
      ['Last Attendance:', student.lastAttendanceDate ? new Date(student.lastAttendanceDate).toLocaleDateString() : 'N/A'],
      ['Remarks:', student.remarks || 'N/A']
    ];

    y += 60;
    additionalInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Instructions
    doc
      .moveDown(1)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('IMPORTANT INSTRUCTIONS:', 50, y + 20)
      .moveDown(0.5);

    const instructions = [
      '1. This Hall Ticket is mandatory for appearing in examinations',
      '2. Carry valid ID proof along with this hall ticket',
      '3. Report 30 minutes before the examination time',
      '4. No electronic devices are allowed in examination hall',
      '5. Follow all examination rules and regulations'
    ];

    y += 60;
    instructions.forEach(instruction => {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(instruction, 50, y);
      y += 20;
    });

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), 50, 750, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Hall ticket generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while generating hall ticket',
      error: error.message
    });
  }
});

// @route   GET /api/admin/students/:id/result
// @desc    Generate and download result PDF
// @access  Private (Admin only)
router.get('/students/:id/result', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'firstName lastName email');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result-${student.studentId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate Result Content
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ACADEMIC RESULT', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName || 'College Name', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Result for: ${student.academicInfo.year} Year, ${student.academicInfo.semester} Semester`, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' })
      .moveDown(1);

    // Student Information
    let y = 200;
    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Date of Birth:', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'],
      ['Gender:', student.gender],
      ['Phone:', student.phone],
      ['Email:', student.userId.email],
      ['Address:', `${student.address?.street}, ${student.address?.city}, ${student.address?.state} ${student.address?.zipCode}`],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`]
    ];

    studentInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Academic Performance
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC PERFORMANCE', 50, y + 20)
      .moveDown(0.5);

    const performance = [
      ['Current Semester GPA:', student.academicPerformance?.currentSemesterGPA || 'N/A'],
      ['Previous Semester GPA:', student.academicPerformance?.previousSemesterGPA || 'N/A'],
      ['CGPA:', student.academicInfo.cgpa || 0],
      ['Total Credits:', student.academicInfo.totalCredits || 0],
      ['Earned Credits:', student.academicInfo.earnedCredits || 0],
      ['Attendance %:', `${student.academicInfo.attendancePercentage || 0}%`],
      ['Total Backlogs:', student.academicPerformance?.totalBacklogs || 0],
      ['Cleared Backlogs:', student.academicPerformance?.clearedBacklogs || 0],
      ['Enrollment Date:', student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'N/A'],
      ['Status:', student.status]
    ];

    y += 60;
    performance.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Subject-wise Results (Sample)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SUBJECT-WISE RESULTS', 50, y + 20)
      .moveDown(0.5);

    const subjects = [
      ['Subject Code', 'Subject Name', 'Credits', 'Grade', 'Points'],
      ['CS101', 'Computer Programming', '4', 'A', '9.0'],
      ['CS102', 'Data Structures', '4', 'A-', '8.5'],
      ['CS103', 'Database Systems', '3', 'B+', '8.0'],
      ['CS104', 'Computer Networks', '3', 'A', '9.0']
    ];

    y += 60;
    subjects.forEach((row, rowIndex) => {
      const x = 50;
      row.forEach((cell, colIndex) => {
        const colX = x + (colIndex * 100);
        doc
          .fontSize(10)
          .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell, colX, y);
      });
      y += 20;
    });

    // Academic Summary
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('ACADEMIC SUMMARY:', 50, y + 20)
      .moveDown(0.5);

    const academicSummary = [
      ['Enrollment Date:', student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'N/A'],
      ['Current Status:', student.status],
      ['College Name:', student.academicInfo.collegeName || 'N/A'],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Total Backlogs:', student.academicPerformance?.totalBacklogs || 0],
      ['Cleared Backlogs:', student.academicPerformance?.clearedBacklogs || 0],
      ['Last Attendance:', student.lastAttendanceDate ? new Date(student.lastAttendanceDate).toLocaleDateString() : 'N/A'],
      ['Remarks:', student.remarks || 'N/A']
    ];

    y += 60;
    academicSummary.forEach((row, index) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(10)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 20;
    });

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), 50, 750, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Result generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while generating result',
      error: error.message
    });
  }
});

// @route   GET /api/admin/students/:id/fee-structure
// @desc    Generate and download fee structure PDF
// @access  Private (Admin only)
router.get('/students/:id/fee-structure', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'firstName lastName email');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fee-structure-${student.studentId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate Fee Structure Content
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('FEE STRUCTURE', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName || 'College Name', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' })
      .moveDown(1);

    // Student Information
    let y = 200;
    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Date of Birth:', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'],
      ['Gender:', student.gender],
      ['Phone:', student.phone],
      ['Email:', student.userId.email],
      ['Address:', `${student.address?.street}, ${student.address?.city}, ${student.address?.state} ${student.address?.zipCode}`],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Fee Category:', student.financialInfo?.feeStructure || 'General'],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`]
    ];

    studentInfo.forEach((row, index) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(12)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 25;
    });

    // Fee Breakdown
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('FEE BREAKDOWN', 50, y + 20)
      .moveDown(0.5);

    const feeBreakdown = [
      ['Fee Component', 'Amount (₹)', 'Due Date', 'Status'],
      ['Tuition Fee', '25,000', '15th Aug', 'Paid'],
      ['Laboratory Fee', '5,000', '15th Aug', 'Paid'],
      ['Library Fee', '2,000', '15th Aug', 'Paid'],
      ['Examination Fee', '3,000', '15th Aug', 'Paid'],
      ['Sports Fee', '1,000', '15th Aug', 'Paid'],
      ['Student Activity Fee', '1,500', '15th Aug', 'Paid'],
      ['Development Fee', '2,500', '15th Aug', 'Paid'],
      ['Hostel Fee', `${student.hostelInfo?.isHostelite ? (student.hostelInfo?.hostelFees || 15000) : 'N/A'}`, '15th Aug', student.hostelInfo?.isHostelite ? 'Paid' : 'N/A'],
      ['', '', '', ''],
      ['Total Academic Fees:', '40,000', '', ''],
      ['Hostel Fees:', student.hostelInfo?.isHostelite ? `${student.hostelInfo?.hostelFees || 15000}` : '0', '', ''],
      ['Total Fees:', `${(student.financialInfo?.totalFees || 40000) + (student.hostelInfo?.isHostelite ? (student.hostelInfo?.hostelFees || 0) : 0)}`, '', ''],
      ['Scholarship Amount:', `${student.financialInfo?.scholarshipAmount || 0}`, '', ''],
      ['Paid Amount:', `${student.financialInfo?.paidFees || 0}`, '', ''],
      ['Balance Amount:', `${((student.financialInfo?.totalFees || 40000) + (student.hostelInfo?.isHostelite ? (student.hostelInfo?.hostelFees || 0) : 0)) - (student.financialInfo?.scholarshipAmount || 0) - (student.financialInfo?.paidFees || 0)}`, '', '']
    ];

    y += 60;
    feeBreakdown.forEach((row, rowIndex) => {
      const x = 50;
      row.forEach((cell, colIndex) => {
        const colX = x + (colIndex * 100);
        doc
          .fontSize(10)
          .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell, colX, y);
      });
      y += 20;
    });

    // Financial Summary
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('FINANCIAL SUMMARY:', 50, y + 20)
      .moveDown(0.5);

    const financialSummary = [
      ['Last Payment Date:', student.financialInfo?.lastPaymentDate ? new Date(student.financialInfo.lastPaymentDate).toLocaleDateString() : 'N/A'],
      ['Payment Method:', 'Online/Offline'],
      ['Receipt Required:', 'Yes'],
      ['Late Fee Policy:', '₹500 per week after due date']
    ];

    y += 60;
    financialSummary.forEach((row, index) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(row[0], 50, y)
        .fontSize(10)
        .font('Helvetica')
        .text(row[1], 200, y);
      y += 20;
    });

    // Payment Instructions
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAYMENT INSTRUCTIONS:', 50, y + 20)
      .moveDown(0.5);

    const paymentInstructions = [
      '1. All fees must be paid before the due date',
      '2. Late payment will incur a penalty of ₹500 per week',
      '3. Payment can be made online or at the accounts office',
      '4. Keep payment receipts for future reference',
      '5. Partial payments are not accepted'
    ];

    y += 60;
    paymentInstructions.forEach(instruction => {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(instruction, 50, y);
      y += 20;
    });

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), 50, 750, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Fee structure generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while generating fee structure',
      error: error.message
    });
  }
});

module.exports = router;
