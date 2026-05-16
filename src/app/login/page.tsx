'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { clearSupabaseCache } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ArrowLeft, BookOpen, Shield, GraduationCap as StudentCap, Check, AlertCircle } from 'lucide-react';

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
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const sessionError = searchParams.get('error');

  useEffect(() => {
    const dismissed = localStorage.getItem('bismillah-dismissed');
    if (dismissed) setShowBismillah(false);
  }, []);

  useEffect(() => {
    if (sessionError === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
      clearSupabaseCache();
    }
  }, [sessionError]);

  function handleBismillahDismiss() {
    localStorage.setItem('bismillah-dismissed', 'true');
    setShowBismillah(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      clearSupabaseCache();
      
      const { error, profile } = await signIn(email.trim(), password);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (profile?.role) {
        const roleRoutes: Record<string, string> = {
          admin: '/admin',
          teacher: '/teacher',
          student: '/student',
          parent: '/parent',
          accountant: '/accountant',
        };
        const targetRoute = roleRoutes[profile.role];
        if (targetRoute) {
          router.replace(targetRoute);
          return;
        }
      }

      router.replace(redirect || '/portal');
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
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
            <p className="text-lg text-white/70 leading-relaxed">
              Your personalized learning platform designed to help students achieve academic excellence through structured assessments, targeted practice, and detailed performance analytics.
            </p>
          </div>

          <div className="flex items-center gap-6 text-white/50 text-xs">
            <div className="flex items-center gap-2"><Shield size={14} />Secure & Private</div>
            <div className="flex items-center gap-2"><GraduationCap size={14} />Curriculum Aligned</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors lg:hidden">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cp-gold/25">
                <GraduationCap className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to continue your learning journey</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cp-gold/20 focus:border-cp-gold outline-none transition-all text-sm"
                    placeholder="Enter your email"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cp-gold/20 focus:border-cp-gold outline-none transition-all text-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageContent /></Suspense>;
}