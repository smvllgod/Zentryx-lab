import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
              <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col leading-none text-left">
            <span className="text-[10px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</span>
            <span className="text-sm font-700 text-gray-900 -mt-0.5">Lab</span>
          </div>
        </div>

        {/* 404 */}
        <div className="text-[120px] font-800 leading-none text-gray-100 select-none mb-2">404</div>

        <h1 className="text-2xl font-700 text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">
          This page doesn't exist or was moved. Let's get you back to building strategies.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-700 px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/25 transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-gray-300 font-600 px-6 py-3 rounded-2xl transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
