import type { Metadata } from 'next';
import './globals.css';

const siteName = 'MindMapper Workspace';
const defaultTitle = 'MindMapper Workspace | Cybernetic Concept Mapping';
const defaultDescription =
  'Build futuristic concept maps in MindMapper Workspace with real-time collaboration, fast editing, and immersive cybernetic visuals.';

export const metadata: Metadata = {
  metadataBase: new URL('https://mindmapper.qzz.io'),
  title: {
    default: defaultTitle,
    template: '%s | MindMapper Workspace',
  },
  description: defaultDescription,
  applicationName: siteName,
  openGraph: {
    type: 'website',
    url: '/',
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'MindMapper Workspace futuristic landing preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/twitter-image'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
