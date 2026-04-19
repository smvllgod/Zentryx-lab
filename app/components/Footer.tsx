"use client";


const links: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Visual Builder", href: "/builder" },
    { label: "Strategy Modules", href: "/docs" },
    { label: "MT5 Export", href: "/docs" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Pricing", href: "/#pricing" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Node Reference", href: "/docs" },
    { label: "MQL5 Export Guide", href: "/docs" },
    { label: "FAQ", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 md:gap-12">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
                  <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
                </svg>
              </div>
              <span className="sr-only">Zentryx Lab</span>
              <div className="flex flex-col leading-none" aria-hidden="true">
                <span className="text-[10px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</span>
                <span className="text-sm font-700 text-gray-900 -mt-0.5">Lab</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              <strong className="font-700 text-gray-700">Zentryx Lab</strong> is a no-code visual builder for MetaTrader 5 Expert Advisors. Build, export, and deploy automated trading strategies — no code required.
            </p>
            <div className="flex gap-3 mt-6">
              {/* X (Twitter) */}
              <a
                href="https://x.com/zentryxlab"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zentryx Lab on X (Twitter)"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/zentryxlab"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zentryx Lab on LinkedIn"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              {/* YouTube */}
              <a
                href="https://youtube.com/@zentryxlab"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zentryx Lab on YouTube"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
              </a>
              {/* Instagram */}
              <a
                href="https://instagram.com/zentryxlab"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zentryx Lab on Instagram"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              {/* Telegram */}
              <a
                href="https://t.me/zentryxlab"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zentryx Lab on Telegram"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.39 3.32a1.5 1.5 0 0 0-1.57-.23L2.7 10.18a1.5 1.5 0 0 0 .14 2.8l4.2 1.35 2.27 6.82a1.1 1.1 0 0 0 1.82.44l2.56-2.41 4.33 3.19a1.5 1.5 0 0 0 2.38-.92L21.97 4.89a1.5 1.5 0 0 0-.58-1.57zM9.93 14.98l-.88 3.86-1.72-5.16 9.24-5.56-6.64 6.86z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-700 text-gray-900 uppercase tracking-widest mb-5">{section}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Zentryx. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Zentryx Lab is not affiliated with MetaQuotes Software Corp.
          </p>
        </div>
      </div>
    </footer>
  );
}
