const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India'
    }
  },
  academicInfo: {
    collegeName: {
      type: String,
      required: [true, 'College name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true
    },
    specialization: {
      type: String,
      trim: true,
      default: ''
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be at least 1'],
      max: [5, 'Year cannot exceed 5']
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8']
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
      default: 0
    },
    totalCredits: {
      type: Number,
      min: [0, 'Total credits cannot be negative'],
      default: 0
    },
    earnedCredits: {
      type: Number,
      min: [0, 'Earned credits cannot be negative'],
      default: 0
    },
    attendancePercentage: {
      type: Number,
      min: [0, 'Attendance percentage cannot be negative'],
      max: [100, 'Attendance percentage cannot exceed 100'],
      default: 0
    }
  },
  guardianInfo: {
    name: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Relationship with guardian is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Guardian phone is required'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      required: [true, 'Guardian email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Relationship with emergency contact is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    }
  },
  documents: {
    profilePicture: {
      type: String,
      default: null
    },
    idProof: {
      type: String,
      default: null
    },
    addressProof: {
      type: String,
      default: null
    },
    hallTicket: {
      type: String,
      default: null
    },
    markSheet: {
      type: String,
      default: null
    },
    transferCertificate: {
      type: String,
      default: null
    },
    characterCertificate: {
      type: String,
      default: null
    },
    casteCertificate: {
      type: String,
      default: null
    },
    incomeCertificate: {
      type: String,
      default: null
    }
  },
  // Academic Performance
  academicPerformance: {
    currentSemesterGPA: {
      type: Number,
      min: [0, 'GPA cannot be negative'],
      max: [10, 'GPA cannot exceed 10'],
      default: 0
    },
    previousSemesterGPA: {
      type: Number,
      min: [0, 'GPA cannot be negative'],
      max: [10, 'GPA cannot exceed 10'],
      default: 0
    },
    totalBacklogs: {
      type: Number,
      min: [0, 'Backlogs cannot be negative'],
      default: 0
    },
    clearedBacklogs: {
      type: Number,
      min: [0, 'Cleared backlogs cannot be negative'],
      default: 0
    }
  },

  // Financial Information
  financialInfo: {
    feeStructure: {
      type: String,
      enum: ['general', 'obc', 'sc', 'st', 'ews'],
      default: 'general'
    },
    totalFees: {
      type: Number,
      min: [0, 'Total fees cannot be negative'],
      default: 0
    },
    paidFees: {
      type: Number,
      min: [0, 'Paid fees cannot be negative'],
      default: 0
    },
    scholarshipAmount: {
      type: Number,
      min: [0, 'Scholarship amount cannot be negative'],
      default: 0
    },
    lastPaymentDate: {
      type: Date,
      default: null
    }
  },

  // Hostel Information
  hostelInfo: {
    hostelName: {
      type: String,
      trim: true,
      default: ''
    },
    roomNumber: {
      type: String,
      trim: true,
      default: ''
    },
    hostelFees: {
      type: Number,
      min: [0, 'Hostel fees cannot be negative'],
      default: 0
    },
    isHostelite: {
      type: Boolean,
      default: false
    }
  },

  // Placement Information
  placementInfo: {
    isPlaced: {
      type: Boolean,
      default: false
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    package: {
      type: Number,
      min: [0, 'Package cannot be negative'],
      default: 0
    },
    placementDate: {
      type: Date,
      default: null
    },
    jobRole: {
      type: String,
      trim: true,
      default: ''
    }
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'graduated', 'transferred', 'dropped'],
    default: 'active'
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  graduationDate: {
    type: Date,
    default: null
  },
  lastAttendanceDate: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Virtual for age
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for full address
studentSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// Index for better query performance
studentSchema.index({ studentId: 1 });
studentSchema.index({ 'academicInfo.department': 1 });
studentSchema.index({ 'academicInfo.course': 1 });
studentSchema.index({ status: 1 });

// Method to get public profile
studentSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    studentId: this.studentId,
    firstName: this.userId?.firstName,
    lastName: this.userId?.lastName,
    fullName: this.userId?.fullName,
    email: this.userId?.email,
    phone: this.phone,
    academicInfo: this.academicInfo,
    status: this.status,
    enrollmentDate: this.enrollmentDate
  };
};

module.exports = mongoose.model('Student', studentSchema);
