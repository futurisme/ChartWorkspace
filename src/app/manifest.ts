import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChartWorkspace Game',
    short_name: 'CW Game',
    description: 'Game simulasi perusahaan teknologi CPU di route /game.',
    start_url: '/game',
    scope: '/game',
    display: 'standalone',
    background_color: '#0a0f1f',
    theme_color: '#0a0f1f',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
