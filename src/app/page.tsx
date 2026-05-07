import Link from 'next/link';
import {
  GraduationCap,
  Shield,
  Video,
  BookOpen,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  Target,
  Award,
  Zap,
  Mail,
  Phone,
  MapPin,
  QrCode,
  FileText,
  DollarSign,
  Activity,
  UserCheck,
  Megaphone,
  Printer,
  ClipboardCheck,
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
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/login" className="btn-primary flex items-center gap-2">
                Get Started
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <p className="text-2xl md:text-3xl font-arabic text-amber-400/90 mb-2">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
              <p className="text-sm text-slate-400 font-medium">In the name of Allah, the Most Gracious, the Most Merciful</p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-sm font-medium mb-6">
              <Zap size={14} />
              Complete School Management System
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              Manage Your School
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400">
                From One Platform
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              ClearPath Edu Hub brings together academics, attendance, finance, parent communication, and student performance tracking — all in one secure, role-based system.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4">
                <Play size={20} />
                Get Started
              </Link>
              <a href="#features" className="btn-outline border-white/20 text-white px-8 py-4 flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/30 hover:text-white">
                Explore Features
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">5</p>
                <p className="text-sm text-slate-400">User Roles</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">6+</p>
                <p className="text-sm text-slate-400">Modules</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">QR</p>
                <p className="text-sm text-slate-400">Attendance</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">Live</p>
                <p className="text-sm text-slate-400">Reports</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              Platform Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything Your School Needs
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From the classroom to the front office, every tool your staff, teachers, and parents need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card group hover:border-blue-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Video className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Video Lessons & Quizzes</h3>
              <p className="text-slate-600 leading-relaxed">
                Teachers upload video lessons with interactive checkpoints. Students must watch fully before taking linked quizzes — mastery gates ensure real understanding.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-medium">
                <CheckCircle size={14} />
                Anti-skip video player
              </div>
            </div>

            <div className="card group hover:border-emerald-200">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <QrCode className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">QR Attendance</h3>
              <p className="text-slate-600 leading-relaxed">
                Student ID cards with QR codes for fast check-in. Teachers scan with camera or enter manually. Staff attendance via QR too.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle size={14} />
                Camera-based scanning
              </div>
            </div>

            <div className="card group hover:border-violet-200">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Tests & Homework</h3>
              <p className="text-slate-600 leading-relaxed">
                Create timed tests, assign homework, collect submissions, and grade — all digitally. Students take tests online with image upload support.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-violet-600 font-medium">
                <CheckCircle size={14} />
                Online test-taking
              </div>
            </div>

            <div className="card group hover:border-amber-200">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <Users className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Parent Portal</h3>
              <p className="text-slate-600 leading-relaxed">
                Parents link to their children and monitor attendance, grades, behavioral reports, and weekly progress — all in real time.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 font-medium">
                <CheckCircle size={14} />
                Weekly performance reports
              </div>
            </div>

            <div className="card group hover:border-orange-200">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <DollarSign className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Finance & Invoicing</h3>
              <p className="text-slate-600 leading-relaxed">
                Accountants track income, expenses, generate invoices, print receipts, and view financial reports with a complete transaction ledger.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-orange-600 font-medium">
                <CheckCircle size={14} />
                Full financial reports
              </div>
            </div>

            <div className="card group hover:border-purple-200">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
                <Printer className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">ID Cards & Reports</h3>
              <p className="text-slate-600 leading-relaxed">
                Auto-generate printable student ID cards with QR codes. Export report cards, behavioral summaries, and academic transcripts.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-purple-600 font-medium">
                <CheckCircle size={14} />
                Printable report cards
              </div>
            </div>

            <div className="card group hover:border-cyan-200">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Activity className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Behavioral Reports</h3>
              <p className="text-slate-600 leading-relaxed">
                Teachers rate student behavior weekly across punctuality, participation, and homework completion. Parents see the trends.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-cyan-600 font-medium">
                <CheckCircle size={14} />
                Weekly behavior tracking
              </div>
            </div>

            <div className="card group hover:border-rose-200">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
                <BarChart3 className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Analytics & Insights</h3>
              <p className="text-slate-600 leading-relaxed">
                Admins see school-wide performance: top scorers, at-risk students, department comparisons, and class rankings at a glance.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 font-medium">
                <CheckCircle size={14} />
                Predictive risk analysis
              </div>
            </div>

            <div className="card group hover:border-indigo-200">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Megaphone className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Announcements</h3>
              <p className="text-slate-600 leading-relaxed">
                Broadcast announcements to specific roles or everyone. Set priority levels, expiry dates, and attach files for reference.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600 font-medium">
                <CheckCircle size={14} />
                Role-targeted messaging
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              Role-Based Access
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Five Roles, One Platform
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Each user gets a tailored dashboard and tools specific to their responsibilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="card text-center hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Admin</h3>
              <p className="text-sm text-slate-500">Full control: users, classes, departments, analytics, entrance exams, and system settings</p>
            </div>

            <div className="card text-center hover:border-emerald-200 transition-colors">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-emerald-600" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Teacher</h3>
              <p className="text-sm text-slate-500">Video lessons, quizzes, homework, attendance, results entry, and behavioral reports</p>
            </div>

            <div className="card text-center hover:border-violet-200 transition-colors">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-violet-600" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Student</h3>
              <p className="text-sm text-slate-500">Watch lessons, take quizzes & tests, submit homework, view results and ID card</p>
            </div>

            <div className="card text-center hover:border-amber-200 transition-colors">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-amber-600" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Parent</h3>
              <p className="text-sm text-slate-500">Monitor children's attendance, grades, behavior, weekly reports, and fee payments</p>
            </div>

            <div className="card text-center hover:border-orange-200 transition-colors">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-orange-600" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Accountant</h3>
              <p className="text-sm text-slate-500">Record transactions, manage invoices, print receipts, and generate financial reports</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Setup in Minutes
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get your school running on ClearPath in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">1</div>
              <h3 className="font-bold text-slate-900 mb-2">Admin Sets Up</h3>
              <p className="text-sm text-slate-600">Configure school info, create departments, classes, and add users via the admin panel</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-emerald-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">2</div>
              <h3 className="font-bold text-slate-900 mb-2">Teachers Create Content</h3>
              <p className="text-sm text-slate-600">Upload videos, create quizzes, assign homework, and set up class schedules</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCheck className="text-violet-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">3</div>
              <h3 className="font-bold text-slate-900 mb-2">Students Learn</h3>
              <p className="text-sm text-slate-600">Watch lessons, take tests, submit work, and track their academic progress</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="text-amber-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">4</div>
              <h3 className="font-bold text-slate-900 mb-2">Parents Monitor</h3>
              <p className="text-sm text-slate-600">Stay informed with real-time updates on attendance, grades, and behavior</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Digitize Your School?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join schools using ClearPath Edu Hub to streamline operations, improve learning outcomes, and keep parents connected.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl shadow-blue-900/30">
            Get Started Now
            <ArrowRight size={20} />
          </Link>
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
                A complete school management platform — from academics and attendance to finance and parent communication.
              </p>
              <p className="text-amber-400/80 text-sm font-medium">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">User Roles</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>info@clearpatheduhub.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>+234 XXX XXX XXXX</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>Nigeria</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} ClearPath Edu Hub. Built with purpose. Every student, every lesson, one platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
