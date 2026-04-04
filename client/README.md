# ERP System - Frontend (Client)

React + TypeScript + Vite frontend for the Multi-Tenant ERP System.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── dashboard/      # Dashboard components
│   │   ├── layout/         # Layout components (Header, Sidebar)
│   │   ├── panels/         # Role-specific panels (8 panels)
│   │   └── ui/             # shadcn/ui components (53 components)
│   ├── data/
│   │   └── mockData.ts     # Mock data for development
│   ├── hooks/
│   │   ├── useAuth.tsx     # Authentication hook
│   │   └── use-mobile.ts   # Mobile detection hook
│   ├── lib/
│   │   ├── api.ts          # API service layer
│   │   └── utils.ts        # Utility functions
│   ├── pages/
│   │   └── Login.tsx       # Login page
│   ├── types/
│   │   └── erp.ts          # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   ├── App.css             # Application styles
│   ├── index.css           # Global styles
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── .env.example            # Environment variables template
```

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com/) - 53 components including:
- Accordion, Alert, Avatar, Badge, Button
- Card, Calendar, Checkbox, Dialog, Dropdown
- Form, Input, Select, Table, Tabs
- And many more...

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### API Configuration

The API service is configured in `src/lib/api.ts`:
- Automatic token management
- Request/response interceptors
- Error handling
- Base URL configuration

## 🎯 Role-Specific Panels

1. **SuperadminPanel** - System-wide control
2. **CEODashboard** - Organization overview
3. **OperationsPanel** - Academic operations
4. **FinancePanel** - Financial management
5. **HRPanel** - Human resources
6. **SalesPanel** - Sales & CRM
7. **EmployeeDashboard** - Employee workspace
8. **StaffPortal** - Staff utilities

## 🔐 Authentication

Authentication is handled via the `useAuth` hook:

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  // Use authentication methods
}
```

## 📡 API Integration

API calls are made through the centralized API service:

```typescript
import api from '@/lib/api';

// Login
const response = await api.login(email, password);

// Get data
const users = await api.getUsers();

// Create data
const newUser = await api.createUser(userData);
```

## 🎨 Styling

- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for pre-built components
- **CSS Variables** for theming
- **Dark mode** support via next-themes

## 🧪 Development

### Available Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Adding New Components

```bash
# Add shadcn/ui component
npx shadcn-ui@latest add [component-name]
```

## 📦 Dependencies

### Core
- react: ^19.2.0
- react-dom: ^19.2.0
- typescript: ^5.9.3
- vite: ^7.2.4

### UI & Styling
- tailwindcss: ^3.4.19
- @radix-ui/react-*: Various components
- lucide-react: ^0.562.0 (icons)
- recharts: ^2.15.4 (charts)

### Forms & Validation
- react-hook-form: ^7.70.0
- zod: ^4.3.5
- @hookform/resolvers: ^5.2.2

### API
- axios: ^1.6.2

## 🔍 Type Safety

Full TypeScript support with comprehensive type definitions in `src/types/erp.ts`:
- User roles and permissions
- Organization and department types
- Student and employee types
- Financial and operational types

## 🎯 Features

- ✅ Role-based UI rendering
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Real-time data updates
- ✅ Form validation
- ✅ Error handling
- ✅ Loading states
- ✅ Toast notifications
- ✅ Dark mode support

## 🚀 Performance

- Code splitting with Vite
- Lazy loading of components
- Optimized bundle size
- Fast refresh during development

## 📱 Responsive Design

- Mobile-first approach
- Collapsible sidebar
- Touch-friendly interactions
- Adaptive layouts

## 🔒 Security

- XSS protection
- CSRF token handling
- Secure token storage
- API request validation

## 🐛 Debugging

```bash
# Enable React DevTools
# Install React Developer Tools browser extension

# View network requests
# Use browser DevTools Network tab

# Check console for errors
# Open browser console (F12)
```

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TypeScript](https://www.typescriptlang.org/)

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new files
3. Add proper type definitions
4. Test on multiple screen sizes
5. Update documentation

## 📝 Notes

- The frontend can run independently with mock data
- Backend API is required for full functionality
- Default API URL: http://localhost:5000/api/v1
- Development server runs on port 5173

---

**Part of the Multi-Tenant ERP System**
