# IITS RPS ERP System

A comprehensive Enterprise Resource Planning (ERP) system for educational institutions built with MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

This will start:
- Backend server on `http://localhost:4009`
- Frontend client on `http://localhost:5194`

## 📁 Project Structure

```
├── client/          # React frontend application
├── server/          # Node.js backend API
├── docs/            # Project documentation
└── LICENSE          # MIT License
```

## 🔧 Technology Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **TypeScript** for type safety
- **Socket.io** for real-time features
- **JWT** for authentication
- **Node-cron** for scheduled jobs

### Frontend
- **React** with **TypeScript**
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Router** for navigation

## 📚 Documentation

- [Quick Start Guide](docs/QUICKSTART.md)
- [Setup Instructions](docs/SETUP.md)
- [Project Summary](docs/PROJECT_SUMMARY.md)
- [API Documentation](server/docs/API.md)
- [Backend Documentation](server/README.md)
- [Frontend Documentation](client/README.md)

## ✨ Features

### Core Modules
- **Organizations & Licensing** - Multi-tenant organization management
- **User Management** - Role-based access control (RBAC)
- **Departments** - Department hierarchy with managers
- **HR Management** - Employees, attendance, leaves, vacancies, payroll
- **Finance** - Invoices, payments, expenses, GST management
- **Operations** - Students, universities, programs, study centers
- **Sales & CRM** - Leads, targets, referral tracking
- **Tasks & Escalations** - Task management with automated escalations

### Advanced Features
- **CEO Dashboard** - Performance and risk metrics
- **Automated Escalation Engine** - 3-tier escalation system
- **Two-Step Approvals** - Leave, credential, edit/delete workflows
- **REREG Module** - Re-registration management with auto-approval
- **Referral System** - BDE referral tracking with leaderboard
- **GST Auto-Calculation** - Automatic GST calculation on invoices
- **Incentive Structures** - Tiered incentive management
- **Real-Time Notifications** - Socket.io powered updates
- **Background Jobs** - Cron-based automated tasks

## 🔐 Default Credentials

```
Email: admin@example.com
Password: admin123
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)

### Environment Setup

1. **Backend** - Copy `server/.env.example` to `server/.env` and configure:
```env
PORT=4009
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

2. **Frontend** - Copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:4009/api/v1
```

### Running Tests

```bash
# Backend tests
cd server
npm test

# Run test scripts
./tests/test-new-endpoints.sh
```

## 📊 System Status

- **Backend**: ✅ 100% Complete (70+ API endpoints)
- **Frontend**: ✅ Complete (Dashboard, all modules)
- **Database**: ✅ MongoDB with 30+ models
- **Real-Time**: ✅ Socket.io configured
- **Background Jobs**: ✅ 3 cron jobs running

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Backend API Documentation](server/docs/API.md)
- [Complete Backend Summary](server/docs/COMPLETE_BACKEND_SUMMARY.md)
- [Quick Reference](server/docs/QUICK_REFERENCE.md)

---

**Version**: 1.0.0  
**Last Updated**: March 6, 2026  
**Status**: Production Ready ✅
