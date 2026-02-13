import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background:
            'radial-gradient(circle at 18% 16%, #21457d 0%, #0b1530 47%, #050711 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        
        <div
          style={{
            margin: '50px',
            border: '1px solid rgba(34,211,238,0.46)',
            borderRadius: 26,
            background: 'rgba(8,16,42,0.88)',
            boxShadow: '0 0 80px rgba(45,212,191,0.2)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '56px 64px',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 24, letterSpacing: 4, color: '#7dd3fc', marginBottom: 24 }}>RELEASE MODE</div>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: '#c4fcff' }}>MindMapper</div>
          <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.05, color: '#f5b8ff', marginTop: 8 }}>Workspace</div>
          <div style={{ fontSize: 30, marginTop: 26, maxWidth: 980, color: '#e2e8f0' }}>
            Create your fate, innovate and elevate — futuristic collaborative concept mapping.
          </div>
          <div style={{ fontSize: 24, marginTop: 32, color: '#fbcfe8' }}>By Fadhil Akbar</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
