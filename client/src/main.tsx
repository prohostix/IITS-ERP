import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
    <Toaster position="top-right" richColors />
  </AuthProvider>,
)
