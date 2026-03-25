import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    absolute: 'Aurora Microforge Simulator',
  },
  description: 'Game simulasi perusahaan teknologi CPU yang terisolasi penuh di route /game.',
  applicationName: 'Aurora Microforge Simulator',
  alternates: {
    canonical: '/game',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Aurora Microforge Simulator',
    description: 'Bangun perusahaan CPU dari tahun 2000 dengan riset per detik dan upgrade spesifikasi prosesor.',
    url: '/game',
    siteName: 'Aurora Microforge Simulator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurora Microforge Simulator',
    description: 'Bangun perusahaan CPU dari tahun 2000 dengan sistem research point per detik.',
  },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
