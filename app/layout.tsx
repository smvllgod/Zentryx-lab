import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { AuthProvider } from "@/lib/auth/context";
import { Toaster } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";

export const metadata: Metadata = {
  title: "Zentryx Lab — Build Your Trading Robot Without Code",
  description:
    "Design, export and launch automated MT5 strategies through a visual no-code strategy builder. Build your first EA in under an hour.",
  keywords:
    "MT5, trading robot, no-code, strategy builder, forex automation, algorithmic trading, Expert Advisor, EA builder",
  openGraph: {
    title: "Zentryx Lab — Build Your Trading Robot Without Code",
    description:
      "Design, export and launch automated MT5 strategies through a visual no-code strategy builder. No programming required.",
    url: "https://zentryx-lab.netlify.app",
    siteName: "Zentryx Lab",
    type: "website",
    images: [
      {
        url: "https://zentryx-lab.netlify.app/og.png",
        width: 1200,
        height: 630,
        alt: "Zentryx Lab — No-code MT5 Strategy Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zentryx Lab — Build Your Trading Robot Without Code",
    description:
      "Visual no-code builder for MT5 Expert Advisors. Build, export, and deploy automated trading strategies.",
    images: ["https://zentryx-lab.netlify.app/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className="min-h-full bg-white text-[#0a0f0d]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <AuthProvider>
          <ConfirmProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontFamily: "inherit",
                },
              }}
            />
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
