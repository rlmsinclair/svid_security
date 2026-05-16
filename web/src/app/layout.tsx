import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SVID Security',
  description: 'AI-powered CCTV footage search platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  SV
                </div>
                <span className="text-white font-semibold text-lg tracking-tight">SVID Security</span>
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Dashboard
                </Link>
                <Link href="/upload" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Upload
                </Link>
                <Link href="/search" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors">
                  Search
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
