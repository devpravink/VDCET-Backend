const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  // Generate Hall Ticket PDF
  generateHallTicket(student) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Header
    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('HALL TICKET', { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName, { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, { align: 'center' })
      .moveDown(1);

    // Student Information
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('STUDENT INFORMATION')
      .moveDown(0.5);

    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Roll Number:', student.studentId],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`],
      ['Phone:', student.phone],
      ['Email:', student.userId.email]
    ];

    this.createTable(studentInfo, 150, 200);

    // Academic Information
    this.doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC DETAILS')
      .moveDown(0.5);

    const academicInfo = [
      ['College:', student.academicInfo.collegeName],
      ['Specialization:', student.academicInfo.specialization || 'N/A'],
      ['Total Credits:', student.academicInfo.totalCredits || 0],
      ['Earned Credits:', student.academicInfo.earnedCredits || 0],
      ['Attendance %:', `${student.academicInfo.attendancePercentage || 0}%`]
    ];

    this.createTable(academicInfo, 150, 350);

    // Exam Schedule (Sample)
    this.doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('EXAMINATION SCHEDULE')
      .moveDown(0.5);

    const examSchedule = [
      ['Date', 'Subject', 'Time', 'Duration'],
      ['TBD', 'Theory Papers', '9:00 AM', '3 Hours'],
      ['TBD', 'Practical', '2:00 PM', '2 Hours'],
      ['TBD', 'Viva Voce', '10:00 AM', '1 Hour']
    ];

    this.createTable(examSchedule, 100, 450);

    // Instructions
    this.doc
      .moveDown(1)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('IMPORTANT INSTRUCTIONS:')
      .moveDown(0.5);

    const instructions = [
      '1. This Hall Ticket is mandatory for appearing in examinations',
      '2. Carry valid ID proof along with this hall ticket',
      '3. Report 30 minutes before the examination time',
      '4. No electronic devices are allowed in examination hall',
      '5. Follow all examination rules and regulations',
      '6. This ticket is valid only for the current semester'
    ];

    instructions.forEach(instruction => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(instruction)
        .moveDown(0.2);
    });

    // Footer
    this.doc
      .moveDown(1)
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), { align: 'right' });

    return this.doc;
  }

  // Generate Result PDF
  generateResult(student) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Header
    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ACADEMIC RESULT', { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName, { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Result for: ${student.academicInfo.year} Year, ${student.academicInfo.semester} Semester`, { align: 'center' })
      .moveDown(1);

    // Student Information
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('STUDENT INFORMATION')
      .moveDown(0.5);

    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`]
    ];

    this.createTable(studentInfo, 150, 200);

    // Academic Performance
    this.doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC PERFORMANCE')
      .moveDown(0.5);

    const performance = [
      ['Current Semester GPA:', student.academicPerformance?.currentSemesterGPA || 'N/A'],
      ['Previous Semester GPA:', student.academicPerformance?.previousSemesterGPA || 'N/A'],
      ['CGPA:', student.academicInfo.cgpa || 0],
      ['Total Credits:', student.academicInfo.totalCredits || 0],
      ['Earned Credits:', student.academicInfo.earnedCredits || 0],
      ['Attendance %:', `${student.academicInfo.attendancePercentage || 0}%`]
    ];

    this.createTable(performance, 150, 320);

    // Subject-wise Results (Sample)
    this.doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SUBJECT-WISE RESULTS')
      .moveDown(0.5);

    const subjects = [
      ['Subject Code', 'Subject Name', 'Credits', 'Grade', 'Points'],
      ['CS101', 'Computer Programming', '4', 'A', '9.0'],
      ['CS102', 'Data Structures', '4', 'A-', '8.5'],
      ['CS103', 'Database Systems', '3', 'B+', '8.0'],
      ['CS104', 'Computer Networks', '3', 'A', '9.0'],
      ['CS105', 'Software Engineering', '3', 'B+', '8.0']
    ];

    this.createTable(subjects, 100, 420);

    // Grade Summary
    this.doc
      .moveDown(1)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('GRADE SUMMARY:')
      .moveDown(0.5);

    const gradeSummary = [
      'A (90-100): Excellent',
      'A- (85-89): Very Good',
      'B+ (80-84): Good',
      'B (75-79): Above Average',
      'C+ (70-74): Average',
      'C (65-69): Below Average',
      'F (0-64): Fail'
    ];

    gradeSummary.forEach(grade => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(grade)
        .moveDown(0.2);
    });

    // Footer
    this.doc
      .moveDown(1)
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), { align: 'right' });

    return this.doc;
  }

  // Generate Fee Structure PDF
  generateFeeStructure(student) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Header
    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('FEE STRUCTURE', { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(student.academicInfo.collegeName, { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, { align: 'center' })
      .moveDown(1);

    // Student Information
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('STUDENT INFORMATION')
      .moveDown(0.5);

    const studentInfo = [
      ['Student ID:', student.studentId],
      ['Name:', `${student.userId.firstName} ${student.userId.lastName}`],
      ['Department:', student.academicInfo.department],
      ['Course:', student.academicInfo.course],
      ['Fee Category:', student.financialInfo?.feeStructure || 'General'],
      ['Year:', `${student.academicInfo.year} Year`],
      ['Semester:', `${student.academicInfo.semester} Semester`]
    ];

    this.createTable(studentInfo, 150, 200);

    // Fee Breakdown
    this.doc
      .moveDown(1)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('FEE BREAKDOWN')
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
      ['', '', '', ''],
      ['Total Fees:', '40,000', '', ''],
      ['Paid Amount:', `${student.financialInfo?.paidFees || 0}`, '', ''],
      ['Balance Amount:', `${(student.financialInfo?.totalFees || 40000) - (student.financialInfo?.paidFees || 0)}`, '', '']
    ];

    this.createTable(feeBreakdown, 100, 320);

    // Scholarship Information
    if (student.financialInfo?.scholarshipAmount > 0) {
      this.doc
        .moveDown(1)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('SCHOLARSHIP INFORMATION')
        .moveDown(0.5);

      const scholarshipInfo = [
        ['Scholarship Type:', 'Merit-based'],
        ['Amount:', `₹${student.financialInfo.scholarshipAmount}`],
        ['Applied Date:', student.financialInfo.lastPaymentDate ? new Date(student.financialInfo.lastPaymentDate).toLocaleDateString() : 'N/A'],
        ['Status:', 'Approved']
      ];

      this.createTable(scholarshipInfo, 150, 520);
    }

    // Payment Instructions
    this.doc
      .moveDown(1)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAYMENT INSTRUCTIONS:')
      .moveDown(0.5);

    const paymentInstructions = [
      '1. All fees must be paid before the due date',
      '2. Late payment will incur a penalty of ₹500 per week',
      '3. Payment can be made online or at the accounts office',
      '4. Keep payment receipts for future reference',
      '5. Partial payments are not accepted',
      '6. Contact accounts office for payment-related queries'
    ];

    paymentInstructions.forEach(instruction => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(instruction)
        .moveDown(0.2);
    });

    // Footer
    this.doc
      .moveDown(1)
      .fontSize(10)
      .font('Helvetica')
      .text('Generated on: ' + new Date().toLocaleDateString(), { align: 'right' });

    return this.doc;
  }

  // Helper method to create tables
  createTable(data, colWidth, startY) {
    const rowHeight = 25;
    const startX = 50;

    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const x = startX + (colIndex * colWidth);
        const y = startY + (rowIndex * rowHeight);

        // Draw cell border
        this.doc.rect(x, y, colWidth, rowHeight).stroke();

        // Add cell content
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(cell, x + 5, y + 8, {
            width: colWidth - 10,
            align: 'left'
          });
      });
    });
  }

  // Generate PDF file
  async generatePDFFile(pdfDoc, filename) {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filename);
      pdfDoc.pipe(writeStream);
      
      writeStream.on('finish', () => {
        resolve(filename);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

      pdfDoc.end();
    });
  }
}

module.exports = PDFGenerator;
