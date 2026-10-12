import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials. Please check your email and password.');
    }
    setIsLoading(false);
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 lg:p-12 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/login-bg.jpg?v=2)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Semi-transparent overlay to ensure contrast if needed, optional */}
      <div className="absolute inset-0 bg-black/10"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[1000px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-8 h-full bg-white rounded-[2rem]">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#111827] mb-2 tracking-tight">Login</h1>
            <p className="text-[#6B7280] text-sm">Enter your credentials to get in</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#374151]">
                Email
              </label>
              <Input
                id="email"
                type="text"
                placeholder="aimerpaix@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-[#F3F4F6] border-0 focus-visible:ring-1 focus-visible:ring-[#111827] rounded-xl px-4"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2 relative">
              <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-[#F3F4F6] border-0 focus-visible:ring-1 focus-visible:ring-[#111827] rounded-xl pl-4 pr-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-gray-300 text-[#111827] focus:ring-[#111827] cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-sm text-[#4B5563] cursor-pointer">
                Remember me
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-base font-medium mt-4 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:block w-1/2 h-full relative rounded-[2rem] overflow-hidden">
          <img 
            src="/login-bg.jpg?v=2" 
            alt="Beautiful abstract landscape" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Small logo top right */}
          <div className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <img src="/logo-icon-green.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>

          {/* Bottom Text */}
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-4xl font-light leading-tight">
              Be a Part of<br />
              <span className="font-bold">Something Beautiful</span>
            </h2>
          </div>
        </div>

      </div>
    </div>
  );
}
