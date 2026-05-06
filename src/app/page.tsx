import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                ClearPath Edu Hub
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Comprehensive School Management System
              </p>
              <p className="text-lg text-blue-200 mb-12 max-w-2xl mx-auto">
                Streamline your school operations with our all-in-one platform featuring 
                admin, teacher, student, parent, and accountant portals.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="/admin" 
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Admin Portal
                </a>
                <a 
                  href="/teacher" 
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors"
                >
                  Teacher Portal
                </a>
                <a 
                  href="/student" 
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors"
                >
                  Student Portal
                </a>
                <a 
                  href="/parent" 
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors"
                >
                  Parent Portal
                </a>
                <a 
                  href="/accountant" 
                  className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
                >
                  Accountant Portal
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">
              Portal Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 bg-blue-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-800">Admin Portal</h3>
                <p className="text-slate-600">
                  Complete control over school settings, user management, ID cards, 
                  announcements, analytics, and all administrative functions.
                </p>
              </div>

              <div className="p-6 bg-emerald-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-800">Teacher Portal</h3>
                <p className="text-slate-600">
                  Manage video lessons, quizzes, homework, lesson notes, 
                  attendance, results, and behavioral reports.
                </p>
              </div>

              <div className="p-6 bg-purple-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-800">Student Portal</h3>
                <p className="text-slate-600">
                  Access video lessons, submit homework, view results, 
                  track attendance, and view ID card with QR code.
                </p>
              </div>

              <div className="p-6 bg-orange-50 rounded-xl">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-800">Parent Portal</h3>
                <p className="text-slate-600">
                  Monitor children&apos;s progress, view results and attendance, 
                  receive behavioral reports, and manage payments.
                </p>
              </div>

              <div className="p-6 bg-emerald-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-800">Accountant Portal</h3>
                <p className="text-slate-600">
                  Manage finances, create invoices, generate receipts, 
                  track transactions, and view financial reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📇</div>
                <h3 className="font-semibold mb-2 text-slate-800">ID Cards with QR</h3>
                <p className="text-slate-600 text-sm">
                  Generate ID cards with QR codes for quick attendance marking
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📹</div>
                <h3 className="font-semibold mb-2 text-slate-800">Video Lessons</h3>
                <p className="text-slate-600 text-sm">
                  Upload video lessons from YouTube or direct uploads
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="font-semibold mb-2 text-slate-800">Quizzes & Tests</h3>
                <p className="text-slate-600 text-sm">
                  Create quizzes with auto-grading and track progress
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="font-semibold mb-2 text-slate-800">Analytics</h3>
                <p className="text-slate-600 text-sm">
                  Comprehensive analytics for performance and attendance
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📢</div>
                <h3 className="font-semibold mb-2 text-slate-800">Announcements</h3>
                <p className="text-slate-600 text-sm">
                  Targeted announcements to specific audiences
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="font-semibold mb-2 text-slate-800">Behavioral Reports</h3>
                <p className="text-slate-600 text-sm">
                  Weekly behavior reports sent to parents
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-semibold mb-2 text-slate-800">Invoicing</h3>
                <p className="text-slate-600 text-sm">
                  Generate invoices and receipts for payments
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="font-semibold mb-2 text-slate-800">Attendance</h3>
                <p className="text-slate-600 text-sm">
                  QR code and ID card scanning for attendance
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}