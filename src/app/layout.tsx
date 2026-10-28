import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuthSign | Enterprise E-Signature Platform',
  description: 'Secure, multi-tenant digital signature and document execution platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
