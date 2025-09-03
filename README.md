# 🎓 College Management System Backend

A robust Node.js/Express backend for a college management system with role-based access control for Administrators and Students.

## ✨ Features

### 🔐 Authentication & Authorization
- **Two User Types**: Admin and Student
- **JWT-based Authentication** with secure token management
- **Role-based Access Control** (RBAC)
- **Password Hashing** using bcryptjs

### 👨‍💼 Admin Capabilities
- **Full CRUD Operations** on student data
- **Student Management**: Create, Read, Update, Delete
- **User Management**: View all users
- **Dashboard Statistics**: Overview of system data
- **Advanced Filtering**: Search, pagination, department/status filters
- **Status Management**: Activate, deactivate, suspend, graduate students

### 👨‍🎓 Student Capabilities
- **View Own Profile**: Personal and academic information
- **Limited Updates**: Update contact information and address
- **Academic Record**: View course details, CGPA, enrollment status
- **Document Access**: View uploaded documents

### 🛡️ Security Features
- **Input Validation** using express-validator
- **Rate Limiting** to prevent abuse
- **Helmet.js** for security headers
- **CORS** configuration
- **Environment Variables** for sensitive data

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd college-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy and edit the environment file
   cp config.env.example config.env
   ```
   
   Update `config.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/college_management
   JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
   JWT_EXPIRE=24h
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if not running)
   mongod
   
   # Create initial admin user
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### 🔐 Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@college.com",
  "password": "admin123"
}
```

#### Register (Admin Only)
```http
POST /auth/register
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "student1",
  "email": "student1@college.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "studentData": {
    "studentId": "STU001",
    "dateOfBirth": "2000-01-01",
    "gender": "male",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345"
    },
    "academicInfo": {
      "department": "Computer Science",
      "course": "B.Tech",
      "year": 2,
      "semester": 3
    },
    "guardianInfo": {
      "name": "Jane Doe",
      "relationship": "Mother",
      "phone": "+1234567890",
      "email": "jane@email.com"
    },
    "emergencyContact": {
      "name": "John Doe Sr",
      "relationship": "Father",
      "phone": "+1234567890"
    }
  }
}
```

### 👨‍💼 Admin Endpoints

#### Dashboard
```http
GET /admin/dashboard
Authorization: Bearer <admin_token>
```

#### Get All Students
```http
GET /admin/students?page=1&limit=10&search=john&department=CS&status=active
Authorization: Bearer <admin_token>
```

#### Get Student by ID
```http
GET /admin/students/:id
Authorization: Bearer <admin_token>
```

#### Create Student
```http
POST /admin/students
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  // Same structure as registration studentData
}
```

#### Update Student
```http
PUT /admin/students/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "academicInfo": {
    "cgpa": 8.5
  }
}
```

#### Delete Student
```http
DELETE /admin/students/:id
Authorization: Bearer <admin_token>
```

#### Update Student Status
```http
PUT /admin/students/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "graduated"
}
```

### 👨‍🎓 Student Endpoints

#### Get Profile
```http
GET /student/profile
Authorization: Bearer <student_token>
```

#### Update Profile (Limited)
```http
PUT /student/profile
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "phone": "+1987654321",
  "address": {
    "street": "456 New St"
  }
}
```

#### Get Academic Record
```http
GET /student/academic-record
Authorization: Bearer <student_token>
```

#### Get Personal Info
```http
GET /student/personal-info
Authorization: Bearer <student_token>
```

## 🗄️ Database Models

### User Model
- Basic authentication fields (username, email, password)
- Role-based access control (admin/student)
- Profile information (firstName, lastName)
- Account status and timestamps

### Student Model
- Extended student information
- Academic details (department, course, year, semester, CGPA)
- Personal information (DOB, gender, phone, address)
- Guardian and emergency contact details
- Document references
- Enrollment and graduation tracking

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT token expiration time
- `NODE_ENV`: Environment mode

### MongoDB Connection
The system automatically connects to MongoDB using the URI from environment variables. Make sure MongoDB is running and accessible.

## 🚀 Scripts

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Create initial admin user
npm run seed
```

## 🛡️ Security Considerations

1. **Change Default Admin Password**: Update the admin password after first login
2. **JWT Secret**: Use a strong, unique JWT secret in production
3. **Environment Variables**: Never commit sensitive data to version control
4. **Rate Limiting**: Adjust rate limits based on your requirements
5. **CORS**: Configure CORS settings for your frontend domains

## 📝 Usage Examples

### Creating a Student (Admin)
```javascript
const response = await fetch('/api/admin/students', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'student1',
    email: 'student1@college.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student',
    studentData: {
      studentId: 'STU001',
      // ... other student data
    }
  })
});
```

### Student Login
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'student1@college.com',
    password: 'password123'
  })
});

const { token } = await response.json();
```

### Getting Student Profile
```javascript
const response = await fetch('/api/student/profile', {
  headers: {
    'Authorization': 'Bearer ' + studentToken
  }
});

const profile = await response.json();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Future Enhancements

- [ ] File upload for student documents
- [ ] Email notifications
- [ ] SMS integration
- [ ] Advanced reporting and analytics
- [ ] Mobile app support
- [ ] Multi-tenant architecture
- [ ] Audit logging
- [ ] Backup and recovery systems