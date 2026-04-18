"use client";

import Nav from "./Nav";
import Footer from "./Footer";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ title, lastUpdated, children }: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-500 text-gray-400 hover:text-gray-700 transition-colors mb-8 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </a>
          <div className="mb-12">
            <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Legal</span>
            <h1 className="mt-3 text-4xl font-800 text-gray-900 tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-gray-400">Last updated: {lastUpdated}</p>
          </div>
          <div className="prose prose-gray max-w-none
            [&_h2]:text-xl [&_h2]:font-700 [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-base [&_h3]:font-700 [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:text-gray-500 [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:text-gray-500 [&_ul]:space-y-1 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
            [&_a]:text-emerald-600 [&_a]:font-500 [&_a]:hover:text-emerald-700
            [&_strong]:text-gray-700 [&_strong]:font-600">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
