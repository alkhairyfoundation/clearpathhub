'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ArrowLeft, BookOpen, Shield, GraduationCap as StudentCap, Check } from 'lucide-react';

function BismillahPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25">
          <BookOpen className="text-white" size={28} />
        </div>
        
        <p className="text-3xl font-bold text-amber-600 mb-3">بِسْمِ اللَّهِ</p>
        <p className="text-lg font-semibold text-amber-500 mb-2">In the Name of Allah</p>
        <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">الرَّحْمَنِ الرَّحِيمِ</p>
        <p className="text-slate-600 mb-6">The Most Gracious, the Most Merciful</p>
        
        <p className="text-sm text-slate-500 mb-6 italic">
          &quot;O my Lord, increase me in knowledge.&quot; — Quran 20:114
        </p>

        <button
          onClick={onClose}
          className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
        >
          <Check size={18} />
          Begin
        </button>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBismillah, setShowBismillah] = useState(true);
  const [redirected, setRedirected] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    const dismissed = localStorage.getItem('bismillah-dismissed');
    if (dismissed) {
      setShowBismillah(false);
    }
  }, []);

  // Don't check for existing session - always show login form first time

  function handleBismillahDismiss() {
    localStorage.setItem('bismillah-dismissed', 'true');
    setShowBismillah(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login for:', email);
      const { error, profile, user } = await signIn(email, password);
      console.log('Login result:', { error, hasProfile: !!profile, profileRole: profile?.role, hasUser: !!user });
      
      if (error) {
        console.error('Login error:', error.message);
        setError(error.message);
        setLoading(false);
        return;
      }

      // Direct redirect based on role from signIn response
      if (profile?.role) {
        console.log('Redirecting to:', profile.role);
        const roleRoutes: Record<string, string> = {
          admin: '/admin',
          teacher: '/teacher',
          student: '/student',
          parent: '/parent',
          accountant: '/accountant',
        };
        
        const targetRoute = roleRoutes[profile.role];
        if (targetRoute) {
          router.push(targetRoute);
          return;
        }
      } else {
        console.log('No profile or role, going to portal. Profile:', profile);
      }

      // Fallback to portal
      router.push(redirect || '/portal');
      
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err?.message || 'An unexpected error occurred during login');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mx-auto mb-4"></div>
          <p className="text-slate-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (showBismillah) {
    return <BismillahPopup onClose={handleBismillahDismiss} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cp-green via-cp-green to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cp-gold/20 via-transparent to-transparent" />
        
        <div className="relative flex flex-col justify-center px-12 xl:px-16">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-xl flex items-center justify-center shadow-lg shadow-cp-gold/25">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-white text-xl">ClearPath</h1>
              <p className="text-[11px] font-semibold text-cp-gold uppercase tracking-wider -mt-0.5">Edu Hub</p>
            </div>
          </Link>

          <div className="mb-8">
            <p className="text-2xl text-amber-400/80 mb-4">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            <h2 className="text-4xl xl:text-5xl font-black text-white mb-6 leading-tight">
              The Mastery Engine
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed max-w-md">
              Every student truly masters each lesson before moving forward. No skipping. No gaps. Just solid foundations.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-cp-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="text-cp-gold" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Mastery Gates</h4>
                <p className="text-sm text-slate-400">Students must pass each quiz at 80% to unlock the next lesson</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="text-emerald-400" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Smart Video Player</h4>
                <p className="text-sm text-slate-400">Anti-skip protection ensures complete lesson consumption</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <StudentCap className="text-purple-400" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Class-Based Learning</h4>
                <p className="text-sm text-slate-400">Organized by Year 1-6 with term-based reporting</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-8">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-xl flex items-center justify-center shadow-lg shadow-cp-gold/25">
                <GraduationCap className="text-white" size={22} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg">ClearPath</h1>
                <p className="text-[10px] font-semibold text-cp-gold uppercase tracking-wider -mt-0.5">Edu Hub</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500">Sign in to your account to continue</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label" htmlFor="email">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-center text-sm text-slate-500">
                Contact your administrator for login credentials
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Built with purpose. Every student masters every lesson.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}