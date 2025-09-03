const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect, studentOnly } = require('../middleware/auth');

const router = express.Router();

// Apply student middleware to all routes
router.use(protect, studentOnly);

// @route   GET /api/student/profile
// @desc    Get student's own profile
// @access  Private (Student only)
router.get('/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email username isActive createdAt');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
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
          academicPerformance: student.academicPerformance,
          financialInfo: student.financialInfo,
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
    console.error('Student profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching student profile',
      error: error.message
    });
  }
});

// @route   PUT /api/student/profile
// @desc    Update student's own profile (limited fields)
// @access  Private (Student only)
router.put('/profile', [
  [
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('address.street')
      .optional()
      .notEmpty()
      .withMessage('Street address cannot be empty'),
    body('address.city')
      .optional()
      .notEmpty()
      .withMessage('City cannot be empty'),
    body('address.state')
      .optional()
      .notEmpty()
      .withMessage('State cannot be empty'),
    body('address.zipCode')
      .optional()
      .notEmpty()
      .withMessage('ZIP code cannot be empty'),
    body('emergencyContact.name')
      .optional()
      .notEmpty()
      .withMessage('Emergency contact name cannot be empty'),
    body('emergencyContact.phone')
      .optional()
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

      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        return res.status(404).json({
          status: 'error',
          message: 'Student profile not found'
        });
      }

      const {
        phone, address, emergencyContact
      } = req.body;

      // Update student information (only allowed fields)
      const updateData = {};
      if (phone) updateData.phone = phone;
      if (address) updateData.address = { ...student.address, ...address };
      if (emergencyContact) updateData.emergencyContact = { ...student.emergencyContact, ...emergencyContact };

      const updatedStudent = await Student.findByIdAndUpdate(
        student._id,
        updateData,
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email username');

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
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
            updatedAt: updatedStudent.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Student profile update error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error while updating profile',
        error: error.message
      });
    }
  }
]);

// @route   GET /api/student/academic-record
// @desc    Get student's academic record
// @access  Private (Student only)
router.get('/academic-record', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .select('academicInfo status enrollmentDate graduationDate');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        academicRecord: {
          department: student.academicInfo.department,
          course: student.academicInfo.course,
          year: student.academicInfo.year,
          semester: student.academicInfo.semester,
          cgpa: student.academicInfo.cgpa,
          status: student.status,
          enrollmentDate: student.enrollmentDate,
          graduationDate: student.graduationDate
        }
      }
    });
  } catch (error) {
    console.error('Academic record fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching academic record',
      error: error.message
    });
  }
});

// @route   GET /api/student/personal-info
// @desc    Get student's personal information
// @access  Private (Student only)
router.get('/personal-info', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email username')
      .select('dateOfBirth gender phone address guardianInfo emergencyContact');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        personalInfo: {
          name: `${student.userId.firstName} ${student.userId.lastName}`,
          email: student.userId.email,
          username: student.userId.username,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          address: student.address,
          guardianInfo: student.guardianInfo,
          emergencyContact: student.emergencyContact
        }
      }
    });
  } catch (error) {
    console.error('Personal info fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching personal information',
      error: error.message
    });
  }
});

// @route   GET /api/student/documents
// @desc    Get student's documents
// @access  Private (Student only)
router.get('/documents', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .select('documents');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        documents: student.documents
      }
    });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching documents',
      error: error.message
    });
  }
});

// @route   GET /api/student/status
// @desc    Get student's current status
// @access  Private (Student only)
router.get('/status', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .select('status enrollmentDate graduationDate academicInfo.department academicInfo.course');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        studentStatus: {
          currentStatus: student.status,
          enrollmentDate: student.enrollmentDate,
          graduationDate: student.graduationDate,
          department: student.academicInfo.department,
          course: student.academicInfo.course
        }
      }
    });
  } catch (error) {
    console.error('Status fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching status',
      error: error.message
    });
  }
});

module.exports = router;
