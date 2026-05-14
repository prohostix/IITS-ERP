# ERP System Backend

Multi-tenant ERP system backend built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🏢 Multi-tenant architecture with organization isolation
- 🔐 JWT-based authentication and role-based authorization
- 📊 Real-time dashboard metrics
- 🚨 Automated escalation system for overdue tasks
- 📝 Comprehensive audit logging
- 🔄 RESTful API design
- 📁 File upload support
- 🛡️ Security best practices (Helmet, CORS, Rate Limiting)
- ⚡ Performance optimization (Compression, Caching)

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcryptjs
- **File Upload**: Multer
- **Scheduling**: node-cron
- **Validation**: express-validator

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- npm or yarn

## Installation

1. Clone the repository:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/erp_system
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

## Database Setup

1. Start MongoDB:
```bash
mongod
```

2. Seed the database:
```bash
npm run seed
```

This will create:
- Sample licenses (Basic, Premium, Enterprise)
- Superadmin account
- Sample organization (EduTech Global)
- Departments (Operations, Finance, HR, Sales)
- Sample users for each role

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "ceo@edutechglobal.com",
  "password": "ceo123"
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Main Modules

#### Organizations
- `GET /api/v1/organizations` - List all organizations (Superadmin)
- `POST /api/v1/organizations` - Create organization (Superadmin)
- `GET /api/v1/organizations/:id` - Get organization details
- `PUT /api/v1/organizations/:id` - Update organization
- `PUT /api/v1/organizations/:id/license` - Assign license

#### Departments
- `GET /api/v1/departments` - List departments
- `POST /api/v1/departments` - Create department
- `PUT /api/v1/departments/:id` - Update department

#### Users
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user

#### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `PUT /api/v1/tasks/:id/complete` - Complete task

#### Students
- `GET /api/v1/students` - List students
- `POST /api/v1/students` - Create student
- `PUT /api/v1/students/:id/approve` - Approve student

#### HR Module
- `GET /api/v1/hr/leaves` - List leave requests
- `POST /api/v1/hr/leaves` - Create leave request
- `PUT /api/v1/hr/leaves/:id/approve` - Approve leave
- `GET /api/v1/hr/attendance` - Get attendance records
- `GET /api/v1/hr/vacancies` - List vacancies
- `GET /api/v1/hr/complaints` - List complaints
- `GET /api/v1/hr/holidays` - List holidays

#### Finance Module
- `GET /api/v1/finance/invoices` - List invoices
- `POST /api/v1/finance/invoices` - Create invoice
- `GET /api/v1/finance/payments` - List payments
- `POST /api/v1/finance/payments` - Record payment
- `GET /api/v1/finance/expenses` - List expense claims
- `PUT /api/v1/finance/expenses/:id/approve` - Approve expense
- `GET /api/v1/finance/targets` - List targets
- `GET /api/v1/finance/fees` - List fee structures

#### Operations Module
- `GET /api/v1/operations/universities` - List universities
- `POST /api/v1/operations/universities` - Create university
- `GET /api/v1/operations/programs` - List programs
- `GET /api/v1/operations/centers` - List study centers
- `PUT /api/v1/operations/centers/:id/approve` - Approve center
- `GET /api/v1/operations/sessions` - List admission sessions
- `GET /api/v1/operations/marks` - List internal marks
- `GET /api/v1/operations/announcements` - List announcements

#### Sales Module
- `GET /api/v1/sales/leads` - List leads
- `POST /api/v1/sales/leads` - Create lead
- `PUT /api/v1/sales/leads/:id/convert` - Convert lead

#### Dashboard
- `GET /api/v1/dashboard/metrics` - Get dashboard metrics

#### Escalations
- `GET /api/v1/escalations` - List escalations
- `PUT /api/v1/escalations/:id` - Update escalation

## User Roles

1. **Superadmin**: Full system access, manages organizations and licenses
2. **Org Admin**: Organization-level management, creates departments
3. **CEO**: Organization-wide visibility, handles escalations
4. **Ops Admin**: Operations department management
5. **Finance Admin**: Finance department management, approvals
6. **HR Admin**: HR department management
7. **Sales Admin**: Sales department management
8. **Employee**: Personal dashboard, tasks, leaves

## Default Login Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@erp.com | superadmin123 |
| Org Admin | admin@edutechglobal.com | orgadmin123 |
| CEO | ceo@edutechglobal.com | ceo123 |
| Ops Admin | ops.admin@edutechglobal.com | opsadmin123 |
| Finance Admin | finance.admin@edutechglobal.com | finance123 |
| HR Admin | hr.admin@edutechglobal.com | hradmin123 |
| Sales Admin | sales.admin@edutechglobal.com | sales123 |
| Employee | ops.executive@edutechglobal.com | employee123 |

## Automated Features

### Escalation System
- Runs every hour via cron job
- Checks for overdue tasks
- Automatically escalates to CEO after grace period (default: 48 hours)
- Creates escalation records with full chain

### Audit Logging
- Automatic logging of all create/update/delete operations
- Tracks user, IP address, old/new values
- Searchable audit trail

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS protection
- Input validation
- MongoDB injection prevention

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── server.ts        # Entry point
├── uploads/             # File uploads
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Error Handling

All errors are handled centrally with appropriate HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Performance

- MongoDB indexes on frequently queried fields
- Compression middleware for response optimization
- Efficient query population
- Pagination support (can be added to list endpoints)

## Testing

```bash
# Run tests (to be implemented)
npm test
```

## Deployment

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure production MongoDB URI
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
