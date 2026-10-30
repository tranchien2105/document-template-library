
import type { Metadata } from 'next';
import ToastProvider from '../components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Papertrail — Thư viện mẫu tài liệu',
  description:
    'Thư viện mẫu tài liệu và bản trình chiếu dành cho doanh nghiệp.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
