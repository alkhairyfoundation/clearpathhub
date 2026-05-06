import Link from 'next/link';
import {
  GraduationCap,
  Shield,
  Video,
  Lock,
  AlertTriangle,
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
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Bismillah */}
            <div className="mb-6">
              <p className="text-2xl md:text-3xl font-arabic text-amber-400/90 mb-2">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
              <p className="text-sm text-slate-400 font-medium">In the name of Allah, the Most Gracious, the Most Merciful</p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-sm font-medium mb-6">
              <Zap size={14} />
              The Mastery Engine
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              Every Student{' '}
              <span className="text-gradient-hero">Masters</span>
              <br />Every Lesson
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              ClearPath Edu Hub is a mastery-based learning platform where students truly understand each topic before moving forward. No skipping. No gaps. Just solid foundations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4">
                <Play size={20} />
                Start Learning
              </Link>
              <a href="#features" className="btn-outline border-white/20 text-white px-8 py-4 flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/30 hover:text-white">
                Explore Features
                <ArrowRight size={18} />
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">3</p>
                <p className="text-sm text-slate-400">User Roles</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">6</p>
                <p className="text-sm text-slate-400">Class Levels</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white">80%</p>
                <p className="text-sm text-slate-400">Mastery Gate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              Core Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Built for Mastery, Not Just Completion
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Unlike traditional platforms that let students skip ahead, our Mastery Engine ensures a solid foundation at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mastery Gates */}
            <div className="card group hover:border-blue-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Lock className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Mastery Gates</h3>
              <p className="text-slate-600 leading-relaxed">
                Students must pass each quiz at 80% or above before the next one unlocks. Teachers can customize thresholds and manually override gates when needed.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-medium">
                <CheckCircle size={14} />
                Prerequisite chaining
              </div>
            </div>

            {/* Smart Video Player */}
            <div className="card group hover:border-emerald-200">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Video className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Video Player</h3>
              <p className="text-slate-600 leading-relaxed">
                Anti-skip on first watch. Notebook prompts at 90% completion. Controls unlock only after the video has been fully watched once.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle size={14} />
                Anti-skip protection
              </div>
            </div>

            {/* Red Zone Alerts */}
            <div className="card group hover:border-red-200">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/25 group-hover:scale-105 transition-transform">
                <AlertTriangle className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Red Zone Alerts</h3>
              <p className="text-slate-600 leading-relaxed">
                Real-time alerts when students struggle. Teachers and admins see who needs help and can intervene with gate overrides and extra support.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 font-medium">
                <CheckCircle size={14} />
                Proactive intervention
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              The Mastery Learning Flow
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A structured journey from video lessons to mastery achievement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="text-blue-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">1</div>
              <h3 className="font-bold text-slate-900 mb-2">Watch Video</h3>
              <p className="text-sm text-slate-600">Students watch the lesson video — no skipping allowed on first watch</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-emerald-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">2</div>
              <h3 className="font-bold text-slate-900 mb-2">Take Quiz</h3>
              <p className="text-sm text-slate-600">Complete the linked quiz to demonstrate understanding of the lesson</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-purple-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">3</div>
              <h3 className="font-bold text-slate-900 mb-2">Achieve Mastery</h3>
              <p className="text-sm text-slate-600">Score 80% or above to unlock the next lesson in the sequence</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Award className="text-amber-600" size={28} />
              </div>
              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3">4</div>
              <h3 className="font-bold text-slate-900 mb-2">Progress Forward</h3>
              <p className="text-sm text-slate-600">Move to the next chapter with confidence — solid foundation guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold mb-4">
              User Roles
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              One Platform, Three Roles
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Each role has a tailored experience designed for their specific needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Admin */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-colors">
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="text-blue-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Admin</h3>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Manage all users — create, edit, delete</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Assign class years to students & teachers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Red Zone alerts & Gate Override</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Upload Cambridge past questions</span>
                </li>
              </ul>
            </div>

            {/* Teacher */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-emerald-500/50 transition-colors">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Users className="text-emerald-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Teacher</h3>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Upload video lessons with year/term tags</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Create tests & link to videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Set mastery gates & prerequisites</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>View results filtered by assigned years</span>
                </li>
              </ul>
            </div>

            {/* Student */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition-colors">
              <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                <GraduationCap className="text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Student</h3>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Watch video lessons then take quizzes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>See class-filtered content (Year 1-6)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>View grades by term with averages</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Retry failed tests until mastery is achieved</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Learning?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join ClearPath Edu Hub and ensure every student truly masters every lesson before moving forward.
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
                The Mastery Engine — A mastery-based learning platform built for schools that believe every student should truly understand a topic before progressing.
              </p>
              <p className="text-amber-400/80 text-sm font-medium">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
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
            <p>© {new Date().getFullYear()} ClearPath Edu Hub. Built with purpose. Every student masters every lesson.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
