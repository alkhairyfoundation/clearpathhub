import Link from 'next/link';
import {
  GraduationCap, Shield, Video, BookOpen, BarChart3, Users,
  CheckCircle, ArrowRight, Target, Award, Zap,
  Mail, Phone, MapPin, QrCode, FileText, DollarSign,
  Activity, UserCheck, Printer, ClipboardCheck, Sparkles,
  Layers, Lock,   Clock, HeartHandshake, Megaphone,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <GraduationCap className="text-white" size={22} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">ClearPath</h1>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider -mt-0.5">Edu Hub</p>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#why" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Why Us</a>
              <a href="#process" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/login" className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25">
                Get Started
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-8">
                <p className="text-2xl md:text-3xl font-arabic text-amber-400/90 mb-3">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
                <p className="text-sm text-slate-400 font-medium">In the name of Allah, the Most Gracious, the Most Merciful</p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-sm font-medium mb-6">
                <Sparkles size={14} />
                The Mastery Engine — Learn. Master. Progress.
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.1]">
                Every Student
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400">
                  Truly Masters
                </span>
                Every Lesson
              </h1>

              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed">
                ClearPath Edu Hub is our school&apos;s complete digital platform — ensuring no student moves forward without truly understanding. From video lessons with anti-skip checkpoints to real-time parent updates, everything is designed for actual learning.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4 shadow-xl shadow-blue-500/20">
                  <GraduationCap size={20} />
                  Access Your Portal
                </Link>
                <a href="#features" className="btn-outline border-white/20 text-white px-8 py-4 flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/30 hover:text-white">
                  Explore Features
                  <ArrowRight size={18} />
                </a>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
                <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-3xl font-black text-white">5</p>
                  <p className="text-sm text-slate-400 mt-1">Roles</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-3xl font-black text-white">9+</p>
                  <p className="text-sm text-slate-400 mt-1">Modules</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-3xl font-black text-white">10K+</p>
                  <p className="text-sm text-slate-400 mt-1">Students</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-3xl font-black text-white">99%</p>
                  <p className="text-sm text-slate-400 mt-1">Uptime</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative p-8">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                      <Shield className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">Mastery Gates</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Students must score 80% on checkpoint quizzes before unlocking the next lesson. No gaps. Real understanding.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                      <Video className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">Guided Video Learning</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Teachers upload lessons with timestamped checkpoints. Anti-skip player ensures complete viewing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                      <BarChart3 className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">Real-Time Analytics</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Teachers and parents see live performance data. Identify struggling students before they fall behind.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decorative dots */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/20 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              <Layers size={14} />
              Everything You Need
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              One Platform. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Every Solution.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              ClearPath Edu Hub brings every aspect of school operations — from academics and attendance to finance and parent communication — into a single, unified system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: <Video size={28} />,
                title: 'Video Lessons & Quizzes',
                desc: 'Teachers upload video lessons with interactive timestamp checkpoints. Students must watch fully before taking linked quizzes. Mastery gates ensure 80% comprehension before progressing.',
                color: 'from-blue-500 to-blue-600',
                shadow: 'shadow-blue-500/25',
                border: 'hover:border-blue-200',
                tag: 'Anti-skip Player',
              },
              {
                icon: <QrCode size={28} />,
                title: 'QR Attendance System',
                desc: 'Students check in by scanning QR codes on their ID cards. Teachers can also record attendance manually. Staff attendance is tracked separately with its own QR workflow.',
                color: 'from-emerald-500 to-emerald-600',
                shadow: 'shadow-emerald-500/25',
                border: 'hover:border-emerald-200',
                tag: 'Camera-Based',
              },
              {
                icon: <ClipboardCheck size={28} />,
                title: 'Tests & Homework',
                desc: 'Create timed tests, assign homework with file uploads, and grade everything digitally. Supports multiple question types: MCQ, true/false, fill-in-blank, short answer, and multi-select.',
                color: 'from-violet-500 to-violet-600',
                shadow: 'shadow-violet-500/25',
                border: 'hover:border-violet-200',
                tag: 'Online Testing',
              },
              {
                icon: <Users size={28} />,
                title: 'Parent Portal',
                desc: 'Parents link their accounts to their children and monitor attendance, grades, behavioral reports, exam attempts, and weekly progress — all updated in real time.',
                color: 'from-amber-500 to-amber-600',
                shadow: 'shadow-amber-500/25',
                border: 'hover:border-amber-200',
                tag: 'Real-Time Updates',
              },
              {
                icon: <DollarSign size={28} />,
                title: 'Finance & Invoicing',
                desc: 'Accountants manage income and expenses, generate professional invoices, print payment receipts, and view comprehensive financial reports with a full transaction ledger.',
                color: 'from-orange-500 to-orange-600',
                shadow: 'shadow-orange-500/25',
                border: 'hover:border-orange-200',
                tag: 'Full Ledger',
              },
              {
                icon: <Activity size={28} />,
                title: 'Analytics & Insights',
                desc: 'Admins access school-wide performance dashboards: top scorers, at-risk students, department comparisons, class rankings, attendance trends, and predictive risk analysis.',
                color: 'from-rose-500 to-rose-600',
                shadow: 'shadow-rose-500/25',
                border: 'hover:border-rose-200',
                tag: 'Predictive Alerts',
              },
              {
                icon: <Printer size={28} />,
                title: 'ID Cards & Reports',
                desc: 'Auto-generate printable student ID cards with embedded QR codes for attendance. Export report cards, behavioral summaries, and academic transcripts in PDF format.',
                color: 'from-cyan-500 to-cyan-600',
                shadow: 'shadow-cyan-500/25',
                border: 'hover:border-cyan-200',
                tag: 'QR-Enabled IDs',
              },
              {
                icon: <UserCheck size={28} />,
                title: 'Behavioral Tracking',
                desc: 'Teachers rate students weekly on punctuality, participation, homework completion, and conduct. Parents view trends over time to stay engaged with their child&apos;s development.',
                color: 'from-indigo-500 to-indigo-600',
                shadow: 'shadow-indigo-500/25',
                border: 'hover:border-indigo-200',
                tag: 'Weekly Reports',
              },
              {
                icon: <Megaphone size={28} />,
                title: 'Announcements',
                desc: 'Broadcast messages to specific roles or everyone. Set priority levels, attach files, and schedule expiry dates. Urgent announcements appear prominently on all dashboards.',
                color: 'from-pink-500 to-pink-600',
                shadow: 'shadow-pink-500/25',
                border: 'hover:border-pink-200',
                tag: 'Role-Targeted',
              },
            ].map((feature, i) => (
              <div key={i} className={`card group ${feature.border} transition-all duration-300 hover:-translate-y-1`}>
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg ${feature.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-4">{feature.desc}</p>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: feature.color.split(' ')[1] }}>
                  <CheckCircle size={14} />
                  {feature.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              <HeartHandshake size={14} />
              Why ClearPath
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">Real Learning</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Every feature is designed with one goal: ensuring every student truly masters every topic before moving forward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Mastery, Not Coverage</h3>
              <p className="text-slate-600 leading-relaxed">
                Students don&apos;t just watch videos — they prove understanding at every checkpoint. An 80% mastery gate ensures no one advances with gaps.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Exam Integrity</h3>
              <p className="text-slate-600 leading-relaxed">
                Fullscreen enforcement, tab-switch detection, keyboard shortcut blocking, and screenshot prevention ensure fair online assessments.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Real-Time Visibility</h3>
              <p className="text-slate-600 leading-relaxed">
                Parents see attendance, grades, and behavior as they happen. Teachers identify struggling students instantly. No waiting for report cards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-sm font-semibold mb-4">
              <Target size={14} />
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              From Setup to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Success</span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              A clear path from school configuration to student mastery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: '01', title: 'School Setup', desc: 'Admin configures classes, subjects, departments, and adds users with role-based access in minutes.', color: 'from-blue-500 to-blue-600' },
              { num: '02', title: 'Content Creation', desc: 'Teachers upload video lessons with checkpoints, create quizzes, assign homework, and schedule tests.', color: 'from-emerald-500 to-emerald-600' },
              { num: '03', title: 'Student Learning', desc: 'Students watch lessons, answer checkpoint questions, take quizzes, submit homework, and track their progress.', color: 'from-purple-500 to-purple-600' },
              { num: '04', title: 'Monitor & Grow', desc: 'Parents and teachers monitor performance in real time. Data-driven insights guide interventions and celebrate success.', color: 'from-amber-500 to-amber-600' },
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white text-2xl font-black">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[calc(80%)] h-0.5 bg-gradient-to-r from-blue-500/40 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl text-amber-400/80 mb-4">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            Ready to Transform Your School&apos;s Learning Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Sign in to ClearPath Edu Hub and experience a platform built on the principle that every student deserves to truly master every lesson.
          </p>
          <Link href="/login" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-700 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-2xl shadow-blue-900/30 hover:shadow-blue-900/40 hover:-translate-y-0.5">
            <GraduationCap size={22} />
            Sign In to Your Dashboard
            <ArrowRight size={20} />
          </Link>
          <p className="text-blue-200/60 text-sm mt-8 font-medium">
            &quot;O my Lord, increase me in knowledge.&quot; — Quran 20:114
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">ClearPath</h3>
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider -mt-0.5">Edu Hub</p>
                </div>
              </div>
              <p className="text-slate-400 mb-6 max-w-md leading-relaxed">
                Our school&apos;s complete management platform — from academics and attendance to finance and parent communication. Built on the principle of mastery learning.
              </p>
              <p className="text-amber-400/80 text-sm font-medium">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="hover:text-white transition-colors text-sm">Sign In</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors text-sm">Features</a></li>
                <li><a href="#why" className="hover:text-white transition-colors text-sm">Why Us</a></li>
                <li><a href="#process" className="hover:text-white transition-colors text-sm">How It Works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <Mail size={14} />
                  <span>info@clearpatheduhub.com</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Phone size={14} />
                  <span>+234 XXX XXX XXXX</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <MapPin size={14} />
                  <span>Nigeria</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} ClearPath Edu Hub. All rights reserved. Built with purpose. Every student masters every lesson.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
