import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2 } from 'lucide-react';



export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }

    setIsLoading(false);
  };


  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#0F172A]" />
            </div>
            <span className="text-2xl font-semibold text-white">UniERP</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Unified ERP System
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Comprehensive management solution for educational institutions. 
            Streamline operations, finance, HR, and sales in one platform.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium">Multi-tenant Architecture</p>
              <p className="text-slate-400 text-sm">Secure data isolation for each organization</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium">Role-based Access Control</p>
              <p className="text-slate-400 text-sm">Granular permissions for every user role</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="text-white font-medium">Real-time Analytics</p>
              <p className="text-slate-400 text-sm">Comprehensive dashboards and reporting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-[#0F172A]">UniERP</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#0F172A] mb-2">Sign in to your account</h2>
            <p className="text-sm text-slate-500">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-slate-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>


        </div>
      </div>
    </div>
  );
}
