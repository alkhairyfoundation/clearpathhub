import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800 dark:bg-slate-800 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400 mb-4 font-playfair">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-2">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
