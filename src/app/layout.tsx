import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChartMaker - Collaborative Concept Mapper',
  description: 'Real-time collaborative concept map editor with live presence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
